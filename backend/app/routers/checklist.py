from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import current_user
from ..db import get_db

router = APIRouter(prefix="/api/checklist", tags=["checklist"])


def _out(item: models.ChecklistItem) -> schemas.ChecklistItemOut:
    d_day = (item.due_date - date.today()).days if item.due_date else None
    return schemas.ChecklistItemOut(
        id=item.id,
        title=item.title,
        description=item.description,
        category_slug=item.category_slug,
        due_date=item.due_date,
        d_day=d_day,
        done=item.done,
    )


def _items(db: Session, user_id: int) -> list[schemas.ChecklistItemOut]:
    rows = db.scalars(
        select(models.ChecklistItem)
        .where(models.ChecklistItem.user_id == user_id)
        .order_by(models.ChecklistItem.due_date.asc().nulls_last(), models.ChecklistItem.id)
    ).all()
    return [_out(i) for i in rows]


@router.get("", response_model=list[schemas.ChecklistItemOut])
def list_items(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    return _items(db, user.id)


@router.post("/generate", response_model=list[schemas.ChecklistItemOut])
def generate_from_template(
    db: Session = Depends(get_db), user: models.User = Depends(current_user)
):
    """예식일 기준 역산으로 템플릿에서 체크리스트 생성. 이미 생성된 템플릿 항목은 건너뛴다."""
    profile = db.scalar(select(models.Profile).where(models.Profile.user_id == user.id))
    if not profile or not profile.wedding_date:
        raise HTTPException(409, "먼저 예식일을 입력해 주세요")
    existing = {
        i.template_id
        for i in db.scalars(
            select(models.ChecklistItem).where(
                models.ChecklistItem.user_id == user.id,
                models.ChecklistItem.template_id.is_not(None),
            )
        )
    }
    templates = db.scalars(
        select(models.ChecklistTemplate).order_by(
            models.ChecklistTemplate.offset_days.desc(), models.ChecklistTemplate.sort_order
        )
    ).all()
    for t in templates:
        if t.id in existing:
            continue
        db.add(
            models.ChecklistItem(
                user_id=user.id,
                template_id=t.id,
                title=t.title,
                description=t.description,
                category_slug=t.category_slug,
                offset_days=t.offset_days,
                due_date=profile.wedding_date - timedelta(days=t.offset_days),
            )
        )
    db.commit()
    return _items(db, user.id)


@router.post("", response_model=schemas.ChecklistItemOut, status_code=201)
def create_item(
    body: schemas.ChecklistItemIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(current_user),
):
    item = models.ChecklistItem(user_id=user.id, **body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _out(item)


@router.patch("/{item_id}", response_model=schemas.ChecklistItemOut)
def patch_item(
    item_id: int,
    body: schemas.ChecklistPatch,
    db: Session = Depends(get_db),
    user: models.User = Depends(current_user),
):
    item = db.get(models.ChecklistItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "체크리스트 항목을 찾을 수 없어요")
    data = body.model_dump(exclude_unset=True)
    if "done" in data:
        item.done = data.pop("done")
        item.done_at = datetime.now(timezone.utc) if item.done else None
    for k, v in data.items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return _out(item)


@router.delete("/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(current_user),
):
    item = db.get(models.ChecklistItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "체크리스트 항목을 찾을 수 없어요")
    db.delete(item)
    db.commit()
