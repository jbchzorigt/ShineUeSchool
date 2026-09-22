from datetime import UTC, datetime, timedelta

import jwt
from sqlalchemy import select

from app.auth.models import Role, User
from app.config import settings
from tests.helpers import login


async def test_user_roles_and_is_staff(db):
    role = Role(code="manager", name="Сургалтын менежер")
    u = User(username="bat", password_hash="x", full_name="Бат", email="", roles=[role])
    db.add(u)
    await db.flush()
    got = (await db.execute(select(User).where(User.username == "bat"))).scalar_one()
    assert got.role_codes == ["manager"]
    assert got.is_staff is True
    plain = User(username="dorj", password_hash="x", full_name="Дорж", email="")
    assert plain.is_staff is False


async def test_login_returns_tokens(client, make_user):
    await make_user("admin", superuser=True)
    t = await login(client, "admin")
    assert set(t) == {"access", "refresh"}


async def test_login_wrong_password(client, make_user):
    await make_user("admin")
    r = await client.post("/api/auth/token/", json={"username": "admin", "password": "wrong"})
    assert r.status_code == 401
    assert r.json() == {"detail": "Нэвтрэх нэр эсвэл нууц үг буруу байна."}


async def test_me(client, make_user):
    await make_user("mgr", roles=["manager"])
    t = await login(client, "mgr")
    r = await client.get("/api/auth/me/", headers={"Authorization": f"Bearer {t['access']}"})
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "mgr"
    assert body["is_staff"] is True
    assert body["is_superuser"] is False
    assert body["roles"] == ["manager"]
    assert set(body) == {"id", "username", "full_name", "email", "is_staff", "is_superuser", "roles"}


async def test_me_without_token(client):
    r = await client.get("/api/auth/me/")
    assert r.status_code == 401


async def test_refresh_rotates(client, make_user):
    await make_user("admin", superuser=True)
    t = await login(client, "admin")
    r = await client.post("/api/auth/token/refresh/", json={"refresh": t["refresh"]})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"access", "refresh"}
    assert body["refresh"] != t["refresh"]


async def test_refresh_with_access_token_rejected(client, make_user):
    await make_user("admin", superuser=True)
    t = await login(client, "admin")
    r = await client.post("/api/auth/token/refresh/", json={"refresh": t["access"]})
    assert r.status_code == 401


async def test_inactive_user_cannot_login(client, make_user):
    u = await make_user("old")
    u.is_active = False
    r = await client.post("/api/auth/token/", json={"username": "old", "password": "pass1234"})
    assert r.status_code == 401


async def su_headers(client, make_user):
    await make_user("root", superuser=True)
    t = await login(client, "root")
    return {"Authorization": f"Bearer {t['access']}"}


async def test_users_requires_superuser(client, make_user):
    await make_user("mgr", roles=["manager"])
    t = await login(client, "mgr")
    r = await client.get("/api/auth/users/", headers={"Authorization": f"Bearer {t['access']}"})
    assert r.status_code == 403


async def test_users_crud(client, make_user):
    h = await su_headers(client, make_user)
    r = await client.get("/api/auth/roles/", headers=h)
    assert r.status_code == 200 and {x["code"] for x in r.json()} >= {"manager"}
    r = await client.post("/api/auth/users/", headers=h, json={
        "username": "bat", "password": "pass1234", "full_name": "Бат", "email": "b@x.mn", "roles": ["manager"]})
    assert r.status_code == 201, r.text
    uid = r.json()["id"]
    assert r.json()["roles"] == ["manager"] and r.json()["is_staff"] is True and r.json()["is_active"] is True
    assert "password" not in r.json() and "password_hash" not in r.json()
    r = await client.post("/api/auth/users/", headers=h, json={"username": "bat", "password": "pass1234"})
    assert r.status_code == 400 and r.json() == {"username": ["Ийм нэвтрэх нэртэй хэрэглэгч байна."]}
    r = await client.patch(f"/api/auth/users/{uid}/", headers=h, json={"roles": [], "password": "newpass99"})
    assert r.json()["roles"] == [] and r.json()["is_staff"] is False
    t = await login(client, "bat", "newpass99")
    assert "access" in t
    users = (await client.get("/api/auth/users/", headers=h)).json()
    assert [u["username"] for u in users] == ["bat", "root"]
    r = await client.delete(f"/api/auth/users/{uid}/", headers=h)
    assert r.status_code == 204


async def test_cannot_delete_self(client, make_user):
    h = await su_headers(client, make_user)
    me = (await client.get("/api/auth/me/", headers=h)).json()
    r = await client.delete(f"/api/auth/users/{me['id']}/", headers=h)
    assert r.status_code == 400 and r.json() == {"non_field_errors": ["Өөрийгөө устгаж болохгүй."]}


async def test_patch_null_password_is_noop(client, make_user):
    u = await make_user("bat")
    h = await su_headers(client, make_user)
    r = await client.patch(f"/api/auth/users/{u.id}/", headers=h, json={"password": None, "full_name": "Бат Б"})
    assert r.status_code == 200, r.text
    assert r.json()["full_name"] == "Бат Б"
    t = await login(client, "bat")
    assert "access" in t


async def test_password_too_long_rejected(client, make_user):
    h = await su_headers(client, make_user)
    r = await client.post("/api/auth/users/", headers=h, json={
        "username": "urt", "password": "Ө" * 37})
    assert r.status_code == 400
    assert r.json()["password"] == ["Нууц үг 72 байтаас урт байж болохгүй."]


async def test_cannot_demote_self(client, make_user):
    h = await su_headers(client, make_user)
    me = (await client.get("/api/auth/me/", headers=h)).json()
    r = await client.patch(f"/api/auth/users/{me['id']}/", headers=h, json={"is_superuser": False})
    assert r.status_code == 400
    assert r.json() == {"non_field_errors": ["Өөрийн эрхийг хасаж болохгүй."]}


async def test_expired_or_garbage_token_is_401(client):
    r = await client.get("/api/auth/me/", headers={"Authorization": "Bearer not.a.token"})
    assert r.status_code == 401
    assert "detail" in r.json()

    expired = jwt.encode(
        {"sub": "1", "type": "access", "exp": datetime.now(UTC) - timedelta(seconds=1)},
        settings.secret_key, algorithm="HS256",
    )
    r = await client.get("/api/auth/me/", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401
    assert "detail" in r.json()


def test_password_hash_roundtrip():
    from app.auth.security import hash_password, verify_password
    h = hash_password("Нууц үг 123")
    assert h.startswith("pbkdf2_sha256$600000$") and verify_password("Нууц үг 123", h)
    assert not verify_password("буруу", h) and not verify_password("x", "garbage")
