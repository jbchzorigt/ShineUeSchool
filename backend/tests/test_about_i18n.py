"""Бидний тухай — англи хувилбар: танилцуулга, үзүүлэлтийн шошго, албан тушаал, тэнхим, багшийн үүрэг."""

from tests.helpers import staff_headers


async def test_about_page_en(client, make_user):
    h = await staff_headers(client, make_user, roles=("about.edit",))
    r = await client.patch("/api/about/admin/page/", headers=h, json={
        "intro_title_en": "About us", "intro_html_en": "<p>Hi</p><script>x</script>",
        "stats": [{"value": "23", "label": "жил", "label_en": "years"}, {"value": "900", "label": "сурагч"}]})
    assert r.status_code == 200, r.text
    assert r.json()["stats"][0]["label_en"] == "years" and r.json()["stats"][1]["label_en"] == ""
    assert r.json()["intro_title_en"] == "About us" and "<script" not in r.json()["intro_html_en"]
    d = (await client.get("/api/about/?lang=en")).json()
    assert d["page"]["intro_title"] == "About us" and d["page"]["intro_html"] == "<p>Hi</p>"
    assert [s["label"] for s in d["page"]["stats"]] == ["years", "сурагч"]
    m = (await client.get("/api/about/")).json()
    assert m["page"]["stats"][0]["label"] == "жил" and m["page"]["intro_title"] != "About us"
    r = await client.patch("/api/about/admin/page/", headers=h, json={"stats": [{"value": "1", "label": "a", "label_en": "x" * 61}]})
    assert r.status_code == 400


async def test_about_people_en(client, make_user):
    h = await staff_headers(client, make_user, roles=("about.edit",))
    r = await client.post("/api/about/admin/leaders/", headers=h, data={"full_name": "Бат", "position": "Захирал", "position_en": "Principal", "level": "1"})
    assert r.status_code == 201, r.text
    assert r.json()["position_en"] == "Principal"
    lid = r.json()["id"]
    r = await client.patch(f"/api/about/admin/leaders/{lid}/", headers=h, json={"position_en": "Head"})
    assert r.json()["position_en"] == "Head"
    r = await client.post("/api/about/admin/departments/", headers=h, json={"name": "Математик", "name_en": "Mathematics"})
    assert r.status_code == 201 and r.json()["name_en"] == "Mathematics"
    did = r.json()["id"]
    r = await client.patch(f"/api/about/admin/departments/{did}/", headers=h, json={"name_en": "Maths"})
    assert r.json()["name_en"] == "Maths"
    r = await client.post(f"/api/about/admin/departments/{did}/teachers/", headers=h, json={"full_name": "Сараа", "role": "Багш", "role_en": "Teacher"})
    assert r.status_code == 201 and r.json()["role_en"] == "Teacher"
    r = await client.patch(f"/api/about/admin/teachers/{r.json()['id']}/", headers=h, json={"role_en": "Head teacher"})
    assert r.json()["role_en"] == "Head teacher"
    d = (await client.get("/api/about/?lang=en")).json()
    assert d["leaders"][0]["position"] == "Head" and d["departments"][0]["name"] == "Maths"
    assert d["departments"][0]["teachers"][0]["role"] == "Head teacher"
    m = (await client.get("/api/about/")).json()
    assert m["leaders"][0]["position"] == "Захирал" and m["departments"][0]["name"] == "Математик"


async def test_empty_english_editor_falls_back(client, make_user):
    # Tiptap хоосон үедээ "<p></p>" буцаадаг — англи хуудас монгол fallback-аа алдах ёсгүй
    h = await staff_headers(client, make_user, roles=("about.edit",))
    await client.patch("/api/about/admin/page/", headers=h, json={"intro_html": "<p>Монгол</p>", "intro_html_en": "<p></p>"})
    d = (await client.get("/api/about/?lang=en")).json()
    assert d["page"]["intro_html"] == "<p>Монгол</p>" and d["page"]["intro_html_en"] == ""
