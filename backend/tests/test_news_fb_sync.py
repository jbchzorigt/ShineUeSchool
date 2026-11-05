"""Facebook Page → мэдээний булан sync (app/news/fb_sync.py). Graph API, зураг татахыг монкипатчаар орлуулна."""

from contextlib import asynccontextmanager

import pytest
from sqlalchemy import select

from app.config import settings
from app.news import fb_sync
from app.news.models import Post
from tests.helpers import staff_headers

PAGE = "1393080320557079"


def fb_post(n: int, message: str, created: str = "2026-11-02T09:32:30+0000", images: tuple[str, ...] = ()) -> dict:
    p = {"id": f"{PAGE}_{n}", "message": message, "created_time": created, "permalink_url": f"https://www.facebook.com/x/posts/{n}"}
    if images:
        p["full_picture"] = images[0]
        p["attachments"] = {"data": [{"media": {"image": {"src": u}}} for u in images]}
    return p


@pytest.fixture
def graph(monkeypatch, db):
    """fb_sync-ийг тестийн session, хуурамч Graph хариу, хуурамч зураг татагчтай ажиллуулна."""
    state = {"posts": []}

    @asynccontextmanager
    async def session():
        yield db

    async def fetch(_client, _max_pages):
        return list(state["posts"])

    async def download(_client, url):
        return f"news/fb/{url.rsplit('/', 1)[-1].split('?')[0]}"

    monkeypatch.setattr(fb_sync, "SessionLocal", session)
    monkeypatch.setattr(fb_sync, "fetch_posts", fetch)
    monkeypatch.setattr(fb_sync, "download_image", download)
    monkeypatch.setattr(settings, "fb_page_id", PAGE)
    monkeypatch.setattr(settings, "fb_page_access_token", "x")
    return state


def test_split_message_and_body():
    assert fb_sync.split_message("Гарчиг\nНэг\n\nХоёр") == ("Гарчиг", "Нэг\n\nХоёр")
    assert fb_sync.split_message("   ") == (fb_sync.DEFAULT_TITLE, "")
    long = "үг " * 80
    title, rest = fb_sync.split_message(long)
    assert title.endswith("…") and len(title) <= 121 and rest == long.strip()
    html = fb_sync.body_html("<b>a</b>\nb\n\nc", "https://fb/x")
    assert html.startswith("<p>&lt;b&gt;a&lt;/b&gt;<br>b</p><p>c</p>") and 'href="https://fb/x"' in html


def test_image_urls_dedupe_signed_variants():
    p = fb_post(1, "x", images=("https://cdn/a/1_n.jpg?oh=AAA", "https://cdn/a/1_n.jpg?oh=BBB", "https://cdn/a/2_n.jpg?oh=C"))
    assert fb_sync.image_urls(p) == ["https://cdn/a/1_n.jpg?oh=AAA", "https://cdn/a/2_n.jpg?oh=C"]


async def test_creates_posts_with_cover_and_gallery(graph, db):
    graph["posts"] = [fb_post(7, "Шинэ мэдээ\nДэлгэрэнгүй", images=("https://cdn/1.jpg", "https://cdn/2.jpg"))]
    assert (await fb_sync.sync_once())["created"] == 1
    p = (await db.execute(select(Post).where(Post.fb_post_id == f"{PAGE}_7"))).scalar_one()
    assert (p.title, p.excerpt, p.is_published) == ("Шинэ мэдээ", "Дэлгэрэнгүй", True)
    assert p.slug.endswith("-fb7") and p.cover_image == "news/fb/1.jpg"
    assert [i.image for i in p.images] == ["news/fb/2.jpg"]


async def test_rerun_is_idempotent_and_applies_edits(graph, db):
    graph["posts"] = [fb_post(8, "Анх")]
    await fb_sync.sync_once()
    assert (await fb_sync.sync_once())["unchanged"] == 1
    graph["posts"] = [fb_post(8, "Зассан гарчиг")]
    assert (await fb_sync.sync_once())["updated"] == 1
    p = (await db.execute(select(Post).where(Post.fb_post_id == f"{PAGE}_8"))).scalar_one()
    assert p.title == "Зассан гарчиг"
    assert len((await db.execute(select(Post).where(Post.fb_post_id == f"{PAGE}_8"))).scalars().all()) == 1


async def test_site_article_cross_posted_to_facebook_is_left_alone(graph, db):
    site = Post(title="Сайтын мэдээ", slug="saitin-medee", body_html="<p>эх</p>", is_published=True, fb_post_id=f"{PAGE}_9")
    db.add(site)
    await db.flush()
    graph["posts"] = [fb_post(9, "Сайтын мэдээ\n\nhttps://shineue.edu.mn/news/saitin-medee")]
    assert (await fb_sync.sync_once())["skipped"] == 1
    await db.refresh(site)
    assert (site.slug, site.body_html) == ("saitin-medee", "<p>эх</p>")


async def test_post_deleted_on_facebook_is_unpublished(graph, db):
    graph["posts"] = [fb_post(10, "Үлдэнэ", "2026-11-02T10:00:00+0000"), fb_post(11, "Устгагдана", "2026-11-02T11:00:00+0000")]
    await fb_sync.sync_once()
    graph["posts"] = [fb_post(10, "Үлдэнэ", "2026-11-02T10:00:00+0000")]
    assert (await fb_sync.sync_once())["hidden"] == 1
    gone = (await db.execute(select(Post).where(Post.fb_post_id == f"{PAGE}_11"))).scalar_one()
    assert gone.is_published is False


# ---- админы шийдвэрийг sync буцаахгүй ----

async def _synced(graph, db, n=20, message="Анх"):
    graph["posts"] = [fb_post(n, message)]
    await fb_sync.sync_once()
    return (await db.execute(select(Post).where(Post.fb_post_id == f"{PAGE}_{n}"))).scalar_one()


async def _reload(db, pid):
    db.expire_all()
    return await db.get(Post, pid)


async def test_admin_unpublish_survives_sync_even_if_edited_on_facebook(graph, db, client, make_user):
    post = await _synced(graph, db)
    h = await staff_headers(client, make_user, "ed", roles=("news.edit",))
    assert (await client.post(f"/api/news/admin/posts/{post.id}/unpublish/", headers=h)).status_code == 200
    graph["posts"] = [fb_post(20, "Facebook дээр зассан")]
    assert (await fb_sync.sync_once())["skipped"] == 1
    post = await _reload(db, post.id)
    assert post.is_published is False and post.title == "Анх"


async def test_admin_edit_survives_sync(graph, db, client, make_user):
    post = await _synced(graph, db)
    h = await staff_headers(client, make_user, "ed", roles=("news.edit",))
    r = await client.patch(f"/api/news/admin/posts/{post.id}/", headers=h, json={"title": "Админ зассан", "title_en": "Edited"})
    assert r.status_code == 200, r.text
    graph["posts"] = [fb_post(20, "Facebook дээр зассан")]
    assert (await fb_sync.sync_once())["skipped"] == 1
    post = await _reload(db, post.id)
    assert (post.title, post.title_en, post.is_published) == ("Админ зассан", "Edited", True)


async def test_admin_image_change_survives_sync(graph, db, client, make_user):
    graph["posts"] = [fb_post(21, "Зурагтай", images=("https://cdn.example/a.jpg", "https://cdn.example/b.jpg"))]
    await fb_sync.sync_once()
    post = (await db.execute(select(Post).where(Post.fb_post_id == f"{PAGE}_21"))).scalar_one()
    h = await staff_headers(client, make_user, "ed", roles=("news.edit",))
    image_id = post.images[0].id
    assert (await client.delete(f"/api/news/admin/images/{image_id}/", headers=h)).status_code == 204
    assert (await fb_sync.sync_once())["skipped"] == 1
    assert (await _reload(db, post.id)).images == []


async def test_admin_deleted_post_is_not_recreated(graph, db, client, make_user):
    post = await _synced(graph, db)
    h = await staff_headers(client, make_user, "ed", roles=("news.edit",))
    assert (await client.delete(f"/api/news/admin/posts/{post.id}/", headers=h)).status_code == 204
    stats = await fb_sync.sync_once()
    assert (stats["created"], stats["skipped"]) == (0, 1)
    assert (await db.execute(select(Post).where(Post.fb_post_id == f"{PAGE}_20"))).scalar_one_or_none() is None


async def test_deleted_cross_posted_site_article_is_not_imported(graph, db, client, make_user):
    site = Post(title="Сайтын мэдээ", slug="saitin-medee", is_published=True, fb_post_id=f"{PAGE}_22")
    db.add(site)
    await db.flush()
    await db.refresh(site)
    h = await staff_headers(client, make_user, "ed", roles=("news.edit",))
    assert (await client.delete(f"/api/news/admin/posts/{site.id}/", headers=h)).status_code == 204
    graph["posts"] = [fb_post(22, "Сайтын мэдээ")]
    assert (await fb_sync.sync_once())["created"] == 0


async def test_admin_republished_post_is_not_hidden_by_sync(graph, db, client, make_user):
    graph["posts"] = [fb_post(23, "Үлдэнэ", "2026-11-02T10:00:00+0000"), fb_post(24, "Устгагдана", "2026-11-02T11:00:00+0000")]
    await fb_sync.sync_once()
    graph["posts"] = [fb_post(23, "Үлдэнэ", "2026-11-02T10:00:00+0000")]
    assert (await fb_sync.sync_once())["hidden"] == 1
    gone = (await db.execute(select(Post).where(Post.fb_post_id == f"{PAGE}_24"))).scalar_one()
    h = await staff_headers(client, make_user, "ed", roles=("news.edit",))
    assert (await client.post(f"/api/news/admin/posts/{gone.id}/publish/", headers=h, json={"post_to_facebook": False})).status_code == 200
    assert (await fb_sync.sync_once())["hidden"] == 0
    assert (await _reload(db, gone.id)).is_published is True


async def test_post_hidden_by_sync_returns_when_back_on_facebook(graph, db):
    graph["posts"] = [fb_post(25, "Үлдэнэ", "2026-11-02T10:00:00+0000"), fb_post(26, "Буцаж ирнэ", "2026-11-02T11:00:00+0000")]
    both = list(graph["posts"])
    await fb_sync.sync_once()
    graph["posts"] = both[:1]
    assert (await fb_sync.sync_once())["hidden"] == 1
    graph["posts"] = both
    await fb_sync.sync_once()
    post = (await db.execute(select(Post).where(Post.fb_post_id == f"{PAGE}_26"))).scalar_one()
    assert post.is_published is True
