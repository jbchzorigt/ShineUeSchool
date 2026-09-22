async def test_validation_error_is_drf_shaped(client):
    r = await client.post("/api/auth/token/", json={"username": "a"})
    assert r.status_code == 400
    assert r.json() == {"password": ["Энэ талбар заавал шаардлагатай."]}


async def test_unknown_path_is_detail(client):
    r = await client.get("/api/nothing/")
    assert r.status_code == 404
    assert r.json() == {"detail": "Олдсонгүй."}
