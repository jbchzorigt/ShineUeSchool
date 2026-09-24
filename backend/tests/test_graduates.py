"""Төгсөгчид: улс + сургуулиуд (менежер API, нээлттэй жагсаалт)."""

from tests.helpers import manager_headers, staff_headers

A = "/api/graduates/admin"


async def test_graduates_crud(client, make_user):
    h = await manager_headers(client, make_user)
    # каталог: тив автоматаар
    r = await client.get(f"{A}/catalogue/", headers=h)
    assert r.status_code == 200
    jp = next(i for i in r.json() if i["code"] == "JP")
    assert jp["continent"] == "asia" and jp["numeric"] == "392" and len(jp["coords"]) == 2
    # validation
    r = await client.post(f"{A}/countries/", headers=h, json={"code": "XX", "universities": ["A"]})
    assert r.status_code == 400 and "code" in r.json()
    r = await client.post(f"{A}/countries/", headers=h, json={"code": "JP", "universities": [" ", ""]})
    assert r.status_code == 400 and "universities" in r.json()
    # create: код жижиг үсэгтэй ч болно; давхардал, хоосон мөр цэвэрлэгдэнэ; тив/нэр/координат каталогоос
    body = {"code": "jp", "universities": ["University of Tokyo", "  Kyoto  University ", "university of tokyo", ""]}
    r = await client.post(f"{A}/countries/", headers=h, json=body)
    assert r.status_code == 201, r.text
    a = r.json()
    assert a["code"] == "JP" and a["name"] == "Япон" and a["continent"] == "asia" and a["order"] == 1
    assert a["universities"] == ["University of Tokyo", "Kyoto University"]
    r = await client.post(f"{A}/countries/", headers=h, json={"code": "JP", "universities": ["X"]})
    assert r.status_code == 400 and "code" in r.json()
    b = (await client.post(f"{A}/countries/", headers=h, json={"code": "US", "universities": ["MIT"]})).json()
    assert b["continent"] == "north_america" and b["order"] == 2
    # patch
    r = await client.patch(f"{A}/countries/{a['id']}/", headers=h, json={"universities": ["Osaka University"]})
    assert r.status_code == 200 and r.json()["universities"] == ["Osaka University"]
    r = await client.patch(f"{A}/countries/{a['id']}/", headers=h, json={"universities": []})
    assert r.status_code == 400 and "universities" in r.json()
    assert (await client.patch(f"{A}/countries/9999/", headers=h, json={"universities": ["X"]})).status_code == 404
    # order
    r = await client.put(f"{A}/countries/order/", headers=h, json={"ids": [b["id"]]})
    assert r.status_code == 400 and "ids" in r.json()
    r = await client.put(f"{A}/countries/order/", headers=h, json={"ids": [b["id"], a["id"]]})
    assert r.status_code == 200 and [c["code"] for c in r.json()] == ["US", "JP"]
    # public
    r = await client.get("/api/graduates/")
    assert r.status_code == 200 and [c["code"] for c in r.json()] == ["US", "JP"] and r.json()[1]["universities"] == ["Osaka University"]
    # delete
    r = await client.delete(f"{A}/countries/{a['id']}/", headers=h)
    assert r.status_code == 204
    assert [c["code"] for c in (await client.get("/api/graduates/")).json()] == ["US"]


async def test_graduates_auth(client, make_user):
    assert (await client.get(f"{A}/countries/")).status_code == 401
    h = await staff_headers(client, make_user)
    assert (await client.get(f"{A}/countries/", headers=h)).status_code == 403
    assert (await client.post(f"{A}/countries/", headers=h, json={"code": "JP", "universities": ["X"]})).status_code == 403


async def test_graduate_stats(client, make_user):
    # нээлттэй: мөр байхгүй бол 0-үүд
    r = await client.get("/api/graduates/stats/")
    assert r.status_code == 200 and r.json() == {"total_graduates": 0, "university_percent": 0, "university_count": 0, "abroad_count": 0}
    h = await manager_headers(client, make_user)
    r = await client.patch(f"{A}/stats/", headers=h, json={"total_graduates": 1200, "university_percent": 95, "university_count": 1140, "abroad_count": 180})
    assert r.status_code == 200 and r.json()["total_graduates"] == 1200 and r.json()["abroad_count"] == 180
    r = await client.patch(f"{A}/stats/", headers=h, json={"university_percent": 101})
    assert r.status_code == 400 and "university_percent" in r.json()
    r = await client.patch(f"{A}/stats/", headers=h, json={"abroad_count": -1})
    assert r.status_code == 400 and "abroad_count" in r.json()
    assert (await client.get("/api/graduates/stats/")).json()["university_percent"] == 95   # буруу PATCH хадгалагдаагүй
    assert (await client.patch(f"{A}/stats/", headers=await staff_headers(client, make_user), json={"total_graduates": 1})).status_code == 403
