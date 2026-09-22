from app.timetable.models import Lesson
from tests.helpers import seed_timetable


async def test_class_pdf(client, db):
    tt = await seed_timetable(db)
    db.add(Lesson(class_group_id=tt.classes["9а"].id, weekday=1, period_id=tt.p[("s", 1)].id,
                  subject_id=tt.subjects["Математик"].id, teacher_id=tt.teachers["Б.Мухулай"].id, room_id=tt.rooms["204"].id))
    await db.flush()
    r = await client.get(f"/api/timetable/classes/{tt.classes['9а'].id}/timetable.pdf")
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("application/pdf")
    assert r.content[:5] == b"%PDF-" and len(r.content) > 2000
    assert "filename" in r.headers["content-disposition"]
    assert (await client.get("/api/timetable/classes/999999/timetable.pdf")).status_code == 404


async def test_pdf_of_empty_class_and_breaks(client, db):
    tt = await seed_timetable(db)
    r = await client.get(f"/api/timetable/classes/{tt.classes['1а'].id}/timetable.pdf")  # завсарлагатай хүснэгт, хичээлгүй
    assert r.status_code == 200 and r.content[:5] == b"%PDF-"
