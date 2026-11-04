"""Хэсэг тус бүрийн харах/засах эрх."""

from app.olympiad.models import AlbumPhoto
from tests.helpers import login, staff_headers

STAGE = {"year": 2026, "title": "Шат", "date_text": "3-р сар"}


async def test_view_can_read_but_not_write(client, make_user):
    h = await staff_headers(client, make_user, "viewer", roles=("about.view",))
    assert (await client.get("/api/about/admin/page/", headers=h)).status_code == 200
    r = await client.patch("/api/about/admin/page/", json={"intro_title": "Х"}, headers=h)
    assert r.status_code == 403 and r.json() == {"detail": "Танд энэ хэсгийг зөвхөн харах эрх байна."}


async def test_no_section_access(client, make_user):
    h = await staff_headers(client, make_user, "other", roles=("news.edit",))
    r = await client.get("/api/about/admin/page/", headers=h)
    assert r.status_code == 403 and r.json() == {"detail": "Энэ үйлдэлд эрх хүрэхгүй."}


async def test_edit_includes_view(client, make_user):
    h = await staff_headers(client, make_user, "editor", roles=("about.edit",))
    assert (await client.get("/api/about/admin/page/", headers=h)).status_code == 200
    assert (await client.patch("/api/about/admin/page/", json={"intro_title": "Х"}, headers=h)).status_code == 200


async def test_news_router_level_view(client, make_user):
    h = await staff_headers(client, make_user, "nv", roles=("news.view",))
    assert (await client.get("/api/news/admin/posts/", headers=h)).status_code == 200
    assert (await client.post("/api/news/admin/categories/", json={"name": "Шинэ"}, headers=h)).status_code == 403


async def test_olympiad_requires_olympiad_section(client, make_user):
    for username, roles, code in [("n", ("news.edit",), 403), ("ov", ("olympiad.view",), 403), ("oe", ("olympiad.edit",), 201)]:
        h = await staff_headers(client, make_user, username, roles=roles)
        assert (await client.post("/api/olympiad/schedule/", json=STAGE, headers=h)).status_code == code, username


async def test_unpublished_album_visible_with_olympiad_view(client, make_user, db):
    db.add_all([AlbumPhoto(image="album/a.jpg", title="А", caption="А", order=1),
                AlbumPhoto(image="album/b.jpg", title="Б", caption="Б", order=2, is_published=False)])
    await db.flush()
    for username, roles, n in [("n", ("news.edit",), 1), ("ov", ("olympiad.view",), 2)]:
        h = await staff_headers(client, make_user, username, roles=roles)
        assert len((await client.get("/api/olympiad/album/", headers=h)).json()) == n, username


async def test_user_roles_normalized_and_validated(client, make_user):
    await make_user("root", superuser=True)
    h = {"Authorization": f"Bearer {(await login(client, 'root'))['access']}"}
    r = await client.post("/api/auth/users/", headers=h, json={
        "username": "bat", "password": "pass1234", "roles": ["about.view", "about.edit", "news.view"]})
    assert r.status_code == 201, r.text
    assert r.json()["roles"] == ["about.edit", "news.view"]
    r = await client.post("/api/auth/users/", headers=h, json={"username": "dorj", "password": "pass1234", "roles": ["manager"]})
    assert r.status_code == 400 and r.json() == {"roles": ["Танигдаагүй эрх: manager"]}
