"""Бидний тухай — олон нийтийн GET /api/about/."""

from app.about.models import Department, DeptTeacher, Leader


async def test_about_defaults_and_empty_lists(client):
    r = await client.get("/api/about/")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["page"] == {"intro_title": "Шинэ Үе сургууль", "intro_html": "", "stats": []}
    assert d["leaders"] == [] and d["departments"] == []
    assert (await client.get("/api/about/")).json() == d   # хоёр дахь удаад ижил мөр


async def test_about_ordering(client, db):
    db.add_all([
        Leader(full_name="Гуравдугаар", position="Менежер", level=3, order=1),
        Leader(full_name="Дэд Б", position="Дэд захирал", level=2, order=2, photo="about/b.jpg"),
        Leader(full_name="Дэд А", position="Дэд захирал", level=2, order=1),
        Leader(full_name="Захирал", position="Захирал", level=1, order=1),
    ])
    d2 = Department(name="Хоёр", order=2)
    d1 = Department(name="Нэг", order=1)
    db.add_all([d1, d2])
    await db.flush()
    db.add_all([
        DeptTeacher(department_id=d1.id, full_name="Багш Б", role="Математикийн багш", is_head=False, order=1),
        DeptTeacher(department_id=d1.id, full_name="Эрхлэгч", role="", is_head=True, order=2),
        DeptTeacher(department_id=d1.id, full_name="Багш В", role="", is_head=False, order=3),
    ])
    await db.flush()
    d = (await client.get("/api/about/")).json()
    assert [l["full_name"] for l in d["leaders"]] == ["Захирал", "Дэд А", "Дэд Б", "Гуравдугаар"]
    assert d["leaders"][2]["photo"].endswith("/media/about/b.jpg") and d["leaders"][0]["photo"] is None
    assert [x["name"] for x in d["departments"]] == ["Нэг", "Хоёр"]
    t = d["departments"][0]["teachers"]
    assert [x["full_name"] for x in t] == ["Эрхлэгч", "Багш Б", "Багш В"] and t[0]["is_head"] is True
    assert d["departments"][1]["teachers"] == []
