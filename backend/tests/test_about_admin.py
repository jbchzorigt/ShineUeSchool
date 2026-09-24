"""Бидний тухай — менежерийн API."""

import io

from PIL import Image

from tests.helpers import manager_headers, staff_headers

A = "/api/about/admin"


def png_bytes(color=(30, 58, 143)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (40, 40), color).save(buf, format="PNG")
    return buf.getvalue()


async def test_page_patch_sanitizes_and_validates(client, make_user):
    h = await manager_headers(client, make_user)
    r = await client.get(f"{A}/page/", headers=h)
    assert r.status_code == 200 and r.json()["intro_title"] == "Шинэ Үе сургууль"
    r = await client.patch(f"{A}/page/", headers=h, json={
        "intro_title": "Бидний тухай", "intro_html": "<p>Сайн</p><script>alert(1)</script>",
        "stats": [{"value": "1200+", "label": "Суралцагчид"}]})
    assert r.status_code == 200, r.text
    assert r.json()["intro_html"] == "<p>Сайн</p>" and r.json()["stats"][0]["value"] == "1200+"
    assert (await client.get("/api/about/")).json()["page"]["intro_title"] == "Бидний тухай"
    r = await client.patch(f"{A}/page/", headers=h, json={"stats": [{"value": str(i), "label": "l"} for i in range(5)]})
    assert r.status_code == 400 and "stats" in r.json()
    r = await client.patch(f"{A}/page/", headers=h, json={"stats": [{"value": "x", "label": ""}]})
    assert r.status_code == 400 and "stats" in r.json()
    r = await client.patch(f"{A}/page/", headers=h, json={"stats": [{"value": "x" * 21, "label": "l"}]})
    assert r.status_code == 400 and "stats" in r.json()
    r = await client.patch(f"{A}/page/", headers=h, json={"intro_title": ""})
    assert r.status_code == 400 and "intro_title" in r.json()
    r = await client.patch(f"{A}/page/", headers=h, json={"intro_title": "   "})
    assert r.status_code == 400 and "intro_title" in r.json()


async def test_admin_requires_manager(client, make_user):
    assert (await client.get(f"{A}/page/")).status_code == 401
    h = await staff_headers(client, make_user, "editor", roles=("news",))
    assert (await client.get(f"{A}/page/", headers=h)).status_code == 403
    assert (await client.get(f"{A}/leaders/", headers=h)).status_code == 403


async def test_upload_image_manager_only(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await manager_headers(client, make_user)
    r = await client.post(f"{A}/upload-image/", headers=h, files={"image": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 201, r.text
    rel = r.json()["url"].split("/media/")[1]
    assert "/media/about/body/" in r.json()["url"] and (tmp_path / rel).exists()
    hn = await staff_headers(client, make_user, "editor", roles=("news",))
    r = await client.post(f"{A}/upload-image/", headers=hn, files={"image": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 403
    r = await client.post(f"{A}/upload-image/", headers=h, files={"image": ("t.txt", b"hello", "text/plain")})
    assert r.status_code == 400 and "image" in r.json()


async def test_leaders_crud_photo_order(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await manager_headers(client, make_user)
    # үүсгэх (multipart), зураггүй
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": " Бат ", "position": "Захирал", "level": "1"})
    assert r.status_code == 201, r.text
    a = r.json()
    assert a["full_name"] == "Бат" and a["level"] == 1 and a["photo"] is None
    # зурагтай
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "Дорж", "position": "Дэд захирал", "level": "2"},
                          files={"photo": ("p.png", png_bytes(), "image/png")})
    assert r.status_code == 201, r.text
    b = r.json()
    rel_b = b["photo"].split("/media/")[1]
    assert rel_b.startswith("about/") and (tmp_path / rel_b).exists()
    # validation
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "", "position": "x", "level": "1"})
    assert r.status_code == 400 and "full_name" in r.json()
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "x", "position": " ", "level": "1"})
    assert r.status_code == 400 and "position" in r.json()
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "x", "position": "y", "level": "11"})
    assert r.status_code == 400 and "level" in r.json()
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "Түвшин 4", "position": "Ахлах", "level": "4"})
    assert r.status_code == 201 and r.json()["level"] == 4   # 4+ түвшин зөвшөөрнө (1–10)
    assert (await client.delete(f"{A}/leaders/{r.json()['id']}/", headers=h)).status_code == 204
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "x", "position": "y", "level": "1"},
                          files={"photo": ("t.txt", b"hello", "text/plain")})
    assert r.status_code == 400 and "photo" in r.json()
    # жагсаалт эрэмбэтэй
    lst = (await client.get(f"{A}/leaders/", headers=h)).json()
    assert [x["id"] for x in lst] == [a["id"], b["id"]]
    # PATCH: level солиход тухайн түвшний сүүлд
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "Сүх", "position": "Дэд захирал", "level": "2"})
    c = r.json()
    r = await client.patch(f"{A}/leaders/{a['id']}/", headers=h, json={"level": 2, "position": "Зөвлөх"})
    assert r.status_code == 200 and r.json()["level"] == 2 and r.json()["position"] == "Зөвлөх"
    lst = (await client.get(f"{A}/leaders/", headers=h)).json()
    assert [x["id"] for x in lst] == [b["id"], c["id"], a["id"]]
    assert (await client.patch(f"{A}/leaders/{a['id']}/", headers=h, json={"level": 0})).status_code == 400
    assert (await client.patch(f"{A}/leaders/{a['id']}/", headers=h, json={"full_name": "  "})).status_code == 400
    # зураг солих → хуучин файл устна; устгах
    r = await client.post(f"{A}/leaders/{b['id']}/photo/", headers=h, files={"photo": ("q.png", png_bytes((255, 0, 0)), "image/png")})
    assert r.status_code == 200
    rel_b2 = r.json()["photo"].split("/media/")[1]
    assert not (tmp_path / rel_b).exists() and (tmp_path / rel_b2).exists()
    r = await client.delete(f"{A}/leaders/{b['id']}/photo/", headers=h)
    assert r.status_code == 200 and r.json()["photo"] is None and not (tmp_path / rel_b2).exists()
    # дараалал: бүх id заавал
    r = await client.put(f"{A}/leaders/order/", headers=h, json={"items": [{"id": a["id"], "level": 1, "order": 1}]})
    assert r.status_code == 400 and "items" in r.json()
    r = await client.put(f"{A}/leaders/order/", headers=h, json={"items": [
        {"id": c["id"], "level": 2, "order": 1}, {"id": b["id"], "level": 2, "order": 2}, {"id": a["id"], "level": 3, "order": 1}]})
    assert r.status_code == 200 and [x["id"] for x in r.json()] == [c["id"], b["id"], a["id"]] and r.json()[2]["level"] == 3
    # устгах → файл устна
    r = await client.post(f"{A}/leaders/{c['id']}/photo/", headers=h, files={"photo": ("q.png", png_bytes(), "image/png")})
    rel_c = r.json()["photo"].split("/media/")[1]
    assert (await client.delete(f"{A}/leaders/{c['id']}/", headers=h)).status_code == 204
    assert not (tmp_path / rel_c).exists()
    assert (await client.delete(f"{A}/leaders/{c['id']}/", headers=h)).status_code == 404
    assert len((await client.get("/api/about/")).json()["leaders"]) == 2


async def test_departments_and_teachers(client, make_user):
    h = await manager_headers(client, make_user)
    r = await client.post(f"{A}/departments/", headers=h, json={"name": " Математик "})
    assert r.status_code == 201 and r.json()["name"] == "Математик" and r.json()["teachers"] == []
    d1 = r.json()["id"]
    d2 = (await client.post(f"{A}/departments/", headers=h, json={"name": "Физик"})).json()["id"]
    assert (await client.post(f"{A}/departments/", headers=h, json={"name": ""})).status_code == 400
    # багш нэмэх: эрхлэгч эхэнд, дараа нь order
    t1 = (await client.post(f"{A}/departments/{d1}/teachers/", headers=h, json={"full_name": "Багш А", "role": "Математикийн багш"})).json()
    t2 = (await client.post(f"{A}/departments/{d1}/teachers/", headers=h, json={"full_name": " Эрхлэгч ", "is_head": True})).json()
    t3 = (await client.post(f"{A}/departments/{d1}/teachers/", headers=h, json={"full_name": "Багш В"})).json()
    assert t2["full_name"] == "Эрхлэгч" and t2["is_head"] is True and t1["role"] == "Математикийн багш" and t3["role"] == ""
    r = await client.post(f"{A}/departments/{d1}/teachers/", headers=h, json={"full_name": " "})
    assert r.status_code == 400 and "full_name" in r.json()
    assert (await client.post(f"{A}/departments/9999/teachers/", headers=h, json={"full_name": "x"})).status_code == 404
    lst = (await client.get(f"{A}/departments/", headers=h)).json()
    assert [x["id"] for x in lst[0]["teachers"]] == [t2["id"], t1["id"], t3["id"]]
    # PATCH багш: эрхлэгчийг болиулах → order-оор
    r = await client.patch(f"{A}/teachers/{t2['id']}/", headers=h, json={"is_head": False, "role": "Ахлах багш"})
    assert r.status_code == 200 and r.json()["is_head"] is False and r.json()["role"] == "Ахлах багш"
    lst = (await client.get(f"{A}/departments/", headers=h)).json()
    assert [x["id"] for x in lst[0]["teachers"]] == [t1["id"], t2["id"], t3["id"]]
    # багшийн дараалал: тухайн тэнхимийн бүх id
    r = await client.put(f"{A}/departments/{d1}/teachers/order/", headers=h, json={"ids": [t3["id"], t1["id"]]})
    assert r.status_code == 400 and "ids" in r.json()
    t_foreign = (await client.post(f"{A}/departments/{d2}/teachers/", headers=h, json={"full_name": "Гадны багш"})).json()
    r = await client.put(f"{A}/departments/{d1}/teachers/order/", headers=h,
                         json={"ids": [t3["id"], t1["id"], t2["id"], t_foreign["id"]]})
    assert r.status_code == 400 and "ids" in r.json()
    r = await client.put(f"{A}/departments/{d1}/teachers/order/", headers=h, json={"ids": [t3["id"], t1["id"], t2["id"]]})
    assert r.status_code == 200 and [x["id"] for x in r.json()["teachers"]] == [t3["id"], t1["id"], t2["id"]]
    # тэнхимийн дараалал
    r = await client.put(f"{A}/departments/order/", headers=h, json={"ids": [d2]})
    assert r.status_code == 400 and "ids" in r.json()
    r = await client.put(f"{A}/departments/order/", headers=h, json={"ids": [d2, d1]})
    assert r.status_code == 200 and [x["id"] for x in r.json()] == [d2, d1]
    # PATCH тэнхим, олон нийтэд
    assert (await client.patch(f"{A}/departments/{d1}/", headers=h, json={"name": "Математик, мэдээлэл зүй"})).json()["name"] == "Математик, мэдээлэл зүй"
    pub = (await client.get("/api/about/")).json()["departments"]
    assert [x["name"] for x in pub] == ["Физик", "Математик, мэдээлэл зүй"] and len(pub[1]["teachers"]) == 3
    # багш устгах, тэнхим устгах (cascade)
    assert (await client.delete(f"{A}/teachers/{t3['id']}/", headers=h)).status_code == 204
    assert (await client.delete(f"{A}/teachers/{t3['id']}/", headers=h)).status_code == 404
    assert (await client.delete(f"{A}/departments/{d1}/", headers=h)).status_code == 204
    assert (await client.patch(f"{A}/teachers/{t1['id']}/", headers=h, json={"role": "x"})).status_code == 404
    assert [x["name"] for x in (await client.get("/api/about/")).json()["departments"]] == ["Физик"]
