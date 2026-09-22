import io

from PIL import Image

from tests.helpers import staff_headers


def png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (40, 50), (30, 58, 143)).save(buf, format="PNG")
    return buf.getvalue()


async def test_page_defaults_created_on_first_get(client):
    r = await client.get("/api/olympiad/page/")
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["title"] == "Ү.Маамын нэрэмжит математикийн олимпиад"
    assert p["eyebrow"] == "Монгол Улсын Ардын багш" and p["portrait_image"] is None
    assert [s["value"] for s in p["stats"]] == ["2026", "6–12", "3"]
    assert p["contact_email"] == "info@shine-ue.edu.mn"
    assert (await client.get("/api/olympiad/page/")).json() == p  # хоёр дахь удаад ижил мөр


async def test_page_patch(client, make_user):
    h = await staff_headers(client, make_user)
    body = {"bio": "Шинэ намтар", "stats": [{"value": "2027", "label": "Он"}, {"value": "7", "label": "Анги"}],
            "contact_phone": "+976 7000-0000"}
    r = await client.patch("/api/olympiad/page/", headers=h, json=body)
    assert r.status_code == 200, r.text
    assert r.json()["bio"] == "Шинэ намтар" and len(r.json()["stats"]) == 2 and r.json()["contact_phone"] == "+976 7000-0000"
    assert r.json()["title"] == "Ү.Маамын нэрэмжит математикийн олимпиад"  # бусад талбар хэвээр

    r = await client.patch("/api/olympiad/page/", headers=h, json={"stats": [{"value": "x", "label": ""}]})
    assert r.status_code == 400 and "stats" in r.json()
    r = await client.patch("/api/olympiad/page/", headers=h, json={"stats": [{"value": str(i), "label": "l"} for i in range(5)]})
    assert r.status_code == 400 and "stats" in r.json()
    r = await client.patch("/api/olympiad/page/", headers=h, json={"stats": []})
    assert r.status_code == 400 and "stats" in r.json()
    r = await client.patch("/api/olympiad/page/", headers=h, json={"title": ""})
    assert r.status_code == 400 and "title" in r.json()


async def test_page_write_requires_staff(client, make_user):
    assert (await client.patch("/api/olympiad/page/", json={"bio": "x"})).status_code == 401
    await make_user("plain")
    from tests.helpers import login
    t = await login(client, "plain")
    r = await client.patch("/api/olympiad/page/", headers={"Authorization": f"Bearer {t['access']}"}, json={"bio": "x"})
    assert r.status_code == 403


async def test_portrait_upload_replace_delete(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await staff_headers(client, make_user)
    files = {"image": ("maam.png", png_bytes(), "image/png")}
    r = await client.post("/api/olympiad/page/portrait/", headers=h, files=files)
    assert r.status_code == 200, r.text
    url1 = r.json()["portrait_image"]
    assert url1 and "/media/olympiad/" in url1
    rel1 = url1.split("/media/")[1]
    assert (tmp_path / rel1).exists()

    r = await client.post("/api/olympiad/page/portrait/", headers=h, files={"image": ("maam2.png", png_bytes(), "image/png")})
    url2 = r.json()["portrait_image"]
    assert url2 != url1 and not (tmp_path / rel1).exists()  # хуучин файл устсан

    r = await client.delete("/api/olympiad/page/portrait/", headers=h)
    assert r.status_code == 200 and r.json()["portrait_image"] is None
    assert not (tmp_path / url2.split("/media/")[1]).exists()
    assert (await client.get("/api/olympiad/page/")).json()["portrait_image"] is None
