from .conftest import register


def test_vendor_suggest_scope(client):
    """자동완성은 공개 카드 업체명 + 내 업체명만 — 남의 비공개 지출은 새지 않는다."""
    a = register(client, "갑돌")
    b = register(client, "을순")
    # A: 비공개 지출(비밀샵), 공유 카드(공개샵)
    client.post(
        "/api/expenses",
        json={"taxonomy_slug": "dress", "actual_amount": 1, "vendor_name": "비밀샵"},
        headers=a,
    )
    client.post(
        "/api/posts",
        json={
            "body": "공유",
            "card": {"category_slug": "snap", "amount": 1, "vendor_name": "공개샵"},
        },
        headers=a,
    )
    # B: 자기 지출(내샵)
    client.post(
        "/api/expenses",
        json={"taxonomy_slug": "snap", "actual_amount": 1, "vendor_name": "내샵"},
        headers=b,
    )
    got = client.get("/api/expenses/vendor-suggest", headers=b).json()
    assert "공개샵" in got  # 공개 카드에서
    assert "내샵" in got  # 내 지출에서
    assert "비밀샵" not in got  # 남의 비공개 지출은 절대 노출 금지
    # 검색어 필터
    got = client.get("/api/expenses/vendor-suggest?q=내", headers=b).json()
    assert got == ["내샵"]


def test_password_change(client):
    headers = register(client, "기승")
    # 현재 비밀번호가 틀리면 거부
    res = client.post(
        "/api/auth/password",
        json={"current_password": "wrong", "new_password": "new-pass-123"},
        headers=headers,
    )
    assert res.status_code == 403

    res = client.post(
        "/api/auth/password",
        json={"current_password": "test-pass-1", "new_password": "new-pass-123"},
        headers=headers,
    )
    assert res.status_code == 200
    new_token = res.json()["token"]
    # 기존 토큰은 무효, 새 토큰은 유효
    assert client.get("/api/auth/me", headers=headers).status_code == 401
    assert (
        client.get("/api/auth/me", headers={"authorization": f"Bearer {new_token}"}).status_code
        == 200
    )
    # 새 비밀번호로 로그인
    assert (
        client.post(
            "/api/auth/login", json={"nickname": "기승", "password": "new-pass-123"}
        ).status_code
        == 200
    )
