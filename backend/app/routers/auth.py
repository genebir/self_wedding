from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import current_user, hash_password, issue_token, verify_password
from ..db import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.AuthOut, status_code=201)
def register(body: schemas.AuthIn, db: Session = Depends(get_db)):
    nickname = body.nickname.strip()
    if not (2 <= len(nickname) <= 32):
        raise HTTPException(422, "닉네임은 2~32자로 지어주세요")
    if len(body.password) < 8:
        raise HTTPException(422, "비밀번호는 8자 이상이어야 해요")
    if db.scalar(select(models.User).where(models.User.nickname == nickname)):
        raise HTTPException(409, "이미 쓰이고 있는 닉네임이에요")
    user = models.User(
        nickname=nickname, password_hash=hash_password(body.password), token=issue_token()
    )
    db.add(user)
    db.commit()
    return schemas.AuthOut(token=user.token, nickname=user.nickname, user_id=user.id)


@router.post("/login", response_model=schemas.AuthOut)
def login(body: schemas.AuthIn, db: Session = Depends(get_db)):
    user = db.scalar(select(models.User).where(models.User.nickname == body.nickname.strip()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "닉네임 또는 비밀번호가 맞지 않아요")
    user.token = issue_token()
    db.commit()
    return schemas.AuthOut(token=user.token, nickname=user.nickname, user_id=user.id)


@router.get("/me", response_model=schemas.MeOut)
def me(user: models.User = Depends(current_user)):
    return schemas.MeOut(user_id=user.id, nickname=user.nickname)
