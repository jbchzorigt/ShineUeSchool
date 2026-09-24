"""Хөтөлбөр — олон нийтийн GET /api/programs/ ба /{slug}/."""

from app.programs.models import Program, ProgramWork, Scholarship


async def seed(db):
    ib = Program(slug="ibdp", name="IB Diploma Programme", badge="IBDP", summary="Олон улсын бакалавр", grade_from=11, grade_to=12,
                 body_html="<p>Хэрэгжилт</p>", order=2, cover_image="programs/ib.jpg")
    cam = Program(slug="cambridge", name="Cambridge", badge="Cambridge", grade_from=7, grade_to=10, order=1)
    draft = Program(slug="draft", name="Ноорог", badge="X", grade_from=1, grade_to=2, order=3, is_published=False)
    db.add_all([ib, cam, draft])
    await db.flush()
    db.add_all([
        ProgramWork(program_id=ib.id, image="programs/w2.jpg", title="Хоёр", student="Б.Ану, 11а", order=2),
        ProgramWork(program_id=ib.id, image="programs/w1.jpg", title="Нэг", caption="Тайлбар", order=1),
        Scholarship(program_id=ib.id, student_name="Дорж", university="MIT", year=2024, amount_usd=120000, order=1),
        Scholarship(program_id=ib.id, student_name="Сараа", university="UBC", year=2025, amount_usd=80000, order=2, photo="programs/s.jpg"),
        Scholarship(program_id=ib.id, student_name="Бат", university="UofT", year=2025, amount_usd=50000, order=1),
    ])
    await db.flush()
    return ib, cam, draft


async def test_list_published_ordered(client, db):
    await seed(db)
    r = await client.get("/api/programs/")
    assert r.status_code == 200, r.text
    items = r.json()
    assert [p["slug"] for p in items] == ["cambridge", "ibdp"]   # order-оор, ноорог орохгүй
    ib = items[1]
    assert ib["badge"] == "IBDP" and ib["grade_from"] == 11 and ib["grade_to"] == 12 and ib["cover_image"].endswith("/media/programs/ib.jpg")
    assert items[0]["cover_image"] is None and "body_html" not in items[0]


async def test_detail_works_scholarships_totals(client, db):
    await seed(db)
    r = await client.get("/api/programs/ibdp/")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["body_html"] == "<p>Хэрэгжилт</p>"
    assert [w["title"] for w in d["works"]] == ["Нэг", "Хоёр"] and d["works"][0]["image"].endswith("/media/programs/w1.jpg") and d["works"][0]["caption"] == "Тайлбар"
    assert [s["student_name"] for s in d["scholarships"]] == ["Бат", "Сараа", "Дорж"]   # year DESC, order
    assert d["scholarships"][1]["photo"].endswith("/media/programs/s.jpg") and d["scholarships"][0]["photo"] is None
    assert d["scholarship_total_usd"] == 250000 and d["scholarship_count"] == 3
    assert (await client.get("/api/programs/draft/")).status_code == 404
    assert (await client.get("/api/programs/nope/")).status_code == 404
