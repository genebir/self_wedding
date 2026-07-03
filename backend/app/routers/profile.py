from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _d_day(wedding_date: date | None) -> int | None:
    return (wedding_date - date.today()).days if wedding_date else None


def _out(p: models.Profile | None) -> schemas.ProfileOut:
    if not p:
        return schemas.ProfileOut(id=0)
    return schemas.ProfileOut(
        id=p.id,
        wedding_date=p.wedding_date,
        region=p.region,
        budget_total=p.budget_total,
        d_day=_d_day(p.wedding_date),
    )


@router.get("", response_model=schemas.ProfileOut)
def get_profile(db: Session = Depends(get_db)):
    return _out(db.scalar(select(models.Profile)))


@router.put("", response_model=schemas.ProfileOut)
def put_profile(body: schemas.ProfileIn, db: Session = Depends(get_db)):
    p = db.scalar(select(models.Profile))
    if not p:
        p = models.Profile()
        db.add(p)
    old_date = p.wedding_date
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.flush()
    # 예식일이 정해지거나 바뀌면 템플릿 기반 항목의 due_date를 역산으로 재계산
    if p.wedding_date and p.wedding_date != old_date:
        from datetime import timedelta

        items = db.scalars(
            select(models.ChecklistItem).where(models.ChecklistItem.offset_days.is_not(None))
        ).all()
        for item in items:
            item.due_date = p.wedding_date - timedelta(days=item.offset_days)
    db.commit()
    db.refresh(p)
    return _out(p)
