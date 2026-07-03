from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/api/taxonomy", tags=["taxonomy"])


@router.get("", response_model=list[schemas.TaxonomyNode])
def taxonomy_tree(db: Session = Depends(get_db)):
    roots = db.scalars(
        select(models.Taxonomy)
        .where(models.Taxonomy.parent_id.is_(None))
        .order_by(models.Taxonomy.sort_order)
    ).all()
    return [schemas.TaxonomyNode.model_validate(r) for r in roots]
