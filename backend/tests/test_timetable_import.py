import io

from openpyxl import Workbook

from tests.helpers import manager_headers, timetable_setup

HEADER = ["Цаг", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан"]
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def book(sheets: dict[str, list[list]]) -> bytes:
    wb = Workbook()
    wb.remove(wb.active)
    for name, rows in sheets.items():
        ws = wb.create_sheet(name)
        for r in rows:
            ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


GOOD = {
    "9а": [["9а ангийн хуваарь"], HEADER,
           [1, "Математик / Б.Мухулай / 204", "Мат / Б.Мухулай", None, None, None],
           [2, "Физик / Ц.Болд / 205", None, None, None, None]],
    "1а": [HEADER,
           [1, "Монгол хэл / Д.Сараа / 101", None, None, None, None],
           [2, None, None, None, None, None],
           [2, "Математик / Б.Мухулай", None, None, None, None]],
}


async def upload(client, h, data, **form):
    files = {"file": ("хуваарь.xlsx", data, XLSX)}
    return await client.post("/api/timetable/lessons/import/", headers=h, files=files, data=form)


async def test_dry_run_then_import(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    r = await upload(client, h, book(GOOD), dry_run="true")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["dry_run"] is True and body["imported"] is False and body["total"] == 5
    assert [(s["sheet"], s["class_name"], s["count"], s["warnings"], s["conflicts"]) for s in body["sheets"]] == [
        ("9а", "9а", 3, [], []), ("1а", "1а", 2, [], [])]
    assert (await client.get("/api/timetable/lessons/")).json() == []

    r = await upload(client, h, book(GOOD), dry_run="false", replace="true")
    body = r.json()
    assert body["imported"] is True and body["created"] == 5 and body["deleted"] == 0
    l9 = (await client.get(f"/api/timetable/lessons/?class={tt.classes['9а'].id}")).json()
    assert [(l["weekday"], l["period"]["order"], l["subject"]["short_name"], l["room"] and l["room"]["name"]) for l in l9] == [
        (1, 1, "Мат", "204"), (1, 2, "Физ", "205"), (2, 1, "Мат", None)]
    l1 = (await client.get(f"/api/timetable/lessons/?class={tt.classes['1а'].id}")).json()
    assert [(l["period"]["order"], l["teacher"]["short_name"]) for l in l1] == [(1, "Д.Сараа"), (2, "Б.Мухулай")]

    # Дахин импорт (replace): хуучин 5 устаж 5 шинээр
    r = await upload(client, h, book(GOOD), dry_run="false", replace="true")
    assert r.json()["created"] == 5 and r.json()["deleted"] == 5


async def test_errors_block_whole_import(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    assert (await upload(client, h, book(GOOD), dry_run="false")).json()["imported"] is True

    bad = {
        "9а": [HEADER, [1, "Хими / Б.Мухулай", None, None, None, None]],
        "7в": [HEADER, [1, "Математик / Б.Мухулай", None, None, None, None]],
        "1а": [HEADER, [2, "Физик / Ц.Болд / 205", None, None, None, None]],  # 9а-ийн Даваа 2-р цаг (08:50–09:30)-тай давхцана
        "9б": [HEADER, [1, "Математик / Б.Мухулай / 204 / нэмэлт", "x", None, None, None], [9, "Мат / Б.Мухулай", None, None, None, None]],
    }
    r = await upload(client, h, book(bad), dry_run="false", replace="true")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["imported"] is False and body["created"] == 0
    s = {x["sheet"]: x for x in body["sheets"]}
    assert s["9а"]["warnings"] == ["Даваа, 1-р цаг: 'Хими' хичээл олдсонгүй."]
    assert s["7в"]["class_name"] is None and s["7в"]["warnings"] == ["'7в' нэртэй анги энэ жилд байхгүй."]
    assert s["1а"]["warnings"] == [] and {c["kind"] for c in s["1а"]["conflicts"]} == {"teacher", "room"}
    assert s["1а"]["conflicts"][0]["with_class"] == "9а" and s["1а"]["conflicts"][0]["period_order"] == 2
    assert s["9б"]["count"] == 1  # 4 хэсэгтэй нүд зөвшөөрөгдөнө (илүү хэсгийг хаяна), "x" ба 9-р цаг анхааруулга
    assert any("'x'" in w for w in s["9б"]["warnings"]) and any("9-р цаг" in w for w in s["9б"]["warnings"])
    # Юу ч өөрчлөгдөөгүй
    assert len((await client.get(f"/api/timetable/lessons/?class={tt.classes['9а'].id}")).json()) == 3
    assert len((await client.get(f"/api/timetable/lessons/?class={tt.classes['1а'].id}")).json()) == 2


async def test_merge_without_replace(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    await upload(client, h, book(GOOD), dry_run="false")
    extra = {"9а": [HEADER, [1, "Физик / Ц.Болд / 205", None, "Мат / Б.Мухулай", None, None]]}  # Даваа 1 солигдоно, Лхагва 1 нэмэгдэнэ
    r = await upload(client, h, book(extra), dry_run="false", replace="false")
    body = r.json()
    assert body["imported"] is True and body["deleted"] == 1
    l9 = (await client.get(f"/api/timetable/lessons/?class={tt.classes['9а'].id}")).json()
    assert [(l["weekday"], l["period"]["order"], l["subject"]["short_name"]) for l in l9] == [
        (1, 1, "Физ"), (1, 2, "Физ"), (2, 1, "Мат"), (3, 1, "Мат")]


async def test_duplicate_sheet_for_same_class(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    dup = {
        "9а": [HEADER, [1, "Математик / Б.Мухулай / 204", None, None, None, None]],
        "9а ": [HEADER, [2, "Физик / Ц.Болд / 205", None, None, None, None]],  # trailing space, same class
    }
    r = await upload(client, h, book(dup), dry_run="false")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["imported"] is False
    assert body["sheets"][0]["warnings"] == []
    # parse_workbook нь sheet нэрийг .strip() хийдэг тул "9а " (trailing space) → "9а" болно
    assert body["sheets"][1]["warnings"] == ["'9а' — энэ анги өмнөх sheet-д аль хэдийн байна."]
    assert (await client.get(f"/api/timetable/lessons/?class={tt.classes['9а'].id}")).json() == []


async def test_swap_between_classes_in_one_file(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    await upload(client, h, book(GOOD), dry_run="false", replace="true")
    swap = {
        "9а": [HEADER, [1, "Монгол хэл / Д.Сараа / 101", None, None, None, None]],
        "1а": [HEADER, [1, "Математик / Б.Мухулай / 204", None, None, None, None]],
    }
    r = await upload(client, h, book(swap), dry_run="false", replace="true")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["imported"] is True and body["created"] == 2 and body["deleted"] == 5
    l9 = (await client.get(f"/api/timetable/lessons/?class={tt.classes['9а'].id}")).json()
    assert [(l["weekday"], l["period"]["order"], l["teacher"]["short_name"], l["room"]["name"]) for l in l9] == [
        (1, 1, "Д.Сараа", "101")]
    l1 = (await client.get(f"/api/timetable/lessons/?class={tt.classes['1а'].id}")).json()
    assert [(l["period"]["order"], l["teacher"]["short_name"], l["room"]["name"]) for l in l1] == [(1, "Б.Мухулай", "204")]


async def test_import_needs_current_year(client, make_user):
    h = await manager_headers(client, make_user)
    r = await upload(client, h, book(GOOD))  # одоогийн жил байхгүй
    assert r.json() == {"year": ["Хичээлийн жил олдсонгүй."]}


async def test_import_rejects_bad_files(client, make_user, db):
    _, h = await timetable_setup(client, make_user, db)
    r = await client.post("/api/timetable/lessons/import/", headers=h, files={"file": ("a.csv", b"x", "text/csv")})
    assert r.json() == {"file": ["Зөвхөн Excel (.xlsx) файл хүлээн авна."]}
    r = await upload(client, h, b"not an excel file")
    assert r.status_code == 400 and "file" in r.json()
    no_header = {"9а": [["зүгээр текст"], [1, "Мат / Б.Мухулай"]]}
    r = await upload(client, h, book(no_header), dry_run="true")
    assert r.json()["sheets"][0]["warnings"] == ["Толгой мөр (Цаг | Даваа | Мягмар ...) олдсонгүй."]
