from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete as sql_delete, select
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


@router.post("/password", response_model=schemas.AuthOut)
def change_password(
    body: schemas.PasswordChangeIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(current_user),
):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(403, "현재 비밀번호가 맞지 않아요")
    if len(body.new_password) < 8:
        raise HTTPException(422, "새 비밀번호는 8자 이상이어야 해요")
    user.password_hash = hash_password(body.new_password)
    user.token = issue_token()  # 기존 토큰 무효화
    db.commit()
    return schemas.AuthOut(token=user.token, nickname=user.nickname, user_id=user.id)


@router.delete("/me", status_code=204)
def delete_me(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    """철회는 기여만큼 쉬워야 한다(P4). 계정과 모든 데이터를 지운다 —
    포스트·카드·댓글(공개 기록)과 트래커·체크리스트·프로필(사적 도구) 전부."""
    posts = db.scalars(select(models.Post).where(models.Post.user_id == user.id)).all()
    for p in posts:
        db.delete(p)  # cascade: card + 그 글의 댓글
    db.execute(sql_delete(models.Comment).where(models.Comment.user_id == user.id))
    db.execute(sql_delete(models.Expense).where(models.Expense.user_id == user.id))
    db.execute(sql_delete(models.ChecklistItem).where(models.ChecklistItem.user_id == user.id))
    db.execute(sql_delete(models.Profile).where(models.Profile.user_id == user.id))
    db.delete(user)
    db.commit()
