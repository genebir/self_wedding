from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..auth import current_user
from ..db import get_db

router = APIRouter(prefix="/api/posts", tags=["posts"])

# 5.5 오염 방어는 전제다 — 계정당 기여 rate limit
POSTS_PER_HOUR = 5
COMMENTS_PER_HOUR = 20


def _rate_limit(db: Session, model, user_id: int, cap: int) -> None:
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    n = db.scalar(
        select(func.count(model.id)).where(
            model.user_id == user_id, model.created_at >= since
        )
    )
    if n >= cap:
        raise HTTPException(429, "잠시 쉬어가요 — 한 시간 뒤에 다시 올릴 수 있어요")


def _card_out(c: models.PostCard | None) -> schemas.CardOut | None:
    if not c:
        return None
    return schemas.CardOut(
        category_slug=c.category_slug,
        category_name=c.category_name,
        title=c.title,
        amount=c.amount,
        scope=c.scope or [],
        vendor_name=c.vendor_name,
        region=c.region,
        paid_month=c.paid_month,
        trust_grade=c.trust_grade,
    )


def _post_out(p: models.Post, comment_count: int, me: models.User | None = None) -> schemas.PostOut:
    return schemas.PostOut(
        id=p.id,
        nickname=p.user.nickname,
        body=p.body,
        card=_card_out(p.card),
        comment_count=comment_count,
        created_at=p.created_at,
        mine=bool(me and p.user_id == me.id),
    )


def _build_card(body: schemas.CardIn, db: Session, user: models.User) -> models.PostCard:
    """공유는 스냅샷 복사다(CLAUDE.md 4장) — expense를 참조하지 않고 값을 복사한다."""
    if body.expense_id is not None:
        e = db.get(models.Expense, body.expense_id)
        if not e or e.user_id != user.id:
            raise HTTPException(404, "지출 항목을 찾을 수 없어요")
        if e.actual_amount is None:
            raise HTTPException(422, "실지출 금액이 있는 항목만 카드로 공유할 수 있어요")
        profile = db.scalar(
            select(models.Profile).where(models.Profile.user_id == user.id)
        )
        return models.PostCard(
            category_slug=e.taxonomy.slug,
            category_name=e.taxonomy.name,
            title=e.title,
            amount=e.actual_amount,
            scope=e.scope or [],
            attributes=e.attributes or {},
            vendor_name=e.vendor.name if e.vendor else None,
            region=profile.region if profile else None,
            # 시기는 월 단위로만 담는다(4장)
            paid_month=e.paid_at.strftime("%Y-%m") if e.paid_at else None,
        )
    if body.category_slug is None or body.amount is None:
        raise HTTPException(422, "카테고리와 금액은 꼭 필요해요")
    tx = db.scalar(select(models.Taxonomy).where(models.Taxonomy.slug == body.category_slug))
    if not tx:
        raise HTTPException(404, f"카테고리를 찾을 수 없어요: {body.category_slug}")
    return models.PostCard(
        category_slug=tx.slug,
        category_name=tx.name,
        title=body.title,
        amount=body.amount,
        scope=[s.model_dump() for s in body.scope],
        vendor_name=body.vendor_name,
        region=body.region,
        paid_month=body.paid_month,
    )


@router.get("", response_model=list[schemas.PostOut])
def feed(before_id: int | None = None, limit: int = 20, db: Session = Depends(get_db)):
    """피드는 가입 없이 읽는다(P7). before_id 커서로 과거 글을 이어 받는다."""
    limit = max(1, min(limit, 50))
    q = (
        select(models.Post)
        .options(joinedload(models.Post.user), joinedload(models.Post.card))
        .order_by(models.Post.id.desc())
        .limit(limit)
    )
    if before_id is not None:
        q = q.where(models.Post.id < before_id)
    posts = list(db.scalars(q).unique())
    ids = [p.id for p in posts]
    counts = dict(
        db.execute(
            select(models.Comment.post_id, func.count(models.Comment.id))
            .where(models.Comment.post_id.in_(ids))
            .group_by(models.Comment.post_id)
        ).all()
    ) if ids else {}
    return [_post_out(p, counts.get(p.id, 0)) for p in posts]


@router.post("", response_model=schemas.PostOut, status_code=201)
def create_post(
    body: schemas.PostIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(current_user),
):
    text = body.body.strip()
    if not text:
        raise HTTPException(422, "내용을 적어주세요")
    _rate_limit(db, models.Post, user.id, POSTS_PER_HOUR)
    post = models.Post(user_id=user.id, body=text)
    if body.card:
        post.card = _build_card(body.card, db, user)
    db.add(post)
    db.commit()
    db.refresh(post)
    return _post_out(post, 0, user)


@router.get("/{post_id}", response_model=schemas.PostDetailOut)
def post_detail(post_id: int, db: Session = Depends(get_db)):
    p = db.scalar(
        select(models.Post)
        .options(
            joinedload(models.Post.user),
            joinedload(models.Post.card),
            joinedload(models.Post.comments).joinedload(models.Comment.user),
        )
        .where(models.Post.id == post_id)
    )
    if not p:
        raise HTTPException(404, "글을 찾을 수 없어요")
    base = _post_out(p, len(p.comments))
    return schemas.PostDetailOut(
        **base.model_dump(),
        comments=[
            schemas.CommentOut(
                id=c.id, nickname=c.user.nickname, body=c.body, created_at=c.created_at
            )
            for c in p.comments
        ],
    )


@router.delete("/{post_id}", status_code=204)
def delete_post(
    post_id: int, db: Session = Depends(get_db), user: models.User = Depends(current_user)
):
    p = db.get(models.Post, post_id)
    if not p:
        raise HTTPException(404, "글을 찾을 수 없어요")
    if p.user_id != user.id:
        raise HTTPException(403, "내가 쓴 글만 지울 수 있어요")
    # 삭제하면 카드도 함께 사라진다 — 집계에서도 빠진다(4장)
    db.delete(p)
    db.commit()


@router.post("/{post_id}/comments", response_model=schemas.CommentOut, status_code=201)
def create_comment(
    post_id: int,
    body: schemas.CommentIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(current_user),
):
    if not db.get(models.Post, post_id):
        raise HTTPException(404, "글을 찾을 수 없어요")
    text = body.body.strip()
    if not text:
        raise HTTPException(422, "내용을 적어주세요")
    _rate_limit(db, models.Comment, user.id, COMMENTS_PER_HOUR)
    c = models.Comment(post_id=post_id, user_id=user.id, body=text)
    db.add(c)
    db.commit()
    return schemas.CommentOut(
        id=c.id, nickname=user.nickname, body=c.body, created_at=c.created_at
    )


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(
    comment_id: int, db: Session = Depends(get_db), user: models.User = Depends(current_user)
):
    c = db.get(models.Comment, comment_id)
    if not c:
        raise HTTPException(404, "댓글을 찾을 수 없어요")
    if c.user_id != user.id:
        raise HTTPException(403, "내가 쓴 댓글만 지울 수 있어요")
    db.delete(c)
    db.commit()
