from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..auth import current_user
from ..db import get_db

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


def _get_taxonomy(db: Session, slug: str) -> models.Taxonomy:
    tx = db.scalar(select(models.Taxonomy).where(models.Taxonomy.slug == slug))
    if not tx:
        raise HTTPException(404, f"카테고리를 찾을 수 없어요: {slug}")
    return tx


def _upsert_vendor(db: Session, name: str, region: str | None) -> models.Vendor:
    # 5.7: 업체는 선등록하지 않는다 — 사용자가 적는 순간 생성
    vendor = db.scalar(select(models.Vendor).where(models.Vendor.name == name))
    if vendor:
        if region and not vendor.region:
            vendor.region = region
        return vendor
    vendor = models.Vendor(name=name, region=region)
    db.add(vendor)
    db.flush()
    return vendor


def _to_out(e: models.Expense) -> schemas.ExpenseOut:
    return schemas.ExpenseOut(
        id=e.id,
        taxonomy_id=e.taxonomy_id,
        taxonomy_slug=e.taxonomy.slug,
        taxonomy_name=e.taxonomy.name,
        title=e.title,
        planned_amount=e.planned_amount,
        actual_amount=e.actual_amount,
        scope=e.scope or [],
        attributes=e.attributes or {},
        vendor=schemas.VendorOut.model_validate(e.vendor) if e.vendor else None,
        paid_at=e.paid_at,
        memo=e.memo,
        created_at=e.created_at,
        updated_at=e.updated_at,
    )


@router.get("", response_model=list[schemas.ExpenseOut])
def list_expenses(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    rows = db.scalars(
        select(models.Expense)
        .options(joinedload(models.Expense.taxonomy), joinedload(models.Expense.vendor))
        .where(models.Expense.user_id == user.id)
        .order_by(models.Expense.created_at.desc())
    ).all()
    return [_to_out(e) for e in rows]


@router.post("", response_model=schemas.ExpenseOut, status_code=201)
def create_expense(
    body: schemas.ExpenseIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(current_user),
):
    tx = _get_taxonomy(db, body.taxonomy_slug)
    vendor = _upsert_vendor(db, body.vendor_name.strip(), body.vendor_region) if body.vendor_name and body.vendor_name.strip() else None
    e = models.Expense(
        user_id=user.id,
        taxonomy_id=tx.id,
        title=body.title,
        planned_amount=body.planned_amount,
        actual_amount=body.actual_amount,
        scope=[s.model_dump() for s in body.scope],
        attributes=body.attributes,
        vendor_id=vendor.id if vendor else None,
        paid_at=body.paid_at,
        memo=body.memo,
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return _to_out(e)


@router.patch("/{expense_id}", response_model=schemas.ExpenseOut)
def patch_expense(
    expense_id: int,
    body: schemas.ExpensePatch,
    db: Session = Depends(get_db),
    user: models.User = Depends(current_user),
):
    e = db.get(models.Expense, expense_id)
    if not e or e.user_id != user.id:
        raise HTTPException(404, "지출 항목을 찾을 수 없어요")
    data = body.model_dump(exclude_unset=True)
    if "taxonomy_slug" in data:
        e.taxonomy_id = _get_taxonomy(db, data.pop("taxonomy_slug")).id
    if "vendor_name" in data:
        name = data.pop("vendor_name")
        region = data.pop("vendor_region", None)
        e.vendor_id = _upsert_vendor(db, name.strip(), region).id if name and name.strip() else None
    data.pop("vendor_region", None)
    if "scope" in data and data["scope"] is not None:
        data["scope"] = [s if isinstance(s, dict) else s.model_dump() for s in data["scope"]]
    for k, v in data.items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return _to_out(e)


@router.delete("/{expense_id}", status_code=204)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(current_user),
):
    e = db.get(models.Expense, expense_id)
    if not e or e.user_id != user.id:
        raise HTTPException(404, "지출 항목을 찾을 수 없어요")
    db.delete(e)
    db.commit()


@router.get("/vendor-suggest", response_model=list[str])
def vendor_suggest(
    q: str = "", db: Session = Depends(get_db), user: models.User = Depends(current_user)
):
    """업체명 자동완성 — 오타로 vendor가 갈라지는 걸 막는다(5.7 데이터 품질).
    노출 범위는 공개 카드에 등장한 업체명 + 내 지출의 업체명뿐이다.
    남의 비공개 지출에서 온 업체명은 여기로 새지 않는다."""
    public_names = select(models.PostCard.vendor_name).where(
        models.PostCard.vendor_name.is_not(None)
    )
    my_names = (
        select(models.Vendor.name)
        .join(models.Expense, models.Expense.vendor_id == models.Vendor.id)
        .where(models.Expense.user_id == user.id)
    )
    names = {n for n in db.scalars(public_names)} | {n for n in db.scalars(my_names)}
    ql = q.strip().lower()
    matched = sorted(n for n in names if ql in n.lower()) if ql else sorted(names)
    return matched[:8]


@router.get("/summary", response_model=schemas.BudgetSummary)
def budget_summary(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    profile = db.scalar(select(models.Profile).where(models.Profile.user_id == user.id))
    rows = db.execute(
        select(
            models.Taxonomy.slug,
            models.Taxonomy.name,
            func.coalesce(func.sum(models.Expense.planned_amount), 0),
            func.coalesce(func.sum(models.Expense.actual_amount), 0),
            func.count(models.Expense.id),
        )
        .join(models.Taxonomy, models.Taxonomy.id == models.Expense.taxonomy_id)
        .where(models.Expense.user_id == user.id)
        .group_by(models.Taxonomy.slug, models.Taxonomy.name, models.Taxonomy.sort_order)
        .order_by(models.Taxonomy.sort_order)
    ).all()
    by_category = [
        schemas.CategorySummary(
            taxonomy_slug=slug, taxonomy_name=name, planned=planned, actual=actual, count=count
        )
        for slug, name, planned, actual, count in rows
    ]
    return schemas.BudgetSummary(
        budget_total=profile.budget_total if profile else None,
        planned_total=sum(c.planned for c in by_category),
        actual_total=sum(c.actual for c in by_category),
        by_category=by_category,
    )
