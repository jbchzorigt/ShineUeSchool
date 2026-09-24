"""Хөтөлбөр — менежерийн API."""

import io

from PIL import Image

from tests.helpers import manager_headers, staff_headers

A = "/api/programs/admin"


def png_bytes(color=(30, 58, 143)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (40, 40), color).save(buf, format="PNG")
    return buf.getvalue()


async def mk(client, h, name="IB Diploma Programme", badge="IBDP", **over):
    body = {"name": name, "badge": badge, "summary": "Товч", "grade_from": 11, "grade_to": 12, "body_html": "<p>x</p>", **over}
    r = await client.post(f"{A}/programs/", headers=h, json=body)
    assert r.status_code == 201, r.text
    return r.json()


async def test_program_crud_slug_order(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await manager_headers(client, make_user)
    a = await mk(client, h)
    assert a["slug"] == "ib-diploma-programme" and a["order"] == 1 and a["is_published"] is True and a["works_count"] == 0
    b = await mk(client, h, name="IB Diploma Programme", badge="IB")
    assert b["slug"] == "ib-diploma-programme-2" and b["order"] == 2
    # validation
    r = await client.post(f"{A}/programs/", headers=h, json={"name": " ", "badge": "X", "grade_from": 1, "grade_to": 2})
    assert r.status_code == 400 and "name" in r.json()
    r = await client.post(f"{A}/programs/", headers=h, json={"name": "C", "badge": "", "grade_from": 1, "grade_to": 2})
    assert r.status_code == 400 and "badge" in r.json()
    r = await client.post(f"{A}/programs/", headers=h, json={"name": "C", "badge": "C", "grade_from": 9, "grade_to": 7})
    assert r.status_code == 400 and "grade_to" in r.json()
    r = await client.post(f"{A}/programs/", headers=h, json={"name": "C", "badge": "C", "grade_from": 0, "grade_to": 7})
    assert r.status_code == 400 and "grade_from" in r.json()
    # PATCH: нэр солиход slug хэвээр, html цэвэрлэгдэнэ
    r = await client.patch(f"{A}/programs/{a['id']}/", headers=h, json={"name": "IBDP шинэ", "body_html": "<p>a</p><script>x</script>", "is_published": False})
    assert r.status_code == 200 and r.json()["slug"] == "ib-diploma-programme" and r.json()["body_html"] == "<p>a</p>" and r.json()["is_published"] is False
    assert [p["slug"] for p in (await client.get("/api/programs/")).json()] == ["ib-diploma-programme-2"]   # ноорог нээлттэйд харагдахгүй
    # cover
    r = await client.post(f"{A}/programs/{a['id']}/cover/", headers=h, files={"image": ("c.png", png_bytes(), "image/png")})
    assert r.status_code == 200 and "/media/programs/" in r.json()["cover_image"]
    rel1 = r.json()["cover_image"].split("/media/")[1]
    r = await client.post(f"{A}/programs/{a['id']}/cover/", headers=h, files={"image": ("d.png", png_bytes((255, 0, 0)), "image/png")})
    rel2 = r.json()["cover_image"].split("/media/")[1]
    assert not (tmp_path / rel1).exists() and (tmp_path / rel2).exists()
    r = await client.post(f"{A}/programs/{a['id']}/cover/", headers=h, files={"image": ("t.txt", b"hi", "text/plain")})
    assert r.status_code == 400 and "image" in r.json()
    r = await client.delete(f"{A}/programs/{a['id']}/cover/", headers=h)
    assert r.status_code == 200 and r.json()["cover_image"] is None and not (tmp_path / rel2).exists()
    # order
    r = await client.put(f"{A}/programs/order/", headers=h, json={"ids": [b["id"]]})
    assert r.status_code == 400 and "ids" in r.json()
    r = await client.put(f"{A}/programs/order/", headers=h, json={"ids": [b["id"], a["id"]]})
    assert r.status_code == 200 and [p["id"] for p in r.json()] == [b["id"], a["id"]]
    # GET list/detail, delete
    lst = (await client.get(f"{A}/programs/", headers=h)).json()
    assert [p["id"] for p in lst] == [b["id"], a["id"]]
    d = (await client.get(f"{A}/programs/{a['id']}/", headers=h)).json()
    assert d["works"] == [] and d["scholarships"] == []
    assert (await client.delete(f"{A}/programs/{a['id']}/", headers=h)).status_code == 204
    assert (await client.get(f"{A}/programs/{a['id']}/", headers=h)).status_code == 404


async def test_upload_image_and_auth(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await manager_headers(client, make_user)
    r = await client.post(f"{A}/upload-image/", headers=h, files={"image": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 201 and "/media/programs/body/" in r.json()["url"]
    assert (await client.get(f"{A}/programs/")).status_code == 401
    n = await staff_headers(client, make_user, "editor", roles=("news",))
    assert (await client.get(f"{A}/programs/", headers=n)).status_code == 403
    assert (await client.post(f"{A}/upload-image/", headers=n, files={"image": ("a.png", png_bytes(), "image/png")})).status_code == 403


async def test_works_and_scholarships(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await manager_headers(client, make_user)
    p = await mk(client, h)
    q = await mk(client, h, name="Cambridge", badge="Cambridge")
    # бүтээл: зураг заавал
    r = await client.post(f"{A}/programs/{p['id']}/works/", headers=h, data={"title": "Нэг"})
    assert r.status_code == 400 and "image" in r.json()
    r = await client.post(f"{A}/programs/{p['id']}/works/", headers=h, data={"title": " ", "student": "x"}, files={"image": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 400 and "title" in r.json()
    r = await client.post(f"{A}/programs/{p['id']}/works/", headers=h, data={"title": " Нэг ", "student": "Б.Ану, 11а", "caption": "Тайлбар"},
                          files={"image": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 201, r.text
    w1 = r.json()
    assert w1["title"] == "Нэг" and w1["student"] == "Б.Ану, 11а" and "/media/programs/" in w1["image"]
    rel1 = w1["image"].split("/media/")[1]
    w2 = (await client.post(f"{A}/programs/{p['id']}/works/", headers=h, data={"title": "Хоёр"}, files={"image": ("b.png", png_bytes(), "image/png")})).json()
    assert (await client.post(f"{A}/programs/9999/works/", headers=h, data={"title": "x"}, files={"image": ("b.png", png_bytes(), "image/png")})).status_code == 404
    r = await client.patch(f"{A}/works/{w1['id']}/", headers=h, json={"caption": "Шинэ", "title": "Нэг!"})
    assert r.status_code == 200 and r.json()["caption"] == "Шинэ" and r.json()["title"] == "Нэг!"
    assert (await client.patch(f"{A}/works/{w1['id']}/", headers=h, json={"title": ""})).status_code == 400
    r = await client.post(f"{A}/works/{w1['id']}/image/", headers=h, files={"image": ("c.png", png_bytes((255, 0, 0)), "image/png")})
    rel1b = r.json()["image"].split("/media/")[1]
    assert r.status_code == 200 and not (tmp_path / rel1).exists() and (tmp_path / rel1b).exists()
    # дараалал: тухайн хөтөлбөрийн бүх id
    wq = (await client.post(f"{A}/programs/{q['id']}/works/", headers=h, data={"title": "Q"}, files={"image": ("q.png", png_bytes(), "image/png")})).json()
    r = await client.put(f"{A}/programs/{p['id']}/works/order/", headers=h, json={"ids": [w2["id"], w1["id"], wq["id"]]})
    assert r.status_code == 400 and "ids" in r.json()
    r = await client.put(f"{A}/programs/{p['id']}/works/order/", headers=h, json={"ids": [w2["id"], w1["id"]]})
    assert r.status_code == 200 and [w["id"] for w in r.json()["works"]] == [w2["id"], w1["id"]]
    # тэтгэлэг
    r = await client.post(f"{A}/programs/{p['id']}/scholarships/", headers=h, json={"student_name": " ", "year": 2024, "amount_usd": 1})
    assert r.status_code == 400 and "student_name" in r.json()
    r = await client.post(f"{A}/programs/{p['id']}/scholarships/", headers=h, json={"student_name": "Дорж", "year": 1999, "amount_usd": 1})
    assert r.status_code == 400 and "year" in r.json()
    r = await client.post(f"{A}/programs/{p['id']}/scholarships/", headers=h, json={"student_name": "Дорж", "year": 2024, "amount_usd": -1})
    assert r.status_code == 400 and "amount_usd" in r.json()
    s1 = (await client.post(f"{A}/programs/{p['id']}/scholarships/", headers=h, json={"student_name": " Дорж ", "university": "MIT", "year": 2024, "amount_usd": 120000})).json()
    s2 = (await client.post(f"{A}/programs/{p['id']}/scholarships/", headers=h, json={"student_name": "Сараа", "year": 2025, "amount_usd": 80000})).json()
    assert s1["student_name"] == "Дорж" and s1["photo"] is None and s2["university"] == ""
    r = await client.patch(f"{A}/scholarships/{s1['id']}/", headers=h, json={"amount_usd": 130000, "university": "Stanford"})
    assert r.status_code == 200 and r.json()["amount_usd"] == 130000 and r.json()["university"] == "Stanford"
    r = await client.post(f"{A}/scholarships/{s1['id']}/photo/", headers=h, files={"photo": ("s.png", png_bytes(), "image/png")})
    rels = r.json()["photo"].split("/media/")[1]
    assert r.status_code == 200 and (tmp_path / rels).exists()
    r = await client.delete(f"{A}/scholarships/{s1['id']}/photo/", headers=h)
    assert r.status_code == 200 and r.json()["photo"] is None and not (tmp_path / rels).exists()
    r = await client.put(f"{A}/programs/{p['id']}/scholarships/order/", headers=h, json={"ids": [s2["id"]]})
    assert r.status_code == 400 and "ids" in r.json()
    r = await client.put(f"{A}/programs/{p['id']}/scholarships/order/", headers=h, json={"ids": [s2["id"], s1["id"]]})
    assert r.status_code == 200 and [s["id"] for s in r.json()["scholarships"]] == [s2["id"], s1["id"]]   # 2025 эхэнд (year DESC)
    # public detail
    d = (await client.get(f"/api/programs/{p['slug']}/")).json()
    assert d["scholarship_total_usd"] == 210000 and d["scholarship_count"] == 2 and [w["id"] for w in d["works"]] == [w2["id"], w1["id"]]
    # устгах: багш/бүтээл, дараа нь хөтөлбөр → бүх файл устна
    assert (await client.delete(f"{A}/works/{w2['id']}/", headers=h)).status_code == 204
    assert (await client.delete(f"{A}/scholarships/{s2['id']}/", headers=h)).status_code == 204
    assert (await client.delete(f"{A}/works/{w2['id']}/", headers=h)).status_code == 404
    await client.post(f"{A}/scholarships/{s1['id']}/photo/", headers=h, files={"photo": ("s.png", png_bytes(), "image/png")})
    files = [rel1b] + [x.split("/media/")[1] for x in [(await client.get(f"{A}/programs/{p['id']}/", headers=h)).json()["scholarships"][0]["photo"]]]
    assert all((tmp_path / f).exists() for f in files)
    assert (await client.delete(f"{A}/programs/{p['id']}/", headers=h)).status_code == 204
    assert not any((tmp_path / f).exists() for f in files)
    assert (await client.get(f"{A}/programs/{q['id']}/", headers=h)).json()["works_count"] == 1


async def test_patch_validation_and_edge_cases(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await manager_headers(client, make_user)
    p = await mk(client, h)
    # PATCH: анги хамгаалалт
    r = await client.patch(f"{A}/programs/{p['id']}/", headers=h, json={"grade_from": 5, "grade_to": 3})
    assert r.status_code == 400 and "grade_to" in r.json()
    r = await client.patch(f"{A}/programs/{p['id']}/", headers=h, json={"grade_from": 0})
    assert r.status_code == 400 and "grade_from" in r.json()
    # PATCH: хоосон "<p></p>" body_html нуугдана (Tiptap-ын хоосон гаралт)
    r = await client.patch(f"{A}/programs/{p['id']}/", headers=h, json={"body_html": "<p></p>"})
    assert r.status_code == 200 and r.json()["body_html"] == ""
    # cover: байхгүй хөтөлбөр
    r = await client.post(f"{A}/programs/9999/cover/", headers=h, files={"image": ("c.png", png_bytes(), "image/png")})
    assert r.status_code == 404
    # upload-image: зурган бус файл
    r = await client.post(f"{A}/upload-image/", headers=h, files={"image": ("t.txt", b"hi", "text/plain")})
    assert r.status_code == 400 and "image" in r.json()
    # work PATCH: student trim
    w = (await client.post(f"{A}/programs/{p['id']}/works/", headers=h, data={"title": "Нэг"}, files={"image": ("a.png", png_bytes(), "image/png")})).json()
    r = await client.patch(f"{A}/works/{w['id']}/", headers=h, json={"student": "  Бат  "})
    assert r.status_code == 200 and r.json()["student"] == "Бат"
    # scholarship PATCH: он/дүнгийн хамгаалалт
    s = (await client.post(f"{A}/programs/{p['id']}/scholarships/", headers=h, json={"student_name": "Дорж", "year": 2024, "amount_usd": 1000})).json()
    r = await client.patch(f"{A}/scholarships/{s['id']}/", headers=h, json={"year": 1999})
    assert r.status_code == 400 and "year" in r.json()
    r = await client.patch(f"{A}/scholarships/{s['id']}/", headers=h, json={"amount_usd": -1})
    assert r.status_code == 400 and "amount_usd" in r.json()
