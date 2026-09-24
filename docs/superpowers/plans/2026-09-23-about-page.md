# "Бидний тухай" хуудас — хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Олон нийтийн `/about` хуудас (танилцуулга + үзүүлэлт, шатлалтай удирдлага зурагтай, тэнхим бүрийн эрхлэгч/багш нар, түүх) ба түүнийг удирдах `/admin/about` (3 tab) бүтээх.

**Architecture:** Backend-д шинэ `app/about/` модуль: 4 хүснэгт (`about_page` нэг мөр, `about_leaders`, `about_departments`, `about_teachers`), нэг public endpoint `GET /api/about/`, менежерийн CRUD `/api/about/admin/*` (олимпиадын хуудасны тохиргоо + дугуйлангийн CRUD/зураг/дараалал загвараар). Frontend-д server component `/about` (`fetchAbout` 60 сек revalidate), `components/about/*`, admin-д `app/admin/(dashboard)/about/*` + `components/admin/about/*`.

**Tech Stack:** FastAPI + SQLAlchemy 2 async + Alembic + PostgreSQL (JSONB); nh3 (`clean_html`); Pillow (`save_upload`); Next.js 16 App Router + React 19 + Tailwind v4; Tiptap (`RichText`).

**Spec:** `docs/superpowers/specs/2026-09-23-about-page-design.md`

## Global Constraints

- **Commit хийхгүй.** Task бүр `git add`-аар дуусна (хэрэглэгчийн журам).
- Backend тест: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest -q` — одоо **143 passed**; task бүрийн төгсгөлд бүгд ногоон.
- Frontend: `cd frontend && node node_modules/typescript/bin/tsc --noEmit -p . && node node_modules/eslint/bin/eslint.js src` — 0 problems (`npx tsc`/`npx eslint` segfault хийдэг тул `node node_modules/...`).
- Windows Git Bash: хаалттай замыг ишлэлд (`"frontend/src/app/(site)/about/page.tsx"`); файл бичихдээ Write tool (heredoc backslash-ийг эвддэг).
- Хүснэгтийн нэр `about_` угтвартай (`teachers` хүснэгт хуваарийн модульд бий). Frontend төрлүүд `About` угтвартай (`Teacher` төрөл хуваарьд бий).
- Алдаа: `FieldError(field, msg)` → 400 `{field: [msg]}`. Мессежүүд үгчлэн: `full_name: "Нэр оруулна уу."`, `position: "Албан тушаал оруулна уу."`, `name: "Нэр оруулна уу."`, `level: "Түвшин 1–3 байна."`, `stats: "Үзүүлэлт 4-өөс олон байж болохгүй."`, `items: "Бүх гишүүний id байх ёстой."`, `ids: "Бүх тэнхимийн id байх ёстой."`, `ids: "Тэнхимийн бүх багшийн id байх ёстой."`. Олдоогүй → 404 `"Олдсонгүй."`. Эрх: `require_role("manager")`.
- Эрэмбэ: удирдлага `level, order, id`; тэнхим `order, id`; багш `is_head DESC, order, id`.
- Зураг: `save_upload(photo, "about", "photo")`; солиход/устгахад `delete_file(old)`.
- Монгол хэлээр коммент, UI текст; одоогийн кодын хэв маяг (богино, нягт мөрүүд).

## Файлын бүтэц

Backend (шинэ): `app/about/__init__.py`, `app/about/models.py` (4 модель + `PAGE_DEFAULTS`), `app/about/schemas.py`, `app/about/service.py` (`get_page`, `media_url`, `leader_out`, `department_out`, `list_leaders`, `list_departments`), `app/about/router_public.py`, `app/about/router_admin.py`, `alembic/versions/0010_about.py`, `tests/test_about_public.py`, `tests/test_about_admin.py`. Өөрчлөх: `app/models_all.py`, `app/main.py`.

Frontend (шинэ): `lib/about-api.ts`, `app/(site)/about/page.tsx`, `components/about/IntroSection.tsx`, `components/about/LeadershipChart.tsx`, `components/about/Departments.tsx`, `app/admin/(dashboard)/about/layout.tsx`, `app/admin/(dashboard)/about/page.tsx`, `app/admin/(dashboard)/about/leaders/page.tsx`, `app/admin/(dashboard)/about/departments/page.tsx`, `components/admin/about/LeaderList.tsx`, `components/admin/about/LeaderDialog.tsx`, `components/admin/about/DepartmentList.tsx`, `components/admin/about/TeacherTable.tsx`. Өөрчлөх: `lib/types.ts`, `lib/api.ts`, `lib/home-data.ts` (NAV_LINKS), `components/home/SiteFooter.tsx`, `app/admin/(dashboard)/layout.tsx` (NAV), `README.md`.

---

### Task 1: Backend модель, migration, public endpoint

**Files:**
- Create: `backend/app/about/__init__.py`, `backend/app/about/models.py`, `backend/app/about/schemas.py`, `backend/app/about/service.py`, `backend/app/about/router_public.py`, `backend/alembic/versions/0010_about.py`
- Modify: `backend/app/models_all.py`, `backend/app/main.py`
- Test: `backend/tests/test_about_public.py`

**Interfaces:**
- Produces: моделиуд `AboutPage`, `Leader`, `Department`, `DeptTeacher`; `service.get_page(db) -> AboutPage`; `service.media_url(request, rel) -> str`; `service.leader_out(request, l) -> LeaderOut`; `service.department_out(d) -> DepartmentOut`; `service.list_leaders(db)`; `service.list_departments(db)`; схемүүд `StatItem, PageOut, PagePatch, LeaderOut, DepartmentOut, TeacherOut, AboutOut`. Task 2–4 эдгээрийг ашиглана.

- [ ] **Step 1: Failing тест бичих** — `backend/tests/test_about_public.py`:

```python
"""Бидний тухай — олон нийтийн GET /api/about/."""

from app.about.models import Department, DeptTeacher, Leader


async def test_about_defaults_and_empty_lists(client):
    r = await client.get("/api/about/")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["page"] == {"intro_title": "Шинэ Үе сургууль", "intro_html": "", "stats": []}
    assert d["leaders"] == [] and d["departments"] == []
    assert (await client.get("/api/about/")).json() == d   # хоёр дахь удаад ижил мөр


async def test_about_ordering(client, db):
    db.add_all([
        Leader(full_name="Гуравдугаар", position="Менежер", level=3, order=1),
        Leader(full_name="Дэд Б", position="Дэд захирал", level=2, order=2, photo="about/b.jpg"),
        Leader(full_name="Дэд А", position="Дэд захирал", level=2, order=1),
        Leader(full_name="Захирал", position="Захирал", level=1, order=1),
    ])
    d2 = Department(name="Хоёр", order=2)
    d1 = Department(name="Нэг", order=1)
    db.add_all([d1, d2])
    await db.flush()
    db.add_all([
        DeptTeacher(department_id=d1.id, full_name="Багш Б", role="Математикийн багш", is_head=False, order=1),
        DeptTeacher(department_id=d1.id, full_name="Эрхлэгч", role="", is_head=True, order=2),
        DeptTeacher(department_id=d1.id, full_name="Багш В", role="", is_head=False, order=3),
    ])
    await db.flush()
    d = (await client.get("/api/about/")).json()
    assert [l["full_name"] for l in d["leaders"]] == ["Захирал", "Дэд А", "Дэд Б", "Гуравдугаар"]
    assert d["leaders"][2]["photo"].endswith("/media/about/b.jpg") and d["leaders"][0]["photo"] is None
    assert [x["name"] for x in d["departments"]] == ["Нэг", "Хоёр"]
    t = d["departments"][0]["teachers"]
    assert [x["full_name"] for x in t] == ["Эрхлэгч", "Багш Б", "Багш В"] and t[0]["is_head"] is True
    assert d["departments"][1]["teachers"] == []
```

- [ ] **Step 2: Тест унахыг шалгах**

Run: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest tests/test_about_public.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.about'`

- [ ] **Step 3: Модель бичих** — `backend/app/about/__init__.py` хоосон; `backend/app/about/models.py`:

```python
"""
"Бидний тухай" хуудасны өгөгдөл: нэг мөрт тохиргоо (AboutPage), удирдлагын гишүүд (Leader, түвшин 1–3),
тэнхим (Department) ба тэнхимийн багш нар (DeptTeacher). Хүснэгтүүд `about_` угтвартай — `teachers` хуваарьд бий.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base

PAGE_DEFAULTS = {"intro_title": "Шинэ Үе сургууль", "intro_html": "", "stats": []}


class AboutPage(Base):
    """Танилцуулга, үзүүлэлт. Үргэлж нэг мөр (id=1), service.get_page үүсгэнэ."""
    __tablename__ = "about_page"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    intro_title: Mapped[str] = mapped_column(String(160), default=PAGE_DEFAULTS["intro_title"])
    intro_html: Mapped[str] = mapped_column(Text, default="")
    stats: Mapped[list] = mapped_column(JSONB, default=list)  # [{value, label}] 0–4
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Leader(Base):
    __tablename__ = "about_leaders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120))
    position: Mapped[str] = mapped_column(String(160))
    level: Mapped[int] = mapped_column(SmallInteger, default=1)   # 1–3
    order: Mapped[int] = mapped_column(SmallInteger, default=0)
    photo: Mapped[str | None] = mapped_column(String(255), nullable=True)   # "about/uuid.jpg"


class Department(Base):
    __tablename__ = "about_departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    order: Mapped[int] = mapped_column(SmallInteger, default=0)
    teachers: Mapped[list["DeptTeacher"]] = relationship(
        lazy="selectin", cascade="all, delete-orphan",
        order_by="desc(DeptTeacher.is_head), DeptTeacher.order, DeptTeacher.id",
    )


class DeptTeacher(Base):
    __tablename__ = "about_teachers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("about_departments.id", ondelete="CASCADE"), index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(120), default="")
    is_head: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(SmallInteger, default=0)
```

`backend/app/models_all.py`-д сүүлд нэмнэ:

```python
from .about import models as about_models  # noqa: F401
```

- [ ] **Step 4: Migration** — `backend/alembic/versions/0010_about.py`:

```python
"""about page: page settings, leaders, departments, teachers

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "about_page",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("intro_title", sa.String(160), nullable=False, server_default="Шинэ Үе сургууль"),
        sa.Column("intro_html", sa.Text, nullable=False, server_default=""),
        sa.Column("stats", JSONB, nullable=False, server_default="[]"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "about_leaders",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("position", sa.String(160), nullable=False),
        sa.Column("level", sa.SmallInteger, nullable=False, server_default="1"),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="0"),
        sa.Column("photo", sa.String(255), nullable=True),
    )
    op.create_table(
        "about_departments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="0"),
    )
    op.create_table(
        "about_teachers",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("department_id", sa.Integer, sa.ForeignKey("about_departments.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("role", sa.String(120), nullable=False, server_default=""),
        sa.Column("is_head", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("about_teachers")
    op.drop_table("about_departments")
    op.drop_table("about_leaders")
    op.drop_table("about_page")
```

Хэрэв `0009_club_quotas.py`-ийн `revision` утга `"0009"` биш бол `down_revision`-ийг түүнтэй тааруулна (`grep -n "^revision" backend/alembic/versions/0009_club_quotas.py`).

- [ ] **Step 5: Схем** — `backend/app/about/schemas.py`:

```python
"""Бидний тухай — pydantic схемүүд."""

from pydantic import BaseModel, Field


class StatItem(BaseModel):
    value: str = Field(min_length=1, max_length=20)
    label: str = Field(min_length=1, max_length=60)


class PageOut(BaseModel):
    intro_title: str
    intro_html: str
    stats: list[StatItem]


class PagePatch(BaseModel):
    intro_title: str | None = Field(default=None, min_length=1, max_length=160)
    intro_html: str | None = None
    stats: list[StatItem] | None = None


class LeaderOut(BaseModel):
    id: int
    full_name: str
    position: str
    level: int
    photo: str | None


class LeaderPatch(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    position: str | None = Field(default=None, max_length=160)
    level: int | None = None


class LeaderOrderItem(BaseModel):
    id: int
    level: int
    order: int


class LeadersOrderIn(BaseModel):
    items: list[LeaderOrderItem]


class OrderIn(BaseModel):
    ids: list[int]


class TeacherOut(BaseModel):
    id: int
    full_name: str
    role: str
    is_head: bool


class TeacherIn(BaseModel):
    full_name: str = Field(max_length=120)
    role: str = Field(default="", max_length=120)
    is_head: bool = False


class TeacherPatch(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    role: str | None = Field(default=None, max_length=120)
    is_head: bool | None = None


class DepartmentOut(BaseModel):
    id: int
    name: str
    teachers: list[TeacherOut]


class DepartmentIn(BaseModel):
    name: str = Field(max_length=120)


class DepartmentPatch(BaseModel):
    name: str | None = Field(default=None, max_length=120)


class AboutOut(BaseModel):
    page: PageOut
    leaders: list[LeaderOut]
    departments: list[DepartmentOut]
```

- [ ] **Step 6: Service** — `backend/app/about/service.py`:

```python
"""Бидний тухай — нийтлэг туслахууд (public ба admin router хоёулаа ашиглана)."""

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from .models import PAGE_DEFAULTS, AboutPage, Department, Leader
from .schemas import DepartmentOut, LeaderOut, PageOut, StatItem, TeacherOut


def media_url(request: Request, rel: str) -> str:
    if settings.media_base_url:
        return f"{settings.media_base_url.rstrip('/')}/media/{rel}"
    return f"{request.base_url}media/{rel}"


async def get_page(db: AsyncSession) -> AboutPage:
    """Нэг мөрт тохиргоо; байхгүй бол анхдагчаар үүсгэнэ (зэрэг үүсгэх оролдлогод хоёр дахь нь дахин уншина)."""
    p = await db.get(AboutPage, 1)
    if p is not None:
        return p
    db.add(AboutPage(id=1, **PAGE_DEFAULTS))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
    return await db.get(AboutPage, 1)  # type: ignore[return-value]


def page_out(p: AboutPage) -> PageOut:
    return PageOut(intro_title=p.intro_title, intro_html=p.intro_html, stats=[StatItem(**s) for s in (p.stats or [])])


def leader_out(request: Request, l: Leader) -> LeaderOut:
    return LeaderOut(id=l.id, full_name=l.full_name, position=l.position, level=l.level,
                     photo=media_url(request, l.photo) if l.photo else None)


def department_out(d: Department) -> DepartmentOut:
    return DepartmentOut(id=d.id, name=d.name,
                         teachers=[TeacherOut(id=t.id, full_name=t.full_name, role=t.role, is_head=t.is_head) for t in d.teachers])


async def list_leaders(db: AsyncSession) -> list[Leader]:
    return list((await db.execute(select(Leader).order_by(Leader.level, Leader.order, Leader.id))).scalars().all())


async def list_departments(db: AsyncSession) -> list[Department]:
    return list((await db.execute(select(Department).order_by(Department.order, Department.id))).scalars().all())
```

- [ ] **Step 7: Public router** — `backend/app/about/router_public.py`:

```python
"""
Бидний тухай — нээлттэй API.
  GET /api/about/ → {page:{intro_title,intro_html,stats}, leaders:[...], departments:[{id,name,teachers:[...]}]}
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from .schemas import AboutOut
from .service import department_out, get_page, leader_out, list_departments, list_leaders, page_out

router = APIRouter(prefix="/api/about", tags=["about"])
DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/", response_model=AboutOut)
async def about_get(request: Request, db: DB):
    return AboutOut(
        page=page_out(await get_page(db)),
        leaders=[leader_out(request, l) for l in await list_leaders(db)],
        departments=[department_out(d) for d in await list_departments(db)],
    )
```

`backend/app/main.py`-д: импортын хэсэгт `from .about.router_public import router as about_public_router`, `include_router` жагсаалтын сүүлд `app.include_router(about_public_router)`.

- [ ] **Step 8: Тест ногоон болохыг шалгах**

Run: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest tests/test_about_public.py -q`
Expected: `2 passed`. (Тестийн бааз `create_all`-аар хүснэгт үүсгэдэг; хөгжүүлэлтийн баазад `uv run alembic upgrade head`.)

Run: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest -q` → `145 passed`. Мөн `uv run alembic upgrade head` (локал DB) амжилттай, `uv run alembic downgrade 0009 && uv run alembic upgrade head` алдаагүй.

- [ ] **Step 9: Stage**

```bash
git add backend/app/about backend/alembic/versions/0010_about.py backend/app/models_all.py backend/app/main.py backend/tests/test_about_public.py
```

---

### Task 2: Admin — танилцуулгын тохиргоо (page GET/PATCH)

**Files:**
- Create: `backend/app/about/router_admin.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_about_admin.py`

**Interfaces:**
- Consumes: Task 1-ийн `get_page`, `page_out`, `PagePatch`, `PageOut`.
- Produces: `router` (`/api/about/admin`), `DB`, `Manager`, `_get_or_404(db, model, id)` — Task 3, 4 энэ файлд нэмнэ.

- [ ] **Step 1: Failing тест** — `backend/tests/test_about_admin.py`:

```python
"""Бидний тухай — менежерийн API."""

import io

from PIL import Image

from tests.helpers import manager_headers, staff_headers

A = "/api/about/admin"


def png_bytes(color=(30, 58, 143)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (40, 40), color).save(buf, format="PNG")
    return buf.getvalue()


async def test_page_patch_sanitizes_and_validates(client, make_user):
    h = await manager_headers(client, make_user)
    r = await client.get(f"{A}/page/", headers=h)
    assert r.status_code == 200 and r.json()["intro_title"] == "Шинэ Үе сургууль"
    r = await client.patch(f"{A}/page/", headers=h, json={
        "intro_title": "Бидний тухай", "intro_html": "<p>Сайн</p><script>alert(1)</script>",
        "stats": [{"value": "1200+", "label": "Суралцагчид"}]})
    assert r.status_code == 200, r.text
    assert r.json()["intro_html"] == "<p>Сайн</p>" and r.json()["stats"][0]["value"] == "1200+"
    assert (await client.get("/api/about/")).json()["page"]["intro_title"] == "Бидний тухай"
    r = await client.patch(f"{A}/page/", headers=h, json={"stats": [{"value": str(i), "label": "l"} for i in range(5)]})
    assert r.status_code == 400 and "stats" in r.json()
    r = await client.patch(f"{A}/page/", headers=h, json={"stats": [{"value": "x", "label": ""}]})
    assert r.status_code == 400 and "stats" in r.json()
    r = await client.patch(f"{A}/page/", headers=h, json={"intro_title": ""})
    assert r.status_code == 400 and "intro_title" in r.json()


async def test_admin_requires_manager(client, make_user):
    assert (await client.get(f"{A}/page/")).status_code == 401
    h = await staff_headers(client, make_user, "editor", roles=("news",))
    assert (await client.get(f"{A}/page/", headers=h)).status_code == 403
    assert (await client.get(f"{A}/leaders/", headers=h)).status_code == 403
```

- [ ] **Step 2: Унахыг шалгах**

Run: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest tests/test_about_admin.py -q`
Expected: FAIL — `/api/about/admin/page/` 404.

- [ ] **Step 3: Admin router** — `backend/app/about/router_admin.py`:

```python
"""
Бидний тухай — менежерийн API (manager эрх), prefix /api/about/admin.
  GET/PATCH /page/
  GET/POST /leaders/   PATCH/DELETE /leaders/{id}/   POST/DELETE /leaders/{id}/photo/   PUT /leaders/order/
  GET/POST /departments/   PATCH/DELETE /departments/{id}/   PUT /departments/order/
  POST /departments/{id}/teachers/   PATCH/DELETE /teachers/{id}/   PUT /departments/{id}/teachers/order/
"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import require_role
from ..auth.models import User
from ..common.errors import FieldError
from ..common.media import delete_file, save_upload
from ..db import get_db
from ..news.sanitize import clean_html
from .models import Department, DeptTeacher, Leader
from .schemas import (DepartmentIn, DepartmentOut, DepartmentPatch, LeaderOut, LeaderPatch, LeadersOrderIn, OrderIn, PageOut,
                      PagePatch, TeacherIn, TeacherOut, TeacherPatch)
from .service import department_out, get_page, leader_out, list_departments, list_leaders, page_out

router = APIRouter(prefix="/api/about/admin", tags=["about-admin"])
DB = Annotated[AsyncSession, Depends(get_db)]
Manager = Annotated[User, Depends(require_role("manager"))]

STATS_MAX = 4


async def _get_or_404(db: AsyncSession, model, id: int):
    obj = await db.get(model, id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return obj


# ---- танилцуулгын тохиргоо ----
@router.get("/page/", response_model=PageOut)
async def page_get(db: DB, _: Manager):
    return page_out(await get_page(db))


@router.patch("/page/", response_model=PageOut)
async def page_patch(body: PagePatch, db: DB, _: Manager):
    p = await get_page(db)
    data = body.model_dump(exclude_unset=True)
    if "stats" in data and data["stats"] is not None:
        if len(data["stats"]) > STATS_MAX:
            raise FieldError("stats", "Үзүүлэлт 4-өөс олон байж болохгүй.")
        p.stats = [dict(s) for s in data["stats"]]
    if data.get("intro_title") is not None:
        p.intro_title = data["intro_title"].strip()
    if data.get("intro_html") is not None:
        p.intro_html = clean_html(data["intro_html"])
    await db.commit()
    return page_out(p)
```

`backend/app/main.py`: `from .about.router_admin import router as about_admin_router`; `app.include_router(about_admin_router)` public-ийн дараа.

- [ ] **Step 4: Ногоон** — Run: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest tests/test_about_admin.py -q` → `2 passed`. (`test_admin_requires_manager`-ийн `/leaders/` 403 нь Task 3-т endpoint нэмэгдсэний дараа ч 403 хэвээр; одоо 404 биш 403 гарахгүй бол тэр мөрийг Task 3-т шилжүүлж болно — гэхдээ FastAPI-д route байхгүй бол 404 буцаана, тиймээс **энэ тест Task 3 дуустал улаан байх нь зөв**: Task 3-ийн Step 4-т ногоон болно. Task 2-ийн Step 4-т `test_page_patch_sanitizes_and_validates` ногоон, нөгөө нь `/leaders/` мөрөнд унахыг зөвшөөрнө.)

- [ ] **Step 5: Stage**

```bash
git add backend/app/about/router_admin.py backend/app/main.py backend/tests/test_about_admin.py
```

---

### Task 3: Admin — удирдлагын гишүүд (CRUD, зураг, дараалал)

**Files:**
- Modify: `backend/app/about/router_admin.py`
- Test: `backend/tests/test_about_admin.py`

**Interfaces:**
- Consumes: Task 2-ийн `router`, `DB`, `Manager`, `_get_or_404`; Task 1-ийн `leader_out`, `list_leaders`, `LeaderPatch`, `LeadersOrderIn`.
- Produces: endpoint-ууд spec §3-ын дагуу.

- [ ] **Step 1: Failing тест** — `backend/tests/test_about_admin.py`-д нэмнэ:

```python
async def test_leaders_crud_photo_order(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await manager_headers(client, make_user)
    # үүсгэх (multipart), зураггүй
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": " Бат ", "position": "Захирал", "level": "1"})
    assert r.status_code == 201, r.text
    a = r.json()
    assert a["full_name"] == "Бат" and a["level"] == 1 and a["photo"] is None
    # зурагтай
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "Дорж", "position": "Дэд захирал", "level": "2"},
                          files={"photo": ("p.png", png_bytes(), "image/png")})
    assert r.status_code == 201, r.text
    b = r.json()
    rel_b = b["photo"].split("/media/")[1]
    assert rel_b.startswith("about/") and (tmp_path / rel_b).exists()
    # validation
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "", "position": "x", "level": "1"})
    assert r.status_code == 400 and "full_name" in r.json()
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "x", "position": " ", "level": "1"})
    assert r.status_code == 400 and "position" in r.json()
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "x", "position": "y", "level": "4"})
    assert r.status_code == 400 and "level" in r.json()
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "x", "position": "y", "level": "1"},
                          files={"photo": ("t.txt", b"hello", "text/plain")})
    assert r.status_code == 400 and "photo" in r.json()
    # жагсаалт эрэмбэтэй
    lst = (await client.get(f"{A}/leaders/", headers=h)).json()
    assert [x["id"] for x in lst] == [a["id"], b["id"]]
    # PATCH: level солиход тухайн түвшний сүүлд
    r = await client.post(f"{A}/leaders/", headers=h, data={"full_name": "Сүх", "position": "Дэд захирал", "level": "2"})
    c = r.json()
    r = await client.patch(f"{A}/leaders/{a['id']}/", headers=h, json={"level": 2, "position": "Зөвлөх"})
    assert r.status_code == 200 and r.json()["level"] == 2 and r.json()["position"] == "Зөвлөх"
    lst = (await client.get(f"{A}/leaders/", headers=h)).json()
    assert [x["id"] for x in lst] == [b["id"], c["id"], a["id"]]
    assert (await client.patch(f"{A}/leaders/{a['id']}/", headers=h, json={"level": 0})).status_code == 400
    assert (await client.patch(f"{A}/leaders/{a['id']}/", headers=h, json={"full_name": "  "})).status_code == 400
    # зураг солих → хуучин файл устна; устгах
    r = await client.post(f"{A}/leaders/{b['id']}/photo/", headers=h, files={"photo": ("q.png", png_bytes((255, 0, 0)), "image/png")})
    assert r.status_code == 200
    rel_b2 = r.json()["photo"].split("/media/")[1]
    assert not (tmp_path / rel_b).exists() and (tmp_path / rel_b2).exists()
    r = await client.delete(f"{A}/leaders/{b['id']}/photo/", headers=h)
    assert r.status_code == 200 and r.json()["photo"] is None and not (tmp_path / rel_b2).exists()
    # дараалал: бүх id заавал
    r = await client.put(f"{A}/leaders/order/", headers=h, json={"items": [{"id": a["id"], "level": 1, "order": 1}]})
    assert r.status_code == 400 and "items" in r.json()
    r = await client.put(f"{A}/leaders/order/", headers=h, json={"items": [
        {"id": c["id"], "level": 2, "order": 1}, {"id": b["id"], "level": 2, "order": 2}, {"id": a["id"], "level": 3, "order": 1}]})
    assert r.status_code == 200 and [x["id"] for x in r.json()] == [c["id"], b["id"], a["id"]] and r.json()[2]["level"] == 3
    # устгах → файл устна
    r = await client.post(f"{A}/leaders/{c['id']}/photo/", headers=h, files={"photo": ("q.png", png_bytes(), "image/png")})
    rel_c = r.json()["photo"].split("/media/")[1]
    assert (await client.delete(f"{A}/leaders/{c['id']}/", headers=h)).status_code == 204
    assert not (tmp_path / rel_c).exists()
    assert (await client.delete(f"{A}/leaders/{c['id']}/", headers=h)).status_code == 404
    assert len((await client.get("/api/about/")).json()["leaders"]) == 2
```

- [ ] **Step 2: Унахыг шалгах** — Run: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest tests/test_about_admin.py -q` → шинэ тест FAIL (404).

- [ ] **Step 3: Endpoint-ууд** — `router_admin.py`-ийн төгсгөлд:

```python
# ---- удирдлага ----
def _clean_name(v: str | None, field: str, msg: str) -> str:
    v = (v or "").strip()
    if not v:
        raise FieldError(field, msg)
    return v


def _check_level(level: int) -> int:
    if level not in (1, 2, 3):
        raise FieldError("level", "Түвшин 1–3 байна.")
    return level


async def _next_order(db: AsyncSession, level: int) -> int:
    mx = (await db.execute(select(func.max(Leader.order)).where(Leader.level == level))).scalar_one()
    return (mx or 0) + 1


@router.get("/leaders/", response_model=list[LeaderOut])
async def leaders_list(request: Request, db: DB, _: Manager):
    return [leader_out(request, l) for l in await list_leaders(db)]


@router.post("/leaders/", response_model=LeaderOut, status_code=201)
async def leader_create(request: Request, db: DB, _: Manager, full_name: Annotated[str, Form()], position: Annotated[str, Form()],
                        level: Annotated[int, Form()], photo: Annotated[UploadFile | None, File()] = None):
    l = Leader(full_name=_clean_name(full_name, "full_name", "Нэр оруулна уу."),
               position=_clean_name(position, "position", "Албан тушаал оруулна уу."), level=_check_level(level))
    l.order = await _next_order(db, l.level)
    if photo is not None and photo.filename:
        l.photo = await save_upload(photo, "about", "photo")
    db.add(l)
    await db.commit()
    return leader_out(request, l)


@router.patch("/leaders/{id}/", response_model=LeaderOut)
async def leader_patch(id: int, body: LeaderPatch, request: Request, db: DB, _: Manager):
    l = await _get_or_404(db, Leader, id)
    d = body.model_dump(exclude_unset=True)
    if "full_name" in d:
        l.full_name = _clean_name(d["full_name"], "full_name", "Нэр оруулна уу.")
    if "position" in d:
        l.position = _clean_name(d["position"], "position", "Албан тушаал оруулна уу.")
    if d.get("level") is not None and d["level"] != l.level:
        l.level = _check_level(d["level"])
        l.order = await _next_order(db, l.level)
    await db.commit()
    return leader_out(request, l)


@router.delete("/leaders/{id}/", status_code=204)
async def leader_delete(id: int, db: DB, _: Manager):
    l = await _get_or_404(db, Leader, id)
    old = l.photo
    await db.delete(l)
    await db.commit()
    if old:
        delete_file(old)


@router.post("/leaders/{id}/photo/", response_model=LeaderOut)
async def leader_photo(id: int, request: Request, db: DB, _: Manager, photo: Annotated[UploadFile, File()]):
    l = await _get_or_404(db, Leader, id)
    old = l.photo
    l.photo = await save_upload(photo, "about", "photo")
    await db.commit()
    if old:
        delete_file(old)
    return leader_out(request, l)


@router.delete("/leaders/{id}/photo/", response_model=LeaderOut)
async def leader_photo_delete(id: int, request: Request, db: DB, _: Manager):
    l = await _get_or_404(db, Leader, id)
    old = l.photo
    l.photo = None
    await db.commit()
    if old:
        delete_file(old)
    return leader_out(request, l)


@router.put("/leaders/order/", response_model=list[LeaderOut])
async def leaders_order(body: LeadersOrderIn, request: Request, db: DB, _: Manager):
    leaders = await list_leaders(db)
    if sorted(i.id for i in body.items) != sorted(l.id for l in leaders):
        raise FieldError("items", "Бүх гишүүний id байх ёстой.")
    by_id = {i.id: i for i in body.items}
    for l in leaders:
        l.level = _check_level(by_id[l.id].level)
        l.order = by_id[l.id].order
    await db.commit()
    return [leader_out(request, l) for l in await list_leaders(db)]
```

Анхаар: `PUT /leaders/order/` нь `PATCH /leaders/{id}/`-тэй зөрчилдөхгүй (өөр method). `DELETE /leaders/{id}/photo/` ба `DELETE /leaders/{id}/` ялгаатай зам.

- [ ] **Step 4: Ногоон** — Run: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest tests/test_about_admin.py -q` → `3 passed` (`test_admin_requires_manager` одоо ногоон).

- [ ] **Step 5: Stage** — `git add backend/app/about/router_admin.py backend/tests/test_about_admin.py`

---

### Task 4: Admin — тэнхим ба багш нар

**Files:**
- Modify: `backend/app/about/router_admin.py`
- Test: `backend/tests/test_about_admin.py`

**Interfaces:**
- Consumes: Task 2-ийн `router`, `_get_or_404`, `_clean_name`; Task 1-ийн `department_out`, `list_departments`, схемүүд.

- [ ] **Step 1: Failing тест** — `backend/tests/test_about_admin.py`-д нэмнэ:

```python
async def test_departments_and_teachers(client, make_user):
    h = await manager_headers(client, make_user)
    r = await client.post(f"{A}/departments/", headers=h, json={"name": " Математик "})
    assert r.status_code == 201 and r.json()["name"] == "Математик" and r.json()["teachers"] == []
    d1 = r.json()["id"]
    d2 = (await client.post(f"{A}/departments/", headers=h, json={"name": "Физик"})).json()["id"]
    assert (await client.post(f"{A}/departments/", headers=h, json={"name": ""})).status_code == 400
    # багш нэмэх: эрхлэгч эхэнд, дараа нь order
    t1 = (await client.post(f"{A}/departments/{d1}/teachers/", headers=h, json={"full_name": "Багш А", "role": "Математикийн багш"})).json()
    t2 = (await client.post(f"{A}/departments/{d1}/teachers/", headers=h, json={"full_name": " Эрхлэгч ", "is_head": True})).json()
    t3 = (await client.post(f"{A}/departments/{d1}/teachers/", headers=h, json={"full_name": "Багш В"})).json()
    assert t2["full_name"] == "Эрхлэгч" and t2["is_head"] is True and t1["role"] == "Математикийн багш" and t3["role"] == ""
    r = await client.post(f"{A}/departments/{d1}/teachers/", headers=h, json={"full_name": " "})
    assert r.status_code == 400 and "full_name" in r.json()
    assert (await client.post(f"{A}/departments/9999/teachers/", headers=h, json={"full_name": "x"})).status_code == 404
    lst = (await client.get(f"{A}/departments/", headers=h)).json()
    assert [x["id"] for x in lst[0]["teachers"]] == [t2["id"], t1["id"], t3["id"]]
    # PATCH багш: эрхлэгчийг болиулах → order-оор
    r = await client.patch(f"{A}/teachers/{t2['id']}/", headers=h, json={"is_head": False, "role": "Ахлах багш"})
    assert r.status_code == 200 and r.json()["is_head"] is False and r.json()["role"] == "Ахлах багш"
    lst = (await client.get(f"{A}/departments/", headers=h)).json()
    assert [x["id"] for x in lst[0]["teachers"]] == [t1["id"], t2["id"], t3["id"]]
    # багшийн дараалал: тухайн тэнхимийн бүх id
    r = await client.put(f"{A}/departments/{d1}/teachers/order/", headers=h, json={"ids": [t3["id"], t1["id"]]})
    assert r.status_code == 400 and "ids" in r.json()
    r = await client.put(f"{A}/departments/{d1}/teachers/order/", headers=h, json={"ids": [t3["id"], t1["id"], t2["id"]]})
    assert r.status_code == 200 and [x["id"] for x in r.json()["teachers"]] == [t3["id"], t1["id"], t2["id"]]
    # тэнхимийн дараалал
    r = await client.put(f"{A}/departments/order/", headers=h, json={"ids": [d2]})
    assert r.status_code == 400 and "ids" in r.json()
    r = await client.put(f"{A}/departments/order/", headers=h, json={"ids": [d2, d1]})
    assert r.status_code == 200 and [x["id"] for x in r.json()] == [d2, d1]
    # PATCH тэнхим, олон нийтэд
    assert (await client.patch(f"{A}/departments/{d1}/", headers=h, json={"name": "Математик, мэдээлэл зүй"})).json()["name"] == "Математик, мэдээлэл зүй"
    pub = (await client.get("/api/about/")).json()["departments"]
    assert [x["name"] for x in pub] == ["Физик", "Математик, мэдээлэл зүй"] and len(pub[1]["teachers"]) == 3
    # багш устгах, тэнхим устгах (cascade)
    assert (await client.delete(f"{A}/teachers/{t3['id']}/", headers=h)).status_code == 204
    assert (await client.delete(f"{A}/teachers/{t3['id']}/", headers=h)).status_code == 404
    assert (await client.delete(f"{A}/departments/{d1}/", headers=h)).status_code == 204
    assert (await client.patch(f"{A}/teachers/{t1['id']}/", headers=h, json={"role": "x"})).status_code == 404
    assert [x["name"] for x in (await client.get("/api/about/")).json()["departments"]] == ["Физик"]
```

- [ ] **Step 2: Унахыг шалгах** — Run: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest tests/test_about_admin.py::test_departments_and_teachers -q` → FAIL (404).

- [ ] **Step 3: Endpoint-ууд** — `router_admin.py`-ийн төгсгөлд:

```python
# ---- тэнхим, багш ----
@router.get("/departments/", response_model=list[DepartmentOut])
async def departments_list(db: DB, _: Manager):
    return [department_out(d) for d in await list_departments(db)]


@router.post("/departments/", response_model=DepartmentOut, status_code=201)
async def department_create(body: DepartmentIn, db: DB, _: Manager):
    mx = (await db.execute(select(func.max(Department.order)))).scalar_one()
    d = Department(name=_clean_name(body.name, "name", "Нэр оруулна уу."), order=(mx or 0) + 1)
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return department_out(d)


@router.patch("/departments/{id}/", response_model=DepartmentOut)
async def department_patch(id: int, body: DepartmentPatch, db: DB, _: Manager):
    d = await _get_or_404(db, Department, id)
    if body.name is not None:
        d.name = _clean_name(body.name, "name", "Нэр оруулна уу.")
    await db.commit()
    await db.refresh(d)
    return department_out(d)


@router.delete("/departments/{id}/", status_code=204)
async def department_delete(id: int, db: DB, _: Manager):
    d = await _get_or_404(db, Department, id)
    await db.delete(d)
    await db.commit()


@router.put("/departments/order/", response_model=list[DepartmentOut])
async def departments_order(body: OrderIn, db: DB, _: Manager):
    deps = await list_departments(db)
    if sorted(body.ids) != sorted(d.id for d in deps):
        raise FieldError("ids", "Бүх тэнхимийн id байх ёстой.")
    pos = {did: i + 1 for i, did in enumerate(body.ids)}
    for d in deps:
        d.order = pos[d.id]
    await db.commit()
    return [department_out(d) for d in await list_departments(db)]


@router.post("/departments/{id}/teachers/", response_model=TeacherOut, status_code=201)
async def teacher_create(id: int, body: TeacherIn, db: DB, _: Manager):
    d = await _get_or_404(db, Department, id)
    mx = (await db.execute(select(func.max(DeptTeacher.order)).where(DeptTeacher.department_id == d.id))).scalar_one()
    t = DeptTeacher(department_id=d.id, full_name=_clean_name(body.full_name, "full_name", "Нэр оруулна уу."),
                    role=body.role.strip(), is_head=body.is_head, order=(mx or 0) + 1)
    db.add(t)
    await db.commit()
    return TeacherOut(id=t.id, full_name=t.full_name, role=t.role, is_head=t.is_head)


@router.patch("/teachers/{id}/", response_model=TeacherOut)
async def teacher_patch(id: int, body: TeacherPatch, db: DB, _: Manager):
    t = await _get_or_404(db, DeptTeacher, id)
    d = body.model_dump(exclude_unset=True)
    if "full_name" in d:
        t.full_name = _clean_name(d["full_name"], "full_name", "Нэр оруулна уу.")
    if d.get("role") is not None:
        t.role = d["role"].strip()
    if d.get("is_head") is not None:
        t.is_head = d["is_head"]
    await db.commit()
    return TeacherOut(id=t.id, full_name=t.full_name, role=t.role, is_head=t.is_head)


@router.delete("/teachers/{id}/", status_code=204)
async def teacher_delete(id: int, db: DB, _: Manager):
    t = await _get_or_404(db, DeptTeacher, id)
    await db.delete(t)
    await db.commit()


@router.put("/departments/{id}/teachers/order/", response_model=DepartmentOut)
async def teachers_order(id: int, body: OrderIn, db: DB, _: Manager):
    d = await _get_or_404(db, Department, id)
    if sorted(body.ids) != sorted(t.id for t in d.teachers):
        raise FieldError("ids", "Тэнхимийн бүх багшийн id байх ёстой.")
    pos = {tid: i + 1 for i, tid in enumerate(body.ids)}
    for t in d.teachers:
        t.order = pos[t.id]
    await db.commit()
    await db.refresh(d)
    return department_out(d)
```

Анхаар: `PUT /departments/order/` замыг `PATCH /departments/{id}/`-ээс өмнө/хойно бүртгэсэн нь хамаагүй (method өөр); харин `POST /departments/{id}/teachers/` ба `PUT /departments/{id}/teachers/order/` мөн ялгаатай. `db.refresh(d)` нь `teachers` selectin-ийг шинэчилнэ (commit-ийн дараа `expire_on_commit=False` тул refresh шаардлагатай).

- [ ] **Step 4: Ногоон** — Run: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest -q` → `149 passed` (143 + 2 public + 4 admin).

- [ ] **Step 5: Stage** — `git add backend/app/about/router_admin.py backend/tests/test_about_admin.py`

---

### Task 5: Frontend төрөл, api клиент, server fetch

**Files:**
- Modify: `frontend/src/lib/types.ts` (төгсгөлд), `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/about-api.ts`

**Interfaces:**
- Produces: төрлүүд `AboutStat, AboutPage, AboutPageInput, AboutLeader, AboutLeaderInput, AboutTeacher, AboutTeacherInput, AboutDepartment, AboutData`; `api.about.page.get/update`, `api.about.leaders.list/create/update/remove/setPhoto/removePhoto/reorder`, `api.about.departments.list/create/update/remove/reorder`, `api.about.teachers.create/update/remove/reorder`; `fetchAbout(): Promise<AboutData | null>`.

- [ ] **Step 1: Төрөл** — `frontend/src/lib/types.ts` төгсгөлд:

```ts
/* ---- Бидний тухай (backend/app/about/schemas.py) ---- */
export interface AboutStat { value: string; label: string }
export interface AboutPage { intro_title: string; intro_html: string; stats: AboutStat[] }
export type AboutPageInput = AboutPage;
export interface AboutLeader { id: number; full_name: string; position: string; level: number; photo: string | null }
export interface AboutLeaderInput { full_name: string; position: string; level: number }
export interface AboutTeacher { id: number; full_name: string; role: string; is_head: boolean }
export interface AboutTeacherInput { full_name: string; role: string; is_head: boolean }
export interface AboutDepartment { id: number; name: string; teachers: AboutTeacher[] }
export interface AboutData { page: AboutPage; leaders: AboutLeader[]; departments: AboutDepartment[] }
```

- [ ] **Step 2: API клиент** — `frontend/src/lib/api.ts`: импортын жагсаалтад `AboutDepartment, AboutLeader, AboutLeaderInput, AboutPage, AboutPageInput, AboutTeacher, AboutTeacherInput` нэмнэ (цагаан толгойн дарааллаар, `AcademicYear`-ийн өмнө). `api` объектын төгсгөлд (`clubsAdmin` блокийн дараа):

```ts
  /* ---- Бидний тухай (менежер) ---- */
  about: {
    page: {
      get: () => request<AboutPage>("/api/about/admin/page/"),
      update: (d: Partial<AboutPageInput>) => request<AboutPage>("/api/about/admin/page/", { method: "PATCH", body: d }),
    },
    leaders: {
      list: () => request<AboutLeader[]>("/api/about/admin/leaders/"),
      create: (d: AboutLeaderInput, photo: File | null) => {
        const fd = new FormData();
        fd.append("full_name", d.full_name); fd.append("position", d.position); fd.append("level", String(d.level));
        if (photo) fd.append("photo", photo);
        return request<AboutLeader>("/api/about/admin/leaders/", { method: "POST", body: fd });
      },
      update: (id: number, d: Partial<AboutLeaderInput>) => request<AboutLeader>(`/api/about/admin/leaders/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/about/admin/leaders/${id}/`, { method: "DELETE" }),
      setPhoto: (id: number, file: File) => { const fd = new FormData(); fd.append("photo", file); return request<AboutLeader>(`/api/about/admin/leaders/${id}/photo/`, { method: "POST", body: fd }); },
      removePhoto: (id: number) => request<AboutLeader>(`/api/about/admin/leaders/${id}/photo/`, { method: "DELETE" }),
      reorder: (items: { id: number; level: number; order: number }[]) => request<AboutLeader[]>("/api/about/admin/leaders/order/", { method: "PUT", body: { items } }),
    },
    departments: {
      list: () => request<AboutDepartment[]>("/api/about/admin/departments/"),
      create: (name: string) => request<AboutDepartment>("/api/about/admin/departments/", { method: "POST", body: { name } }),
      update: (id: number, name: string) => request<AboutDepartment>(`/api/about/admin/departments/${id}/`, { method: "PATCH", body: { name } }),
      remove: (id: number) => request<void>(`/api/about/admin/departments/${id}/`, { method: "DELETE" }),
      reorder: (ids: number[]) => request<AboutDepartment[]>("/api/about/admin/departments/order/", { method: "PUT", body: { ids } }),
    },
    teachers: {
      create: (deptId: number, d: AboutTeacherInput) => request<AboutTeacher>(`/api/about/admin/departments/${deptId}/teachers/`, { method: "POST", body: d }),
      update: (id: number, d: Partial<AboutTeacherInput>) => request<AboutTeacher>(`/api/about/admin/teachers/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/about/admin/teachers/${id}/`, { method: "DELETE" }),
      reorder: (deptId: number, ids: number[]) => request<AboutDepartment>(`/api/about/admin/departments/${deptId}/teachers/order/`, { method: "PUT", body: { ids } }),
    },
  },
```

- [ ] **Step 3: Server fetch** — `frontend/src/lib/about-api.ts`:

```ts
/* Server-side fetch (/about хуудас). Алдаанд null; 60 сек revalidate. news-api.ts-тэй ижил загвар. */

import type { AboutData } from "./types";

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function fetchAbout(): Promise<AboutData | null> {
  try {
    const res = await fetch(`${API}/api/about/`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as AboutData;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Шалгах** — Run: `cd frontend && node node_modules/typescript/bin/tsc --noEmit -p . && node node_modules/eslint/bin/eslint.js src/lib` → 0 алдаа.

- [ ] **Step 5: Stage** — `git add frontend/src/lib/types.ts frontend/src/lib/api.ts frontend/src/lib/about-api.ts`

---

### Task 6: Олон нийтийн `/about` хуудас + nav

**Files:**
- Create: `frontend/src/components/about/IntroSection.tsx`, `frontend/src/components/about/LeadershipChart.tsx`, `frontend/src/components/about/Departments.tsx`, `frontend/src/app/(site)/about/page.tsx`
- Modify: `frontend/src/lib/home-data.ts` (`NAV_LINKS`), `frontend/src/components/home/SiteFooter.tsx` (`LINKS`)

**Interfaces:**
- Consumes: Task 5-ийн `fetchAbout`, `AboutData`, `AboutLeader`, `AboutDepartment`; одоогийн `Reveal`, `HistoryTimeline`, `SiteFooter`.

- [ ] **Step 1: Танилцуулга** — `frontend/src/components/about/IntroSection.tsx`:

```tsx
/* Бидний тухай: navy дэвсгэрт гарчиг + танилцуулга (backend цэвэрлэсэн HTML) + үзүүлэлтийн мөр (0–4). Server component. */

import { Reveal } from "@/components/site/Reveal";
import type { AboutPage } from "@/lib/types";

export function IntroSection({ page }: { page: AboutPage }) {
  return (
    <section aria-labelledby="about-title" className="bg-navy text-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-12 md:px-10 lg:gap-12 lg:px-24 lg:py-[88px]">
        <Reveal className="flex max-w-3xl flex-col gap-5">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">Бидний тухай</p>
          <h1 id="about-title" className="font-display text-[30px] font-extrabold leading-tight lg:text-[42px]">{page.intro_title}</h1>
          {page.intro_html && <div className="news-body text-[17px] text-white/90 [&_a]:text-gold" dangerouslySetInnerHTML={{ __html: page.intro_html }} />}
        </Reveal>
        {page.stats.length > 0 && (
          <Reveal as="ul" stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
            {page.stats.map((s) => (
              <li key={s.label} className="flex flex-col gap-1 rounded-2xl border border-white/15 bg-white/5 px-5 py-5 lg:px-7 lg:py-6">
                <span className="font-display text-3xl font-extrabold text-gold lg:text-[40px]">{s.value}</span>
                <span className="text-sm text-white/80">{s.label}</span>
              </li>
            ))}
          </Reveal>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Удирдлагын бүтэц** — `frontend/src/components/about/LeadershipChart.tsx`:

```tsx
/* Удирдлагын шатлалтай бүтэц: түвшин бүр нэг мөр (1 том, 2 дунд, 3 жижиг карт), desktop-д мөр хооронд босоо холбогч.
   Зураггүй бол navy тойрогт нэрийн эхний үсэг. Server component; өгөгдөл level, order-оор эрэмбэлэгдэж ирнэ. */

import Image from "next/image";
import { Reveal } from "@/components/site/Reveal";
import type { AboutLeader } from "@/lib/types";

const SIZE: Record<number, { img: string; name: string; card: string }> = {
  1: { img: "h-40 w-40", name: "text-[22px]", card: "min-w-[240px]" },
  2: { img: "h-[120px] w-[120px]", name: "text-lg", card: "min-w-[200px]" },
  3: { img: "h-24 w-24", name: "text-base", card: "min-w-[170px]" },
};

function Avatar({ leader, cls }: { leader: AboutLeader; cls: string }) {
  if (leader.photo) {
    return (
      <span className={`relative block shrink-0 overflow-hidden rounded-full border-4 border-white shadow-md ${cls}`}>
        <Image src={leader.photo} alt={leader.full_name} fill unoptimized sizes="160px" className="object-cover" />
      </span>
    );
  }
  return <span className={`grid shrink-0 place-items-center rounded-full bg-navy font-display text-3xl font-extrabold text-gold ${cls}`} aria-hidden="true">{leader.full_name.trim().charAt(0)}</span>;
}

export function LeadershipChart({ leaders }: { leaders: AboutLeader[] }) {
  if (leaders.length === 0) return null;
  const levels = [1, 2, 3].map((lv) => leaders.filter((l) => l.level === lv)).filter((row) => row.length > 0);
  return (
    <section aria-labelledby="leaders-title" className="bg-paper-2">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-12 md:px-10 lg:px-24 lg:py-[72px]">
        <Reveal><h2 id="leaders-title" className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Удирдлага</h2></Reveal>
        <div className="flex flex-col items-center">
          {levels.map((row, i) => {
            const s = SIZE[row[0].level];
            return (
              <div key={row[0].level} className="flex w-full flex-col items-center">
                {i > 0 && <span className="hidden h-10 w-px bg-line lg:block" aria-hidden="true" />}
                <Reveal as="ul" stagger className="grid w-full grid-cols-2 gap-4 lg:flex lg:flex-wrap lg:justify-center lg:gap-6">
                  {row.map((l) => (
                    <li key={l.id} className={`flex flex-col items-center gap-3 rounded-2xl border border-line bg-white px-4 py-6 text-center lg:px-6 ${s.card}`}>
                      <Avatar leader={l} cls={s.img} />
                      <span className={`font-display font-extrabold leading-tight text-ink ${s.name}`}>{l.full_name}</span>
                      <span className="text-sm text-muted">{l.position}</span>
                    </li>
                  ))}
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Тэнхимүүд** — `frontend/src/components/about/Departments.tsx`:

```tsx
/* Тэнхимүүд: карт бүрт нэр + багш нар (эрхлэгч эхэнд, шар badge; бусад нэр + role). Server component. */

import { Reveal } from "@/components/site/Reveal";
import type { AboutDepartment } from "@/lib/types";

export function Departments({ departments }: { departments: AboutDepartment[] }) {
  if (departments.length === 0) return null;
  return (
    <section aria-labelledby="departments-title">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-12 md:px-10 lg:px-24 lg:py-[72px]">
        <Reveal><h2 id="departments-title" className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Тэнхимүүд</h2></Reveal>
        <Reveal as="ul" stagger className="grid gap-6 lg:grid-cols-2">
          {departments.map((d) => (
            <li key={d.id} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
              <h3 className="font-display text-xl font-extrabold text-navy">{d.name}</h3>
              {d.teachers.length > 0 ? (
                <ul className="divide-y divide-line">
                  {d.teachers.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                      <span className={t.is_head ? "font-bold text-ink" : "text-ink"}>{t.full_name}</span>
                      {t.is_head && <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-semibold text-ink">Эрхлэгч</span>}
                      {t.role && <span className="text-sm text-muted">{t.role}</span>}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">Багш нарын мэдээлэл удахгүй.</p>}
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Хуудас** — `frontend/src/app/(site)/about/page.tsx`:

```tsx
/* /about — Бидний тухай: танилцуулга + үзүүлэлт, удирдлагын бүтэц, тэнхимүүд, түүх (нүүрийн timeline). Server component. */

import type { Metadata } from "next";
import { Departments } from "@/components/about/Departments";
import { IntroSection } from "@/components/about/IntroSection";
import { LeadershipChart } from "@/components/about/LeadershipChart";
import { HistoryTimeline } from "@/components/home/HistoryTimeline";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { fetchAbout } from "@/lib/about-api";

const FALLBACK_DESC = "Шинэ Үе сургуулийн удирдлага, тэнхим, багш нар";

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchAbout();
  const text = (data?.page.intro_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { title: "Бидний тухай — Шинэ Үе сургууль", description: text ? text.slice(0, 160) : FALLBACK_DESC };
}

export default async function Page() {
  const data = await fetchAbout();
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        {data ? <IntroSection page={data.page} /> : (
          <Reveal as="section" className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-10 lg:px-24 lg:py-[72px]">
            <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Бидний тухай</h1>
          </Reveal>
        )}
        {data && <LeadershipChart leaders={data.leaders} />}
        {data && <Departments departments={data.departments} />}
        <Reveal><HistoryTimeline /></Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
```

`HistoryTimeline` нүүрэнд ямар wrapper-тэй байгааг `frontend/src/app/(site)/page.tsx`-ээс харж (`<Reveal><HistoryTimeline /></Reveal>`) ижил хэрэглэнэ.

- [ ] **Step 5: Nav ба хөл** — `frontend/src/lib/home-data.ts` `NAV_LINKS`: `{ href: "/", label: "Нүүр" }`-ийн дараа `{ href: "/about", label: "Бидний тухай" },`. `frontend/src/components/home/SiteFooter.tsx` `LINKS` эхэнд `{ href: "/about", label: "Бидний тухай" },`.

- [ ] **Step 6: Шалгах** — Run: `cd frontend && node node_modules/typescript/bin/tsc --noEmit -p . && node node_modules/eslint/bin/eslint.js src` → 0. Backend, frontend preview асаагаад (`preview_start` backend, frontend) `http://localhost:3000/about` desktop ба 375px: header-т "Бидний тухай" холбоос багтаж байгаа (desktop nav халихгүй: `document.getElementById('site-header').scrollWidth <= innerWidth`), хоосон өгөгдөлтэй үед зөвхөн танилцуулга (анхдагч гарчиг) + түүх харагдана. Nav халивал `SiteHeader.tsx`-ийн nav `gap-5`-ийг `gap-4`, `xl:gap-8`-ийг `xl:gap-6` болгоно.

- [ ] **Step 7: Stage**

```bash
git add frontend/src/components/about "frontend/src/app/(site)/about" frontend/src/lib/home-data.ts frontend/src/components/home/SiteFooter.tsx frontend/src/components/home/SiteHeader.tsx
```

---

### Task 7: Admin — sidebar, tab layout, Танилцуулга хуудас

**Files:**
- Modify: `frontend/src/app/admin/(dashboard)/layout.tsx` (`NAV`)
- Create: `frontend/src/app/admin/(dashboard)/about/layout.tsx`, `frontend/src/app/admin/(dashboard)/about/page.tsx`

**Interfaces:**
- Consumes: `api.about.page`, `AboutPage`, `AboutPageInput`, `AboutStat` (Task 5); `RichText` (`components/admin/RichText.tsx`, props `{value, onChange, onUploadImage}`), `api.news.posts.uploadImage`.

- [ ] **Step 1: Sidebar** — `frontend/src/app/admin/(dashboard)/layout.tsx` `NAV`-д `{ href: "/admin/clubs", ... }`-ийн дараа:

```ts
  { href: "/admin/about", label: "Бидний тухай", icon: "◈", role: "manager" },
```

- [ ] **Step 2: Tab layout** — `frontend/src/app/admin/(dashboard)/about/layout.tsx`:

```tsx
"use client";

/* Бидний тухай хэсгийн дэд цэс (табууд) — олимпиадын layout-тай ижил загвар. */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/about", label: "Танилцуулга", exact: true },
  { href: "/admin/about/leaders", label: "Удирдлага" },
  { href: "/admin/about/departments", label: "Тэнхим" },
];

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="space-y-6">
      <nav aria-label="Бидний тухай хэсгүүд" className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const active = t.exact ? path === t.href : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${active ? "border-navy text-navy" : "border-transparent text-slate-600 hover:text-navy"}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Танилцуулга хуудас** — `frontend/src/app/admin/(dashboard)/about/page.tsx`:

```tsx
"use client";

/* /admin/about — танилцуулгын гарчиг, rich text, үзүүлэлт (0–4). Олимпиадын тохиргооны хуудастай ижил загвар. */

import { useState, type FormEvent } from "react";
import { RichText } from "@/components/admin/RichText";
import { Button, Card, Field, Input, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AboutPageInput, AboutStat } from "@/lib/types";

const STATS_MAX = 4;

export default function AboutPageAdmin() {
  const q = useFetch(() => api.about.page.get(), []);
  const [form, setForm] = useState<AboutPageInput | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  // Серверийн өгөгдөл ирэхэд формыг нэг удаа дүүргэнэ (render-д, effect-гүй)
  const data = form ?? q.data ?? null;
  const set = (patch: Partial<AboutPageInput>) => data && setForm({ ...data, ...patch });
  const setStat = (i: number, patch: Partial<AboutStat>) => data && set({ stats: data.stats.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    setBusy(true); setErrors({}); setSaved(false);
    try { setForm(await api.about.page.update(data)); setSaved(true); }
    catch (err) { setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." }); }
    finally { setBusy(false); }
  }

  if (q.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  if (!data) return <Spinner />;

  return (
    <form onSubmit={save} className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Танилцуулга</h1>
        <p className="text-sm text-slate-600">Олон нийтийн <code>/about</code> хуудасны дээд хэсэг: гарчиг, танилцуулга, тоон үзүүлэлт.</p>
      </div>
      {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
      <Card className="space-y-4">
        <Field label="Гарчиг" error={errors.intro_title}><Input value={data.intro_title} onChange={(e) => set({ intro_title: e.target.value })} maxLength={160} /></Field>
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Танилцуулга</span>
          <RichText value={data.intro_html} onChange={(html) => set({ intro_html: html })} onUploadImage={(f) => api.news.posts.uploadImage(f).then((r) => r.url)} />
          {errors.intro_html && <p className="mt-1 text-xs font-medium text-red-600">{errors.intro_html}</p>}
        </div>
      </Card>
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-navy">Үзүүлэлт</h2>
          <Button type="button" variant="secondary" disabled={data.stats.length >= STATS_MAX} onClick={() => set({ stats: [...data.stats, { value: "", label: "" }] })}>Мөр нэмэх</Button>
        </div>
        {data.stats.length === 0 && <p className="text-sm text-slate-500">Үзүүлэлт байхгүй. 4 хүртэл мөр нэмж болно.</p>}
        {data.stats.map((s, i) => (
          <div key={i} className="flex items-end gap-2">
            <Field label="Тоо"><Input value={s.value} onChange={(e) => setStat(i, { value: e.target.value })} maxLength={20} placeholder="1200+" /></Field>
            <div className="flex-1"><Field label="Шошго"><Input value={s.label} onChange={(e) => setStat(i, { label: e.target.value })} maxLength={60} placeholder="Суралцагчид" /></Field></div>
            <button type="button" onClick={() => set({ stats: data.stats.filter((_, j) => j !== i) })} className="mb-1 inline-grid h-9 w-9 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label="Устгах" title="Устгах">🗑</button>
          </div>
        ))}
        {errors.stats && <p className="text-xs font-medium text-red-600">{errors.stats}</p>}
      </Card>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button>
        {saved && <span className="text-sm text-emerald-700">Хадгалагдлаа</span>}
      </div>
    </form>
  );
}
```

`Button`-ийн `variant` нэрсийг `components/ui.tsx`-ийн `Variant` төрлөөс шалгана ("secondary" байхгүй бол тэнд байгаа хоёрдогч хувилбарын нэрийг хэрэглэнэ).

- [ ] **Step 4: Шалгах** — tsc/eslint 0. Browser: `/admin/login` (`task9admin` / `Task9Pass!23`) → sidebar-т "Бидний тухай" → гарчиг, rich text, 2 үзүүлэлт бичиж Хадгалах → "Хадгалагдлаа"; `/about` дээр (60 сек кэш тул `?x=1` эсвэл dev-д шууд) гарчиг, текст, үзүүлэлт харагдана; 5 дахь мөр нэмэх товч идэвхгүй.

- [ ] **Step 5: Stage** — `git add "frontend/src/app/admin/(dashboard)/layout.tsx" "frontend/src/app/admin/(dashboard)/about"`

---

### Task 8: Admin — Удирдлага (жагсаалт + dialog)

**Files:**
- Create: `frontend/src/components/admin/about/LeaderList.tsx`, `frontend/src/components/admin/about/LeaderDialog.tsx`, `frontend/src/app/admin/(dashboard)/about/leaders/page.tsx`

**Interfaces:**
- Consumes: `api.about.leaders.*`, `AboutLeader`, `AboutLeaderInput`; `Modal, Button, Field, Input, Select, Empty, Spinner, Card` (`components/ui`).

- [ ] **Step 1: Dialog** — `frontend/src/components/admin/about/LeaderDialog.tsx`:

```tsx
"use client";

/* Удирдлагын гишүүн үүсгэх/засах Modal: нэр, албан тушаал, түвшин, зураг (preview). Үүсгэх: multipart нэг хүсэлт;
   засах: PATCH + (зураг сонгосон бол) setPhoto. "Зураг устгах" зөвхөн засах үед. */

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AboutLeader, AboutLeaderInput } from "@/lib/types";

const LEVELS = [1, 2, 3];

export function LeaderDialog({ leader, defaultLevel, open, onClose, onSaved }: {
  leader: AboutLeader | null; defaultLevel: number; open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [d, setD] = useState<AboutLeaderInput>(() => leader ? { full_name: leader.full_name, position: leader.position, level: leader.level } : { full_name: "", position: "", level: defaultLevel });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(leader?.photo ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL файлаас гаралтай, cleanup-д чөлөөлнө
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({});
    const body = { full_name: d.full_name.trim(), position: d.position.trim(), level: d.level };
    try {
      if (leader) {
        await api.about.leaders.update(leader.id, body);
        if (file) await api.about.leaders.setPhoto(leader.id, file);
      } else {
        await api.about.leaders.create(body, file);
      }
      onSaved(); onClose();
    } catch (err) {
      const fe = err instanceof ApiError ? err.fieldErrors : {};
      setErrors(Object.keys(fe).length ? fe : { non_field_errors: err instanceof ApiError ? err.message : "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  async function removePhoto() {
    if (!leader || !confirm("Зургийг устгах уу?")) return;
    try { const l = await api.about.leaders.removePhoto(leader.id); setPhoto(l.photo); setFile(null); setPreview(null); onSaved(); }
    catch { setErrors({ photo: "Устгаж чадсангүй." }); }
  }

  const shown = preview ?? photo;
  return (
    <Modal open={open} title={leader ? "Гишүүн засах" : "Гишүүн нэмэх"} onClose={onClose}
           footer={<><Button variant="ghost" type="button" onClick={onClose}>Болих</Button><Button type="submit" form="leader-form" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button></>}>
      <form id="leader-form" onSubmit={save} className="space-y-4">
        {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
        <Field label="Овог, нэр" error={errors.full_name}><Input value={d.full_name} onChange={(e) => setD({ ...d, full_name: e.target.value })} maxLength={120} autoFocus /></Field>
        <Field label="Албан тушаал" error={errors.position}><Input value={d.position} onChange={(e) => setD({ ...d, position: e.target.value })} maxLength={160} placeholder="Захирал" /></Field>
        <Field label="Түвшин" error={errors.level} hint="1 — захирал, 2 — дэд захирлууд, 3 — менежерүүд">
          <Select value={d.level} onChange={(e) => setD({ ...d, level: Number(e.target.value) })}>
            {LEVELS.map((lv) => <option key={lv} value={lv}>{lv}-р түвшин</option>)}
          </Select>
        </Field>
        <div className="flex items-start gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            {shown ? <Image src={shown} alt="" fill unoptimized sizes="96px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs text-slate-500">Зураггүй</span>}
          </div>
          <div className="space-y-2">
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Зураг сонгох"
                   onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
                   className="block text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy/90" />
            {errors.photo && <p className="text-xs font-medium text-red-600">{errors.photo}</p>}
            {leader && photo && !file && <Button variant="danger" type="button" onClick={removePhoto}>Зураг устгах</Button>}
            <p className="text-xs text-slate-500">JPEG/PNG/WebP, 10 MB хүртэл. Дөрвөлжин зураг тохиромжтой.</p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: Жагсаалт** — `frontend/src/components/admin/about/LeaderList.tsx`:

```tsx
"use client";

/* 3 түвшний блок; блок бүрт гишүүдийн мөр (зураг, нэр, албан тушаал, ▲▼, ✎, 🗑). ▲▼ → бүх жагсаалтыг reorder. */

import Image from "next/image";
import { Button, Card, Empty } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AboutLeader } from "@/lib/types";

const LEVEL_LABEL: Record<number, string> = { 1: "1-р түвшин (захирал)", 2: "2-р түвшин (дэд захирлууд)", 3: "3-р түвшин (менежерүүд)" };
const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base transition hover:bg-navy/10";

export function LeaderList({ leaders, onAdd, onEdit, onChanged }: {
  leaders: AboutLeader[]; onAdd: (level: number) => void; onEdit: (l: AboutLeader) => void; onChanged: () => void;
}) {
  async function move(level: number, i: number, dir: -1 | 1) {
    const row = leaders.filter((l) => l.level === level);
    const j = i + dir;
    if (j < 0 || j >= row.length) return;
    [row[i], row[j]] = [row[j], row[i]];
    const items = [1, 2, 3].flatMap((lv) => (lv === level ? row : leaders.filter((l) => l.level === lv)).map((l, k) => ({ id: l.id, level: lv, order: k + 1 })));
    try { await api.about.leaders.reorder(items); onChanged(); } catch { alert("Эрэмбийг хадгалж чадсангүй."); }
  }

  async function remove(l: AboutLeader) {
    if (!confirm(`«${l.full_name}» гишүүнийг устгах уу?`)) return;
    try { await api.about.leaders.remove(l.id); onChanged(); }
    catch (e) { alert(e instanceof ApiError ? e.message : "Устгаж чадсангүй."); }
  }

  return (
    <div className="space-y-6">
      {[1, 2, 3].map((level) => {
        const row = leaders.filter((l) => l.level === level);
        return (
          <Card key={level} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-navy">{LEVEL_LABEL[level]}</h2>
              <Button type="button" variant="secondary" onClick={() => onAdd(level)}>Гишүүн нэмэх</Button>
            </div>
            {row.length === 0 ? <Empty>Гишүүн байхгүй.</Empty> : (
              <ul className="divide-y divide-slate-200">
                {row.map((l, i) => (
                  <li key={l.id} className="flex items-center gap-3 py-2">
                    <span className="whitespace-nowrap">
                      <button onClick={() => move(level, i, -1)} disabled={i === 0} className="px-1 text-navy disabled:opacity-30" aria-label="Дээш">▲</button>
                      <button onClick={() => move(level, i, 1)} disabled={i === row.length - 1} className="px-1 text-navy disabled:opacity-30" aria-label="Доош">▼</button>
                    </span>
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-navy text-center font-bold leading-10 text-gold">
                      {l.photo ? <Image src={l.photo} alt="" fill unoptimized sizes="40px" className="object-cover" /> : l.full_name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-900">{l.full_name}</span>
                      <span className="block truncate text-sm text-slate-600">{l.position}</span>
                    </span>
                    <span className="whitespace-nowrap">
                      <button type="button" onClick={() => onEdit(l)} className={`${iconBtn} text-navy`} aria-label="Засах" title="Засах">✎</button>
                      <button type="button" onClick={() => remove(l)} className={`${iconBtn} text-red-600 hover:bg-red-50`} aria-label="Устгах" title="Устгах">🗑</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Хуудас** — `frontend/src/app/admin/(dashboard)/about/leaders/page.tsx`:

```tsx
"use client";

/* /admin/about/leaders — удирдлагын гишүүд (3 түвшин), нэмэх/засах dialog. */

import { useState } from "react";
import { LeaderDialog } from "@/components/admin/about/LeaderDialog";
import { LeaderList } from "@/components/admin/about/LeaderList";
import { Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AboutLeader } from "@/lib/types";

export default function LeadersAdminPage() {
  const q = useFetch(() => api.about.leaders.list(), []);
  const [dialog, setDialog] = useState<{ leader: AboutLeader | null; level: number } | null>(null);

  if (q.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  if (!q.data) return <Spinner />;
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Удирдлага</h1>
        <p className="text-sm text-slate-600">Олон нийтийн хуудсанд түвшин бүр нэг мөрөөр, энд байгаа дарааллаар харагдана.</p>
      </div>
      <LeaderList leaders={q.data} onAdd={(level) => setDialog({ leader: null, level })} onEdit={(l) => setDialog({ leader: l, level: l.level })} onChanged={q.reload} />
      {dialog && <LeaderDialog key={dialog.leader?.id ?? "new"} leader={dialog.leader} defaultLevel={dialog.level} open onClose={() => setDialog(null)} onSaved={q.reload} />}
    </div>
  );
}
```

- [ ] **Step 4: Шалгах** — tsc/eslint 0. Browser `/admin/about/leaders`: 1-р түвшинд зурагтай гишүүн нэмэх (preview харагдах), 2-р түвшинд 2 гишүүн, ▲▼ солих, засах dialog-д түвшин 3 болгох → 3-р блок руу шилжих, зураг устгах, гишүүн устгах confirm. `/about` дээр мөрүүд харагдах (зурагтай тойрог, зураггүй үсэг).

- [ ] **Step 5: Stage** — `git add frontend/src/components/admin/about "frontend/src/app/admin/(dashboard)/about/leaders"`

---

### Task 9: Admin — Тэнхим ба багш нар

**Files:**
- Create: `frontend/src/components/admin/about/DepartmentList.tsx`, `frontend/src/components/admin/about/TeacherTable.tsx`, `frontend/src/app/admin/(dashboard)/about/departments/page.tsx`

**Interfaces:**
- Consumes: `api.about.departments.*`, `api.about.teachers.*`, `AboutDepartment`, `AboutTeacher`; `Table, Th, Td, Button, Card, Empty, Input, Spinner` (`components/ui`).

- [ ] **Step 1: Тэнхимийн жагсаалт** — `frontend/src/components/admin/about/DepartmentList.tsx`:

```tsx
"use client";

/* Зүүн багана: тэнхимийн жагсаалт (сонгох, inline нэр засах, ▲▼, устгах), доор "Тэнхим нэмэх" мөр. */

import { useState, type FormEvent } from "react";
import { Button, Card, Empty, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AboutDepartment } from "@/lib/types";

const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base transition hover:bg-navy/10";

export function DepartmentList({ departments, selectedId, onSelect, onChanged }: {
  departments: AboutDepartment[]; selectedId: number | null; onSelect: (id: number) => void; onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [error, setError] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    try { const d = await api.about.departments.create(newName.trim()); setNewName(""); onChanged(); onSelect(d.id); }
    catch (err) { setError(err instanceof ApiError ? (err.fieldErrors.name ?? err.message) : "Нэмж чадсангүй."); }
  }

  async function rename(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    try { await api.about.departments.update(editing.id, editing.name.trim()); setEditing(null); onChanged(); }
    catch (err) { setError(err instanceof ApiError ? (err.fieldErrors.name ?? err.message) : "Хадгалж чадсангүй."); }
  }

  async function move(i: number, dir: -1 | 1) {
    const ids = departments.map((d) => d.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await api.about.departments.reorder(ids); onChanged(); } catch { setError("Эрэмбийг хадгалж чадсангүй."); }
  }

  async function remove(d: AboutDepartment) {
    if (!confirm(`«${d.name}» тэнхим болон ${d.teachers.length} багшийг устгах уу?`)) return;
    try { await api.about.departments.remove(d.id); onChanged(); } catch { setError("Устгаж чадсангүй."); }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-bold text-navy">Тэнхимүүд</h2>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {departments.length === 0 ? <Empty>Тэнхим нэмнэ үү.</Empty> : (
        <ul className="divide-y divide-slate-200">
          {departments.map((d, i) => (
            <li key={d.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${d.id === selectedId ? "bg-navy/10" : ""}`}>
              <span className="whitespace-nowrap">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-navy disabled:opacity-30" aria-label="Дээш">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === departments.length - 1} className="px-1 text-navy disabled:opacity-30" aria-label="Доош">▼</button>
              </span>
              {editing?.id === d.id ? (
                <form onSubmit={rename} className="flex flex-1 items-center gap-1">
                  <Input value={editing.name} onChange={(e) => setEditing({ id: d.id, name: e.target.value })} maxLength={120} autoFocus />
                  <Button type="submit">OK</Button>
                  <Button type="button" variant="ghost" onClick={() => setEditing(null)}>✕</Button>
                </form>
              ) : (
                <button type="button" onClick={() => onSelect(d.id)} className={`min-w-0 flex-1 truncate text-left font-semibold ${d.id === selectedId ? "text-navy" : "text-slate-800"}`}>
                  {d.name} <span className="text-xs font-normal text-slate-500">({d.teachers.length})</span>
                </button>
              )}
              <span className="whitespace-nowrap">
                <button type="button" onClick={() => setEditing({ id: d.id, name: d.name })} className={`${iconBtn} text-navy`} aria-label="Нэр засах" title="Нэр засах">✎</button>
                <button type="button" onClick={() => remove(d)} className={`${iconBtn} text-red-600 hover:bg-red-50`} aria-label="Устгах" title="Устгах">🗑</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex items-center gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Шинэ тэнхимийн нэр" maxLength={120} aria-label="Шинэ тэнхимийн нэр" />
        <Button type="submit" disabled={!newName.trim()}>Нэмэх</Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 2: Багшийн хүснэгт** — `frontend/src/components/admin/about/TeacherTable.tsx`:

```tsx
"use client";

/* Баруун багана: сонгосон тэнхимийн багш нар — нэр, хичээл/албан тушаал, Эрхлэгч checkbox (шууд PATCH), ▲▼, ✎ inline, 🗑;
   доор "Багш нэмэх" мөр. Жагсаалт backend-ийн эрэмбээр (эрхлэгч эхэнд) ирдэг тул мутаци бүрийн дараа onChanged. */

import { useState, type FormEvent } from "react";
import { Button, Card, Empty, Input, Table, Td, Th } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AboutDepartment, AboutTeacher, AboutTeacherInput } from "@/lib/types";

const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg text-base transition hover:bg-navy/10";
const EMPTY: AboutTeacherInput = { full_name: "", role: "", is_head: false };

export function TeacherTable({ department, onChanged }: { department: AboutDepartment; onChanged: () => void }) {
  const [draft, setDraft] = useState<AboutTeacherInput>(EMPTY);
  const [editing, setEditing] = useState<(AboutTeacherInput & { id: number }) | null>(null);
  const [error, setError] = useState("");
  const list = department.teachers;

  const fail = (err: unknown, fallback: string) => setError(err instanceof ApiError ? (err.fieldErrors.full_name ?? err.message) : fallback);

  async function add(e: FormEvent) {
    e.preventDefault(); setError("");
    try { await api.about.teachers.create(department.id, { ...draft, full_name: draft.full_name.trim(), role: draft.role.trim() }); setDraft(EMPTY); onChanged(); }
    catch (err) { fail(err, "Нэмж чадсангүй."); }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    try { await api.about.teachers.update(editing.id, { full_name: editing.full_name.trim(), role: editing.role.trim() }); setEditing(null); onChanged(); }
    catch (err) { fail(err, "Хадгалж чадсангүй."); }
  }

  async function toggleHead(t: AboutTeacher) {
    setError("");
    try { await api.about.teachers.update(t.id, { is_head: !t.is_head }); onChanged(); } catch (err) { fail(err, "Хадгалж чадсангүй."); }
  }

  async function move(i: number, dir: -1 | 1) {
    const ids = list.map((t) => t.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await api.about.teachers.reorder(department.id, ids); onChanged(); } catch { setError("Эрэмбийг хадгалж чадсангүй."); }
  }

  async function remove(t: AboutTeacher) {
    if (!confirm(`«${t.full_name}» багшийг устгах уу?`)) return;
    try { await api.about.teachers.remove(t.id); onChanged(); } catch { setError("Устгаж чадсангүй."); }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-bold text-navy">{department.name} — багш нар</h2>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {list.length === 0 ? <Empty>Багш байхгүй.</Empty> : (
        <Table head={<><Th></Th><Th>Нэр</Th><Th>Хичээл / албан тушаал</Th><Th>Эрхлэгч</Th><Th></Th></>}>
          {list.map((t, i) => (
            <tr key={t.id}>
              <Td className="whitespace-nowrap">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-navy disabled:opacity-30" aria-label="Дээш">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === list.length - 1} className="px-1 text-navy disabled:opacity-30" aria-label="Доош">▼</button>
              </Td>
              {editing?.id === t.id ? (
                <Td className="space-y-1" colSpan={2}>
                  <form id={`edit-${t.id}`} onSubmit={saveEdit} className="flex flex-wrap items-center gap-2">
                    <Input value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} maxLength={120} aria-label="Нэр" autoFocus />
                    <Input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} maxLength={120} aria-label="Хичээл / албан тушаал" placeholder="Математикийн багш" />
                    <Button type="submit">OK</Button>
                    <Button type="button" variant="ghost" onClick={() => setEditing(null)}>✕</Button>
                  </form>
                </Td>
              ) : (
                <>
                  <Td className={t.is_head ? "font-semibold text-navy" : "font-semibold"}>{t.full_name}</Td>
                  <Td className="text-slate-600">{t.role}</Td>
                </>
              )}
              <Td><input type="checkbox" checked={t.is_head} onChange={() => toggleHead(t)} aria-label={`${t.full_name} эрхлэгч`} className="h-4 w-4 accent-navy" /></Td>
              <Td className="whitespace-nowrap text-right">
                <button type="button" onClick={() => setEditing({ id: t.id, full_name: t.full_name, role: t.role, is_head: t.is_head })} className={`${iconBtn} text-navy`} aria-label="Засах" title="Засах">✎</button>
                <button type="button" onClick={() => remove(t)} className={`${iconBtn} text-red-600 hover:bg-red-50`} aria-label="Устгах" title="Устгах">🗑</button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <form onSubmit={add} className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
        <Input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} placeholder="Овог, нэр" maxLength={120} aria-label="Багшийн нэр" className="max-w-56" />
        <Input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="Хичээл / албан тушаал" maxLength={120} aria-label="Хичээл / албан тушаал" className="max-w-64" />
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={draft.is_head} onChange={(e) => setDraft({ ...draft, is_head: e.target.checked })} className="h-4 w-4 accent-navy" />Эрхлэгч</label>
        <Button type="submit" disabled={!draft.full_name.trim()}>Багш нэмэх</Button>
      </form>
    </Card>
  );
}
```

`Td` `colSpan` дэмжихгүй бол (`components/ui.tsx`-ийн `Td` зөвхөн `children, className` авдаг) — `Td`-г `({ children, className, ...p }: TdHTMLAttributes<HTMLTableCellElement>)` болгож `<td {...p} className=...>` дамжуулна (нэг мөрийн өөрчлөлт, бусад хэрэглээ хэвээр).

- [ ] **Step 3: Хуудас** — `frontend/src/app/admin/(dashboard)/about/departments/page.tsx`:

```tsx
"use client";

/* /admin/about/departments — зүүн тэнхимийн жагсаалт, баруун сонгосон тэнхимийн багш нар. Утсанд дээр доороо. */

import { useState } from "react";
import { DepartmentList } from "@/components/admin/about/DepartmentList";
import { TeacherTable } from "@/components/admin/about/TeacherTable";
import { Empty, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";

export default function DepartmentsAdminPage() {
  const q = useFetch(() => api.about.departments.list(), []);
  const [picked, setPicked] = useState<number | null>(null);

  if (q.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  if (!q.data) return <Spinner />;
  const list = q.data;
  const selected = list.find((d) => d.id === picked) ?? list[0] ?? null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Тэнхимүүд</h1>
        <p className="text-sm text-slate-600">Тэнхим бүрийн багш нар; эрхлэгч олон нийтийн хуудсанд эхэнд, шар тэмдэгтэй харагдана.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <DepartmentList departments={list} selectedId={selected?.id ?? null} onSelect={setPicked} onChanged={q.reload} />
        <div className="lg:col-span-2">
          {selected ? <TeacherTable department={selected} onChanged={q.reload} /> : <Empty>Тэнхим нэмнэ үү.</Empty>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Шалгах** — tsc/eslint 0. Browser `/admin/about/departments`: 2 тэнхим нэмэх, эхнийхэд 3 багш (нэг нь эрхлэгч) → эрхлэгч эхэнд; checkbox-оор эрхлэгч солих; ▲▼; нэр засах; тэнхим устгах confirm-д багшийн тоо гарах. `/about` дээр тэнхимийн карт, "Эрхлэгч" badge, role текст. 375px дээр хоёр багана дээр доороо.

- [ ] **Step 5: Stage** — `git add frontend/src/components/admin/about "frontend/src/app/admin/(dashboard)/about/departments" frontend/src/components/ui.tsx`

---

### Task 10: README, эцсийн шалгалт

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README** — `### Дугуйлангийн бүртгэл` хэсгийн дараа:

```markdown
### Бидний тухай (`/about`)

Танилцуулга + тоон үзүүлэлт, удирдлагын шатлалтай бүтэц (3 түвшин, зурагтай), тэнхим бүрийн багш нар (эрхлэгч эхэнд), түүх.
Менежер `/admin/about`-аас удирдана (Танилцуулга · Удирдлага · Тэнхим). API: `GET /api/about/` (нээлттэй),
`/api/about/admin/*` (manager). Зураг `MEDIA_DIR/about/`. Модуль `backend/app/about/`, migration `0010_about`.
```

- [ ] **Step 2: Бүх шалгалт**

Run: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest -q` → `149 passed`.
Run: `cd frontend && node node_modules/typescript/bin/tsc --noEmit -p . && node node_modules/eslint/bin/eslint.js src` → 0.
Browser: `/about` desktop + 375px бүтэн өгөгдөлтэй (Task 7–9-д оруулсан) screenshot; header nav халилтгүй; `/admin/about/*` 3 tab ажиллана.

- [ ] **Step 3: Stage** — `git add README.md` ; `git status --short` — бүх өөрчлөлт stage-д, commit хийхгүй.
