from datetime import time

from app.timetable.conflicts import Slot, find_conflicts
from tests.helpers import staff_headers, timetable_setup


IDS = {"9а": 1, "1а": 2, "Б.Мухулай": 11, "Д.Сараа": 12, "204": 21, "101": 22}


def slot(cls, weekday, period_id, start, end, teacher, room=None, order=1):
    return Slot(class_group_id=IDS[cls], class_name=cls, weekday=weekday, period_id=period_id,
                period_order=order, start=time(*start), end=time(*end), teacher_id=IDS[teacher],
                teacher_name=teacher, room_id=IDS[room] if room else None, room_name=room or "")


def test_find_conflicts_by_time_not_by_period_number():
    existing = [slot("9а", 1, 11, (8, 50), (9, 30), "Б.Мухулай", "204", order=2)]
    cand = [slot("1а", 1, 21, (8, 50), (9, 25), "Б.Мухулай", "204", order=3)]  # өөр period, цаг давхцана
    out = find_conflicts(cand, existing)
    assert [(c["kind"], c["with_class"], c["who"], c["period_order"]) for c in out] == [
        ("teacher", "9а", "Б.Мухулай", 3), ("room", "9а", "204", 3)]


def test_find_conflicts_ignores_other_day_and_adjacent_times():
    existing = [slot("9а", 1, 11, (8, 0), (8, 40), "Б.Мухулай", "204")]
    assert find_conflicts([slot("1а", 2, 21, (8, 0), (8, 35), "Б.Мухулай", "204")], existing) == []  # өөр өдөр
    assert find_conflicts([slot("1а", 1, 21, (8, 40), (9, 15), "Б.Мухулай", "204")], existing) == []  # зэргэлдээ
    assert find_conflicts([slot("1а", 1, 21, (8, 0), (8, 35), "Д.Сараа", "101")], existing) == []  # өөр багш, өрөө
    assert find_conflicts([slot("1а", 1, 21, (8, 0), (8, 35), "Д.Сараа", None)], existing) == []  # өрөөгүй


def test_find_conflicts_between_candidates():
    a = slot("9а", 1, 11, (8, 0), (8, 40), "Б.Мухулай", None, order=1)
    b = slot("9а", 1, 12, (8, 30), (9, 10), "Б.Мухулай", None, order=2)
    out = find_conflicts([a, b], [])
    assert [(c["period_order"], c["kind"]) for c in out] == [(1, "teacher"), (2, "teacher")]


def cell(tt, weekday, period, subject, teacher, room=None):
    return {"weekday": weekday, "period_id": tt.p[period].id, "subject_id": tt.subjects[subject].id,
            "teacher_id": tt.teachers[teacher].id, "room_id": tt.rooms[room].id if room else None}


async def test_grid_save_and_views(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    c9 = tt.classes["9а"].id
    body = [cell(tt, 1, ("s", 1), "Математик", "Б.Мухулай", "204"),
            cell(tt, 1, ("s", 2), "Физик", "Ц.Болд", "205"),
            cell(tt, 2, ("s", 1), "Математик", "Б.Мухулай", "204")]
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=body)
    assert r.status_code == 200, r.text
    out = r.json()
    assert len(out) == 3
    assert out[0]["weekday"] == 1 and out[0]["period"]["order"] == 1 and out[0]["period"]["start_time"] == "08:00:00"
    assert out[0]["subject"]["short_name"] == "Мат" and out[0]["subject"]["color"] == "#1e3a8f"
    assert out[0]["teacher"]["short_name"] == "Б.Мухулай" and out[0]["room"]["name"] == "204"
    assert out[0]["class_group"]["name"] == "9а"

    assert len((await client.get(f"/api/timetable/lessons/?class={c9}")).json()) == 3
    assert len((await client.get(f"/api/timetable/lessons/?teacher={tt.teachers['Б.Мухулай'].id}")).json()) == 2
    by_room = (await client.get(f"/api/timetable/lessons/?room={tt.rooms['205'].id}")).json()
    assert len(by_room) == 1 and by_room[0]["subject"]["name"] == "Физик"
    assert len((await client.get(f"/api/timetable/lessons/?year={tt.year.id}")).json()) == 3
    assert (await client.get("/api/timetable/lessons/?year=999999")).status_code == 404

    # Бүхэлд нь солино: 1 нүд үлдэнэ
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=body[:1])
    assert len(r.json()) == 1
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[])
    assert r.json() == []


async def test_grid_conflicts_across_period_sets_are_atomic(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    c9, c1 = tt.classes["9а"].id, tt.classes["1а"].id
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h,
                         json=[cell(tt, 1, ("s", 2), "Математик", "Б.Мухулай", "204")])  # Даваа 08:50–09:30
    assert r.status_code == 200

    # 1а-д эхлээд хүчинтэй нэг нүдтэй хуваарь хадгална
    r = await client.put(f"/api/timetable/classes/{c1}/grid/", headers=h,
                         json=[cell(tt, 1, ("p", 1), "Монгол хэл", "Д.Сараа", "101")])
    assert r.status_code == 200, r.text

    # 1а: Даваа p3 08:50–09:25 — өөр period set, цаг давхцана → багшийн давхардал; юу ч хадгалагдахгүй
    body = [cell(tt, 1, ("p", 1), "Монгол хэл", "Д.Сараа", "101"),
            cell(tt, 1, ("p", 3), "Математик", "Б.Мухулай")]
    r = await client.put(f"/api/timetable/classes/{c1}/grid/", headers=h, json=body)
    assert r.status_code == 400, r.text
    assert r.json() == {"conflicts": [{"weekday": 1, "period_id": tt.p[("p", 3)].id, "period_order": 2,
                                       "kind": "teacher", "with_class": "9а", "who": "Б.Мухулай"}]}
    # Юу ч өөрчлөгдөөгүй — 1а-ийн анхны нэг нүдний хуваарь хэвээрээ хадгалагдсан хэвээр
    l1 = (await client.get(f"/api/timetable/lessons/?class={c1}")).json()
    assert [(l["subject"]["short_name"], l["period"]["order"]) for l in l1] == [("Мон", 1)]

    # Өөр багш, ижил өрөө → өрөөний давхардал
    body[1] = cell(tt, 1, ("p", 3), "Физик", "Ц.Болд", "204")
    r = await client.put(f"/api/timetable/classes/{c1}/grid/", headers=h, json=body)
    assert r.status_code == 400 and r.json()["conflicts"][0]["kind"] == "room" and r.json()["conflicts"][0]["who"] == "204"

    # Өөр өрөө → OK; Мягмар гарагт Б.Мухулай чөлөөтэй → OK
    body[1] = cell(tt, 1, ("p", 3), "Физик", "Ц.Болд", "205")
    body.append(cell(tt, 2, ("p", 3), "Математик", "Б.Мухулай", "204"))
    r = await client.put(f"/api/timetable/classes/{c1}/grid/", headers=h, json=body)
    assert r.status_code == 200, r.text
    assert len(r.json()) == 3

    # Өөрийн хуучин хуваарьтайгаа давхардахгүй (9а-г дахин хадгалахад 9а-ийн хуучин мөрүүд тооцогдохгүй);
    # 1а-ийн Даваа p3 нь одоо Ц.Болд/205, Б.Мухулай Мягмарт тул давхардалгүй
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h,
                         json=[cell(tt, 1, ("s", 2), "Математик", "Б.Мухулай", "204")])
    assert r.status_code == 200, r.text


async def test_grid_validation(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    c9 = tt.classes["9а"].id
    ok = cell(tt, 1, ("s", 1), "Математик", "Б.Мухулай")

    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[cell(tt, 1, ("p", 1), "Математик", "Б.Мухулай")])
    assert r.status_code == 400 and "period_id" in r.json()  # өөр цагийн хүснэгтийн цаг
    r = await client.put(f"/api/timetable/classes/{tt.classes['1а'].id}/grid/", headers=h, json=[cell(tt, 1, ("p", 2), "Математик", "Б.Мухулай")])
    assert r.status_code == 400 and "завсарлага" in r.json()["period_id"][0]
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[{**ok, "weekday": 6}])
    assert r.status_code == 400 and "weekday" in r.json()  # working_days=5
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[{**ok, "weekday": 7}])
    assert r.status_code == 400 and "weekday" in r.json()  # pydantic le=6
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[ok, {**ok, "subject_id": tt.subjects["Физик"].id}])
    assert r.status_code == 400 and "cells" in r.json()  # нэг нүдэнд хоёр
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[{**ok, "subject_id": 999999}])
    assert r.status_code == 400 and "subject_id" in r.json()
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[{**ok, "teacher_id": 999999}])
    assert r.status_code == 400 and "teacher_id" in r.json()
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[{**ok, "room_id": 999999}])
    assert r.status_code == 400 and "room_id" in r.json()
    assert (await client.put("/api/timetable/classes/999999/grid/", headers=h, json=[])).status_code == 404
    oh = await staff_headers(client, make_user, "olymp", roles=("olympiad",))
    assert (await client.put(f"/api/timetable/classes/{c9}/grid/", headers=oh, json=[])).status_code == 403


async def test_curriculum_check_and_stats(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    c9 = tt.classes["9а"].id
    for subj, hours in (("Математик", 2), ("Монгол хэл", 1)):
        await client.post("/api/timetable/curriculum/", headers=h,
                          json={"class_group_id": c9, "subject_id": tt.subjects[subj].id, "hours_per_week": hours})
    await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h,
                     json=[cell(tt, 1, ("s", 1), "Математик", "Б.Мухулай"), cell(tt, 1, ("s", 2), "Физик", "Ц.Болд")])

    chk = (await client.get(f"/api/timetable/classes/{c9}/curriculum-check/")).json()
    assert [(c["subject"]["name"], c["planned"], c["scheduled"]) for c in chk] == [
        ("Математик", 2, 1), ("Монгол хэл", 1, 0), ("Физик", 0, 1)]

    st = (await client.get("/api/timetable/stats/")).json()
    assert st == {"classes": 3, "teachers": 3, "rooms": 3, "lessons": 2, "mismatched_classes": 1}
    assert (await client.get("/api/timetable/stats/?year=999999")).status_code == 404
