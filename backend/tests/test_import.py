import io
from datetime import datetime

from openpyxl import Workbook

from tests.helpers import staff_headers


def workbook_bytes() -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "suragch_IX"
    ws.append(["Ү.Маамын нэрэмжит олимпиад", None, None])
    ws.append(["Огноо:", datetime(2026, 2, 21)])
    ws.append(["№", "Овог", "Нэр", "Сургууль", "1", "2", "3", "Нийт оноо", "Байр", "Медаль"])
    ws.append([1, "Бат", "А", "Шинэ Үе", 7, 7, 6, 20, "I", "АЛТ"])
    ws.append([2, "Дорж", "Б", "1-р сургууль", 7, 0, 5, None, "II", "МӨНГӨ"])
    ws.append([3, None, None, None, None, None, None, None, None, None])
    ws2 = wb.create_sheet("bagsh_baga")
    ws2.append(["№", "Овог", "Нэр", "Сургууль", "Шифр", "1", "2", "Нийт оноо", "Байр", "Медаль"])
    ws2.append([1, "Цэнд", "В", "Шинэ Үе", 1042, 5, 5, 10, "", ""])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


async def test_import_dry_run_then_import(client, make_user):
    h = await staff_headers(client, make_user)
    files = {"file": ("дүн.xlsx", workbook_bytes(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = await client.post("/api/olympiad/results/import/", headers=h, files=files, data={"dry_run": "true"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["year"] == 2026 and body["detected_date"] == "2026-02-21" and body["dry_run"] is True
    assert body["total"] == 3
    assert [s["category"] for s in body["sheets"]] == ["9", "teacher_primary"]
    assert body["sheets"][0]["problems"] == 3 and body["sheets"][0]["count"] == 2 and body["sheets"][0]["skipped"] == 1
    assert "deleted" not in body
    assert (await client.get("/api/olympiad/results/?year=2026")).json() == []

    r = await client.post("/api/olympiad/results/import/", headers=h,
                          files={"file": ("дүн.xlsx", workbook_bytes(), "application/octet-stream")},
                          data={"dry_run": "false", "replace": "true", "year": "2026"})
    body = r.json()
    assert body["created"] == 3 and body["deleted"] == 0
    res = (await client.get("/api/olympiad/results/?year=2026&category=9")).json()
    assert [(x["student"], x["score"], x["rank"], x["medal"]) for x in res] == [("Б.А", 20.0, 1, "АЛТ"), ("Д.Б", 12.0, 2, "МӨНГӨ")]
    teacher = (await client.get("/api/olympiad/results/?year=2026&category=teacher_primary")).json()
    assert teacher[0]["code"] == "1042"

    r = await client.post("/api/olympiad/results/import/", headers=h,
                          files={"file": ("дүн.xlsx", workbook_bytes(), "application/octet-stream")},
                          data={"dry_run": "false", "replace": "true", "year": "2026"})
    assert r.json()["deleted"] == 3 and r.json()["created"] == 3


async def test_import_rejects_non_excel(client, make_user):
    h = await staff_headers(client, make_user)
    r = await client.post("/api/olympiad/results/import/", headers=h, files={"file": ("a.csv", b"x", "text/csv")})
    assert r.status_code == 400
    assert r.json() == {"file": ["Зөвхөн Excel (.xlsx) файл хүлээн авна."]}
