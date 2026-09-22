from tests.helpers import timetable_setup
from tests.test_timetable_grid import cell


async def test_classes(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    cs = (await client.get("/api/timetable/classes/")).json()
    assert [c["name"] for c in cs] == ["1а", "9а", "9б"]
    assert cs[0]["period_set_id"] == tt.primary.id and cs[0]["homeroom_teacher_id"] is None

    body = {"year_id": tt.year.id, "grade": 9, "letter": "в", "period_set_id": tt.secondary.id,
            "homeroom_teacher_id": tt.teachers["Ц.Болд"].id}
    r = await client.post("/api/timetable/classes/", headers=h, json=body)
    assert r.status_code == 201, r.text
    cid = r.json()["id"]
    assert r.json()["name"] == "9в"
    r = await client.post("/api/timetable/classes/", headers=h, json=body)
    assert r.json() == {"letter": ["Энэ жилд ийм анги байна."]}
    r = await client.post("/api/timetable/classes/", headers=h, json={**body, "letter": "г", "period_set_id": 999999})
    assert r.status_code == 400 and "period_set_id" in r.json()
    r = await client.post("/api/timetable/classes/", headers=h, json={**body, "letter": "г", "homeroom_teacher_id": 999999})
    assert r.status_code == 400 and "homeroom_teacher_id" in r.json()
    r = await client.post("/api/timetable/classes/", headers=h, json={**body, "letter": "г", "grade": 13})
    assert r.status_code == 400 and "grade" in r.json()

    r = await client.patch(f"/api/timetable/classes/{cid}/", headers=h, json={"period_set_id": tt.primary.id, "homeroom_teacher_id": None})
    assert r.json()["period_set_id"] == tt.primary.id and r.json()["homeroom_teacher_id"] is None
    assert (await client.delete(f"/api/timetable/classes/{cid}/", headers=h)).status_code == 204
    assert len((await client.get(f"/api/timetable/classes/?year={tt.year.id}")).json()) == 3


async def test_class_period_set_locked_while_lessons_exist(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    c9 = tt.classes["9а"].id
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h,
                         json=[cell(tt, 1, ("s", 1), "Математик", "Б.Мухулай", "204")])
    assert r.status_code == 200, r.text

    r = await client.patch(f"/api/timetable/classes/{c9}/", headers=h, json={"period_set_id": tt.primary.id})
    assert r.status_code == 400
    assert r.json() == {"period_set_id": ["Энэ ангид хуваарь байна; эхлээд хуваарийг хоослоно уу."]}

    r = await client.patch(f"/api/timetable/classes/{c9}/", headers=h,
                           json={"homeroom_teacher_id": tt.teachers["Ц.Болд"].id})
    assert r.status_code == 200, r.text
    assert r.json()["homeroom_teacher_id"] == tt.teachers["Ц.Болд"].id


async def test_period_set_must_belong_to_class_year(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    r = await client.post("/api/timetable/years/", headers=h,
                          json={"name": "2027–2028", "start_date": "2027-09-01", "end_date": "2028-06-10"})
    y2 = r.json()["id"]
    r = await client.post("/api/timetable/classes/", headers=h,
                          json={"year_id": y2, "grade": 1, "letter": "а", "period_set_id": tt.primary.id})
    assert r.json() == {"period_set_id": ["Цагийн хүснэгт энэ жилийнх биш."]}


async def test_curriculum(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    c9 = tt.classes["9а"].id
    r = await client.post("/api/timetable/curriculum/", headers=h,
                          json={"class_group_id": c9, "subject_id": tt.subjects["Математик"].id, "hours_per_week": 5})
    assert r.status_code == 201, r.text
    eid = r.json()["id"]
    assert r.json()["subject"]["short_name"] == "Мат"
    r = await client.post("/api/timetable/curriculum/", headers=h,
                          json={"class_group_id": c9, "subject_id": tt.subjects["Математик"].id, "hours_per_week": 3})
    assert r.json() == {"subject_id": ["Энэ ангид энэ хичээл аль хэдийн байна."]}
    r = await client.post("/api/timetable/curriculum/", headers=h,
                          json={"class_group_id": c9, "subject_id": 999999, "hours_per_week": 3})
    assert r.status_code == 400 and "subject_id" in r.json()
    r = await client.post("/api/timetable/curriculum/", headers=h,
                          json={"class_group_id": c9, "subject_id": tt.subjects["Физик"].id, "hours_per_week": 0})
    assert r.status_code == 400 and "hours_per_week" in r.json()
    await client.post("/api/timetable/curriculum/", headers=h,
                      json={"class_group_id": c9, "subject_id": tt.subjects["Физик"].id, "hours_per_week": 2})

    items = (await client.get(f"/api/timetable/curriculum/?class={c9}")).json()
    assert [(i["subject"]["name"], i["hours_per_week"]) for i in items] == [("Математик", 5), ("Физик", 2)]
    assert (await client.get("/api/timetable/curriculum/")).status_code == 400  # class заавал
    r = await client.patch(f"/api/timetable/curriculum/{eid}/", headers=h, json={"hours_per_week": 4})
    assert r.json()["hours_per_week"] == 4
    assert (await client.delete(f"/api/timetable/curriculum/{eid}/", headers=h)).status_code == 204
    assert len((await client.get(f"/api/timetable/curriculum/?class={c9}")).json()) == 1


async def test_calendar(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    term = {"year_id": tt.year.id, "title": "1-р улирал", "category": "term",
            "start_date": "2026-09-01", "end_date": "2026-11-06"}
    r = await client.post("/api/timetable/calendar/", headers=h, json=term)
    assert r.status_code == 201, r.text
    tid = r.json()["id"]
    assert r.json()["applies_to"] == "all" and r.json()["description"] == "" and r.json()["color"] == ""
    r = await client.post("/api/timetable/calendar/", headers=h, json={**term, "title": "x", "color": "red"})
    assert r.status_code == 400 and "color" in r.json()
    r = await client.post("/api/timetable/calendar/", headers=h, json={**term, "title": "Өнгөтэй", "color": "#AB12cd"})
    assert r.status_code == 201 and r.json()["color"] == "#AB12cd"
    cid = r.json()["id"]
    r = await client.patch(f"/api/timetable/calendar/{cid}/", headers=h, json={"color": ""})
    assert r.status_code == 200 and r.json()["color"] == ""  # анхдагч (ангиллын) өнгө рүү буцаана
    assert (await client.delete(f"/api/timetable/calendar/{cid}/", headers=h)).status_code == 204
    r = await client.post("/api/timetable/calendar/", headers=h, json={**term, "end_date": "2026-08-01"})
    assert r.status_code == 400 and "end_date" in r.json()
    r = await client.post("/api/timetable/calendar/", headers=h, json={**term, "category": "party"})
    assert r.status_code == 400 and "category" in r.json()
    r = await client.post("/api/timetable/calendar/", headers=h, json={**term, "year_id": 999999})
    assert r.status_code == 400 and "year_id" in r.json()
    await client.post("/api/timetable/calendar/", headers=h,
                      json={"year_id": tt.year.id, "title": "Багш нарын өдөр", "category": "holiday",
                            "start_date": "2026-10-05", "end_date": "2026-10-05", "applies_to": "primary"})

    evs = (await client.get("/api/timetable/calendar/")).json()
    assert [e["title"] for e in evs] == ["1-р улирал", "Багш нарын өдөр"]  # start_date-аар
    r = await client.patch(f"/api/timetable/calendar/{tid}/", headers=h, json={"description": "Намрын улирал"})
    assert r.json()["description"] == "Намрын улирал"
    r = await client.patch(f"/api/timetable/calendar/{tid}/", headers=h, json={"start_date": "2026-12-01"})
    assert r.status_code == 400 and "end_date" in r.json()
    assert (await client.delete(f"/api/timetable/calendar/{tid}/", headers=h)).status_code == 204
