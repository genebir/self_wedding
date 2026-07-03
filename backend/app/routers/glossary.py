from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/api/glossary", tags=["glossary"])


@router.get("", response_model=list[schemas.GlossaryOut])
def list_glossary(category: str | None = None, db: Session = Depends(get_db)):
    q = select(models.FeeGlossary).order_by(
        models.FeeGlossary.sort_order, models.FeeGlossary.id
    )
    if category:
        # 해당 카테고리 전용 + 공통 항목 — scope 체크리스트의 원천(5.6)
        q = q.where(
            or_(
                models.FeeGlossary.category_slug == category,
                models.FeeGlossary.category_slug.is_(None),
            )
        )
    return db.scalars(q).all()


@router.get("/{slug}", response_model=schemas.GlossaryOut)
def get_glossary(slug: str, db: Session = Depends(get_db)):
    row = db.scalar(select(models.FeeGlossary).where(models.FeeGlossary.slug == slug))
    if not row:
        raise HTTPException(404, "사전 항목을 찾을 수 없어요")
    return row
