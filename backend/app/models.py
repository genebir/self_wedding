"""v3 데이터 모델 — 커뮤니티 코어 + 개인 도구.

CLAUDE.md 원칙:
- expense(사적 도구)와 post_card(공적 기록)는 물리적으로 분리. 공유는 스냅샷 복사(4장).
- vendor는 upsert-only — 실데이터에서만 생성된다.
- scope는 1급 필드(5.6). fee_glossary가 scope 체크리스트의 원천.
- user는 닉네임 기반, 실명·연락처 없음(5.9). 카드의 시기=월, 지역=광역 단위(4장).
"""
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True)
    nickname: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    token: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Post(Base):
    __tablename__ = "post"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship()
    card: Mapped["PostCard | None"] = relationship(
        back_populates="post", cascade="all, delete-orphan", uselist=False
    )
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="post", cascade="all, delete-orphan", order_by="Comment.created_at"
    )


class PostCard(Base):
    """공유 시점의 스냅샷. expense를 참조하지 않고 값을 복사한다(4장 — 물리적 분리)."""

    __tablename__ = "post_card"

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("post.id"), unique=True)
    category_slug: Mapped[str] = mapped_column(String(64), index=True)
    category_name: Mapped[str] = mapped_column(String(128))
    title: Mapped[str | None] = mapped_column(String(256))
    amount: Mapped[int] = mapped_column(Integer)  # 원(KRW)
    scope: Mapped[list] = mapped_column(JSONB, default=list)
    attributes: Mapped[dict] = mapped_column(JSONB, default=dict)
    vendor_name: Mapped[str | None] = mapped_column(String(128))
    region: Mapped[str | None] = mapped_column(String(64))  # 광역 단위
    paid_month: Mapped[str | None] = mapped_column(String(7))  # "2026-07" — 월 단위
    trust_grade: Mapped[str] = mapped_column(String(1), default="B")  # 5.4

    post: Mapped[Post] = relationship(back_populates="card")


class Comment(Base):
    __tablename__ = "comment"

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("post.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    post: Mapped[Post] = relationship(back_populates="comments")
    user: Mapped[User] = relationship()


class Taxonomy(Base):
    __tablename__ = "taxonomy"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("taxonomy.id"))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)

    children: Mapped[list["Taxonomy"]] = relationship(order_by="Taxonomy.sort_order")


class Vendor(Base):
    __tablename__ = "vendor"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    region: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Expense(Base):
    """예산 트래커 항목 — 사용자 소유, 기본 비공개. 카드의 원재료."""

    __tablename__ = "expense"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True)
    taxonomy_id: Mapped[int] = mapped_column(ForeignKey("taxonomy.id"), index=True)
    title: Mapped[str | None] = mapped_column(String(256))
    planned_amount: Mapped[int | None] = mapped_column(Integer)  # 원(KRW)
    actual_amount: Mapped[int | None] = mapped_column(Integer)
    # [{key, label, status: included|excluded|unknown}] — 기본값은 unknown(미확인)
    scope: Mapped[list] = mapped_column(JSONB, default=list)
    attributes: Mapped[dict] = mapped_column(JSONB, default=dict)
    vendor_id: Mapped[int | None] = mapped_column(ForeignKey("vendor.id"))
    paid_at: Mapped[date | None] = mapped_column(Date)
    memo: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    taxonomy: Mapped[Taxonomy] = relationship()
    vendor: Mapped[Vendor | None] = relationship()


class FeeGlossary(Base):
    __tablename__ = "fee_glossary"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    # 적용 카테고리 slug. None이면 공통.
    category_slug: Mapped[str | None] = mapped_column(String(64), index=True)
    summary: Mapped[str] = mapped_column(String(256))
    detail: Mapped[str] = mapped_column(Text)
    # "회당 20~30만원" 같은 참고 범위. 표본 기반이 아니므로 분포처럼 보이게 쓰지 않는다.
    typical_note: Mapped[str | None] = mapped_column(String(128))
    ask_vendor: Mapped[str | None] = mapped_column(String(256))  # 업체에 물어볼 질문
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class ChecklistTemplate(Base):
    __tablename__ = "checklist_template"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(256))
    description: Mapped[str | None] = mapped_column(Text)
    category_slug: Mapped[str | None] = mapped_column(String(64))
    offset_days: Mapped[int] = mapped_column(Integer)  # 예식일 D-n (음수는 D+n)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class ChecklistItem(Base):
    __tablename__ = "checklist_item"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("checklist_template.id"))
    title: Mapped[str] = mapped_column(String(256))
    description: Mapped[str | None] = mapped_column(Text)
    category_slug: Mapped[str | None] = mapped_column(String(64))
    offset_days: Mapped[int | None] = mapped_column(Integer)
    due_date: Mapped[date | None] = mapped_column(Date)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Profile(Base):
    """사용자별 1행. 예식일이 체크리스트 역산의 기준."""

    __tablename__ = "profile"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), unique=True, index=True)
    wedding_date: Mapped[date | None] = mapped_column(Date)
    region: Mapped[str | None] = mapped_column(String(64))
    budget_total: Mapped[int | None] = mapped_column(Integer)
