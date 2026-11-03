"""Facebook Page → мэдээний булан sync (app/news/fb_sync.py). Graph API, зураг татахыг монкипатчаар орлуулна."""

from contextlib import asynccontextmanager

import pytest
from sqlalchemy import select

from app.config import settings
from app.news import fb_sync
from app.news.models import Post

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
