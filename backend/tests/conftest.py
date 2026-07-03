import os

import pytest
from fastapi.testclient import TestClient

# app 임포트 전에 테스트 DB로 향하게 한다
os.environ.setdefault(
    "MALGEUM_DATABASE_URL",
    "postgresql+psycopg://malgeum:malgeum-dev@localhost:5433/malgeum_test",
)

from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402

USER_TABLES = [
    "comment",
    "post_card",
    "post",
    "expense",
    "checklist_item",
    "profile",
    "vendor",
    '"user"',
]


@pytest.fixture()
def client():
    # TestClient 컨텍스트가 lifespan(create_all + seed)을 실행한다
    with TestClient(app) as c:
        yield c
    with engine.begin() as conn:
        from sqlalchemy import text

        conn.execute(
            text(f"TRUNCATE {', '.join(USER_TABLES)} RESTART IDENTITY CASCADE")
        )


def register(client, nickname="테스터", password="test-pass-1"):
    res = client.post(
        "/api/auth/register", json={"nickname": nickname, "password": password}
    )
    assert res.status_code == 201, res.text
    token = res.json()["token"]
    return {"authorization": f"Bearer {token}"}
