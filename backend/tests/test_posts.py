from .conftest import register


def test_feed_is_public_but_writing_is_not(client):
    """P7: 읽기는 가입 없이, 쓰기만 로그인."""
    assert client.get("/api/posts").status_code == 200
    assert client.post("/api/posts", json={"body": "x"}).status_code == 401


def test_post_with_inline_card(client):
    headers = register(client)
    res = client.post(
        "/api/posts",
        json={
            "body": "본식스냅 계약!",
            "card": {
                "category_slug": "snap",
                "amount": 990000,
                "region": "수도권",
                "paid_month": "2026-06",
            },
        },
        headers=headers,
    )
    assert res.status_code == 201
    card = res.json()["card"]
    assert card["amount"] == 990000
    assert card["trust_grade"] == "B"


def test_card_snapshot_is_immutable(client):
    """4장: 공유는 스냅샷 복사 — 트래커 수정이 카드로 새지 않는다."""
    headers = register(client)
    client.put("/api/profile", json={"region": "수도권"}, headers=headers)
    e = client.post(
        "/api/expenses",
        json={"taxonomy_slug": "dress", "actual_amount": 80000, "paid_at": "2026-07-01"},
        headers=headers,
    ).json()
    p = client.post(
        "/api/posts", json={"body": "공유", "card": {"expense_id": e["id"]}}, headers=headers
    ).json()
    assert p["card"]["amount"] == 80000
    assert p["card"]["paid_month"] == "2026-07"  # 월 단위로만 담긴다
    assert p["card"]["region"] == "수도권"

    client.patch(f"/api/expenses/{e['id']}", json={"actual_amount": 999999}, headers=headers)
    detail = client.get(f"/api/posts/{p['id']}").json()
    assert detail["card"]["amount"] == 80000


def test_cannot_share_others_expense(client):
    a = register(client, "갑돌")
    b = register(client, "을순")
    e = client.post(
        "/api/expenses", json={"taxonomy_slug": "snap", "actual_amount": 1}, headers=a
    ).json()
    res = client.post(
        "/api/posts", json={"body": "훔친 카드", "card": {"expense_id": e["id"]}}, headers=b
    )
    assert res.status_code == 404


def test_delete_ownership(client):
    a = register(client, "갑돌")
    b = register(client, "을순")
    p = client.post("/api/posts", json={"body": "내 글"}, headers=a).json()
    assert client.delete(f"/api/posts/{p['id']}", headers=b).status_code == 403
    assert client.delete(f"/api/posts/{p['id']}", headers=a).status_code == 204
    assert client.get("/api/posts").json() == []


def test_comments_and_ownership(client):
    a = register(client, "갑돌")
    b = register(client, "을순")
    p = client.post("/api/posts", json={"body": "질문 있어요"}, headers=a).json()
    c = client.post(
        f"/api/posts/{p['id']}/comments", json={"body": "답이에요"}, headers=b
    ).json()
    assert client.get(f"/api/posts/{p['id']}").json()["comment_count"] == 1
    assert client.delete(f"/api/posts/comments/{c['id']}", headers=a).status_code == 403
    assert client.delete(f"/api/posts/comments/{c['id']}", headers=b).status_code == 204


def test_post_rate_limit(client):
    """5.5: 계정당 글 5건/시간."""
    headers = register(client)
    codes = [
        client.post("/api/posts", json={"body": f"글 {i}"}, headers=headers).status_code
        for i in range(6)
    ]
    assert codes == [201] * 5 + [429]


def test_comment_rate_limit(client):
    """5.5: 계정당 댓글 20건/시간."""
    a = register(client, "갑돌")
    b = register(client, "을순")
    p = client.post("/api/posts", json={"body": "글"}, headers=a).json()
    codes = [
        client.post(
            f"/api/posts/{p['id']}/comments", json={"body": f"댓글 {i}"}, headers=b
        ).status_code
        for i in range(21)
    ]
    assert codes == [201] * 20 + [429]


def test_empty_body_rejected(client):
    headers = register(client)
    assert client.post("/api/posts", json={"body": "   "}, headers=headers).status_code == 422


def test_feed_cursor_pagination(client):
    # rate limit(5/시간)을 피해 사용자 3명이 2건씩 작성
    for n in range(3):
        h = register(client, f"작성자{n}")
        for i in range(2):
            client.post("/api/posts", json={"body": f"글 {n}-{i}"}, headers=h)
    first = client.get("/api/posts?limit=4").json()
    assert len(first) == 4
    rest = client.get(f"/api/posts?limit=4&before_id={first[-1]['id']}").json()
    assert len(rest) == 2
    ids = [p["id"] for p in first + rest]
    assert ids == sorted(ids, reverse=True)  # 최신순, 중복 없음
    assert len(set(ids)) == 6
