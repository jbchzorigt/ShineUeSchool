# Дугуйлангийн бүртгэл — хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Менежер ээлж тутамд 1–12-р ангийн дугуйлангуудыг (анги, багтаамж, тайлбар, зураг, хугацаа, төлбөр) зарлаж, сурагч `@shineue.edu.mn` имэйлээ 6 оронтой кодоор баталгаажуулан нэг ээлжид нэг дугуйланд бүртгүүлдэг систем.

**Architecture:** Backend-д шинэ `app/clubs/` модуль (models, schemas, service, mailer, export, router_public, router_admin) + migration 0008. Имэйл баталгаажуулалт: код → 15 минутын JWT (`scope=club-reg`) → форм + token → бүртгэл шууд `confirmed`; слот, хугацаа, давхардлыг нэг transaction-д `SELECT … FOR UPDATE`-аар шалгана. Frontend: олон нийтийн `/clubs` (server fetch + client компонентууд, 3 алхамт диалог), менежерийн `/admin/clubs` ба `/admin/clubs/[id]`.

**Tech Stack:** FastAPI, SQLAlchemy 2 async (asyncpg), Alembic, pydantic v2, PyJWT, smtplib, openpyxl; Next.js 16 App Router, React 19, Tailwind v4, `@/components/ui`, `useFetch`, `ApiError.fieldErrors`.

**Spec:** `docs/superpowers/specs/2026-09-21-clubs-registration-design.md`

## Global Constraints

- **Commit хийхгүй.** Task бүрийн төгсгөлд `git add` (staging) хийнэ; commit/push нь хэрэглэгч local тест дууссаны дараа.
- Backend тест: `cd backend && uv run pytest tests/test_clubs_public.py tests/test_clubs_admin.py -q` (`PYTHONIOENCODING=utf-8`). Бүх suite: `uv run pytest -q` (одоо 108 тест, бүгд ногоон байх ёстой).
- Frontend: `cd frontend && npx tsc --noEmit && node node_modules/eslint/bin/eslint.js src` (`npx eslint` segfault хийдэг — `node node_modules/eslint/bin/eslint.js` ашиглана).
- Windows Git Bash: урт heredoc алдаа өгвөл Write tool ашиглана.
- Алдааны формат: 400 `{талбар: [мессеж]}` (`FieldError`), бусад `{"detail": ...}` (`HTTPException`). Мессежүүд spec §4-өөс үгчлэн.
- Имэйл домэйн `settings.club_email_domain` = `"shineue.edu.mn"`; код 6 орон, `club_code_ttl_minutes=10`; token `club_token_ttl_minutes=15`; кодын хязгаар 1 цагт 3; буруу оролдлого 5.
- Бүх DateTime `timezone=True`, серверт `datetime.now(UTC)`.
- Media: `save_upload(image, "clubs")`, URL `_media_url` (олимпиадынхтай ижил логик: `settings.media_base_url` эсвэл `request.base_url`).
- Admin endpoint бүр `require_role("manager")` (superuser ч орно).
- Монгол хэлээр тайлбар, UI текст; кодын коммент монголоор (одоогийн кодын хэв маяг).

## Файлын бүтэц

Backend (`backend/`):
- `app/clubs/__init__.py` — хоосон.
- `app/clubs/models.py` — `ClubRound`, `Club`, `ClubImage`, `ClubRegistration`, `EmailCode`.
- `app/clubs/schemas.py` — pydantic in/out схемүүд.
- `app/clubs/service.py` — `normalize_email`, `check_domain`, `hash_code`, `create_reg_token`/`decode_reg_token`, `club_state`, `taken_counts`, `active_round`, `find_confirmed`, `club_out`/`club_admin_out`, `media_url`.
- `app/clubs/mailer.py` — `MailError`, `send_code(email, code)`.
- `app/clubs/export.py` — `build_registrations_xlsx(rows) -> bytes`.
- `app/clubs/router_public.py` — `GET /api/clubs/`, `POST /api/clubs/email/send/`, `POST /api/clubs/email/verify/`, `POST /api/clubs/registrations/`.
- `app/clubs/router_admin.py` — `/api/clubs/admin/...`.
- `alembic/versions/0008_clubs.py`; `app/models_all.py`, `app/main.py`, `app/config.py`, `.env.example`, `pyproject.toml`.
- `tests/helpers.py` (`seed_clubs`), `tests/conftest.py` (`sent_codes` fixture), `tests/test_clubs_public.py`, `tests/test_clubs_admin.py`.

Frontend (`frontend/src/`):
- `lib/types.ts` (Club төрлүүд), `lib/api.ts` (`api.clubs`, `api.clubsAdmin`), `lib/clubs-api.ts` (server fetch).
- `components/clubs/format.ts` — `formatGrades`, `formatFee`, `formatPeriod`, `STATE_LABEL`, `STATE_TONE`, `EMAIL_DOMAIN`.
- `components/clubs/{ClubsPage, GradePicker, ClubCard, ClubGallery, RegisterDialog}.tsx`; `app/clubs/page.tsx`.
- `components/admin/clubs/{datetime.ts, RoundBar, ClubTable, ClubForm, ImagesPanel, RegistrationsTable}.tsx`; `app/admin/(dashboard)/clubs/page.tsx`, `app/admin/(dashboard)/clubs/[id]/page.tsx`; `app/admin/(dashboard)/layout.tsx` (NAV).
- `lib/home-data.ts` (NAV_LINKS), `components/home/SiteFooter.tsx`; `README.md`.

---

### Task 1: Backend суурь — тохиргоо, модель, migration, mailer

**Files:**
- Create: `backend/app/clubs/__init__.py`, `backend/app/clubs/models.py`, `backend/app/clubs/mailer.py`, `backend/alembic/versions/0008_clubs.py`
- Modify: `backend/app/config.py`, `backend/app/models_all.py`, `backend/.env.example`, `backend/pyproject.toml`
- Test: `backend/tests/test_clubs_public.py` (mailer тестүүд эндээс эхэлнэ)

**Interfaces:**
- Produces: models `ClubRound(id, name, is_active, created_at, clubs)`, `Club(id, round_id, name, description, grades: list[int], capacity, is_paid, fee, fee_note, registration_start, registration_end, is_published, order, created_at, round, images)`, `ClubImage(id, club_id, file, order)`, `ClubRegistration(id, club_id, round_id, email, student_last_name, student_first_name, guardian_last_name, guardian_first_name, phone, grade, status, is_paid_marked, removed_at, created_at, club)`, `EmailCode(id, email, code_hash, expires_at, attempts, sent_count, first_sent_at, created_at)`; `mailer.MailError`, `async mailer.send_code(email: str, code: str) -> None`; settings `smtp_host, smtp_port, smtp_user, smtp_password, smtp_from, smtp_tls, club_email_domain, club_code_ttl_minutes, club_token_ttl_minutes`, `settings.mail_enabled`.

- [ ] **Step 1: Тохиргоо нэмэх**

`backend/app/config.py`-д `media_base_url: str = ""` мөрийн дараа:

```python
    # Имэйл (дугуйлангийн бүртгэлийн код). smtp_host, smtp_from хоосон бол код серверийн логт хэвлэгдэнэ.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_tls: bool = True
    # Дугуйлангийн бүртгэл
    club_email_domain: str = "shineue.edu.mn"
    club_code_ttl_minutes: int = 10
    club_token_ttl_minutes: int = 15
```

`fb_enabled` property-ийн дараа:

```python
    @property
    def mail_enabled(self) -> bool:
        return bool(self.smtp_host and self.smtp_from)
```

`backend/.env.example` төгсгөлд:

```
# SMTP (дугуйлангийн бүртгэлийн баталгаажуулах код). SMTP_HOST, SMTP_FROM хоосон бол код
# серверийн логт хэвлэгдэнэ (хөгжүүлэлт). Brevo/Mailgun г.м. SMTP relay-ийн мэдээллийг бичнэ.
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_TLS=true
# Дугуйланд бүртгүүлэх имэйлийн домэйн
CLUB_EMAIL_DOMAIN=shineue.edu.mn
```

`backend/pyproject.toml`: `"reportlab>=4.2",` мөрийн дараа `"openpyxl>=3.1",` нэмж, `dev` бүлгээс `"openpyxl>=3.1",` мөрийг хасна. Дараа нь `cd backend && uv sync` ажиллуулна.

- [ ] **Step 2: Модель бичих**

`backend/app/clubs/__init__.py` хоосон. `backend/app/clubs/models.py`:

```python
"""Дугуйлан: ээлж, дугуйлан, зураг, бүртгэл, имэйлийн баталгаажуулах код."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base

REG_CONFIRMED = "confirmed"
REG_REMOVED = "removed"


class ClubRound(Base):
    """Бүртгэлийн ээлж (улирал). Нэг л ээлж идэвхтэй."""

    __tablename__ = "club_rounds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    clubs: Mapped[list["Club"]] = relationship(back_populates="round", order_by="Club.order, Club.id")


class Club(Base):
    __tablename__ = "clubs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    round_id: Mapped[int] = mapped_column(ForeignKey("club_rounds.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    grades: Mapped[list[int]] = mapped_column(ARRAY(Integer))   # 1..12, эрэмбэлсэн
    capacity: Mapped[int] = mapped_column(Integer)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    fee: Mapped[int] = mapped_column(Integer, default=0)          # ₮
    fee_note: Mapped[str] = mapped_column(String(120), default="")
    registration_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    registration_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    round: Mapped[ClubRound] = relationship(back_populates="clubs", lazy="selectin")
    images: Mapped[list["ClubImage"]] = relationship(back_populates="club", cascade="all, delete-orphan",
                                                     order_by="ClubImage.order, ClubImage.id", lazy="selectin")


class ClubImage(Base):
    __tablename__ = "club_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id", ondelete="CASCADE"), index=True)
    file: Mapped[str] = mapped_column(String(255))
    order: Mapped[int] = mapped_column(Integer, default=0)

    club: Mapped[Club] = relationship(back_populates="images")


class ClubRegistration(Base):
    __tablename__ = "club_registrations"
    __table_args__ = (
        Index("uq_club_reg_round_email", "round_id", "email", unique=True,
              postgresql_where=text("status = 'confirmed'")),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id", ondelete="RESTRICT"), index=True)
    round_id: Mapped[int] = mapped_column(ForeignKey("club_rounds.id", ondelete="RESTRICT"), index=True)
    email: Mapped[str] = mapped_column(String(254))
    student_last_name: Mapped[str] = mapped_column(String(80))
    student_first_name: Mapped[str] = mapped_column(String(80))
    guardian_last_name: Mapped[str] = mapped_column(String(80))
    guardian_first_name: Mapped[str] = mapped_column(String(80))
    phone: Mapped[str] = mapped_column(String(30))
    grade: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(12), default=REG_CONFIRMED)
    is_paid_marked: Mapped[bool] = mapped_column(Boolean, default=False)
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    club: Mapped[Club] = relationship(lazy="selectin")


class EmailCode(Base):
    """Нэг хаягт нэг мөр: хамгийн сүүлийн код л хүчинтэй."""

    __tablename__ = "email_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    code_hash: Mapped[str] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    sent_count: Mapped[int] = mapped_column(Integer, default=1)
    first_sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

`backend/app/models_all.py` төгсгөлд: `from .clubs import models as clubs_models  # noqa: F401`.

- [ ] **Step 3: Migration**

`backend/alembic/versions/0008_clubs.py`:

```python
"""clubs: rounds, clubs, images, registrations, email codes

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "club_rounds",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "clubs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("round_id", sa.Integer, sa.ForeignKey("club_rounds.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("grades", ARRAY(sa.Integer), nullable=False),
        sa.Column("capacity", sa.Integer, nullable=False),
        sa.Column("is_paid", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("fee", sa.Integer, nullable=False, server_default="0"),
        sa.Column("fee_note", sa.String(120), nullable=False, server_default=""),
        sa.Column("registration_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("registration_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_published", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "club_images",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("club_id", sa.Integer, sa.ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("file", sa.String(255), nullable=False),
        sa.Column("order", sa.Integer, nullable=False, server_default="0"),
    )
    op.create_table(
        "club_registrations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("club_id", sa.Integer, sa.ForeignKey("clubs.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("round_id", sa.Integer, sa.ForeignKey("club_rounds.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("student_last_name", sa.String(80), nullable=False),
        sa.Column("student_first_name", sa.String(80), nullable=False),
        sa.Column("guardian_last_name", sa.String(80), nullable=False),
        sa.Column("guardian_first_name", sa.String(80), nullable=False),
        sa.Column("phone", sa.String(30), nullable=False),
        sa.Column("grade", sa.Integer, nullable=False),
        sa.Column("status", sa.String(12), nullable=False, server_default="confirmed"),
        sa.Column("is_paid_marked", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_club_reg_round_email", "club_registrations", ["round_id", "email"], unique=True,
                    postgresql_where=sa.text("status = 'confirmed'"))
    op.create_table(
        "email_codes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("code_hash", sa.String(128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer, nullable=False, server_default="0"),
        sa.Column("sent_count", sa.Integer, nullable=False, server_default="1"),
        sa.Column("first_sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("email_codes")
    op.drop_index("uq_club_reg_round_email", table_name="club_registrations")
    op.drop_table("club_registrations")
    op.drop_table("club_images")
    op.drop_table("clubs")
    op.drop_table("club_rounds")
```

Run: `cd backend && uv run alembic upgrade head` → Expected: `Running upgrade 0007 -> 0008`. Мөн `uv run alembic check` (эсвэл `alembic revision --autogenerate` хийж хоосон эсэхийг харж устгана) → модель ба migration зөрөхгүй.

- [ ] **Step 4: Mailer-ийн тест бичих**

`backend/tests/test_clubs_public.py` (шинэ):

```python
"""Дугуйлан: mailer, олон нийтийн жагсаалт, код, бүртгэл."""

import logging

import pytest

from app.clubs import mailer


async def test_send_code_logs_when_smtp_not_configured(monkeypatch, caplog):
    from app.config import settings
    monkeypatch.setattr(settings, "smtp_host", "")
    with caplog.at_level(logging.WARNING, logger="app.clubs.mailer"):
        await mailer.send_code("bat@shineue.edu.mn", "123456")
    assert "123456" in caplog.text and "bat@shineue.edu.mn" in caplog.text


async def test_send_code_uses_smtp(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(settings, "smtp_from", "noreply@shineue.edu.mn")
    monkeypatch.setattr(settings, "smtp_user", "u")
    monkeypatch.setattr(settings, "smtp_password", "p")
    calls: list = []

    class FakeSMTP:
        def __init__(self, host, port, timeout=None): calls.append(("connect", host, port))
        def __enter__(self): return self
        def __exit__(self, *a): calls.append(("quit",))
        def starttls(self): calls.append(("tls",))
        def login(self, u, p): calls.append(("login", u, p))
        def send_message(self, msg): calls.append(("send", msg["To"], msg["From"], msg.get_content()))

    monkeypatch.setattr(mailer.smtplib, "SMTP", FakeSMTP)
    await mailer.send_code("bat@shineue.edu.mn", "654321")
    assert calls[0] == ("connect", "smtp.example.com", 587) and ("tls",) in calls and ("login", "u", "p") in calls
    sent = next(c for c in calls if c[0] == "send")
    assert sent[1] == "bat@shineue.edu.mn" and sent[2] == "noreply@shineue.edu.mn" and "654321" in sent[3]


async def test_send_code_smtp_failure_raises(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(settings, "smtp_from", "noreply@shineue.edu.mn")

    class Broken:
        def __init__(self, *a, **k): raise OSError("connection refused")

    monkeypatch.setattr(mailer.smtplib, "SMTP", Broken)
    with pytest.raises(mailer.MailError):
        await mailer.send_code("bat@shineue.edu.mn", "111111")
```

Run: `cd backend && uv run pytest tests/test_clubs_public.py -q` → Expected: FAIL (`ModuleNotFoundError: app.clubs.mailer`).

- [ ] **Step 5: Mailer бичих**

`backend/app/clubs/mailer.py`:

```python
"""Баталгаажуулах кодыг имэйлээр илгээх. SMTP тохиргоогүй бол кодыг логт хэвлэнэ (хөгжүүлэлт)."""

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from ..config import settings

logger = logging.getLogger(__name__)

SUBJECT = "Шинэ Үе — дугуйлангийн бүртгэлийн код"


class MailError(Exception):
    pass


def _build(email: str, code: str) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = SUBJECT
    msg["From"] = settings.smtp_from
    msg["To"] = email
    msg.set_content(
        f"Таны баталгаажуулах код: {code}\n\n"
        f"Код {settings.club_code_ttl_minutes} минутын дотор хүчинтэй.\n"
        "Та бүртгүүлээгүй бол энэ захидлыг үл тоомсорлоно уу.\n\n"
        "Шинэ Үе сургууль"
    )
    return msg


def _send_sync(msg: EmailMessage) -> None:
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as s:
        if settings.smtp_tls:
            s.starttls()
        if settings.smtp_user:
            s.login(settings.smtp_user, settings.smtp_password)
        s.send_message(msg)


async def send_code(email: str, code: str) -> None:
    """Илгээж чадахгүй бол MailError. SMTP тохиргоогүй бол зөвхөн логт хэвлэнэ."""
    if not settings.mail_enabled:
        logger.warning("Дугуйлангийн код (SMTP тохиргоогүй): %s → %s", email, code)
        return
    try:
        await asyncio.to_thread(_send_sync, _build(email, code))
    except (OSError, smtplib.SMTPException) as e:
        logger.error("Имэйл илгээж чадсангүй (%s): %s", email, e)
        raise MailError(str(e)) from e
```

- [ ] **Step 6: Тест ажиллуулах**

Run: `cd backend && uv run pytest tests/test_clubs_public.py -q` → Expected: 3 passed. `uv run pytest -q` → бүх тест ногоон (хүснэгтүүд `create_all`-оор үүснэ).

- [ ] **Step 7: Stage**

```bash
git add backend/app/clubs backend/alembic/versions/0008_clubs.py backend/app/config.py backend/app/models_all.py backend/.env.example backend/pyproject.toml backend/uv.lock backend/tests/test_clubs_public.py
```

---

### Task 2: Service + олон нийтийн жагсаалт `GET /api/clubs/`

**Files:**
- Create: `backend/app/clubs/service.py`, `backend/app/clubs/schemas.py`, `backend/app/clubs/router_public.py`
- Modify: `backend/app/main.py`, `backend/tests/helpers.py`, `backend/tests/test_clubs_public.py`

**Interfaces:**
- Consumes: Task 1 models.
- Produces: `service.normalize_email(s) -> str`, `service.check_domain(email) -> bool`, `service.hash_code(email, code) -> str`, `service.create_reg_token(email) -> str`, `service.decode_reg_token(token) -> str` (алдаанд `HTTPException(401)`), `service.club_state(club, taken, now) -> str`, `async service.taken_counts(db, club_ids) -> dict[int, int]`, `async service.active_round(db) -> ClubRound | None`, `async service.find_confirmed(db, round_id, email) -> ClubRegistration | None`, `service.media_url(request, rel) -> str`, `service.club_out(request, club, taken, now) -> ClubOut`, `service.club_admin_out(request, club, taken, now) -> ClubAdminOut`; schemas `ImageOut, ClubOut, ClubAdminOut, RoundRef, ClubsResponse`; `tests.helpers.seed_clubs(db) -> SimpleNamespace(round_id, chess_id, robot_id, song_id, draw_id, hidden_id)`; `router_public.router`.

- [ ] **Step 1: seed_clubs туслах**

`backend/tests/helpers.py` төгсгөлд:

```python
async def seed_clubs(db):
    """
    Дугуйлангийн тестийн суурь (flush хийнэ). Идэвхтэй ээлж "2026–2027 намар":
      chess  "Шатар"  grades 5–8, capacity 2, нээлттэй (start -1 өдөр, end +7 өдөр), үнэгүй
      robot  "Робот"  grades 9–10, capacity 1, нээлттэй, төлбөртэй 150000 "сард"
      song   "Дуу"    grades 1–3,  capacity 5, удахгүй (start +1 өдөр)
      draw   "Зураг"  grades 5,    capacity 5, хаагдсан (end -1 цаг)
      hidden "Нууц"   grades 5,    capacity 5, нээлттэй боловч нийтлэгдээгүй
    Буцаана: SimpleNamespace(round_id, chess_id, robot_id, song_id, draw_id, hidden_id) — зөвхөн int
    (handler rollback хийвэл ORM объект хуучирдаг тул).
    """
    from datetime import UTC, datetime, timedelta
    from types import SimpleNamespace

    from app.clubs.models import Club, ClubRound

    now = datetime.now(UTC)
    rnd = ClubRound(name="2026–2027 намар", is_active=True)
    db.add(rnd)
    await db.flush()

    def mk(name, grades, capacity, *, start=-1, end=7, published=True, paid=False, fee=0, note="", order=0):
        return Club(round_id=rnd.id, name=name, description=f"{name} дугуйлан", grades=grades, capacity=capacity,
                    is_paid=paid, fee=fee, fee_note=note, registration_start=now + timedelta(days=start),
                    registration_end=now + timedelta(days=end), is_published=published, order=order)

    chess = mk("Шатар", [5, 6, 7, 8], 2, order=1)
    robot = mk("Робот", [9, 10], 1, paid=True, fee=150000, note="сард", order=2)
    song = mk("Дуу", [1, 2, 3], 5, start=1, order=3)
    draw = mk("Зураг", [5], 5, end=-1 / 24, order=4)
    hidden = mk("Нууц", [5], 5, published=False, order=5)
    db.add_all([chess, robot, song, draw, hidden])
    await db.flush()
    return SimpleNamespace(round_id=rnd.id, chess_id=chess.id, robot_id=robot.id, song_id=song.id,
                           draw_id=draw.id, hidden_id=hidden.id)
```

- [ ] **Step 2: Жагсаалтын тест бичих**

`backend/tests/test_clubs_public.py` төгсгөлд:

```python
from tests.helpers import seed_clubs


async def test_public_list_filters_and_state(client, db):
    s = await seed_clubs(db)
    r = await client.get("/api/clubs/")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["round"]["name"] == "2026–2027 намар"
    names = [c["name"] for c in body["clubs"]]
    assert names == ["Шатар", "Робот", "Дуу", "Зураг"]          # order-оор, нийтлэгдээгүй "Нууц" байхгүй
    by = {c["name"]: c for c in body["clubs"]}
    assert by["Шатар"]["state"] == "open" and by["Шатар"]["slots_left"] == 2 and by["Шатар"]["taken"] == 0
    assert by["Дуу"]["state"] == "upcoming" and by["Зураг"]["state"] == "closed"
    assert by["Робот"]["is_paid"] and by["Робот"]["fee"] == 150000 and by["Робот"]["fee_note"] == "сард"
    assert by["Шатар"]["grades"] == [5, 6, 7, 8] and by["Шатар"]["images"] == []

    r = await client.get("/api/clubs/?grade=5")
    assert [c["name"] for c in r.json()["clubs"]] == ["Шатар", "Зураг"]
    r = await client.get("/api/clubs/?grade=12")
    assert r.json()["clubs"] == [] and r.json()["round"]["id"] == s.round_id


async def test_public_list_no_active_round(client, db):
    r = await client.get("/api/clubs/")
    assert r.status_code == 200 and r.json() == {"round": None, "clubs": []}


async def test_public_list_full_state_and_taken(client, db):
    from app.clubs.models import ClubRegistration
    s = await seed_clubs(db)
    db.add(ClubRegistration(club_id=s.robot_id, round_id=s.round_id, email="a@shineue.edu.mn",
                            student_last_name="Б", student_first_name="Бат", guardian_last_name="Д",
                            guardian_first_name="Дорж", phone="99001122", grade=9))
    db.add(ClubRegistration(club_id=s.robot_id, round_id=s.round_id, email="b@shineue.edu.mn", status="removed",
                            student_last_name="Б", student_first_name="Болд", guardian_last_name="Д",
                            guardian_first_name="Дорж", phone="99001133", grade=9))
    await db.flush()
    by = {c["name"]: c for c in (await client.get("/api/clubs/")).json()["clubs"]}
    assert by["Робот"]["taken"] == 1 and by["Робот"]["slots_left"] == 0 and by["Робот"]["state"] == "full"


def test_club_state_closed_beats_full():
    from datetime import UTC, datetime, timedelta
    from types import SimpleNamespace

    from app.clubs.service import club_state
    now = datetime.now(UTC)
    c = SimpleNamespace(capacity=1, registration_start=now - timedelta(days=2), registration_end=now - timedelta(days=1))
    assert club_state(c, taken=1, now=now) == "closed"
    c.registration_end = now + timedelta(days=1)
    assert club_state(c, taken=1, now=now) == "full"
    assert club_state(c, taken=0, now=now) == "open"
    c.registration_start = now + timedelta(hours=1)
    assert club_state(c, taken=0, now=now) == "upcoming"
```

Run: `cd backend && uv run pytest tests/test_clubs_public.py -q` → Expected: шинэ 4 тест FAIL (404 / ImportError).

- [ ] **Step 3: Схем бичих**

`backend/app/clubs/schemas.py`:

```python
"""Дугуйлангийн pydantic схемүүд."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ClubState = Literal["upcoming", "open", "full", "closed"]


class ImageOut(BaseModel):
    id: int
    url: str
    order: int


class RoundRef(BaseModel):
    id: int
    name: str


class ClubOut(BaseModel):
    id: int
    name: str
    description: str
    grades: list[int]
    capacity: int
    taken: int
    slots_left: int
    state: ClubState
    is_paid: bool
    fee: int
    fee_note: str
    registration_start: datetime
    registration_end: datetime
    images: list[ImageOut]


class ClubAdminOut(ClubOut):
    is_published: bool
    order: int
    round_id: int


class ClubsResponse(BaseModel):
    round: RoundRef | None
    clubs: list[ClubOut]


def _clean_grades(v):
    if not isinstance(v, list) or not v:
        raise ValueError("Дор хаяж нэг анги сонгоно уу.")
    out = sorted({int(g) for g in v})
    if any(g < 1 or g > 12 for g in out):
        raise ValueError("Анги 1–12 хооронд байх ёстой.")
    return out


class ClubIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=5000)
    grades: list[int]
    capacity: int = Field(ge=1, le=1000)
    is_paid: bool = False
    fee: int = Field(default=0, ge=0, le=100_000_000)
    fee_note: str = Field(default="", max_length=120)
    registration_start: datetime
    registration_end: datetime
    is_published: bool = False

    @field_validator("name", "fee_note", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("grades", mode="before")
    @classmethod
    def _grades(cls, v):
        return _clean_grades(v)

    @model_validator(mode="after")
    def _rules(self):
        if self.registration_start >= self.registration_end:
            raise ValueError("Дуусах хугацаа эхлэх хугацаанаас хойш байх ёстой.")
        if self.is_paid and self.fee < 1:
            raise ValueError("Төлбөртэй дугуйлангийн дүн 1-ээс их байх ёстой.")
        if not self.is_paid:
            self.fee, self.fee_note = 0, ""
        return self


class ClubPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=5000)
    grades: list[int] | None = None
    capacity: int | None = Field(default=None, ge=1, le=1000)
    is_paid: bool | None = None
    fee: int | None = Field(default=None, ge=0, le=100_000_000)
    fee_note: str | None = Field(default=None, max_length=120)
    registration_start: datetime | None = None
    registration_end: datetime | None = None
    is_published: bool | None = None

    @field_validator("name", "fee_note", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("grades", mode="before")
    @classmethod
    def _grades(cls, v):
        return None if v is None else _clean_grades(v)


class RoundOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    is_active: bool
    clubs_count: int
    registrations_count: int
    created_at: datetime


class RoundIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)

    @field_validator("name", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v


class RoundPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    is_active: bool | None = None

    @field_validator("name", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v


class OrderIn(BaseModel):
    ids: list[int]


class EmailIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)


class VerifyIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    code: str = Field(min_length=6, max_length=6)


class RegistrationIn(BaseModel):
    token: str
    club_id: int
    grade: int = Field(ge=1, le=12)
    student_last_name: str = Field(min_length=1, max_length=80)
    student_first_name: str = Field(min_length=1, max_length=80)
    guardian_last_name: str = Field(min_length=1, max_length=80)
    guardian_first_name: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=6, max_length=30)

    @field_validator("student_last_name", "student_first_name", "guardian_last_name", "guardian_first_name", "phone",
                     mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v


class ClubRef(BaseModel):
    id: int
    name: str
    is_paid: bool
    fee: int
    fee_note: str


class RegistrationOut(BaseModel):
    id: int
    club: ClubRef
    email: str
    student_last_name: str
    student_first_name: str
    guardian_last_name: str
    guardian_first_name: str
    phone: str
    grade: int
    created_at: datetime


class RegistrationAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    student_last_name: str
    student_first_name: str
    guardian_last_name: str
    guardian_first_name: str
    phone: str
    grade: int
    status: str
    is_paid_marked: bool
    created_at: datetime
    removed_at: datetime | None


class RegistrationPatch(BaseModel):
    is_paid_marked: bool
```

- [ ] **Step 4: Service бичих**

`backend/app/clubs/service.py`:

```python
"""Дугуйлангийн нийтлэг логик: имэйл, код, token, төлөв, гаралтын схем."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from .models import REG_CONFIRMED, Club, ClubRegistration, ClubRound
from .schemas import ClubAdminOut, ClubOut, ImageOut

TOKEN_SCOPE = "club-reg"


def normalize_email(s: str) -> str:
    return s.strip().lower()


def check_domain(email: str) -> bool:
    return email.endswith("@" + settings.club_email_domain.lower()) and email.count("@") == 1 and len(email.split("@")[0]) > 0


def new_code() -> str:
    return f"{secrets.randbelow(10**6):06d}"


def hash_code(email: str, code: str) -> str:
    return hashlib.sha256(f"{settings.secret_key}:{email}:{code}".encode()).hexdigest()


def create_reg_token(email: str) -> str:
    now = datetime.now(UTC)
    payload = {"sub": email, "scope": TOKEN_SCOPE, "iat": now,
               "exp": now + timedelta(minutes=settings.club_token_ttl_minutes)}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_reg_token(token: str) -> str:
    """Имэйл буцаана; буруу/хугацаа дууссан/scope зөрсөн бол 401."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        payload = None
    if not payload or payload.get("scope") != TOKEN_SCOPE or not payload.get("sub"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Баталгаажуулалтын хугацаа дууссан. Кодоо дахин авна уу")
    return str(payload["sub"])


def club_state(club, taken: int, now: datetime) -> str:
    if now < club.registration_start:
        return "upcoming"
    if now >= club.registration_end:
        return "closed"
    if taken >= club.capacity:
        return "full"
    return "open"


async def taken_counts(db: AsyncSession, club_ids: list[int]) -> dict[int, int]:
    if not club_ids:
        return {}
    rows = (await db.execute(
        select(ClubRegistration.club_id, func.count(ClubRegistration.id))
        .where(ClubRegistration.club_id.in_(club_ids), ClubRegistration.status == REG_CONFIRMED)
        .group_by(ClubRegistration.club_id)
    )).all()
    return {cid: int(n) for cid, n in rows}


async def active_round(db: AsyncSession) -> ClubRound | None:
    return (await db.execute(select(ClubRound).where(ClubRound.is_active.is_(True)))).scalar_one_or_none()


async def find_confirmed(db: AsyncSession, round_id: int, email: str) -> ClubRegistration | None:
    return (await db.execute(
        select(ClubRegistration).where(ClubRegistration.round_id == round_id, ClubRegistration.email == email,
                                       ClubRegistration.status == REG_CONFIRMED)
    )).scalar_one_or_none()


def media_url(request: Request, rel: str) -> str:
    if settings.media_base_url:
        return f"{settings.media_base_url.rstrip('/')}/media/{rel}"
    return f"{request.base_url}media/{rel}"


def _base(request: Request, club: Club, taken: int, now: datetime) -> dict:
    return dict(
        id=club.id, name=club.name, description=club.description, grades=list(club.grades), capacity=club.capacity,
        taken=taken, slots_left=max(club.capacity - taken, 0), state=club_state(club, taken, now),
        is_paid=club.is_paid, fee=club.fee, fee_note=club.fee_note,
        registration_start=club.registration_start, registration_end=club.registration_end,
        images=[ImageOut(id=i.id, url=media_url(request, i.file), order=i.order) for i in club.images],
    )


def club_out(request: Request, club: Club, taken: int, now: datetime) -> ClubOut:
    return ClubOut(**_base(request, club, taken, now))


def club_admin_out(request: Request, club: Club, taken: int, now: datetime) -> ClubAdminOut:
    return ClubAdminOut(**_base(request, club, taken, now), is_published=club.is_published, order=club.order,
                        round_id=club.round_id)
```

- [ ] **Step 5: Олон нийтийн router (зөвхөн жагсаалт)**

`backend/app/clubs/router_public.py`:

```python
"""
Дугуйлан — олон нийт.
  GET  /api/clubs/?grade=            → идэвхтэй ээлжийн нийтлэгдсэн дугуйлангууд
  POST /api/clubs/email/send/        → баталгаажуулах код илгээх
  POST /api/clubs/email/verify/      → код шалгаж token авах
  POST /api/clubs/registrations/     → бүртгүүлэх (token шаардана)
"""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from .models import Club
from .schemas import ClubsResponse, RoundRef
from .service import active_round, club_out, taken_counts

router = APIRouter(prefix="/api/clubs", tags=["clubs"])
DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/", response_model=ClubsResponse)
async def clubs_list(request: Request, db: DB, grade: int | None = None):
    rnd = await active_round(db)
    if rnd is None:
        return ClubsResponse(round=None, clubs=[])
    q = select(Club).where(Club.round_id == rnd.id, Club.is_published.is_(True)).order_by(Club.order, Club.id)
    if grade is not None:
        q = q.where(Club.grades.any(grade))
    clubs = (await db.execute(q)).scalars().all()
    taken = await taken_counts(db, [c.id for c in clubs])
    now = datetime.now(UTC)
    return ClubsResponse(round=RoundRef(id=rnd.id, name=rnd.name),
                         clubs=[club_out(request, c, taken.get(c.id, 0), now) for c in clubs])
```

`backend/app/main.py`: import `from .clubs.router_public import router as clubs_public_router` (auth-ийн дараа, alphabetical), `app.include_router(clubs_public_router)` мөрийг `timetable_lessons_router`-ийн дараа нэмнэ.

- [ ] **Step 6: Тест ажиллуулах**

Run: `cd backend && uv run pytest tests/test_clubs_public.py -q` → Expected: 7 passed.

- [ ] **Step 7: Stage**

```bash
git add backend/app/clubs backend/app/main.py backend/tests/helpers.py backend/tests/test_clubs_public.py
```

---

### Task 3: Имэйлийн код илгээх, шалгах endpoint-ууд

**Files:**
- Modify: `backend/app/clubs/router_public.py`, `backend/tests/conftest.py`, `backend/tests/test_clubs_public.py`

**Interfaces:**
- Consumes: Task 2 service (`normalize_email`, `check_domain`, `new_code`, `hash_code`, `create_reg_token`, `active_round`, `find_confirmed`), `mailer.send_code`, `EmailCode` model.
- Produces: `POST /api/clubs/email/send/`, `POST /api/clubs/email/verify/`; conftest fixture `sent_codes` (list of `(email, code)`; `mailer.send_code`-ийг барина); helper `tests.helpers.get_code(sent_codes, email) -> str`.

- [ ] **Step 1: Fixture нэмэх**

`backend/tests/conftest.py` төгсгөлд:

```python
@pytest.fixture
async def sent_codes(monkeypatch):
    """mailer.send_code-ийг барьж, илгээсэн (email, code) хосуудыг жагсаалтад хадгална."""
    from app.clubs import mailer
    sent: list[tuple[str, str]] = []

    async def _fake(email, code):
        sent.append((email, code))

    monkeypatch.setattr(mailer, "send_code", _fake)
    return sent
```

`backend/tests/helpers.py` төгсгөлд:

```python
def get_code(sent_codes, email):
    """Тухайн хаягт хамгийн сүүлд илгээсэн код."""
    return next(c for e, c in reversed(sent_codes) if e == email)
```

- [ ] **Step 2: Тест бичих**

`backend/tests/test_clubs_public.py` төгсгөлд:

```python
from tests.helpers import get_code

SEND = "/api/clubs/email/send/"
VERIFY = "/api/clubs/email/verify/"


async def test_send_code_domain_and_round_checks(client, db, sent_codes):
    r = await client.post(SEND, json={"email": "bat@gmail.com"})
    assert r.status_code == 400 and "shineue.edu.mn" in r.json()["email"][0]
    r = await client.post(SEND, json={"email": "bat@shineue.edu.mn"})
    assert r.status_code == 400 and "нээгдээгүй" in r.json()["email"][0]     # идэвхтэй ээлж байхгүй
    assert sent_codes == []
    await seed_clubs(db)
    r = await client.post(SEND, json={"email": "  Bat@Shineue.edu.mn "})
    assert r.status_code == 200 and r.json() == {"ok": True, "expires_in": 600}
    assert sent_codes == [("bat@shineue.edu.mn", sent_codes[0][1])] and len(sent_codes[0][1]) == 6


async def test_send_code_rate_limit_and_resend(client, db, sent_codes):
    await seed_clubs(db)
    for _ in range(3):
        assert (await client.post(SEND, json={"email": "bat@shineue.edu.mn"})).status_code == 200
    r = await client.post(SEND, json={"email": "bat@shineue.edu.mn"})
    assert r.status_code == 429 and "Хэт олон" in r.json()["detail"]
    assert len(sent_codes) == 3                                      # 429 үед код илгээгдээгүй
    # Зөвхөн хамгийн сүүлийн код хүчинтэй (санамсаргүй код давхцах магадлал 1e-6 тул хамгаална)
    if sent_codes[0][1] != sent_codes[-1][1]:
        r = await client.post(VERIFY, json={"email": "bat@shineue.edu.mn", "code": sent_codes[0][1]})
        assert r.status_code == 400 and r.json()["code"] == ["Код буруу байна"]
    # 1 цаг өнгөрсөн бол тоолуур шинээр эхэлнэ
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import update

    from app.clubs.models import EmailCode
    await db.execute(update(EmailCode).where(EmailCode.email == "bat@shineue.edu.mn")
                     .values(first_sent_at=datetime.now(UTC) - timedelta(hours=2)))
    await db.flush()
    assert (await client.post(SEND, json={"email": "bat@shineue.edu.mn"})).status_code == 200


async def test_send_code_refuses_when_already_registered(client, db, sent_codes):
    from app.clubs.models import ClubRegistration
    s = await seed_clubs(db)
    db.add(ClubRegistration(club_id=s.chess_id, round_id=s.round_id, email="bat@shineue.edu.mn",
                            student_last_name="Б", student_first_name="Бат", guardian_last_name="Д",
                            guardian_first_name="Дорж", phone="99001122", grade=5))
    await db.flush()
    r = await client.post(SEND, json={"email": "bat@shineue.edu.mn"})
    assert r.status_code == 400 and "Шатар" in r.json()["email"][0] and sent_codes == []


async def test_verify_code_flow(client, db, sent_codes):
    await seed_clubs(db)
    email = "bat@shineue.edu.mn"
    await client.post(SEND, json={"email": email})
    code = get_code(sent_codes, email)
    wrong = "000000" if code != "000000" else "111111"
    r = await client.post(VERIFY, json={"email": email, "code": wrong})
    assert r.status_code == 400 and r.json()["code"] == ["Код буруу байна"]
    r = await client.post(VERIFY, json={"email": email, "code": code})
    assert r.status_code == 200 and r.json()["expires_in"] == 900
    from app.clubs.service import decode_reg_token
    assert decode_reg_token(r.json()["token"]) == email
    # код нэг удаа л ашиглагдана
    r = await client.post(VERIFY, json={"email": email, "code": code})
    assert r.status_code == 400 and "Дахин код" in r.json()["code"][0]
    # хаяг байхгүй
    r = await client.post(VERIFY, json={"email": "x@shineue.edu.mn", "code": "123456"})
    assert r.status_code == 400 and "Дахин код" in r.json()["code"][0]


async def test_verify_code_attempts_and_expiry(client, db, sent_codes):
    await seed_clubs(db)
    email = "bat@shineue.edu.mn"
    await client.post(SEND, json={"email": email})
    code = get_code(sent_codes, email)
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(5):
        assert (await client.post(VERIFY, json={"email": email, "code": wrong})).status_code == 400
    r = await client.post(VERIFY, json={"email": email, "code": code})         # 5 буруугийн дараа зөв код ч хүчингүй
    assert r.status_code == 400 and "Дахин код" in r.json()["code"][0]
    # хугацаа дууссан
    await client.post(SEND, json={"email": email})
    code = get_code(sent_codes, email)
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import update

    from app.clubs.models import EmailCode
    await db.execute(update(EmailCode).where(EmailCode.email == email).values(expires_at=datetime.now(UTC) - timedelta(minutes=1)))
    await db.flush()
    r = await client.post(VERIFY, json={"email": email, "code": code})
    assert r.status_code == 400 and "Дахин код" in r.json()["code"][0]


async def test_send_code_mail_failure_502(client, db, monkeypatch):
    from app.clubs import mailer
    await seed_clubs(db)

    async def _fail(email, code):
        raise mailer.MailError("smtp down")

    monkeypatch.setattr(mailer, "send_code", _fail)
    r = await client.post(SEND, json={"email": "bat@shineue.edu.mn"})
    assert r.status_code == 502 and "Имэйл илгээж чадсангүй" in r.json()["detail"]
```

Run: `cd backend && uv run pytest tests/test_clubs_public.py -q` → Expected: шинэ 6 тест FAIL (404).

- [ ] **Step 3: Endpoint бичих**

`backend/app/clubs/router_public.py`-д импорт нэмнэ: `from datetime import UTC, datetime, timedelta`, `from fastapi import HTTPException, status`, `from ..common.errors import FieldError`, `from . import mailer`, `from .models import Club, EmailCode`, `from .schemas import ClubsResponse, EmailIn, RoundRef, VerifyIn`, `from .service import (active_round, check_domain, club_out, create_reg_token, find_confirmed, hash_code, new_code, normalize_email, taken_counts)`. Мөн `from ..config import settings`. Файлын төгсгөлд:

```python
MAX_SENDS_PER_HOUR = 3
MAX_ATTEMPTS = 5
CODE_INVALID = "Код хүчингүй. Дахин код авна уу"


@router.post("/email/send/")
async def email_send(body: EmailIn, db: DB):
    email = normalize_email(body.email)
    if not check_domain(email):
        raise FieldError("email", f"Зөвхөн @{settings.club_email_domain} хаягаар бүртгүүлнэ")
    rnd = await active_round(db)
    if rnd is None:
        raise FieldError("email", "Одоогоор бүртгэл нээгдээгүй байна")
    existing = await find_confirmed(db, rnd.id, email)
    if existing is not None:
        raise FieldError("email", f"Энэ хаягаар «{existing.club.name}» дугуйланд бүртгүүлсэн байна")

    now = datetime.now(UTC)
    row = (await db.execute(select(EmailCode).where(EmailCode.email == email))).scalar_one_or_none()
    if row is not None and now - row.first_sent_at < timedelta(hours=1):
        if row.sent_count >= MAX_SENDS_PER_HOUR:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                                "Хэт олон удаа код авлаа. 1 цагийн дараа дахин оролдоно уу")
        row.sent_count += 1
    elif row is not None:
        row.sent_count, row.first_sent_at = 1, now
    else:
        row = EmailCode(email=email, sent_count=1, first_sent_at=now)
        db.add(row)
    code = new_code()
    row.code_hash = hash_code(email, code)
    row.expires_at = now + timedelta(minutes=settings.club_code_ttl_minutes)
    row.attempts = 0
    try:
        await mailer.send_code(email, code)
    except mailer.MailError:
        await db.rollback()
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Имэйл илгээж чадсангүй. Дараа дахин оролдоно уу")
    await db.commit()
    return {"ok": True, "expires_in": settings.club_code_ttl_minutes * 60}


@router.post("/email/verify/")
async def email_verify(body: VerifyIn, db: DB):
    email = normalize_email(body.email)
    now = datetime.now(UTC)
    row = (await db.execute(select(EmailCode).where(EmailCode.email == email))).scalar_one_or_none()
    if row is None or row.expires_at <= now or row.attempts >= MAX_ATTEMPTS:
        raise FieldError("code", CODE_INVALID)
    if row.code_hash != hash_code(email, body.code.strip()):
        row.attempts += 1
        await db.commit()
        raise FieldError("code", "Код буруу байна")
    await db.delete(row)
    await db.commit()
    return {"token": create_reg_token(email), "expires_in": settings.club_token_ttl_minutes * 60}
```

Анхаар: `row.sent_count += 1` нь 429-өөс өмнө биш — дээрх дарааллаар 429 шидэхэд тоолуур өсөхгүй (rollback хэрэггүй, commit хийгдээгүй).

- [ ] **Step 4: Тест ажиллуулах**

Run: `cd backend && uv run pytest tests/test_clubs_public.py -q` → Expected: 13 passed.

- [ ] **Step 5: Stage**

```bash
git add backend/app/clubs/router_public.py backend/tests/conftest.py backend/tests/helpers.py backend/tests/test_clubs_public.py
```

---

### Task 4: Бүртгэл үүсгэх endpoint (`POST /api/clubs/registrations/`)

**Files:**
- Modify: `backend/app/clubs/router_public.py`, `backend/tests/test_clubs_public.py`

**Interfaces:**
- Consumes: `service.decode_reg_token`, `service.club_state`, `service.find_confirmed`, `service.taken_counts`, `RegistrationIn`, `RegistrationOut`, `ClubRef`.
- Produces: `POST /api/clubs/registrations/` → 201 `RegistrationOut`; алдаа: 401 token, 400 `club`/`grade`/`email`.

- [ ] **Step 1: Тест бичих**

`backend/tests/test_clubs_public.py` төгсгөлд:

```python
REG = "/api/clubs/registrations/"


def reg_body(token, club_id, grade=5, **over):
    d = {"token": token, "club_id": club_id, "grade": grade, "student_last_name": "Бат", "student_first_name": "Дорж",
         "guardian_last_name": "Дорж", "guardian_first_name": "Сүх", "phone": "99001122"}
    d.update(over)
    return d


def tok(email):
    from app.clubs.service import create_reg_token
    return create_reg_token(email)


async def test_register_success_and_slot(client, db):
    s = await seed_clubs(db)
    r = await client.post(REG, json=reg_body(tok("bat@shineue.edu.mn"), s.chess_id, 6))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["club"] == {"id": s.chess_id, "name": "Шатар", "is_paid": False, "fee": 0, "fee_note": ""}
    assert body["email"] == "bat@shineue.edu.mn" and body["grade"] == 6 and body["student_first_name"] == "Дорж"
    by = {c["name"]: c for c in (await client.get("/api/clubs/")).json()["clubs"]}
    assert by["Шатар"]["taken"] == 1 and by["Шатар"]["slots_left"] == 1


async def test_register_rejections(client, db):
    s = await seed_clubs(db)
    t = tok("bat@shineue.edu.mn")
    r = await client.post(REG, json=reg_body("bad.token", s.chess_id))
    assert r.status_code == 401 and "Кодоо дахин" in r.json()["detail"]
    from app.auth.security import create_token
    r = await client.post(REG, json=reg_body(create_token(1, "access"), s.chess_id))   # scope зөрсөн
    assert r.status_code == 401
    r = await client.post(REG, json=reg_body(t, 999999))
    assert r.status_code == 400 and r.json()["club"] == ["Дугуйлан олдсонгүй"]
    r = await client.post(REG, json=reg_body(t, s.hidden_id))
    assert r.status_code == 400 and r.json()["club"] == ["Дугуйлан олдсонгүй"]
    r = await client.post(REG, json=reg_body(t, s.song_id, 2))
    assert r.status_code == 400 and r.json()["club"] == ["Бүртгэл хараахан эхлээгүй"]
    r = await client.post(REG, json=reg_body(t, s.draw_id, 5))
    assert r.status_code == 400 and r.json()["club"] == ["Бүртгэлийн хугацаа дууссан"]
    r = await client.post(REG, json=reg_body(t, s.chess_id, 3))
    assert r.status_code == 400 and "3-р ангид" in r.json()["grade"][0]
    r = await client.post(REG, json=reg_body(t, s.chess_id, 5, student_first_name="  "))
    assert r.status_code == 400 and "student_first_name" in r.json()
    r = await client.post(REG, json=reg_body(t, s.chess_id, 5, phone="12"))
    assert r.status_code == 400 and "phone" in r.json()


async def test_register_duplicate_full_and_readd_after_remove(client, db):
    s = await seed_clubs(db)
    assert (await client.post(REG, json=reg_body(tok("a@shineue.edu.mn"), s.robot_id, 9))).status_code == 201
    r = await client.post(REG, json=reg_body(tok("a@shineue.edu.mn"), s.chess_id, 5))    # ижил имэйл өөр дугуйлан
    assert r.status_code == 400 and "Робот" in r.json()["email"][0]
    r = await client.post(REG, json=reg_body(tok("b@shineue.edu.mn"), s.robot_id, 10))   # capacity 1 → дүүрсэн
    assert r.status_code == 400 and r.json()["club"] == ["Дугуйлан дүүрсэн"]
    # менежер хассаны дараа дахин бүртгүүлж болно
    from datetime import UTC, datetime

    from sqlalchemy import update

    from app.clubs.models import ClubRegistration
    await db.execute(update(ClubRegistration).where(ClubRegistration.email == "a@shineue.edu.mn")
                     .values(status="removed", removed_at=datetime.now(UTC)))
    await db.flush()
    assert (await client.post(REG, json=reg_body(tok("b@shineue.edu.mn"), s.robot_id, 10))).status_code == 201
    assert (await client.post(REG, json=reg_body(tok("a@shineue.edu.mn"), s.chess_id, 5))).status_code == 201


async def test_register_round_inactive_hides_club(client, db):
    from sqlalchemy import update

    from app.clubs.models import ClubRound
    s = await seed_clubs(db)
    await db.execute(update(ClubRound).where(ClubRound.id == s.round_id).values(is_active=False))
    await db.flush()
    r = await client.post(REG, json=reg_body(tok("a@shineue.edu.mn"), s.chess_id, 5))
    assert r.status_code == 400 and r.json()["club"] == ["Дугуйлан олдсонгүй"]


async def test_register_last_slot_race(engine):
    """Хоёр хүсэлт зэрэг сүүлийн 1 слот руу: нэг нь 201, нөгөө нь 400. Тусдаа connection-уудаар (FOR UPDATE)."""
    import asyncio
    from datetime import UTC, datetime, timedelta

    from httpx import ASGITransport, AsyncClient
    from sqlalchemy import delete
    from sqlalchemy.ext.asyncio import async_sessionmaker

    from app.clubs.models import Club, ClubRegistration, ClubRound
    from app.db import get_db
    from app.main import app

    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _get_db():
        async with maker() as s:
            yield s

    now = datetime.now(UTC)
    async with maker() as s:
        rnd = ClubRound(name="race", is_active=True)
        s.add(rnd)
        await s.flush()
        club = Club(round_id=rnd.id, name="Race", grades=[5], capacity=1, registration_start=now - timedelta(days=1),
                    registration_end=now + timedelta(days=1), is_published=True)
        s.add(club)
        await s.commit()
        rid, cid = rnd.id, club.id

    app.dependency_overrides[get_db] = _get_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r1, r2 = await asyncio.gather(
                c.post(REG, json=reg_body(tok("r1@shineue.edu.mn"), cid, 5)),
                c.post(REG, json=reg_body(tok("r2@shineue.edu.mn"), cid, 5)),
            )
        assert sorted([r1.status_code, r2.status_code]) == [201, 400], (r1.text, r2.text)
        assert "Дугуйлан дүүрсэн" in (r1.text + r2.text)
    finally:
        app.dependency_overrides.clear()
        async with maker() as s:
            await s.execute(delete(ClubRegistration).where(ClubRegistration.club_id == cid))
            await s.execute(delete(Club).where(Club.id == cid))
            await s.execute(delete(ClubRound).where(ClubRound.id == rid))
            await s.commit()
```

Run: `cd backend && uv run pytest tests/test_clubs_public.py -q` → Expected: шинэ 5 тест FAIL (404/405).

- [ ] **Step 2: Endpoint бичих**

`backend/app/clubs/router_public.py`-д импорт: `from sqlalchemy.exc import IntegrityError`, `from .models import REG_CONFIRMED, ClubRegistration, ClubRound`, `from .schemas import ClubRef, RegistrationIn, RegistrationOut`, `from .service import club_state, decode_reg_token`. Төгсгөлд:

```python
@router.post("/registrations/", response_model=RegistrationOut, status_code=201)
async def register(body: RegistrationIn, db: DB):
    email = decode_reg_token(body.token)
    # Дугуйлангийн мөрийг түгжинэ: слот тоолох ба бүртгэл нэмэх нэг transaction-д (сүүлийн слотын уралдаан)
    club = (await db.execute(
        select(Club).where(Club.id == body.club_id).with_for_update()
    )).scalar_one_or_none()
    if club is None or not club.is_published:
        raise FieldError("club", "Дугуйлан олдсонгүй")
    rnd = await db.get(ClubRound, club.round_id)
    if rnd is None or not rnd.is_active:
        raise FieldError("club", "Дугуйлан олдсонгүй")
    now = datetime.now(UTC)
    taken = (await taken_counts(db, [club.id])).get(club.id, 0)
    state = club_state(club, taken, now)
    if state == "upcoming":
        raise FieldError("club", "Бүртгэл хараахан эхлээгүй")
    if state == "closed":
        raise FieldError("club", "Бүртгэлийн хугацаа дууссан")
    if body.grade not in club.grades:
        raise FieldError("grade", f"Энэ дугуйлан {body.grade}-р ангид зориулагдаагүй")
    existing = await find_confirmed(db, rnd.id, email)
    if existing is not None:
        raise FieldError("email", f"Энэ хаягаар «{existing.club.name}» дугуйланд бүртгүүлсэн байна")
    if state == "full":
        raise FieldError("club", "Дугуйлан дүүрсэн")
    reg = ClubRegistration(
        club_id=club.id, round_id=rnd.id, email=email, status=REG_CONFIRMED, grade=body.grade,
        student_last_name=body.student_last_name, student_first_name=body.student_first_name,
        guardian_last_name=body.guardian_last_name, guardian_first_name=body.guardian_first_name, phone=body.phone,
    )
    db.add(reg)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise FieldError("email", "Энэ хаягаар энэ ээлжид аль хэдийн бүртгүүлсэн байна") from None
    await db.refresh(reg)   # created_at нь server_default — async session-д lazy ачаалагдахгүй тул шинэчилнэ
    return RegistrationOut(
        id=reg.id, club=ClubRef(id=club.id, name=club.name, is_paid=club.is_paid, fee=club.fee, fee_note=club.fee_note),
        email=reg.email, student_last_name=reg.student_last_name, student_first_name=reg.student_first_name,
        guardian_last_name=reg.guardian_last_name, guardian_first_name=reg.guardian_first_name, phone=reg.phone,
        grade=reg.grade, created_at=reg.created_at,
    )
```

`with_for_update()` нь `SELECT … FOR UPDATE`; хоёр дахь хүсэлт эхнийх commit хийтэл хүлээгээд дараа нь `taken=1` тоолж "Дүүрсэн" авна.

- [ ] **Step 3: Тест ажиллуулах**

Run: `cd backend && uv run pytest tests/test_clubs_public.py -q` → Expected: 18 passed. Race тест савлавал (flaky) `with_for_update()` мөр ажиллаж буйг `echo=True`-ээр шалгана; хоёр хүсэлт нэг connection дээр очиж байвал override буруу.

- [ ] **Step 4: Stage**

```bash
git add backend/app/clubs/router_public.py backend/tests/test_clubs_public.py
```

---

### Task 5: Менежерийн API — ээлж, дугуйлан CRUD, эрэмбэ

**Files:**
- Create: `backend/app/clubs/router_admin.py`, `backend/tests/test_clubs_admin.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: schemas `RoundOut, RoundIn, RoundPatch, ClubIn, ClubPatch, ClubAdminOut, OrderIn`; `service.club_admin_out`, `taken_counts`; `tests.helpers.manager_headers`, `seed_clubs`.
- Produces: `/api/clubs/admin/rounds/` (GET, POST), `/rounds/{id}/` (PATCH, DELETE), `/rounds/{id}/clubs/` (GET, POST), `/rounds/{id}/clubs/order/` (PUT), `/clubs/{id}/` (PATCH, DELETE); router-д `Manager` dependency, `_get_or_404`, `_club_admin(request, db, club)` туслахууд (Task 6 ашиглана).

- [ ] **Step 1: Тест бичих**

`backend/tests/test_clubs_admin.py`:

```python
"""Дугуйлан — менежерийн API."""

from datetime import UTC, datetime, timedelta

from tests.helpers import manager_headers, seed_clubs, staff_headers

A = "/api/clubs/admin"


def club_payload(**over):
    now = datetime.now(UTC)
    d = {"name": "Хөл бөмбөг", "description": "Долоо хоногт 2 удаа", "grades": [7, 5, 5], "capacity": 15,
         "is_paid": False, "fee": 0, "fee_note": "",
         "registration_start": (now - timedelta(days=1)).isoformat(),
         "registration_end": (now + timedelta(days=10)).isoformat(), "is_published": True}
    d.update(over)
    return d


async def test_admin_requires_manager(client, db, make_user):
    assert (await client.get(f"{A}/rounds/")).status_code == 401
    h = await staff_headers(client, make_user, "oly", roles=("olympiad",))
    assert (await client.get(f"{A}/rounds/", headers=h)).status_code == 403
    h = await manager_headers(client, make_user)
    assert (await client.get(f"{A}/rounds/", headers=h)).status_code == 200


async def test_rounds_crud_and_single_active(client, db, make_user):
    h = await manager_headers(client, make_user)
    r = await client.post(f"{A}/rounds/", headers=h, json={"name": "  2026 намар "})
    assert r.status_code == 201 and r.json()["name"] == "2026 намар" and r.json()["is_active"] is False
    r1 = r.json()["id"]
    r2 = (await client.post(f"{A}/rounds/", headers=h, json={"name": "2027 хавар"})).json()["id"]
    assert (await client.post(f"{A}/rounds/", headers=h, json={"name": " "})).status_code == 400
    assert (await client.patch(f"{A}/rounds/{r1}/", headers=h, json={"is_active": True})).json()["is_active"] is True
    r = await client.patch(f"{A}/rounds/{r2}/", headers=h, json={"is_active": True, "name": "2027 хавар (шинэ)"})
    assert r.json()["is_active"] is True and r.json()["name"] == "2027 хавар (шинэ)"
    rounds = {x["id"]: x for x in (await client.get(f"{A}/rounds/", headers=h)).json()}
    assert rounds[r1]["is_active"] is False and rounds[r2]["is_active"] is True
    assert rounds[r2]["clubs_count"] == 0 and rounds[r2]["registrations_count"] == 0
    assert (await client.delete(f"{A}/rounds/{r1}/", headers=h)).status_code == 204
    assert (await client.patch(f"{A}/rounds/999999/", headers=h, json={"name": "x"})).status_code == 404


async def test_round_delete_rules(client, db, make_user):
    from app.clubs.models import ClubRegistration
    s = await seed_clubs(db)
    h = await manager_headers(client, make_user)
    rounds = (await client.get(f"{A}/rounds/", headers=h)).json()
    assert rounds[0]["clubs_count"] == 5
    db.add(ClubRegistration(club_id=s.chess_id, round_id=s.round_id, email="a@shineue.edu.mn",
                            student_last_name="Б", student_first_name="Бат", guardian_last_name="Д",
                            guardian_first_name="Дорж", phone="99001122", grade=5))
    await db.flush()
    r = await client.delete(f"{A}/rounds/{s.round_id}/", headers=h)
    assert r.status_code == 409 and "Бүртгэлтэй" in r.json()["detail"]
    r = await client.delete(f"{A}/clubs/{s.chess_id}/", headers=h)
    assert r.status_code == 409
    assert (await client.delete(f"{A}/clubs/{s.robot_id}/", headers=h)).status_code == 204


async def test_round_delete_with_clubs_no_registrations(client, db, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    s = await seed_clubs(db)
    h = await manager_headers(client, make_user)
    assert (await client.delete(f"{A}/rounds/{s.round_id}/", headers=h)).status_code == 204
    assert (await client.get(f"{A}/rounds/", headers=h)).json() == []
    assert (await client.get("/api/clubs/")).json() == {"round": None, "clubs": []}


async def test_clubs_create_validate_patch(client, db, make_user):
    s = await seed_clubs(db)
    h = await manager_headers(client, make_user)
    r = await client.post(f"{A}/rounds/{s.round_id}/clubs/", headers=h, json=club_payload())
    assert r.status_code == 201, r.text
    c = r.json()
    assert c["grades"] == [5, 7] and c["order"] == 6 and c["state"] == "open" and c["taken"] == 0
    assert c["is_published"] and c["round_id"] == s.round_id and c["fee"] == 0
    cid = c["id"]
    # шалгалтууд
    now = datetime.now(UTC)
    r = await client.post(f"{A}/rounds/{s.round_id}/clubs/", headers=h,
                          json=club_payload(registration_start=(now + timedelta(days=2)).isoformat(),
                                            registration_end=(now + timedelta(days=1)).isoformat()))
    assert r.status_code == 400 and "non_field_errors" in r.json()
    r = await client.post(f"{A}/rounds/{s.round_id}/clubs/", headers=h, json=club_payload(is_paid=True, fee=0))
    assert r.status_code == 400
    r = await client.post(f"{A}/rounds/{s.round_id}/clubs/", headers=h, json=club_payload(grades=[]))
    assert r.status_code == 400 and "grades" in r.json()
    r = await client.post(f"{A}/rounds/{s.round_id}/clubs/", headers=h, json=club_payload(grades=[13]))
    assert r.status_code == 400 and "grades" in r.json()
    r = await client.post(f"{A}/rounds/{s.round_id}/clubs/", headers=h, json=club_payload(capacity=0))
    assert r.status_code == 400 and "capacity" in r.json()
    # төлбөргүй болгоход fee, fee_note цэвэрлэгдэнэ
    r = await client.post(f"{A}/rounds/{s.round_id}/clubs/", headers=h, json=club_payload(is_paid=False, fee=500, fee_note="сард"))
    assert r.json()["fee"] == 0 and r.json()["fee_note"] == ""
    # PATCH
    r = await client.patch(f"{A}/clubs/{cid}/", headers=h, json={"is_paid": True, "fee": 90000, "fee_note": "улиралд"})
    assert r.status_code == 200 and r.json()["fee"] == 90000
    r = await client.patch(f"{A}/clubs/{cid}/", headers=h, json={"fee": 0})            # is_paid хэвээр true → 400
    assert r.status_code == 400 and "fee" in r.json()
    r = await client.patch(f"{A}/clubs/{cid}/", headers=h, json={"registration_end": (now - timedelta(days=5)).isoformat()})
    assert r.status_code == 400 and "registration_end" in r.json()
    r = await client.patch(f"{A}/clubs/{cid}/", headers=h, json={"is_published": False, "grades": [9]})
    assert r.json()["is_published"] is False and r.json()["grades"] == [9]
    assert (await client.patch(f"{A}/clubs/999999/", headers=h, json={"name": "x"})).status_code == 404


async def test_club_capacity_not_below_taken(client, db, make_user):
    from app.clubs.models import ClubRegistration
    s = await seed_clubs(db)
    h = await manager_headers(client, make_user)
    for i in range(2):
        db.add(ClubRegistration(club_id=s.chess_id, round_id=s.round_id, email=f"s{i}@shineue.edu.mn",
                                student_last_name="Б", student_first_name="Бат", guardian_last_name="Д",
                                guardian_first_name="Дорж", phone="99001122", grade=5))
    await db.flush()
    r = await client.patch(f"{A}/clubs/{s.chess_id}/", headers=h, json={"capacity": 1})
    assert r.status_code == 400 and "2 сурагчаас" in r.json()["capacity"][0]
    r = await client.patch(f"{A}/clubs/{s.chess_id}/", headers=h, json={"capacity": 2})
    assert r.status_code == 200 and r.json()["state"] == "full"


async def test_clubs_list_and_order(client, db, make_user):
    s = await seed_clubs(db)
    h = await manager_headers(client, make_user)
    lst = (await client.get(f"{A}/rounds/{s.round_id}/clubs/", headers=h)).json()
    assert [c["name"] for c in lst] == ["Шатар", "Робот", "Дуу", "Зураг", "Нууц"]     # нийтлэгдээгүй ч орно
    ids = [c["id"] for c in lst]
    r = await client.put(f"{A}/rounds/{s.round_id}/clubs/order/", headers=h, json={"ids": list(reversed(ids))})
    assert r.status_code == 200 and [c["name"] for c in r.json()] == ["Нууц", "Зураг", "Дуу", "Робот", "Шатар"]
    r = await client.put(f"{A}/rounds/{s.round_id}/clubs/order/", headers=h, json={"ids": ids[:2]})
    assert r.status_code == 400 and "ids" in r.json()
```

Run: `cd backend && uv run pytest tests/test_clubs_admin.py -q` → Expected: FAIL (404).

- [ ] **Step 2: Admin router бичих**

`backend/app/clubs/router_admin.py`:

```python
"""
Дугуйлан — менежерийн API (manager эрх).
  GET/POST   /api/clubs/admin/rounds/                 PATCH/DELETE /rounds/{id}/
  GET/POST   /rounds/{id}/clubs/    PUT /rounds/{id}/clubs/order/
  PATCH/DELETE /clubs/{id}/
  POST /clubs/{id}/images/   DELETE /images/{id}/   PUT /clubs/{id}/images/order/
  GET  /clubs/{id}/registrations/   POST /registrations/{id}/remove/   PATCH /registrations/{id}/
  GET  /rounds/{id}/registrations.xlsx
"""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import require_role
from ..auth.models import User
from ..common.errors import FieldError
from ..common.media import delete_file
from ..db import get_db
from .models import REG_CONFIRMED, Club, ClubImage, ClubRegistration, ClubRound
from .schemas import ClubAdminOut, ClubIn, ClubPatch, OrderIn, RoundIn, RoundOut, RoundPatch
from .service import club_admin_out, taken_counts

router = APIRouter(prefix="/api/clubs/admin", tags=["clubs-admin"])
DB = Annotated[AsyncSession, Depends(get_db)]
Manager = Annotated[User, Depends(require_role("manager"))]


async def _get_or_404(db: AsyncSession, model, id: int):
    obj = await db.get(model, id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return obj


async def _club_admin(request: Request, db: AsyncSession, club: Club) -> ClubAdminOut:
    taken = (await taken_counts(db, [club.id])).get(club.id, 0)
    return club_admin_out(request, club, taken, datetime.now(UTC))


async def _clubs_of_round(request: Request, db: AsyncSession, round_id: int) -> list[ClubAdminOut]:
    clubs = (await db.execute(select(Club).where(Club.round_id == round_id).order_by(Club.order, Club.id))).scalars().all()
    taken = await taken_counts(db, [c.id for c in clubs])
    now = datetime.now(UTC)
    return [club_admin_out(request, c, taken.get(c.id, 0), now) for c in clubs]


async def _round_out(db: AsyncSession, rnd: ClubRound) -> RoundOut:
    clubs = (await db.execute(select(func.count(Club.id)).where(Club.round_id == rnd.id))).scalar_one()
    regs = (await db.execute(select(func.count(ClubRegistration.id)).where(
        ClubRegistration.round_id == rnd.id, ClubRegistration.status == REG_CONFIRMED))).scalar_one()
    return RoundOut(id=rnd.id, name=rnd.name, is_active=rnd.is_active, clubs_count=int(clubs),
                    registrations_count=int(regs), created_at=rnd.created_at)


# ---- ээлж ----
@router.get("/rounds/", response_model=list[RoundOut])
async def rounds_list(db: DB, _: Manager):
    rounds = (await db.execute(select(ClubRound).order_by(ClubRound.id.desc()))).scalars().all()
    return [await _round_out(db, r) for r in rounds]


@router.post("/rounds/", response_model=RoundOut, status_code=201)
async def round_create(body: RoundIn, db: DB, _: Manager):
    rnd = ClubRound(name=body.name, is_active=False)
    db.add(rnd)
    await db.commit()
    await db.refresh(rnd)
    return await _round_out(db, rnd)


@router.patch("/rounds/{id}/", response_model=RoundOut)
async def round_patch(id: int, body: RoundPatch, db: DB, _: Manager):
    rnd = await _get_or_404(db, ClubRound, id)
    if body.name is not None:
        rnd.name = body.name
    if body.is_active is True:
        await db.execute(update(ClubRound).where(ClubRound.id != rnd.id).values(is_active=False))
        rnd.is_active = True
    elif body.is_active is False:
        rnd.is_active = False
    await db.commit()
    return await _round_out(db, rnd)


async def _has_registrations(db: AsyncSession, *, round_id: int | None = None, club_id: int | None = None) -> bool:
    q = select(func.count(ClubRegistration.id))
    q = q.where(ClubRegistration.round_id == round_id) if round_id is not None else q.where(ClubRegistration.club_id == club_id)
    return (await db.execute(q)).scalar_one() > 0


@router.delete("/rounds/{id}/", status_code=204)
async def round_delete(id: int, db: DB, _: Manager):
    rnd = await _get_or_404(db, ClubRound, id)
    if await _has_registrations(db, round_id=rnd.id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Бүртгэлтэй ээлжийг устгах боломжгүй")
    clubs = (await db.execute(select(Club).where(Club.round_id == rnd.id))).scalars().all()
    files = [i.file for c in clubs for i in c.images]
    for c in clubs:
        await db.delete(c)
    await db.delete(rnd)
    await db.commit()
    for f in files:
        delete_file(f)


# ---- дугуйлан ----
@router.get("/rounds/{id}/clubs/", response_model=list[ClubAdminOut])
async def clubs_list(id: int, request: Request, db: DB, _: Manager):
    await _get_or_404(db, ClubRound, id)
    return await _clubs_of_round(request, db, id)


@router.post("/rounds/{id}/clubs/", response_model=ClubAdminOut, status_code=201)
async def club_create(id: int, body: ClubIn, request: Request, db: DB, _: Manager):
    await _get_or_404(db, ClubRound, id)
    max_order = (await db.execute(select(func.coalesce(func.max(Club.order), 0)).where(Club.round_id == id))).scalar_one()
    club = Club(round_id=id, order=int(max_order) + 1, **body.model_dump())
    db.add(club)
    await db.commit()
    await db.refresh(club)
    return await _club_admin(request, db, club)


@router.patch("/clubs/{id}/", response_model=ClubAdminOut)
async def club_patch(id: int, body: ClubPatch, request: Request, db: DB, _: Manager):
    club = await _get_or_404(db, Club, id)
    data = body.model_dump(exclude_unset=True)
    merged = {k: data.get(k, getattr(club, k)) for k in
              ("registration_start", "registration_end", "is_paid", "fee", "fee_note", "capacity")}
    if merged["registration_start"] >= merged["registration_end"]:
        raise FieldError("registration_end", "Дуусах хугацаа эхлэх хугацаанаас хойш байх ёстой.")
    if merged["is_paid"] and merged["fee"] < 1:
        raise FieldError("fee", "Төлбөртэй дугуйлангийн дүн 1-ээс их байх ёстой.")
    if not merged["is_paid"]:
        data["fee"], data["fee_note"] = 0, ""
    taken = (await taken_counts(db, [club.id])).get(club.id, 0)
    if merged["capacity"] < taken:
        raise FieldError("capacity", f"Бүртгэгдсэн {taken} сурагчаас бага байж болохгүй")
    for k, v in data.items():
        setattr(club, k, v)
    await db.commit()
    return await _club_admin(request, db, club)


@router.put("/rounds/{id}/clubs/order/", response_model=list[ClubAdminOut])
async def clubs_order(id: int, body: OrderIn, request: Request, db: DB, _: Manager):
    await _get_or_404(db, ClubRound, id)
    clubs = (await db.execute(select(Club).where(Club.round_id == id))).scalars().all()
    if sorted(body.ids) != sorted(c.id for c in clubs):
        raise FieldError("ids", "Ээлжийн бүх дугуйлангийн id байх ёстой.")
    pos = {cid: i + 1 for i, cid in enumerate(body.ids)}
    for c in clubs:
        c.order = pos[c.id]
    await db.commit()
    return await _clubs_of_round(request, db, id)


@router.delete("/clubs/{id}/", status_code=204)
async def club_delete(id: int, db: DB, _: Manager):
    club = await _get_or_404(db, Club, id)
    if await _has_registrations(db, club_id=club.id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Бүртгэлтэй дугуйланг устгах боломжгүй")
    files = [i.file for i in club.images]
    await db.delete(club)
    await db.commit()
    for f in files:
        delete_file(f)
```

`backend/app/main.py`: `from .clubs.router_admin import router as clubs_admin_router`, `app.include_router(clubs_admin_router)` (`clubs_public_router`-ийн дараа).

- [ ] **Step 3: Тест ажиллуулах**

Run: `cd backend && uv run pytest tests/test_clubs_admin.py -q` → Expected: 7 passed. `uv run pytest -q` бүгд ногоон.

- [ ] **Step 4: Stage**

```bash
git add backend/app/clubs/router_admin.py backend/app/main.py backend/tests/test_clubs_admin.py
```

---

### Task 6: Менежерийн API — зураг, бүртгэлийн жагсаалт, хасах, Excel

**Files:**
- Create: `backend/app/clubs/export.py`
- Modify: `backend/app/clubs/router_admin.py`, `backend/tests/test_clubs_admin.py`

**Interfaces:**
- Consumes: Task 5 router (`_get_or_404`, `_club_admin`, `Manager`, `DB`), `save_upload`, `delete_file`, `RegistrationAdminOut`, `RegistrationPatch`, `OrderIn`.
- Produces: `POST /clubs/{id}/images/` (multipart `image`) → `ClubAdminOut`; `DELETE /images/{id}/` → `ClubAdminOut`; `PUT /clubs/{id}/images/order/` → `ClubAdminOut`; `GET /clubs/{id}/registrations/` → `list[RegistrationAdminOut]`; `POST /registrations/{id}/remove/` → `RegistrationAdminOut`; `PATCH /registrations/{id}/` → `RegistrationAdminOut`; `GET /rounds/{id}/registrations.xlsx`; `export.build_registrations_xlsx(rows: list[tuple[str, bool, ClubRegistration]]) -> bytes` (мөр = (дугуйлангийн нэр, төлбөртэй эсэх, бүртгэл)).

- [ ] **Step 1: Тест бичих**

`backend/tests/test_clubs_admin.py` төгсгөлд:

```python
import io

from PIL import Image


def png_bytes(color=(30, 58, 143)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (40, 30), color).save(buf, format="PNG")
    return buf.getvalue()


async def test_club_images_upload_order_delete(client, db, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    s = await seed_clubs(db)
    h = await manager_headers(client, make_user)
    r = await client.post(f"{A}/clubs/{s.chess_id}/images/", headers=h, files={"image": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 201, r.text
    r = await client.post(f"{A}/clubs/{s.chess_id}/images/", headers=h, files={"image": ("b.png", png_bytes((255, 0, 0)), "image/png")})
    imgs = r.json()["images"]
    assert len(imgs) == 2 and [i["order"] for i in imgs] == [1, 2] and "/media/clubs/" in imgs[0]["url"]
    rel0 = imgs[0]["url"].split("/media/")[1]
    assert (tmp_path / rel0).exists()
    r = await client.post(f"{A}/clubs/{s.chess_id}/images/", headers=h, files={"image": ("t.txt", b"hello", "text/plain")})
    assert r.status_code == 400 and "image" in r.json()
    # эрэмбэ
    r = await client.put(f"{A}/clubs/{s.chess_id}/images/order/", headers=h, json={"ids": [imgs[1]["id"], imgs[0]["id"]]})
    assert r.status_code == 200 and [i["id"] for i in r.json()["images"]] == [imgs[1]["id"], imgs[0]["id"]]
    r = await client.put(f"{A}/clubs/{s.chess_id}/images/order/", headers=h, json={"ids": [imgs[0]["id"]]})
    assert r.status_code == 400
    # олон нийтэд харагдана
    pub = {c["name"]: c for c in (await client.get("/api/clubs/")).json()["clubs"]}
    assert len(pub["Шатар"]["images"]) == 2
    # устгах
    r = await client.delete(f"{A}/images/{imgs[0]['id']}/", headers=h)
    assert r.status_code == 200 and len(r.json()["images"]) == 1 and not (tmp_path / rel0).exists()
    assert (await client.delete(f"{A}/images/{imgs[0]['id']}/", headers=h)).status_code == 404
    # дугуйлан устгахад файл устана
    rel1 = r.json()["images"][0]["url"].split("/media/")[1]
    assert (await client.delete(f"{A}/clubs/{s.chess_id}/", headers=h)).status_code == 204
    assert not (tmp_path / rel1).exists()


async def add_reg(db, s, club_id, email, grade, **over):
    from app.clubs.models import ClubRegistration
    d = dict(club_id=club_id, round_id=s.round_id, email=email, student_last_name="Бат", student_first_name="Дорж",
             guardian_last_name="Дорж", guardian_first_name="Сүх", phone="99001122", grade=grade)
    d.update(over)
    reg = ClubRegistration(**d)
    db.add(reg)
    await db.flush()
    return reg.id


async def test_registrations_list_remove_paid(client, db, make_user):
    s = await seed_clubs(db)
    h = await manager_headers(client, make_user)
    r1 = await add_reg(db, s, s.chess_id, "a@shineue.edu.mn", 5)
    r2 = await add_reg(db, s, s.chess_id, "b@shineue.edu.mn", 6, status="removed")
    r3 = await add_reg(db, s, s.robot_id, "c@shineue.edu.mn", 9)
    lst = (await client.get(f"{A}/clubs/{s.chess_id}/registrations/", headers=h)).json()
    assert [x["id"] for x in lst] == [r1, r2] and lst[0]["status"] == "confirmed" and lst[1]["status"] == "removed"
    assert lst[0]["email"] == "a@shineue.edu.mn" and lst[0]["is_paid_marked"] is False and lst[0]["removed_at"] is None
    # төлсөн тэмдэглэх
    r = await client.patch(f"{A}/registrations/{r3}/", headers=h, json={"is_paid_marked": True})
    assert r.status_code == 200 and r.json()["is_paid_marked"] is True
    # хасах → слот суларна
    r = await client.post(f"{A}/registrations/{r1}/remove/", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "removed" and r.json()["removed_at"]
    assert (await client.post(f"{A}/registrations/{r1}/remove/", headers=h)).status_code == 409
    pub = {c["name"]: c for c in (await client.get("/api/clubs/")).json()["clubs"]}
    assert pub["Шатар"]["taken"] == 0
    assert (await client.get(f"{A}/clubs/999999/registrations/", headers=h)).status_code == 404


async def test_registrations_xlsx(client, db, make_user):
    from openpyxl import load_workbook
    s = await seed_clubs(db)
    h = await manager_headers(client, make_user)
    await add_reg(db, s, s.chess_id, "a@shineue.edu.mn", 5)
    await add_reg(db, s, s.robot_id, "c@shineue.edu.mn", 9, is_paid_marked=True)
    await add_reg(db, s, s.chess_id, "b@shineue.edu.mn", 6, status="removed")
    r = await client.get(f"{A}/rounds/{s.round_id}/registrations.xlsx", headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    assert "attachment" in r.headers["content-disposition"]
    ws = load_workbook(io.BytesIO(r.content)).active
    rows = list(ws.iter_rows(values_only=True))
    assert rows[0] == ("Дугуйлан", "Анги", "Сурагчийн овог", "Сурагчийн нэр", "Бүртгүүлэгчийн овог", "Бүртгүүлэгчийн нэр",
                       "Утас", "Имэйл", "Төлөв", "Төлбөр", "Огноо")
    assert len(rows) == 4
    by_email = {r[7]: r for r in rows[1:]}
    assert by_email["a@shineue.edu.mn"][0] == "Шатар" and by_email["a@shineue.edu.mn"][8] == "Бүртгэгдсэн" and by_email["a@shineue.edu.mn"][9] == "—"
    assert by_email["c@shineue.edu.mn"][9] == "Төлсөн" and by_email["b@shineue.edu.mn"][8] == "Хасагдсан"
    assert (await client.get(f"{A}/rounds/999999/registrations.xlsx", headers=h)).status_code == 404
```

Run: `cd backend && uv run pytest tests/test_clubs_admin.py -q` → Expected: шинэ 3 тест FAIL.

- [ ] **Step 2: Excel export бичих**

`backend/app/clubs/export.py`:

```python
"""Ээлжийн бүртгэлийг Excel (.xlsx) болгох."""

import io

from openpyxl import Workbook
from openpyxl.styles import Font

from .models import REG_CONFIRMED, ClubRegistration

HEADERS = ("Дугуйлан", "Анги", "Сурагчийн овог", "Сурагчийн нэр", "Бүртгүүлэгчийн овог", "Бүртгүүлэгчийн нэр",
           "Утас", "Имэйл", "Төлөв", "Төлбөр", "Огноо")


def build_registrations_xlsx(rows: list[tuple[str, bool, ClubRegistration]]) -> bytes:
    """rows: (дугуйлангийн нэр, дугуйлан төлбөртэй эсэх, бүртгэл)."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Бүртгэл"
    ws.append(HEADERS)
    for c in ws[1]:
        c.font = Font(bold=True)
    for name, is_paid, r in rows:
        paid = "—" if not is_paid else ("Төлсөн" if r.is_paid_marked else "Төлөөгүй")
        ws.append((name, r.grade, r.student_last_name, r.student_first_name, r.guardian_last_name,
                   r.guardian_first_name, r.phone, r.email,
                   "Бүртгэгдсэн" if r.status == REG_CONFIRMED else "Хасагдсан", paid,
                   r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else ""))
    for col, width in zip("ABCDEFGHIJK", (22, 6, 16, 16, 18, 18, 14, 28, 12, 10, 17)):
        ws.column_dimensions[col].width = width
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
```

- [ ] **Step 3: Endpoint-ууд бичих**

`backend/app/clubs/router_admin.py`-д импорт нэмнэ: `import asyncio`, `from fastapi import File, Response, UploadFile`, `from ..common.media import save_upload`, `from .export import build_registrations_xlsx`, `from .schemas import RegistrationAdminOut, RegistrationPatch`, `from .models import REG_REMOVED`. Төгсгөлд:

```python
# ---- зураг ----
@router.post("/clubs/{id}/images/", response_model=ClubAdminOut, status_code=201)
async def image_add(id: int, request: Request, db: DB, _: Manager, image: Annotated[UploadFile, File()]):
    club = await _get_or_404(db, Club, id)
    rel = await save_upload(image, "clubs")
    max_order = max((i.order for i in club.images), default=0)
    db.add(ClubImage(club_id=club.id, file=rel, order=max_order + 1))
    await db.commit()
    await db.refresh(club)
    return await _club_admin(request, db, club)


@router.delete("/images/{id}/", response_model=ClubAdminOut)
async def image_delete(id: int, request: Request, db: DB, _: Manager):
    img = await _get_or_404(db, ClubImage, id)
    club_id, rel = img.club_id, img.file
    await db.delete(img)
    await db.commit()
    delete_file(rel)
    club = await _get_or_404(db, Club, club_id)
    await db.refresh(club)
    return await _club_admin(request, db, club)


@router.put("/clubs/{id}/images/order/", response_model=ClubAdminOut)
async def images_order(id: int, body: OrderIn, request: Request, db: DB, _: Manager):
    club = await _get_or_404(db, Club, id)
    if sorted(body.ids) != sorted(i.id for i in club.images):
        raise FieldError("ids", "Дугуйлангийн бүх зургийн id байх ёстой.")
    pos = {iid: i + 1 for i, iid in enumerate(body.ids)}
    for img in club.images:
        img.order = pos[img.id]
    await db.commit()
    await db.refresh(club)
    return await _club_admin(request, db, club)


# ---- бүртгэл ----
def _reg_order():
    # confirmed эхэнд, дараа нь removed; тус бүр огноогоор
    return ((ClubRegistration.status != REG_CONFIRMED), ClubRegistration.created_at, ClubRegistration.id)


@router.get("/clubs/{id}/registrations/", response_model=list[RegistrationAdminOut])
async def registrations_list(id: int, db: DB, _: Manager):
    await _get_or_404(db, Club, id)
    q = select(ClubRegistration).where(ClubRegistration.club_id == id).order_by(*_reg_order())
    return (await db.execute(q)).scalars().all()


@router.post("/registrations/{id}/remove/", response_model=RegistrationAdminOut)
async def registration_remove(id: int, db: DB, _: Manager):
    reg = await _get_or_404(db, ClubRegistration, id)
    if reg.status == REG_REMOVED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Энэ бүртгэл аль хэдийн хасагдсан")
    reg.status, reg.removed_at = REG_REMOVED, datetime.now(UTC)
    await db.commit()
    return reg


@router.patch("/registrations/{id}/", response_model=RegistrationAdminOut)
async def registration_patch(id: int, body: RegistrationPatch, db: DB, _: Manager):
    reg = await _get_or_404(db, ClubRegistration, id)
    reg.is_paid_marked = body.is_paid_marked
    await db.commit()
    return reg


@router.get("/rounds/{id}/registrations.xlsx")
async def registrations_xlsx(id: int, db: DB, _: Manager):
    await _get_or_404(db, ClubRound, id)
    q = (select(ClubRegistration, Club.name, Club.is_paid).join(Club, Club.id == ClubRegistration.club_id)
         .where(ClubRegistration.round_id == id).order_by(Club.order, Club.id, *_reg_order()))
    rows = [(name, is_paid, reg) for reg, name, is_paid in (await db.execute(q)).all()]
    data = await asyncio.to_thread(build_registrations_xlsx, rows)
    return Response(data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": f'attachment; filename="clubs-{id}.xlsx"'})
```

- [ ] **Step 4: Тест ажиллуулах**

Run: `cd backend && uv run pytest tests/test_clubs_admin.py tests/test_clubs_public.py -q` → Expected: 28 passed. `uv run pytest -q` бүгд ногоон (108 + 28 = 136).

- [ ] **Step 5: Stage**

```bash
git add backend/app/clubs/export.py backend/app/clubs/router_admin.py backend/tests/test_clubs_admin.py
```

---

### Task 7: Frontend — төрөл, API клиент, `/clubs` хуудас (анги сонголт, картууд, галерей)

**Files:**
- Create: `frontend/src/lib/clubs-api.ts`, `frontend/src/components/clubs/format.ts`, `frontend/src/components/clubs/GradePicker.tsx`, `frontend/src/components/clubs/ClubCard.tsx`, `frontend/src/components/clubs/ClubGallery.tsx`, `frontend/src/components/clubs/ClubsPage.tsx`, `frontend/src/app/clubs/page.tsx`
- Modify: `frontend/src/lib/types.ts`, `frontend/src/lib/api.ts`, `frontend/src/lib/home-data.ts:46-54`, `frontend/src/components/home/SiteFooter.tsx:5-12`

**Interfaces:**
- Consumes: backend `GET /api/clubs/`, `POST /api/clubs/email/send/`, `/email/verify/`, `/registrations/`, `/api/clubs/admin/*` (Task 2–6 хариунууд).
- Produces: `types.ts` — `ClubState`, `ClubImage`, `ClubRoundRef`, `Club`, `ClubsResponse`, `ClubAdmin`, `ClubInput`, `ClubRound`, `ClubRegistrationInput`, `ClubRegistration`, `ClubRegistrationAdmin`; `api.clubs.{sendCode, verifyCode, register}`, `api.clubsAdmin.{rounds.{list,create,update,remove,exportUrl}, clubs.{list,create,update,remove,reorder}, images.{add,remove,reorder}, registrations.{list,remove,setPaid}}`; `fetchClubs()`; `format.ts` — `EMAIL_DOMAIN`, `STATE_LABEL`, `STATE_TONE`, `formatGrades(grades)`, `formatFee(c)`, `formatPeriod(c)`; `ClubCard` props `{ club, onRegister(club) }`; `ClubsPage` нь `onRegister`-д `setTarget(club)` хийнэ — диалог Task 8-д ирнэ.

- [ ] **Step 1: Төрөл нэмэх**

`frontend/src/lib/types.ts` төгсгөлд:

```ts
/* ---- Дугуйлан ---- */
export type ClubState = "upcoming" | "open" | "full" | "closed";
export interface ClubImage { id: number; url: string; order: number }
export interface ClubRoundRef { id: number; name: string }
export interface Club {
  id: number;
  name: string;
  description: string;
  grades: number[];
  capacity: number;
  taken: number;
  slots_left: number;
  state: ClubState;
  is_paid: boolean;
  fee: number;
  fee_note: string;
  registration_start: string;   // ISO datetime
  registration_end: string;
  images: ClubImage[];
}
export interface ClubsResponse { round: ClubRoundRef | null; clubs: Club[] }
export interface ClubAdmin extends Club { is_published: boolean; order: number; round_id: number }
export interface ClubInput {
  name: string;
  description: string;
  grades: number[];
  capacity: number;
  is_paid: boolean;
  fee: number;
  fee_note: string;
  registration_start: string;
  registration_end: string;
  is_published: boolean;
}
export interface ClubRound { id: number; name: string; is_active: boolean; clubs_count: number; registrations_count: number; created_at: string }
export interface ClubRegistrationInput {
  token: string;
  club_id: number;
  grade: number;
  student_last_name: string;
  student_first_name: string;
  guardian_last_name: string;
  guardian_first_name: string;
  phone: string;
}
export interface ClubRegistration {
  id: number;
  club: { id: number; name: string; is_paid: boolean; fee: number; fee_note: string };
  email: string;
  student_last_name: string;
  student_first_name: string;
  guardian_last_name: string;
  guardian_first_name: string;
  phone: string;
  grade: number;
  created_at: string;
}
export interface ClubRegistrationAdmin {
  id: number;
  email: string;
  student_last_name: string;
  student_first_name: string;
  guardian_last_name: string;
  guardian_first_name: string;
  phone: string;
  grade: number;
  status: "confirmed" | "removed";
  is_paid_marked: boolean;
  created_at: string;
  removed_at: string | null;
}
```

- [ ] **Step 2: API клиент**

`frontend/src/lib/api.ts`: import жагсаалтад `Club, ClubAdmin, ClubInput, ClubRegistration, ClubRegistrationAdmin, ClubRegistrationInput, ClubRound, ClubsResponse` нэмнэ. `api` объектын `timetable`-ийн дараа:

```ts
  /* ---- дугуйлан (олон нийт) ---- */
  clubs: {
    list: (grade?: number) => request<ClubsResponse>(`/api/clubs/${q({ grade })}`, { auth: false }),
    sendCode: (email: string) => request<{ ok: boolean; expires_in: number }>("/api/clubs/email/send/", { method: "POST", body: { email }, auth: false }),
    verifyCode: (email: string, code: string) => request<{ token: string; expires_in: number }>("/api/clubs/email/verify/", { method: "POST", body: { email, code }, auth: false }),
    register: (d: ClubRegistrationInput) => request<ClubRegistration>("/api/clubs/registrations/", { method: "POST", body: d, auth: false }),
  },

  /* ---- дугуйлан (менежер) ---- */
  clubsAdmin: {
    rounds: {
      list: () => request<ClubRound[]>("/api/clubs/admin/rounds/"),
      create: (name: string) => request<ClubRound>("/api/clubs/admin/rounds/", { method: "POST", body: { name } }),
      update: (id: number, d: { name?: string; is_active?: boolean }) => request<ClubRound>(`/api/clubs/admin/rounds/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/clubs/admin/rounds/${id}/`, { method: "DELETE" }),
      /** Excel татах: staff токентой fetch → blob (api.clubsAdmin.rounds.downloadXlsx) */
      exportUrl: (id: number) => `${API_URL}/api/clubs/admin/rounds/${id}/registrations.xlsx`,
      async downloadXlsx(id: number): Promise<Blob> {
        const t = tokens.get();
        const res = await fetch(`${API_URL}/api/clubs/admin/rounds/${id}/registrations.xlsx`, { headers: t ? { Authorization: `Bearer ${t.access}` } : {} });
        if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
        return res.blob();
      },
    },
    clubs: {
      list: (roundId: number) => request<ClubAdmin[]>(`/api/clubs/admin/rounds/${roundId}/clubs/`),
      create: (roundId: number, d: ClubInput) => request<ClubAdmin>(`/api/clubs/admin/rounds/${roundId}/clubs/`, { method: "POST", body: d }),
      update: (id: number, d: Partial<ClubInput>) => request<ClubAdmin>(`/api/clubs/admin/clubs/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/clubs/admin/clubs/${id}/`, { method: "DELETE" }),
      reorder: (roundId: number, ids: number[]) => request<ClubAdmin[]>(`/api/clubs/admin/rounds/${roundId}/clubs/order/`, { method: "PUT", body: { ids } }),
    },
    images: {
      add: (clubId: number, file: File) => { const fd = new FormData(); fd.append("image", file); return request<ClubAdmin>(`/api/clubs/admin/clubs/${clubId}/images/`, { method: "POST", body: fd }); },
      remove: (imageId: number) => request<ClubAdmin>(`/api/clubs/admin/images/${imageId}/`, { method: "DELETE" }),
      reorder: (clubId: number, ids: number[]) => request<ClubAdmin>(`/api/clubs/admin/clubs/${clubId}/images/order/`, { method: "PUT", body: { ids } }),
    },
    registrations: {
      list: (clubId: number) => request<ClubRegistrationAdmin[]>(`/api/clubs/admin/clubs/${clubId}/registrations/`),
      remove: (id: number) => request<ClubRegistrationAdmin>(`/api/clubs/admin/registrations/${id}/remove/`, { method: "POST" }),
      setPaid: (id: number, is_paid_marked: boolean) => request<ClubRegistrationAdmin>(`/api/clubs/admin/registrations/${id}/`, { method: "PATCH", body: { is_paid_marked } }),
    },
  },
```

`Club` төрлийг импортлосон ч ашиглаагүй бол (`ClubsResponse` л хэрэгтэй) `Club`-ийг импортоос хасна (eslint `no-unused-vars`).

`frontend/src/lib/clubs-api.ts`:

```ts
/* Server-side fetch (дугуйлангийн хуудас). Алдаанд null; 60 сек revalidate. olympiad-api.ts-тэй ижил загвар. */

import type { ClubsResponse } from "./types";

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function fetchClubs(): Promise<ClubsResponse | null> {
  try {
    const res = await fetch(`${API}/api/clubs/`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as ClubsResponse;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Формат туслахууд**

`frontend/src/components/clubs/format.ts`:

```ts
/* Дугуйлангийн текст форматууд (олон нийт + админ хоёуланд). */

import type { Club, ClubState } from "@/lib/types";

export const EMAIL_DOMAIN = "shineue.edu.mn";
export const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export const STATE_LABEL: Record<ClubState, string> = { upcoming: "Удахгүй", open: "Бүртгэл нээлттэй", full: "Дүүрсэн", closed: "Хаагдсан" };
export const STATE_TONE: Record<ClubState, "slate" | "green" | "red"> = { upcoming: "slate", open: "green", full: "red", closed: "slate" };

/** [5,6,7,8] → "5–8-р анги"; [5,7,9] → "5, 7, 9-р анги"; [5] → "5-р анги" */
export function formatGrades(grades: number[]): string {
  const g = [...grades].sort((a, b) => a - b);
  if (g.length === 0) return "";
  const consecutive = g.every((v, i) => i === 0 || v === g[i - 1] + 1);
  const body = g.length > 1 && consecutive ? `${g[0]}–${g[g.length - 1]}` : g.join(", ");
  return `${body}-р анги`;
}

export function formatFee(c: Pick<Club, "is_paid" | "fee" | "fee_note">): string {
  if (!c.is_paid) return "Үнэгүй";
  const amount = `${c.fee.toLocaleString("en-US")}₮`;
  return c.fee_note ? `${amount} · ${c.fee_note}` : amount;
}

const pad = (n: number) => String(n).padStart(2, "0");
const md = (d: Date) => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

/** "09.25 – 10.05, 18:00 хүртэл" (локал цагаар) */
export function formatPeriod(c: Pick<Club, "registration_start" | "registration_end">): string {
  const s = new Date(c.registration_start), e = new Date(c.registration_end);
  return `${md(s)} – ${md(e)}, ${pad(e.getHours())}:${pad(e.getMinutes())} хүртэл`;
}
```

- [ ] **Step 4: GradePicker, ClubGallery, ClubCard**

`frontend/src/components/clubs/GradePicker.tsx`:

```tsx
"use client";

/* 1–12-р анги сонгох товчнууд; утсан дээр хэвтээ гүйлгэнэ. null = бүх анги. */

import { GRADES } from "./format";

export function GradePicker({ value, onChange }: { value: number | null; onChange: (g: number | null) => void }) {
  const btn = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? "border-navy bg-navy text-white" : "border-line bg-white text-navy hover:bg-navy/10"}`;
  return (
    <div role="group" aria-label="Анги сонгох" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      <button type="button" className={btn(value === null)} aria-pressed={value === null} onClick={() => onChange(null)}>Бүх анги</button>
      {GRADES.map((g) => (
        <button key={g} type="button" className={btn(value === g)} aria-pressed={value === g} onClick={() => onChange(g)}>{g}-р анги</button>
      ))}
    </div>
  );
}
```

`frontend/src/components/clubs/ClubGallery.tsx`:

```tsx
"use client";

/* Дугуйлангийн зургийн галерей: <dialog>, prev/next, тоолуур, Esc. */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ClubImage } from "@/lib/types";

export function ClubGallery({ images, name, open, onClose }: { images: ClubImage[]; name: string; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  if (!images.length) return null;
  const prev = () => setI((v) => (v - 1 + images.length) % images.length);
  const next = () => setI((v) => (v + 1) % images.length);
  const img = images[Math.min(i, images.length - 1)];

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}
            className="m-auto w-[min(96vw,900px)] rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/70"
            aria-label={`${name} — зургууд`}>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-navy">{name} · {i + 1}/{images.length}</span>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Хаах">✕</button>
      </div>
      <div className="relative aspect-[4/3] w-full bg-slate-100">
        <Image key={img.id} src={img.url} alt="" fill unoptimized className="object-contain" />
        {images.length > 1 && (
          <>
            <button type="button" onClick={prev} aria-label="Өмнөх" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg text-navy shadow">‹</button>
            <button type="button" onClick={next} aria-label="Дараах" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg text-navy shadow">›</button>
          </>
        )}
      </div>
    </dialog>
  );
}
```

`frontend/src/components/clubs/ClubCard.tsx`:

```tsx
"use client";

/* Дугуйлангийн карт: нүүр зураг, нэр, анги, тайлбар (дэлгэрэнгүй toggle), төлбөр, хугацаа, слот, төлөв, "Бүртгүүлэх". */

import Image from "next/image";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import type { Club } from "@/lib/types";
import { ClubGallery } from "./ClubGallery";
import { STATE_LABEL, STATE_TONE, formatFee, formatGrades, formatPeriod } from "./format";

const MAX_SLOT_SQUARES = 40;

export function ClubCard({ club, onRegister }: { club: Club; onRegister: (club: Club) => void }) {
  const [more, setMore] = useState(false);
  const [gallery, setGallery] = useState(false);
  const cover = club.images[0];
  const long = club.description.length > 160 || club.description.split("\n").length > 3;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <button type="button" onClick={() => cover && setGallery(true)} disabled={!cover}
              className="relative aspect-[16/9] w-full bg-paper-3 text-left disabled:cursor-default" aria-label={cover ? `${club.name} — зургууд үзэх` : undefined}>
        {cover ? (
          <Image src={cover.url} alt="" fill unoptimized className="object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center font-display text-5xl font-extrabold text-navy/30">{club.name.slice(0, 1)}</span>
        )}
        {club.images.length > 1 && <span className="absolute bottom-2 right-2 rounded-full bg-navy/80 px-2 py-0.5 text-xs font-semibold text-white">{club.images.length} зураг</span>}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-extrabold text-navy">{club.name}</h3>
            <p className="text-sm text-muted">{formatGrades(club.grades)}</p>
          </div>
          <Badge tone={STATE_TONE[club.state]}>{STATE_LABEL[club.state]}</Badge>
        </div>

        {club.description && (
          <div>
            <p className={`whitespace-pre-line text-sm text-ink ${more ? "" : "line-clamp-3"}`}>{club.description}</p>
            {long && <button type="button" onClick={() => setMore((v) => !v)} className="mt-1 text-sm font-semibold text-navy hover:underline">{more ? "Хураах" : "Дэлгэрэнгүй"}</button>}
          </div>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted">Төлбөр</dt><dd className="font-semibold text-ink">{formatFee(club)}</dd>
          <dt className="text-muted">Хугацаа</dt><dd className="text-ink">{formatPeriod(club)}</dd>
        </dl>

        <div className="mt-auto space-y-2">
          {club.capacity <= MAX_SLOT_SQUARES && (
            <div className="flex flex-wrap gap-1" aria-hidden="true">
              {Array.from({ length: club.capacity }, (_, i) => (
                <span key={i} className={`h-3 w-3 rounded-sm ${i < club.taken ? "bg-navy" : "border border-navy/40 bg-white"}`} />
              ))}
            </div>
          )}
          <p className="text-sm text-muted"><span className="font-semibold text-navy">{club.slots_left}</span>/{club.capacity} сул</p>
          <Button className="w-full" disabled={club.state !== "open"} onClick={() => onRegister(club)}>
            {club.state === "open" ? "Бүртгүүлэх" : STATE_LABEL[club.state]}
          </Button>
        </div>
      </div>

      <ClubGallery images={club.images} name={club.name} open={gallery} onClose={() => setGallery(false)} />
    </article>
  );
}
```

`Badge`-д `red` tone байхгүй — `frontend/src/components/ui.tsx`-ийн `Badge` tones-д `red: "bg-red-100 text-red-800"` нэмж, `tone` төрөлд `"red"` нэмнэ.

- [ ] **Step 5: ClubsPage + page.tsx + цэс**

`frontend/src/components/clubs/ClubsPage.tsx`:

```tsx
"use client";

/* Дугуйлангийн хуудасны client хэсэг: анги сонгох (?grade= URL-д), картууд, бүртгэлийн диалог. */

import { useState } from "react";
import { Empty } from "@/components/ui";
import type { Club, ClubsResponse } from "@/lib/types";
import { ClubCard } from "./ClubCard";
import { GradePicker } from "./GradePicker";

export function ClubsPage({ data, initialGrade }: { data: ClubsResponse | null; initialGrade: number | null }) {
  const [grade, setGrade] = useState<number | null>(initialGrade);
  const [target, setTarget] = useState<Club | null>(null);

  function pick(g: number | null) {
    setGrade(g);
    const url = new URL(window.location.href);
    if (g === null) url.searchParams.delete("grade"); else url.searchParams.set("grade", String(g));
    window.history.replaceState(null, "", url);
  }

  if (!data) return <Empty>Мэдээлэл түр байхгүй. Дараа дахин оролдоно уу.</Empty>;
  if (!data.round) return <Empty>Одоогоор зарлагдсан дугуйлан байхгүй.</Empty>;
  const clubs = grade === null ? data.clubs : data.clubs.filter((c) => c.grades.includes(grade));

  return (
    <div className="space-y-6">
      <p className="text-base text-muted">{data.round.name}</p>
      <GradePicker value={grade} onChange={pick} />
      {clubs.length === 0 ? (
        <Empty>{grade === null ? "Одоогоор зарлагдсан дугуйлан байхгүй." : `${grade}-р ангид зарлагдсан дугуйлан байхгүй.`}</Empty>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {clubs.map((c) => <ClubCard key={c.id} club={c} onRegister={setTarget} />)}
        </div>
      )}
      {/* Бүртгэлийн диалог Task 8-д: <RegisterDialog club={target} grade={grade} onClose={() => setTarget(null)} /> */}
      {target && <p className="sr-only">{target.name}</p>}
    </div>
  );
}
```

`frontend/src/app/clubs/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ClubsPage } from "@/components/clubs/ClubsPage";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { fetchClubs } from "@/lib/clubs-api";

export const metadata: Metadata = {
  title: "Дугуйлан — Шинэ Үе сургууль",
  description: "Шинэ Үе сургуулийн 1–12-р ангийн дугуйлангууд ба бүртгэл.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const sp = await searchParams;
  const g = Number(sp.grade);
  const initialGrade = Number.isInteger(g) && g >= 1 && g <= 12 ? g : null;
  const data = await fetchClubs();
  return (
    <>
      <SiteHeader />
      <main className="paper-grid flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 md:px-10 lg:px-24 lg:py-[72px]">
          <div>
            <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Дугуйлан</h1>
            <p className="mt-2 max-w-2xl text-base text-muted">Ангиа сонгоод дугуйлангуудыг үзнэ үү. Бүртгүүлэхэд сурагчийн @shineue.edu.mn имэйл шаардлагатай; нэг сурагч нэг ээлжид нэг л дугуйланд бүртгүүлнэ.</p>
          </div>
          <ClubsPage data={data} initialGrade={initialGrade} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
```

`searchParams` ашигласан тул хуудас dynamic болно; `fetchClubs` нь `revalidate: 60` кэштэй хэвээр.

`frontend/src/lib/home-data.ts` `NAV_LINKS`: `{ href: "/calendar", label: "Календарь" },` мөрийн дараа `{ href: "/clubs", label: "Дугуйлан" },`. `frontend/src/components/home/SiteFooter.tsx` `LINKS`: `/calendar` мөрийн дараа `{ href: "/clubs", label: "Дугуйлан" },`.

- [ ] **Step 6: Шалгах**

Run: `cd frontend && npx tsc --noEmit && node node_modules/eslint/bin/eslint.js src` → Expected: алдаагүй.

Browser: backend (`preview_start backend`) ажиллаж байхад `uv run python -c` эсвэл psql-ээр идэвхтэй ээлж + 2–3 дугуйлан үүсгэнэ (Task 5-ын API-г curl-ээр: superuser-ээр `/api/auth/token/` → `POST /api/clubs/admin/rounds/` → `PATCH is_active` → `POST /rounds/{id}/clubs/`). Дараа нь `preview_start frontend` → `/clubs`: анги сонгоход картууд шүүгдэж, URL `?grade=5` болж, badge/слот/төлбөр/хугацаа зөв, `/clubs?grade=5`-ээр орход анги сонгогдсон байх; `/`-ийн цэс, хөлд "Дугуйлан" харагдана; console алдаагүй; 375px-д картууд нэг багана, анги сонголт гүйлгэгдэнэ.

- [ ] **Step 7: Stage**

```bash
git add frontend/src/lib/types.ts frontend/src/lib/api.ts frontend/src/lib/clubs-api.ts frontend/src/components/clubs frontend/src/app/clubs frontend/src/lib/home-data.ts frontend/src/components/home/SiteFooter.tsx frontend/src/components/ui.tsx
```

---

### Task 8: Frontend — бүртгэлийн диалог (3 алхам)

**Files:**
- Create: `frontend/src/components/clubs/RegisterDialog.tsx`
- Modify: `frontend/src/components/clubs/ClubsPage.tsx`

**Interfaces:**
- Consumes: `api.clubs.sendCode/verifyCode/register`, `ApiError`, `Club`, `ClubRegistration`, `EMAIL_DOMAIN`, `formatFee`, `@/components/ui` (`Button, Field, Input, Select`).
- Produces: `RegisterDialog({ club: Club | null; grade: number | null; onClose(): void })` — `club` null бол хаалттай; амжилттай хаахад `router.refresh()`.

- [ ] **Step 1: RegisterDialog бичих**

`frontend/src/components/clubs/RegisterDialog.tsx`:

```tsx
"use client";

/* Бүртгэлийн диалог: 1 Имэйл → 2 Код → 3 Мэдээлэл → Амжилттай.
   Token 401 болвол кодын алхам руу буцна; `club` алдаа (дүүрсэн/хаагдсан) бол дээд хэсэгт улаанаар + router.refresh(). */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { Club, ClubRegistration } from "@/lib/types";
import { EMAIL_DOMAIN, formatFee } from "./format";

type Step = "email" | "code" | "form" | "done";
const STEPS: { key: Step; label: string }[] = [{ key: "email", label: "Имэйл" }, { key: "code", label: "Код" }, { key: "form", label: "Мэдээлэл" }];
const RESEND_SECONDS = 60;

const emptyForm = { student_last_name: "", student_first_name: "", guardian_last_name: "", guardian_first_name: "", phone: "" };

/* Ашиглагч `key={club?.id}` өгнө: дугуйлан солигдоход компонент дахин mount болж state шинээр эхэлнэ. */
export function RegisterDialog({ club, grade, onClose }: { club: Club | null; grade: number | null; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formGrade, setFormGrade] = useState<number>(() => (club ? (grade !== null && club.grades.includes(grade) ? grade : club.grades[0]) : 0));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [result, setResult] = useState<ClubRegistration | null>(null);

  // Нээх/хаах (state-д нөлөөлөхгүй — зөвхөн DOM)
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (club && !d.open) d.showModal();
    if (!club && d.open) d.close();
  }, [club]);

  // "Дахин илгээх" тоолуур
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  function fail(err: unknown, fallback: string) {
    if (err instanceof ApiError) {
      if (err.status === 401 && step === "form") { setToken(""); setStep("code"); setErrors({ code: err.message }); return; }
      const fe = err.fieldErrors;
      setErrors(Object.keys(fe).length ? fe : { non_field_errors: err.message || fallback });
      if (fe.club) router.refresh();
      return;
    }
    setErrors({ non_field_errors: fallback });
  }

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!addr.endsWith("@" + EMAIL_DOMAIN)) { setErrors({ email: `Зөвхөн @${EMAIL_DOMAIN} хаягаар бүртгүүлнэ` }); return; }
    setBusy(true); setErrors({});
    try {
      await api.clubs.sendCode(addr);
      setEmail(addr); setCode(""); setStep("code"); setResendIn(RESEND_SECONDS);
    } catch (err) { fail(err, "Код илгээж чадсангүй."); } finally { setBusy(false); }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      const r = await api.clubs.verifyCode(email, code.trim());
      setToken(r.token); setStep("form");
    } catch (err) { fail(err, "Кодыг шалгаж чадсангүй."); } finally { setBusy(false); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!club) return;
    setBusy(true); setErrors({});
    try {
      const r = await api.clubs.register({ token, club_id: club.id, grade: formGrade, ...form });
      setResult(r); setStep("done");
    } catch (err) { fail(err, "Бүртгэж чадсангүй."); } finally { setBusy(false); }
  }

  function close() {
    if (step === "done") router.refresh();
    onClose();
  }

  const set = (k: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const idx = STEPS.findIndex((s) => s.key === step);

  return (
    <dialog ref={ref} onClose={close} onClick={(e) => e.target === ref.current && close()}
            className="m-auto w-[min(96vw,520px)] rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/60" aria-label="Дугуйланд бүртгүүлэх">
      {club && (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold text-navy">{club.name}</h2>
              <p className="text-sm text-muted">Бүртгүүлэх</p>
            </div>
            <button type="button" onClick={close} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Хаах">✕</button>
          </div>

          {step !== "done" && (
            <ol className="mb-5 flex gap-2 text-xs font-semibold" aria-label="Алхмууд">
              {STEPS.map((s, i) => (
                <li key={s.key} aria-current={s.key === step ? "step" : undefined}
                    className={`flex flex-1 items-center gap-1.5 rounded-full px-3 py-1.5 ${i <= idx ? "bg-navy text-white" : "bg-paper-3 text-muted"}`}>
                  <span>{i + 1}</span><span>{s.label}</span>
                </li>
              ))}
            </ol>
          )}

          {errors.non_field_errors && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
          {errors.club && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.club}</p>}
          {errors.detail && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.detail}</p>}

          {step === "email" && (
            <form onSubmit={sendCode} className="space-y-4">
              <Field label="Сурагчийн имэйл" error={errors.email} hint={`Зөвхөн @${EMAIL_DOMAIN} хаяг. Баталгаажуулах код илгээнэ.`}>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`нэр@${EMAIL_DOMAIN}`} autoFocus required />
              </Field>
              <Button type="submit" className="w-full" disabled={busy}>Код илгээх</Button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={verify} className="space-y-4">
              <p className="text-sm text-ink"><span className="font-semibold">{email}</span> хаяг руу 6 оронтой код илгээлээ.</p>
              <Field label="Код" error={errors.code}>
                <Input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code}
                       onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="text-center text-2xl tracking-[0.4em]" autoFocus required />
              </Field>
              <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>Баталгаажуулах</Button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setStep("email"); setErrors({}); }} className="font-semibold text-navy hover:underline">Хаяг солих</button>
                <button type="button" onClick={() => sendCode()} disabled={busy || resendIn > 0} className="font-semibold text-navy hover:underline disabled:text-muted disabled:no-underline">
                  {resendIn > 0 ? `Дахин илгээх (${resendIn})` : "Дахин илгээх"}
                </button>
              </div>
            </form>
          )}

          {step === "form" && (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Сурагчийн овог" error={errors.student_last_name}><Input value={form.student_last_name} onChange={set("student_last_name")} maxLength={80} required autoFocus /></Field>
                <Field label="Сурагчийн нэр" error={errors.student_first_name}><Input value={form.student_first_name} onChange={set("student_first_name")} maxLength={80} required /></Field>
                <Field label="Бүртгүүлэгчийн овог" error={errors.guardian_last_name}><Input value={form.guardian_last_name} onChange={set("guardian_last_name")} maxLength={80} required /></Field>
                <Field label="Бүртгүүлэгчийн нэр" error={errors.guardian_first_name}><Input value={form.guardian_first_name} onChange={set("guardian_first_name")} maxLength={80} required /></Field>
                <Field label="Холбоо барих дугаар" error={errors.phone}><Input type="tel" value={form.phone} onChange={set("phone")} maxLength={30} required /></Field>
                <Field label="Анги" error={errors.grade}>
                  <Select value={formGrade} onChange={(e) => setFormGrade(Number(e.target.value))}>
                    {club.grades.map((g) => <option key={g} value={g}>{g}-р анги</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Имэйл"><Input value={email} readOnly className="bg-paper-2 text-muted" /></Field>
              <Button type="submit" className="w-full" disabled={busy}>Бүртгүүлэх</Button>
            </form>
          )}

          {step === "done" && result && (
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-emerald-900">
                <p className="font-semibold">✓ {result.student_last_name} {result.student_first_name} «{result.club.name}» дугуйланд бүртгэгдлээ</p>
                <p className="mt-1 text-sm">{result.email} · {result.grade}-р анги</p>
              </div>
              {result.club.is_paid && <p className="text-sm text-ink">Төлбөр: <span className="font-semibold">{formatFee(result.club)}</span> — сургууль дээр төлнө.</p>}
              <Button className="w-full" onClick={close}>Хаах</Button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
```

- [ ] **Step 2: ClubsPage-д холбох**

`frontend/src/components/clubs/ClubsPage.tsx`: `import { RegisterDialog } from "./RegisterDialog";` нэмж, `{/* Бүртгэлийн диалог Task 8-д … */}` ба `{target && <p className="sr-only">…</p>}` хоёр мөрийг дараахаар солино:

```tsx
      <RegisterDialog key={target?.id ?? "none"} club={target} grade={grade} onClose={() => setTarget(null)} />
```

- [ ] **Step 3: Шалгах**

Run: `cd frontend && npx tsc --noEmit && node node_modules/eslint/bin/eslint.js src` → Expected: алдаагүй.

Browser (`/clubs`, backend SMTP тохиргоогүй → код backend-ийн логт `preview_logs` дээр "Дугуйлангийн код"): "Бүртгүүлэх" → gmail хаяг → алдаа; `test1@shineue.edu.mn` → код алхам; буруу код → "Код буруу байна"; логоос код → мэдээлэл алхам; хоосон талбар → browser `required`; бүртгүүлэх → амжилттай дэлгэц; "Хаах" → картын слот 1-ээр багасна. Дахин ижил имэйлээр → "Энэ хаягаар «…» дугуйланд бүртгүүлсэн байна". Capacity 1 дугуйланд 2 дахь → "Дугуйлан дүүрсэн" + карт "Дүүрсэн". `Esc` → хаагдана. 375px-д диалог бүтэн өргөн.

- [ ] **Step 4: Stage**

```bash
git add frontend/src/components/clubs
```

---

### Task 9: Frontend — менежерийн хуудас `/admin/clubs` (ээлж, дугуйлан, форм)

**Files:**
- Create: `frontend/src/components/admin/clubs/datetime.ts`, `frontend/src/components/admin/clubs/RoundBar.tsx`, `frontend/src/components/admin/clubs/ClubForm.tsx`, `frontend/src/components/admin/clubs/ClubTable.tsx`, `frontend/src/app/admin/(dashboard)/clubs/page.tsx`
- Modify: `frontend/src/app/admin/(dashboard)/layout.tsx:13-23`

**Interfaces:**
- Consumes: `api.clubsAdmin.rounds/clubs`, `ClubRound`, `ClubAdmin`, `ClubInput`, `format.ts`, `useFetch`, `ui` primitives.
- Produces: `datetime.ts` — `toLocalInput(iso: string): string` (`YYYY-MM-DDTHH:mm` локал), `fromLocalInput(s: string): string` (ISO UTC); `RoundBar({ rounds, current, onSelect, onChanged })`; `ClubForm({ roundId, club: ClubAdmin | null, open, onClose, onSaved })`; `ClubTable({ clubs, onEdit, onChanged })`. `/admin/clubs/[id]` хуудас Task 10-д (энэ task-д "Бүртгэл/Зураг" холбоос 404 өгнө — хэвийн).

- [ ] **Step 1: NAV, datetime**

`frontend/src/app/admin/(dashboard)/layout.tsx` NAV: `{ href: "/admin/timetable", … role: "manager" },` мөрийн дараа `{ href: "/admin/clubs", label: "Дугуйлан", icon: "◎", role: "manager" },`.

`frontend/src/components/admin/clubs/datetime.ts`:

```ts
/* datetime-local ↔ ISO (локал цагаар). */

const pad = (n: number) => String(n).padStart(2, "0");

export function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(s: string): string {
  return s ? new Date(s).toISOString() : "";
}
```

- [ ] **Step 2: RoundBar**

`frontend/src/components/admin/clubs/RoundBar.tsx`:

```tsx
"use client";

/* Ээлжийн мөр: сонгох, шинэ, нэр засах, идэвхжүүлэх, устгах, Excel татах. */

import { useState } from "react";
import { Badge, Button, Input, Select } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { ClubRound } from "@/lib/types";

export function RoundBar({ rounds, current, onSelect, onChanged }: {
  rounds: ClubRound[]; current: ClubRound | null; onSelect: (id: number) => void; onChanged: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "new" | "rename">("idle");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, fallback: string) {
    setBusy(true); setError("");
    try { await fn(); onChanged(); setMode("idle"); }
    catch (e) { setError(e instanceof ApiError ? (e.fieldErrors.name ?? e.message) : fallback); }
    finally { setBusy(false); }
  }

  async function download() {
    if (!current) return;
    try {
      const blob = await api.clubsAdmin.rounds.downloadXlsx(current.id);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `clubs-${current.id}.xlsx`; a.click();
      URL.revokeObjectURL(a.href);
    } catch { alert("Excel татаж чадсангүй."); }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={current?.id ?? ""} onChange={(e) => onSelect(Number(e.target.value))} className="w-auto min-w-56" aria-label="Ээлж">
          {rounds.map((r) => <option key={r.id} value={r.id}>{r.name}{r.is_active ? " ✓" : ""}</option>)}
        </Select>
        {current?.is_active && <Badge tone="green">Идэвхтэй</Badge>}
        {current && <span className="text-sm text-slate-600">{current.clubs_count} дугуйлан · {current.registrations_count} бүртгэл</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => { setMode("new"); setName(""); setError(""); }}>+ Шинэ ээлж</Button>
          {current && (
            <>
              <Button variant="ghost" onClick={() => { setMode("rename"); setName(current.name); setError(""); }}>Нэр засах</Button>
              {!current.is_active && (
                <Button variant="secondary" onClick={() => confirm("Энэ ээлжийг идэвхжүүлэх үү? Бусад ээлж идэвхгүй болно.") &&
                  run(() => api.clubsAdmin.rounds.update(current.id, { is_active: true }), "Идэвхжүүлж чадсангүй.")}>Идэвхжүүлэх</Button>
              )}
              <Button variant="ghost" onClick={download}>Excel татах</Button>
              <Button variant="danger" onClick={() => confirm(`«${current.name}» ээлжийг устгах уу? Дугуйлангууд нь устана.`) &&
                run(() => api.clubsAdmin.rounds.remove(current.id), "Устгаж чадсангүй.")}>Устгах</Button>
            </>
          )}
        </div>
      </div>
      {mode !== "idle" && (
        <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault();
          run(() => mode === "new" ? api.clubsAdmin.rounds.create(name.trim()) : api.clubsAdmin.rounds.update(current!.id, { name: name.trim() }), "Хадгалж чадсангүй."); }}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ээлжийн нэр (ж: 2026–2027 намар)" maxLength={120} className="w-auto min-w-72" autoFocus required />
          <Button type="submit" disabled={busy}>{mode === "new" ? "Үүсгэх" : "Хадгалах"}</Button>
          <Button variant="ghost" type="button" onClick={() => setMode("idle")}>Болих</Button>
        </form>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: ClubForm**

`frontend/src/components/admin/clubs/ClubForm.tsx`:

```tsx
"use client";

/* Дугуйлан үүсгэх/засах форм (Modal). */

import { useState, type FormEvent } from "react";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";
import { GRADES } from "@/components/clubs/format";
import { api, ApiError } from "@/lib/api";
import type { ClubAdmin, ClubInput } from "@/lib/types";
import { fromLocalInput, toLocalInput } from "./datetime";

type Draft = Omit<ClubInput, "registration_start" | "registration_end" | "capacity" | "fee"> & { registration_start: string; registration_end: string; capacity: string; fee: string };

function toDraft(c: ClubAdmin | null): Draft {
  if (!c) return { name: "", description: "", grades: [], capacity: "20", is_paid: false, fee: "", fee_note: "", registration_start: "", registration_end: "", is_published: true };
  return { name: c.name, description: c.description, grades: c.grades, capacity: String(c.capacity), is_paid: c.is_paid, fee: c.fee ? String(c.fee) : "",
           fee_note: c.fee_note, registration_start: toLocalInput(c.registration_start), registration_end: toLocalInput(c.registration_end), is_published: c.is_published };
}

export function ClubForm({ roundId, club, open, onClose, onSaved }: { roundId: number; club: ClubAdmin | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(() => toDraft(club));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const up = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({});
    const body: ClubInput = {
      name: d.name.trim(), description: d.description, grades: d.grades, capacity: Number(d.capacity), is_paid: d.is_paid,
      fee: d.is_paid ? Number(d.fee || 0) : 0, fee_note: d.is_paid ? d.fee_note.trim() : "",
      registration_start: fromLocalInput(d.registration_start), registration_end: fromLocalInput(d.registration_end), is_published: d.is_published,
    };
    try {
      if (club) await api.clubsAdmin.clubs.update(club.id, body); else await api.clubsAdmin.clubs.create(roundId, body);
      onSaved(); onClose();
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  const toggleGrade = (g: number) => up("grades", d.grades.includes(g) ? d.grades.filter((x) => x !== g) : [...d.grades, g].sort((a, b) => a - b));

  return (
    <Modal open={open} title={club ? "Дугуйлан засах" : "Шинэ дугуйлан"} onClose={onClose}
           footer={<><Button variant="ghost" onClick={onClose}>Болих</Button><Button type="submit" form="club-form" disabled={busy}>Хадгалах</Button></>}>
      <form id="club-form" onSubmit={save} className="space-y-4">
        {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
        <Field label="Нэр" error={errors.name}><Input value={d.name} onChange={(e) => up("name", e.target.value)} maxLength={120} required /></Field>
        <Field label="Тайлбар" error={errors.description} hint="Олон мөр бичиж болно"><Textarea value={d.description} onChange={(e) => up("description", e.target.value)} maxLength={5000} /></Field>
        <Field label="Ангиуд" error={errors.grades}>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => up("grades", d.grades.length === 12 ? [] : [...GRADES])} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/10">Бүгд</button>
            {GRADES.map((g) => (
              <label key={g} className={`cursor-pointer rounded-full border px-3 py-1 text-sm font-semibold ${d.grades.includes(g) ? "border-navy bg-navy text-white" : "border-slate-300 text-slate-700"}`}>
                <input type="checkbox" className="sr-only" checked={d.grades.includes(g)} onChange={() => toggleGrade(g)} />{g}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Багтаамж (элсэх тоо)" error={errors.capacity}><Input type="number" min={1} max={1000} value={d.capacity} onChange={(e) => up("capacity", e.target.value)} required /></Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={d.is_paid} onChange={(e) => up("is_paid", e.target.checked)} />Төлбөртэй
          </label>
          {d.is_paid && (
            <>
              <Field label="Дүн (₮)" error={errors.fee}><Input type="number" min={1} value={d.fee} onChange={(e) => up("fee", e.target.value)} required /></Field>
              <Field label="Төлбөрийн тайлбар" error={errors.fee_note} hint="ж: сард, улиралд"><Input value={d.fee_note} onChange={(e) => up("fee_note", e.target.value)} maxLength={120} /></Field>
            </>
          )}
          <Field label="Бүртгэл эхлэх" error={errors.registration_start}><Input type="datetime-local" value={d.registration_start} onChange={(e) => up("registration_start", e.target.value)} required /></Field>
          <Field label="Бүртгэл дуусах" error={errors.registration_end}><Input type="datetime-local" value={d.registration_end} onChange={(e) => up("registration_end", e.target.value)} required /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={d.is_published} onChange={(e) => up("is_published", e.target.checked)} />Нийтлэх (олон нийтэд харагдана)
        </label>
      </form>
    </Modal>
  );
}
```

`ClubForm`-ийг ашиглагч `key`-ээр дахин mount хийнэ (`key={editing?.id ?? "new"}`), тэгвэл `useState(() => toDraft(club))` анхны утга зөв.

- [ ] **Step 4: ClubTable + page**

`frontend/src/components/admin/clubs/ClubTable.tsx`:

```tsx
"use client";

/* Ээлжийн дугуйлангийн хүснэгт: эрэмбэ ▲▼, төлөв, засах, бүртгэл/зураг, устгах. */

import Link from "next/link";
import { Badge, Button, Table, Td, Th } from "@/components/ui";
import { STATE_LABEL, STATE_TONE, formatFee, formatGrades, formatPeriod } from "@/components/clubs/format";
import { api, ApiError } from "@/lib/api";
import type { ClubAdmin } from "@/lib/types";

export function ClubTable({ clubs, onEdit, onChanged }: { clubs: ClubAdmin[]; onEdit: (c: ClubAdmin) => void; onChanged: () => void }) {
  async function move(i: number, dir: -1 | 1) {
    const ids = clubs.map((c) => c.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await api.clubsAdmin.clubs.reorder(clubs[0].round_id, ids); onChanged(); } catch { alert("Эрэмбийг хадгалж чадсангүй."); }
  }

  async function remove(c: ClubAdmin) {
    if (!confirm(`«${c.name}» дугуйланг устгах уу?`)) return;
    try { await api.clubsAdmin.clubs.remove(c.id); onChanged(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Устгаж чадсангүй."); }
  }

  return (
    <Table head={<><Th></Th><Th>Нэр</Th><Th>Анги</Th><Th>Бүртгэл</Th><Th>Төлбөр</Th><Th>Хугацаа</Th><Th>Төлөв</Th><Th></Th></>}>
      {clubs.map((c, i) => (
        <tr key={c.id}>
          <Td className="whitespace-nowrap">
            <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-navy disabled:opacity-30" aria-label="Дээш">▲</button>
            <button onClick={() => move(i, 1)} disabled={i === clubs.length - 1} className="px-1 text-navy disabled:opacity-30" aria-label="Доош">▼</button>
          </Td>
          <Td className="font-semibold text-navy">{c.name}</Td>
          <Td>{formatGrades(c.grades)}</Td>
          <Td><span className="font-semibold">{c.taken}</span>/{c.capacity}</Td>
          <Td>{formatFee(c)}</Td>
          <Td className="whitespace-nowrap text-xs">{formatPeriod(c)}</Td>
          <Td className="space-x-1 whitespace-nowrap">
            <Badge tone={STATE_TONE[c.state]}>{STATE_LABEL[c.state]}</Badge>
            {!c.is_published && <Badge tone="gold">Нийтлээгүй</Badge>}
          </Td>
          <Td className="whitespace-nowrap text-right">
            <Button variant="ghost" onClick={() => onEdit(c)}>Засах</Button>
            <Link href={`/admin/clubs/${c.id}`} className="inline-flex rounded-lg px-3 py-2 text-sm font-semibold text-navy hover:bg-navy/10">Бүртгэл / Зураг</Link>
            <Button variant="danger" onClick={() => remove(c)}>Устгах</Button>
          </Td>
        </tr>
      ))}
    </Table>
  );
}
```

`frontend/src/app/admin/(dashboard)/clubs/page.tsx`:

```tsx
"use client";

/* Дугуйлангийн удирдлага (manager): ээлж сонгох, дугуйлангийн хүснэгт, форм. */

import { useState } from "react";
import { Button, Empty, Spinner } from "@/components/ui";
import { ClubForm } from "@/components/admin/clubs/ClubForm";
import { ClubTable } from "@/components/admin/clubs/ClubTable";
import { RoundBar } from "@/components/admin/clubs/RoundBar";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { ClubAdmin } from "@/lib/types";

function initialRound(): number | null {
  if (typeof window === "undefined") return null;
  const v = Number(new URLSearchParams(window.location.search).get("round"));
  return v > 0 ? v : null;
}

export default function ClubsAdminPage() {
  const rounds = useFetch(() => api.clubsAdmin.rounds.list(), []);
  const [picked, setPicked] = useState<number | null>(initialRound);
  const [editing, setEditing] = useState<ClubAdmin | null | "new">(null);

  const list = rounds.data ?? [];
  const current = list.find((r) => r.id === picked) ?? list.find((r) => r.is_active) ?? list[0] ?? null;
  const clubs = useFetch(() => (current ? api.clubsAdmin.clubs.list(current.id) : null), [current?.id]);

  function select(id: number) {
    setPicked(id);
    const url = new URL(window.location.href);
    url.searchParams.set("round", String(id));
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">Дугуйлан</h1>
          <p className="text-sm text-slate-600">Ээлж тутамд дугуйлангуудыг зарлаж, бүртгэлийг удирдана. Олон нийтэд зөвхөн идэвхтэй ээлжийн нийтлэгдсэн дугуйлан харагдана.</p>
        </div>
        {current && <Button onClick={() => setEditing("new")}>+ Шинэ дугуйлан</Button>}
      </div>

      {rounds.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{rounds.error}</p>}
      {rounds.loading ? <Spinner /> : (
        <RoundBar rounds={list} current={current} onSelect={select} onChanged={() => { rounds.reload(); clubs.reload(); }} />
      )}

      {!rounds.loading && !current && <Empty>Ээлж байхгүй. «Шинэ ээлж» дарж эхэлнэ үү.</Empty>}
      {current && (clubs.loading ? <Spinner /> : clubs.error ? <p className="text-sm text-red-700">{clubs.error}</p> :
        !clubs.data?.length ? <Empty>Энэ ээлжид дугуйлан байхгүй.</Empty> :
        <ClubTable clubs={clubs.data} onEdit={setEditing} onChanged={() => { clubs.reload(); rounds.reload(); }} />)}

      {current && editing !== null && (
        <ClubForm key={editing === "new" ? "new" : editing.id} roundId={current.id} club={editing === "new" ? null : editing} open
                  onClose={() => setEditing(null)} onSaved={() => { clubs.reload(); rounds.reload(); }} />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Шалгах**

Run: `cd frontend && npx tsc --noEmit && node node_modules/eslint/bin/eslint.js src` → Expected: алдаагүй.

Browser (`/admin/clubs`, manager эсвэл superuser-ээр): цэсэнд "Дугуйлан" (olympiad-эрхтэй хэрэглэгчид харагдахгүй); ээлж үүсгэх → идэвхжүүлэх (confirm) → badge; дугуйлан үүсгэх (ангиуд, багтаамж, төлбөртэй → дүн талбар гарна, хугацаа) → хүснэгтэнд мөр, төлөв badge; алдаа (дуусах < эхлэх) талбар дор; засах; ▲▼ эрэмбэ; нийтлээгүй badge; устгах; `/clubs`-д шинэ дугуйлан харагдана. console алдаагүй.

- [ ] **Step 6: Stage**

```bash
git add "frontend/src/app/admin/(dashboard)/layout.tsx" "frontend/src/app/admin/(dashboard)/clubs" frontend/src/components/admin/clubs
```

---

### Task 10: Frontend — дугуйлангийн дэлгэрэнгүй (зураг, бүртгэл), баримт

**Files:**
- Create: `frontend/src/components/admin/clubs/ImagesPanel.tsx`, `frontend/src/components/admin/clubs/RegistrationsTable.tsx`, `frontend/src/app/admin/(dashboard)/clubs/[id]/page.tsx`
- Modify: `README.md` (backend endpoint хүснэгт ~мөр 40–48, frontend route хүснэгт ~мөр 134–149, шинэ "Дугуйлангийн бүртгэл" хэсэг)

**Interfaces:**
- Consumes: `api.clubsAdmin.images/registrations/clubs`, `ClubAdmin`, `ClubRegistrationAdmin`, `ClubForm`, `format.ts`.
- Produces: `ImagesPanel({ club, onChanged(c: ClubAdmin) })`, `RegistrationsTable({ club, onChanged() })`.

- [ ] **Step 1: ImagesPanel**

`frontend/src/components/admin/clubs/ImagesPanel.tsx`:

```tsx
"use client";

/* Дугуйлангийн зургууд: олон файл сонгож дараалан upload, ▲▼ эрэмбэ, устгах. Хариу бүр ClubAdmin → onChanged. */

import Image from "next/image";
import { useState } from "react";
import { Button, Card, Empty } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { ClubAdmin } from "@/lib/types";

export function ImagesPanel({ club, onChanged }: { club: ClubAdmin; onChanged: (c: ClubAdmin) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError("");
    try {
      let latest = club;
      for (const f of Array.from(files)) latest = await api.clubsAdmin.images.add(club.id, f);
      onChanged(latest);
    } catch (e) { setError(e instanceof ApiError ? (e.fieldErrors.image ?? e.message) : "Зураг оруулж чадсангүй."); }
    finally { setBusy(false); }
  }

  async function move(i: number, dir: -1 | 1) {
    const ids = club.images.map((x) => x.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { onChanged(await api.clubsAdmin.images.reorder(club.id, ids)); } catch { setError("Эрэмбийг хадгалж чадсангүй."); }
  }

  async function remove(id: number) {
    if (!confirm("Зургийг устгах уу?")) return;
    try { onChanged(await api.clubsAdmin.images.remove(id)); } catch { setError("Устгаж чадсангүй."); }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy">Зургууд</h2>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90">
          {busy ? "Оруулж байна…" : "+ Зураг оруулах"}
          <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {club.images.length === 0 ? <Empty>Зураг байхгүй. Эхний зураг картын нүүр зураг болно.</Empty> : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {club.images.map((img, i) => (
            <div key={img.id} className="space-y-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                <Image src={img.url} alt="" fill unoptimized className="object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-gold px-1.5 text-[10px] font-bold text-navy">НҮҮР</span>}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-navy disabled:opacity-30" aria-label="Өмнө">◀</button>
                <button onClick={() => move(i, 1)} disabled={i === club.images.length - 1} className="px-1 text-navy disabled:opacity-30" aria-label="Дараа">▶</button>
                <Button variant="danger" className="ml-auto px-2 py-1 text-xs" onClick={() => remove(img.id)}>Устгах</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: RegistrationsTable**

`frontend/src/components/admin/clubs/RegistrationsTable.tsx`:

```tsx
"use client";

/* Дугуйлангийн бүртгэлүүд: огноо, анги, сурагч, бүртгүүлэгч, утас, имэйл, төлсөн (төлбөртэй бол), хасах. */

import { Badge, Button, Empty, Spinner, Table, Td, Th } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { ClubAdmin } from "@/lib/types";

const fmt = (iso: string) => new Date(iso).toLocaleString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

export function RegistrationsTable({ club, onChanged }: { club: ClubAdmin; onChanged: () => void }) {
  const q = useFetch(() => api.clubsAdmin.registrations.list(club.id), [club.id, club.taken]);

  async function remove(id: number, name: string) {
    if (!confirm(`${name}-г дугуйлангаас хасах уу? Слот суларна.`)) return;
    try { await api.clubsAdmin.registrations.remove(id); q.reload(); onChanged(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Хасаж чадсангүй."); }
  }

  async function setPaid(id: number, v: boolean) {
    try { await api.clubsAdmin.registrations.setPaid(id, v); q.reload(); } catch { alert("Хадгалж чадсангүй."); }
  }

  if (q.loading) return <Spinner />;
  if (q.error) return <p className="text-sm text-red-700">{q.error}</p>;
  if (!q.data?.length) return <Empty>Бүртгэл байхгүй.</Empty>;

  return (
    <Table head={<><Th>Огноо</Th><Th>Анги</Th><Th>Сурагч</Th><Th>Бүртгүүлэгч</Th><Th>Утас</Th><Th>Имэйл</Th>{club.is_paid && <Th>Төлсөн</Th>}<Th></Th></>}>
      {q.data.map((r) => {
        const removed = r.status === "removed";
        return (
          <tr key={r.id} className={removed ? "text-slate-400" : ""}>
            <Td className="whitespace-nowrap text-xs">{fmt(r.created_at)}</Td>
            <Td>{r.grade}</Td>
            <Td className={removed ? "" : "font-semibold text-navy"}>{r.student_last_name} {r.student_first_name}</Td>
            <Td>{r.guardian_last_name} {r.guardian_first_name}</Td>
            <Td className="whitespace-nowrap">{r.phone}</Td>
            <Td>{r.email}</Td>
            {club.is_paid && <Td>{!removed && <input type="checkbox" checked={r.is_paid_marked} onChange={(e) => setPaid(r.id, e.target.checked)} aria-label="Төлсөн" />}</Td>}
            <Td className="whitespace-nowrap text-right">
              {removed ? <Badge tone="slate">Хасагдсан {r.removed_at ? fmt(r.removed_at) : ""}</Badge>
                       : <Button variant="danger" onClick={() => remove(r.id, `${r.student_last_name} ${r.student_first_name}`)}>Хасах</Button>}
            </Td>
          </tr>
        );
      })}
    </Table>
  );
}
```

- [ ] **Step 3: Дэлгэрэнгүй хуудас**

`frontend/src/app/admin/(dashboard)/clubs/[id]/page.tsx`:

```tsx
"use client";

/* Дугуйлангийн дэлгэрэнгүй: толгой, зургууд, бүртгэлийн хүснэгт. */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Spinner } from "@/components/ui";
import { ClubForm } from "@/components/admin/clubs/ClubForm";
import { ImagesPanel } from "@/components/admin/clubs/ImagesPanel";
import { RegistrationsTable } from "@/components/admin/clubs/RegistrationsTable";
import { STATE_LABEL, STATE_TONE, formatFee, formatGrades, formatPeriod } from "@/components/clubs/format";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { ClubAdmin } from "@/lib/types";

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clubId = Number(id);
  // Дугуйлангийн GET endpoint байхгүй: ээлжүүдийг татаад тухайн дугуйланг олно (нэг удаа), дараа нь хариунуудаас шинэчилнэ
  const q = useFetch(async () => {
    const rounds = await api.clubsAdmin.rounds.list();
    for (const r of rounds) {
      const c = (await api.clubsAdmin.clubs.list(r.id)).find((x) => x.id === clubId);
      if (c) return c;
    }
    throw new Error("Дугуйлан олдсонгүй.");
  }, [clubId]);
  const [override, setOverride] = useState<ClubAdmin | null>(null);
  const [editing, setEditing] = useState(false);
  const club = override ?? q.data;

  if (q.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  if (!club) return <Spinner />;

  return (
    <div className="space-y-6">
      <Link href={`/admin/clubs?round=${club.round_id}`} className="text-sm font-semibold text-navy hover:underline">← Дугуйлангууд</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">{club.name}</h1>
          <p className="text-sm text-slate-600">{formatGrades(club.grades)} · {formatFee(club)} · {formatPeriod(club)}</p>
          <div className="mt-2 flex gap-2">
            <Badge tone={STATE_TONE[club.state]}>{STATE_LABEL[club.state]}</Badge>
            {!club.is_published && <Badge tone="gold">Нийтлээгүй</Badge>}
            <Badge tone="navy">{club.taken}/{club.capacity} бүртгэгдсэн</Badge>
          </div>
        </div>
        <Button variant="ghost" onClick={() => setEditing(true)}>Засах</Button>
      </div>

      <ImagesPanel club={club} onChanged={setOverride} />

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-navy">Бүртгэл</h2>
        <RegistrationsTable club={club} onChanged={() => { setOverride(null); q.reload(); }} />
      </section>

      {editing && (
        <ClubForm key={club.id} roundId={club.round_id} club={club} open onClose={() => setEditing(false)}
                  onSaved={() => { setOverride(null); q.reload(); }} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: README**

`README.md`:
- Backend endpoint хүснэгтэд (`/media/...` мөрийн өмнө) хоёр мөр:
  `| \`/api/clubs/\`, \`/api/clubs/email/send/\`, \`/api/clubs/email/verify/\`, \`/api/clubs/registrations/\` | Дугуйлан: жагсаалт, имэйлийн код, бүртгэл (олон нийт) |`
  `| \`/api/clubs/admin/rounds/...\`, \`/api/clubs/admin/clubs/...\`, \`/api/clubs/admin/registrations/...\` | Дугуйлан удирдах (ээлж, дугуйлан, зураг, бүртгэл, Excel; \`manager\` эрх) |`
- Frontend route хүснэгтэд: `| \`/clubs\` | Дугуйлан: анги сонгох, бүртгүүлэх (олон нийт) |`, `| \`/admin/clubs\`, \`/admin/clubs/[id]\` | Дугуйлан удирдах (\`manager\` эрх эсвэл superuser) |`.
- Шинэ хэсэг (олимпиадын хуудасны хэсгийн дараа):

```markdown
## Дугуйлангийн бүртгэл

Сургалтын менежер `/admin/clubs` дээр ээлж (улирал) үүсгэж идэвхжүүлээд дугуйлангуудыг (анги 1–12, багтаамж, тайлбар, зураг, бүртгэлийн хугацаа, төлбөрийн мэдээлэл) зарлана. Олон нийтэд `/clubs` дээр зөвхөн идэвхтэй ээлжийн нийтлэгдсэн дугуйлан харагдана.

Бүртгэл: сурагч `@shineue.edu.mn` имэйлээ оруулна → 6 оронтой код имэйлээр очно (10 мин) → код зөв бол 15 минутын token → сурагч/бүртгүүлэгчийн овог нэр, утас, анги → бүртгэл. Нэг имэйл нэг ээлжид нэг л дугуйланд бүртгүүлнэ; менежер хасвал слот суларч, дахин бүртгүүлж болно. Хугацаа дуусах эсвэл слот дүүрэхэд дугуйлан хаагдана. Төлбөр сайт дээр төлөгдөхгүй — зөвхөн мэдээлэл; менежер "Төлсөн" гэж тэмдэглэнэ. Ээлжийн бүртгэлийг Excel-ээр татаж болно.

SMTP тохиргоо (`backend/.env`): `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_TLS`. Brevo, Mailgun, SendGrid г.м. үйлчилгээний SMTP relay мэдээллийг бичнэ. `SMTP_HOST`/`SMTP_FROM` хоосон бол код илгээгдэхгүй, backend-ийн логт `Дугуйлангийн код (SMTP тохиргоогүй): ...` гэж хэвлэгдэнэ (хөгжүүлэлт). Домэйн: `CLUB_EMAIL_DOMAIN` (анхдагч `shineue.edu.mn`).
```

- [ ] **Step 5: Шалгах**

Run: `cd frontend && npx tsc --noEmit && node node_modules/eslint/bin/eslint.js src`; `cd backend && uv run pytest -q` → бүгд ногоон.

Browser: `/admin/clubs/[id]`: 2–3 зураг олноор сонгож оруулах → торонд харагдах, "НҮҮР" тэмдэг, ◀▶ эрэмбэ, устгах (confirm); `/clubs`-д картын нүүр зураг + галерей ажиллана. Бүртгэлийн хүснэгт (Task 8-аар үүсгэсэн бүртгэлүүд): төлбөртэй дугуйланд "Төлсөн" checkbox; "Хасах" → мөр саарал "Хасагдсан", толгойн `taken` багасна, `/clubs`-д слот нэмэгдэнэ, тэр имэйлээр дахин бүртгүүлж болно. `/admin/clubs` "Excel татах" → файл татагдаж Excel-д нээгдэнэ. Console алдаагүй.

- [ ] **Step 6: Stage**

```bash
git add frontend/src/components/admin/clubs "frontend/src/app/admin/(dashboard)/clubs" README.md
```
