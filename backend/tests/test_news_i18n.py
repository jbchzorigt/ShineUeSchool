"""Мэдээ — англи хувилбар: нийтийн API `?lang=` шүүлт/404/`languages`, админы англи талбарууд."""

from datetime import UTC, datetime, timedelta

from app.news.models import Category, Post, PostImage


async def seed(db):
    cat = Category(name="Олимпиад", name_en="Olympiad", slug="olimpiad", order=1)
    db.add(cat)
    await db.flush()
    at = datetime.now(UTC) - timedelta(minutes=5)
    common = dict(category_id=cat.id, is_published=True)
    posts = [
        Post(slug="both", title="Хоёр хэл", title_en="Both EN", excerpt="Товч", excerpt_en="Short",
             body_html="<p>MN</p>", body_html_en="<p>EN</p>", published_at=at, **common),
        Post(slug="mn-only", title="Зөвхөн монгол", excerpt="Монгол товч", body_html="<p>MN</p>",
             published_at=at - timedelta(minutes=1), **common),
        Post(slug="en-only", title="", title_en="Title EN only", excerpt_en="Only EN", body_html_en="<p>EN only</p>",
             published_at=at - timedelta(minutes=2), **common),
        Post(slug="en-title-only", title="Гарчиг", title_en="Title EN", excerpt="Товч MN", body_html="<p>MN</p>",
             published_at=at - timedelta(minutes=3), **common),
    ]
    db.add_all(posts)
    await db.flush()
    db.add(PostImage(post_id=posts[0].id, image="news/a.jpg", caption="Зураг", caption_en="Photo", order=0))
    await db.flush()
    return posts


async def test_list_filters_by_lang(client, db):
    await seed(db)
    mn = [p["slug"] for p in (await client.get("/api/news/posts/")).json()["items"]]
    en = [p["slug"] for p in (await client.get("/api/news/posts/?lang=en")).json()["items"]]
    assert set(mn) == {"both", "mn-only", "en-title-only"}
    assert set(en) == {"both", "en-only", "en-title-only"}
    assert (await client.get("/api/news/posts/?lang=fr")).status_code == 400   # төслийн validation handler 422 → 400


async def test_detail_lang_and_404(client, db):
    await seed(db)
    d = (await client.get("/api/news/posts/both/?lang=en")).json()
    assert d["title"] == "Both EN" and d["body_html"] == "<p>EN</p>" and d["languages"] == ["mn", "en"]
    assert d["category"]["name"] == "Olympiad" and d["images"][0]["caption"] == "Photo"
    m = (await client.get("/api/news/posts/both/")).json()
    assert m["title"] == "Хоёр хэл" and m["category"]["name"] == "Олимпиад" and m["images"][0]["caption"] == "Зураг"
    assert (await client.get("/api/news/posts/mn-only/?lang=en")).status_code == 404
    assert (await client.get("/api/news/posts/en-only/")).status_code == 404
    assert (await client.get("/api/news/posts/en-only/?lang=en")).json()["languages"] == ["en"]


async def test_en_title_only_no_body_fallback(client, db):
    await seed(db)
    d = (await client.get("/api/news/posts/en-title-only/?lang=en")).json()
    assert d["title"] == "Title EN" and d["body_html"] == "" and d["excerpt"] == "Товч MN"   # товч fallback, бие fallback-гүй


async def test_related_and_categories_by_lang(client, db):
    await seed(db)
    rel = [p["slug"] for p in (await client.get("/api/news/posts/both/related/?lang=en&limit=10")).json()]
    assert "mn-only" not in rel and "en-only" in rel
    rel_mn = [p["slug"] for p in (await client.get("/api/news/posts/both/related/?limit=10")).json()]
    assert "en-only" not in rel_mn
    cats = (await client.get("/api/news/categories/?lang=en")).json()
    assert cats[0]["name"] == "Olympiad" and cats[0]["post_count"] == 3   # en хэлтэй мэдээ л тоологдоно
    assert (await client.get("/api/news/categories/")).json()[0]["post_count"] == 3


async def test_comments_work_for_en_only_post(client, db):
    await seed(db)
    assert (await client.get("/api/news/posts/en-only/comments/")).status_code == 200


# ---- админ (Task 3) ----
from tests.helpers import staff_headers  # noqa: E402


async def test_admin_title_one_required_and_en_slug(client, make_user):
    h = await staff_headers(client, make_user, roles=("news.edit",))
    r = await client.post("/api/news/admin/posts/", json={"title": "", "title_en": ""}, headers=h)
    assert r.status_code == 400 and r.json()["title"] == ["Монгол эсвэл англи гарчиг заавал."]
    r = await client.post("/api/news/admin/posts/", headers=h,
                          json={"title": "", "title_en": "Open Day 2026", "body_html_en": "<p>Hi</p><script>x</script>"})
    assert r.status_code == 201, r.text
    assert r.json()["slug"] == "open-day-2026" and "<script" not in r.json()["body_html_en"]
    pid = r.json()["id"]
    r = await client.patch(f"/api/news/admin/posts/{pid}/", json={"title_en": ""}, headers=h)
    assert r.status_code == 400   # хоёулаа хоосон болох гэж байна
    r = await client.patch(f"/api/news/admin/posts/{pid}/", json={"excerpt_en": "Short", "body_html_en": "<p>x</p><script>y</script>"}, headers=h)
    assert r.json()["excerpt_en"] == "Short" and "<script" not in r.json()["body_html_en"]


async def test_admin_lists_en_only_post_and_category_en(client, db, make_user):
    h = await staff_headers(client, make_user, roles=("news.edit",))
    await seed(db)
    items = (await client.get("/api/news/admin/posts/", headers=h)).json()["items"]
    assert "en-only" in [p["slug"] for p in items]
    both = next(p for p in items if p["slug"] == "both")
    assert both["title"] == "Хоёр хэл" and both["title_en"] == "Both EN" and both["body_html_en"] == "<p>EN</p>"
    r = await client.post("/api/news/admin/categories/", json={"name": "Спорт", "name_en": "Sports"}, headers=h)
    assert r.status_code == 201 and r.json()["name_en"] == "Sports"
    r = await client.patch(f"/api/news/admin/categories/{r.json()['id']}/", json={"name_en": "Sport"}, headers=h)
    assert r.json()["name_en"] == "Sport"


async def test_admin_image_caption_en(client, db, make_user):
    h = await staff_headers(client, make_user, roles=("news.edit",))
    await seed(db)
    from sqlalchemy import select
    img_id = (await db.execute(select(PostImage.id))).scalar_one()
    r = await client.patch(f"/api/news/admin/images/{img_id}/", json={"caption_en": "New photo"}, headers=h)
    assert r.status_code == 200 and r.json()["caption_en"] == "New photo"


async def test_facebook_message_falls_back_to_en(client, make_user, fb, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "public_site_url", "https://shine-ue.edu.mn")
    h = await staff_headers(client, make_user, roles=("news.edit",))
    pid = (await client.post("/api/news/admin/posts/", json={"title_en": "Open Day", "excerpt_en": "Short"}, headers=h)).json()["id"]
    r = await client.post(f"/api/news/admin/posts/{pid}/publish/", json={"post_to_facebook": True}, headers=h)
    assert fb.posts == [{"message": "Open Day\n\nShort", "link": f"https://shine-ue.edu.mn/en/news/{r.json()['post']['slug']}"}]


async def test_admin_empty_english_body_saved_as_empty(client, make_user):
    h = await staff_headers(client, make_user, roles=("news.edit",))
    r = await client.post("/api/news/admin/posts/", headers=h, json={"title": "Т", "title_en": "T", "body_html_en": "<p></p>"})
    assert r.json()["body_html_en"] == ""
    r = await client.patch(f"/api/news/admin/posts/{r.json()['id']}/", headers=h, json={"body_html_en": "<p> </p><p></p>"})
    assert r.json()["body_html_en"] == ""
