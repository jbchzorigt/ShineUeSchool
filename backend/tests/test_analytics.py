"""Сайтын хандалт: хуудас үзэлтийн бүртгэл (робот, админ, давтан ачаалалт тоолохгүй), админы тойм (7 хоног / сар / жил)."""

import asyncio
from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.analytics.models import PageView
from app.analytics.service import record_view, ub_today
from tests.helpers import staff_headers

V = "/api/analytics/view/"
UA = {"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36"}


async def count(db) -> int:
    return (await db.execute(select(func.count(PageView.id)))).scalar_one()


async def test_view_recorded_and_deduplicated(client, db):
    r = await client.post(V, json={"path": "/news?page=2", "visitor": "visitor-aaaa-1111"}, headers=UA)
    assert r.status_code == 204
    pv = (await db.execute(select(PageView))).scalar_one()
    assert pv.path == "/news" and pv.visitor == "visitor-aaaa-1111" and pv.day == ub_today()   # query string хасна
    # 10 минутын дотор ижил хуудсыг дахин ачаалбал тоолохгүй; өөр хуудас тоологдоно
    assert (await client.post(V, json={"path": "/news", "visitor": "visitor-aaaa-1111"}, headers=UA)).status_code == 204
    assert await count(db) == 1
    await client.post(V, json={"path": "/about", "visitor": "visitor-aaaa-1111"}, headers=UA)
    assert await count(db) == 2


async def test_concurrent_duplicate_views_recorded_once(engine):
    """Нэг зочны нэг хуудсанд зэрэг ирсэн хүсэлтүүд (dev-ийн React StrictMode, давхар event) нэг л удаа тоологдоно.
    Тусдаа холболтууд жинхэнээр commit хийдэг тул мөрүүдийг төгсгөлд нь устгана."""
    maker = async_sessionmaker(engine, expire_on_commit=False)
    visitor = f"visitor-race-{uuid4().hex[:8]}"
    barrier = asyncio.Barrier(5)

    async def one() -> bool:
        async with maker() as s:
            await s.connection()   # холболтыг урьдчилан авч, бүгдийг нэг зэрэг эхлүүлнэ
            await barrier.wait()
            return await record_view(s, "/race", visitor)

    try:
        results = await asyncio.gather(*(one() for _ in range(5)))
        async with maker() as s:
            n = (await s.execute(select(func.count(PageView.id)).where(PageView.visitor == visitor))).scalar_one()
        assert n == 1
        assert sorted(results) == [False, False, False, False, True]
    finally:
        async with maker() as s:
            await s.execute(delete(PageView).where(PageView.visitor == visitor))
            await s.commit()


async def test_bots_admin_and_bad_input_ignored(client, db):
    bot = {"user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"}
    assert (await client.post(V, json={"path": "/", "visitor": "visitor-bbbb-2222"}, headers=bot)).status_code == 204
    assert (await client.post(V, json={"path": "/admin/news", "visitor": "visitor-bbbb-2222"}, headers=UA)).status_code == 204
    assert await count(db) == 0
    assert (await client.post(V, json={"path": "news", "visitor": "visitor-bbbb-2222"}, headers=UA)).status_code == 400
    assert (await client.post(V, json={"path": "/", "visitor": "x y"}, headers=UA)).status_code == 400
    assert (await client.post(V, json={"path": "/" + "a" * 300, "visitor": "visitor-bbbb-2222"}, headers=UA)).status_code == 400


async def test_summary_week_month_year(client, make_user, db):
    today = ub_today()
    old = datetime.now().astimezone() - timedelta(days=1)
    db.add_all([
        PageView(day=today, path="/", visitor="v-one-00000001", created_at=old),
        PageView(day=today, path="/news", visitor="v-one-00000001", created_at=old),
        PageView(day=today, path="/", visitor="v-two-00000002", created_at=old),
        PageView(day=today - timedelta(days=3), path="/about", visitor="v-one-00000001", created_at=old),
        PageView(day=today - timedelta(days=40), path="/", visitor="v-three-0000003", created_at=old),
    ])
    await db.flush()
    h = await staff_headers(client, make_user, "news-editor", roles=("news.view",))   # хэсгийн аль ч эрхтэй ажилтан харна
    r = await client.get("/api/analytics/admin/summary/?range=week", headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert len(d["points"]) == 7 and d["points"][-1]["date"] == today.isoformat()
    assert d["points"][-1]["visitors"] == 2 and d["points"][-1]["views"] == 3
    assert d["today"] == {"visitors": 2, "views": 3}
    assert d["total_visitors"] == 2 and d["total_views"] == 4              # 7 хоногт 2 өөр зочин, 4 үзэлт
    assert d["top_pages"][0] == {"path": "/", "views": 2}
    m = (await client.get("/api/analytics/admin/summary/?range=month", headers=h)).json()
    assert len(m["points"]) == 30 and m["total_views"] == 4
    y = (await client.get("/api/analytics/admin/summary/?range=year", headers=h)).json()
    assert len(y["points"]) == 12 and y["total_views"] == 5 and y["total_visitors"] == 3
    assert (await client.get("/api/analytics/admin/summary/?range=week")).status_code == 401
    assert (await client.get("/api/analytics/admin/summary/?range=decade", headers=h)).status_code == 400
