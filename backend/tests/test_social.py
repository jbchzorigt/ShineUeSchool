import httpx
import pytest

from tests.helpers import login, visitor_headers


async def test_status_disabled_by_default(client):
    r = await client.get("/api/social/facebook/status/")
    assert r.json() == {"enabled": False, "app_id": "", "page_url": ""}


async def test_login_disabled_returns_503(client):
    r = await client.post("/api/social/facebook/login/", json={"access_token": "t"})
    assert r.status_code == 503 and r.json() == {"detail": "Facebook холболт тохируулагдаагүй."}


async def test_status_enabled(client, fb):
    r = await client.get("/api/social/facebook/status/")
    assert r.json() == {"enabled": True, "app_id": "x", "page_url": "https://www.facebook.com/x"}


async def test_login_creates_visitor_and_me(client, fb):
    fb.add_user("tok", "555", "Бат Дорж", "https://p/1.jpg")
    r = await client.post("/api/social/facebook/login/", json={"access_token": "tok"})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"token", "visitor"} and body["visitor"]["name"] == "Бат Дорж" and body["visitor"]["avatar_url"] == "https://p/1.jpg"
    h = {"Authorization": f"Bearer {body['token']}"}
    me = (await client.get("/api/social/me/", headers=h)).json()
    assert me["id"] == body["visitor"]["id"] and me["name"] == "Бат Дорж"
    fb.add_user("tok2", "555", "Бат Д.", "")
    r2 = await client.post("/api/social/facebook/login/", json={"access_token": "tok2"})
    assert r2.json()["visitor"]["id"] == body["visitor"]["id"] and r2.json()["visitor"]["name"] == "Бат Д."


async def test_login_bad_token(client, fb):
    r = await client.post("/api/social/facebook/login/", json={"access_token": "nope"})
    assert r.status_code == 401 and r.json() == {"detail": "Facebook токен хүчингүй."}


async def test_blocked_visitor(client, fb, db):
    from sqlalchemy import select
    from app.social.models import Visitor
    h = await visitor_headers(client, fb, fb_id="9", name="Муу")
    v = (await db.execute(select(Visitor).where(Visitor.fb_id == "9"))).scalar_one()
    v.is_blocked = True
    await db.flush()
    assert (await client.get("/api/social/me/", headers=h)).status_code == 403
    r = await client.post("/api/social/facebook/login/", json={"access_token": "tok-9"})
    assert r.status_code == 403


async def test_staff_token_is_not_visitor(client, make_user, fb):
    await make_user("admin", superuser=True)
    t = await login(client, "admin")
    r = await client.get("/api/social/me/", headers={"Authorization": f"Bearer {t['access']}"})
    assert r.status_code == 401


async def test_visitor_token_rejected_on_admin(client, fb):
    """Зочны токенээр админ API-д хандах боломжгүй байх ёстой."""
    h = await visitor_headers(client, fb, fb_id="42", name="Зочин")
    r = await client.get("/api/news/admin/posts/", headers=h)
    assert r.status_code == 401


async def test_client_wraps_transport_errors(monkeypatch):
    """FacebookClient нь httpx холболтын алдааг FacebookError болгож шидэх ёстой (500 болохгүй)."""
    from app.social.facebook import FacebookClient, FacebookError

    class FakeTransportClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, url, params=None):
            raise httpx.ConnectError("boom")

        async def post(self, url, data=None):
            raise httpx.ConnectError("boom")

    monkeypatch.setattr(httpx, "AsyncClient", lambda *a, **k: FakeTransportClient())
    with pytest.raises(FacebookError):
        await FacebookClient("a", "s", "p", "t").me("tok")


async def test_debug_token_app_id_mismatch(monkeypatch):
    from app.social.facebook import FacebookClient, FacebookError

    c = FacebookClient("a", "s", "p", "t")

    async def fake_get(path, params):
        return {"data": {"is_valid": True, "app_id": "other"}}

    monkeypatch.setattr(c, "_get", fake_get)
    with pytest.raises(FacebookError):
        await c.debug_token("tok")
