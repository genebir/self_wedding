from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ScopeStatus = Literal["included", "excluded", "unknown"]


class ScopeEntry(BaseModel):
    key: str
    label: str
    status: ScopeStatus = "unknown"


class TaxonomyNode(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    sort_order: int
    children: list["TaxonomyNode"] = []


class VendorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    region: str | None = None


class ExpenseIn(BaseModel):
    taxonomy_slug: str
    title: str | None = None
    planned_amount: int | None = Field(default=None, ge=0)
    actual_amount: int | None = Field(default=None, ge=0)
    scope: list[ScopeEntry] = []
    attributes: dict = {}
    vendor_name: str | None = None  # 입력 시 vendor upsert
    vendor_region: str | None = None
    paid_at: date | None = None
    memo: str | None = None


class ExpensePatch(BaseModel):
    taxonomy_slug: str | None = None
    title: str | None = None
    planned_amount: int | None = Field(default=None, ge=0)
    actual_amount: int | None = Field(default=None, ge=0)
    scope: list[ScopeEntry] | None = None
    attributes: dict | None = None
    vendor_name: str | None = None
    vendor_region: str | None = None
    paid_at: date | None = None
    memo: str | None = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    taxonomy_id: int
    taxonomy_slug: str
    taxonomy_name: str
    title: str | None
    planned_amount: int | None
    actual_amount: int | None
    scope: list[ScopeEntry]
    attributes: dict
    vendor: VendorOut | None
    paid_at: date | None
    memo: str | None
    created_at: datetime
    updated_at: datetime


class CategorySummary(BaseModel):
    taxonomy_slug: str
    taxonomy_name: str
    planned: int
    actual: int
    count: int


class BudgetSummary(BaseModel):
    budget_total: int | None
    planned_total: int
    actual_total: int
    by_category: list[CategorySummary]


class GlossaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    category_slug: str | None
    summary: str
    detail: str
    typical_note: str | None
    ask_vendor: str | None


class ChecklistItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    category_slug: str | None
    due_date: date | None
    d_day: int | None  # 오늘 기준 남은 일수
    done: bool


class ChecklistItemIn(BaseModel):
    title: str
    description: str | None = None
    category_slug: str | None = None
    due_date: date | None = None


class ChecklistPatch(BaseModel):
    done: bool | None = None
    title: str | None = None
    due_date: date | None = None


class ProfileIn(BaseModel):
    wedding_date: date | None = None
    region: str | None = None
    budget_total: int | None = Field(default=None, ge=0)


class ProfileOut(ProfileIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    d_day: int | None = None


class AuthIn(BaseModel):
    nickname: str
    password: str


class AuthOut(BaseModel):
    token: str
    nickname: str
    user_id: int


class MeOut(BaseModel):
    user_id: int
    nickname: str


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str


class CardIn(BaseModel):
    """expense_id로 트래커 항목을 스냅샷하거나, 필드를 직접 적는다."""

    expense_id: int | None = None
    category_slug: str | None = None
    title: str | None = None
    amount: int | None = Field(default=None, ge=0)
    scope: list[ScopeEntry] = []
    vendor_name: str | None = None
    region: str | None = None
    paid_month: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$")


class CardOut(BaseModel):
    category_slug: str
    category_name: str
    title: str | None
    amount: int
    scope: list[ScopeEntry]
    vendor_name: str | None
    region: str | None
    paid_month: str | None
    trust_grade: str


class PostIn(BaseModel):
    body: str
    card: CardIn | None = None


class PostOut(BaseModel):
    id: int
    nickname: str
    body: str
    card: CardOut | None
    comment_count: int
    created_at: datetime
    mine: bool = False


class CommentIn(BaseModel):
    body: str


class CommentOut(BaseModel):
    id: int
    nickname: str
    body: str
    created_at: datetime


class PostDetailOut(PostOut):
    comments: list[CommentOut] = []
