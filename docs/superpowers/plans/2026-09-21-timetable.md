# Хичээлийн хуваарь (Timetable) — хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сургалтын менежер хичээлийн жил, цагийн хүснэгт, анги, хичээл, багш, өрөө, хөтөлбөр, календарь оруулж, ангийн хуваарийг гараар (grid) эсвэл Excel-ээс бичихэд багш/өрөөний давхардлыг цагаар шалгадаг; олон нийт ангиар/багшаар/өрөөгөөр харж PDF татдаг, академик календарь үздэг систем.

**Architecture:** Backend `app/timetable/` — `models.py` (10 хүснэгт), `schemas.py`, `common.py` (DB/Manager/туслахууд), `router_setup.py` (жил, цагийн хүснэгт, анги, хичээл, багш, өрөө, хөтөлбөр, календарь CRUD), `conflicts.py` (цагийн огтлолцлоор давхардал), `grid.py` (ангийн хуваарийг бүхэлд нь шалгаж хадгалах — grid PUT ба импорт хоёулаа ашиглана), `router_lessons.py` (lessons, grid, curriculum-check, stats, import, pdf), `importer.py`, `pdf.py` (ReportLab). Frontend: `api.timetable.*`, `useYear` hook, админ `/admin/timetable/*` (nested layout + табууд), олон нийт `/timetable`, `/calendar`.

**Tech Stack:** FastAPI, SQLAlchemy 2 async, Alembic, PostgreSQL, python-calamine, ReportLab (DejaVu Sans); Next.js 16, React 19, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-18-backend-fastapi-and-timetable-design.md` (§5–8, §9-ийн timetable хэсэг)

## Global Constraints

- **Commit, push хийхгүй.** Working tree дээр ажиллана; task дууссаныг controller `git add`-аар тэмдэглэнэ.
- Одоогийн backend конвенц: зам төгсгөлийн `/`, алдаа `{field: ["msg"]}` (`FieldError`), 404 `{detail: "Олдсонгүй."}`, монгол docstring/мессеж, `Annotated[..., Depends()]`, IntegrityError → `await db.rollback()` → `raise FieldError(...) from None`, `flush()` дараа `commit()`.
- Унших endpoint бүгд нээлттэй; бичих endpoint `require_role("manager")` (superuser үргэлж зөвшөөрнө). `olympiad`/`news` эрхтэй хэрэглэгч timetable бичихэд **403**, нэвтрээгүй бол **401**.
- `?year=` нь `academic_years.id`; өгөөгүй бол `is_current` жил; одоогийн жил байхгүй бол жагсаалт `[]`.
- Давхардлыг **цагаар** (`[start_time, end_time)` огтлолцол, нэг жил, нэг weekday) шалгана, period-ийн дугаараар биш. Давхардлын хариу 400 `{"conflicts": [{weekday, period_id, period_order, kind: "teacher"|"room", with_class, who}]}`; юу ч хадгалагдахгүй.
- `weekday` 1–6 (1=Даваа); ангийн `weekday <= year.working_days`. Ангийн нэр `f"{grade}{letter}"` (жишээ `9а`).
- Excel формат: sheet бүр нэг анги (нэр `9а`), толгой `Цаг | Даваа | Мягмар | Лхагва | Пүрэв | Баасан | [Бямба]`, эхний багана period-ийн `order`, нүд `Хичээл / Багш / Өрөө` (өрөө сонголттой).
- PDF: А4 хэвтээ, DejaVu Sans (`backend/fonts/DejaVuSans.ttf`, `DejaVuSans-Bold.ttf`), `Content-Type: application/pdf`.
- Тест: `cd backend && uv run pytest` (Docker Postgres `shineue-db` асаалттай байх ёстой); `tests/conftest.py`-ийн `client`, `db`, `make_user`; `tests/helpers.py`-ийн `staff_headers`, шинэ `seed_timetable`, `manager_headers`, `timetable_setup`. Бүх тест ногоон байх ёстой (одоо 72 тест).
- Frontend: `cd frontend && npx tsc --noEmit -p tsconfig.json` ба `node node_modules/eslint/bin/eslint.js <files>` цэвэр (`results/import/page.tsx`-ийн 4 хуучин `no-unescaped-entities` алдаа энэ ажилд хамаарахгүй). Dev server-ийг Bash-аас асаахгүй — `.claude/launch.json`-ын `backend`, `frontend` тохиргоог preview tool-оор асаана.
- Админ UI: `@/components/ui`-ийн `Button, Card, Field, Input, Select, Textarea, Modal, Table, Th, Td, Badge, Spinner, Empty`; `useFetch`; `ApiError.fieldErrors`. Олон нийтийн хуудас: нүүрийн дизайны систем (`font-display`, `text-navy`, `border-line`, `bg-paper-2/3`, `text-muted`), анимацигүй.
- `useFetch`-ийн fetcher `null` буцаавал татахгүй (`yearId` хараахан байхгүй үед ашиглана). Бүх `setState` promise callback/handler дотор (React `set-state-in-effect` lint).

---

## Файлын бүтэц

```
backend/pyproject.toml                          # T7: reportlab
backend/fonts/DejaVuSans.ttf, DejaVuSans-Bold.ttf, LICENSE   # T7
backend/alembic/versions/0005_timetable.py      # T1
backend/app/models_all.py                       # T1: timetable models импорт
backend/app/main.py                             # T2: router_setup; T5: router_lessons
backend/app/common/errors.py                    # T5: ConflictError + handler
backend/app/timetable/__init__.py               # T1
backend/app/timetable/models.py                 # T1
backend/app/timetable/schemas.py                # T2 (бүх схем нэг дор)
backend/app/timetable/common.py                 # T2: DB, Manager, get_or_404, commit_or_400, delete_or_400, resolve_year
backend/app/timetable/router_setup.py           # T2 жил/цаг; T3 хичээл/багш/өрөө; T4 анги/хөтөлбөр/календарь
backend/app/timetable/conflicts.py              # T5
backend/app/timetable/grid.py                   # T5
backend/app/timetable/router_lessons.py         # T5 lessons/grid/check/stats; T6 import; T7 pdf
backend/app/timetable/importer.py               # T6
backend/app/timetable/pdf.py                    # T7
backend/scripts/seed_timetable.py               # T8
backend/tests/helpers.py                        # T1: seed_timetable, manager_headers, timetable_setup
backend/tests/test_timetable_models.py          # T1
backend/tests/test_timetable_setup.py           # T2
backend/tests/test_timetable_catalog.py         # T3
backend/tests/test_timetable_classes.py         # T4
backend/tests/test_timetable_grid.py            # T5
backend/tests/test_timetable_import.py          # T6
backend/tests/test_timetable_pdf.py             # T7

frontend/src/lib/types.ts                       # T9: timetable төрлүүд
frontend/src/lib/api.ts                         # T9: api.timetable
frontend/src/components/timetable/useYear.ts    # T9
frontend/src/components/timetable/YearSelect.tsx # T9
frontend/src/components/timetable/format.ts     # T9: WEEKDAY_NAMES, hm()
frontend/src/app/admin/(dashboard)/layout.tsx   # T9: цэсэнд "Хичээлийн хуваарь" (manager)
frontend/src/app/admin/(dashboard)/timetable/layout.tsx   # T9: табууд
frontend/src/app/admin/(dashboard)/timetable/page.tsx     # T9: тойм + жилүүд
frontend/src/app/admin/(dashboard)/timetable/setup/page.tsx      # T10
frontend/src/components/admin/timetable/PeriodsTab.tsx           # T10
frontend/src/components/admin/timetable/ClassesTab.tsx           # T10
frontend/src/components/admin/timetable/SubjectsTab.tsx          # T10
frontend/src/components/admin/timetable/TeachersTab.tsx          # T10
frontend/src/components/admin/timetable/RoomsTab.tsx             # T10
frontend/src/app/admin/(dashboard)/timetable/grid/page.tsx       # T11
frontend/src/components/admin/timetable/GridEditor.tsx           # T11
frontend/src/components/admin/timetable/CellPopover.tsx          # T11
frontend/src/components/admin/timetable/CurriculumPanel.tsx      # T11
frontend/src/app/admin/(dashboard)/timetable/curriculum/page.tsx # T12
frontend/src/app/admin/(dashboard)/timetable/calendar/page.tsx   # T12
frontend/src/app/admin/(dashboard)/timetable/import/page.tsx     # T12
frontend/src/app/timetable/page.tsx             # T13
frontend/src/components/timetable/TimetableView.tsx   # T13
frontend/src/components/timetable/TimetableGrid.tsx   # T13
frontend/src/lib/home-data.ts                   # T13: NAV_LINKS
frontend/src/components/home/SiteHeader.tsx     # T13: цэсний зай, aria-current
frontend/src/components/home/SiteFooter.tsx     # T13: /calendar холбоос
frontend/src/app/calendar/page.tsx              # T14
frontend/src/components/timetable/CalendarView.tsx    # T14
README.md                                       # T14
```

---

### Task 1: Модель, migration, тестийн seed

**Files:**
- Create: `backend/app/timetable/__init__.py` (хоосон), `backend/app/timetable/models.py`, `backend/alembic/versions/0005_timetable.py`
- Modify: `backend/app/models_all.py`, `backend/tests/helpers.py`
- Test: `backend/tests/test_timetable_models.py`

**Interfaces:**
- Produces: `AcademicYear, PeriodSet, Period, ClassGroup, Subject, Teacher, Room, Lesson, CurriculumEntry, CalendarEvent`, `WEEKDAY_NAMES: dict[int, str]`; `ClassGroup.name`, `Teacher.full_name` property; тестийн `seed_timetable(db) -> SimpleNamespace(year, primary, secondary, p, classes, subjects, teachers, rooms)`, `manager_headers(client, make_user)`, `timetable_setup(client, make_user, db) -> (tt, headers)` (API тестүүд үүнийг ашиглана — доорх docstring-ийн savepoint тайлбарыг үзнэ).

- [ ] **Step 1: Модель бичих**

`backend/app/timetable/models.py`:

```python
"""Хичээлийн хуваарь: жил, цагийн хүснэгт, анги, хичээл, багш, өрөө, хуваарь, хөтөлбөр, календарь."""

from datetime import date, time

from sqlalchemy import (
    Boolean, CheckConstraint, Column, Date, ForeignKey, Index, Integer, SmallInteger, String, Table, Text, Time,
    UniqueConstraint, text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base

WEEKDAY_NAMES: dict[int, str] = {1: "Даваа", 2: "Мягмар", 3: "Лхагва", 4: "Пүрэв", 5: "Баасан", 6: "Бямба"}
ROOM_KINDS = ("classroom", "lab", "gym", "other")
EVENT_CATEGORIES = ("term", "holiday", "exam", "event", "other")
APPLIES_TO = ("all", "primary", "secondary", "high")


class AcademicYear(Base):
    __tablename__ = "academic_years"
    __table_args__ = (
        # Зөвхөн нэг мөр is_current=true байж болно (partial unique index)
        Index("uq_academic_years_current", "is_current", unique=True, postgresql_where=text("is_current")),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True)  # "2026–2027"
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    working_days: Mapped[int] = mapped_column(SmallInteger, default=5)  # 5 эсвэл 6
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)


class PeriodSet(Base):
    """Цагийн хүснэгт: "Бага анги", "Дунд, ахлах анги" гэх мэт; ангиуд аль нэгийг нь ашиглана."""
    __tablename__ = "period_sets"
    __table_args__ = (UniqueConstraint("year_id", "name", name="uq_period_sets_year_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year_id: Mapped[int] = mapped_column(ForeignKey("academic_years.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(60))

    periods: Mapped[list["Period"]] = relationship(
        lazy="selectin", order_by="Period.order", cascade="all, delete-orphan", passive_deletes=True
    )


class Period(Base):
    __tablename__ = "periods"
    __table_args__ = (
        UniqueConstraint("period_set_id", "order", name="uq_periods_set_order"),
        CheckConstraint("end_time > start_time", name="ck_periods_time"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    period_set_id: Mapped[int] = mapped_column(ForeignKey("period_sets.id", ondelete="CASCADE"), index=True)
    order: Mapped[int] = mapped_column(SmallInteger)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    is_break: Mapped[bool] = mapped_column(Boolean, default=False)


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    short_name: Mapped[str] = mapped_column(String(20))
    color: Mapped[str] = mapped_column(String(7), default="#1e3a8f")


teacher_subjects = Table(
    "teacher_subjects", Base.metadata,
    Column("teacher_id", ForeignKey("teachers.id", ondelete="CASCADE"), primary_key=True),
    Column("subject_id", ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),
)


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    last_name: Mapped[str] = mapped_column(String(80), default="")
    first_name: Mapped[str] = mapped_column(String(80))
    short_name: Mapped[str] = mapped_column(String(40), unique=True)  # "Б.Мухулай"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    subjects: Mapped[list[Subject]] = relationship(secondary=teacher_subjects, lazy="selectin")

    @property
    def full_name(self) -> str:
        return f"{self.last_name} {self.first_name}".strip()


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True)
    capacity: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    kind: Mapped[str] = mapped_column(String(12), default="classroom")


class ClassGroup(Base):
    """Бүлэг анги: 9а. period_set нь тухайн ангийн цагийн хүснэгт."""
    __tablename__ = "class_groups"
    __table_args__ = (
        UniqueConstraint("year_id", "grade", "letter", name="uq_class_groups_year_grade_letter"),
        CheckConstraint("grade BETWEEN 1 AND 12", name="ck_class_groups_grade"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year_id: Mapped[int] = mapped_column(ForeignKey("academic_years.id", ondelete="CASCADE"), index=True)
    grade: Mapped[int] = mapped_column(SmallInteger)
    letter: Mapped[str] = mapped_column(String(4))
    period_set_id: Mapped[int] = mapped_column(ForeignKey("period_sets.id"))  # ашиглагдаж байвал устгахгүй
    homeroom_teacher_id: Mapped[int | None] = mapped_column(ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)

    year: Mapped[AcademicYear] = relationship(lazy="selectin")
    period_set: Mapped[PeriodSet] = relationship(lazy="selectin")

    @property
    def name(self) -> str:
        return f"{self.grade}{self.letter}"


class Lesson(Base):
    __tablename__ = "lessons"
    __table_args__ = (
        UniqueConstraint("class_group_id", "weekday", "period_id", name="uq_lessons_class_weekday_period"),
        CheckConstraint("weekday BETWEEN 1 AND 6", name="ck_lessons_weekday"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_group_id: Mapped[int] = mapped_column(ForeignKey("class_groups.id", ondelete="CASCADE"), index=True)
    weekday: Mapped[int] = mapped_column(SmallInteger)
    period_id: Mapped[int] = mapped_column(ForeignKey("periods.id"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), index=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True, index=True)

    class_group: Mapped[ClassGroup] = relationship(lazy="selectin")
    period: Mapped[Period] = relationship(lazy="selectin")
    subject: Mapped[Subject] = relationship(lazy="selectin")
    teacher: Mapped[Teacher] = relationship(lazy="selectin")
    room: Mapped[Room | None] = relationship(lazy="selectin")


class CurriculumEntry(Base):
    """Хөтөлбөр: анги бүрт хичээл бүр долоо хоногт хэдэн цаг."""
    __tablename__ = "curriculum_entries"
    __table_args__ = (UniqueConstraint("class_group_id", "subject_id", name="uq_curriculum_class_subject"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_group_id: Mapped[int] = mapped_column(ForeignKey("class_groups.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"))
    hours_per_week: Mapped[int] = mapped_column(SmallInteger)

    subject: Mapped[Subject] = relationship(lazy="selectin")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    __table_args__ = (CheckConstraint("end_date >= start_date", name="ck_calendar_events_dates"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year_id: Mapped[int] = mapped_column(ForeignKey("academic_years.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(10), default="event")  # term|holiday|exam|event|other
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    description: Mapped[str] = mapped_column(Text, default="")
    applies_to: Mapped[str] = mapped_column(String(10), default="all")  # all|primary|secondary|high
```

`backend/app/models_all.py`-д нэмнэ:

```python
from .timetable import models as timetable_models  # noqa: F401
```

- [ ] **Step 2: Migration бичих**

`backend/alembic/versions/0005_timetable.py`:

```python
"""timetable: academic years, period sets, periods, subjects, teachers, rooms, class groups, lessons, curriculum, calendar

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-21
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "academic_years",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(40), nullable=False, unique=True),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("working_days", sa.SmallInteger, nullable=False, server_default="5"),
        sa.Column("is_current", sa.Boolean, nullable=False, server_default=sa.false()),
    )
    op.create_index("uq_academic_years_current", "academic_years", ["is_current"], unique=True,
                    postgresql_where=sa.text("is_current"))
    op.create_table(
        "period_sets",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("year_id", sa.Integer, sa.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(60), nullable=False),
        sa.UniqueConstraint("year_id", "name", name="uq_period_sets_year_name"),
    )
    op.create_table(
        "periods",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("period_set_id", sa.Integer, sa.ForeignKey("period_sets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("order", sa.SmallInteger, nullable=False),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("end_time", sa.Time, nullable=False),
        sa.Column("is_break", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("period_set_id", "order", name="uq_periods_set_order"),
        sa.CheckConstraint("end_time > start_time", name="ck_periods_time"),
    )
    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(80), nullable=False, unique=True),
        sa.Column("short_name", sa.String(20), nullable=False),
        sa.Column("color", sa.String(7), nullable=False, server_default="#1e3a8f"),
    )
    op.create_table(
        "teachers",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("last_name", sa.String(80), nullable=False, server_default=""),
        sa.Column("first_name", sa.String(80), nullable=False),
        sa.Column("short_name", sa.String(40), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
    )
    op.create_table(
        "teacher_subjects",
        sa.Column("teacher_id", sa.Integer, sa.ForeignKey("teachers.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("subject_id", sa.Integer, sa.ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "rooms",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(40), nullable=False, unique=True),
        sa.Column("capacity", sa.SmallInteger, nullable=True),
        sa.Column("kind", sa.String(12), nullable=False, server_default="classroom"),
    )
    op.create_table(
        "class_groups",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("year_id", sa.Integer, sa.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("grade", sa.SmallInteger, nullable=False),
        sa.Column("letter", sa.String(4), nullable=False),
        sa.Column("period_set_id", sa.Integer, sa.ForeignKey("period_sets.id"), nullable=False),
        sa.Column("homeroom_teacher_id", sa.Integer, sa.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True),
        sa.UniqueConstraint("year_id", "grade", "letter", name="uq_class_groups_year_grade_letter"),
        sa.CheckConstraint("grade BETWEEN 1 AND 12", name="ck_class_groups_grade"),
    )
    op.create_table(
        "lessons",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("class_group_id", sa.Integer, sa.ForeignKey("class_groups.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("weekday", sa.SmallInteger, nullable=False),
        sa.Column("period_id", sa.Integer, sa.ForeignKey("periods.id"), nullable=False),
        sa.Column("subject_id", sa.Integer, sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("teacher_id", sa.Integer, sa.ForeignKey("teachers.id"), nullable=False, index=True),
        sa.Column("room_id", sa.Integer, sa.ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.UniqueConstraint("class_group_id", "weekday", "period_id", name="uq_lessons_class_weekday_period"),
        sa.CheckConstraint("weekday BETWEEN 1 AND 6", name="ck_lessons_weekday"),
    )
    op.create_table(
        "curriculum_entries",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("class_group_id", sa.Integer, sa.ForeignKey("class_groups.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("subject_id", sa.Integer, sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hours_per_week", sa.SmallInteger, nullable=False),
        sa.UniqueConstraint("class_group_id", "subject_id", name="uq_curriculum_class_subject"),
    )
    op.create_table(
        "calendar_events",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("year_id", sa.Integer, sa.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("category", sa.String(10), nullable=False, server_default="event"),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("applies_to", sa.String(10), nullable=False, server_default="all"),
        sa.CheckConstraint("end_date >= start_date", name="ck_calendar_events_dates"),
    )


def downgrade() -> None:
    for t in ("calendar_events", "curriculum_entries", "lessons", "class_groups", "rooms", "teacher_subjects",
              "teachers", "subjects", "periods", "period_sets"):
        op.drop_table(t)
    op.drop_index("uq_academic_years_current", table_name="academic_years")
    op.drop_table("academic_years")
```

- [ ] **Step 3: Тестийн seed туслах нэмэх**

`backend/tests/helpers.py`-ийн төгсгөлд нэмнэ:

```python
async def manager_headers(client, make_user, username="manager1"):
    """Сургалтын менежерийн (manager эрх) Authorization header."""
    return await staff_headers(client, make_user, username, roles=("manager",))


async def seed_timetable(db):
    """
    Хуваарийн тестийн суурь өгөгдөл (flush хийнэ, commit хийхгүй):
      year 2026–2027 (одоогийн, 5 өдөр)
      primary  "Бага анги":         p1 08:00–08:35, p2 08:35–08:50 (завсарлага), p3 08:50–09:25
      secondary "Дунд, ахлах анги": s1 08:00–08:40, s2 08:50–09:30
      classes: 1а (primary), 9а, 9б (secondary)
      subjects: Математик/Мат, Монгол хэл/Мон, Физик/Физ
      teachers: Б.Мухулай (Математик), Д.Сараа (Монгол хэл), Ц.Болд (Физик)
      rooms: 101, 204, 205
    Буцаана: SimpleNamespace(year, primary, secondary, p={("p",1): Period, ("s",2): ...},
                             classes={"9а": ClassGroup}, subjects={"Математик": Subject},
                             teachers={"Б.Мухулай": Teacher}, rooms={"204": Room})
    """
    from datetime import date, time
    from types import SimpleNamespace

    from app.timetable.models import AcademicYear, ClassGroup, Period, PeriodSet, Room, Subject, Teacher

    year = AcademicYear(name="2026–2027", start_date=date(2026, 9, 1), end_date=date(2027, 6, 10),
                        working_days=5, is_current=True)
    db.add(year)
    await db.flush()
    primary = PeriodSet(year_id=year.id, name="Бага анги")
    secondary = PeriodSet(year_id=year.id, name="Дунд, ахлах анги")
    db.add_all([primary, secondary])
    await db.flush()
    p = {
        ("p", 1): Period(period_set_id=primary.id, order=1, start_time=time(8, 0), end_time=time(8, 35)),
        ("p", 2): Period(period_set_id=primary.id, order=2, start_time=time(8, 35), end_time=time(8, 50), is_break=True),
        ("p", 3): Period(period_set_id=primary.id, order=3, start_time=time(8, 50), end_time=time(9, 25)),
        ("s", 1): Period(period_set_id=secondary.id, order=1, start_time=time(8, 0), end_time=time(8, 40)),
        ("s", 2): Period(period_set_id=secondary.id, order=2, start_time=time(8, 50), end_time=time(9, 30)),
    }
    subjects = {
        "Математик": Subject(name="Математик", short_name="Мат", color="#1e3a8f"),
        "Монгол хэл": Subject(name="Монгол хэл", short_name="Мон", color="#b91c1c"),
        "Физик": Subject(name="Физик", short_name="Физ", color="#047857"),
    }
    rooms = {n: Room(name=n) for n in ("101", "204", "205")}
    db.add_all([*p.values(), *subjects.values(), *rooms.values()])
    await db.flush()
    teachers = {
        "Б.Мухулай": Teacher(last_name="Батаа", first_name="Мухулай", short_name="Б.Мухулай", subjects=[subjects["Математик"]]),
        "Д.Сараа": Teacher(last_name="Дорж", first_name="Сараа", short_name="Д.Сараа", subjects=[subjects["Монгол хэл"]]),
        "Ц.Болд": Teacher(last_name="Цэнд", first_name="Болд", short_name="Ц.Болд", subjects=[subjects["Физик"]]),
    }
    classes = {
        "1а": ClassGroup(year_id=year.id, grade=1, letter="а", period_set_id=primary.id),
        "9а": ClassGroup(year_id=year.id, grade=9, letter="а", period_set_id=secondary.id),
        "9б": ClassGroup(year_id=year.id, grade=9, letter="б", period_set_id=secondary.id),
    }
    db.add_all([*teachers.values(), *classes.values()])
    await db.flush()
    # relationship-ууд (period_set.periods, class.year ...) ачаалагдсан байхын тулд
    for obj in (primary, secondary, *classes.values()):
        await db.refresh(obj)
    return SimpleNamespace(year=year, primary=primary, secondary=secondary, p=p, classes=classes,
                           subjects=subjects, teachers=teachers, rooms=rooms)


async def timetable_setup(client, make_user, db):
    """
    seed_timetable + manager_headers, дараа нь db.commit(). Тестийн session нь create_savepoint горимтой тул
    commit нь savepoint-ыг release хийнэ; ингэснээр router-ийн IntegrityError → db.rollback() зөвхөн тухайн
    хүсэлтийн savepoint-ыг буцааж, seed ба хэрэглэгч алга болохгүй. Буцаана: (tt, headers).
    """
    tt = await seed_timetable(db)
    h = await manager_headers(client, make_user)
    await db.commit()
    return tt, h
```

- [ ] **Step 4: Тест бичих**

`backend/tests/test_timetable_models.py`:

```python
from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.timetable.models import AcademicYear, ClassGroup, Lesson, Period
from tests.helpers import seed_timetable


async def test_seed_builds_expected_graph(db):
    tt = await seed_timetable(db)
    assert tt.classes["9а"].name == "9а" and tt.classes["9а"].period_set.name == "Дунд, ахлах анги"
    assert [p.order for p in tt.primary.periods] == [1, 2, 3] and tt.primary.periods[1].is_break is True
    assert tt.teachers["Б.Мухулай"].full_name == "Батаа Мухулай"
    assert [s.short_name for s in tt.teachers["Б.Мухулай"].subjects] == ["Мат"]


async def test_only_one_current_year(db):
    await seed_timetable(db)
    db.add(AcademicYear(name="2027–2028", start_date=date(2027, 9, 1), end_date=date(2028, 6, 10), is_current=True))
    with pytest.raises(IntegrityError):
        await db.flush()


async def test_lesson_slot_unique_per_class(db):
    tt = await seed_timetable(db)

    def mk():
        return Lesson(class_group_id=tt.classes["9а"].id, weekday=1, period_id=tt.p[("s", 1)].id,
                      subject_id=tt.subjects["Математик"].id, teacher_id=tt.teachers["Б.Мухулай"].id)

    db.add(mk())
    await db.flush()
    db.add(mk())
    with pytest.raises(IntegrityError):
        await db.flush()


async def test_deleting_year_cascades(db):
    tt = await seed_timetable(db)
    db.add(Lesson(class_group_id=tt.classes["9а"].id, weekday=1, period_id=tt.p[("s", 1)].id,
                  subject_id=tt.subjects["Математик"].id, teacher_id=tt.teachers["Б.Мухулай"].id))
    await db.flush()
    await db.delete(tt.year)
    await db.flush()
    assert (await db.execute(select(ClassGroup))).scalars().all() == []
    assert (await db.execute(select(Period))).scalars().all() == []
    assert (await db.execute(select(Lesson))).scalars().all() == []
```

- [ ] **Step 5: Тест ажиллуулах**

Run: `cd backend && uv run pytest tests/test_timetable_models.py -v --tb=short`
Expected: 4 PASSED (conftest-ийн `Base.metadata.create_all` шинэ хүснэгтүүдийг тестийн баазад үүсгэнэ).

- [ ] **Step 6: Migration-ийг хөгжүүлэлтийн бааз дээр ажиллуулах**

Run: `cd backend && uv run alembic upgrade head`
Expected: `Running upgrade 0004 -> 0005`. Дараа нь `uv run alembic check` → "No new upgrade operations detected." (модель ба migration тохирч буйг батална; зөрвөл migration-ийг засна).

- [ ] **Step 7: Бүх тест**

Run: `cd backend && uv run pytest --tb=short -q`
Expected: 76 passed.

---
### Task 2: Схем, нийтлэг туслахууд, жил + цагийн хүснэгтийн API

**Files:**
- Create: `backend/app/timetable/schemas.py`, `backend/app/timetable/common.py`, `backend/app/timetable/router_setup.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_timetable_setup.py`

**Interfaces:**
- Consumes: Task 1-ийн модель, `seed_timetable`, `manager_headers`.
- Produces: бүх pydantic схем (доор — дараагийн task-ууд эндээс импортолно); `common.DB`, `common.Manager`, `get_or_404(db, model, id)`, `commit_or_400(db, field, message)`, `delete_or_400(db, obj, message)`, `resolve_year(db, year_id) -> AcademicYear | None`; `router_setup.router` (prefix `/api/timetable`).
- Endpoint: `GET/POST years/`, `PATCH/DELETE years/{id}/`, `POST years/{id}/set-current/`, `GET period-sets/?year=`, `POST period-sets/`, `PATCH/DELETE period-sets/{id}/`, `POST periods/`, `PATCH/DELETE periods/{id}/`.

- [ ] **Step 1: Схемүүд**

`backend/app/timetable/schemas.py`:

```python
"""Хуваарийн pydantic схемүүд. JSON бүтэц frontend/src/lib/types.ts-ийн timetable төрлүүдтэй тохирно."""

from datetime import date as _date
from datetime import time as _time
from typing import Literal

from pydantic import BaseModel, Field

RoomKind = Literal["classroom", "lab", "gym", "other"]
EventCategory = Literal["term", "holiday", "exam", "event", "other"]
AppliesTo = Literal["all", "primary", "secondary", "high"]
ConflictKind = Literal["teacher", "room"]


class _Orm(BaseModel):
    model_config = {"from_attributes": True}


# ---- жил ----
class YearIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    start_date: _date
    end_date: _date
    working_days: int = Field(default=5, ge=5, le=6)


class YearPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=40)
    start_date: _date | None = None
    end_date: _date | None = None
    working_days: int | None = Field(default=None, ge=5, le=6)


class YearOut(_Orm):
    id: int
    name: str
    start_date: _date
    end_date: _date
    working_days: int
    is_current: bool


# ---- цагийн хүснэгт ----
class PeriodIn(BaseModel):
    period_set_id: int
    order: int = Field(ge=1, le=20)
    start_time: _time
    end_time: _time
    is_break: bool = False


class PeriodPatch(BaseModel):
    order: int | None = Field(default=None, ge=1, le=20)
    start_time: _time | None = None
    end_time: _time | None = None
    is_break: bool | None = None


class PeriodOut(_Orm):
    id: int
    period_set_id: int
    order: int
    start_time: _time
    end_time: _time
    is_break: bool


class PeriodSetIn(BaseModel):
    year_id: int
    name: str = Field(min_length=1, max_length=60)


class PeriodSetPatch(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class PeriodSetOut(_Orm):
    id: int
    year_id: int
    name: str
    periods: list[PeriodOut]


# ---- хичээл, багш, өрөө ----
class SubjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    short_name: str = Field(min_length=1, max_length=20)
    color: str = Field(default="#1e3a8f", pattern=r"^#[0-9a-fA-F]{6}$")


class SubjectPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    short_name: str | None = Field(default=None, min_length=1, max_length=20)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")


class SubjectOut(_Orm):
    id: int
    name: str
    short_name: str
    color: str


class TeacherIn(BaseModel):
    last_name: str = Field(default="", max_length=80)
    first_name: str = Field(min_length=1, max_length=80)
    short_name: str = Field(min_length=1, max_length=40)
    is_active: bool = True
    subject_ids: list[int] = []


class TeacherPatch(BaseModel):
    last_name: str | None = Field(default=None, max_length=80)
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    short_name: str | None = Field(default=None, min_length=1, max_length=40)
    is_active: bool | None = None
    subject_ids: list[int] | None = None


class TeacherOut(BaseModel):
    id: int
    last_name: str
    first_name: str
    short_name: str
    full_name: str
    is_active: bool
    subject_ids: list[int]


class RoomIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    capacity: int | None = Field(default=None, ge=1, le=500)
    kind: RoomKind = "classroom"


class RoomPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=40)
    capacity: int | None = Field(default=None, ge=1, le=500)
    kind: RoomKind | None = None


class RoomOut(_Orm):
    id: int
    name: str
    capacity: int | None
    kind: str


# ---- анги, хөтөлбөр, календарь ----
class ClassIn(BaseModel):
    year_id: int
    grade: int = Field(ge=1, le=12)
    letter: str = Field(min_length=1, max_length=4)
    period_set_id: int
    homeroom_teacher_id: int | None = None


class ClassPatch(BaseModel):
    grade: int | None = Field(default=None, ge=1, le=12)
    letter: str | None = Field(default=None, min_length=1, max_length=4)
    period_set_id: int | None = None
    homeroom_teacher_id: int | None = None


class ClassOut(BaseModel):
    id: int
    year_id: int
    grade: int
    letter: str
    name: str
    period_set_id: int
    homeroom_teacher_id: int | None


class CurriculumIn(BaseModel):
    class_group_id: int
    subject_id: int
    hours_per_week: int = Field(ge=1, le=20)


class CurriculumPatch(BaseModel):
    hours_per_week: int = Field(ge=1, le=20)


class CurriculumOut(BaseModel):
    id: int
    class_group_id: int
    subject_id: int
    hours_per_week: int
    subject: SubjectOut


class CalendarIn(BaseModel):
    year_id: int
    title: str = Field(min_length=1, max_length=120)
    category: EventCategory = "event"
    start_date: _date
    end_date: _date
    description: str = ""
    applies_to: AppliesTo = "all"


class CalendarPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    category: EventCategory | None = None
    start_date: _date | None = None
    end_date: _date | None = None
    description: str | None = None
    applies_to: AppliesTo | None = None


class CalendarOut(_Orm):
    id: int
    year_id: int
    title: str
    category: str
    start_date: _date
    end_date: _date
    description: str
    applies_to: str


# ---- хуваарь ----
class PeriodRef(BaseModel):
    id: int
    order: int
    start_time: _time
    end_time: _time
    is_break: bool


class TeacherRef(BaseModel):
    id: int
    short_name: str


class RoomRef(BaseModel):
    id: int
    name: str


class ClassRef(BaseModel):
    id: int
    name: str


class LessonOut(BaseModel):
    id: int
    weekday: int
    period: PeriodRef
    subject: SubjectOut
    teacher: TeacherRef
    room: RoomRef | None
    class_group: ClassRef


class GridCell(BaseModel):
    weekday: int = Field(ge=1, le=6)
    period_id: int
    subject_id: int
    teacher_id: int
    room_id: int | None = None


class ConflictOut(BaseModel):
    weekday: int
    period_id: int
    period_order: int
    kind: ConflictKind
    with_class: str
    who: str


class CurriculumCheckOut(BaseModel):
    subject: SubjectOut
    planned: int
    scheduled: int


class StatsOut(BaseModel):
    classes: int
    teachers: int
    rooms: int
    lessons: int
    mismatched_classes: int
```

- [ ] **Step 2: Нийтлэг туслахууд**

`backend/app/timetable/common.py`:

```python
"""Timetable router-уудын нийтлэг dependency, туслахууд."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import require_role
from ..auth.models import User
from ..common.errors import FieldError
from ..db import get_db
from .models import AcademicYear

DB = Annotated[AsyncSession, Depends(get_db)]
Manager = Annotated[User, Depends(require_role("manager"))]


async def get_or_404(db: AsyncSession, model, id: int):
    obj = await db.get(model, id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return obj


async def commit_or_400(db: AsyncSession, field: str, message: str) -> None:
    """flush + commit; unique/FK зөрчил гарвал 400 {field: [message]}."""
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise FieldError(field, message) from None
    await db.commit()


async def delete_or_400(db: AsyncSession, obj, message: str) -> None:
    """Устгана; өөр мөр (хуваарь, анги) ашиглаж байвал 400 {non_field_errors: [message]}."""
    await db.delete(obj)
    await commit_or_400(db, "non_field_errors", message)


async def resolve_year(db: AsyncSession, year: int | None) -> AcademicYear | None:
    """?year= өгсөн бол тэр жил (байхгүй бол 404); үгүй бол одоогийн жил (байхгүй бол None)."""
    if year is not None:
        return await get_or_404(db, AcademicYear, year)
    return (await db.execute(select(AcademicYear).where(AcademicYear.is_current.is_(True)))).scalar_one_or_none()
```

- [ ] **Step 3: Тест бичих**

`backend/tests/test_timetable_setup.py`:

```python
from tests.helpers import manager_headers, staff_headers, timetable_setup

YEAR = {"name": "2026–2027", "start_date": "2026-09-01", "end_date": "2027-06-10"}


async def test_years_crud_and_current(client, make_user):
    h = await manager_headers(client, make_user)
    r = await client.post("/api/timetable/years/", headers=h, json=YEAR)
    assert r.status_code == 201, r.text
    y1 = r.json()
    assert y1["is_current"] is True and y1["working_days"] == 5  # эхний жил автоматаар одоогийн

    r = await client.post("/api/timetable/years/", headers=h,
                          json={"name": "2027–2028", "start_date": "2027-09-01", "end_date": "2028-06-10", "working_days": 6})
    y2 = r.json()
    assert y2["is_current"] is False and y2["working_days"] == 6

    r = await client.post(f"/api/timetable/years/{y2['id']}/set-current/", headers=h)
    assert r.status_code == 200 and r.json()["is_current"] is True
    ys = (await client.get("/api/timetable/years/")).json()
    assert [(y["name"], y["is_current"]) for y in ys] == [("2027–2028", True), ("2026–2027", False)]

    r = await client.patch(f"/api/timetable/years/{y1['id']}/", headers=h, json={"end_date": "2026-01-01"})
    assert r.status_code == 400 and "end_date" in r.json()
    r = await client.post("/api/timetable/years/", headers=h, json=YEAR)
    assert r.status_code == 400 and r.json() == {"name": ["Ийм нэртэй хичээлийн жил байна."]}
    r = await client.post("/api/timetable/years/", headers=h, json={**YEAR, "name": "x", "working_days": 7})
    assert r.status_code == 400 and "working_days" in r.json()

    r = await client.delete(f"/api/timetable/years/{y1['id']}/", headers=h)
    assert r.status_code == 204
    assert len((await client.get("/api/timetable/years/")).json()) == 1
    assert (await client.delete("/api/timetable/years/999999/", headers=h)).status_code == 404


async def test_write_requires_manager(client, make_user):
    assert (await client.post("/api/timetable/years/", json=YEAR)).status_code == 401
    h = await staff_headers(client, make_user, "olymp", roles=("olympiad",))
    assert (await client.post("/api/timetable/years/", headers=h, json=YEAR)).status_code == 403
    su = await staff_headers(client, make_user, "root", superuser=True)
    assert (await client.post("/api/timetable/years/", headers=su, json=YEAR)).status_code == 201


async def test_period_sets_and_periods(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)

    sets = (await client.get("/api/timetable/period-sets/")).json()  # year өгөөгүй → одоогийн жил
    assert [s["name"] for s in sets] == ["Бага анги", "Дунд, ахлах анги"]
    assert sets[0]["periods"][0]["start_time"] == "08:00:00" and sets[0]["periods"][1]["is_break"] is True
    assert (await client.get(f"/api/timetable/period-sets/?year={tt.year.id}")).json() == sets
    assert (await client.get("/api/timetable/period-sets/?year=999999")).status_code == 404

    r = await client.post("/api/timetable/period-sets/", headers=h, json={"year_id": tt.year.id, "name": "Бага анги"})
    assert r.status_code == 400 and "name" in r.json()
    r = await client.post("/api/timetable/period-sets/", headers=h, json={"year_id": 999999, "name": "x"})
    assert r.status_code == 400 and "year_id" in r.json()
    r = await client.post("/api/timetable/period-sets/", headers=h, json={"year_id": tt.year.id, "name": "Ахлах"})
    assert r.status_code == 201, r.text
    assert r.json()["periods"] == []
    new_set = r.json()["id"]
    r = await client.patch(f"/api/timetable/period-sets/{new_set}/", headers=h, json={"name": "Ахлах анги"})
    assert r.json()["name"] == "Ахлах анги"

    r = await client.post("/api/timetable/periods/", headers=h,
                          json={"period_set_id": tt.primary.id, "order": 1, "start_time": "10:00", "end_time": "10:35"})
    assert r.json() == {"order": ["Энэ хүснэгтэд ийм дугаартай цаг байна."]}
    r = await client.post("/api/timetable/periods/", headers=h,
                          json={"period_set_id": tt.primary.id, "order": 9, "start_time": "10:00", "end_time": "09:35"})
    assert r.status_code == 400 and "end_time" in r.json()
    r = await client.post("/api/timetable/periods/", headers=h,
                          json={"period_set_id": tt.primary.id, "order": 9, "start_time": "10:00", "end_time": "10:35"})
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    r = await client.patch(f"/api/timetable/periods/{pid}/", headers=h, json={"is_break": True})
    assert r.json()["is_break"] is True
    r = await client.patch(f"/api/timetable/periods/{pid}/", headers=h, json={"end_time": "09:00"})
    assert r.status_code == 400 and "end_time" in r.json()
    assert (await client.delete(f"/api/timetable/periods/{pid}/", headers=h)).status_code == 204

    r = await client.delete(f"/api/timetable/period-sets/{tt.primary.id}/", headers=h)
    assert r.status_code == 400 and "non_field_errors" in r.json()  # 1а анги ашиглаж байна
    assert (await client.delete(f"/api/timetable/period-sets/{new_set}/", headers=h)).status_code == 204
```

- [ ] **Step 4: Тест ажиллуулж унахыг батлах**

Run: `cd backend && uv run pytest tests/test_timetable_setup.py -q --tb=line`
Expected: FAIL — 404 (router бүртгэгдээгүй).

- [ ] **Step 5: Router бичих**

`backend/app/timetable/router_setup.py`:

```python
"""
Хуваарийн тохиргооны API (/api/timetable/). Унших нээлттэй, бичих manager.
  years/ (GET, POST), years/{id}/ (PATCH, DELETE), years/{id}/set-current/ (POST)
  period-sets/?year= (GET), period-sets/ (POST), period-sets/{id}/ (PATCH, DELETE)
  periods/ (POST), periods/{id}/ (PATCH, DELETE)
  subjects/, teachers/, rooms/             (Task 3)
  classes/, curriculum/, calendar/         (Task 4)
"""

from fastapi import APIRouter
from sqlalchemy import func, select, update

from ..common.errors import FieldError
from .common import DB, Manager, commit_or_400, delete_or_400, get_or_404, resolve_year
from .models import AcademicYear, Period, PeriodSet
from .schemas import (
    PeriodIn, PeriodOut, PeriodPatch, PeriodSetIn, PeriodSetOut, PeriodSetPatch, YearIn, YearOut, YearPatch,
)

router = APIRouter(prefix="/api/timetable", tags=["timetable"])


# ---- жил ----
def _check_year_dates(y: AcademicYear) -> None:
    if y.end_date <= y.start_date:
        raise FieldError("end_date", "Дуусах огноо эхлэх огнооноос хойш байх ёстой.")


@router.get("/years/", response_model=list[YearOut])
async def years_list(db: DB):
    return (await db.execute(select(AcademicYear).order_by(AcademicYear.start_date.desc()))).scalars().all()


@router.post("/years/", response_model=YearOut, status_code=201)
async def year_create(body: YearIn, db: DB, _: Manager):
    count = (await db.execute(select(func.count(AcademicYear.id)))).scalar_one()
    y = AcademicYear(**body.model_dump(), is_current=(count == 0))  # эхний жил автоматаар одоогийн
    _check_year_dates(y)
    db.add(y)
    await commit_or_400(db, "name", "Ийм нэртэй хичээлийн жил байна.")
    return y


@router.patch("/years/{id}/", response_model=YearOut)
async def year_patch(id: int, body: YearPatch, db: DB, _: Manager):
    y = await get_or_404(db, AcademicYear, id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(y, k, v)
    _check_year_dates(y)
    await commit_or_400(db, "name", "Ийм нэртэй хичээлийн жил байна.")
    return y


@router.delete("/years/{id}/", status_code=204)
async def year_delete(id: int, db: DB, _: Manager):
    y = await get_or_404(db, AcademicYear, id)
    await db.delete(y)  # DB cascade: цагийн хүснэгт, анги, хуваарь, хөтөлбөр, календарь
    await db.commit()


@router.post("/years/{id}/set-current/", response_model=YearOut)
async def year_set_current(id: int, db: DB, _: Manager):
    y = await get_or_404(db, AcademicYear, id)
    await db.execute(update(AcademicYear).values(is_current=False))  # эхлээд бүгдийг унтраана (partial unique)
    y.is_current = True
    await db.commit()
    return y


# ---- цагийн хүснэгт ----
@router.get("/period-sets/", response_model=list[PeriodSetOut])
async def period_sets_list(db: DB, year: int | None = None):
    y = await resolve_year(db, year)
    if y is None:
        return []
    return (await db.execute(select(PeriodSet).where(PeriodSet.year_id == y.id).order_by(PeriodSet.name))).scalars().all()


@router.post("/period-sets/", response_model=PeriodSetOut, status_code=201)
async def period_set_create(body: PeriodSetIn, db: DB, _: Manager):
    if await db.get(AcademicYear, body.year_id) is None:
        raise FieldError("year_id", "Хичээлийн жил олдсонгүй.")
    ps = PeriodSet(**body.model_dump())
    db.add(ps)
    await commit_or_400(db, "name", "Энэ жилд ийм нэртэй цагийн хүснэгт байна.")
    await db.refresh(ps)  # periods=[] ачаална (selectin)
    return ps


@router.patch("/period-sets/{id}/", response_model=PeriodSetOut)
async def period_set_patch(id: int, body: PeriodSetPatch, db: DB, _: Manager):
    ps = await get_or_404(db, PeriodSet, id)
    ps.name = body.name
    await commit_or_400(db, "name", "Энэ жилд ийм нэртэй цагийн хүснэгт байна.")
    return ps


@router.delete("/period-sets/{id}/", status_code=204)
async def period_set_delete(id: int, db: DB, _: Manager):
    ps = await get_or_404(db, PeriodSet, id)
    await delete_or_400(db, ps, "Энэ цагийн хүснэгтийг анги эсвэл хуваарь ашиглаж байна.")


# ---- цаг ----
def _check_period(p: Period) -> None:
    if p.end_time <= p.start_time:
        raise FieldError("end_time", "Дуусах цаг эхлэх цагаас хойш байх ёстой.")


@router.post("/periods/", response_model=PeriodOut, status_code=201)
async def period_create(body: PeriodIn, db: DB, _: Manager):
    if await db.get(PeriodSet, body.period_set_id) is None:
        raise FieldError("period_set_id", "Цагийн хүснэгт олдсонгүй.")
    p = Period(**body.model_dump())
    _check_period(p)
    db.add(p)
    await commit_or_400(db, "order", "Энэ хүснэгтэд ийм дугаартай цаг байна.")
    return p


@router.patch("/periods/{id}/", response_model=PeriodOut)
async def period_patch(id: int, body: PeriodPatch, db: DB, _: Manager):
    p = await get_or_404(db, Period, id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    _check_period(p)
    await commit_or_400(db, "order", "Энэ хүснэгтэд ийм дугаартай цаг байна.")
    return p


@router.delete("/periods/{id}/", status_code=204)
async def period_delete(id: int, db: DB, _: Manager):
    p = await get_or_404(db, Period, id)
    await delete_or_400(db, p, "Энэ цагт хичээл байна.")
```

`backend/app/main.py`: `from .timetable.router_setup import router as timetable_setup_router` импортлоод `app.include_router(social_router)`-ын дараа `app.include_router(timetable_setup_router)` нэмнэ.

- [ ] **Step 6: Тест ажиллуулах**

Run: `cd backend && uv run pytest tests/test_timetable_setup.py -v --tb=short`
Expected: 3 PASSED.

- [ ] **Step 7: Бүх тест**

Run: `cd backend && uv run pytest --tb=short -q`
Expected: 79 passed.

---

### Task 3: Хичээл, багш, өрөөний API

**Files:**
- Modify: `backend/app/timetable/router_setup.py`
- Test: `backend/tests/test_timetable_catalog.py`

**Interfaces:**
- Consumes: `schemas.SubjectIn/Patch/Out, TeacherIn/Patch/Out, RoomIn/Patch/Out`, `common.*`.
- Produces: `GET/POST subjects/`, `PATCH/DELETE subjects/{id}/`; `GET teachers/?active=true|false`, `POST teachers/`, `PATCH/DELETE teachers/{id}/`; `GET/POST rooms/`, `PATCH/DELETE rooms/{id}/`; `teacher_out(t: Teacher) -> TeacherOut`.

- [ ] **Step 1: Тест бичих**

`backend/tests/test_timetable_catalog.py`:

```python
from app.timetable.models import Lesson
from tests.helpers import timetable_setup


async def test_subjects(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    names = [s["name"] for s in (await client.get("/api/timetable/subjects/")).json()]
    assert names == ["Математик", "Монгол хэл", "Физик"]

    r = await client.post("/api/timetable/subjects/", headers=h, json={"name": "Хими", "short_name": "Хим", "color": "#123456"})
    assert r.status_code == 201, r.text
    sid = r.json()["id"]
    r = await client.post("/api/timetable/subjects/", headers=h, json={"name": "Хими", "short_name": "Х"})
    assert r.json() == {"name": ["Ийм нэртэй хичээл байна."]}
    r = await client.post("/api/timetable/subjects/", headers=h, json={"name": "Био", "short_name": "Б", "color": "red"})
    assert r.status_code == 400 and "color" in r.json()
    r = await client.patch(f"/api/timetable/subjects/{sid}/", headers=h, json={"short_name": "Хими"})
    assert r.json()["short_name"] == "Хими" and r.json()["color"] == "#123456"
    assert (await client.delete(f"/api/timetable/subjects/{sid}/", headers=h)).status_code == 204

    db.add(Lesson(class_group_id=tt.classes["9а"].id, weekday=1, period_id=tt.p[("s", 1)].id,
                  subject_id=tt.subjects["Физик"].id, teacher_id=tt.teachers["Ц.Болд"].id))
    await db.flush()
    r = await client.delete(f"/api/timetable/subjects/{tt.subjects['Физик'].id}/", headers=h)
    assert r.status_code == 400 and r.json() == {"non_field_errors": ["Энэ хичээл хуваарьт ашиглагдаж байна."]}


async def test_teachers(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    ts = (await client.get("/api/timetable/teachers/")).json()
    assert [t["short_name"] for t in ts] == ["Б.Мухулай", "Д.Сараа", "Ц.Болд"]
    assert ts[0]["full_name"] == "Батаа Мухулай" and ts[0]["subject_ids"] == [tt.subjects["Математик"].id]

    body = {"last_name": "Ганбат", "first_name": "Оюун", "short_name": "Г.Оюун",
            "subject_ids": [tt.subjects["Математик"].id, tt.subjects["Физик"].id]}
    r = await client.post("/api/timetable/teachers/", headers=h, json=body)
    assert r.status_code == 201, r.text
    tid = r.json()["id"]
    assert sorted(r.json()["subject_ids"]) == sorted(body["subject_ids"]) and r.json()["is_active"] is True
    r = await client.post("/api/timetable/teachers/", headers=h, json={**body, "subject_ids": [999999]})
    assert r.status_code == 400 and "subject_ids" in r.json()
    r = await client.post("/api/timetable/teachers/", headers=h, json=body)
    assert r.json() == {"short_name": ["Ийм товч нэртэй багш байна."]}

    r = await client.patch(f"/api/timetable/teachers/{tid}/", headers=h, json={"is_active": False, "subject_ids": []})
    assert r.json()["is_active"] is False and r.json()["subject_ids"] == []
    assert len((await client.get("/api/timetable/teachers/?active=true")).json()) == 3
    assert len((await client.get("/api/timetable/teachers/?active=false")).json()) == 1
    assert (await client.delete(f"/api/timetable/teachers/{tid}/", headers=h)).status_code == 204

    db.add(Lesson(class_group_id=tt.classes["9а"].id, weekday=1, period_id=tt.p[("s", 1)].id,
                  subject_id=tt.subjects["Физик"].id, teacher_id=tt.teachers["Ц.Болд"].id))
    await db.flush()
    r = await client.delete(f"/api/timetable/teachers/{tt.teachers['Ц.Болд'].id}/", headers=h)
    assert r.status_code == 400 and "non_field_errors" in r.json()


async def test_rooms(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    assert [r["name"] for r in (await client.get("/api/timetable/rooms/")).json()] == ["101", "204", "205"]
    r = await client.post("/api/timetable/rooms/", headers=h, json={"name": "Спорт заал", "capacity": 60, "kind": "gym"})
    assert r.status_code == 201 and r.json()["kind"] == "gym"
    rid = r.json()["id"]
    r = await client.post("/api/timetable/rooms/", headers=h, json={"name": "204"})
    assert r.json() == {"name": ["Ийм нэртэй өрөө байна."]}
    r = await client.post("/api/timetable/rooms/", headers=h, json={"name": "x", "kind": "pool"})
    assert r.status_code == 400 and "kind" in r.json()
    r = await client.patch(f"/api/timetable/rooms/{rid}/", headers=h, json={"capacity": None})
    assert r.json()["capacity"] is None
    assert (await client.delete(f"/api/timetable/rooms/{rid}/", headers=h)).status_code == 204

    # Өрөө хуваарьт байсан ч устгаж болно (lessons.room_id SET NULL)
    db.add(Lesson(class_group_id=tt.classes["9а"].id, weekday=1, period_id=tt.p[("s", 1)].id,
                  subject_id=tt.subjects["Физик"].id, teacher_id=tt.teachers["Ц.Болд"].id, room_id=tt.rooms["204"].id))
    await db.flush()
    assert (await client.delete(f"/api/timetable/rooms/{tt.rooms['204'].id}/", headers=h)).status_code == 204
```

- [ ] **Step 2: Тест унахыг батлах**

Run: `cd backend && uv run pytest tests/test_timetable_catalog.py -q --tb=line`
Expected: FAIL — 404.

- [ ] **Step 3: Router-т нэмэх**

`backend/app/timetable/router_setup.py`-д импорт нэмнэ: `from .models import AcademicYear, Period, PeriodSet, Room, Subject, Teacher` ба `from .schemas import (..., RoomIn, RoomOut, RoomPatch, SubjectIn, SubjectOut, SubjectPatch, TeacherIn, TeacherOut, TeacherPatch)`. Файлын төгсгөлд:

```python
# ---- хичээл ----
@router.get("/subjects/", response_model=list[SubjectOut])
async def subjects_list(db: DB):
    return (await db.execute(select(Subject).order_by(Subject.name))).scalars().all()


@router.post("/subjects/", response_model=SubjectOut, status_code=201)
async def subject_create(body: SubjectIn, db: DB, _: Manager):
    s = Subject(**body.model_dump())
    db.add(s)
    await commit_or_400(db, "name", "Ийм нэртэй хичээл байна.")
    return s


@router.patch("/subjects/{id}/", response_model=SubjectOut)
async def subject_patch(id: int, body: SubjectPatch, db: DB, _: Manager):
    s = await get_or_404(db, Subject, id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    await commit_or_400(db, "name", "Ийм нэртэй хичээл байна.")
    return s


@router.delete("/subjects/{id}/", status_code=204)
async def subject_delete(id: int, db: DB, _: Manager):
    s = await get_or_404(db, Subject, id)
    await delete_or_400(db, s, "Энэ хичээл хуваарьт ашиглагдаж байна.")


# ---- багш ----
def teacher_out(t: Teacher) -> TeacherOut:
    return TeacherOut(id=t.id, last_name=t.last_name, first_name=t.first_name, short_name=t.short_name,
                      full_name=t.full_name, is_active=t.is_active, subject_ids=[s.id for s in t.subjects])


async def _subjects_by_ids(db, ids: list[int]) -> list[Subject]:
    if not ids:
        return []
    subs = (await db.execute(select(Subject).where(Subject.id.in_(ids)))).scalars().all()
    if len(subs) != len(set(ids)):
        raise FieldError("subject_ids", "Хичээл олдсонгүй.")
    return list(subs)


@router.get("/teachers/", response_model=list[TeacherOut])
async def teachers_list(db: DB, active: bool | None = None):
    q = select(Teacher).order_by(Teacher.short_name)
    if active is not None:
        q = q.where(Teacher.is_active.is_(active))
    return [teacher_out(t) for t in (await db.execute(q)).scalars().all()]


@router.post("/teachers/", response_model=TeacherOut, status_code=201)
async def teacher_create(body: TeacherIn, db: DB, _: Manager):
    data = body.model_dump()
    subjects = await _subjects_by_ids(db, data.pop("subject_ids"))
    t = Teacher(**data, subjects=subjects)
    db.add(t)
    await commit_or_400(db, "short_name", "Ийм товч нэртэй багш байна.")
    return teacher_out(t)


@router.patch("/teachers/{id}/", response_model=TeacherOut)
async def teacher_patch(id: int, body: TeacherPatch, db: DB, _: Manager):
    t = await get_or_404(db, Teacher, id)
    data = body.model_dump(exclude_unset=True)
    if "subject_ids" in data:
        t.subjects = await _subjects_by_ids(db, data.pop("subject_ids") or [])
    for k, v in data.items():
        setattr(t, k, v)
    await commit_or_400(db, "short_name", "Ийм товч нэртэй багш байна.")
    return teacher_out(t)


@router.delete("/teachers/{id}/", status_code=204)
async def teacher_delete(id: int, db: DB, _: Manager):
    t = await get_or_404(db, Teacher, id)
    await delete_or_400(db, t, "Энэ багш хуваарьт байна.")


# ---- өрөө ----
@router.get("/rooms/", response_model=list[RoomOut])
async def rooms_list(db: DB):
    return (await db.execute(select(Room).order_by(Room.name))).scalars().all()


@router.post("/rooms/", response_model=RoomOut, status_code=201)
async def room_create(body: RoomIn, db: DB, _: Manager):
    r = Room(**body.model_dump())
    db.add(r)
    await commit_or_400(db, "name", "Ийм нэртэй өрөө байна.")
    return r


@router.patch("/rooms/{id}/", response_model=RoomOut)
async def room_patch(id: int, body: RoomPatch, db: DB, _: Manager):
    r = await get_or_404(db, Room, id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    await commit_or_400(db, "name", "Ийм нэртэй өрөө байна.")
    return r


@router.delete("/rooms/{id}/", status_code=204)
async def room_delete(id: int, db: DB, _: Manager):
    r = await get_or_404(db, Room, id)
    await db.delete(r)  # lessons.room_id → NULL
    await db.commit()
```

Docstring-ийн "(Task 3)" тэмдэглэгээг устгана.

- [ ] **Step 4: Тест ажиллуулах**

Run: `cd backend && uv run pytest tests/test_timetable_catalog.py -v --tb=short`
Expected: 3 PASSED. Хэрэв `test_subjects`-ийн `Хими` устгах дээр `subject_ids`-тэй холбоотой алдаа гарвал: `teacher_subjects` CASCADE тул устгал зөв; асуудал `Lesson` FK-д байвал мессежийг шалгана.

- [ ] **Step 5: Бүх тест**

Run: `cd backend && uv run pytest --tb=short -q`
Expected: 82 passed.

---

### Task 4: Анги, хөтөлбөр, календарийн API

**Files:**
- Modify: `backend/app/timetable/router_setup.py`
- Test: `backend/tests/test_timetable_classes.py`

**Interfaces:**
- Produces: `GET classes/?year=`, `POST classes/`, `PATCH/DELETE classes/{id}/`; `GET curriculum/?class=<id>`, `POST curriculum/`, `PATCH/DELETE curriculum/{id}/`; `GET calendar/?year=`, `POST calendar/`, `PATCH/DELETE calendar/{id}/`; `class_out(c: ClassGroup) -> ClassOut`.

- [ ] **Step 1: Тест бичих**

`backend/tests/test_timetable_classes.py`:

```python
from tests.helpers import timetable_setup


async def test_classes(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    cs = (await client.get("/api/timetable/classes/")).json()
    assert [c["name"] for c in cs] == ["1а", "9а", "9б"]
    assert cs[0]["period_set_id"] == tt.primary.id and cs[0]["homeroom_teacher_id"] is None

    body = {"year_id": tt.year.id, "grade": 9, "letter": "в", "period_set_id": tt.secondary.id,
            "homeroom_teacher_id": tt.teachers["Ц.Болд"].id}
    r = await client.post("/api/timetable/classes/", headers=h, json=body)
    assert r.status_code == 201, r.text
    cid = r.json()["id"]
    assert r.json()["name"] == "9в"
    r = await client.post("/api/timetable/classes/", headers=h, json=body)
    assert r.json() == {"letter": ["Энэ жилд ийм анги байна."]}
    r = await client.post("/api/timetable/classes/", headers=h, json={**body, "letter": "г", "period_set_id": 999999})
    assert r.status_code == 400 and "period_set_id" in r.json()
    r = await client.post("/api/timetable/classes/", headers=h, json={**body, "letter": "г", "homeroom_teacher_id": 999999})
    assert r.status_code == 400 and "homeroom_teacher_id" in r.json()
    r = await client.post("/api/timetable/classes/", headers=h, json={**body, "letter": "г", "grade": 13})
    assert r.status_code == 400 and "grade" in r.json()

    r = await client.patch(f"/api/timetable/classes/{cid}/", headers=h, json={"period_set_id": tt.primary.id, "homeroom_teacher_id": None})
    assert r.json()["period_set_id"] == tt.primary.id and r.json()["homeroom_teacher_id"] is None
    assert (await client.delete(f"/api/timetable/classes/{cid}/", headers=h)).status_code == 204
    assert len((await client.get(f"/api/timetable/classes/?year={tt.year.id}")).json()) == 3


async def test_period_set_must_belong_to_class_year(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    r = await client.post("/api/timetable/years/", headers=h,
                          json={"name": "2027–2028", "start_date": "2027-09-01", "end_date": "2028-06-10"})
    y2 = r.json()["id"]
    r = await client.post("/api/timetable/classes/", headers=h,
                          json={"year_id": y2, "grade": 1, "letter": "а", "period_set_id": tt.primary.id})
    assert r.json() == {"period_set_id": ["Цагийн хүснэгт энэ жилийнх биш."]}


async def test_curriculum(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    c9 = tt.classes["9а"].id
    r = await client.post("/api/timetable/curriculum/", headers=h,
                          json={"class_group_id": c9, "subject_id": tt.subjects["Математик"].id, "hours_per_week": 5})
    assert r.status_code == 201, r.text
    eid = r.json()["id"]
    assert r.json()["subject"]["short_name"] == "Мат"
    r = await client.post("/api/timetable/curriculum/", headers=h,
                          json={"class_group_id": c9, "subject_id": tt.subjects["Математик"].id, "hours_per_week": 3})
    assert r.json() == {"subject_id": ["Энэ ангид энэ хичээл аль хэдийн байна."]}
    r = await client.post("/api/timetable/curriculum/", headers=h,
                          json={"class_group_id": c9, "subject_id": 999999, "hours_per_week": 3})
    assert r.status_code == 400 and "subject_id" in r.json()
    r = await client.post("/api/timetable/curriculum/", headers=h,
                          json={"class_group_id": c9, "subject_id": tt.subjects["Физик"].id, "hours_per_week": 0})
    assert r.status_code == 400 and "hours_per_week" in r.json()
    await client.post("/api/timetable/curriculum/", headers=h,
                      json={"class_group_id": c9, "subject_id": tt.subjects["Физик"].id, "hours_per_week": 2})

    items = (await client.get(f"/api/timetable/curriculum/?class={c9}")).json()
    assert [(i["subject"]["name"], i["hours_per_week"]) for i in items] == [("Математик", 5), ("Физик", 2)]
    assert (await client.get("/api/timetable/curriculum/")).status_code == 400  # class заавал
    r = await client.patch(f"/api/timetable/curriculum/{eid}/", headers=h, json={"hours_per_week": 4})
    assert r.json()["hours_per_week"] == 4
    assert (await client.delete(f"/api/timetable/curriculum/{eid}/", headers=h)).status_code == 204
    assert len((await client.get(f"/api/timetable/curriculum/?class={c9}")).json()) == 1


async def test_calendar(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    term = {"year_id": tt.year.id, "title": "1-р улирал", "category": "term",
            "start_date": "2026-09-01", "end_date": "2026-11-06"}
    r = await client.post("/api/timetable/calendar/", headers=h, json=term)
    assert r.status_code == 201, r.text
    tid = r.json()["id"]
    assert r.json()["applies_to"] == "all" and r.json()["description"] == ""
    r = await client.post("/api/timetable/calendar/", headers=h, json={**term, "end_date": "2026-08-01"})
    assert r.status_code == 400 and "end_date" in r.json()
    r = await client.post("/api/timetable/calendar/", headers=h, json={**term, "category": "party"})
    assert r.status_code == 400 and "category" in r.json()
    r = await client.post("/api/timetable/calendar/", headers=h, json={**term, "year_id": 999999})
    assert r.status_code == 400 and "year_id" in r.json()
    await client.post("/api/timetable/calendar/", headers=h,
                      json={"year_id": tt.year.id, "title": "Багш нарын өдөр", "category": "holiday",
                            "start_date": "2026-10-05", "end_date": "2026-10-05", "applies_to": "primary"})

    evs = (await client.get("/api/timetable/calendar/")).json()
    assert [e["title"] for e in evs] == ["1-р улирал", "Багш нарын өдөр"]  # start_date-аар
    r = await client.patch(f"/api/timetable/calendar/{tid}/", headers=h, json={"description": "Намрын улирал"})
    assert r.json()["description"] == "Намрын улирал"
    r = await client.patch(f"/api/timetable/calendar/{tid}/", headers=h, json={"start_date": "2026-12-01"})
    assert r.status_code == 400 and "end_date" in r.json()
    assert (await client.delete(f"/api/timetable/calendar/{tid}/", headers=h)).status_code == 204
```

- [ ] **Step 2: Тест унахыг батлах**

Run: `cd backend && uv run pytest tests/test_timetable_classes.py -q --tb=line`
Expected: FAIL — 404.

- [ ] **Step 3: Router-т нэмэх**

Импортод `CalendarEvent, ClassGroup, CurriculumEntry` (models) ба `CalendarIn, CalendarOut, CalendarPatch, ClassIn, ClassOut, ClassPatch, CurriculumIn, CurriculumOut, CurriculumPatch` (schemas), `from typing import Annotated`, `from fastapi import APIRouter, Query` нэмнэ. Файлын төгсгөлд:

```python
# ---- анги ----
def class_out(c: ClassGroup) -> ClassOut:
    return ClassOut(id=c.id, year_id=c.year_id, grade=c.grade, letter=c.letter, name=c.name,
                    period_set_id=c.period_set_id, homeroom_teacher_id=c.homeroom_teacher_id)


async def _check_class_refs(db, year_id: int, period_set_id: int, homeroom_teacher_id: int | None) -> None:
    ps = await db.get(PeriodSet, period_set_id)
    if ps is None:
        raise FieldError("period_set_id", "Цагийн хүснэгт олдсонгүй.")
    if ps.year_id != year_id:
        raise FieldError("period_set_id", "Цагийн хүснэгт энэ жилийнх биш.")
    if homeroom_teacher_id is not None and await db.get(Teacher, homeroom_teacher_id) is None:
        raise FieldError("homeroom_teacher_id", "Багш олдсонгүй.")


@router.get("/classes/", response_model=list[ClassOut])
async def classes_list(db: DB, year: int | None = None):
    y = await resolve_year(db, year)
    if y is None:
        return []
    q = select(ClassGroup).where(ClassGroup.year_id == y.id).order_by(ClassGroup.grade, ClassGroup.letter)
    return [class_out(c) for c in (await db.execute(q)).scalars().all()]


@router.post("/classes/", response_model=ClassOut, status_code=201)
async def class_create(body: ClassIn, db: DB, _: Manager):
    if await db.get(AcademicYear, body.year_id) is None:
        raise FieldError("year_id", "Хичээлийн жил олдсонгүй.")
    await _check_class_refs(db, body.year_id, body.period_set_id, body.homeroom_teacher_id)
    c = ClassGroup(**{**body.model_dump(), "letter": body.letter.strip()})
    db.add(c)
    await commit_or_400(db, "letter", "Энэ жилд ийм анги байна.")
    return class_out(c)


@router.patch("/classes/{id}/", response_model=ClassOut)
async def class_patch(id: int, body: ClassPatch, db: DB, _: Manager):
    c = await get_or_404(db, ClassGroup, id)
    data = body.model_dump(exclude_unset=True)
    if "letter" in data and data["letter"] is not None:
        data["letter"] = data["letter"].strip()
    for k, v in data.items():
        if v is not None or k == "homeroom_teacher_id":
            setattr(c, k, v)
    await _check_class_refs(db, c.year_id, c.period_set_id, c.homeroom_teacher_id)
    await commit_or_400(db, "letter", "Энэ жилд ийм анги байна.")
    await db.refresh(c)
    return class_out(c)


@router.delete("/classes/{id}/", status_code=204)
async def class_delete(id: int, db: DB, _: Manager):
    c = await get_or_404(db, ClassGroup, id)
    await db.delete(c)  # cascade: хуваарь, хөтөлбөр
    await db.commit()


# ---- хөтөлбөр ----
@router.get("/curriculum/", response_model=list[CurriculumOut])
async def curriculum_list(db: DB, class_: Annotated[int | None, Query(alias="class")] = None):
    if class_ is None:
        raise FieldError("class", "Ангийг заана уу (?class=).")
    q = (select(CurriculumEntry).join(CurriculumEntry.subject).where(CurriculumEntry.class_group_id == class_)
         .order_by(Subject.name))
    return (await db.execute(q)).scalars().all()


@router.post("/curriculum/", response_model=CurriculumOut, status_code=201)
async def curriculum_create(body: CurriculumIn, db: DB, _: Manager):
    if await db.get(ClassGroup, body.class_group_id) is None:
        raise FieldError("class_group_id", "Анги олдсонгүй.")
    if await db.get(Subject, body.subject_id) is None:
        raise FieldError("subject_id", "Хичээл олдсонгүй.")
    e = CurriculumEntry(**body.model_dump())
    db.add(e)
    await commit_or_400(db, "subject_id", "Энэ ангид энэ хичээл аль хэдийн байна.")
    await db.refresh(e)
    return e


@router.patch("/curriculum/{id}/", response_model=CurriculumOut)
async def curriculum_patch(id: int, body: CurriculumPatch, db: DB, _: Manager):
    e = await get_or_404(db, CurriculumEntry, id)
    e.hours_per_week = body.hours_per_week
    await db.commit()
    return e


@router.delete("/curriculum/{id}/", status_code=204)
async def curriculum_delete(id: int, db: DB, _: Manager):
    e = await get_or_404(db, CurriculumEntry, id)
    await db.delete(e)
    await db.commit()


# ---- календарь ----
def _check_event_dates(e: CalendarEvent) -> None:
    if e.end_date < e.start_date:
        raise FieldError("end_date", "Дуусах огноо эхлэх огнооноос өмнө байж болохгүй.")


@router.get("/calendar/", response_model=list[CalendarOut])
async def calendar_list(db: DB, year: int | None = None):
    y = await resolve_year(db, year)
    if y is None:
        return []
    q = select(CalendarEvent).where(CalendarEvent.year_id == y.id).order_by(CalendarEvent.start_date, CalendarEvent.id)
    return (await db.execute(q)).scalars().all()


@router.post("/calendar/", response_model=CalendarOut, status_code=201)
async def calendar_create(body: CalendarIn, db: DB, _: Manager):
    if await db.get(AcademicYear, body.year_id) is None:
        raise FieldError("year_id", "Хичээлийн жил олдсонгүй.")
    e = CalendarEvent(**body.model_dump())
    _check_event_dates(e)
    db.add(e)
    await db.commit()
    return e


@router.patch("/calendar/{id}/", response_model=CalendarOut)
async def calendar_patch(id: int, body: CalendarPatch, db: DB, _: Manager):
    e = await get_or_404(db, CalendarEvent, id)
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(e, k, v)
    _check_event_dates(e)
    await db.commit()
    return e


@router.delete("/calendar/{id}/", status_code=204)
async def calendar_delete(id: int, db: DB, _: Manager):
    e = await get_or_404(db, CalendarEvent, id)
    await db.delete(e)
    await db.commit()
```

Docstring-ийн "(Task 4)" тэмдэглэгээг устгана.

- [ ] **Step 4: Тест ажиллуулах**

Run: `cd backend && uv run pytest tests/test_timetable_classes.py -v --tb=short`
Expected: 4 PASSED.

- [ ] **Step 5: Бүх тест**

Run: `cd backend && uv run pytest --tb=short -q`
Expected: 86 passed.

---
### Task 5: Давхардал, grid хадгалалт, хуваарийн харагдац, хөтөлбөрийн шалгалт, stats

**Files:**
- Create: `backend/app/timetable/conflicts.py`, `backend/app/timetable/grid.py`, `backend/app/timetable/router_lessons.py`
- Modify: `backend/app/common/errors.py`, `backend/app/main.py`
- Test: `backend/tests/test_timetable_grid.py`

**Interfaces:**
- Consumes: `schemas.GridCell, LessonOut, PeriodRef, TeacherRef, RoomRef, ClassRef, SubjectOut, CurriculumCheckOut, StatsOut`, `common.*`.
- Produces: `errors.ConflictError(conflicts: list[dict])` → 400 `{"conflicts": [...]}`; `conflicts.Slot`, `conflicts.find_conflicts(candidates, existing) -> list[dict]`; `grid.load_slots(db, year_id, exclude_class_id)`, `grid.validate_cells(db, cg, cells) -> list[Lesson]`, `grid.save_grid(db, cg, cells) -> list[Lesson]` (flush хүртэл, commit хийхгүй); `router_lessons.router`, `router_lessons.lessons_for(db, year_id, class_id=None, teacher_id=None, room_id=None) -> list[LessonOut]`, `router_lessons.curriculum_check_for(db, class_id) -> list[CurriculumCheckOut]`.
- Endpoint: `GET lessons/?year=&class=|&teacher=|&room=`, `PUT classes/{id}/grid/`, `GET classes/{id}/curriculum-check/`, `GET stats/?year=`.

- [ ] **Step 1: ConflictError**

`backend/app/common/errors.py` — `FieldError`-ийн дараа:

```python
class ConflictError(Exception):
    """Хуваарийн давхардал: 400 {"conflicts": [{weekday, period_id, period_order, kind, with_class, who}]}"""

    def __init__(self, conflicts: list[dict]):
        self.conflicts = conflicts
```

`register()` дотор `_field` handler-ийн дараа:

```python
    @app.exception_handler(ConflictError)
    async def _conflict(request: Request, exc: ConflictError):
        return JSONResponse({"conflicts": exc.conflicts}, status_code=400)
```

- [ ] **Step 2: Давхардлын цэвэр логик + unit тест**

`backend/app/timetable/conflicts.py`:

```python
"""
Багш, өрөөний давхардал. Period-ийн дугаараар биш ЦАГААР шалгана: нэг weekday дотор хоёр хичээлийн
[start, end) зай огтлолцож байвал (a) ижил багш → "teacher", (b) ижил өрөө → "room".
Цагийн хүснэгтүүд өөр минуттай (бага анги 35, ахлах 40) тул дугаар таарахгүй ч цаг давхцаж болно.
"""

from dataclasses import dataclass
from datetime import time


@dataclass(frozen=True)
class Slot:
    class_group_id: int
    class_name: str
    weekday: int
    period_id: int
    period_order: int
    start: time
    end: time
    teacher_id: int
    teacher_name: str
    room_id: int | None
    room_name: str


def overlaps(a: Slot, b: Slot) -> bool:
    return a.weekday == b.weekday and a.start < b.end and b.start < a.end


def find_conflicts(candidates: list[Slot], existing: list[Slot]) -> list[dict]:
    """
    candidates — хадгалах гэж буй нүднүүд (нэг анги), existing — тухайн жилийн бусад ангийн хичээлүүд.
    Candidate бүрийг existing + бусад candidate-тай харьцуулна. Нэг нүд, нэг төрөл, нэг эсрэг талд нэг л бичлэг.
    """
    out: list[dict] = []
    seen: set[tuple] = set()
    others = existing + candidates
    for c in candidates:
        for o in others:
            if o is c or not overlaps(c, o):
                continue
            if o.teacher_id == c.teacher_id:
                key = (c.weekday, c.period_id, "teacher", o.class_group_id, o.period_id)
                if key not in seen:
                    seen.add(key)
                    out.append({"weekday": c.weekday, "period_id": c.period_id, "period_order": c.period_order,
                                "kind": "teacher", "with_class": o.class_name, "who": o.teacher_name})
            if c.room_id is not None and o.room_id == c.room_id:
                key = (c.weekday, c.period_id, "room", o.class_group_id, o.period_id)
                if key not in seen:
                    seen.add(key)
                    out.append({"weekday": c.weekday, "period_id": c.period_id, "period_order": c.period_order,
                                "kind": "room", "with_class": o.class_name, "who": o.room_name})
    return out
```

`backend/tests/test_timetable_grid.py` (эхний хэсэг — цэвэр unit тест):

```python
from datetime import time

from app.timetable.conflicts import Slot, find_conflicts
from tests.helpers import staff_headers, timetable_setup


def slot(cls, weekday, period_id, start, end, teacher, room=None, order=1):
    return Slot(class_group_id=hash(cls) % 1000, class_name=cls, weekday=weekday, period_id=period_id,
                period_order=order, start=time(*start), end=time(*end), teacher_id=hash(teacher) % 1000,
                teacher_name=teacher, room_id=(hash(room) % 1000) if room else None, room_name=room or "")


def test_find_conflicts_by_time_not_by_period_number():
    existing = [slot("9а", 1, 11, (8, 50), (9, 30), "Б.Мухулай", "204", order=2)]
    cand = [slot("1а", 1, 21, (8, 50), (9, 25), "Б.Мухулай", "204", order=3)]  # өөр period, цаг давхцана
    out = find_conflicts(cand, existing)
    assert [(c["kind"], c["with_class"], c["who"], c["period_order"]) for c in out] == [
        ("teacher", "9а", "Б.Мухулай", 3), ("room", "9а", "204", 3)]


def test_find_conflicts_ignores_other_day_and_adjacent_times():
    existing = [slot("9а", 1, 11, (8, 0), (8, 40), "Б.Мухулай", "204")]
    assert find_conflicts([slot("1а", 2, 21, (8, 0), (8, 35), "Б.Мухулай", "204")], existing) == []  # өөр өдөр
    assert find_conflicts([slot("1а", 1, 21, (8, 40), (9, 15), "Б.Мухулай", "204")], existing) == []  # зэргэлдээ
    assert find_conflicts([slot("1а", 1, 21, (8, 0), (8, 35), "Д.Сараа", "101")], existing) == []  # өөр багш, өрөө
    assert find_conflicts([slot("1а", 1, 21, (8, 0), (8, 35), "Д.Сараа", None)], existing) == []  # өрөөгүй


def test_find_conflicts_between_candidates():
    a = slot("9а", 1, 11, (8, 0), (8, 40), "Б.Мухулай", None, order=1)
    b = slot("9а", 1, 12, (8, 30), (9, 10), "Б.Мухулай", None, order=2)
    out = find_conflicts([a, b], [])
    assert [(c["period_order"], c["kind"]) for c in out] == [(1, "teacher"), (2, "teacher")]
```

Run: `cd backend && uv run pytest tests/test_timetable_grid.py -q --tb=short` → Expected: 3 PASSED.

- [ ] **Step 3: API тестүүдийг нэмэх**

`backend/tests/test_timetable_grid.py`-ийн төгсгөлд:

```python
def cell(tt, weekday, period, subject, teacher, room=None):
    return {"weekday": weekday, "period_id": tt.p[period].id, "subject_id": tt.subjects[subject].id,
            "teacher_id": tt.teachers[teacher].id, "room_id": tt.rooms[room].id if room else None}


async def test_grid_save_and_views(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    c9 = tt.classes["9а"].id
    body = [cell(tt, 1, ("s", 1), "Математик", "Б.Мухулай", "204"),
            cell(tt, 1, ("s", 2), "Физик", "Ц.Болд", "205"),
            cell(tt, 2, ("s", 1), "Математик", "Б.Мухулай", "204")]
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=body)
    assert r.status_code == 200, r.text
    out = r.json()
    assert len(out) == 3
    assert out[0]["weekday"] == 1 and out[0]["period"]["order"] == 1 and out[0]["period"]["start_time"] == "08:00:00"
    assert out[0]["subject"]["short_name"] == "Мат" and out[0]["subject"]["color"] == "#1e3a8f"
    assert out[0]["teacher"]["short_name"] == "Б.Мухулай" and out[0]["room"]["name"] == "204"
    assert out[0]["class_group"]["name"] == "9а"

    assert len((await client.get(f"/api/timetable/lessons/?class={c9}")).json()) == 3
    assert len((await client.get(f"/api/timetable/lessons/?teacher={tt.teachers['Б.Мухулай'].id}")).json()) == 2
    by_room = (await client.get(f"/api/timetable/lessons/?room={tt.rooms['205'].id}")).json()
    assert len(by_room) == 1 and by_room[0]["subject"]["name"] == "Физик"
    assert len((await client.get(f"/api/timetable/lessons/?year={tt.year.id}")).json()) == 3
    assert (await client.get("/api/timetable/lessons/?year=999999")).status_code == 404

    # Бүхэлд нь солино: 1 нүд үлдэнэ
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=body[:1])
    assert len(r.json()) == 1
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[])
    assert r.json() == []


async def test_grid_conflicts_across_period_sets_are_atomic(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    c9, c1 = tt.classes["9а"].id, tt.classes["1а"].id
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h,
                         json=[cell(tt, 1, ("s", 2), "Математик", "Б.Мухулай", "204")])  # Даваа 08:50–09:30
    assert r.status_code == 200

    # 1а: Даваа p3 08:50–09:25 — өөр period set, цаг давхцана → багшийн давхардал; юу ч хадгалагдахгүй
    body = [cell(tt, 1, ("p", 1), "Монгол хэл", "Д.Сараа", "101"),
            cell(tt, 1, ("p", 3), "Математик", "Б.Мухулай")]
    r = await client.put(f"/api/timetable/classes/{c1}/grid/", headers=h, json=body)
    assert r.status_code == 400, r.text
    assert r.json() == {"conflicts": [{"weekday": 1, "period_id": tt.p[("p", 3)].id, "period_order": 3,
                                       "kind": "teacher", "with_class": "9а", "who": "Б.Мухулай"}]}
    assert (await client.get(f"/api/timetable/lessons/?class={c1}")).json() == []

    # Өөр багш, ижил өрөө → өрөөний давхардал
    body[1] = cell(tt, 1, ("p", 3), "Физик", "Ц.Болд", "204")
    r = await client.put(f"/api/timetable/classes/{c1}/grid/", headers=h, json=body)
    assert r.status_code == 400 and r.json()["conflicts"][0]["kind"] == "room" and r.json()["conflicts"][0]["who"] == "204"

    # Өөр өрөө → OK; Мягмар гарагт Б.Мухулай чөлөөтэй → OK
    body[1] = cell(tt, 1, ("p", 3), "Физик", "Ц.Болд", "205")
    body.append(cell(tt, 2, ("p", 3), "Математик", "Б.Мухулай", "204"))
    r = await client.put(f"/api/timetable/classes/{c1}/grid/", headers=h, json=body)
    assert r.status_code == 200, r.text
    assert len(r.json()) == 3

    # Өөрийн хуучин хуваарьтайгаа давхардахгүй (9а-г дахин хадгалахад 9а-ийн хуучин мөрүүд тооцогдохгүй);
    # 1а-ийн Даваа p3 нь одоо Ц.Болд/205, Б.Мухулай Мягмарт тул давхардалгүй
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h,
                         json=[cell(tt, 1, ("s", 2), "Математик", "Б.Мухулай", "204")])
    assert r.status_code == 200, r.text


async def test_grid_validation(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    c9 = tt.classes["9а"].id
    ok = cell(tt, 1, ("s", 1), "Математик", "Б.Мухулай")

    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[cell(tt, 1, ("p", 1), "Математик", "Б.Мухулай")])
    assert r.status_code == 400 and "period_id" in r.json()  # өөр цагийн хүснэгтийн цаг
    r = await client.put(f"/api/timetable/classes/{tt.classes['1а'].id}/grid/", headers=h, json=[cell(tt, 1, ("p", 2), "Математик", "Б.Мухулай")])
    assert r.status_code == 400 and "завсарлага" in r.json()["period_id"][0]
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[{**ok, "weekday": 6}])
    assert r.status_code == 400 and "weekday" in r.json()  # working_days=5
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[{**ok, "weekday": 7}])
    assert r.status_code == 400 and "weekday" in r.json()  # pydantic le=6
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[ok, {**ok, "subject_id": tt.subjects["Физик"].id}])
    assert r.status_code == 400 and "cells" in r.json()  # нэг нүдэнд хоёр
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[{**ok, "teacher_id": 999999}])
    assert r.status_code == 400 and "teacher_id" in r.json()
    r = await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h, json=[{**ok, "room_id": 999999}])
    assert r.status_code == 400 and "room_id" in r.json()
    assert (await client.put("/api/timetable/classes/999999/grid/", headers=h, json=[])).status_code == 404
    oh = await staff_headers(client, make_user, "olymp", roles=("olympiad",))
    assert (await client.put(f"/api/timetable/classes/{c9}/grid/", headers=oh, json=[])).status_code == 403


async def test_curriculum_check_and_stats(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    c9 = tt.classes["9а"].id
    for subj, hours in (("Математик", 2), ("Монгол хэл", 1)):
        await client.post("/api/timetable/curriculum/", headers=h,
                          json={"class_group_id": c9, "subject_id": tt.subjects[subj].id, "hours_per_week": hours})
    await client.put(f"/api/timetable/classes/{c9}/grid/", headers=h,
                     json=[cell(tt, 1, ("s", 1), "Математик", "Б.Мухулай"), cell(tt, 1, ("s", 2), "Физик", "Ц.Болд")])

    chk = (await client.get(f"/api/timetable/classes/{c9}/curriculum-check/")).json()
    assert [(c["subject"]["name"], c["planned"], c["scheduled"]) for c in chk] == [
        ("Математик", 2, 1), ("Монгол хэл", 1, 0), ("Физик", 0, 1)]

    st = (await client.get("/api/timetable/stats/")).json()
    assert st == {"classes": 3, "teachers": 3, "rooms": 3, "lessons": 2, "mismatched_classes": 1}
    assert (await client.get("/api/timetable/stats/?year=999999")).status_code == 404
```

- [ ] **Step 4: Тест унахыг батлах**

Run: `cd backend && uv run pytest tests/test_timetable_grid.py -q --tb=line`
Expected: 3 passed (unit), 4 failed (404).

- [ ] **Step 5: grid.py**

`backend/app/timetable/grid.py`:

```python
"""
Ангийн хуваарийг бүхэлд нь шалгаж хадгална. Grid PUT ба Excel импорт хоёулаа үүнийг дуудна.
Шалгалт: давхар нүд, weekday ≤ working_days, цаг ангийн хүснэгтэд байх ба завсарлага биш,
хичээл/багш/өрөө байх, дараа нь давхардал (conflicts.py). Алдаа гарвал юу ч өөрчлөгдөхгүй.
"""

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..common.errors import ConflictError, FieldError
from .conflicts import Slot, find_conflicts
from .models import WEEKDAY_NAMES, ClassGroup, Lesson, Room, Subject, Teacher
from .schemas import GridCell


def slot_of_lesson(lesson: Lesson) -> Slot:
    return Slot(class_group_id=lesson.class_group_id, class_name=lesson.class_group.name, weekday=lesson.weekday,
                period_id=lesson.period_id, period_order=lesson.period.order,
                start=lesson.period.start_time, end=lesson.period.end_time,
                teacher_id=lesson.teacher_id, teacher_name=lesson.teacher.short_name,
                room_id=lesson.room_id, room_name=lesson.room.name if lesson.room else "")


async def load_slots(db: AsyncSession, year_id: int, exclude_class_id: int | None = None) -> list[Slot]:
    """Тухайн жилийн бүх хичээл (exclude_class_id-г хасаад) — давхардал шалгах суурь."""
    q = select(Lesson).join(Lesson.class_group).where(ClassGroup.year_id == year_id)
    if exclude_class_id is not None:
        q = q.where(Lesson.class_group_id != exclude_class_id)
    return [slot_of_lesson(l) for l in (await db.execute(q)).scalars().all()]


async def _by_ids(db: AsyncSession, model, ids: set[int], field: str, msg: str) -> dict[int, object]:
    if not ids:
        return {}
    rows = (await db.execute(select(model).where(model.id.in_(list(ids))))).scalars().all()
    found = {r.id: r for r in rows}
    missing = ids - found.keys()
    if missing:
        raise FieldError(field, f"{msg} (id {min(missing)}).")
    return found


async def validate_cells(db: AsyncSession, cg: ClassGroup, cells: list[GridCell]) -> list[Lesson]:
    """Нүднүүдийг шалгаад хадгалаагүй Lesson объектууд буцаана. Алдаа → FieldError / ConflictError."""
    seen: set[tuple[int, int]] = set()
    for c in cells:
        if (c.weekday, c.period_id) in seen:
            raise FieldError("cells", f"Нэг нүдэнд хоёр хичээл байна ({WEEKDAY_NAMES.get(c.weekday, c.weekday)}, цаг id {c.period_id}).")
        seen.add((c.weekday, c.period_id))
        if not 1 <= c.weekday <= cg.year.working_days:
            raise FieldError("weekday", f"Өдөр 1–{cg.year.working_days} хооронд байх ёстой.")

    periods = {p.id: p for p in cg.period_set.periods}
    for c in cells:
        p = periods.get(c.period_id)
        if p is None:
            raise FieldError("period_id", f"Цаг (id {c.period_id}) энэ ангийн цагийн хүснэгтэд байхгүй.")
        if p.is_break:
            raise FieldError("period_id", f"{p.order}-р цаг завсарлага тул хичээл оруулж болохгүй.")

    await _by_ids(db, Subject, {c.subject_id for c in cells}, "subject_id", "Хичээл олдсонгүй")
    teachers = await _by_ids(db, Teacher, {c.teacher_id for c in cells}, "teacher_id", "Багш олдсонгүй")
    rooms = await _by_ids(db, Room, {c.room_id for c in cells if c.room_id is not None}, "room_id", "Өрөө олдсонгүй")

    candidates = [
        Slot(class_group_id=cg.id, class_name=cg.name, weekday=c.weekday, period_id=c.period_id,
             period_order=periods[c.period_id].order, start=periods[c.period_id].start_time,
             end=periods[c.period_id].end_time, teacher_id=c.teacher_id, teacher_name=teachers[c.teacher_id].short_name,
             room_id=c.room_id, room_name=rooms[c.room_id].name if c.room_id is not None else "")
        for c in cells
    ]
    conflicts = find_conflicts(candidates, await load_slots(db, cg.year_id, exclude_class_id=cg.id))
    if conflicts:
        raise ConflictError(conflicts)
    return [Lesson(class_group_id=cg.id, weekday=c.weekday, period_id=c.period_id, subject_id=c.subject_id,
                   teacher_id=c.teacher_id, room_id=c.room_id) for c in cells]


async def save_grid(db: AsyncSession, cg: ClassGroup, cells: list[GridCell]) -> list[Lesson]:
    """Шалгаад ангийн хуучин хуваарийг устгаж шинээр бичнэ (flush хүртэл; commit-ийг дуудагч хийнэ)."""
    lessons = await validate_cells(db, cg, cells)
    await db.execute(delete(Lesson).where(Lesson.class_group_id == cg.id))
    db.add_all(lessons)
    await db.flush()
    return lessons
```

- [ ] **Step 6: router_lessons.py**

`backend/app/timetable/router_lessons.py`:

```python
"""
Хуваарийн API (/api/timetable/). Унших нээлттэй, бичих manager.
  GET lessons/?year=&class=|&teacher=|&room=   нэг endpoint, гурван харагдац
  PUT classes/{id}/grid/                       body [{weekday, period_id, subject_id, teacher_id, room_id}]
  GET classes/{id}/curriculum-check/           [{subject, planned, scheduled}]
  GET stats/?year=
  POST lessons/import/                         (Task 6)
  GET classes/{id}/timetable.pdf               (Task 7)
"""

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .common import DB, Manager, get_or_404, resolve_year
from .grid import save_grid
from .models import ClassGroup, CurriculumEntry, Lesson, Period, Room, Subject, Teacher
from .schemas import (
    ClassRef, CurriculumCheckOut, GridCell, LessonOut, PeriodRef, RoomRef, StatsOut, SubjectOut, TeacherRef,
)

router = APIRouter(prefix="/api/timetable", tags=["timetable"])


def subject_out(s: Subject) -> SubjectOut:
    return SubjectOut(id=s.id, name=s.name, short_name=s.short_name, color=s.color)


def lesson_out(l: Lesson) -> LessonOut:
    return LessonOut(
        id=l.id, weekday=l.weekday,
        period=PeriodRef(id=l.period.id, order=l.period.order, start_time=l.period.start_time,
                         end_time=l.period.end_time, is_break=l.period.is_break),
        subject=subject_out(l.subject),
        teacher=TeacherRef(id=l.teacher.id, short_name=l.teacher.short_name),
        room=RoomRef(id=l.room.id, name=l.room.name) if l.room else None,
        class_group=ClassRef(id=l.class_group.id, name=l.class_group.name),
    )


async def lessons_for(db: AsyncSession, year_id: int, class_id: int | None = None,
                      teacher_id: int | None = None, room_id: int | None = None) -> list[LessonOut]:
    q = select(Lesson).join(Lesson.class_group).join(Lesson.period).where(ClassGroup.year_id == year_id)
    if class_id is not None:
        q = q.where(Lesson.class_group_id == class_id)
    if teacher_id is not None:
        q = q.where(Lesson.teacher_id == teacher_id)
    if room_id is not None:
        q = q.where(Lesson.room_id == room_id)
    q = q.order_by(Lesson.weekday, Period.start_time, ClassGroup.grade, ClassGroup.letter)
    return [lesson_out(l) for l in (await db.execute(q)).scalars().all()]


@router.get("/lessons/", response_model=list[LessonOut])
async def lessons_list(db: DB, year: int | None = None,
                       class_: Annotated[int | None, Query(alias="class")] = None,
                       teacher: int | None = None, room: int | None = None):
    y = await resolve_year(db, year)
    if y is None:
        return []
    return await lessons_for(db, y.id, class_, teacher, room)


@router.put("/classes/{id}/grid/", response_model=list[LessonOut])
async def grid_put(id: int, body: list[GridCell], db: DB, _: Manager):
    cg = await get_or_404(db, ClassGroup, id)
    await save_grid(db, cg, body)
    await db.commit()
    return await lessons_for(db, cg.year_id, class_id=cg.id)


async def curriculum_check_for(db: AsyncSession, class_id: int) -> list[CurriculumCheckOut]:
    planned = {e.subject_id: e.hours_per_week for e in
               (await db.execute(select(CurriculumEntry).where(CurriculumEntry.class_group_id == class_id))).scalars().all()}
    counts = dict((await db.execute(
        select(Lesson.subject_id, func.count(Lesson.id)).where(Lesson.class_group_id == class_id).group_by(Lesson.subject_id)
    )).all())
    ids = set(planned) | set(counts)
    if not ids:
        return []
    subjects = (await db.execute(select(Subject).where(Subject.id.in_(list(ids))).order_by(Subject.name))).scalars().all()
    return [CurriculumCheckOut(subject=subject_out(s), planned=planned.get(s.id, 0), scheduled=counts.get(s.id, 0))
            for s in subjects]


@router.get("/classes/{id}/curriculum-check/", response_model=list[CurriculumCheckOut])
async def curriculum_check(id: int, db: DB):
    cg = await get_or_404(db, ClassGroup, id)
    return await curriculum_check_for(db, cg.id)


@router.get("/stats/", response_model=StatsOut)
async def stats(db: DB, year: int | None = None):
    y = await resolve_year(db, year)
    if y is None:
        return StatsOut(classes=0, teachers=0, rooms=0, lessons=0, mismatched_classes=0)
    class_ids = (await db.execute(select(ClassGroup.id).where(ClassGroup.year_id == y.id))).scalars().all()
    teachers = (await db.execute(select(func.count(Teacher.id)).where(Teacher.is_active.is_(True)))).scalar_one()
    rooms = (await db.execute(select(func.count(Room.id)))).scalar_one()
    lessons = (await db.execute(
        select(func.count(Lesson.id)).select_from(Lesson).join(Lesson.class_group).where(ClassGroup.year_id == y.id))).scalar_one()
    mismatched = 0
    for cid in class_ids:
        if any(c.planned != c.scheduled for c in await curriculum_check_for(db, cid)):
            mismatched += 1
    return StatsOut(classes=len(class_ids), teachers=teachers, rooms=rooms, lessons=lessons, mismatched_classes=mismatched)
```

`backend/app/main.py`: `from .timetable.router_lessons import router as timetable_lessons_router` ба `app.include_router(timetable_lessons_router)` нэмнэ (`timetable_setup_router`-ийн дараа).

- [ ] **Step 7: Тест ажиллуулах**

Run: `cd backend && uv run pytest tests/test_timetable_grid.py -v --tb=short`
Expected: 7 PASSED.

- [ ] **Step 8: Бүх тест**

Run: `cd backend && uv run pytest --tb=short -q`
Expected: 93 passed.

---

### Task 6: Excel импорт

**Files:**
- Create: `backend/app/timetable/importer.py`
- Modify: `backend/app/timetable/router_lessons.py`
- Test: `backend/tests/test_timetable_import.py`

**Interfaces:**
- Consumes: `grid.save_grid`, `errors.ConflictError/FieldError`, `common.resolve_year`.
- Produces: `importer.parse_workbook(data: bytes) -> list[RawSheet]`, `importer.import_workbook(db, sheets, year_id, *, dry_run, replace) -> dict`; `POST lessons/import/` multipart `file, year, dry_run, replace` → `{year, dry_run, imported, total, created, deleted, sheets: [{sheet, class_name, count, warnings, conflicts}]}`.

- [ ] **Step 1: Тест бичих**

`backend/tests/test_timetable_import.py`:

```python
import io

from openpyxl import Workbook

from tests.helpers import manager_headers, timetable_setup

HEADER = ["Цаг", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан"]
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def book(sheets: dict[str, list[list]]) -> bytes:
    wb = Workbook()
    wb.remove(wb.active)
    for name, rows in sheets.items():
        ws = wb.create_sheet(name)
        for r in rows:
            ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


GOOD = {
    "9а": [["9а ангийн хуваарь"], HEADER,
           [1, "Математик / Б.Мухулай / 204", "Мат / Б.Мухулай", None, None, None],
           [2, "Физик / Ц.Болд / 205", None, None, None, None]],
    "1а": [HEADER,
           [1, "Монгол хэл / Д.Сараа / 101", None, None, None, None],
           [2, None, None, None, None, None],
           [3, "Математик / Б.Мухулай", None, None, None, None]],
}


async def upload(client, h, data, **form):
    files = {"file": ("хуваарь.xlsx", data, XLSX)}
    return await client.post("/api/timetable/lessons/import/", headers=h, files=files, data=form)


async def test_dry_run_then_import(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    r = await upload(client, h, book(GOOD), dry_run="true")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["dry_run"] is True and body["imported"] is False and body["total"] == 5
    assert [(s["sheet"], s["class_name"], s["count"], s["warnings"], s["conflicts"]) for s in body["sheets"]] == [
        ("9а", "9а", 3, [], []), ("1а", "1а", 2, [], [])]
    assert (await client.get("/api/timetable/lessons/")).json() == []

    r = await upload(client, h, book(GOOD), dry_run="false", replace="true")
    body = r.json()
    assert body["imported"] is True and body["created"] == 5 and body["deleted"] == 0
    l9 = (await client.get(f"/api/timetable/lessons/?class={tt.classes['9а'].id}")).json()
    assert [(l["weekday"], l["period"]["order"], l["subject"]["short_name"], l["room"] and l["room"]["name"]) for l in l9] == [
        (1, 1, "Мат", "204"), (1, 2, "Физ", "205"), (2, 1, "Мат", None)]
    l1 = (await client.get(f"/api/timetable/lessons/?class={tt.classes['1а'].id}")).json()
    assert [(l["period"]["order"], l["teacher"]["short_name"]) for l in l1] == [(1, "Д.Сараа"), (3, "Б.Мухулай")]

    # Дахин импорт (replace): хуучин 5 устаж 5 шинээр
    r = await upload(client, h, book(GOOD), dry_run="false", replace="true")
    assert r.json()["created"] == 5 and r.json()["deleted"] == 5


async def test_errors_block_whole_import(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    assert (await upload(client, h, book(GOOD), dry_run="false")).json()["imported"] is True

    bad = {
        "9а": [HEADER, [1, "Хими / Б.Мухулай", None, None, None, None]],
        "7в": [HEADER, [1, "Математик / Б.Мухулай", None, None, None, None]],
        "1а": [HEADER, [3, "Физик / Ц.Болд / 205", None, None, None, None]],  # 9а-ийн Даваа 2-р цаг (08:50–09:30)-тай давхцана
        "9б": [HEADER, [1, "Математик / Б.Мухулай / 204 / нэмэлт", "x", None, None, None], [9, "Мат / Б.Мухулай", None, None, None, None]],
    }
    r = await upload(client, h, book(bad), dry_run="false", replace="true")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["imported"] is False and body["created"] == 0
    s = {x["sheet"]: x for x in body["sheets"]}
    assert s["9а"]["warnings"] == ["Даваа, 1-р цаг: 'Хими' хичээл олдсонгүй."]
    assert s["7в"]["class_name"] is None and s["7в"]["warnings"] == ["'7в' нэртэй анги энэ жилд байхгүй."]
    assert s["1а"]["warnings"] == [] and {c["kind"] for c in s["1а"]["conflicts"]} == {"teacher", "room"}
    assert s["1а"]["conflicts"][0]["with_class"] == "9а" and s["1а"]["conflicts"][0]["period_order"] == 3
    assert s["9б"]["count"] == 1  # 4 хэсэгтэй нүд зөвшөөрөгдөнө (илүү хэсгийг хаяна), "x" ба 9-р цаг анхааруулга
    assert any("'x'" in w for w in s["9б"]["warnings"]) and any("9-р цаг" in w for w in s["9б"]["warnings"])
    # Юу ч өөрчлөгдөөгүй
    assert len((await client.get(f"/api/timetable/lessons/?class={tt.classes['9а'].id}")).json()) == 3
    assert len((await client.get(f"/api/timetable/lessons/?class={tt.classes['1а'].id}")).json()) == 2


async def test_merge_without_replace(client, make_user, db):
    tt, h = await timetable_setup(client, make_user, db)
    await upload(client, h, book(GOOD), dry_run="false")
    extra = {"9а": [HEADER, [1, "Физик / Ц.Болд / 205", None, "Мат / Б.Мухулай", None, None]]}  # Даваа 1 солигдоно, Лхагва 1 нэмэгдэнэ
    r = await upload(client, h, book(extra), dry_run="false", replace="false")
    body = r.json()
    assert body["imported"] is True and body["deleted"] == 1
    l9 = (await client.get(f"/api/timetable/lessons/?class={tt.classes['9а'].id}")).json()
    assert [(l["weekday"], l["period"]["order"], l["subject"]["short_name"]) for l in l9] == [
        (1, 1, "Физ"), (1, 2, "Физ"), (2, 1, "Мат"), (3, 1, "Мат")]


async def test_import_needs_current_year(client, make_user):
    h = await manager_headers(client, make_user)
    r = await upload(client, h, book(GOOD))  # одоогийн жил байхгүй
    assert r.json() == {"year": ["Хичээлийн жил олдсонгүй."]}


async def test_import_rejects_bad_files(client, make_user, db):
    _, h = await timetable_setup(client, make_user, db)
    r = await client.post("/api/timetable/lessons/import/", headers=h, files={"file": ("a.csv", b"x", "text/csv")})
    assert r.json() == {"file": ["Зөвхөн Excel (.xlsx) файл хүлээн авна."]}
    r = await upload(client, h, b"not an excel file")
    assert r.status_code == 400 and "file" in r.json()
    no_header = {"9а": [["зүгээр текст"], [1, "Мат / Б.Мухулай"]]}
    r = await upload(client, h, book(no_header), dry_run="true")
    assert r.json()["sheets"][0]["warnings"] == ["Толгой мөр (Цаг | Даваа | Мягмар ...) олдсонгүй."]
```

- [ ] **Step 2: Тест унахыг батлах**

Run: `cd backend && uv run pytest tests/test_timetable_import.py -q --tb=line`
Expected: FAIL — 404/405.

- [ ] **Step 3: importer.py**

`backend/app/timetable/importer.py`:

```python
"""
Хуваарийн Excel импорт. Sheet бүр нэг бүлэг анги (sheet-ийн нэр "9а").
    Толгой мөр: Цаг | Даваа | Мягмар | Лхагва | Пүрэв | Баасан | [Бямба]   (эхний 10 мөрөөс хайна)
    Эхний багана: цагийн дугаар (1, 2, ...). Нүд: "Математик / Б.Мухулай / 204" (өрөө сонголттой).
Хичээлийг name эсвэл short_name-аар, багшийг short_name-аар, өрөөг name-аар (том/жижиг үсэг ялгахгүй) хайна.
Аль нэг sheet-д алдаа (олдохгүй нэр, давхардал) байвал бүхэлд нь импортлохгүй.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from io import BytesIO

from python_calamine import CalamineWorkbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..common.errors import ConflictError, FieldError
from .grid import save_grid
from .models import WEEKDAY_NAMES, ClassGroup, Lesson, Room, Subject, Teacher
from .schemas import GridCell

WEEKDAY_BY_NAME = {v.casefold(): k for k, v in WEEKDAY_NAMES.items()}


@dataclass
class RawCell:
    weekday: int
    order: int
    subject: str
    teacher: str
    room: str


@dataclass
class RawSheet:
    name: str
    cells: list[RawCell] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class SheetReport:
    sheet: str
    class_name: str | None = None
    count: int = 0
    warnings: list[str] = field(default_factory=list)
    conflicts: list[dict] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.warnings and not self.conflicts

    def summary(self) -> dict:
        return {"sheet": self.sheet, "class_name": self.class_name, "count": self.count,
                "warnings": self.warnings[:30], "conflicts": self.conflicts[:30]}


def _text(v) -> str:
    return "" if v is None else str(v).strip()


def _order(v) -> int | None:
    if v is None or isinstance(v, bool) or v == "":
        return None
    if isinstance(v, (int, float)):
        return int(v) if float(v).is_integer() else None
    s = str(v).strip()
    return int(s) if s.isdigit() else None


def parse_sheet(name: str, rows: list[list]) -> RawSheet:
    sheet = RawSheet(name=name)
    hdr_i, cols = None, {}
    for i, r in enumerate(rows[:10]):
        found = {j: WEEKDAY_BY_NAME[_text(c).casefold()] for j, c in enumerate(r) if _text(c).casefold() in WEEKDAY_BY_NAME}
        if found:
            hdr_i, cols = i, found
            break
    if hdr_i is None:
        sheet.warnings.append("Толгой мөр (Цаг | Даваа | Мягмар ...) олдсонгүй.")
        return sheet
    for r in rows[hdr_i + 1:]:
        first = r[0] if r else None
        order = _order(first)
        if order is None:
            if _text(first):
                sheet.warnings.append(f"'{_text(first)}' — цагийн дугаар биш, мөрийг алгасав.")
            continue
        for j, weekday in cols.items():
            raw = _text(r[j]) if j < len(r) else ""
            if not raw:
                continue
            parts = [p.strip() for p in raw.split("/")]
            if len(parts) < 2 or not parts[0] or not parts[1]:
                sheet.warnings.append(f"{WEEKDAY_NAMES[weekday]}, {order}-р цаг: '{raw}' — 'Хичээл / Багш / Өрөө' хэлбэрээр бичнэ.")
                continue
            sheet.cells.append(RawCell(weekday, order, parts[0], parts[1], parts[2] if len(parts) > 2 else ""))
    return sheet


def parse_workbook(data: bytes) -> list[RawSheet]:
    wb = CalamineWorkbook.from_filelike(BytesIO(data))
    return [parse_sheet(name.strip(), wb.get_sheet_by_name(name).to_python(skip_empty_area=False))
            for name in wb.sheet_names]


async def import_workbook(db: AsyncSession, sheets: list[RawSheet], year_id: int, *, dry_run: bool, replace: bool) -> dict:
    classes = {c.name.casefold(): c for c in
               (await db.execute(select(ClassGroup).where(ClassGroup.year_id == year_id))).scalars().all()}
    subjects: dict[str, Subject] = {}
    for s in (await db.execute(select(Subject))).scalars().all():
        subjects[s.name.casefold()] = s
        subjects.setdefault(s.short_name.casefold(), s)
    teachers = {t.short_name.casefold(): t for t in (await db.execute(select(Teacher))).scalars().all()}
    rooms = {r.name.casefold(): r for r in (await db.execute(select(Room))).scalars().all()}

    reports: list[SheetReport] = []
    created = deleted = 0
    for raw in sheets:
        rep = SheetReport(sheet=raw.name, warnings=list(raw.warnings))
        reports.append(rep)
        cg = classes.get(raw.name.casefold())
        if cg is None:
            rep.warnings.append(f"'{raw.name}' нэртэй анги энэ жилд байхгүй.")
            continue
        rep.class_name = cg.name
        periods = {p.order: p for p in cg.period_set.periods}
        cells: dict[tuple[int, int], GridCell] = {}
        for c in raw.cells:
            where = f"{WEEKDAY_NAMES[c.weekday]}, {c.order}-р цаг"
            p, s, t = periods.get(c.order), subjects.get(c.subject.casefold()), teachers.get(c.teacher.casefold())
            r = rooms.get(c.room.casefold()) if c.room else None
            if p is None:
                rep.warnings.append(f"{where}: {c.order}-р цаг энэ ангийн цагийн хүснэгтэд байхгүй.")
                continue
            if s is None:
                rep.warnings.append(f"{where}: '{c.subject}' хичээл олдсонгүй.")
                continue
            if t is None:
                rep.warnings.append(f"{where}: '{c.teacher}' багш олдсонгүй.")
                continue
            if c.room and r is None:
                rep.warnings.append(f"{where}: '{c.room}' өрөө олдсонгүй.")
                continue
            cells[(c.weekday, p.id)] = GridCell(weekday=c.weekday, period_id=p.id, subject_id=s.id, teacher_id=t.id,
                                                room_id=r.id if r else None)
        existing = (await db.execute(select(Lesson).where(Lesson.class_group_id == cg.id))).scalars().all()
        overwritten = sum(1 for l in existing if (l.weekday, l.period_id) in cells)
        if not replace:
            for l in existing:
                cells.setdefault((l.weekday, l.period_id), GridCell(weekday=l.weekday, period_id=l.period_id,
                                                                    subject_id=l.subject_id, teacher_id=l.teacher_id,
                                                                    room_id=l.room_id))
        rep.count = len(cells)
        if rep.warnings:
            continue
        try:
            await save_grid(db, cg, list(cells.values()))
        except FieldError as e:
            rep.warnings.append(e.message)
        except ConflictError as e:
            rep.conflicts = e.conflicts
        else:
            created += len(cells)
            deleted += len(existing) if replace else overwritten

    ok = bool(reports) and all(r.ok for r in reports)
    imported = ok and not dry_run
    if imported:
        await db.commit()
    else:
        await db.rollback()
    return {"year": year_id, "dry_run": dry_run, "imported": imported,
            "total": sum(r.count for r in reports),
            "created": created if imported else 0, "deleted": deleted if imported else 0,
            "sheets": [r.summary() for r in reports]}
```

Тайлбар: `replace=false` үед sheet-ийн нүднүүд тухайн нүдийг сольж, бусад хуучин нүд хэвээр үлдэнэ (`setdefault`); `deleted` нь солигдсон нүдний тоо. Тестийн `test_merge_without_replace`: 9а-ийн Даваа 1 (Мат) → Физ болж (`deleted == 1`), Лхагва 1 нэмэгдэнэ.

- [ ] **Step 4: Endpoint**

`backend/app/timetable/router_lessons.py`-д импорт: `from fastapi import APIRouter, File, Form, Query, UploadFile`, `from ..common.errors import FieldError`, `from .importer import import_workbook, parse_workbook`. `grid_put`-ийн дараа:

```python
def _to_bool(v: str | None, default: bool) -> bool:
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


@router.post("/lessons/import/")
async def lessons_import(db: DB, _: Manager, file: Annotated[UploadFile, File()],
                         year: Annotated[int | None, Form()] = None,
                         dry_run: Annotated[str | None, Form()] = None,
                         replace: Annotated[str | None, Form()] = None):
    """Excel-ээс хуваарь импортлох. dry_run=true бол зөвхөн шалгаад тайлан буцаана (юу ч бичихгүй)."""
    if not (file.filename or "").lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise FieldError("file", "Зөвхөн Excel (.xlsx) файл хүлээн авна.")
    y = await resolve_year(db, year)
    if y is None:
        raise FieldError("year", "Хичээлийн жил олдсонгүй.")
    try:
        sheets = parse_workbook(await file.read())
    except Exception as e:  # noqa: BLE001 — calamine олон төрлийн алдаа шиднэ
        raise FieldError("file", f"Файлыг уншиж чадсангүй: {e}") from None
    return await import_workbook(db, sheets, y.id, dry_run=_to_bool(dry_run, False), replace=_to_bool(replace, True))
```

Docstring-ийн "(Task 6)" тэмдэглэгээг устгана. `lessons/import/` замыг `lessons/`-оос доор бичсэн ч зөрчилдөхгүй (POST vs GET).

- [ ] **Step 5: Тест ажиллуулах**

Run: `cd backend && uv run pytest tests/test_timetable_import.py -v --tb=short`
Expected: 5 PASSED. `test_import_rejects_bad_files`-д `b"not an excel file"` calamine-д алдаа өгөх ёстой; хэрэв calamine хоосон workbook гэж уншвал `sheets == []` → `import_workbook` `ok=False` буцаана — тэр тохиолдолд тестийн `"file" in r.json()` унана; тэгвэл `parse_workbook`-д `if not wb.sheet_names: raise ValueError("Sheet олдсонгүй.")` нэмнэ.

- [ ] **Step 6: Бүх тест**

Run: `cd backend && uv run pytest --tb=short -q`
Expected: 98 passed.

---

### Task 7: PDF (ReportLab, DejaVu Sans)

**Files:**
- Create: `backend/app/timetable/pdf.py`, `backend/fonts/DejaVuSans.ttf`, `backend/fonts/DejaVuSans-Bold.ttf`, `backend/fonts/LICENSE`
- Modify: `backend/pyproject.toml`, `backend/app/timetable/router_lessons.py`
- Test: `backend/tests/test_timetable_pdf.py`

**Interfaces:**
- Produces: `pdf.build_class_pdf(cg: ClassGroup, periods: list[Period], lessons: list[Lesson]) -> bytes`; `GET classes/{id}/timetable.pdf` → `application/pdf`.

- [ ] **Step 1: Хамаарал ба фонт**

`backend/pyproject.toml`-ын `dependencies`-д `"reportlab>=4.2",` нэмээд `cd backend && uv sync` ажиллуулна (`uv.lock` шинэчлэгдэнэ).

Фонт татах (Git Bash, `backend/` дотор):

```bash
cd backend && uv run python - <<'PY'
import io, pathlib, urllib.request, zipfile
url = "https://github.com/dejavu-fonts/dejavu-fonts/releases/download/version_2_37/dejavu-fonts-ttf-2.37.zip"
z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(url).read()))
out = pathlib.Path("fonts"); out.mkdir(exist_ok=True)
for name in ("DejaVuSans.ttf", "DejaVuSans-Bold.ttf"):
    (out / name).write_bytes(z.read(f"dejavu-fonts-ttf-2.37/ttf/{name}"))
(out / "LICENSE").write_bytes(z.read("dejavu-fonts-ttf-2.37/LICENSE"))
print(sorted(p.name for p in out.iterdir()))
PY
```

Expected: `['DejaVuSans-Bold.ttf', 'DejaVuSans.ttf', 'LICENSE']`. Сүлжээгүй бол: зогсоод хэрэглэгчээс фонт файлыг гараар `backend/fonts/`-д тавихыг хүснэ (DejaVu Sans — Bitstream Vera лиценз, repo-д оруулахад асуудалгүй).

- [ ] **Step 2: Тест бичих**

`backend/tests/test_timetable_pdf.py`:

```python
from app.timetable.models import Lesson
from tests.helpers import seed_timetable


async def test_class_pdf(client, db):
    tt = await seed_timetable(db)
    db.add(Lesson(class_group_id=tt.classes["9а"].id, weekday=1, period_id=tt.p[("s", 1)].id,
                  subject_id=tt.subjects["Математик"].id, teacher_id=tt.teachers["Б.Мухулай"].id, room_id=tt.rooms["204"].id))
    await db.flush()
    r = await client.get(f"/api/timetable/classes/{tt.classes['9а'].id}/timetable.pdf")
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("application/pdf")
    assert r.content[:5] == b"%PDF-" and len(r.content) > 2000
    assert "filename" in r.headers["content-disposition"]
    assert (await client.get("/api/timetable/classes/999999/timetable.pdf")).status_code == 404


async def test_pdf_of_empty_class_and_breaks(client, db):
    tt = await seed_timetable(db)
    r = await client.get(f"/api/timetable/classes/{tt.classes['1а'].id}/timetable.pdf")  # завсарлагатай хүснэгт, хичээлгүй
    assert r.status_code == 200 and r.content[:5] == b"%PDF-"
```

Run: `cd backend && uv run pytest tests/test_timetable_pdf.py -q --tb=line` → Expected: FAIL (404).

- [ ] **Step 3: pdf.py**

`backend/app/timetable/pdf.py`:

```python
"""Ангийн хуваарийг PDF болгоно (ReportLab, А4 хэвтээ, DejaVu Sans — кирилл)."""

from datetime import date
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..config import BASE_DIR
from .models import WEEKDAY_NAMES, ClassGroup, Lesson, Period

FONTS_DIR = BASE_DIR / "fonts"
NAVY = colors.HexColor("#1e3a8f")
LINE = colors.HexColor("#c9d2ea")
BREAK_BG = colors.HexColor("#e6ebf6")
_fonts_ready = False


def _ensure_fonts() -> None:
    global _fonts_ready
    if _fonts_ready:
        return
    pdfmetrics.registerFont(TTFont("DejaVu", str(FONTS_DIR / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVu-Bold", str(FONTS_DIR / "DejaVuSans-Bold.ttf")))
    pdfmetrics.registerFontFamily("DejaVu", normal="DejaVu", bold="DejaVu-Bold", italic="DejaVu", boldItalic="DejaVu-Bold")
    _fonts_ready = True


def build_class_pdf(cg: ClassGroup, periods: list[Period], lessons: list[Lesson]) -> bytes:
    """Нэг анги нэг хуудас: мөр = цаг (цагийн зайтай), багана = өдөр, завсарлага саарал мөр."""
    _ensure_fonts()
    year = cg.year
    days = list(range(1, year.working_days + 1))
    by_slot = {(l.weekday, l.period_id): l for l in lessons}

    h1 = ParagraphStyle("h1", fontName="DejaVu-Bold", fontSize=15, leading=19, textColor=NAVY)
    h2 = ParagraphStyle("h2", fontName="DejaVu", fontSize=11, leading=14)
    small = ParagraphStyle("small", fontName="DejaVu", fontSize=8, leading=10, textColor=colors.grey)
    cell = ParagraphStyle("cell", fontName="DejaVu", fontSize=8.5, leading=10.5)
    head = ParagraphStyle("head", fontName="DejaVu-Bold", fontSize=9, leading=11, textColor=colors.white)

    data = [[Paragraph("Цаг", head)] + [Paragraph(WEEKDAY_NAMES[d], head) for d in days]]
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for i, p in enumerate(periods, start=1):
        span = f"{p.start_time:%H:%M}–{p.end_time:%H:%M}"
        if p.is_break:
            data.append([Paragraph(f"Завсарлага &nbsp; {span}", cell)] + [""] * len(days))
            style += [("SPAN", (0, i), (-1, i)), ("BACKGROUND", (0, i), (-1, i), BREAK_BG)]
            continue
        row = [Paragraph(f"<b>{p.order}</b><br/>{span}", cell)]
        for d in days:
            l = by_slot.get((d, p.id))
            if l is None:
                row.append("")
                continue
            text = f"<b>{escape(l.subject.name)}</b><br/>{escape(l.teacher.short_name)}"
            if l.room:
                text += f"<br/>{escape(l.room.name)}"
            row.append(Paragraph(text, cell))
        data.append(row)

    width = landscape(A4)[0] - 24 * mm
    table = Table(data, colWidths=[30 * mm] + [(width - 30 * mm) / len(days)] * len(days), repeatRows=1)
    table.setStyle(TableStyle(style))

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=12 * mm, rightMargin=12 * mm,
                            topMargin=12 * mm, bottomMargin=12 * mm, title=f"{cg.name} — хичээлийн хуваарь")
    doc.build([
        Paragraph("Шинэ Үе сургууль", h1),
        Paragraph(f"{escape(cg.name)} ангийн хичээлийн хуваарь — {escape(year.name)} хичээлийн жил", h2),
        Paragraph(f"Хэвлэсэн: {date.today():%Y-%m-%d}", small),
        Spacer(1, 6 * mm),
        table,
    ])
    return buf.getvalue()
```

- [ ] **Step 4: Endpoint**

`backend/app/timetable/router_lessons.py`-д импорт: `import asyncio`, `from urllib.parse import quote`, `from fastapi import Response`, `from .pdf import build_class_pdf`. Файлын төгсгөлд:

```python
@router.get("/classes/{id}/timetable.pdf")
async def class_pdf(id: int, db: DB):
    cg = await get_or_404(db, ClassGroup, id)
    lessons = (await db.execute(select(Lesson).where(Lesson.class_group_id == cg.id))).scalars().all()
    pdf = await asyncio.to_thread(build_class_pdf, cg, list(cg.period_set.periods), list(lessons))
    filename = quote(f"{cg.name}-хуваарь.pdf")
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f"inline; filename*=UTF-8''{filename}"})
```

Docstring-ийн "(Task 7)" тэмдэглэгээг устгана.

- [ ] **Step 5: Тест ажиллуулах**

Run: `cd backend && uv run pytest tests/test_timetable_pdf.py -v --tb=short`
Expected: 2 PASSED. Хэрэв `KeyError`/`TTFError` гарвал фонт файл `backend/fonts/`-д байгаа эсэхийг шалгана.

- [ ] **Step 6: Гараар нэг PDF үүсгэж харах**

Run (backend dev server асаалттай, seed-тэй бол): `curl -s -o "$TMP/9a.pdf" -w "%{http_code} %{content_type}\n" http://127.0.0.1:8000/api/timetable/classes/1/timetable.pdf` — 200 ба `application/pdf`. Task 8-ийн seed-ийн дараа browser-оор нээж кирилл үсэг зөв харагдахыг батална (энэ task-д класс байхгүй бол алгасаж Task 8-д шалгана).

- [ ] **Step 7: Бүх тест**

Run: `cd backend && uv run pytest --tb=short -q`
Expected: 100 passed.

---

### Task 8: Жишээ өгөгдлийн скрипт

**Files:**
- Create: `backend/scripts/seed_timetable.py`

**Interfaces:**
- Produces: `uv run python scripts/seed_timetable.py [--reset]` — 2026–2027 жил (одоогийн байхгүй бол одоогийн), 2 цагийн хүснэгт, 6 анги, 8 хичээл, 9 багш, 6 өрөө, 9а/1а-ийн хуваарь, 9а-ийн хөтөлбөр, календарийн 8 үйл явдал.

- [ ] **Step 1: Скрипт бичих**

`backend/scripts/seed_timetable.py`:

```python
"""
Хуваарийн жишээ өгөгдөл (local тест, UI үзэхэд зориулав).

    uv run python scripts/seed_timetable.py           # 2026–2027 жил байхгүй бол л оруулна
    uv run python scripts/seed_timetable.py --reset   # тухайн жилийг (бүх хуваарьтай нь) устгаад дахин оруулна

⚠ Жишээ мэдээлэл: багш, ангийн нэрс зохиомол.
"""

import asyncio
import sys
from datetime import date, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.timetable.models import (  # noqa: E402
    AcademicYear, CalendarEvent, ClassGroup, CurriculumEntry, Lesson, Period, PeriodSet, Room, Subject, Teacher,
)

YEAR_NAME = "2026–2027"

SUBJECTS = [("Математик", "Мат", "#1e3a8f"), ("Монгол хэл", "Мон", "#b91c1c"), ("Англи хэл", "Анг", "#7c3aed"),
            ("Физик", "Физ", "#047857"), ("Хими", "Хим", "#d97706"), ("Биологи", "Био", "#65a30d"),
            ("Түүх", "Түү", "#9f1239"), ("Биеийн тамир", "БТ", "#0e7490")]
TEACHERS = [("Батаа", "Мухулай", "Б.Мухулай", ["Математик"]), ("Дорж", "Сараа", "Д.Сараа", ["Монгол хэл"]),
            ("Цэнд", "Болд", "Ц.Болд", ["Физик", "Математик"]), ("Ганбат", "Оюун", "Г.Оюун", ["Англи хэл"]),
            ("Насан", "Түвшин", "Н.Түвшин", ["Хими", "Биологи"]), ("Эрдэнэ", "Ариунаа", "Э.Ариунаа", ["Түүх"]),
            ("Лхагва", "Баяр", "Л.Баяр", ["Биеийн тамир"]), ("Сүх", "Наран", "С.Наран", ["Математик", "Монгол хэл"]),
            ("Бат", "Энхжин", "Б.Энхжин", ["Англи хэл"])]  # 1а-ийн багш нар 9а-тай давхцахгүй байхаар
ROOMS = [("101", 30, "classroom"), ("102", 30, "classroom"), ("204", 32, "classroom"), ("205", 32, "classroom"),
         ("Физикийн лаб", 24, "lab"), ("Спорт заал", 60, "gym")]
CLASSES = [(1, "а", "p", "Д.Сараа"), (1, "б", "p", "С.Наран"), (5, "а", "p", None),
           (9, "а", "s", "Б.Мухулай"), (9, "б", "s", "Ц.Болд"), (12, "а", "s", "Г.Оюун")]
# (хичээл, багш, өрөө) — 9а: 5 өдөр × 4 цаг; 1а: 5 өдөр × 3 цаг
GRID_9A = {
    1: [("Математик", "Б.Мухулай", "204"), ("Монгол хэл", "Д.Сараа", "204"), ("Физик", "Ц.Болд", "Физикийн лаб"), ("Англи хэл", "Г.Оюун", "204")],
    2: [("Англи хэл", "Г.Оюун", "204"), ("Математик", "Б.Мухулай", "204"), ("Хими", "Н.Түвшин", "204"), ("Түүх", "Э.Ариунаа", "204")],
    3: [("Математик", "Б.Мухулай", "204"), ("Биологи", "Н.Түвшин", "204"), ("Монгол хэл", "Д.Сараа", "204"), ("Биеийн тамир", "Л.Баяр", "Спорт заал")],
    4: [("Физик", "Ц.Болд", "Физикийн лаб"), ("Математик", "Б.Мухулай", "204"), ("Англи хэл", "Г.Оюун", "204"), ("Түүх", "Э.Ариунаа", "204")],
    5: [("Монгол хэл", "Д.Сараа", "204"), ("Хими", "Н.Түвшин", "204"), ("Математик", "Б.Мухулай", "204"), ("Биеийн тамир", "Л.Баяр", "Спорт заал")],
}
GRID_1A = {d: [("Монгол хэл", "С.Наран", "101"), ("Математик", "С.Наран", "101"), ("Англи хэл", "Б.Энхжин", "101")] for d in range(1, 6)}
CURRICULUM_9A = {"Математик": 5, "Монгол хэл": 3, "Англи хэл": 3, "Физик": 2, "Хими": 2, "Биологи": 1, "Түүх": 2, "Биеийн тамир": 2}
EVENTS = [
    ("1-р улирал", "term", date(2026, 9, 1), date(2026, 11, 6), "all"),
    ("Намрын амралт", "holiday", date(2026, 11, 7), date(2026, 11, 15), "all"),
    ("2-р улирал", "term", date(2026, 11, 16), date(2027, 1, 22), "all"),
    ("Өвлийн амралт", "holiday", date(2027, 1, 23), date(2027, 2, 7), "all"),
    ("3-р улирал", "term", date(2027, 2, 8), date(2027, 4, 2), "all"),
    ("Улирлын шалгалт", "exam", date(2027, 3, 29), date(2027, 4, 2), "secondary"),
    ("4-р улирал", "term", date(2027, 4, 12), date(2027, 6, 10), "all"),
    ("Ү.Маамын нэрэмжит олимпиад", "event", date(2027, 2, 20), date(2027, 2, 20), "all"),
]


def periods(set_id: int, start: time, minutes: int, count: int, long_break_after: int) -> list[Period]:
    """count хичээл, хооронд 10 мин завсарлага (long_break_after-ийн дараа 20 мин), завсарлага мөр болно."""
    out, order, cur = [], 1, start
    for i in range(1, count + 1):
        end = _add(cur, minutes)
        out.append(Period(period_set_id=set_id, order=order, start_time=cur, end_time=end))
        order += 1
        if i < count:
            brk = 20 if i == long_break_after else 10
            out.append(Period(period_set_id=set_id, order=order, start_time=end, end_time=_add(end, brk), is_break=True))
            order += 1
            cur = _add(end, brk)
    return out


def _add(t: time, minutes: int) -> time:
    total = t.hour * 60 + t.minute + minutes
    return time(total // 60, total % 60)


async def main(reset: bool) -> None:
    async with SessionLocal() as db:
        existing = (await db.execute(select(AcademicYear).where(AcademicYear.name == YEAR_NAME))).scalar_one_or_none()
        if existing and not reset:
            print(f"{YEAR_NAME} жил аль хэдийн байна. --reset өгвөл дахин оруулна.")
            return
        if existing:
            await db.execute(delete(AcademicYear).where(AcademicYear.id == existing.id))
            await db.flush()
        has_current = (await db.execute(select(AcademicYear.id).where(AcademicYear.is_current.is_(True)))).first()
        year = AcademicYear(name=YEAR_NAME, start_date=date(2026, 9, 1), end_date=date(2027, 6, 10),
                            working_days=5, is_current=not has_current)
        db.add(year)
        await db.flush()

        sets = {"p": PeriodSet(year_id=year.id, name="Бага анги"), "s": PeriodSet(year_id=year.id, name="Дунд, ахлах анги")}
        db.add_all(sets.values())
        await db.flush()
        ps = {"p": periods(sets["p"].id, time(8, 30), 35, 5, 2), "s": periods(sets["s"].id, time(8, 0), 40, 7, 3)}
        db.add_all([*ps["p"], *ps["s"]])

        subjects = {n: (await db.execute(select(Subject).where(Subject.name == n))).scalar_one_or_none()
                    or Subject(name=n, short_name=s, color=c) for n, s, c in SUBJECTS}
        db.add_all(subjects.values())
        await db.flush()
        teachers = {}
        for ln, fn, sn, subs in TEACHERS:
            t = (await db.execute(select(Teacher).where(Teacher.short_name == sn))).scalar_one_or_none()
            if t is None:
                t = Teacher(last_name=ln, first_name=fn, short_name=sn, subjects=[subjects[s] for s in subs])
                db.add(t)
            teachers[sn] = t
        rooms = {}
        for n, cap, kind in ROOMS:
            r = (await db.execute(select(Room).where(Room.name == n))).scalar_one_or_none()
            if r is None:
                r = Room(name=n, capacity=cap, kind=kind)
                db.add(r)
            rooms[n] = r
        await db.flush()

        classes = {}
        for grade, letter, ps_key, homeroom in CLASSES:
            c = ClassGroup(year_id=year.id, grade=grade, letter=letter, period_set_id=sets[ps_key].id,
                           homeroom_teacher_id=teachers[homeroom].id if homeroom else None)
            db.add(c)
            classes[f"{grade}{letter}"] = c
        await db.flush()

        lesson_periods = {k: [p for p in v if not p.is_break] for k, v in ps.items()}
        for cname, grid, key in (("9а", GRID_9A, "s"), ("1а", GRID_1A, "p")):
            for weekday, cells in grid.items():
                for p, (subj, teacher, room) in zip(lesson_periods[key], cells):
                    db.add(Lesson(class_group_id=classes[cname].id, weekday=weekday, period_id=p.id,
                                  subject_id=subjects[subj].id, teacher_id=teachers[teacher].id, room_id=rooms[room].id))
        for subj, hours in CURRICULUM_9A.items():
            db.add(CurriculumEntry(class_group_id=classes["9а"].id, subject_id=subjects[subj].id, hours_per_week=hours))
        for title, cat, s, e, who in EVENTS:
            db.add(CalendarEvent(year_id=year.id, title=title, category=cat, start_date=s, end_date=e, applies_to=who))
        await db.commit()
        print(f"{YEAR_NAME}: {len(classes)} анги, {len(subjects)} хичээл, {len(teachers)} багш, {len(rooms)} өрөө, "
              f"{len(EVENTS)} үйл явдал оруулав.")


if __name__ == "__main__":
    asyncio.run(main(reset="--reset" in sys.argv))
```

- [ ] **Step 2: Ажиллуулж шалгах**

Run: `cd backend && uv run python scripts/seed_timetable.py` → "2026–2027: 6 анги, 8 хичээл, 9 багш, 6 өрөө, 8 үйл явдал оруулав." Дахин ажиллуулбал "аль хэдийн байна". `--reset`-ээр дахин.

Дараа нь (backend dev server асаалттай): `curl -s http://127.0.0.1:8000/api/timetable/stats/` → `{"classes":6,"teachers":9,"rooms":6,"lessons":35,"mismatched_classes":1}` (9а хөтөлбөр 20 цаг, хуваарь 20 — таарна; 1а-д хөтөлбөргүй ч lessons байгаа → `planned 0 != scheduled` → mismatched 1). `curl -s "http://127.0.0.1:8000/api/timetable/classes/"` → 6 анги. 9а-ийн `id`-ийг аваад `http://127.0.0.1:8000/api/timetable/classes/<id>/timetable.pdf`-ийг browser-оор нээж кирилл, завсарлагын саарал мөр, 5 багана харагдахыг батална.

- [ ] **Step 3: Бүх тест**

Run: `cd backend && uv run pytest --tb=short -q`
Expected: 99 passed (seed скрипт тестийн баазад нөлөөлөхгүй).

---
### Task 9: Frontend суурь — төрөл, API клиент, жилийн сонголт, админ цэс, тойм хуудас

**Files:**
- Modify: `frontend/src/lib/types.ts`, `frontend/src/lib/api.ts`, `frontend/src/app/admin/(dashboard)/layout.tsx`
- Create: `frontend/src/components/timetable/format.ts`, `frontend/src/components/timetable/useYear.ts`, `frontend/src/components/timetable/YearSelect.tsx`, `frontend/src/components/admin/timetable/forms.tsx`, `frontend/src/app/admin/(dashboard)/timetable/layout.tsx`, `frontend/src/app/admin/(dashboard)/timetable/page.tsx`

**Interfaces:**
- Consumes: backend `/api/timetable/*` (Task 2–7).
- Produces: `types.ts`-ийн timetable төрлүүд (доор), `api.timetable.{years, periodSets, periods, subjects, teachers, rooms, classes, curriculum, calendar, lessons, grid, stats}`, `useYear() → { years, year, yearId, setYearId, loading, error, reload }`, `<YearSelect years value onChange />`, `format.ts`-ийн `WEEKDAY_NAMES, hm, ROOM_KINDS, EVENT_CATEGORIES, APPLIES_TO`, `forms.tsx`-ийн `useModalForm<T>()`, `confirmRemove()`, `<FormError errors />`.

- [ ] **Step 1: Төрлүүд**

`frontend/src/lib/types.ts`-ийн төгсгөлд:

```ts
/* ---- Хичээлийн хуваарь (backend/app/timetable/schemas.py) ---- */
export interface AcademicYear { id: number; name: string; start_date: string; end_date: string; working_days: number; is_current: boolean }
export type AcademicYearInput = Omit<AcademicYear, "id" | "is_current">;
export interface Period { id: number; period_set_id: number; order: number; start_time: string; end_time: string; is_break: boolean }
export type PeriodInput = Omit<Period, "id">;
export interface PeriodSet { id: number; year_id: number; name: string; periods: Period[] }
export interface Subject { id: number; name: string; short_name: string; color: string }
export type SubjectInput = Omit<Subject, "id">;
export interface Teacher { id: number; last_name: string; first_name: string; short_name: string; full_name: string; is_active: boolean; subject_ids: number[] }
export type TeacherInput = Omit<Teacher, "id" | "full_name">;
export type RoomKind = "classroom" | "lab" | "gym" | "other";
export interface Room { id: number; name: string; capacity: number | null; kind: RoomKind }
export type RoomInput = Omit<Room, "id">;
export interface ClassGroup { id: number; year_id: number; grade: number; letter: string; name: string; period_set_id: number; homeroom_teacher_id: number | null }
export type ClassGroupInput = Omit<ClassGroup, "id" | "name">;
export interface CurriculumEntry { id: number; class_group_id: number; subject_id: number; hours_per_week: number; subject: Subject }
export type EventCategory = "term" | "holiday" | "exam" | "event" | "other";
export type AppliesTo = "all" | "primary" | "secondary" | "high";
export interface CalendarEvent { id: number; year_id: number; title: string; category: EventCategory; start_date: string; end_date: string; description: string; applies_to: AppliesTo }
export type CalendarEventInput = Omit<CalendarEvent, "id">;
export interface Lesson {
  id: number; weekday: number;
  period: { id: number; order: number; start_time: string; end_time: string; is_break: boolean };
  subject: Subject; teacher: { id: number; short_name: string }; room: { id: number; name: string } | null;
  class_group: { id: number; name: string };
}
export interface GridCell { weekday: number; period_id: number; subject_id: number; teacher_id: number; room_id: number | null }
export interface Conflict { weekday: number; period_id: number; period_order: number; kind: "teacher" | "room"; with_class: string; who: string }
export interface CurriculumCheck { subject: Subject; planned: number; scheduled: number }
export interface TimetableStats { classes: number; teachers: number; rooms: number; lessons: number; mismatched_classes: number }
export interface TimetableImportSheet { sheet: string; class_name: string | null; count: number; warnings: string[]; conflicts: Conflict[] }
export interface TimetableImportResponse { year: number; dry_run: boolean; imported: boolean; total: number; created: number; deleted: number; sheets: TimetableImportSheet[] }
```

- [ ] **Step 2: API клиент**

`frontend/src/lib/api.ts`: импортын жагсаалтад `AcademicYear, AcademicYearInput, CalendarEvent, CalendarEventInput, ClassGroup, ClassGroupInput, Conflict, CurriculumCheck, CurriculumEntry, GridCell, Lesson, Period, PeriodInput, PeriodSet, Room, RoomInput, Subject, SubjectInput, Teacher, TeacherInput, TimetableImportResponse, TimetableStats` нэмнэ (`Conflict`-ийг ашиглахгүй бол оруулахгүй). `api` объектын `social`-ийн дараа:

```ts
  /* ---- хичээлийн хуваарь (унших нээлттэй, бичих manager) ---- */
  timetable: {
    years: {
      list: () => request<AcademicYear[]>("/api/timetable/years/", { auth: false }),
      create: (d: AcademicYearInput) => request<AcademicYear>("/api/timetable/years/", { method: "POST", body: d }),
      update: (id: number, d: Partial<AcademicYearInput>) => request<AcademicYear>(`/api/timetable/years/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/years/${id}/`, { method: "DELETE" }),
      setCurrent: (id: number) => request<AcademicYear>(`/api/timetable/years/${id}/set-current/`, { method: "POST" }),
    },
    periodSets: {
      list: (year: number) => request<PeriodSet[]>(`/api/timetable/period-sets/${q({ year })}`, { auth: false }),
      create: (d: { year_id: number; name: string }) => request<PeriodSet>("/api/timetable/period-sets/", { method: "POST", body: d }),
      update: (id: number, d: { name: string }) => request<PeriodSet>(`/api/timetable/period-sets/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/period-sets/${id}/`, { method: "DELETE" }),
    },
    periods: {
      create: (d: PeriodInput) => request<Period>("/api/timetable/periods/", { method: "POST", body: d }),
      update: (id: number, d: Partial<Omit<PeriodInput, "period_set_id">>) => request<Period>(`/api/timetable/periods/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/periods/${id}/`, { method: "DELETE" }),
    },
    subjects: {
      list: () => request<Subject[]>("/api/timetable/subjects/", { auth: false }),
      create: (d: SubjectInput) => request<Subject>("/api/timetable/subjects/", { method: "POST", body: d }),
      update: (id: number, d: Partial<SubjectInput>) => request<Subject>(`/api/timetable/subjects/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/subjects/${id}/`, { method: "DELETE" }),
    },
    teachers: {
      list: (active?: boolean) => request<Teacher[]>(`/api/timetable/teachers/${q({ active })}`, { auth: false }),
      create: (d: TeacherInput) => request<Teacher>("/api/timetable/teachers/", { method: "POST", body: d }),
      update: (id: number, d: Partial<TeacherInput>) => request<Teacher>(`/api/timetable/teachers/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/teachers/${id}/`, { method: "DELETE" }),
    },
    rooms: {
      list: () => request<Room[]>("/api/timetable/rooms/", { auth: false }),
      create: (d: RoomInput) => request<Room>("/api/timetable/rooms/", { method: "POST", body: d }),
      update: (id: number, d: Partial<RoomInput>) => request<Room>(`/api/timetable/rooms/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/rooms/${id}/`, { method: "DELETE" }),
    },
    classes: {
      list: (year: number) => request<ClassGroup[]>(`/api/timetable/classes/${q({ year })}`, { auth: false }),
      create: (d: ClassGroupInput) => request<ClassGroup>("/api/timetable/classes/", { method: "POST", body: d }),
      update: (id: number, d: Partial<Omit<ClassGroupInput, "year_id">>) => request<ClassGroup>(`/api/timetable/classes/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/classes/${id}/`, { method: "DELETE" }),
      curriculumCheck: (id: number) => request<CurriculumCheck[]>(`/api/timetable/classes/${id}/curriculum-check/`, { auth: false }),
      pdfUrl: (id: number) => `${API_URL}/api/timetable/classes/${id}/timetable.pdf`,
    },
    curriculum: {
      list: (classId: number) => request<CurriculumEntry[]>(`/api/timetable/curriculum/${q({ class: classId })}`, { auth: false }),
      create: (d: { class_group_id: number; subject_id: number; hours_per_week: number }) => request<CurriculumEntry>("/api/timetable/curriculum/", { method: "POST", body: d }),
      update: (id: number, d: { hours_per_week: number }) => request<CurriculumEntry>(`/api/timetable/curriculum/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/curriculum/${id}/`, { method: "DELETE" }),
    },
    calendar: {
      list: (year: number) => request<CalendarEvent[]>(`/api/timetable/calendar/${q({ year })}`, { auth: false }),
      create: (d: CalendarEventInput) => request<CalendarEvent>("/api/timetable/calendar/", { method: "POST", body: d }),
      update: (id: number, d: Partial<Omit<CalendarEventInput, "year_id">>) => request<CalendarEvent>(`/api/timetable/calendar/${id}/`, { method: "PATCH", body: d }),
      remove: (id: number) => request<void>(`/api/timetable/calendar/${id}/`, { method: "DELETE" }),
    },
    lessons: {
      list: (p: { year?: number; class?: number; teacher?: number; room?: number }) => request<Lesson[]>(`/api/timetable/lessons/${q(p)}`, { auth: false }),
      /** Excel импорт. dryRun=true бол зөвхөн шалгаад тайлан буцаана. */
      importExcel: (file: File, year: number, dryRun: boolean, replace = true) => {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("year", String(year));
        fd.append("dry_run", String(dryRun));
        fd.append("replace", String(replace));
        return request<TimetableImportResponse>("/api/timetable/lessons/import/", { method: "POST", body: fd });
      },
    },
    grid: {
      /** Ангийн хуваарийг бүхэлд нь солино. Давхардалтай бол ApiError(400, {conflicts: [...]}) */
      save: (classId: number, cells: GridCell[]) => request<Lesson[]>(`/api/timetable/classes/${classId}/grid/`, { method: "PUT", body: cells }),
    },
    stats: (year?: number) => request<TimetableStats>(`/api/timetable/stats/${q({ year })}`, { auth: false }),
  },
```

- [ ] **Step 3: format.ts, useYear, YearSelect, forms**

`frontend/src/components/timetable/format.ts`:

```ts
/* Хуваарийн текст туслахууд (олон нийт ба админ хоёулаа). */

import type { AppliesTo, EventCategory, RoomKind } from "@/lib/types";

export const WEEKDAY_NAMES = ["", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
export const WEEKDAY_SHORT = ["", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
/** "08:00:00" → "08:00" */
export const hm = (t: string) => t.slice(0, 5);
export const ROOM_KINDS: Record<RoomKind, string> = { classroom: "Анги", lab: "Лаборатори", gym: "Спорт заал", other: "Бусад" };
export const EVENT_CATEGORIES: Record<EventCategory, string> = { term: "Улирал", holiday: "Амралт", exam: "Шалгалт", event: "Үйл явдал", other: "Бусад" };
export const APPLIES_TO: Record<AppliesTo, string> = { all: "Бүх анги", primary: "Бага анги", secondary: "Дунд анги", high: "Ахлах анги" };
```

`frontend/src/components/timetable/useYear.ts`:

```ts
"use client";

/* Хичээлийн жилийн сонголт: жагсаалтыг татаж, сонгосон жилийг localStorage-д санана.
   Сонгоогүй эсвэл сонгосон нь жагсаалтад байхгүй бол одоогийн (is_current) жил, тэр ч байхгүй бол эхнийх. */

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AcademicYear } from "@/lib/types";

const KEY = "shineue.tt.year";

function readStored(): number | null {
  if (typeof window === "undefined") return null;
  try { const v = localStorage.getItem(KEY); return v ? Number(v) : null; } catch { return null; }
}

export function useYear() {
  const yearsQ = useFetch(() => api.timetable.years.list(), []);
  const [chosen, setChosen] = useState<number | null>(readStored);
  const years = yearsQ.data ?? [];
  const year: AcademicYear | null = years.find((y) => y.id === chosen) ?? years.find((y) => y.is_current) ?? years[0] ?? null;
  const setYearId = useCallback((id: number) => {
    setChosen(id);
    try { localStorage.setItem(KEY, String(id)); } catch { /* хадгалах боломжгүй (private mode) — зүгээр */ }
  }, []);
  return { years, year, yearId: year?.id ?? null, setYearId, loading: yearsQ.loading, error: yearsQ.error, reload: yearsQ.reload };
}
```

`frontend/src/components/timetable/YearSelect.tsx`:

```tsx
"use client";

import type { AcademicYear } from "@/lib/types";

export function YearSelect({ years, value, onChange, className = "" }: { years: AcademicYear[]; value: number | null; onChange: (id: number) => void; className?: string }) {
  if (years.length === 0) return null;
  return (
    <select value={value ?? ""} onChange={(e) => onChange(Number(e.target.value))} aria-label="Хичээлийн жил"
            className={`rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30 ${className}`}>
      {years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.is_current ? " (одоогийн)" : ""}</option>)}
    </select>
  );
}
```

`frontend/src/components/admin/timetable/forms.tsx`:

```tsx
"use client";

/* Админы CRUD хуудсуудын давтагдах хэсэг: Modal-ын форм төлөв, устгах баталгаажуулалт, алдааны мөр. */

import { useState } from "react";
import { ApiError } from "@/lib/api";

export function useModalForm<T>() {
  const [editing, setEditing] = useState<{ id?: number; data: T } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const open = (data: T, id?: number) => { setErrors({}); setEditing({ id, data }); };
  const close = () => setEditing(null);
  const set = (patch: Partial<T>) => setEditing((e) => (e ? { ...e, data: { ...e.data, ...patch } } : e));

  /** fn(id, data): id байвал update, үгүй бол create. Амжилттай бол хаагаад after() дуудна. */
  async function submit(fn: (id: number | undefined, data: T) => Promise<unknown>, after: () => void) {
    if (!editing) return;
    setBusy(true); setErrors({});
    try {
      await fn(editing.id, editing.data);
      setEditing(null);
      after();
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }
  return { editing, errors, busy, open, close, set, submit };
}

export async function confirmRemove(message: string, fn: () => Promise<void>, after: () => void) {
  if (!confirm(message)) return;
  try { await fn(); after(); }
  catch (err) { alert(err instanceof ApiError ? Object.values(err.fieldErrors).join(" ") : "Устгаж чадсангүй."); }
}

export function FormError({ errors }: { errors: Record<string, string> }) {
  const msg = errors.non_field_errors ?? errors.detail;
  return msg ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p> : null;
}
```

- [ ] **Step 4: Админ цэс ба nested layout**

`frontend/src/app/admin/(dashboard)/layout.tsx`-ийн `NAV`-д `album`-ын дараа:

```ts
  { href: "/admin/timetable", label: "Хичээлийн хуваарь", icon: "▤", role: "manager" },
```

`frontend/src/app/admin/(dashboard)/timetable/layout.tsx`:

```tsx
"use client";

/* Хуваарийн хэсгийн дэд цэс (табууд). Хуудас бүр өөрөө жилээ сонгоно (useYear). */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/timetable", label: "Тойм", exact: true },
  { href: "/admin/timetable/setup", label: "Тохиргоо" },
  { href: "/admin/timetable/grid", label: "Хуваарь" },
  { href: "/admin/timetable/curriculum", label: "Хөтөлбөр" },
  { href: "/admin/timetable/calendar", label: "Календарь" },
  { href: "/admin/timetable/import", label: "Excel импорт" },
];

export default function TimetableLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="space-y-6">
      <nav aria-label="Хуваарийн хэсгүүд" className="flex flex-wrap gap-1 border-b border-slate-200">
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

- [ ] **Step 5: Тойм хуудас**

`frontend/src/app/admin/(dashboard)/timetable/page.tsx`:

```tsx
"use client";

/* Хуваарийн тойм: жил сонгох, тоон үзүүлэлт, хичээлийн жилүүдийн удирдлага (нэмэх, засах, одоогийн болгох, устгах). */

import Link from "next/link";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AcademicYear, AcademicYearInput } from "@/lib/types";
import { Badge, Button, Card, Empty, Field, Input, Modal, Select, Spinner, Table, Td, Th } from "@/components/ui";
import { useYear } from "@/components/timetable/useYear";
import { YearSelect } from "@/components/timetable/YearSelect";
import { confirmRemove, FormError, useModalForm } from "@/components/admin/timetable/forms";

const emptyYear = (): AcademicYearInput => ({ name: "", start_date: "", end_date: "", working_days: 5 });

export default function TimetableHome() {
  const { years, yearId, setYearId, loading, error, reload } = useYear();
  const statsQ = useFetch(() => (yearId ? api.timetable.stats(yearId) : null), [yearId]);
  const form = useModalForm<AcademicYearInput>();

  const save = () => form.submit((id, d) => (id ? api.timetable.years.update(id, d) : api.timetable.years.create(d)), reload);
  async function setCurrent(y: AcademicYear) {
    try { await api.timetable.years.setCurrent(y.id); reload(); } catch { alert("Солиж чадсангүй."); }
  }

  const s = statsQ.data;
  const tiles = s ? [
    { label: "Анги", value: s.classes, href: "/admin/timetable/setup?tab=classes" },
    { label: "Багш", value: s.teachers, href: "/admin/timetable/setup?tab=teachers" },
    { label: "Өрөө", value: s.rooms, href: "/admin/timetable/setup?tab=rooms" },
    { label: "Хуваарьт цаг", value: s.lessons, href: "/admin/timetable/grid" },
    { label: "Хөтөлбөртэй таарахгүй анги", value: s.mismatched_classes, href: "/admin/timetable/curriculum", warn: s.mismatched_classes > 0 },
  ] : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Хичээлийн хуваарь</h1>
          <p className="text-sm text-slate-600">Хичээлийн жил, цагийн хүснэгт, анги, багш, өрөө, хуваарь, хөтөлбөр, календарь.</p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelect years={years} value={yearId} onChange={setYearId} />
          <Button onClick={() => form.open(emptyYear())}>+ Шинэ жил</Button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading ? <Spinner /> : years.length === 0 ? (
        <Empty>Хичээлийн жил үүсгээгүй байна. "Шинэ жил" дарж эхэлнэ үү.</Empty>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {tiles.map((t) => (
              <Link key={t.label} href={t.href} className="block">
                <Card className={t.warn ? "border-red-200 bg-red-50" : ""}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.label}</div>
                  <div className={`mt-1 text-3xl font-black ${t.warn ? "text-red-700" : "text-navy"}`}>{t.value}</div>
                </Card>
              </Link>
            ))}
          </div>

          <Table head={<><Th>Жил</Th><Th>Эхлэх</Th><Th>Дуусах</Th><Th>Ажлын өдөр</Th><Th>Төлөв</Th><Th className="text-right">Үйлдэл</Th></>}>
            {years.map((y) => (
              <tr key={y.id}>
                <Td className="font-semibold">{y.name}</Td>
                <Td>{y.start_date}</Td>
                <Td>{y.end_date}</Td>
                <Td>{y.working_days}</Td>
                <Td>{y.is_current ? <Badge tone="green">Одоогийн</Badge> : <Button variant="ghost" onClick={() => setCurrent(y)}>Одоогийн болгох</Button>}</Td>
                <Td className="text-right space-x-2">
                  <Button variant="ghost" onClick={() => form.open({ name: y.name, start_date: y.start_date, end_date: y.end_date, working_days: y.working_days }, y.id)}>Засах</Button>
                  <Button variant="danger" onClick={() => confirmRemove(`"${y.name}" жилийг устгах уу? Түүний бүх анги, хуваарь, хөтөлбөр, календарь устана.`, () => api.timetable.years.remove(y.id), reload)}>Устгах</Button>
                </Td>
              </tr>
            ))}
          </Table>
        </>
      )}

      <Modal open={!!form.editing} title={form.editing?.id ? "Жил засах" : "Шинэ хичээлийн жил"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="year-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (
          <form id="year-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <Field label="Нэр" error={form.errors.name} hint="Жишээ: 2026–2027">
              <Input value={form.editing.data.name} onChange={(e) => form.set({ name: e.target.value })} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Эхлэх огноо" error={form.errors.start_date}><Input type="date" value={form.editing.data.start_date} onChange={(e) => form.set({ start_date: e.target.value })} required /></Field>
              <Field label="Дуусах огноо" error={form.errors.end_date}><Input type="date" value={form.editing.data.end_date} onChange={(e) => form.set({ end_date: e.target.value })} required /></Field>
            </div>
            <Field label="Долоо хоногийн ажлын өдөр" error={form.errors.working_days}>
              <Select value={form.editing.data.working_days} onChange={(e) => form.set({ working_days: Number(e.target.value) })}>
                <option value={5}>5 (Даваа–Баасан)</option>
                <option value={6}>6 (Даваа–Бямба)</option>
              </Select>
            </Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
```

- [ ] **Step 6: Шалгах**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json && node node_modules/eslint/bin/eslint.js src/lib src/components/timetable src/components/admin/timetable "src/app/admin/(dashboard)/layout.tsx" "src/app/admin/(dashboard)/timetable"`
Expected: цэвэр.

Browser (backend + frontend preview асаалттай, `admin`/`admin1234`, Task 8-ийн seed орсон): `/admin/timetable` → цэсэнд "Хичээлийн хуваарь" харагдана (superuser); жил сонголтод "2026–2027 (одоогийн)"; 5 карт: Анги 6, Багш 9, Өрөө 6, Хуваарьт цаг 35, таарахгүй 1 (улаан). "Шинэ жил" → 2027–2028 үүсгэх → жагсаалтад нэмэгдэж, "Одоогийн болгох" ажиллана; буцаагаад 2026–2027-г одоогийн болгоод 2027–2028-ыг устгана. Screenshot.

---

### Task 10: Тохиргооны хуудас — цагийн хүснэгт, анги, хичээл, багш, өрөө

**Files:**
- Create: `frontend/src/app/admin/(dashboard)/timetable/setup/page.tsx`, `frontend/src/components/admin/timetable/PeriodsTab.tsx`, `ClassesTab.tsx`, `SubjectsTab.tsx`, `TeachersTab.tsx`, `RoomsTab.tsx`

**Interfaces:**
- Consumes: `api.timetable.*`, `useYear`, `forms.tsx`, `format.ts`.
- Produces: `/admin/timetable/setup?tab=periods|classes|subjects|teachers|rooms`.

- [ ] **Step 1: Хуудас (таб сонголт)**

`frontend/src/app/admin/(dashboard)/timetable/setup/page.tsx`:

```tsx
"use client";

/* Тохиргоо: 5 таб. ?tab= query-гээр сонгоно (тойм хуудасны картууд шууд холбогдоно). */

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Empty, Spinner } from "@/components/ui";
import { useYear } from "@/components/timetable/useYear";
import { YearSelect } from "@/components/timetable/YearSelect";
import { PeriodsTab } from "@/components/admin/timetable/PeriodsTab";
import { ClassesTab } from "@/components/admin/timetable/ClassesTab";
import { SubjectsTab } from "@/components/admin/timetable/SubjectsTab";
import { TeachersTab } from "@/components/admin/timetable/TeachersTab";
import { RoomsTab } from "@/components/admin/timetable/RoomsTab";

const TABS = [
  { key: "periods", label: "Цагийн хүснэгт" }, { key: "classes", label: "Ангиуд" }, { key: "subjects", label: "Хичээлүүд" },
  { key: "teachers", label: "Багш нар" }, { key: "rooms", label: "Өрөөнүүд" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function SetupTabs() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (TABS.some((t) => t.key === sp.get("tab")) ? sp.get("tab") : "periods") as TabKey;
  const { years, yearId, setYearId, loading } = useYear();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Тохиргоо</h1>
          <p className="text-sm text-slate-600">Цагийн хүснэгт ба ангиуд жилээр; хичээл, багш, өрөө бүх жилд нийтлэг.</p>
        </div>
        <YearSelect years={years} value={yearId} onChange={setYearId} />
      </div>
      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => router.replace(`/admin/timetable/setup?tab=${t.key}`)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t.key ? "bg-navy text-white" : "bg-slate-100 text-slate-700 hover:bg-navy/10"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : (tab === "periods" || tab === "classes") && !yearId ? (
        <Empty>Эхлээд "Тойм" хэсэгт хичээлийн жил үүсгэнэ үү.</Empty>
      ) : (
        <>
          {tab === "periods" && yearId && <PeriodsTab yearId={yearId} />}
          {tab === "classes" && yearId && <ClassesTab yearId={yearId} />}
          {tab === "subjects" && <SubjectsTab />}
          {tab === "teachers" && <TeachersTab />}
          {tab === "rooms" && <RoomsTab />}
        </>
      )}
    </div>
  );
}

export default function SetupPage() {
  return <Suspense fallback={<Spinner />}><SetupTabs /></Suspense>;
}
```

- [ ] **Step 2: PeriodsTab**

`frontend/src/components/admin/timetable/PeriodsTab.tsx`:

```tsx
"use client";

/* Цагийн хүснэгтүүд (карт бүр нэг хүснэгт) ба цаг бүрийн мөр. Завсарлагыг тусдаа мөр болгож оруулна. */

import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { PeriodInput, PeriodSet } from "@/lib/types";
import { Badge, Button, Card, Empty, Field, Input, Modal, Spinner, Table, Td, Th } from "@/components/ui";
import { hm } from "@/components/timetable/format";
import { confirmRemove, FormError, useModalForm } from "./forms";

export function PeriodsTab({ yearId }: { yearId: number }) {
  const setsQ = useFetch(() => api.timetable.periodSets.list(yearId), [yearId]);
  const setForm = useModalForm<{ name: string }>();
  const periodForm = useModalForm<PeriodInput>();

  const saveSet = () => setForm.submit((id, d) => (id ? api.timetable.periodSets.update(id, d) : api.timetable.periodSets.create({ year_id: yearId, name: d.name })), setsQ.reload);
  const savePeriod = () => periodForm.submit((id, d) => (id ? api.timetable.periods.update(id, { order: d.order, start_time: d.start_time, end_time: d.end_time, is_break: d.is_break }) : api.timetable.periods.create(d)), setsQ.reload);
  const nextOrder = (s: PeriodSet) => (s.periods.length ? Math.max(...s.periods.map((p) => p.order)) + 1 : 1);
  const lastEnd = (s: PeriodSet) => (s.periods.length ? hm(s.periods[s.periods.length - 1].end_time) : "08:00");

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button onClick={() => setForm.open({ name: "" })}>+ Цагийн хүснэгт</Button></div>
      {setsQ.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{setsQ.error}</p>}
      {setsQ.loading ? <Spinner /> : !setsQ.data?.length ? (
        <Empty>Цагийн хүснэгт байхгүй. Жишээ: "Бага анги" (35 мин), "Дунд, ахлах анги" (40 мин).</Empty>
      ) : setsQ.data.map((s) => (
        <Card key={s.id} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-navy">{s.name}</h2>
            <div className="space-x-2">
              <Button variant="ghost" onClick={() => periodForm.open({ period_set_id: s.id, order: nextOrder(s), start_time: lastEnd(s), end_time: "", is_break: false })}>+ Цаг</Button>
              <Button variant="ghost" onClick={() => setForm.open({ name: s.name }, s.id)}>Нэр засах</Button>
              <Button variant="danger" onClick={() => confirmRemove(`"${s.name}" хүснэгтийг устгах уу?`, () => api.timetable.periodSets.remove(s.id), setsQ.reload)}>Устгах</Button>
            </div>
          </div>
          {s.periods.length === 0 ? <p className="text-sm text-slate-500">Цаг нэмээгүй байна.</p> : (
            <Table head={<><Th>№</Th><Th>Эхлэх</Th><Th>Дуусах</Th><Th>Төрөл</Th><Th className="text-right">Үйлдэл</Th></>}>
              {s.periods.map((p) => (
                <tr key={p.id} className={p.is_break ? "bg-slate-50" : ""}>
                  <Td>{p.order}</Td><Td>{hm(p.start_time)}</Td><Td>{hm(p.end_time)}</Td>
                  <Td>{p.is_break ? <Badge tone="slate">Завсарлага</Badge> : <Badge tone="navy">Хичээл</Badge>}</Td>
                  <Td className="text-right space-x-2">
                    <Button variant="ghost" onClick={() => periodForm.open({ period_set_id: s.id, order: p.order, start_time: hm(p.start_time), end_time: hm(p.end_time), is_break: p.is_break }, p.id)}>Засах</Button>
                    <Button variant="danger" onClick={() => confirmRemove(`${p.order}-р цагийг устгах уу?`, () => api.timetable.periods.remove(p.id), setsQ.reload)}>Устгах</Button>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      ))}

      <Modal open={!!setForm.editing} title={setForm.editing?.id ? "Хүснэгтийн нэр" : "Цагийн хүснэгт нэмэх"} onClose={setForm.close}
             footer={<><Button variant="ghost" onClick={setForm.close}>Болих</Button><Button type="submit" form="period-set-form" disabled={setForm.busy}>Хадгалах</Button></>}>
        {setForm.editing && (
          <form id="period-set-form" onSubmit={(e) => { e.preventDefault(); saveSet(); }} className="space-y-4">
            <FormError errors={setForm.errors} />
            <Field label="Нэр" error={setForm.errors.name}><Input value={setForm.editing.data.name} onChange={(e) => setForm.set({ name: e.target.value })} required /></Field>
          </form>
        )}
      </Modal>

      <Modal open={!!periodForm.editing} title={periodForm.editing?.id ? "Цаг засах" : "Цаг нэмэх"} onClose={periodForm.close}
             footer={<><Button variant="ghost" onClick={periodForm.close}>Болих</Button><Button type="submit" form="period-form" disabled={periodForm.busy}>Хадгалах</Button></>}>
        {periodForm.editing && (
          <form id="period-form" onSubmit={(e) => { e.preventDefault(); savePeriod(); }} className="space-y-4">
            <FormError errors={periodForm.errors} />
            <Field label="Дугаар" error={periodForm.errors.order}><Input type="number" min={1} max={20} value={periodForm.editing.data.order} onChange={(e) => periodForm.set({ order: Number(e.target.value) })} required /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Эхлэх" error={periodForm.errors.start_time}><Input type="time" value={periodForm.editing.data.start_time} onChange={(e) => periodForm.set({ start_time: e.target.value })} required /></Field>
              <Field label="Дуусах" error={periodForm.errors.end_time}><Input type="time" value={periodForm.editing.data.end_time} onChange={(e) => periodForm.set({ end_time: e.target.value })} required /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={periodForm.editing.data.is_break} onChange={(e) => periodForm.set({ is_break: e.target.checked })} className="h-4 w-4 accent-navy" />
              Завсарлага (хичээл оруулахгүй, хуваарьт саарал мөр)
            </label>
          </form>
        )}
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: ClassesTab**

`frontend/src/components/admin/timetable/ClassesTab.tsx`:

```tsx
"use client";

/* Бүлэг ангиуд: анги (1–12) + үсэг, цагийн хүснэгт, анги даасан багш. */

import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { ClassGroupInput } from "@/lib/types";
import { Button, Empty, Field, Input, Modal, Select, Spinner, Table, Td, Th } from "@/components/ui";
import { confirmRemove, FormError, useModalForm } from "./forms";

export function ClassesTab({ yearId }: { yearId: number }) {
  const classesQ = useFetch(() => api.timetable.classes.list(yearId), [yearId]);
  const setsQ = useFetch(() => api.timetable.periodSets.list(yearId), [yearId]);
  const teachersQ = useFetch(() => api.timetable.teachers.list(true), []);
  const form = useModalForm<ClassGroupInput>();

  const save = () => form.submit((id, d) => (id
    ? api.timetable.classes.update(id, { grade: d.grade, letter: d.letter, period_set_id: d.period_set_id, homeroom_teacher_id: d.homeroom_teacher_id })
    : api.timetable.classes.create(d)), classesQ.reload);
  const setName = (id: number) => setsQ.data?.find((s) => s.id === id)?.name ?? "—";
  const teacherName = (id: number | null) => (id ? teachersQ.data?.find((t) => t.id === id)?.short_name ?? "—" : "—");
  const firstSet = setsQ.data?.[0]?.id ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button disabled={!firstSet} onClick={() => form.open({ year_id: yearId, grade: 1, letter: "а", period_set_id: firstSet, homeroom_teacher_id: null })}>+ Анги</Button>
      </div>
      {!setsQ.loading && !setsQ.data?.length && <p className="text-sm text-amber-700">Эхлээд "Цагийн хүснэгт" таб дээр хүснэгт үүсгэнэ үү — анги бүр нэг хүснэгттэй байна.</p>}
      {classesQ.loading ? <Spinner /> : !classesQ.data?.length ? <Empty>Анги байхгүй.</Empty> : (
        <Table head={<><Th>Анги</Th><Th>Цагийн хүснэгт</Th><Th>Анги даасан багш</Th><Th className="text-right">Үйлдэл</Th></>}>
          {classesQ.data.map((c) => (
            <tr key={c.id}>
              <Td className="font-semibold">{c.name}</Td>
              <Td>{setName(c.period_set_id)}</Td>
              <Td>{teacherName(c.homeroom_teacher_id)}</Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => form.open({ year_id: c.year_id, grade: c.grade, letter: c.letter, period_set_id: c.period_set_id, homeroom_teacher_id: c.homeroom_teacher_id }, c.id)}>Засах</Button>
                <Button variant="danger" onClick={() => confirmRemove(`${c.name} ангийг устгах уу? Хуваарь, хөтөлбөр нь устана.`, () => api.timetable.classes.remove(c.id), classesQ.reload)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!form.editing} title={form.editing?.id ? "Анги засах" : "Анги нэмэх"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="class-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (
          <form id="class-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Анги" error={form.errors.grade}>
                <Select value={form.editing.data.grade} onChange={(e) => form.set({ grade: Number(e.target.value) })}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{g}</option>)}
                </Select>
              </Field>
              <Field label="Үсэг" error={form.errors.letter} hint="а, б, в ..."><Input value={form.editing.data.letter} maxLength={4} onChange={(e) => form.set({ letter: e.target.value })} required /></Field>
            </div>
            <Field label="Цагийн хүснэгт" error={form.errors.period_set_id}>
              <Select value={form.editing.data.period_set_id} onChange={(e) => form.set({ period_set_id: Number(e.target.value) })}>
                {setsQ.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Анги даасан багш" error={form.errors.homeroom_teacher_id}>
              <Select value={form.editing.data.homeroom_teacher_id ?? ""} onChange={(e) => form.set({ homeroom_teacher_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— байхгүй —</option>
                {teachersQ.data?.map((t) => <option key={t.id} value={t.id}>{t.short_name}</option>)}
              </Select>
            </Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
```

- [ ] **Step 4: SubjectsTab, RoomsTab**

`frontend/src/components/admin/timetable/SubjectsTab.tsx`:

```tsx
"use client";

/* Хичээлүүд: нэр, товч нэр (хуваарийн нүдэнд), өнгө (хуваарийн зүүн зурвас). */

import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { SubjectInput } from "@/lib/types";
import { Button, Empty, Field, Input, Modal, Spinner, Table, Td, Th } from "@/components/ui";
import { confirmRemove, FormError, useModalForm } from "./forms";

export function SubjectsTab() {
  const q = useFetch(() => api.timetable.subjects.list(), []);
  const form = useModalForm<SubjectInput>();
  const save = () => form.submit((id, d) => (id ? api.timetable.subjects.update(id, d) : api.timetable.subjects.create(d)), q.reload);

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => form.open({ name: "", short_name: "", color: "#1e3a8f" })}>+ Хичээл</Button></div>
      {q.loading ? <Spinner /> : !q.data?.length ? <Empty>Хичээл байхгүй.</Empty> : (
        <Table head={<><Th>Нэр</Th><Th>Товч</Th><Th>Өнгө</Th><Th className="text-right">Үйлдэл</Th></>}>
          {q.data.map((s) => (
            <tr key={s.id}>
              <Td className="font-semibold">{s.name}</Td>
              <Td>{s.short_name}</Td>
              <Td><span className="inline-block h-5 w-5 rounded align-middle" style={{ background: s.color }} aria-label={s.color} /> <span className="text-xs text-slate-500">{s.color}</span></Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => form.open({ name: s.name, short_name: s.short_name, color: s.color }, s.id)}>Засах</Button>
                <Button variant="danger" onClick={() => confirmRemove(`"${s.name}" хичээлийг устгах уу?`, () => api.timetable.subjects.remove(s.id), q.reload)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={!!form.editing} title={form.editing?.id ? "Хичээл засах" : "Хичээл нэмэх"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="subject-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (
          <form id="subject-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <Field label="Нэр" error={form.errors.name}><Input value={form.editing.data.name} onChange={(e) => form.set({ name: e.target.value })} required /></Field>
            <Field label="Товч нэр" error={form.errors.short_name} hint="Хуваарийн нүдэнд, Excel-д ашиглана"><Input value={form.editing.data.short_name} maxLength={20} onChange={(e) => form.set({ short_name: e.target.value })} required /></Field>
            <Field label="Өнгө" error={form.errors.color}><Input type="color" value={form.editing.data.color} onChange={(e) => form.set({ color: e.target.value })} className="h-10 w-20 p-1" /></Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
```

`frontend/src/components/admin/timetable/RoomsTab.tsx`:

```tsx
"use client";

/* Өрөөнүүд: нэр, багтаамж, төрөл. */

import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { RoomInput, RoomKind } from "@/lib/types";
import { Badge, Button, Empty, Field, Input, Modal, Select, Spinner, Table, Td, Th } from "@/components/ui";
import { ROOM_KINDS } from "@/components/timetable/format";
import { confirmRemove, FormError, useModalForm } from "./forms";

export function RoomsTab() {
  const q = useFetch(() => api.timetable.rooms.list(), []);
  const form = useModalForm<RoomInput>();
  const save = () => form.submit((id, d) => (id ? api.timetable.rooms.update(id, d) : api.timetable.rooms.create(d)), q.reload);

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => form.open({ name: "", capacity: null, kind: "classroom" })}>+ Өрөө</Button></div>
      {q.loading ? <Spinner /> : !q.data?.length ? <Empty>Өрөө байхгүй.</Empty> : (
        <Table head={<><Th>Нэр</Th><Th>Багтаамж</Th><Th>Төрөл</Th><Th className="text-right">Үйлдэл</Th></>}>
          {q.data.map((r) => (
            <tr key={r.id}>
              <Td className="font-semibold">{r.name}</Td>
              <Td>{r.capacity ?? "—"}</Td>
              <Td><Badge tone="slate">{ROOM_KINDS[r.kind]}</Badge></Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => form.open({ name: r.name, capacity: r.capacity, kind: r.kind }, r.id)}>Засах</Button>
                <Button variant="danger" onClick={() => confirmRemove(`"${r.name}" өрөөг устгах уу? Хуваарьт өрөөгүй болно.`, () => api.timetable.rooms.remove(r.id), q.reload)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={!!form.editing} title={form.editing?.id ? "Өрөө засах" : "Өрөө нэмэх"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="room-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (
          <form id="room-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <Field label="Нэр" error={form.errors.name}><Input value={form.editing.data.name} onChange={(e) => form.set({ name: e.target.value })} required /></Field>
            <Field label="Багтаамж" error={form.errors.capacity}><Input type="number" min={1} value={form.editing.data.capacity ?? ""} onChange={(e) => form.set({ capacity: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Төрөл" error={form.errors.kind}>
              <Select value={form.editing.data.kind} onChange={(e) => form.set({ kind: e.target.value as RoomKind })}>
                {(Object.keys(ROOM_KINDS) as RoomKind[]).map((k) => <option key={k} value={k}>{ROOM_KINDS[k]}</option>)}
              </Select>
            </Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
```

- [ ] **Step 5: TeachersTab**

`frontend/src/components/admin/timetable/TeachersTab.tsx`:

```tsx
"use client";

/* Багш нар: овог, нэр, товч нэр (Б.Мухулай — хуваарь, Excel-д), заадаг хичээлүүд, идэвхтэй эсэх. */

import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { TeacherInput } from "@/lib/types";
import { Badge, Button, Empty, Field, Input, Modal, Spinner, Table, Td, Th } from "@/components/ui";
import { confirmRemove, FormError, useModalForm } from "./forms";

export function TeachersTab() {
  const q = useFetch(() => api.timetable.teachers.list(), []);
  const subjectsQ = useFetch(() => api.timetable.subjects.list(), []);
  const form = useModalForm<TeacherInput>();
  const save = () => form.submit((id, d) => (id ? api.timetable.teachers.update(id, d) : api.timetable.teachers.create(d)), q.reload);
  const subjectName = (id: number) => subjectsQ.data?.find((s) => s.id === id)?.short_name ?? "?";

  function toggleSubject(id: number) {
    const ids = form.editing?.data.subject_ids ?? [];
    form.set({ subject_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => form.open({ last_name: "", first_name: "", short_name: "", is_active: true, subject_ids: [] })}>+ Багш</Button></div>
      {q.loading ? <Spinner /> : !q.data?.length ? <Empty>Багш байхгүй.</Empty> : (
        <Table head={<><Th>Товч нэр</Th><Th>Овог, нэр</Th><Th>Хичээлүүд</Th><Th>Төлөв</Th><Th className="text-right">Үйлдэл</Th></>}>
          {q.data.map((t) => (
            <tr key={t.id} className={t.is_active ? "" : "text-slate-400"}>
              <Td className="font-semibold">{t.short_name}</Td>
              <Td>{t.full_name}</Td>
              <Td className="space-x-1">{t.subject_ids.map((id) => <Badge key={id} tone="navy">{subjectName(id)}</Badge>)}</Td>
              <Td>{t.is_active ? <Badge tone="green">Идэвхтэй</Badge> : <Badge tone="slate">Идэвхгүй</Badge>}</Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => form.open({ last_name: t.last_name, first_name: t.first_name, short_name: t.short_name, is_active: t.is_active, subject_ids: t.subject_ids }, t.id)}>Засах</Button>
                <Button variant="danger" onClick={() => confirmRemove(`${t.short_name} багшийг устгах уу?`, () => api.timetable.teachers.remove(t.id), q.reload)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={!!form.editing} title={form.editing?.id ? "Багш засах" : "Багш нэмэх"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="teacher-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (
          <form id="teacher-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Овог" error={form.errors.last_name}><Input value={form.editing.data.last_name} onChange={(e) => form.set({ last_name: e.target.value })} /></Field>
              <Field label="Нэр" error={form.errors.first_name}><Input value={form.editing.data.first_name} onChange={(e) => form.set({ first_name: e.target.value })} required /></Field>
            </div>
            <Field label="Товч нэр" error={form.errors.short_name} hint="Хуваарь, Excel-д ашиглана. Жишээ: Б.Мухулай">
              <Input value={form.editing.data.short_name} onChange={(e) => form.set({ short_name: e.target.value })} required />
            </Field>
            <Field label="Заадаг хичээлүүд" error={form.errors.subject_ids}>
              <div className="flex flex-wrap gap-2">
                {subjectsQ.data?.map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-sm">
                    <input type="checkbox" checked={form.editing!.data.subject_ids.includes(s.id)} onChange={() => toggleSubject(s.id)} className="accent-navy" />{s.name}
                  </label>
                ))}
              </div>
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.editing.data.is_active} onChange={(e) => form.set({ is_active: e.target.checked })} className="h-4 w-4 accent-navy" />
              Идэвхтэй (хуваарьт сонгогдох боломжтой)
            </label>
          </form>
        )}
      </Modal>
    </div>
  );
}
```

- [ ] **Step 6: Шалгах**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json && node node_modules/eslint/bin/eslint.js src/components/admin/timetable "src/app/admin/(dashboard)/timetable"`
Expected: цэвэр. (`form.editing!` non-null assertion-ийг eslint хориглож байвал `form.editing.data.subject_ids`-ийг `const ids = form.editing.data.subject_ids` гэж дээр нь авч ашиглана.)

Browser: `/admin/timetable/setup` → 5 таб; "Цагийн хүснэгт"-д seed-ийн 2 хүснэгт, "Дунд, ахлах анги"-д 13 мөр (7 хичээл + 6 завсарлага). Цаг нэмэх → эхлэх цаг автоматаар сүүлийн дуусах цаг; дуусах < эхлэх → `end_time` алдаа талбарын доор. "Ангиуд" → 6 анги, "9в" нэмэх/устгах. "Хичээлүүд" → өнгөний swatch. "Багш нар" → хичээлийн checkbox. "Өрөөнүүд" → төрөл. Тойм картаас `?tab=teachers` холбоос зөв табыг нээнэ. Screenshot (setup, periods tab).

---

### Task 11: Хуваарийн засварлагч (grid)

**Files:**
- Create: `frontend/src/app/admin/(dashboard)/timetable/grid/page.tsx`, `frontend/src/components/admin/timetable/GridEditor.tsx`, `CellPopover.tsx`, `CurriculumPanel.tsx`

**Interfaces:**
- Consumes: `api.timetable.{classes, periodSets, subjects, teachers, rooms, lessons, curriculum, grid}`, `useYear`, `format.ts`.
- Produces: `/admin/timetable/grid`; `<GridEditor classGroup periodSet workingDays subjects teachers rooms curriculum initialLessons onDirtyChange />`, `<CellPopover value subjects teachers rooms align onChange onClose />` (onChange: `{subject_id, teacher_id, room_id} | null`), `<CurriculumPanel curriculum cells subjects />`.

- [ ] **Step 1: CellPopover**

`frontend/src/components/admin/timetable/CellPopover.tsx`:

```tsx
"use client";

/* Нүдний popover: хичээл → багш (тухайн хичээлийг заадаг нь эхэнд) → өрөө.
   Enter/OK хадгална, Esc хаана, "Хоослох" нүдийг цэвэрлэнэ. */

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { GridCell, Room, Subject, Teacher } from "@/lib/types";
import { Button, Field, Select } from "@/components/ui";

export type CellSelection = Pick<GridCell, "subject_id" | "teacher_id" | "room_id">;

interface Props {
  value: CellSelection | null; subjects: Subject[]; teachers: Teacher[]; rooms: Room[];
  align: "left" | "right"; onChange: (sel: CellSelection | null) => void; onClose: () => void;
}

export function CellPopover({ value, subjects, teachers, rooms, align, onChange, onClose }: Props) {
  const [subjectId, setSubjectId] = useState<number | "">(value?.subject_id ?? "");
  const [teacherId, setTeacherId] = useState<number | "">(value?.teacher_id ?? "");
  const [roomId, setRoomId] = useState<number | "">(value?.room_id ?? "");
  const first = useRef<HTMLSelectElement>(null);
  useEffect(() => { first.current?.focus(); }, []);

  const teaches = (t: Teacher) => subjectId !== "" && t.subject_ids.includes(subjectId);
  const sorted = [...teachers].sort((a, b) => Number(teaches(b)) - Number(teaches(a)) || a.short_name.localeCompare(b.short_name));
  const ok = subjectId !== "" && teacherId !== "";

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!ok) return;
    onChange({ subject_id: subjectId, teacher_id: teacherId, room_id: roomId === "" ? null : roomId });
  }

  return (
    <form onSubmit={submit} onKeyDown={(e) => e.key === "Escape" && onClose()}
          className={`absolute top-full z-20 mt-1 w-64 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}>
      <Field label="Хичээл">
        <Select ref={first} value={subjectId} onChange={(e) => { setSubjectId(e.target.value ? Number(e.target.value) : ""); setTeacherId(""); }}>
          <option value="">— сонгох —</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="Багш">
        <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value ? Number(e.target.value) : "")} disabled={subjectId === ""}>
          <option value="">— сонгох —</option>
          {sorted.map((t) => <option key={t.id} value={t.id}>{t.short_name}{teaches(t) ? "" : " (өөр хичээл)"}</option>)}
        </Select>
      </Field>
      <Field label="Өрөө">
        <Select value={roomId} onChange={(e) => setRoomId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">— байхгүй —</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
      </Field>
      <div className="flex justify-between gap-2">
        {value ? <Button type="button" variant="danger" onClick={() => onChange(null)}>Хоослох</Button> : <span />}
        <div className="space-x-2">
          <Button type="button" variant="ghost" onClick={onClose}>Болих</Button>
          <Button type="submit" disabled={!ok}>OK</Button>
        </div>
      </div>
    </form>
  );
}
```

`Select` компонент `ref`-ийг дамжуулдаггүй бол (`ui.tsx`-ийн `Select` нь энгийн функц) — React 19-д `ref` энгийн prop тул `function Select({ className, ...p })` дотор `...p`-оор `<select>`-д очно; `ref` төрлийг `SelectHTMLAttributes` агуулахгүй бол `ui.tsx`-ийн `Select`-ийн prop төрлийг `SelectHTMLAttributes<HTMLSelectElement> & { ref?: React.Ref<HTMLSelectElement> }` болгоно.

- [ ] **Step 2: CurriculumPanel**

`frontend/src/components/admin/timetable/CurriculumPanel.tsx`:

```tsx
"use client";

/* Хөтөлбөрийн шалгалт (client дээр шууд тооцно): хичээл бүр хуваарьт орсон / төлөвлөсөн цаг.
   Тэнцүү ногоон, дутуу шар, илүү (эсвэл хөтөлбөрт байхгүй) улаан. */

import Link from "next/link";
import type { CurriculumEntry, GridCell, Subject } from "@/lib/types";

export function CurriculumPanel({ curriculum, cells, subjects }: { curriculum: CurriculumEntry[]; cells: Record<string, GridCell>; subjects: Subject[] }) {
  const counts = new Map<number, number>();
  for (const c of Object.values(cells)) counts.set(c.subject_id, (counts.get(c.subject_id) ?? 0) + 1);
  const planned = new Map(curriculum.map((e) => [e.subject_id, e.hours_per_week]));
  const rows = [...new Set([...planned.keys(), ...counts.keys()])]
    .map((id) => ({ id, name: subjects.find((s) => s.id === id)?.name ?? "?", planned: planned.get(id) ?? 0, scheduled: counts.get(id) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const tone = (r: { planned: number; scheduled: number }) =>
    r.scheduled === r.planned ? "text-emerald-700" : r.scheduled < r.planned ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700";
  const total = rows.reduce((a, r) => ({ planned: a.planned + r.planned, scheduled: a.scheduled + r.scheduled }), { planned: 0, scheduled: 0 });

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-4 lg:w-64">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Хөтөлбөрийн шалгалт</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Хөтөлбөр оруулаагүй. <Link href="/admin/timetable/curriculum" className="font-semibold text-navy hover:underline">Оруулах →</Link></p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((r) => (
            <li key={r.id} className={`flex justify-between rounded px-2 py-1 ${tone(r)}`}>
              <span>{r.name}</span><span className="tabular-nums font-semibold">{r.scheduled}/{r.planned}</span>
            </li>
          ))}
          <li className="flex justify-between border-t border-slate-200 px-2 pt-2 font-semibold text-slate-700"><span>Нийт</span><span className="tabular-nums">{total.scheduled}/{total.planned}</span></li>
        </ul>
      )}
    </aside>
  );
}
```

- [ ] **Step 3: GridEditor**

`frontend/src/components/admin/timetable/GridEditor.tsx`:

```tsx
"use client";

/* Өдөр × цаг хүснэгт. Нүд дээр дарахад (эсвэл Tab-аар очоод Enter) popover нээгдэнэ; өөрчлөлт client дээр
   хадгалагдаж "Хадгалах" дарахад PUT classes/{id}/grid/ (бүхэлд нь солино). Backend давхардал буцаавал
   тухайн нүднүүд улаан хүрээтэй, title-д тайлбартай. Хадгалаагүй үед хуудас хаахад анхааруулна. */

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ClassGroup, Conflict, CurriculumEntry, GridCell, Lesson, PeriodSet, Room, Subject, Teacher } from "@/lib/types";
import { Badge, Button } from "@/components/ui";
import { WEEKDAY_NAMES, hm } from "@/components/timetable/format";
import { CellPopover, type CellSelection } from "./CellPopover";
import { CurriculumPanel } from "./CurriculumPanel";

const keyOf = (weekday: number, periodId: number) => `${weekday}-${periodId}`;

interface Props {
  classGroup: ClassGroup; periodSet: PeriodSet; workingDays: number;
  subjects: Subject[]; teachers: Teacher[]; rooms: Room[]; curriculum: CurriculumEntry[];
  initialLessons: Lesson[]; onDirtyChange: (dirty: boolean) => void;
}

export function GridEditor({ classGroup, periodSet, workingDays, subjects, teachers, rooms, curriculum, initialLessons, onDirtyChange }: Props) {
  const [cells, setCells] = useState<Record<string, GridCell>>(() => Object.fromEntries(
    initialLessons.map((l) => [keyOf(l.weekday, l.period.id),
      { weekday: l.weekday, period_id: l.period.id, subject_id: l.subject.id, teacher_id: l.teacher.id, room_id: l.room?.id ?? null }])));
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const teacherById = new Map(teachers.map((t) => [t.id, t]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const days = Array.from({ length: workingDays }, (_, i) => i + 1);
  const conflictsAt = (k: string) => conflicts.filter((c) => keyOf(c.weekday, c.period_id) === k);
  const conflictText = (c: Conflict) => `${c.kind === "teacher" ? "Багш" : "Өрөө"} ${c.who} — ${c.with_class} ангитай давхцаж байна`;

  function change(weekday: number, periodId: number, sel: CellSelection | null) {
    const k = keyOf(weekday, periodId);
    setCells((prev) => {
      const next = { ...prev };
      if (sel) next[k] = { weekday, period_id: periodId, ...sel };
      else delete next[k];
      return next;
    });
    setConflicts((prev) => prev.filter((c) => keyOf(c.weekday, c.period_id) !== k));
    setDirty(true); onDirtyChange(true);
    setOpen(null);
  }

  async function save() {
    setBusy(true); setError(""); setConflicts([]);
    try {
      await api.timetable.grid.save(classGroup.id, Object.values(cells));
      setDirty(false); onDirtyChange(false);
      setSavedAt(new Date().toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === "object" && "conflicts" in err.data) {
        const list = (err.data as { conflicts: Conflict[] }).conflicts;
        setConflicts(list);
        setError(`${list.length} давхардал байна — улаан нүднүүдийг засаад дахин хадгална уу. Юу ч хадгалагдаагүй.`);
      } else {
        setError(err instanceof ApiError ? Object.values(err.fieldErrors).join(" ") : "Хадгалж чадсангүй.");
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-black text-navy">{classGroup.name} анги</h2>
        <span className="text-sm text-slate-500">{periodSet.name}</span>
        {dirty && <Badge tone="gold">Хадгалаагүй өөрчлөлт</Badge>}
        {!dirty && savedAt && <span className="text-sm text-emerald-700">Хадгалсан {savedAt}</span>}
        <Button className="ml-auto" onClick={save} disabled={!dirty || busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-24 border-b border-r border-slate-200 bg-slate-50 p-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Цаг</th>
                {days.map((d) => <th key={d} className="border-b border-slate-200 bg-slate-50 p-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{WEEKDAY_NAMES[d]}</th>)}
              </tr>
            </thead>
            <tbody>
              {periodSet.periods.map((p) => p.is_break ? (
                <tr key={p.id} className="bg-slate-100">
                  <td colSpan={days.length + 1} className="border-b border-slate-200 px-2 py-1 text-xs text-slate-500">Завсарлага {hm(p.start_time)}–{hm(p.end_time)}</td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <td className="border-b border-r border-slate-200 p-2 align-top">
                    <div className="font-bold text-navy">{p.order}</div>
                    <div className="text-xs text-slate-500">{hm(p.start_time)}–{hm(p.end_time)}</div>
                  </td>
                  {days.map((d) => {
                    const k = keyOf(d, p.id);
                    const c = cells[k];
                    const cf = conflictsAt(k);
                    const subject = c ? subjectById.get(c.subject_id) : undefined;
                    return (
                      <td key={d} className="relative border-b border-slate-200 p-0 align-top">
                        <button type="button" onClick={() => setOpen(open === k ? null : k)} title={cf.map(conflictText).join("\n")}
                                aria-label={`${WEEKDAY_NAMES[d]}, ${p.order}-р цаг`}
                                className={`block min-h-16 w-full px-2 py-1.5 text-left hover:bg-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy ${cf.length ? "bg-red-50 ring-2 ring-inset ring-red-500" : ""}`}>
                          {c ? (
                            <>
                              <span className="block border-l-[3px] pl-1.5 font-semibold text-ink" style={{ borderColor: subject?.color ?? "#1e3a8f" }}>{subject?.name ?? "?"}</span>
                              <span className="block pl-[9px] text-xs text-slate-600">
                                {teacherById.get(c.teacher_id)?.short_name ?? "?"}{c.room_id ? ` · ${roomById.get(c.room_id)?.name ?? "?"}` : ""}
                              </span>
                              {cf.length > 0 && <span className="block pl-[9px] text-xs font-semibold text-red-700">{cf.map(conflictText).join("; ")}</span>}
                            </>
                          ) : <span className="text-slate-300">+</span>}
                        </button>
                        {open === k && (
                          <CellPopover value={c ?? null} subjects={subjects} teachers={teachers} rooms={rooms} align={d === days[days.length - 1] ? "right" : "left"}
                                       onChange={(sel) => change(d, p.id, sel)} onClose={() => setOpen(null)} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CurriculumPanel curriculum={curriculum} cells={cells} subjects={subjects} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Хуудас**

`frontend/src/app/admin/(dashboard)/timetable/grid/page.tsx`:

```tsx
"use client";

/* Хуваарь засах: жил → анги сонгоод GridEditor. Анги солиход хадгалаагүй өөрчлөлт байвал баталгаажуулна. */

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Empty, Select, Spinner } from "@/components/ui";
import { useYear } from "@/components/timetable/useYear";
import { YearSelect } from "@/components/timetable/YearSelect";
import { GridEditor } from "@/components/admin/timetable/GridEditor";

export default function GridPage() {
  const { years, year, yearId, setYearId, loading } = useYear();
  const classesQ = useFetch(() => (yearId ? api.timetable.classes.list(yearId) : null), [yearId]);
  const setsQ = useFetch(() => (yearId ? api.timetable.periodSets.list(yearId) : null), [yearId]);
  const subjectsQ = useFetch(() => api.timetable.subjects.list(), []);
  const teachersQ = useFetch(() => api.timetable.teachers.list(true), []);
  const roomsQ = useFetch(() => api.timetable.rooms.list(), []);
  const [classId, setClassId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const onDirtyChange = useCallback((d: boolean) => setDirty(d), []);

  const cls = classesQ.data?.find((c) => c.id === classId) ?? classesQ.data?.[0] ?? null;
  const lessonsQ = useFetch(() => (cls ? api.timetable.lessons.list({ year: cls.year_id, class: cls.id }) : null), [cls?.id]);
  const currQ = useFetch(() => (cls ? api.timetable.curriculum.list(cls.id) : null), [cls?.id]);
  const periodSet = setsQ.data?.find((s) => s.id === cls?.period_set_id);

  function pick(id: number) {
    if (dirty && !confirm("Хадгалаагүй өөрчлөлт байна. Хаяад өөр анги руу шилжих үү?")) return;
    setDirty(false);
    setClassId(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Хуваарь</h1>
          <p className="text-sm text-slate-600">Нүд дээр дарж хичээл, багш, өрөө сонгоно. Tab — нүд хооронд, Enter — нээх, Esc — хаах.</p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelect years={years} value={yearId} onChange={(id) => { if (!dirty || confirm("Хадгалаагүй өөрчлөлт байна. Жил солих уу?")) { setDirty(false); setClassId(null); setYearId(id); } }} />
          <Select value={cls?.id ?? ""} onChange={(e) => pick(Number(e.target.value))} className="w-auto" aria-label="Анги">
            {classesQ.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </div>
      {loading || classesQ.loading ? <Spinner /> : !classesQ.data?.length ? (
        <Empty>Энэ жилд анги байхгүй. "Тохиргоо → Ангиуд" хэсэгт нэмнэ үү.</Empty>
      ) : cls && periodSet && year && lessonsQ.data && currQ.data && subjectsQ.data && teachersQ.data && roomsQ.data ? (
        <GridEditor key={cls.id} classGroup={cls} periodSet={periodSet} workingDays={year.working_days}
                    subjects={subjectsQ.data} teachers={teachersQ.data} rooms={roomsQ.data} curriculum={currQ.data}
                    initialLessons={lessonsQ.data} onDirtyChange={onDirtyChange} />
      ) : <Spinner />}
    </div>
  );
}
```

- [ ] **Step 5: Шалгах**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json && node node_modules/eslint/bin/eslint.js src/components/admin/timetable "src/app/admin/(dashboard)/timetable"`
Expected: цэвэр.

Browser `/admin/timetable/grid` (seed-тэй):
1. 9а сонгогдоно (эхнийх); 5 багана, 13 мөр (6 завсарлага саарал), нүднүүд seed-ийн хичээлтэй; баруун талд "Хөтөлбөрийн шалгалт" бүх мөр ногоон, Нийт 20/20.
2. Мягмар 1-р цаг дээр дарж хичээлийг Физик, багшийг Ц.Болд болгоно → "Хадгалаагүй өөрчлөлт" badge; панельд Англи хэл 2/3 шар, Физик 3/2 улаан.
3. Хадгалах → badge алга, "Хадгалсан HH:MM". Хуудас дахин ачаалахад өөрчлөлт хадгалагдсан.
4. Давхардал (өөр цагийн хүснэгт, цаг давхцана): 1а сонгоод Даваа 2-р цаг (09:15–09:50) дээр Монгол хэл / Д.Сараа сонгоно — 9а-ийн Даваа 2-р цаг (08:50–09:30) Д.Сараа тул давхцана. Хадгалах → алдааны мөр "1 давхардал…", нүд улаан, дотор нь "Багш Д.Сараа — 9а ангитай давхцаж байна". Нүдийг буцааж Математик / С.Наран болгох → улаан арилна → хадгалах OK.
5. Өөрчлөлттэй үед анги солих → confirm гарна.
Screenshot (давхардалтай төлөв).

---
### Task 12: Хөтөлбөр, календарь, Excel импортын админ хуудас

**Files:**
- Create: `frontend/src/app/admin/(dashboard)/timetable/curriculum/page.tsx`, `frontend/src/app/admin/(dashboard)/timetable/calendar/page.tsx`, `frontend/src/app/admin/(dashboard)/timetable/import/page.tsx`

**Interfaces:**
- Consumes: `api.timetable.{classes, subjects, curriculum, calendar, lessons.importExcel}`, `useYear`, `forms.tsx`, `format.ts`.

- [ ] **Step 1: Хөтөлбөр**

`frontend/src/app/admin/(dashboard)/timetable/curriculum/page.tsx`:

```tsx
"use client";

/* Хөтөлбөр: анги сонгоод хичээл бүрийн долоо хоногийн цаг. Хажууд хуваарьт орсон тоо (curriculum-check). */

import { useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Badge, Button, Empty, Field, Input, Modal, Select, Spinner, Table, Td, Th } from "@/components/ui";
import { useYear } from "@/components/timetable/useYear";
import { YearSelect } from "@/components/timetable/YearSelect";
import { confirmRemove, FormError, useModalForm } from "@/components/admin/timetable/forms";

interface EntryForm { subject_id: number; hours_per_week: number }

export default function CurriculumPage() {
  const { years, yearId, setYearId, loading } = useYear();
  const classesQ = useFetch(() => (yearId ? api.timetable.classes.list(yearId) : null), [yearId]);
  const subjectsQ = useFetch(() => api.timetable.subjects.list(), []);
  const [classId, setClassId] = useState<number | null>(null);
  const cls = classesQ.data?.find((c) => c.id === classId) ?? classesQ.data?.[0] ?? null;
  const entriesQ = useFetch(() => (cls ? api.timetable.curriculum.list(cls.id) : null), [cls?.id]);
  const checkQ = useFetch(() => (cls ? api.timetable.classes.curriculumCheck(cls.id) : null), [cls?.id]);
  const form = useModalForm<EntryForm>();

  const reload = () => { entriesQ.reload(); checkQ.reload(); };
  const save = () => cls && form.submit((id, d) => (id
    ? api.timetable.curriculum.update(id, { hours_per_week: d.hours_per_week })
    : api.timetable.curriculum.create({ class_group_id: cls.id, subject_id: d.subject_id, hours_per_week: d.hours_per_week })), reload);
  const scheduled = (subjectId: number) => checkQ.data?.find((c) => c.subject.id === subjectId)?.scheduled ?? 0;
  const unplanned = checkQ.data?.filter((c) => c.planned === 0) ?? [];
  const available = subjectsQ.data?.filter((s) => !entriesQ.data?.some((e) => e.subject_id === s.id)) ?? [];
  const status = (planned: number, sch: number) =>
    sch === planned ? <Badge tone="green">Таарна</Badge> : sch < planned ? <Badge tone="gold">Дутуу {planned - sch}</Badge> : <Badge tone="slate">Илүү {sch - planned}</Badge>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Сургалтын хөтөлбөр</h1>
          <p className="text-sm text-slate-600">Анги бүрт хичээл бүр долоо хоногт хэдэн цаг байхыг заана; хуваарь үүнтэй харьцуулагдана.</p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelect years={years} value={yearId} onChange={(id) => { setClassId(null); setYearId(id); }} />
          <Select value={cls?.id ?? ""} onChange={(e) => setClassId(Number(e.target.value))} className="w-auto" aria-label="Анги">
            {classesQ.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Button disabled={!cls || available.length === 0} onClick={() => form.open({ subject_id: available[0]?.id ?? 0, hours_per_week: 1 })}>+ Хичээл</Button>
        </div>
      </div>

      {loading || classesQ.loading ? <Spinner /> : !cls ? <Empty>Энэ жилд анги байхгүй.</Empty> : entriesQ.loading ? <Spinner /> : !entriesQ.data?.length ? (
        <Empty>{cls.name} ангид хөтөлбөр оруулаагүй байна.</Empty>
      ) : (
        <Table head={<><Th>Хичээл</Th><Th>Долоо хоногт</Th><Th>Хуваарьт</Th><Th>Төлөв</Th><Th className="text-right">Үйлдэл</Th></>}>
          {entriesQ.data.map((e) => (
            <tr key={e.id}>
              <Td className="font-semibold"><span className="mr-2 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: e.subject.color }} />{e.subject.name}</Td>
              <Td className="tabular-nums">{e.hours_per_week}</Td>
              <Td className="tabular-nums">{scheduled(e.subject_id)}</Td>
              <Td>{status(e.hours_per_week, scheduled(e.subject_id))}</Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => form.open({ subject_id: e.subject_id, hours_per_week: e.hours_per_week }, e.id)}>Засах</Button>
                <Button variant="danger" onClick={() => confirmRemove(`${e.subject.name}-ийг хөтөлбөрөөс хасах уу?`, () => api.timetable.curriculum.remove(e.id), reload)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      {unplanned.length > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Хөтөлбөрт байхгүй ч хуваарьт орсон: {unplanned.map((c) => `${c.subject.name} (${c.scheduled} цаг)`).join(", ")}
        </p>
      )}

      <Modal open={!!form.editing} title={form.editing?.id ? "Цаг засах" : "Хичээл нэмэх"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="curriculum-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (
          <form id="curriculum-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <Field label="Хичээл" error={form.errors.subject_id}>
              {form.editing.id ? (
                <Input value={subjectsQ.data?.find((s) => s.id === form.editing?.data.subject_id)?.name ?? ""} disabled />
              ) : (
                <Select value={form.editing.data.subject_id} onChange={(e) => form.set({ subject_id: Number(e.target.value) })}>
                  {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Долоо хоногт хэдэн цаг" error={form.errors.hours_per_week}>
              <Input type="number" min={1} max={20} value={form.editing.data.hours_per_week} onChange={(e) => form.set({ hours_per_week: Number(e.target.value) })} required />
            </Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Календарь (админ)**

`frontend/src/app/admin/(dashboard)/timetable/calendar/page.tsx`:

```tsx
"use client";

/* Академик календарь: жилийн үйл явдлууд огноогоор (улирал, амралт, шалгалт, үйл явдал). */

import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AppliesTo, CalendarEventInput, EventCategory } from "@/lib/types";
import { Badge, Button, Empty, Field, Input, Modal, Select, Spinner, Table, Td, Textarea, Th } from "@/components/ui";
import { APPLIES_TO, EVENT_CATEGORIES } from "@/components/timetable/format";
import { useYear } from "@/components/timetable/useYear";
import { YearSelect } from "@/components/timetable/YearSelect";
import { confirmRemove, FormError, useModalForm } from "@/components/admin/timetable/forms";

const TONE: Record<EventCategory, "navy" | "green" | "gold" | "slate"> = { term: "navy", holiday: "green", exam: "gold", event: "gold", other: "slate" };

export default function CalendarAdminPage() {
  const { years, year, yearId, setYearId, loading } = useYear();
  const q = useFetch(() => (yearId ? api.timetable.calendar.list(yearId) : null), [yearId]);
  const form = useModalForm<CalendarEventInput>();
  const save = () => form.submit((id, d) => (id
    ? api.timetable.calendar.update(id, { title: d.title, category: d.category, start_date: d.start_date, end_date: d.end_date, description: d.description, applies_to: d.applies_to })
    : api.timetable.calendar.create(d)), q.reload);
  const dates = (s: string, e: string) => (s === e ? s : `${s} — ${e}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Академик календарь</h1>
          <p className="text-sm text-slate-600">Улирал, амралт, шалгалт, үйл явдлууд. Олон нийтийн /calendar хуудсанд харагдана.</p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelect years={years} value={yearId} onChange={setYearId} />
          <Button disabled={!year} onClick={() => year && form.open({ year_id: year.id, title: "", category: "event", start_date: year.start_date, end_date: year.start_date, description: "", applies_to: "all" })}>+ Үйл явдал</Button>
        </div>
      </div>
      {loading || q.loading ? <Spinner /> : !yearId ? <Empty>Хичээлийн жил байхгүй.</Empty> : !q.data?.length ? <Empty>Үйл явдал байхгүй.</Empty> : (
        <Table head={<><Th>Огноо</Th><Th>Гарчиг</Th><Th>Ангилал</Th><Th>Хэнд</Th><Th className="text-right">Үйлдэл</Th></>}>
          {q.data.map((e) => (
            <tr key={e.id}>
              <Td className="whitespace-nowrap tabular-nums">{dates(e.start_date, e.end_date)}</Td>
              <Td><div className="font-semibold">{e.title}</div>{e.description && <div className="text-xs text-slate-500">{e.description}</div>}</Td>
              <Td><Badge tone={TONE[e.category]}>{EVENT_CATEGORIES[e.category]}</Badge></Td>
              <Td>{APPLIES_TO[e.applies_to]}</Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => form.open({ year_id: e.year_id, title: e.title, category: e.category, start_date: e.start_date, end_date: e.end_date, description: e.description, applies_to: e.applies_to }, e.id)}>Засах</Button>
                <Button variant="danger" onClick={() => confirmRemove(`"${e.title}"-г устгах уу?`, () => api.timetable.calendar.remove(e.id), q.reload)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!form.editing} title={form.editing?.id ? "Үйл явдал засах" : "Үйл явдал нэмэх"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="event-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (
          <form id="event-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <Field label="Гарчиг" error={form.errors.title}><Input value={form.editing.data.title} onChange={(e) => form.set({ title: e.target.value })} required /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ангилал" error={form.errors.category}>
                <Select value={form.editing.data.category} onChange={(e) => form.set({ category: e.target.value as EventCategory })}>
                  {(Object.keys(EVENT_CATEGORIES) as EventCategory[]).map((k) => <option key={k} value={k}>{EVENT_CATEGORIES[k]}</option>)}
                </Select>
              </Field>
              <Field label="Хэнд хамаарах" error={form.errors.applies_to}>
                <Select value={form.editing.data.applies_to} onChange={(e) => form.set({ applies_to: e.target.value as AppliesTo })}>
                  {(Object.keys(APPLIES_TO) as AppliesTo[]).map((k) => <option key={k} value={k}>{APPLIES_TO[k]}</option>)}
                </Select>
              </Field>
              <Field label="Эхлэх" error={form.errors.start_date}><Input type="date" value={form.editing.data.start_date} onChange={(e) => form.set({ start_date: e.target.value })} required /></Field>
              <Field label="Дуусах" error={form.errors.end_date}><Input type="date" value={form.editing.data.end_date} onChange={(e) => form.set({ end_date: e.target.value })} required /></Field>
            </div>
            <Field label="Тайлбар" error={form.errors.description}><Textarea value={form.editing.data.description} onChange={(e) => form.set({ description: e.target.value })} /></Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Excel импорт**

`frontend/src/app/admin/(dashboard)/timetable/import/page.tsx`:

```tsx
"use client";

/* Хуваарийг Excel-ээс оруулах: 1. Шалгах (dry run) → тайлан, 2. Импортлох. Алдаатай sheet байвал юу ч бичигдэхгүй. */

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { TimetableImportResponse } from "@/lib/types";
import { Badge, Button, Card, Field } from "@/components/ui";
import { WEEKDAY_NAMES } from "@/components/timetable/format";
import { useYear } from "@/components/timetable/useYear";
import { YearSelect } from "@/components/timetable/YearSelect";

export default function TimetableImportPage() {
  const { years, yearId, setYearId } = useYear();
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(true);
  const [preview, setPreview] = useState<TimetableImportResponse | null>(null);
  const [done, setDone] = useState<TimetableImportResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"check" | "import" | null>(null);

  async function run(dryRun: boolean) {
    if (!file || !yearId) return;
    setBusy(dryRun ? "check" : "import"); setError("");
    try {
      const res = await api.timetable.lessons.importExcel(file, yearId, dryRun, replace);
      if (dryRun) { setPreview(res); setDone(null); }
      else { setDone(res); setPreview(null); }
    } catch (err) {
      const fe = err instanceof ApiError ? err.fieldErrors : {};
      setError(fe.file || fe.year || fe.detail || "Импорт амжилтгүй боллоо.");
    } finally { setBusy(null); }
  }

  const report = done ?? preview;
  const hasErrors = !!report && report.sheets.some((s) => s.warnings.length || s.conflicts.length);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Хуваарийг Excel-ээс оруулах</h1>
        <p className="text-sm text-slate-600">
          Sheet бүр нэг анги (нэр нь <code>9а</code>). Толгой мөр <b>Цаг | Даваа | Мягмар | Лхагва | Пүрэв | Баасан</b> (+ Бямба),
          эхний багана цагийн дугаар, нүдэнд <b>Математик / Б.Мухулай / 204</b> (өрөө сонголттой). Хичээлийг нэр эсвэл товч нэрээр, багшийг товч нэрээр таньна.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Хичээлийн жил"><YearSelect years={years} value={yearId} onChange={setYearId} className="w-full" /></Field>
          <Field label="Excel файл (.xlsx)">
            <input type="file" accept=".xlsx,.xlsm,.xls"
                   onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setDone(null); setError(""); }}
                   className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy/90" />
          </Field>
        </div>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="mt-0.5 h-4 w-4 accent-navy" />
          <span>Файлд байгаа ангиудын <b>хуучин хуваарийг бүхэлд нь солино</b><span className="block text-xs text-slate-500">Унтраавал файлын нүднүүд л солигдож, бусад нүд хэвээр үлдэнэ.</span></span>
        </label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => run(true)} disabled={!file || !yearId || !!busy}>{busy === "check" ? "Шалгаж байна…" : "1. Шалгах"}</Button>
          <Button onClick={() => run(false)} disabled={!file || !preview || hasErrors || !!busy}>{busy === "import" ? "Импортлож байна…" : "2. Импортлох"}</Button>
        </div>
        {!preview && !done && <p className="text-xs text-slate-500">Эхлээд "Шалгах" дарж тайланг үзсэний дараа "Импортлох" идэвхжинэ (алдаагүй бол).</p>}
      </Card>

      {report && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-bold text-navy">{done ? (done.imported ? "Импорт амжилттай" : "Импортлоогүй — алдаа байна") : "Шалгалтын тайлан"}</h2>
            <Badge tone="gold">Нийт {report.total} нүд</Badge>
            {done?.imported && <Badge tone="green">Бичсэн {done.created}, устгасан {done.deleted}</Badge>}
            {hasErrors && <Badge tone="slate">Алдаатай тул юу ч бичигдэхгүй</Badge>}
          </div>
          <div className="space-y-3">
            {report.sheets.map((s) => (
              <div key={s.sheet} className={`rounded-xl border p-3 ${s.warnings.length || s.conflicts.length ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{s.sheet}</span>
                  {s.class_name ? <Badge tone="navy">{s.class_name}</Badge> : <Badge tone="slate">анги олдсонгүй</Badge>}
                  <span className="text-slate-600">{s.count} нүд</span>
                </div>
                {s.warnings.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-red-700">{s.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
                {s.conflicts.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
                    {s.conflicts.map((c, i) => <li key={i}>{WEEKDAY_NAMES[c.weekday]}, {c.period_order}-р цаг: {c.kind === "teacher" ? "багш" : "өрөө"} {c.who} — {c.with_class} ангитай давхцаж байна</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Шалгах**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json && node node_modules/eslint/bin/eslint.js "src/app/admin/(dashboard)/timetable"`
Expected: цэвэр.

Browser:
- `/admin/timetable/curriculum`: 9а → 8 мөр бүгд "Таарна"; 1а → "хөтөлбөр оруулаагүй" + шар мөр "Хөтөлбөрт байхгүй ч хуваарьт орсон: Англи хэл (5 цаг), Математик (5 цаг), Монгол хэл (5 цаг)"; "+ Хичээл" → Математик 5 → мөр нэмэгдэж "Таарна".
- `/admin/timetable/calendar`: seed-ийн 8 үйл явдал огноогоор; нэмэх/засах/устгах; дуусах < эхлэх → `end_date` алдаа.
- `/admin/timetable/import`: Excel файл бэлдэх — `backend/tests/test_timetable_import.py`-ийн `GOOD` бүтцээр `uv run python -c` ашиглан `openpyxl`-ээр `$TMP/huvaari.xlsx` үүсгэнэ (9а sheet: 1-р мөр Даваа `Математик / Б.Мухулай / 204`; 1а sheet: Даваа 2-р цаг `Монгол хэл / Д.Сараа / 101` — 9а-тай давхцана). "Шалгах" → 1а sheet улаан, давхардлын мөр "Даваа, 2-р цаг: багш Д.Сараа — 9а ангитай давхцаж байна", "Импортлох" идэвхгүй. Файлыг засаад (1а-ийн багшийг С.Наран) → шалгах ногоон → импортлох → "Импорт амжилттай". Screenshot.

---

### Task 13: Олон нийтийн `/timetable` хуудас

**Files:**
- Create: `frontend/src/app/timetable/page.tsx`, `frontend/src/components/timetable/TimetableView.tsx`, `frontend/src/components/timetable/TimetableGrid.tsx`
- Modify: `frontend/src/lib/home-data.ts`, `frontend/src/components/home/SiteHeader.tsx`, `frontend/src/components/home/SiteFooter.tsx`

**Interfaces:**
- Produces: `<TimetableGrid lessons periods? workingDays mode />` (`mode: "class" | "teacher" | "room"`), `<TimetableView />`; нүүрийн цэсэнд "Хуваарь", "Календарь".

- [ ] **Step 1: TimetableGrid (унших)**

`frontend/src/components/timetable/TimetableGrid.tsx`:

```tsx
/* Унших хуваарийн хүснэгт (олон нийт). Мөр = цаг, багана = өдөр. Ангийн харагдацад periods өгөгдөнө (завсарлага саарал мөр);
   багш/өрөөний харагдацад мөрүүд хичээлүүдийн (эхлэх, дуусах) цагаас үүснэ. Нүдний 2-р мөр mode-оос хамаарна:
   class → багш · өрөө, teacher → анги · өрөө, room → анги · багш. Утсан дээр (md-ээс доош) өдөр бүр босоо блок. */

import type { Lesson, Period } from "@/lib/types";
import { WEEKDAY_NAMES, hm } from "./format";

export type ViewMode = "class" | "teacher" | "room";

interface Row { key: string; label: string; start: string; end: string; isBreak: boolean; periodIds: Set<number> }

export function buildRows(lessons: Lesson[], periods?: Period[]): Row[] {
  if (periods) {
    return periods.map((p) => ({ key: String(p.id), label: p.is_break ? "Завсарлага" : String(p.order), start: p.start_time, end: p.end_time, isBreak: p.is_break, periodIds: new Set([p.id]) }));
  }
  const map = new Map<string, Row>();
  for (const l of lessons) {
    const k = `${l.period.start_time}-${l.period.end_time}`;
    const r = map.get(k) ?? { key: k, label: "", start: l.period.start_time, end: l.period.end_time, isBreak: false, periodIds: new Set<number>() };
    r.periodIds.add(l.period.id);
    map.set(k, r);
  }
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
}

function secondLine(l: Lesson, mode: ViewMode): string {
  const parts = mode === "class" ? [l.teacher.short_name, l.room?.name] : mode === "teacher" ? [l.class_group.name, l.room?.name] : [l.class_group.name, l.teacher.short_name];
  return parts.filter(Boolean).join(" · ");
}

function LessonCell({ l, mode }: { l: Lesson; mode: ViewMode }) {
  return (
    <div className="border-l-[3px] pl-2" style={{ borderColor: l.subject.color }}>
      <div className="font-semibold text-ink">{l.subject.name}</div>
      <div className="text-[13px] text-muted">{secondLine(l, mode)}</div>
    </div>
  );
}

export function TimetableGrid({ lessons, periods, workingDays, mode }: { lessons: Lesson[]; periods?: Period[]; workingDays: number; mode: ViewMode }) {
  const rows = buildRows(lessons, periods);
  const days = Array.from({ length: workingDays }, (_, i) => i + 1);
  const at = (d: number, r: Row) => lessons.filter((l) => l.weekday === d && r.periodIds.has(l.period.id));

  if (lessons.length === 0) return <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">Хуваарь оруулаагүй байна.</p>;

  return (
    <>
      {/* Ширээний хүснэгт */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-paper-2">
              <th scope="col" className="w-28 border-b border-r border-line px-3 py-2 text-left font-display text-base font-extrabold text-navy">Цаг</th>
              {days.map((d) => <th key={d} scope="col" className="border-b border-line px-3 py-2 text-left font-display text-base font-extrabold text-navy">{WEEKDAY_NAMES[d]}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => r.isBreak ? (
              <tr key={r.key} className="bg-paper-3">
                <td colSpan={days.length + 1} className="border-b border-line px-3 py-1 text-xs text-muted">Завсарлага {hm(r.start)}–{hm(r.end)}</td>
              </tr>
            ) : (
              <tr key={r.key}>
                <th scope="row" className="border-b border-r border-line px-3 py-2 text-left align-top">
                  {r.label && <div className="font-bold text-navy">{r.label}</div>}
                  <div className="text-xs font-normal text-muted tabular-nums">{hm(r.start)}–{hm(r.end)}</div>
                </th>
                {days.map((d) => (
                  <td key={d} className="border-b border-line px-3 py-2 align-top">
                    <div className="space-y-2">{at(d, r).map((l) => <LessonCell key={l.id} l={l} mode={mode} />)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Утас: өдөр бүр босоо блок */}
      <div className="space-y-6 md:hidden">
        {days.map((d) => {
          const items = rows.filter((r) => !r.isBreak).flatMap((r) => at(d, r).map((l) => ({ r, l })));
          return (
            <section key={d} aria-label={WEEKDAY_NAMES[d]}>
              <h3 className="mb-2 font-display text-lg font-extrabold text-navy">{WEEKDAY_NAMES[d]}</h3>
              {items.length === 0 ? <p className="text-sm text-muted">Хичээлгүй</p> : (
                <ul className="divide-y divide-line rounded-xl border border-line bg-white">
                  {items.map(({ r, l }) => (
                    <li key={l.id} className="flex gap-3 px-3 py-2">
                      <span className="w-24 shrink-0 text-xs text-muted tabular-nums">{hm(r.start)}–{hm(r.end)}</span>
                      <LessonCell l={l} mode={mode} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
```

- [ ] **Step 2: TimetableView**

`frontend/src/components/timetable/TimetableView.tsx`:

```tsx
"use client";

/* /timetable: Анги / Багш / Өрөө таб + сонголт → хуваарийн хүснэгт, ангийн харагдацад "PDF татах". */

import { useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { TimetableGrid, type ViewMode } from "./TimetableGrid";
import { useYear } from "./useYear";
import { YearSelect } from "./YearSelect";

const MODES: { key: ViewMode; label: string }[] = [{ key: "class", label: "Анги" }, { key: "teacher", label: "Багш" }, { key: "room", label: "Өрөө" }];
const selectCls = "rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30";

export function TimetableView() {
  const { years, year, yearId, setYearId, loading, error } = useYear();
  const [mode, setMode] = useState<ViewMode>("class");
  const [sel, setSel] = useState<Record<ViewMode, number | null>>({ class: null, teacher: null, room: null });
  const classesQ = useFetch(() => (yearId ? api.timetable.classes.list(yearId) : null), [yearId]);
  const setsQ = useFetch(() => (yearId ? api.timetable.periodSets.list(yearId) : null), [yearId]);
  const teachersQ = useFetch(() => api.timetable.teachers.list(true), []);
  const roomsQ = useFetch(() => api.timetable.rooms.list(), []);

  const options = mode === "class" ? classesQ.data?.map((c) => ({ id: c.id, label: c.name })) : mode === "teacher" ? teachersQ.data?.map((t) => ({ id: t.id, label: t.short_name })) : roomsQ.data?.map((r) => ({ id: r.id, label: r.name }));
  const id = (sel[mode] !== null && options?.some((o) => o.id === sel[mode]) ? sel[mode] : options?.[0]?.id) ?? null;
  const lessonsQ = useFetch(() => (yearId && id ? api.timetable.lessons.list({ year: yearId, [mode]: id } as { year: number; class?: number; teacher?: number; room?: number }) : null), [yearId, mode, id]);
  const cls = mode === "class" ? classesQ.data?.find((c) => c.id === id) : undefined;
  const periods = cls ? setsQ.data?.find((s) => s.id === cls.period_set_id)?.periods : undefined;

  if (loading) return <p className="text-muted">Ачаалж байна…</p>;
  if (error || !year) return <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">Хуваарь одоогоор бэлэн болоогүй байна.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Харагдац" className="flex rounded-lg border border-line bg-white p-1">
          {MODES.map((m) => (
            <button key={m.key} role="tab" aria-selected={mode === m.key} onClick={() => setMode(m.key)}
                    className={`rounded-md px-4 py-1.5 text-sm font-semibold ${mode === m.key ? "bg-navy text-white" : "text-ink hover:bg-navy/10"}`}>{m.label}</button>
          ))}
        </div>
        <select value={id ?? ""} onChange={(e) => setSel({ ...sel, [mode]: Number(e.target.value) })} className={selectCls} aria-label={MODES.find((m) => m.key === mode)?.label}>
          {options?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        {years.length > 1 && <YearSelect years={years} value={yearId} onChange={setYearId} />}
        {cls && (
          <a href={api.timetable.classes.pdfUrl(cls.id)} target="_blank" rel="noopener"
             className="ml-auto inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep">
            PDF татах
          </a>
        )}
      </div>
      {lessonsQ.loading || !lessonsQ.data ? <p className="text-muted">Ачаалж байна…</p> : (
        <TimetableGrid lessons={lessonsQ.data} periods={periods} workingDays={year.working_days} mode={mode} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Хуудас ба цэс**

`frontend/src/app/timetable/page.tsx`:

```tsx
import type { Metadata } from "next";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { TimetableView } from "@/components/timetable/TimetableView";

export const metadata: Metadata = {
  title: "Хичээлийн хуваарь — Шинэ Үе сургууль",
  description: "Шинэ Үе сургуулийн ангиудын хичээлийн хуваарь: ангиар, багшаар, өрөөгөөр.",
};

export default function TimetablePage() {
  return (
    <>
      <SiteHeader />
      <main className="paper-grid flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 md:px-10 lg:px-24 lg:py-[72px]">
          <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Хичээлийн хуваарь</h1>
          <TimetableView />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
```

`frontend/src/lib/home-data.ts`-ийн `NAV_LINKS`:

```ts
export const NAV_LINKS = [
  { href: "/", label: "Нүүр" },
  { href: "/#news", label: "Мэдээ" },
  { href: "/#history", label: "Түүх" },
  { href: "/timetable", label: "Хуваарь" },
  { href: "/calendar", label: "Календарь" },
  { href: "/#location", label: "Хаяг, байршил" },
  { href: "/olympiad", label: "Ү.Маамын нэрэмжит олимпиад" },
];
```

`frontend/src/components/home/SiteFooter.tsx`-ийн холбоосын жагсаалтад `/timetable`-ийн дараа `{ href: "/calendar", label: "Академик календарь" }` нэмнэ.

`frontend/src/components/home/SiteHeader.tsx`: 7 холбоос 1024px-д багтахын тулд desktop nav-ийн классыг `hidden items-center gap-8 lg:flex` → `hidden items-center gap-5 lg:flex xl:gap-8`, холбоосын `text-base` → `text-[15px] xl:text-base` болгоно. `aria-current={i === 0 ? "page" : undefined}`-ийг `usePathname()`-аар зөв болгоно: `const path = usePathname();` (`next/navigation`) ба `aria-current={(l.href === "/" ? path === "/" : l.href.startsWith("/#") ? false : path.startsWith(l.href)) ? "page" : undefined}`.

- [ ] **Step 4: Шалгах**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json && node node_modules/eslint/bin/eslint.js src/components/timetable src/app/timetable src/lib/home-data.ts src/components/home/SiteHeader.tsx`
Expected: цэвэр.

Browser `/timetable`: Анги таб, 1а анхдагч (эхнийх), хүснэгт 5 багана, завсарлагын саарал мөр, нүдэнд хичээл (өнгөт зүүн зурвас), доор багш · өрөө; "PDF татах" шинэ таб-д PDF. Багш таб → Б.Мухулай → мөрүүд цагаар, нүдэнд анги · өрөө (9а-ийн 5 Математик). Өрөө таб → 204. `resize_window` mobile → өдөр бүр босоо блок, хэвтээ гүйлгэлтгүй; header-ийн hamburger цэсэнд "Хуваарь", "Календарь". 1024px өргөнд desktop цэс нэг мөрөнд багтана. Screenshot (desktop class view, mobile).

---

### Task 14: Олон нийтийн `/calendar` хуудас, README

**Files:**
- Create: `frontend/src/app/calendar/page.tsx`, `frontend/src/components/timetable/CalendarView.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `api.timetable.calendar.list`, `useYear`, `format.ts`.

- [ ] **Step 1: CalendarView**

`frontend/src/components/timetable/CalendarView.tsx`:

```tsx
"use client";

/* Академик календарь: жилийн сар бүр mini-календарь. Улирал цайвар хөх дэвсгэр, амралт ногоон, шалгалт улаан,
   үйл явдал шар, бусад саарал (давхцвал: шалгалт > амралт > үйл явдал > бусад > улирал). Дээр "Одоо: 1-р улирал, 5-р долоо хоног".
   Огноог "YYYY-MM-DD" текстээр харьцуулна (timezone-оос хамаарахгүй). */

import { useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AppliesTo, CalendarEvent, EventCategory } from "@/lib/types";
import { APPLIES_TO, EVENT_CATEGORIES } from "./format";
import { useYear } from "./useYear";
import { YearSelect } from "./YearSelect";

const MONTHS = ["1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар", "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар"];
const DOW = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];
const PRIORITY: EventCategory[] = ["exam", "holiday", "event", "other", "term"];
const BG: Record<EventCategory, string> = { term: "bg-navy/10", holiday: "bg-emerald-100", exam: "bg-red-100", event: "bg-gold/40", other: "bg-slate-200" };
const DOT: Record<EventCategory, string> = { term: "bg-navy", holiday: "bg-emerald-500", exam: "bg-red-500", event: "bg-gold", other: "bg-slate-400" };
const selectCls = "rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30";

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const todayIso = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth() + 1, t.getDate()); };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

function monthsBetween(start: string, end: string): { y: number; m: number }[] {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const out: { y: number; m: number }[] = [];
  for (let y = sy, m = sm; y < ey || (y === ey && m <= em); m === 12 ? (y++, m = 1) : m++) out.push({ y, m });
  return out;
}

function Month({ y, m, events, today }: { y: number; m: number; events: CalendarEvent[]; today: string }) {
  const first = iso(y, m, 1), last = iso(y, m, new Date(y, m, 0).getDate());
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Даваа = 0
  const n = new Date(y, m, 0).getDate();
  const inMonth = events.filter((e) => e.start_date <= last && e.end_date >= first);
  const on = (d: string) => inMonth.filter((e) => e.start_date <= d && d <= e.end_date);
  return (
    <section className="rounded-xl border border-line bg-white p-4" aria-label={`${y} оны ${MONTHS[m - 1]}`}>
      <h3 className="mb-2 font-display text-lg font-extrabold text-navy">{MONTHS[m - 1]} <span className="text-sm font-normal text-muted">{y}</span></h3>
      <div className="grid grid-cols-7 gap-px text-center text-xs">
        {DOW.map((d) => <div key={d} className="py-1 font-semibold text-muted">{d}</div>)}
        {Array.from({ length: offset }, (_, i) => <div key={`o${i}`} />)}
        {Array.from({ length: n }, (_, i) => {
          const d = iso(y, m, i + 1);
          const evs = on(d);
          const top = PRIORITY.find((c) => evs.some((e) => e.category === c));
          return (
            <div key={d} title={evs.map((e) => e.title).join(", ")}
                 className={`rounded py-1 tabular-nums ${top ? BG[top] : ""} ${d === today ? "font-extrabold ring-2 ring-navy" : ""}`}>{i + 1}</div>
          );
        })}
      </div>
      {inMonth.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {inMonth.map((e) => (
            <li key={e.id} className="flex items-start gap-2">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[e.category]}`} aria-hidden="true" />
              <span><span className="text-muted tabular-nums">{e.start_date === e.end_date ? e.start_date.slice(5) : `${e.start_date.slice(5)} – ${e.end_date.slice(5)}`}</span> {e.title}{e.applies_to !== "all" && <span className="text-muted"> · {APPLIES_TO[e.applies_to]}</span>}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CalendarView() {
  const { years, year, yearId, setYearId, loading, error } = useYear();
  const eventsQ = useFetch(() => (yearId ? api.timetable.calendar.list(yearId) : null), [yearId]);
  const [who, setWho] = useState<AppliesTo>("all");
  const today = todayIso();
  const events = (eventsQ.data ?? []).filter((e) => who === "all" || e.applies_to === "all" || e.applies_to === who);
  const term = events.find((e) => e.category === "term" && e.start_date <= today && today <= e.end_date);
  const week = term ? Math.floor(daysBetween(term.start_date, today) / 7) + 1 : null;

  if (loading) return <p className="text-muted">Ачаалж байна…</p>;
  if (error || !year) return <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">Календарь одоогоор бэлэн болоогүй байна.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
          {term ? `Одоо: ${term.title}, ${week}-р долоо хоног` : `${year.name} хичээлийн жил`}
        </p>
        <select value={who} onChange={(e) => setWho(e.target.value as AppliesTo)} className={selectCls} aria-label="Хэнд хамаарах">
          {(Object.keys(APPLIES_TO) as AppliesTo[]).map((k) => <option key={k} value={k}>{APPLIES_TO[k]}</option>)}
        </select>
        {years.length > 1 && <YearSelect years={years} value={yearId} onChange={setYearId} />}
        <ul className="ml-auto flex flex-wrap gap-3 text-xs text-muted">
          {(Object.keys(EVENT_CATEGORIES) as EventCategory[]).map((k) => <li key={k} className="flex items-center gap-1"><span className={`h-3 w-3 rounded ${BG[k]}`} />{EVENT_CATEGORIES[k]}</li>)}
        </ul>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {monthsBetween(year.start_date, year.end_date).map(({ y, m }) => <Month key={`${y}-${m}`} y={y} m={m} events={events} today={today} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Хуудас**

`frontend/src/app/calendar/page.tsx`:

```tsx
import type { Metadata } from "next";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { CalendarView } from "@/components/timetable/CalendarView";

export const metadata: Metadata = {
  title: "Академик календарь — Шинэ Үе сургууль",
  description: "Шинэ Үе сургуулийн хичээлийн жилийн улирал, амралт, шалгалт, үйл явдлын календарь.",
};

export default function CalendarPage() {
  return (
    <>
      <SiteHeader />
      <main className="paper-grid flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 md:px-10 lg:px-24 lg:py-[72px]">
          <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Академик календарь</h1>
          <CalendarView />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 3: README**

`README.md`-д "Мэдээ ба Facebook" хэсгийн дараа шинэ хэсэг:

```markdown
## Хичээлийн хуваарь

- Эрх: `manager` (Сургалтын менежер) эсвэл superuser бичнэ; унших нээлттэй. Хэрэглэгчид эрхийг `/admin/users`-ээс өгнө.
- Админ: `/admin/timetable` (тойм, жилүүд) → `setup` (цагийн хүснэгт, анги, хичээл, багш, өрөө) → `curriculum` (анги бүрийн долоо хоногийн цаг) → `grid` (өдөр × цаг засварлагч, давхардал улаанаар) → `calendar` → `import` (Excel).
- Олон нийт: `/timetable` (Анги / Багш / Өрөө, PDF татах), `/calendar` (сар бүр, "Одоо: 1-р улирал, N-р долоо хоног").
- Давхардлыг **цагаар** шалгана (`[start, end)` огтлолцол): бага ангийн 35 минутын цаг ба ахлах ангийн 40 минутын цаг давхцаж болно.
- Excel формат: sheet бүр нэг анги (нэр `9а`); толгой `Цаг | Даваа | Мягмар | Лхагва | Пүрэв | Баасан | [Бямба]`; эхний багана цагийн дугаар; нүд `Математик / Б.Мухулай / 204` (өрөө сонголттой). Алдаатай sheet байвал юу ч бичигдэхгүй.
- PDF: ReportLab + DejaVu Sans (`backend/fonts/`, Bitstream Vera лиценз). Фонт байхгүй бол `/timetable.pdf` 500 өгнө.
- Жишээ өгөгдөл: `cd backend && uv run python scripts/seed_timetable.py` (`--reset` дахин).
```

`## Backend` хэсгийн ажиллуулах алхмуудад `uv run alembic upgrade head` байгаа эсэхийг шалгаад, `scripts/seed_timetable.py`-г seed-ийн мөрөнд нэмнэ.

- [ ] **Step 4: Шалгах**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json && node node_modules/eslint/bin/eslint.js src/components/timetable src/app/calendar`
Expected: цэвэр.

Browser `/calendar`: 2026-09 … 2027-06 — 10 сар; 9-р сард 1–30 улирлын цайвар хөх; 11-р сард 7–15 ногоон (амралт); 2027-03-29…04-02 улаан (шалгалт, "Дунд анги" шүүлтэд харагдаж, "Бага анги"-д алга); 2027-02-20 шар; дээд мөрөнд "Одоо: …" (өнөөдөр 2026-09-21 → "1-р улирал, 3-р долоо хоног"); өнөөдрийн нүд хүрээтэй. Mobile → 1 багана. Screenshot.

- [ ] **Step 5: Эцсийн бүрэн шалгалт**

```bash
cd backend && uv run pytest --tb=short -q
```
Expected: 100 passed.

```bash
cd frontend && npx tsc --noEmit -p tsconfig.json && node node_modules/eslint/bin/eslint.js src
```
Expected: зөвхөн `results/import/page.tsx`-ийн 4 хуучин алдаа.

Нүүр хуудас `/` → header цэс 7 холбоос, `/timetable`, `/calendar` ажиллана; `/admin` → "Хичээлийн хуваарь" цэс (superuser ба manager-т, olympiad/news-д харагдахгүй — `/admin/users`-ээс зөвхөн `olympiad` эрхтэй хэрэглэгч үүсгэж нэвтэрч батална).

---

## Self-review тэмдэглэл (төлөвлөгөө бичигчийн)

- Spec §5 хүснэгт бүр Task 1-д; давхардлын дүрэм Task 5 (`conflicts.py`). §6 endpoint бүр: years/period-sets/periods T2, subjects/teachers/rooms T3, classes/curriculum/calendar T4, lessons/grid/curriculum-check/stats T5, import T6, pdf T7. §7 хуудас бүр: T9 тойм, T10 setup, T11 grid (popover, давхардал улаан, хөтөлбөрийн шалгалт, Tab/Enter/Esc, хадгалаагүй анхааруулга), T12 import/curriculum/calendar. §8: T13 `/timetable`, T14 `/calendar`, цэс/хөл (хөл: T13-д `SiteFooter`-т `/calendar` нэмнэ). §9 тестүүд: T2 (эрх 403), T5 (давхардал багш/өрөө/огтлолцсон цаг/өөр period set, transaction), T5 (curriculum-check), T6 (Excel), T7 (PDF 200 + `application/pdf`).
- Spec-ээс зөрсөн шийдвэрүүд: `router.py` → `router_setup.py` + `router_lessons.py` (файлын хэмжээ); `weekday`-ийн дээд хязгаар `working_days`; `replace=false` = нүд нэгтгэх; conflict-д `period_order` нэмсэн (UI-д уншигдахуйц); `stats/` endpoint нэмсэн (§7 тойм хуудсанд хэрэгтэй); `teachers/?active=`.
- Төрлийн нэрс: backend `SubjectOut` ↔ frontend `Subject`; `LessonOut.class_group` ↔ `Lesson.class_group`; `ConflictOut` ↔ `Conflict`; `GridCell` хоёуланд ижил.
