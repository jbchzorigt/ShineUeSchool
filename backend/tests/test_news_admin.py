import io
from datetime import UTC, datetime, timedelta

from PIL import Image

from tests.helpers import login, staff_headers


def png() -> bytes:
    b = io.BytesIO()
    Image.new("RGB", (8, 8), "red").save(b, format="PNG")
    return b.getvalue()


async def news_headers(client, make_user, username="editor"):
    return await staff_headers(client, make_user, username=username, roles=("news",))


async def test_news_role_required(client, make_user):
    h = await staff_headers(client, make_user, roles=("olympiad",))
    assert (await client.get("/api/news/admin/posts/", headers=h)).status_code == 403
    assert (await client.get("/api/news/admin/posts/")).status_code == 401


async def test_category_crud(client, make_user):
    h = await news_headers(client, make_user)
    r = await client.post("/api/news/admin/categories/", json={"name": "Олимпиад", "order": 1}, headers=h)
    assert r.status_code == 201 and r.json()["slug"] == "olimpiad"
    cid = r.json()["id"]
    r = await client.post("/api/news/admin/categories/", json={"name": "Олимпиад"}, headers=h)
    assert r.status_code == 400 and r.json() == {"slug": ["Ийм slug-тай ангилал байна."]}
    r = await client.patch(f"/api/news/admin/categories/{cid}/", json={"name": "Олимпиад 2", "slug": "olimpiad-2"}, headers=h)
    assert r.json()["slug"] == "olimpiad-2"
    r = await client.post("/api/news/admin/posts/", json={"title": "Мэдээ", "category_id": cid}, headers=h)
    pid = r.json()["id"]
    assert (await client.delete(f"/api/news/admin/categories/{cid}/", headers=h)).status_code == 204
    assert (await client.get(f"/api/news/admin/posts/{pid}/", headers=h)).json()["category"] is None


async def test_post_create_patch_delete(client, make_user):
    h = await news_headers(client, make_user)
    r = await client.post("/api/news/admin/posts/", json={"title": "Шинэ жил ирлээ", "excerpt": "Товч"}, headers=h)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["slug"] == "shine-zhil-irlee" and body["is_published"] is False and body["published_at"] is None
    assert body["author"]["full_name"] == "editor"
    assert set(body) >= {"id", "title", "slug", "excerpt", "body_html", "cover_image", "category", "published_at",
                         "is_published", "author", "images", "fb_post_id", "fb_error", "created_at", "updated_at",
                         "likes_count", "comments_count", "liked_by_me"}
    r2 = await client.post("/api/news/admin/posts/", json={"title": "Шинэ жил ирлээ"}, headers=h)
    assert r2.json()["slug"] == "shine-zhil-irlee-2"
    r = await client.patch(f"/api/news/admin/posts/{body['id']}/", json={"slug": "custom-slug", "published_at": "2026-09-19T14:30:00+08:00"}, headers=h)
    assert r.json()["slug"] == "custom-slug" and r.json()["published_at"].startswith("2026-09-19T06:30:00")
    r = await client.patch(f"/api/news/admin/posts/{r2.json()['id']}/", json={"slug": "custom-slug"}, headers=h)
    assert r.status_code == 400 and r.json() == {"slug": ["Ийм slug-тай мэдээ байна."]}
    assert (await client.get("/api/news/posts/")).json()["total"] == 0  # ноорог нийтэд харагдахгүй
    assert (await client.delete(f"/api/news/admin/posts/{body['id']}/", headers=h)).status_code == 204
    assert (await client.get(f"/api/news/admin/posts/{body['id']}/", headers=h)).status_code == 404


async def test_body_html_is_sanitized(client, make_user):
    h = await news_headers(client, make_user)
    dirty = '<p onclick="x()">Сайн <script>alert(1)</script><a href="javascript:evil()">a</a> <a href="https://x.mn">b</a></p><img src="https://x.mn/a.png" onerror="e()">'
    r = await client.post("/api/news/admin/posts/", json={"title": "T", "body_html": dirty}, headers=h)
    html = r.json()["body_html"]
    assert "<script" not in html and "onclick" not in html and "javascript:" not in html and "onerror" not in html
    assert 'href="https://x.mn"' in html and 'rel="noopener noreferrer"' in html and '<img src="https://x.mn/a.png"' in html


async def test_admin_list_filters(client, make_user):
    h = await news_headers(client, make_user)
    a = (await client.post("/api/news/admin/posts/", json={"title": "A"}, headers=h)).json()["id"]
    b = (await client.post("/api/news/admin/posts/", json={"title": "B", "published_at": datetime.now(UTC).isoformat()}, headers=h)).json()["id"]
    await client.post(f"/api/news/admin/posts/{b}/publish/", json={"post_to_facebook": False}, headers=h)
    assert {p["id"] for p in (await client.get("/api/news/admin/posts/?status=all", headers=h)).json()["items"]} == {a, b}
    assert [p["id"] for p in (await client.get("/api/news/admin/posts/?status=draft", headers=h)).json()["items"]] == [a]
    assert [p["id"] for p in (await client.get("/api/news/admin/posts/?status=published", headers=h)).json()["items"]] == [b]


async def test_cover_gallery_upload(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await news_headers(client, make_user)
    pid = (await client.post("/api/news/admin/posts/", json={"title": "Зурагтай"}, headers=h)).json()["id"]
    r = await client.post(f"/api/news/admin/posts/{pid}/cover/", headers=h, files={"image": ("c.png", png(), "image/png")})
    assert r.status_code == 200 and r.json()["cover_image"].startswith("http://test/media/news/")
    r = await client.post(f"/api/news/admin/posts/{pid}/images/", headers=h, files={"image": ("g.png", png(), "image/png")}, data={"caption": "Нээлт", "order": "2"})
    assert r.status_code == 201 and r.json()["caption"] == "Нээлт" and r.json()["order"] == 2
    iid = r.json()["id"]
    r = await client.patch(f"/api/news/admin/images/{iid}/", json={"caption": "Нээлт 2", "order": 1}, headers=h)
    assert r.json()["caption"] == "Нээлт 2"
    r = await client.post("/api/news/admin/upload-image/", headers=h, files={"image": ("b.png", png(), "image/png")})
    assert r.status_code == 201 and r.json()["url"].startswith("http://test/media/news/body/")
    assert len(list((tmp_path / "news").glob("*.png"))) == 1 and len(list((tmp_path / "news" / "body").glob("*.png"))) == 1
    detail = (await client.get(f"/api/news/admin/posts/{pid}/", headers=h)).json()
    assert len(detail["images"]) == 1
    assert (await client.delete(f"/api/news/admin/images/{iid}/", headers=h)).status_code == 204
    assert (await client.delete(f"/api/news/admin/posts/{pid}/cover/", headers=h)).status_code == 200
    assert (await client.get(f"/api/news/admin/posts/{pid}/", headers=h)).json()["cover_image"] is None
    assert list((tmp_path / "news").glob("*.png")) == []


async def test_publish_without_fb(client, make_user):
    h = await news_headers(client, make_user)
    pid = (await client.post("/api/news/admin/posts/", json={"title": "Нийтлэх"}, headers=h)).json()["id"]
    r = await client.post(f"/api/news/admin/posts/{pid}/publish/", json={"post_to_facebook": True}, headers=h)
    assert r.status_code == 200
    assert r.json()["post"]["is_published"] is True and r.json()["post"]["published_at"] is not None
    assert r.json()["fb"] == {"ok": False, "post_id": None, "error": "Facebook холболт тохируулагдаагүй."}
    assert (await client.get("/api/news/posts/")).json()["total"] == 1
    r = await client.post(f"/api/news/admin/posts/{pid}/unpublish/", headers=h)
    assert r.json()["is_published"] is False and (await client.get("/api/news/posts/")).json()["total"] == 0


async def test_publish_posts_to_facebook_once(client, make_user, fb, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "public_site_url", "https://shine-ue.edu.mn")
    h = await news_headers(client, make_user)
    pid = (await client.post("/api/news/admin/posts/", json={"title": "Нээлт", "excerpt": "Товч"}, headers=h)).json()["id"]
    r = await client.post(f"/api/news/admin/posts/{pid}/publish/", json={"post_to_facebook": True}, headers=h)
    assert r.json()["fb"] == {"ok": True, "post_id": "1_100", "error": None}
    assert fb.posts == [{"message": "Нээлт\n\nТовч", "link": f"https://shine-ue.edu.mn/news/{r.json()['post']['slug']}"}]
    assert r.json()["post"]["fb_post_id"] == "1_100"
    r = await client.post(f"/api/news/admin/posts/{pid}/publish/", json={"post_to_facebook": True}, headers=h)
    assert r.json()["fb"]["post_id"] == "1_100" and len(fb.posts) == 1


async def test_publish_fb_error_is_recorded(client, make_user, fb):
    h = await news_headers(client, make_user)
    fb.fail_post = "(#200) Permissions error"
    pid = (await client.post("/api/news/admin/posts/", json={"title": "Алдаа"}, headers=h)).json()["id"]
    r = await client.post(f"/api/news/admin/posts/{pid}/publish/", json={"post_to_facebook": True}, headers=h)
    assert r.status_code == 200 and r.json()["fb"] == {"ok": False, "post_id": None, "error": "(#200) Permissions error"}
    assert r.json()["post"]["is_published"] is True and r.json()["post"]["fb_error"] == "(#200) Permissions error"
    r = await client.post(f"/api/news/admin/posts/{pid}/publish/", json={"post_to_facebook": False}, headers=h)
    assert r.json()["fb"] == {"ok": False, "post_id": None, "error": None}


async def test_publish_scheduled_post_skips_facebook(client, make_user, fb):
    """Ирээдүйн published_at-тай мэдээг publish хийхэд Facebook рүү шууд пост хийхгүй, зөвлөмж буцаана."""
    h = await news_headers(client, make_user)
    future = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    pid = (await client.post("/api/news/admin/posts/", json={"title": "Товлосон", "published_at": future}, headers=h)).json()["id"]
    r = await client.post(f"/api/news/admin/posts/{pid}/publish/", json={"post_to_facebook": True}, headers=h)
    assert r.status_code == 200
    assert r.json()["post"]["is_published"] is True
    assert r.json()["fb"] == {"ok": False, "post_id": None,
                              "error": "Товлосон мэдээг нийтлэгдэх цагт нь Facebook-т пост хийнэ."}
    assert fb.posts == []


async def test_post_create_patch_invalid_category(client, make_user):
    h = await news_headers(client, make_user)
    r = await client.post("/api/news/admin/posts/", json={"title": "Т", "category_id": 999}, headers=h)
    assert r.status_code == 400 and r.json() == {"category_id": ["Ангилал олдсонгүй."]}
    pid = (await client.post("/api/news/admin/posts/", json={"title": "Т2"}, headers=h)).json()["id"]
    r = await client.patch(f"/api/news/admin/posts/{pid}/", json={"category_id": 999}, headers=h)
    assert r.status_code == 400 and r.json() == {"category_id": ["Ангилал олдсонгүй."]}


async def test_media_base_url_used_for_public_cover_url(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    monkeypatch.setattr(settings, "media_base_url", "https://api.example.mn/")
    h = await news_headers(client, make_user)
    pid = (await client.post("/api/news/admin/posts/", json={"title": "Зурагтай мэдээ",
                                                              "published_at": datetime.now(UTC).isoformat()},
                             headers=h)).json()["id"]
    await client.post(f"/api/news/admin/posts/{pid}/cover/", headers=h, files={"image": ("c.png", png(), "image/png")})
    await client.post(f"/api/news/admin/posts/{pid}/publish/", json={"post_to_facebook": False}, headers=h)
    r = await client.get("/api/news/posts/")
    assert r.json()["items"][0]["cover_image"].startswith("https://api.example.mn/media/news/")
