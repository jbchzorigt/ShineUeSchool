from tests.helpers import manager_headers, staff_headers, timetable_setup
from tests.test_timetable_grid import cell

YEAR = {"name": "2026–2027", "start_date": "2026-09-01", "end_date": "2027-06-10"}


async def test_years_crud_and_current(client, make_user):
    h = await manager_headers(client, make_user)
    r = await client.post("/api/timetable/years/", headers=h, json=YEAR)
    assert r.status_code == 201, r.text
    y1 = r.json()
    assert y1["is_current"] is True and y1["working_days"] == 5  # эхний жил автоматаар одоогийн

    r = await client.post("/api/timetable/years/", headers=h,
                          json={"name": "2027–2028", "start_date": "2027-09-01", "end_date": "2028-06-10", "working_days": 6})
    y2 = r.json()
    assert y2["is_current"] is False and y2["working_days"] == 6

    r = await client.post(f"/api/timetable/years/{y2['id']}/set-current/", headers=h)
    assert r.status_code == 200 and r.json()["is_current"] is True
    ys = (await client.get("/api/timetable/years/")).json()
    assert [(y["name"], y["is_current"]) for y in ys] == [("2027–2028", True), ("2026–2027", False)]

    r = await client.patch(f"/api/timetable/years/{y1['id']}/", headers=h, json={"end_date": "2026-01-01"})
    assert r.status_code == 400 and "end_date" in r.json()
    r = await client.post("/api/timetable/years/", headers=h, json=YEAR)
    assert r.status_code == 400 and r.json() == {"name": ["Ийм нэртэй хичээлийн жил байна."]}
    r = await client.post("/api/timetable/years/", headers=h, json={**YEAR, "name": "x", "working_days": 7})
    assert r.status_code == 400 and "working_days" in r.json()

    r = await client.delete(f"/api/timetable/years/{y1['id']}/", headers=h)
    assert r.status_code == 204
    assert len((await client.get("/api/timetable/years/")).json()) == 1
    assert (await client.delete("/api/timetable/years/999999/", headers=h)).status_code == 404


async def test_write_requires_manager(client, make_user):
    assert (await client.post("/api/timetable/years/", json=YEAR)).status_code == 401
    h = await staff_headers(client, make_user, "olymp", roles=("olympiad",))
    assert (await client.post("/api/timetable/years/", headers=h, json=YEAR)).status_code == 403
    su = await staff_headers(client, make_user, "root", superuser=True)
    assert (await client.post("/api/timetable/years/", headers=su, json=YEAR)).status_code == 201


async def test_period_sets_and_periods(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)

    sets = (await client.get("/api/timetable/period-sets/")).json()  # year өгөөгүй → одоогийн жил
    assert [s["name"] for s in sets] == ["Бага анги", "Дунд, ахлах анги"]
    assert sets[0]["periods"][0]["start_time"] == "08:00:00" and sets[0]["periods"][1]["is_break"] is True
    assert (await client.get(f"/api/timetable/period-sets/?year={tt.year.id}")).json() == sets
    assert (await client.get("/api/timetable/period-sets/?year=999999")).status_code == 404

    r = await client.post("/api/timetable/period-sets/", headers=h, json={"year_id": tt.year.id, "name": "Бага анги"})
    assert r.status_code == 400 and "name" in r.json()
    r = await client.post("/api/timetable/period-sets/", headers=h, json={"year_id": 999999, "name": "x"})
    assert r.status_code == 400 and "year_id" in r.json()
    r = await client.post("/api/timetable/period-sets/", headers=h, json={"year_id": tt.year.id, "name": "Ахлах"})
    assert r.status_code == 201, r.text
    assert r.json()["periods"] == []
    new_set = r.json()["id"]
    r = await client.patch(f"/api/timetable/period-sets/{new_set}/", headers=h, json={"name": "Ахлах анги"})
    assert r.json()["name"] == "Ахлах анги"

    r = await client.post("/api/timetable/periods/", headers=h,
                          json={"period_set_id": tt.primary.id, "order": 1, "start_time": "10:00", "end_time": "10:35"})
    assert r.json() == {"order": ["Энэ хүснэгтэд ийм дугаартай цаг байна."]}
    r = await client.post("/api/timetable/periods/", headers=h,
                          json={"period_set_id": tt.primary.id, "order": 9, "start_time": "10:00", "end_time": "09:35"})
    assert r.status_code == 400 and "end_time" in r.json()
    r = await client.post("/api/timetable/periods/", headers=h,
                          json={"period_set_id": tt.primary.id, "order": 9, "start_time": "10:00", "end_time": "10:35"})
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    r = await client.patch(f"/api/timetable/periods/{pid}/", headers=h, json={"is_break": True})
    assert r.json()["is_break"] is True
    r = await client.patch(f"/api/timetable/periods/{pid}/", headers=h, json={"end_time": "09:00"})
    assert r.status_code == 400 and "end_time" in r.json()
    assert (await client.delete(f"/api/timetable/periods/{pid}/", headers=h)).status_code == 204

    r = await client.delete(f"/api/timetable/period-sets/{tt.primary.id}/", headers=h)
    assert r.status_code == 400 and "non_field_errors" in r.json()  # 1а анги ашиглаж байна
    assert (await client.delete(f"/api/timetable/period-sets/{new_set}/", headers=h)).status_code == 204


async def test_period_cannot_become_break_while_lessons_exist(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    c9 = tt.classes["9а"].id
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h,
                         json=[cell(tt, 1, ("s", 1), "Математик", "Б.Мухулай", "204")])
    assert r.status_code == 200, r.text

    pid = tt.p[("s", 1)].id
    r = await client.patch(f"/api/timetable/periods/{pid}/", headers=h, json={"is_break": True})
    assert r.status_code == 400 and "is_break" in r.json()

    r = await client.patch(f"/api/timetable/periods/{pid}/", headers=h, json={"end_time": "08:45"})
    assert r.status_code == 200, r.text
    assert r.json()["end_time"] == "08:45:00"
