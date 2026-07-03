from .conftest import register


def test_register_login_me(client):
    headers = register(client, "기승")
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["nickname"] == "기승"

    login = client.post(
        "/api/auth/login", json={"nickname": "기승", "password": "test-pass-1"}
    )
    assert login.status_code == 200


def test_duplicate_nickname_conflict(client):
    register(client, "기승")
    res = client.post(
        "/api/auth/register", json={"nickname": "기승", "password": "test-pass-2"}
    )
    assert res.status_code == 409


def test_wrong_password_rejected(client):
    register(client, "기승")
    res = client.post(
        "/api/auth/login", json={"nickname": "기승", "password": "wrong-pass"}
    )
    assert res.status_code == 401


def test_short_password_rejected(client):
    res = client.post("/api/auth/register", json={"nickname": "기승", "password": "short"})
    assert res.status_code == 422


def test_no_pii_collected(client):
    """가입에 닉네임·비밀번호 외의 것을 요구하지 않는다(5.9)."""
    res = client.post(
        "/api/auth/register", json={"nickname": "미니멀", "password": "test-pass-1"}
    )
    assert res.status_code == 201


def test_account_deletion_erases_everything(client):
    """P4: 철회는 기여만큼 쉬워야 한다 — 계정 삭제 = 전체 삭제."""
    headers = register(client, "삭제자")
    client.put("/api/profile", json={"wedding_date": "2027-05-01"}, headers=headers)
    client.post("/api/checklist/generate", headers=headers)
    e = client.post(
        "/api/expenses",
        json={"taxonomy_slug": "snap", "actual_amount": 500000},
        headers=headers,
    ).json()
    client.post(
        "/api/posts",
        json={"body": "공유", "card": {"expense_id": e["id"]}},
        headers=headers,
    )
    other = register(client, "타인")
    assert len(client.get("/api/posts").json()) == 1

    res = client.delete("/api/auth/me", headers=headers)
    assert res.status_code == 204
    assert client.get("/api/posts").json() == []  # 카드도 집계에서 빠진다
    assert client.get("/api/expenses", headers=headers).status_code == 401  # 토큰 무효
    # 타인 계정은 무사하다
    assert client.get("/api/expenses", headers=other).status_code == 200
