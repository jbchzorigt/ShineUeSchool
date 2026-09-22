from decimal import Decimal

from sqlalchemy import select

from app.olympiad.models import CATEGORIES, Result, Stage


async def test_models_persist(db):
    db.add(Stage(year=2026, order=1, title="Бүртгэл", date_text="2026 · 10 сар", tags=["Онлайн"]))
    db.add(Result(year=2025, category="9", last_name="Бат", first_name="Мухулай", school="Шинэ Үе", scores=[7, 7], score=Decimal("14")))
    await db.flush()
    r = (await db.execute(select(Result))).scalar_one()
    assert r.student == "Б.Мухулай"
    assert r.full_name == "Бат Мухулай"
    assert CATEGORIES[0] == {"value": "6", "label": "VI анги"}
    assert CATEGORIES[-1] == {"value": "teacher_secondary", "label": "Дунд ангийн багш"}


async def seed(db):
    db.add_all([
        Stage(year=2025, order=1, title="Бүртгэл", date_text="2025 · 10 сар", tags=["Онлайн"]),
        Stage(year=2026, order=2, title="I шат", date_text="2026 · 11 сар"),
        Stage(year=2026, order=1, title="Бүртгэл", date_text="2026 · 10 сар"),
        Result(year=2025, category="9", last_name="Бат", first_name="А", score=Decimal("95")),
        Result(year=2025, category="9", last_name="Дорж", first_name="Б", score=Decimal("88"), rank=7),
        Result(year=2025, category="9", last_name="Цэнд", first_name="В", score=None),
        Result(year=2025, category="10", last_name="Сүх", first_name="Г", score=Decimal("90")),
        Result(year=2024, category="6", last_name="Наран", first_name="Д", score=Decimal("70")),
    ])
    await db.flush()


async def test_years(client, db):
    await seed(db)
    r = await client.get("/api/olympiad/years/")
    assert r.json() == {"schedule": [2025, 2026], "results": [2024, 2025]}


async def test_categories_all_and_by_year(client, db):
    await seed(db)
    assert len((await client.get("/api/olympiad/categories/")).json()) == 9
    r = await client.get("/api/olympiad/categories/?year=2025")
    assert [c["value"] for c in r.json()] == ["9", "10"]


async def test_stats(client, db):
    await seed(db)
    body = (await client.get("/api/olympiad/stats/")).json()
    assert body == {
        "stages": 3, "results": 5, "photos": 0,
        "results_by_year": [{"year": 2024, "count": 1}, {"year": 2025, "count": 4}],
        "latest_year": 2026,
    }


async def test_schedule_filtered_and_ordered(client, db):
    await seed(db)
    r = await client.get("/api/olympiad/schedule/?year=2026")
    body = r.json()
    assert [s["order"] for s in body] == [1, 2]
    assert set(body[0]) == {"id", "year", "order", "title", "date_text", "date", "text", "tags", "location"}
    assert body[0]["date"] is None and body[0]["tags"] == []


async def test_results_rank_computed_or_manual(client, db):
    await seed(db)
    r = await client.get("/api/olympiad/results/?year=2025&category=9")
    body = r.json()
    assert [(x["student"], x["rank"], x["score"]) for x in body] == [("Б.А", 1, 95.0), ("Д.Б", 7, 88.0), ("Ц.В", 3, None)]
    assert body[0]["category_label"] == "IX анги"
    assert body[0]["full_name"] == "Бат А"
    assert set(body[0]) == {"id", "year", "category", "category_label", "rank", "rank_label", "medal", "last_name",
                            "first_name", "student", "full_name", "school", "code", "scores", "score", "note"}


async def test_album_public_only_published(client, db):
    from app.olympiad.models import AlbumPhoto
    db.add_all([AlbumPhoto(image="album/a.jpg", title="А", caption="А", order=2), AlbumPhoto(image="album/b.jpg", title="Б", caption="Б", order=1, is_published=False)])
    await db.flush()
    body = (await client.get("/api/olympiad/album/")).json()
    assert len(body) == 1
    assert body[0]["image"] == "http://test/media/album/a.jpg"
    assert set(body[0]) == {"id", "order", "image", "title", "caption", "is_published"}
