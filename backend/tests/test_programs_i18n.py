"""Хөтөлбөр — англи хувилбар: нийтийн `?lang=en` (англи хоосон бол монгол fallback), админы англи талбарууд."""

import io

from PIL import Image

from app.programs.models import Program, ProgramWork
from tests.helpers import staff_headers


def png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), "red").save(buf, "PNG")
    return buf.getvalue()


async def test_programs_en_fallback(client, db):
    p = Program(slug="ibdp", name="IB хөтөлбөр", name_en="IB Diploma", badge="IBDP", summary="Товч", body_html="<p>MN</p>",
                grade_from=11, grade_to=12)
    db.add(p)
    await db.flush()
    db.add(ProgramWork(program_id=p.id, image="programs/w.jpg", title="Бүтээл", title_en="", caption="Т", caption_en="Cap"))
    await db.flush()
    # Дэлгэрэнгүйг эхэлж: жагсаалтын noload(works) тестийн нэг session-д объектын works-ийг хоосон болгодог
    d = (await client.get("/api/programs/ibdp/?lang=en")).json()
    assert d["body_html"] == "<p>MN</p>"                                    # хөтөлбөрийн бие MN fallback (мэдээнээс ялгаатай)
    assert d["works"][0]["title"] == "Бүтээл" and d["works"][0]["caption"] == "Cap"
    m = (await client.get("/api/programs/ibdp/")).json()
    assert m["name"] == "IB хөтөлбөр" and m["works"][0]["caption"] == "Т"
    c = (await client.get("/api/programs/?lang=en")).json()[0]
    assert c["name"] == "IB Diploma" and c["summary"] == "Товч"            # summary_en хоосон → MN


async def test_programs_admin_en_fields(client, db, make_user):
    h = await staff_headers(client, make_user, roles=("manager",))
    r = await client.post("/api/programs/admin/programs/", headers=h,
                          json={"name": "Үндэсний", "badge": "MN", "name_en": "National", "summary_en": " Short ",
                                "body_html_en": "<p>x</p><script>y</script>"})
    assert r.status_code == 201, r.text
    assert r.json()["name_en"] == "National" and r.json()["summary_en"] == "Short" and "<script" not in r.json()["body_html_en"]
    pid = r.json()["id"]
    r = await client.patch(f"/api/programs/admin/programs/{pid}/", json={"name_en": "National Core", "body_html_en": "<p></p>"}, headers=h)
    assert r.json()["name_en"] == "National Core" and r.json()["body_html_en"] == ""
    r = await client.post(f"/api/programs/admin/programs/{pid}/works/", headers=h,
                          data={"title": "Бүтээл", "title_en": "Work", "caption_en": "Caption"}, files={"image": ("a.png", png(), "image/png")})
    assert r.status_code == 201, r.text
    assert r.json()["title_en"] == "Work" and r.json()["caption_en"] == "Caption"
    r = await client.patch(f"/api/programs/admin/works/{r.json()['id']}/", json={"title_en": "Work 2"}, headers=h)
    assert r.json()["title_en"] == "Work 2"
