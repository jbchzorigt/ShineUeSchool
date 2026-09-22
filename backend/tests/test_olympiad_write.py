import io

from PIL import Image

from tests.helpers import login, staff_headers

STAGE = {"year": 2026, "order": 1, "title": "Бүртгэл", "date_text": "2026 · 10 сар", "date": None, "text": "", "tags": ["Онлайн"], "location": ""}


async def test_stage_write_requires_staff(client, make_user):
    r = await client.post("/api/olympiad/schedule/", json=STAGE)
    assert r.status_code == 401
    await make_user("plain")
    t = await login(client, "plain")
    r = await client.post("/api/olympiad/schedule/", json=STAGE, headers={"Authorization": f"Bearer {t['access']}"})
    assert r.status_code == 403


async def test_stage_crud(client, make_user):
    h = await staff_headers(client, make_user)
    r = await client.post("/api/olympiad/schedule/", json=STAGE, headers=h)
    assert r.status_code == 201, r.text
    sid = r.json()["id"]
    r = await client.patch(f"/api/olympiad/schedule/{sid}/", json={"title": "Бүртгэл 2"}, headers=h)
    assert r.status_code == 200 and r.json()["title"] == "Бүртгэл 2" and r.json()["tags"] == ["Онлайн"]
    r = await client.delete(f"/api/olympiad/schedule/{sid}/", headers=h)
    assert r.status_code == 204
    assert (await client.get("/api/olympiad/schedule/")).json() == []


async def test_stage_duplicate_order_is_field_error(client, make_user):
    h = await staff_headers(client, make_user)
    await client.post("/api/olympiad/schedule/", json=STAGE, headers=h)
    r = await client.post("/api/olympiad/schedule/", json=STAGE, headers=h)
    assert r.status_code == 400
    assert r.json() == {"order": ["Энэ онд ийм дараалалтай шат аль хэдийн байна."]}


async def test_stage_validation_error(client, make_user):
    h = await staff_headers(client, make_user)
    r = await client.post("/api/olympiad/schedule/", json={**STAGE, "year": "abc"}, headers=h)
    assert r.status_code == 400
    assert r.json() == {"year": ["Бүхэл тоо оруулна уу."]}


async def test_result_crud(client, make_user):
    h = await staff_headers(client, make_user)
    body = {"year": 2025, "category": "9", "last_name": "Бат", "first_name": "А", "school": "", "code": "",
            "scores": [7, None, 5], "score": 12, "rank_label": "I", "medal": "АЛТ", "note": ""}
    r = await client.post("/api/olympiad/results/", json=body, headers=h)
    assert r.status_code == 201, r.text
    rid = r.json()["id"]
    assert r.json()["student"] == "Б.А" and r.json()["rank"] == 1 and r.json()["scores"] == [7.0, None, 5.0]
    r = await client.patch(f"/api/olympiad/results/{rid}/", json={"score": 20}, headers=h)
    assert r.json()["score"] == 20.0
    r = await client.delete(f"/api/olympiad/results/{rid}/", headers=h)
    assert r.status_code == 204
    assert (await client.delete(f"/api/olympiad/results/{rid}/", headers=h)).status_code == 404


def png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), "blue").save(buf, format="PNG")
    return buf.getvalue()


async def test_album_upload_patch_delete(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await staff_headers(client, make_user)
    r = await client.post("/api/olympiad/album/", headers=h,
                          files={"image": ("photo.png", png_bytes(), "image/png")},
                          data={"title": "Анхны хичээл", "caption": "Маам багш анхны хичээлээ заасан ангид.", "order": "1", "is_published": "false"})
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    assert r.json()["title"] == "Анхны хичээл" and r.json()["caption"] == "Маам багш анхны хичээлээ заасан ангид."
    assert set(r.json()) == {"id", "order", "image", "title", "caption", "is_published"}
    assert r.json()["image"].startswith("http://test/media/album/") and r.json()["image"].endswith(".png")
    assert (await client.get("/api/olympiad/album/")).json() == []
    assert len((await client.get("/api/olympiad/album/", headers=h)).json()) == 1
    r = await client.patch(f"/api/olympiad/album/{pid}/", json={"is_published": True, "title": "Анхны хичээл (1995)"}, headers=h)
    assert r.status_code == 200 and r.json()["title"] == "Анхны хичээл (1995)"
    assert len((await client.get("/api/olympiad/album/")).json()) == 1
    assert (tmp_path / "album").exists() and len(list((tmp_path / "album").iterdir())) == 1
    r = await client.delete(f"/api/olympiad/album/{pid}/", headers=h)
    assert r.status_code == 204
    assert list((tmp_path / "album").iterdir()) == []


async def test_album_rejects_non_image(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await staff_headers(client, make_user)
    r = await client.post("/api/olympiad/album/", headers=h,
                          files={"image": ("x.txt", b"hello", "text/plain")}, data={"title": "х", "caption": "х"})
    assert r.status_code == 400
    assert r.json() == {"image": ["Зөвхөн JPG, PNG, WebP зураг хүлээн авна."]}


async def test_album_requires_title(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await staff_headers(client, make_user)
    r = await client.post("/api/olympiad/album/", headers=h,
                          files={"image": ("photo.png", png_bytes(), "image/png")},
                          data={"caption": "Тайлбар"})
    assert r.status_code == 400
    assert r.json() == {"title": ["Энэ талбар заавал шаардлагатай."]}
    r = await client.post("/api/olympiad/album/", headers=h,
                          files={"image": ("photo.png", png_bytes(), "image/png")},
                          data={"title": "   ", "caption": "Тайлбар"})
    assert r.status_code == 400
    assert r.json() == {"title": ["Гарчиг хоосон байж болохгүй."]}
    assert list((tmp_path / "album").iterdir()) == [] if (tmp_path / "album").exists() else True
