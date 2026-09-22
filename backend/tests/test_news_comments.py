from datetime import UTC, datetime, timedelta

from app.news.models import Post
from tests.helpers import staff_headers, visitor_headers


async def make_post(db, slug="shine"):
    p = Post(title="Шинэ", slug=slug, is_published=True, published_at=datetime.now(UTC) - timedelta(hours=1))
    db.add(p)
    await db.flush()
    return p


async def test_comment_requires_visitor_and_fb(client, db):
    await make_post(db)
    r = await client.post("/api/news/posts/shine/comments/", json={"body": "x"})
    assert r.status_code == 503


async def test_comment_flow(client, db, fb):
    await make_post(db)
    h1 = await visitor_headers(client, fb, "1", "Бат")
    h2 = await visitor_headers(client, fb, "2", "Дорж")
    assert (await client.post("/api/news/posts/shine/comments/", json={"body": "  "}, headers=h1)).status_code == 400
    r = await client.post("/api/news/posts/shine/comments/", json={"body": ""}, headers=h1)
    assert r.status_code == 400 and r.json() == {"body": ["Сэтгэгдэл хоосон байж болохгүй."]}
    r = await client.post("/api/news/posts/shine/comments/", json={"body": "Сайн мэдээ"}, headers=h1)
    assert r.status_code == 201 and r.json()["visitor"]["name"] == "Бат" and r.json()["is_mine"] is True
    cid = r.json()["id"]
    lst = (await client.get("/api/news/posts/shine/comments/", headers=h2)).json()
    assert len(lst) == 1 and lst[0]["is_mine"] is False
    assert (await client.get("/api/news/posts/shine/")).json()["comments_count"] == 1
    assert (await client.delete(f"/api/news/comments/{cid}/", headers=h2)).status_code == 403
    assert (await client.delete(f"/api/news/comments/{cid}/", headers=h1)).status_code == 204
    assert (await client.get("/api/news/posts/shine/comments/")).json() == []


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
    await make_post(db)
    h1 = await visitor_headers(client, fb, "1", "Бат")
    cid = (await client.post("/api/news/posts/shine/comments/", json={"body": "Муу үг"}, headers=h1)).json()["id"]
    a = await staff_headers(client, make_user, username="ed", roles=("news",))
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
    assert (await client.post("/api/news/posts/shine/comments/", json={"body": "дахин"}, headers=h1)).status_code == 403
    assert (await client.delete(f"/api/news/admin/comments/{cid}/", headers=a)).status_code == 204
