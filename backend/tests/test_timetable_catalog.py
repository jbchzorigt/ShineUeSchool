from app.timetable.models import Lesson
from tests.helpers import timetable_setup


async def test_subjects(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    names = [s["name"] for s in (await client.get("/api/timetable/subjects/")).json()]
    assert names == ["Математик", "Монгол хэл", "Физик"]

    r = await client.post("/api/timetable/subjects/", headers=h, json={"name": "Хими", "short_name": "Хим", "color": "#123456"})
    assert r.status_code == 201, r.text
    sid = r.json()["id"]
    r = await client.post("/api/timetable/subjects/", headers=h, json={"name": "Хими", "short_name": "Х"})
    assert r.json() == {"name": ["Ийм нэртэй хичээл байна."]}
    r = await client.post("/api/timetable/subjects/", headers=h, json={"name": "Био", "short_name": "Б", "color": "red"})
    assert r.status_code == 400 and "color" in r.json()
    r = await client.patch(f"/api/timetable/subjects/{sid}/", headers=h, json={"short_name": "Хими"})
    assert r.json()["short_name"] == "Хими" and r.json()["color"] == "#123456"
    assert (await client.delete(f"/api/timetable/subjects/{sid}/", headers=h)).status_code == 204

    db.add(Lesson(class_group_id=tt.classes["9а"].id, weekday=1, period_id=tt.p[("s", 1)].id,
                  subject_id=tt.subjects["Физик"].id, teacher_id=tt.teachers["Ц.Болд"].id))
    await db.flush()
    r = await client.delete(f"/api/timetable/subjects/{tt.subjects['Физик'].id}/", headers=h)
    assert r.status_code == 400 and r.json() == {"non_field_errors": ["Энэ хичээл хуваарьт ашиглагдаж байна."]}


async def test_teachers(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    ts = (await client.get("/api/timetable/teachers/")).json()
    assert [t["short_name"] for t in ts] == ["Б.Мухулай", "Д.Сараа", "Ц.Болд"]
    assert ts[0]["full_name"] == "Батаа Мухулай" and ts[0]["subject_ids"] == [tt.subjects["Математик"].id]

    body = {"last_name": "Ганбат", "first_name": "Оюун", "short_name": "Г.Оюун",
            "subject_ids": [tt.subjects["Математик"].id, tt.subjects["Физик"].id]}
    r = await client.post("/api/timetable/teachers/", headers=h, json=body)
    assert r.status_code == 201, r.text
    tid = r.json()["id"]
    assert sorted(r.json()["subject_ids"]) == sorted(body["subject_ids"]) and r.json()["is_active"] is True
    r = await client.post("/api/timetable/teachers/", headers=h, json={**body, "subject_ids": [999999]})
    assert r.status_code == 400 and "subject_ids" in r.json()
    r = await client.post("/api/timetable/teachers/", headers=h, json=body)
    assert r.json() == {"short_name": ["Ийм товч нэртэй багш байна."]}

    r = await client.patch(f"/api/timetable/teachers/{tid}/", headers=h, json={"is_active": False, "subject_ids": []})
    assert r.json()["is_active"] is False and r.json()["subject_ids"] == []
    assert len((await client.get("/api/timetable/teachers/?active=true")).json()) == 3
    assert len((await client.get("/api/timetable/teachers/?active=false")).json()) == 1
    assert (await client.delete(f"/api/timetable/teachers/{tid}/", headers=h)).status_code == 204

    db.add(Lesson(class_group_id=tt.classes["9а"].id, weekday=1, period_id=tt.p[("s", 1)].id,
                  subject_id=tt.subjects["Физик"].id, teacher_id=tt.teachers["Ц.Болд"].id))
    await db.flush()
    r = await client.delete(f"/api/timetable/teachers/{tt.teachers['Ц.Болд'].id}/", headers=h)
    assert r.status_code == 400 and "non_field_errors" in r.json()


async def test_rooms(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    assert [r["name"] for r in (await client.get("/api/timetable/rooms/")).json()] == ["101", "204", "205"]
    r = await client.post("/api/timetable/rooms/", headers=h, json={"name": "Спорт заал", "capacity": 60, "kind": "gym"})
    assert r.status_code == 201 and r.json()["kind"] == "gym"
    rid = r.json()["id"]
    r = await client.post("/api/timetable/rooms/", headers=h, json={"name": "204"})
    assert r.json() == {"name": ["Ийм нэртэй өрөө байна."]}
    r = await client.post("/api/timetable/rooms/", headers=h, json={"name": "x", "kind": "pool"})
    assert r.status_code == 400 and "kind" in r.json()
    r = await client.patch(f"/api/timetable/rooms/{rid}/", headers=h, json={"capacity": None})
    assert r.json()["capacity"] is None
    assert (await client.delete(f"/api/timetable/rooms/{rid}/", headers=h)).status_code == 204

    # Өрөө хуваарьт байсан ч устгаж болно (lessons.room_id SET NULL)
    db.add(Lesson(class_group_id=tt.classes["9а"].id, weekday=1, period_id=tt.p[("s", 1)].id,
                  subject_id=tt.subjects["Физик"].id, teacher_id=tt.teachers["Ц.Болд"].id, room_id=tt.rooms["204"].id))
    await db.flush()
    assert (await client.delete(f"/api/timetable/rooms/{tt.rooms['204'].id}/", headers=h)).status_code == 204
