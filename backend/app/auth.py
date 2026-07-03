import hashlib
import secrets

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from .db import get_db

_ITERATIONS = 200_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _ITERATIONS)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, expected = stored.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), _ITERATIONS)
    return secrets.compare_digest(digest.hex(), expected)


def issue_token() -> str:
    return secrets.token_hex(32)


def _user_from_header(authorization: str | None, db: Session) -> models.User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return None
    return db.scalar(select(models.User).where(models.User.token == token))


def current_user(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> models.User:
    user = _user_from_header(authorization, db)
    if not user:
        raise HTTPException(401, "로그인이 필요해요")
    return user


def optional_user(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> models.User | None:
    """피드·사전은 가입 없이 읽는다(리트머스 2장) — 읽기 경로용."""
    return _user_from_header(authorization, db)
