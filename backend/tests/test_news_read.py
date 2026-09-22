from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.news.models import Category, Comment, Like, Post, PostImage
from app.news.slug import slugify, unique_slug
from app.social.models import Visitor


def test_slugify_cyrillic():
    assert slugify("Ү.Маамын нэрэмжит олимпиад 2026!") == "u-maamyn-neremzhit-olimpiad-2026"
    assert slugify("   ") == "post"
    assert slugify("Hello  World") == "hello-world"


async def test_unique_slug_and_models(db):
    cat = Category(name="Олимпиад", slug="olimpiad", order=1)
    db.add(cat)
    await db.flush()
    p1 = Post(title="Шинэ жил", slug=await unique_slug(db, "shine-zhil"), category_id=cat.id)
    db.add(p1)
    await db.flush()
    assert p1.slug == "shine-zhil" and p1.is_published is False and p1.published_at is None
    assert await unique_slug(db, "shine-zhil") == "shine-zhil-2"
    assert await unique_slug(db, "shine-zhil", exclude_id=p1.id) == "shine-zhil"
    v = Visitor(fb_id="123", name="Бат")
    db.add(v)
    await db.flush()
    db.add(PostImage(post_id=p1.id, image="news/a.jpg", caption="", order=0))
    db.add(Comment(post_id=p1.id, visitor_id=v.id, body="Сайн байна"))
    db.add(Like(post_id=p1.id, visitor_id=v.id))
    await db.flush()
    p1.is_published = True
    p1.published_at = datetime.now(UTC) - timedelta(minutes=1)
    assert p1.is_public_now(datetime.now(UTC)) is True
    p1.published_at = datetime.now(UTC) + timedelta(days=1)
    assert p1.is_public_now(datetime.now(UTC)) is False
    assert (await db.execute(select(Like).where(Like.post_id == p1.id))).scalar_one().visitor_id == v.id


import pytest


async def seed_posts(db):
    cat = Category(name="Олимпиад", slug="olimpiad", order=1)
    cat2 = Category(name="Сургууль", slug="surguuli", order=2)
    db.add_all([cat, cat2])
    await db.flush()
    now = datetime.now(UTC)
    posts = [
        Post(title="Хуучин", slug="huuchin", category_id=cat.id, is_published=True, published_at=now - timedelta(days=3), excerpt="a"),
        Post(title="Шинэ", slug="shine", category_id=cat.id, is_published=True, published_at=now - timedelta(hours=1), body_html="<p>Сайн</p>"),
        Post(title="Ноорог", slug="noorog", category_id=cat2.id, is_published=False, published_at=now - timedelta(days=1)),
        Post(title="Товлосон", slug="tovloson", category_id=cat2.id, is_published=True, published_at=now + timedelta(days=1)),
        Post(title="Сургуулийн", slug="surguuliin", category_id=cat2.id, is_published=True, published_at=now - timedelta(days=2)),
    ]
    db.add_all(posts)
    await db.flush()
    return cat, cat2, posts


async def test_posts_list_public_only_and_ordered(client, db):
    await seed_posts(db)
    r = await client.get("/api/news/posts/")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"items", "total", "page", "page_size"}
    assert body["total"] == 3 and body["page"] == 1 and body["page_size"] == 12
    assert [p["slug"] for p in body["items"]] == ["shine", "surguuliin", "huuchin"]
    card = body["items"][0]
    assert set(card) == {"id", "title", "slug", "excerpt", "cover_image", "category", "published_at", "likes_count", "comments_count"}
    assert card["category"] == {"id": card["category"]["id"], "name": "Олимпиад", "slug": "olimpiad"}
    assert card["cover_image"] is None and card["likes_count"] == 0


async def test_posts_list_pagination_and_category(client, db):
    await seed_posts(db)
    r = await client.get("/api/news/posts/?page=2&page_size=2")
    assert [p["slug"] for p in r.json()["items"]] == ["huuchin"] and r.json()["total"] == 3
    r = await client.get("/api/news/posts/?category=surguuli")
    assert [p["slug"] for p in r.json()["items"]] == ["surguuliin"]
    r = await client.get("/api/news/posts/?page_size=500")
    assert r.json()["page_size"] == 50
    r = await client.get("/api/news/posts/?page=0")
    assert r.status_code == 400


async def test_post_detail(client, db):
    await seed_posts(db)
    r = await client.get("/api/news/posts/shine/")
    body = r.json()
    assert body["body_html"] == "<p>Сайн</p>" and body["images"] == [] and body["liked_by_me"] is False
    assert set(body) >= {"body_html", "images", "liked_by_me", "fb_post_id", "title", "slug"}
    assert (await client.get("/api/news/posts/noorog/")).status_code == 404
    assert (await client.get("/api/news/posts/tovloson/")).status_code == 404


async def test_categories_with_counts(client, db):
    await seed_posts(db)
    r = await client.get("/api/news/categories/")
    assert r.json() == [
        {"id": r.json()[0]["id"], "name": "Олимпиад", "slug": "olimpiad", "order": 1, "post_count": 2},
        {"id": r.json()[1]["id"], "name": "Сургууль", "slug": "surguuli", "order": 2, "post_count": 1},
    ]


async def test_comments_list_empty(client, db):
    await seed_posts(db)
    assert (await client.get("/api/news/posts/shine/comments/")).json() == []
    assert (await client.get("/api/news/posts/noorog/comments/")).status_code == 404
