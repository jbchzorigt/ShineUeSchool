from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.news.models import Comment, Post
from app.news.router_public import _ip_hash
from app.social.models import Visitor
from tests.helpers import staff_headers, visitor_headers

URL = "/api/news/posts/shine/comments/"
LONG = ("Энэ мэдээ үнэхээр сайхан байна, баярлалаа. " * 3).strip()


def _ip_hash_for_test() -> str:
    class Req:
        class client:
            host = "127.0.0.1"
    return _ip_hash(Req)


async def make_post(db, slug="shine"):
    p = Post(title="Шинэ", slug=slug, is_published=True, published_at=datetime.now(UTC) - timedelta(hours=1))
    db.add(p)
    await db.flush()
    return p


async def fb_comment(db, post_id, fb_id, body="Facebook-ээр бичсэн хуучин сэтгэгдэл"):
    """Нэвтрэлтгүй болохоос өмнө бичигдсэн сэтгэгдэл."""
    v = (await db.execute(select(Visitor).where(Visitor.fb_id == fb_id))).scalar_one()
    c = Comment(post_id=post_id, visitor_id=v.id, body=body)
    db.add(c)
    await db.flush()
    return c


async def test_comment_without_login_or_facebook(client, db):
    await make_post(db)
    r = await client.post(URL, json={"name": "  Бат  ", "body": f"  {LONG}  "})
    assert r.status_code == 201
    d = r.json()
    assert (d["author_name"], d["body"], d["visitor"], d["is_mine"], d["avatar_url"]) == ("Бат", LONG, None, False, "")
    lst = (await client.get(URL)).json()
    assert len(lst) == 1 and lst[0]["author_name"] == "Бат"
    assert "ip_hash" not in lst[0]
    assert (await client.get("/api/news/posts/shine/")).json()["comments_count"] == 1


async def test_comment_validation(client, db):
    await make_post(db)
    r = await client.post(URL, json={"name": "Бат", "body": "ш" * 99})
    assert r.status_code == 400 and r.json() == {"body": ["Сэтгэгдэл 100-с доошгүй тэмдэгттэй байна."]}
    r = await client.post(URL, json={"name": "Бат", "body": " " * 150})
    assert r.status_code == 400 and "body" in r.json()
    assert (await client.post(URL, json={"name": "Бат", "body": "ш" * 100})).status_code == 201
    r = await client.post(URL, json={"name": "   ", "body": LONG})
    assert r.status_code == 400 and r.json() == {"name": ["Нэрээ бичнэ үү."]}
    assert (await client.post(URL, json={"body": LONG})).status_code == 400
    assert (await client.post(URL, json={"name": "Н" * 81, "body": LONG})).status_code == 400
    assert (await client.post(URL, json={"name": "Бат", "body": "ш" * 2001})).status_code == 400


async def test_comment_honeypot_rejected(client, db):
    await make_post(db)
    r = await client.post(URL, json={"name": "Бот", "body": LONG, "website": "http://spam.example"})
    assert r.status_code == 400
    assert (await client.get(URL)).json() == []


async def test_comment_rate_limit_per_ip(client, db):
    await make_post(db)
    for _ in range(5):
        assert (await client.post(URL, json={"name": "Бат", "body": LONG})).status_code == 201
    r = await client.post(URL, json={"name": "Бат", "body": LONG})
    assert r.status_code == 429 and "detail" in r.json()
    assert len((await client.get(URL)).json()) == 5


async def test_comment_old_ones_do_not_count_toward_limit(client, db):
    p = await make_post(db)
    db.add_all([Comment(post_id=p.id, author_name="Бат", ip_hash=_ip_hash_for_test(), body=LONG,
                        created_at=datetime.now(UTC) - timedelta(minutes=11)) for _ in range(5)])
    await db.flush()
    assert (await client.post(URL, json={"name": "Бат", "body": LONG})).status_code == 201


async def test_comment_site_wide_limit(client, db):
    p = await make_post(db)
    db.add_all([Comment(post_id=p.id, author_name="Өөр", ip_hash=f"other{i}", body=LONG) for i in range(60)])
    await db.flush()
    assert (await client.post(URL, json={"name": "Бат", "body": LONG})).status_code == 429


async def test_comment_on_draft_is_404(client, db):
    db.add(Post(title="Ноорог", slug="noorog", is_published=False))
    await db.flush()
    assert (await client.post("/api/news/posts/noorog/comments/", json={"name": "Бат", "body": LONG})).status_code == 404


async def test_old_facebook_comment_still_shown_and_deletable_by_owner(client, db, fb):
    p = await make_post(db)
    h1 = await visitor_headers(client, fb, "1", "Бат")
    h2 = await visitor_headers(client, fb, "2", "Дорж")
    c = await fb_comment(db, p.id, "1")
    lst = (await client.get(URL, headers=h2)).json()
    assert len(lst) == 1 and lst[0]["is_mine"] is False and lst[0]["author_name"] == "Бат" and lst[0]["visitor"]["name"] == "Бат"
    assert (await client.get(URL, headers=h1)).json()[0]["is_mine"] is True
    assert (await client.delete(f"/api/news/comments/{c.id}/", headers=h2)).status_code == 403
    assert (await client.delete(f"/api/news/comments/{c.id}/", headers=h1)).status_code == 204
    assert (await client.get(URL)).json() == []


async def test_like_idempotent(client, db, fb):
    await make_post(db)
    h1 = await visitor_headers(client, fb, "1", "Бат")
    h2 = await visitor_headers(client, fb, "2", "Дорж")
    assert (await client.post("/api/news/posts/shine/like/", headers=h1)).json() == {"liked": True, "likes_count": 1}
    assert (await client.post("/api/news/posts/shine/like/", headers=h1)).json() == {"liked": True, "likes_count": 1}
    assert (await client.post("/api/news/posts/shine/like/", headers=h2)).json()["likes_count"] == 2
    assert (await client.get("/api/news/posts/shine/", headers=h1)).json()["liked_by_me"] is True
    assert (await client.get("/api/news/posts/shine/")).json()["liked_by_me"] is False
    assert (await client.delete("/api/news/posts/shine/like/", headers=h1)).json() == {"liked": False, "likes_count": 1}
    assert (await client.delete("/api/news/posts/shine/like/", headers=h1)).json() == {"liked": False, "likes_count": 1}
    assert (await client.post("/api/news/posts/shine/like/")).status_code == 401


async def test_admin_hide_and_block(client, db, fb, make_user):
    p = await make_post(db)
    h1 = await visitor_headers(client, fb, "1", "Бат")
    cid = (await fb_comment(db, p.id, "1")).id
    a = await staff_headers(client, make_user, username="ed", roles=("news.edit",))
    r = await client.get("/api/news/admin/comments/", headers=a)
    assert r.json()["total"] == 1 and r.json()["items"][0]["post"]["slug"] == "shine" and r.json()["items"][0]["is_hidden"] is False
    r = await client.patch(f"/api/news/admin/comments/{cid}/", json={"is_hidden": True}, headers=a)
    assert r.json()["is_hidden"] is True
    assert (await client.get("/api/news/posts/shine/comments/")).json() == []
    assert (await client.get("/api/news/posts/shine/")).json()["comments_count"] == 0
    assert (await client.get("/api/news/admin/comments/?hidden=true", headers=a)).json()["total"] == 1
    vis = (await client.get("/api/news/admin/visitors/", headers=a)).json()
    vid = vis["items"][0]["id"]
    assert vis["items"][0]["comments_count"] == 1
    r = await client.patch(f"/api/news/admin/visitors/{vid}/", json={"is_blocked": True}, headers=a)
    assert r.json()["is_blocked"] is True
    assert (await client.post(URL, json={"name": "Бат", "body": LONG}, headers=h1)).status_code == 403
    assert (await client.delete(f"/api/news/admin/comments/{cid}/", headers=a)).status_code == 204


async def test_admin_moderates_anonymous_comment(client, db, make_user):
    await make_post(db)
    cid = (await client.post(URL, json={"name": "Бат", "body": LONG})).json()["id"]
    a = await staff_headers(client, make_user, username="ed", roles=("news.edit",))
    item = (await client.get("/api/news/admin/comments/", headers=a)).json()["items"][0]
    assert (item["author_name"], item["visitor"]) == ("Бат", None)
    r = await client.patch(f"/api/news/admin/comments/{cid}/", json={"is_hidden": True}, headers=a)
    assert r.status_code == 200 and r.json()["is_hidden"] is True and r.json()["author_name"] == "Бат"
    assert (await client.get(URL)).json() == []
    assert (await client.delete(f"/api/news/admin/comments/{cid}/", headers=a)).status_code == 204
