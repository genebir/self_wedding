from .conftest import register


def test_generate_requires_wedding_date(client):
    headers = register(client)
    assert client.post("/api/checklist/generate", headers=headers).status_code == 409


def test_generate_and_dday_recompute(client):
    headers = register(client)
    client.put("/api/profile", json={"wedding_date": "2027-03-20"}, headers=headers)
    items = client.post("/api/checklist/generate", headers=headers).json()
    assert len(items) >= 20
    first = items[0]
    assert first["due_date"] is not None

    # 예식일 변경 → 역산 재계산
    client.put("/api/profile", json={"wedding_date": "2027-04-20"}, headers=headers)
    moved = client.get("/api/checklist", headers=headers).json()[0]
    assert moved["due_date"] != first["due_date"]

    # 재생성해도 중복 생성되지 않는다
    again = client.post("/api/checklist/generate", headers=headers).json()
    assert len(again) == len(items)


def test_checklist_isolation(client):
    a = register(client, "갑돌")
    b = register(client, "을순")
    client.put("/api/profile", json={"wedding_date": "2027-03-20"}, headers=a)
    client.post("/api/checklist/generate", headers=a)
    assert client.get("/api/checklist", headers=b).json() == []


def test_glossary_public_and_scoped(client):
    """사전은 공개(P7·SEO), 카테고리 필터는 전용+공통 항목을 준다."""
    assert client.get("/api/glossary").status_code == 200
    dress = client.get("/api/glossary?category=dress").json()
    slugs = {g["slug"] for g in dress}
    assert "helper-fee" in slugs  # dress 전용
    assert "deposit-schedule" in slugs  # 공통(category None)
    assert "original-fee" not in slugs  # studio 전용은 제외
