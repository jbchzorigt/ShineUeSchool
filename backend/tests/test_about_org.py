"""Бидний тухай — байгууллагын бүтэц: удирдлагын харьяалал (parent_id), тэнхимийн харьяалал (leader_id), migration 0023-ийн анхны утга."""

import importlib.util
from pathlib import Path

from app.about.models import Department
from tests.helpers import manager_headers

A = "/api/about/admin"


async def mk(client, h, name, level=1, parent=""):
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": name, "position": "Албан тушаал", "level": str(level), "parent_id": parent})
    assert r.status_code == 201, r.text
    return r.json()


def _public_leader(d, id):
    return next(l for l in d["leaders"] if l["id"] == id)


async def test_parent_set_clear_and_output(client, make_user):
    h = await manager_headers(client, make_user)
    root = await mk(client, h, "Захирал", 1)
    child = await mk(client, h, "Дэд", 2, parent=str(root["id"]))
    assert root["parent_id"] is None and child["parent_id"] == root["id"]
    pub = (await client.get("/api/about/")).json()
    assert _public_leader(pub, child["id"])["parent_id"] == root["id"]
    # parent_id илгээгээгүй PATCH харьяаллыг хөндөхгүй
    r = await client.patch(f"{A}/leaders/{child['id']}/", headers=h, json={"position": "Дэд захирал"})
    assert r.status_code == 200 and r.json()["parent_id"] == root["id"]
    # null → арилна
    r = await client.patch(f"{A}/leaders/{child['id']}/", headers=h, json={"parent_id": None})
    assert r.status_code == 200 and r.json()["parent_id"] is None
    r = await client.patch(f"{A}/leaders/{child['id']}/", headers=h, json={"parent_id": root["id"]})
    assert r.status_code == 200 and r.json()["parent_id"] == root["id"]


async def test_parent_validation(client, make_user):
    h = await manager_headers(client, make_user)
    a = await mk(client, h, "А", 1)
    b = await mk(client, h, "Б", 2, parent=str(a["id"]))
    c = await mk(client, h, "В", 3, parent=str(b["id"]))
    r = await client.patch(f"{A}/leaders/{a['id']}/", headers=h, json={"parent_id": a["id"]})
    assert r.status_code == 400 and r.json()["parent_id"] == ["Өөрийгөө дээд албан тушаалтан болгох боломжгүй."]
    r = await client.patch(f"{A}/leaders/{a['id']}/", headers=h, json={"parent_id": 99999})
    assert r.status_code == 400 and r.json()["parent_id"] == ["Ийм гишүүн олдсонгүй."]
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "Г", "position": "x", "level": "1", "parent_id": "99999"})
    assert r.status_code == 400 and r.json()["parent_id"] == ["Ийм гишүүн олдсонгүй."]
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "Г", "position": "x", "level": "1", "parent_id": "abc"})
    assert r.status_code == 400 and r.json()["parent_id"] == ["Ийм гишүүн олдсонгүй."]
    # а → б → в үед а-г в-д харьяалуулбал давталт
    r = await client.patch(f"{A}/leaders/{a['id']}/", headers=h, json={"parent_id": c["id"]})
    assert r.status_code == 400 and r.json()["parent_id"] == ["Харьяалал давталт үүсгэж байна."]


async def test_delete_unassigns_children_and_departments(client, make_user, db):
    h = await manager_headers(client, make_user)
    root = await mk(client, h, "Захирал", 1)
    child = await mk(client, h, "Дэд", 2, parent=str(root["id"]))
    dept = Department(name="Мат", leader_id=root["id"])
    db.add(dept)
    await db.flush()
    assert (await client.delete(f"{A}/leaders/{root['id']}/", headers=h)).status_code == 204
    pub = (await client.get("/api/about/")).json()
    assert _public_leader(pub, child["id"])["parent_id"] is None
    assert next(d for d in pub["departments"] if d["id"] == dept.id)["leader_id"] is None


async def test_department_leader(client, make_user):
    h = await manager_headers(client, make_user)
    root = await mk(client, h, "Захирал", 1)
    r = await client.post(f"{A}/departments/", headers=h, json={"name": "Мат", "leader_id": root["id"]})
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["leader_id"] == root["id"]
    # нэр солиход харьяалал хөндөгдөхгүй
    r = await client.patch(f"{A}/departments/{d['id']}/", headers=h, json={"name": "Математик"})
    assert r.status_code == 200 and r.json()["leader_id"] == root["id"]
    for lang in ("mn", "en"):
        pub = (await client.get(f"/api/about/?lang={lang}")).json()
        assert pub["departments"][0]["leader_id"] == root["id"]
    r = await client.patch(f"{A}/departments/{d['id']}/", headers=h, json={"leader_id": None})
    assert r.status_code == 200 and r.json()["leader_id"] is None
    r = await client.patch(f"{A}/departments/{d['id']}/", headers=h, json={"leader_id": 99999})
    assert r.status_code == 400 and r.json()["leader_id"] == ["Ийм гишүүн олдсонгүй."]
    r = await client.post(f"{A}/departments/", headers=h, json={"name": "Англи", "leader_id": 99999})
    assert r.status_code == 400 and r.json()["leader_id"] == ["Ийм гишүүн олдсонгүй."]


async def test_reorder_keeps_parent(client, make_user):
    h = await manager_headers(client, make_user)
    root = await mk(client, h, "Захирал", 1)
    child = await mk(client, h, "Дэд", 2, parent=str(root["id"]))
    r = await client.put(f"{A}/leaders/order/", headers=h, json={"items": [{"id": root["id"], "level": 1, "order": 1}, {"id": child["id"], "level": 3, "order": 1}]})
    assert r.status_code == 200, r.text
    got = next(l for l in r.json() if l["id"] == child["id"])
    assert got["level"] == 3 and got["parent_id"] == root["id"]


def _migration():
    path = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "0023_about_org_chart.py"
    spec = importlib.util.spec_from_file_location("m0023", path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def test_parent_map_from_levels():
    m = _migration()
    rows = [(1, 1, 1), (2, 2, 1), (3, 3, 2), (4, 3, 1), (5, 3, 3), (6, 5, 1)]
    assert m.parent_map(rows) == {2: 1, 3: 2, 4: 2, 5: 2, 6: 4}   # 6 → өмнөх хамгийн ойр түвшний (3) эхний гишүүн (order 1 → id 4)
    assert m.parent_map([(1, 2, 1), (2, 2, 2)]) == {}             # нэг түвшин → харьяалалгүй


async def test_out_of_range_and_non_decimal_ids(client, make_user):
    """int32-оос их id, "²" (isdigit боловч тоо биш) → 400, 500 биш."""
    h = await manager_headers(client, make_user)
    a = await mk(client, h, "А", 1)
    r = await client.patch(f"{A}/leaders/{a['id']}/", headers=h, json={"parent_id": 2**31})
    assert r.status_code == 400 and r.json()["parent_id"] == ["Ийм гишүүн олдсонгүй."]
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "Г", "position": "x", "level": "1", "parent_id": "²"})
    assert r.status_code == 400 and r.json()["parent_id"] == ["Ийм гишүүн олдсонгүй."]
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "Г", "position": "x", "level": "1", "parent_id": str(2**40)})
    assert r.status_code == 400 and r.json()["parent_id"] == ["Ийм гишүүн олдсонгүй."]
    r = await client.post(f"{A}/departments/", headers=h, json={"name": "Мат", "leader_id": 2**40})
    assert r.status_code == 400 and r.json()["leader_id"] == ["Ийм гишүүн олдсонгүй."]


async def test_leader_deleted_between_check_and_commit(client, make_user, monkeypatch):
    """Шалгалтын дараа, хадгалахаас өмнө гишүүн устгагдвал (FK зөрчил) → 400, 500 биш."""
    import app.about.router_admin as ra

    async def unchecked(db, *args):
        return args[-1]
    monkeypatch.setattr(ra, "check_parent", unchecked)
    monkeypatch.setattr(ra, "check_leader", unchecked)
    h = await manager_headers(client, make_user)
    a = await mk(client, h, "А", 1)
    r = await client.patch(f"{A}/leaders/{a['id']}/", headers=h, json={"parent_id": 99999})
    assert r.status_code == 400 and r.json()["parent_id"] == ["Ийм гишүүн олдсонгүй."]
    r = await client.post(f"{A}/departments/", headers=h, json={"name": "Мат", "leader_id": 99999})
    assert r.status_code == 400 and r.json()["leader_id"] == ["Ийм гишүүн олдсонгүй."]
