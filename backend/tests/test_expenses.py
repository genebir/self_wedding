from .conftest import register


def test_requires_auth(client):
    assert client.get("/api/expenses").status_code == 401
    assert client.post("/api/expenses", json={"taxonomy_slug": "snap"}).status_code == 401


def test_create_and_summary(client):
    headers = register(client)
    res = client.post(
        "/api/expenses",
        json={
            "taxonomy_slug": "dress",
            "title": "피팅비",
            "actual_amount": 80000,
            "vendor_name": "A드레스샵",
            "scope": [{"key": "fitting-fee", "label": "피팅비", "status": "included"}],
        },
        headers=headers,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["vendor"]["name"] == "A드레스샵"  # 5.7 vendor upsert
    assert body["scope"][0]["status"] == "included"

    summary = client.get("/api/expenses/summary", headers=headers).json()
    assert summary["actual_total"] == 80000
    assert summary["by_category"][0]["taxonomy_slug"] == "dress"


def test_per_user_isolation(client):
    a = register(client, "갑돌")
    b = register(client, "을순")
    client.post(
        "/api/expenses", json={"taxonomy_slug": "snap", "actual_amount": 1}, headers=a
    )
    assert client.get("/api/expenses", headers=b).json() == []
    # 남의 지출은 수정·삭제도 못 한다
    eid = client.get("/api/expenses", headers=a).json()[0]["id"]
    assert (
        client.patch(f"/api/expenses/{eid}", json={"actual_amount": 2}, headers=b).status_code
        == 404
    )
    assert client.delete(f"/api/expenses/{eid}", headers=b).status_code == 404


def test_unknown_category_404(client):
    headers = register(client)
    res = client.post(
        "/api/expenses", json={"taxonomy_slug": "없는카테고리"}, headers=headers
    )
    assert res.status_code == 404
