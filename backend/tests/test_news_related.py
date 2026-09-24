"""Санал болгох мэдээ: агуулгаар ойр мэдээ (related.py + /related/ endpoint)."""

from datetime import UTC, datetime, timedelta

from app.news.models import Category, Post
from app.news.related import rank, tokens


def test_tokens_stem_and_stop():
    assert tokens("Олимпиадын олимпиадад ба нь") == ["олимп", "олимп"]
    assert tokens("<p>Хичээл</p>") == ["хичээл"[:5]]


def test_rank_prefers_shared_content_and_skips_target():
    docs = {
        1: tokens("Математикийн олимпиадын хуваарь батлагдлаа олимпиад"),
        2: tokens("Олимпиадын хоёрдугаар шатны үр дүн математик"),
        3: tokens("Спортын наадам волейбол хөл бөмбөг"),
        4: tokens("Спортын наадам математик"),
    }
    r = rank(1, docs, {1: None, 2: None, 3: None, 4: None})
    ids = [pid for pid, _ in r]
    assert 1 not in ids and ids[0] == 2 and 3 not in ids   # 3-т нийтлэг үг байхгүй → орохгүй
    # ижил ангилал нэмэгдэлтэй: 4-ийн оноо CATEGORY_BONUS-оор өснө, бусад өөрчлөгдөхгүй
    r2 = dict(rank(1, docs, {1: 7, 2: None, 3: None, 4: 7}))
    assert abs(r2[4] - dict(r)[4] - 0.1) < 1e-9 and r2[2] == dict(r)[2]


async def _mk(db, slug, title, body="", cat=None, hours=1):
    p = Post(title=title, slug=slug, body_html=body, category_id=cat, is_published=True,
             published_at=datetime.now(UTC) - timedelta(hours=hours))
    db.add(p)
    await db.flush()
    return p


async def test_related_endpoint_orders_by_similarity_then_fills_newest(client, db):
    cat = Category(name="Олимпиад", slug="olimpiad", order=1)
    db.add(cat)
    await db.flush()
    await _mk(db, "a", "Олимпиадын хуваарь", "<p>Математикийн олимпиадын шатууд</p>", cat.id, hours=5)
    await _mk(db, "b", "Спортын наадам", "<p>Волейбол, хөл бөмбөг</p>", None, hours=1)
    await _mk(db, "c", "Олимпиадын үр дүн", "<p>Математикийн олимпиадын дүн</p>", cat.id, hours=9)
    await _mk(db, "d", "Дугуйлангийн бүртгэл", "<p>Шатар, хөгжим</p>", None, hours=2)
    draft = Post(title="Олимпиад ноорог", slug="e", body_html="олимпиад", is_published=False)
    db.add(draft)
    await db.flush()

    r = await client.get("/api/news/posts/a/related/")
    assert r.status_code == 200
    slugs = [p["slug"] for p in r.json()]
    assert slugs[0] == "c"                 # агуулгаар хамгийн ойр
    assert "a" not in slugs and "e" not in slugs and len(slugs) == 3
    assert slugs[1:] == ["b", "d"]         # нөхөлт: шинэ → хуучин

    r = await client.get("/api/news/posts/a/related/?limit=1")
    assert [p["slug"] for p in r.json()] == ["c"]
    assert (await client.get("/api/news/posts/zzz/related/")).status_code == 404
