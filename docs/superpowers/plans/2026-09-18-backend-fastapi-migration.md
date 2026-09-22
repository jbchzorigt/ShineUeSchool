# Backend FastAPI + PostgreSQL шилжүүлэлт — хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Django backend-ийг FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL болгон дахин бичиж, Next.js админ дашбоард өөрчлөлтгүй ажиллахуйц API parity-г хангана; Django admin-ыг Next.js дээрх хэрэглэгч ба албумын хуудсаар орлуулна.

**Architecture:** `backend/app/` дотор FastAPI app, `auth/`, `olympiad/`, `common/` модулиуд. Async SQLAlchemy (asyncpg), Alembic миграци, JWT нэвтрэлт. API замууд ба JSON хариу Django-ийнхтэй яг ижил. Тест pytest + httpx, тест бүр transaction rollback.

**Tech Stack:** Python 3.14, uv, FastAPI, SQLAlchemy 2 async, asyncpg, Alembic, pydantic-settings, PyJWT, bcrypt, python-calamine, python-multipart, Pillow, pytest, pytest-asyncio, httpx. PostgreSQL 17 (Docker Compose).

**Spec:** `docs/superpowers/specs/2026-09-18-backend-fastapi-and-timetable-design.md` (1–4, 9, 10-р хэсэг). Timetable (5–8-р хэсэг) тусдаа төлөвлөгөө.

## Global Constraints

- **Commit, push хийхгүй.** Бүх ажил working tree-д үлдэнэ. Хэрэглэгч local тест дууссаны дараа өөрөө push хийнэ. Доорх task-уудад commit алхам байхгүй.
- Python `>=3.14`, `uv` ашиглана (`uv sync`, `uv run`). `uv` хэрэглэгчийн PATH дээр байна; тool shell дээр олдохгүй бол `.claude/launch.json` дахь `backend` тохиргоог ашиглана.
- API замууд `/api/auth/...`, `/api/olympiad/...` төгсгөлийн `/`-тэй, яг Django-ийнх шиг. Жагсаалт бүр pagination-гүй JSON массив.
- Алдааны формат: 400 → `{field: ["msg"]}` эсвэл `{non_field_errors: ["msg"]}`; 401/403/404 → `{detail: "..."}`.
- JWT: HS256, access 8 цаг, refresh 14 хоног, refresh rotation.
- Бүх код, коммент, хэрэглэгчид харагдах мессеж монгол хэлээр (одоогийн репогийн жишгээр).
- Хуучин Django код (`backend/config/`, `backend/olympiad/`, `backend/manage.py`, `backend/db.sqlite3`) Task 12-д устгагдана; тэр хүртэл хажууд нь шинэ код бичигдэнэ.
- Docker Desktop суусан; ажиллуулахын өмнө асаасан байх ёстой.

---

## Файлын бүтэц

```
backend/
  pyproject.toml                  # Task 1: шинэ хамаарлууд
  docker-compose.yml              # Task 1
  docker/init-test-db.sql         # Task 1: shineue_test бааз үүсгэнэ
  .env.example                    # Task 1
  alembic.ini, alembic/env.py     # Task 2
  alembic/versions/0001_users.py  # Task 2
  alembic/versions/0002_olympiad.py # Task 5
  app/__init__.py
  app/main.py                     # Task 1 (app, CORS, health), Task 4 (error handler), Task 6 (router-ууд), Task 7 (/media)
  app/config.py                   # Task 1
  app/db.py                       # Task 1
  app/common/__init__.py
  app/common/errors.py            # Task 4
  app/common/media.py             # Task 7
  app/auth/__init__.py
  app/auth/models.py              # Task 2
  app/auth/security.py            # Task 3
  app/auth/schemas.py             # Task 3, Task 10
  app/auth/deps.py                # Task 3
  app/auth/router.py              # Task 3, Task 10
  app/olympiad/__init__.py
  app/olympiad/models.py          # Task 5
  app/olympiad/schemas.py         # Task 6
  app/olympiad/router.py          # Task 6, 7, 8
  app/olympiad/importer.py        # Task 8
  scripts/create_admin.py         # Task 2
  scripts/seed.py                 # Task 9
  tests/conftest.py               # Task 1, Task 3 (make_user fixture)
  tests/helpers.py                # Task 3 (login, staff_headers)
  tests/test_health.py            # Task 1
  tests/test_auth.py              # Task 3, Task 10
  tests/test_errors.py            # Task 4
  tests/test_olympiad_read.py     # Task 6
  tests/test_olympiad_write.py    # Task 7
  tests/test_import.py            # Task 8
  tests/fixtures/results.xlsx     # Task 8 (тестээр үүсгэнэ)
frontend/src/lib/types.ts        # Task 11
frontend/src/lib/api.ts          # Task 11
frontend/src/app/admin/(dashboard)/layout.tsx  # Task 11
frontend/src/app/admin/(dashboard)/page.tsx    # Task 11
frontend/src/app/admin/(dashboard)/users/page.tsx  # Task 11
frontend/src/app/admin/(dashboard)/album/page.tsx  # Task 11
.claude/launch.json              # Task 12
README.md                        # Task 12
```

---

### Task 1: Төслийн суурь — хамаарал, Docker, config, db, health, тестийн суурь

**Files:**
- Modify: `backend/pyproject.toml`
- Create: `backend/docker-compose.yml`, `backend/docker/init-test-db.sql`, `backend/.env.example`, `backend/app/__init__.py`, `backend/app/config.py`, `backend/app/db.py`, `backend/app/main.py`, `backend/app/common/__init__.py`, `backend/app/auth/__init__.py`, `backend/app/olympiad/__init__.py`, `backend/tests/__init__.py`, `backend/tests/conftest.py`, `backend/tests/test_health.py`

**Interfaces:**
- Produces: `app.config.settings: Settings` (талбарууд: `database_url`, `database_url_test`, `secret_key`, `cors_origins: list[str]`, `media_dir: Path`, `access_ttl_hours: int`, `refresh_ttl_days: int`); `app.db.Base` (DeclarativeBase), `app.db.engine`, `app.db.SessionLocal` (async_sessionmaker), `app.db.get_db()` (FastAPI dependency, `AsyncSession` yield-лэнэ); `app.main.app`; тестийн fixture-ууд `client: httpx.AsyncClient`, `db: AsyncSession`.

- [ ] **Step 1: pyproject.toml-ийг шинэ stack-аар солих**

```toml
[project]
name = "shineue-backend"
version = "0.2.0"
description = "Шинэ Үе сургуулийн вэб сайтын backend (FastAPI + PostgreSQL)"
authors = [
    { name = "jbchzorigt", email = "zorigtchristian0721@gmail.com" }
]
requires-python = ">=3.14"
dependencies = [
    "fastapi>=0.120",
    "uvicorn[standard]>=0.36",
    "sqlalchemy[asyncio]>=2.0.44",
    "asyncpg>=0.31",
    "alembic>=1.16",
    "pydantic-settings>=2.10",
    "pyjwt>=2.10",
    "bcrypt>=4.3",
    "python-multipart>=0.0.20",
    "python-calamine>=0.8.2",
    "pillow>=12.3.0",
]

[dependency-groups]
dev = [
    "pytest>=8.4",
    "pytest-asyncio>=1.1",
    "httpx>=0.28",
    "openpyxl>=3.1",
]

[tool.uv]
package = false

[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "session"
testpaths = ["tests"]
```

- [ ] **Step 2: Docker Compose ба тестийн бааз үүсгэх SQL**

`backend/docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:17
    container_name: shineue-db
    environment:
      POSTGRES_USER: shineue
      POSTGRES_PASSWORD: shineue
      POSTGRES_DB: shineue
    ports:
      - "5432:5432"
    volumes:
      - shineue-pgdata:/var/lib/postgresql/data
      - ./docker/init-test-db.sql:/docker-entrypoint-initdb.d/10-test-db.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U shineue -d shineue"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  shineue-pgdata:
```

`backend/docker/init-test-db.sql`:
```sql
-- Тестийн бааз. Контейнер анх удаа үүсэхэд л ажиллана.
CREATE DATABASE shineue_test OWNER shineue;
```

- [ ] **Step 3: .env.example**

```dotenv
# Хуулж backend/.env нэрээр хадгална. Байхгүй бол доорх анхдагч утгууд ажиллана.
DATABASE_URL=postgresql+asyncpg://shineue:shineue@localhost:5432/shineue
DATABASE_URL_TEST=postgresql+asyncpg://shineue:shineue@localhost:5432/shineue_test
# Production дээр заавал урт санамсаргүй утга: python -c "import secrets; print(secrets.token_urlsafe(48))"
SECRET_KEY=dev-insecure-change-me
# Таслалаар тусгаарлана
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
MEDIA_DIR=media
ACCESS_TTL_HOURS=8
REFRESH_TTL_DAYS=14
```

- [ ] **Step 4: config.py**

`backend/app/config.py`:
```python
"""Тохиргоо: орчны хувьсагч эсвэл backend/.env файлаас уншина."""

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://shineue:shineue@localhost:5432/shineue"
    database_url_test: str = "postgresql+asyncpg://shineue:shineue@localhost:5432/shineue_test"
    secret_key: str = "dev-insecure-change-me"
    cors_origins: list[str] = [
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:5173", "http://127.0.0.1:5173",
    ]
    media_dir: Path = BASE_DIR / "media"
    access_ttl_hours: int = 8
    refresh_ttl_days: int = 14

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    @field_validator("media_dir", mode="before")
    @classmethod
    def _abs(cls, v):
        p = Path(v)
        return p if p.is_absolute() else BASE_DIR / p


settings = Settings()
```

- [ ] **Step 5: db.py**

`backend/app/db.py`:
```python
"""SQLAlchemy async engine, session, Base."""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: нэг хүсэлтэд нэг session."""
    async with SessionLocal() as session:
        yield session
```

- [ ] **Step 6: main.py (health endpoint-той)**

`backend/app/main.py`:
```python
"""FastAPI app. Router-ууд, CORS, media, алдааны handler энд бүртгэгдэнэ."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings

app = FastAPI(title="Шинэ Үе сургууль API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

Хоосон `__init__.py` файлууд: `backend/app/__init__.py`, `backend/app/common/__init__.py`, `backend/app/auth/__init__.py`, `backend/app/olympiad/__init__.py`, `backend/tests/__init__.py`.

- [ ] **Step 7: тестийн conftest.py**

`backend/tests/conftest.py`:
```python
"""
Тестийн суурь. Тестийн бааз (DATABASE_URL_TEST) дээр хүснэгтүүдийг үүсгээд,
тест бүрийг transaction дотор ажиллуулж, дуусахад rollback хийнэ.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.db import Base, get_db
from app.main import app


@pytest.fixture(scope="session")
async def engine():
    eng = create_async_engine(settings.database_url_test)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest.fixture
async def db(engine) -> AsyncSession:
    """Тест бүрт нэг connection + гадна transaction; session нь savepoint ашиглана."""
    async with engine.connect() as conn:
        trans = await conn.begin()
        maker = async_sessionmaker(conn, expire_on_commit=False, join_transaction_mode="create_savepoint")
        async with maker() as session:
            yield session
        await trans.rollback()


@pytest.fixture
async def client(db: AsyncSession):
    async def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 8: эхний тест бичих**

`backend/tests/test_health.py`:
```python
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
```

- [ ] **Step 9: Docker ба хамаарал суулгаж тест ажиллуулах**

```bash
cd backend
docker compose up -d
uv sync
uv run pytest -v
```
Expected: `test_health PASSED`. (`docker compose up -d` анх удаа `shineue` ба `shineue_test` баазыг үүсгэнэ. Docker Desktop асаагүй бол эхлээд асаана.)

---

### Task 2: Хэрэглэгч, эрхийн модель, Alembic, create_admin

**Files:**
- Create: `backend/app/auth/models.py`, `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/script.py.mako`, `backend/alembic/versions/0001_users.py`, `backend/scripts/create_admin.py`
- Test: `backend/tests/test_auth.py` (эхний тест)

**Interfaces:**
- Produces: `app.auth.models.User` (id, username, password_hash, full_name, email, is_active, is_superuser, created_at, `roles: list[Role]`), `Role` (id, code, name), `user_roles` хүснэгт; `User.role_codes -> list[str]`, `User.is_staff -> bool`. Role code-ууд: `manager`, `olympiad`, `news`.

- [ ] **Step 1: Failing тест — User модель roles-той хадгалагдана**

`backend/tests/test_auth.py`:
```python
from sqlalchemy import select

from app.auth.models import Role, User


async def test_user_roles_and_is_staff(db):
    role = Role(code="manager", name="Сургалтын менежер")
    u = User(username="bat", password_hash="x", full_name="Бат", email="", roles=[role])
    db.add(u)
    await db.flush()
    got = (await db.execute(select(User).where(User.username == "bat"))).scalar_one()
    assert got.role_codes == ["manager"]
    assert got.is_staff is True
    plain = User(username="dorj", password_hash="x", full_name="Дорж", email="")
    assert plain.is_staff is False
```

- [ ] **Step 2: Тест унаж байгааг батлах**

Run: `uv run pytest tests/test_auth.py -v`
Expected: FAIL, `ModuleNotFoundError: app.auth.models`

- [ ] **Step 3: models.py**

`backend/app/auth/models.py`:
```python
"""Хэрэглэгч, эрхийн бүлэг (role)."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base

ROLE_CODES = {"manager": "Сургалтын менежер", "olympiad": "Олимпиад", "news": "Мэдээ"}

user_roles = Table(
    "user_roles", Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(80))


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(150), default="")
    email: Mapped[str] = mapped_column(String(254), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    roles: Mapped[list[Role]] = relationship(secondary=user_roles, lazy="selectin")

    @property
    def role_codes(self) -> list[str]:
        return sorted(r.code for r in self.roles)

    @property
    def is_staff(self) -> bool:
        """Frontend-ийн одоогийн шалгалт: superuser эсвэл ямар нэг эрхийн бүлэгтэй."""
        return self.is_superuser or len(self.roles) > 0
```

`backend/app/db.py`-д Base-ийг Alembic харахын тулд модель бүрийг импортлох модуль: `backend/app/models_all.py`:
```python
"""Alembic autogenerate-д зориулж бүх моделийг нэг дор импортлоно."""

from .auth import models as auth_models  # noqa: F401
```
(Task 5-д `from .olympiad import models as olympiad_models  # noqa: F401` мөр нэмэгдэнэ.)

- [ ] **Step 4: Тест давахыг батлах**

Run: `uv run pytest tests/test_auth.py -v`
Expected: PASS

- [ ] **Step 5: Alembic тохиргоо**

`backend/alembic.ini`:
```ini
[alembic]
script_location = alembic
prepend_sys_path = .
file_template = %%(rev)s_%%(slug)s

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARNING
handlers = console
qualname =

[logger_sqlalchemy]
level = WARNING
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

`backend/alembic/env.py`:
```python
"""Alembic async env. DATABASE_URL-ийг app.config-оос авна."""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool

from app.config import settings
from app.db import Base
import app.models_all  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
config.set_main_option("sqlalchemy.url", settings.database_url)
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=settings.database_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}), prefix="sqlalchemy.", poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

`backend/alembic/script.py.mako`:
```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

- [ ] **Step 6: Эхний миграци (гараар бичнэ, role-уудыг seed хийнэ)**

`backend/alembic/versions/0001_users.py`:
```python
"""users, roles, user_roles

Revision ID: 0001
Revises:
Create Date: 2026-09-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("code", sa.String(30), nullable=False, unique=True),
        sa.Column("name", sa.String(80), nullable=False),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("username", sa.String(150), nullable=False, unique=True, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False, server_default=""),
        sa.Column("email", sa.String(254), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("is_superuser", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role_id", sa.Integer, sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    )
    op.bulk_insert(
        sa.table("roles", sa.column("code", sa.String), sa.column("name", sa.String)),
        [
            {"code": "manager", "name": "Сургалтын менежер"},
            {"code": "olympiad", "name": "Олимпиад"},
            {"code": "news", "name": "Мэдээ"},
        ],
    )


def downgrade() -> None:
    op.drop_table("user_roles")
    op.drop_table("users")
    op.drop_table("roles")
```

- [ ] **Step 7: create_admin скрипт**

`backend/scripts/create_admin.py`:
```python
"""
Superuser үүсгэнэ (Django-ийн createsuperuser-ийн оронд).

    uv run python scripts/create_admin.py admin "Нууц үг" --name "Админ" --email admin@example.com
"""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.auth.models import User  # noqa: E402
from app.auth.security import hash_password  # noqa: E402
from app.db import SessionLocal  # noqa: E402


async def main(username: str, password: str, name: str, email: str) -> None:
    async with SessionLocal() as db:
        existing = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
        if existing:
            print(f"'{username}' хэрэглэгч аль хэдийн байна.")
            return
        db.add(User(username=username, password_hash=hash_password(password), full_name=name or username,
                    email=email, is_superuser=True, is_active=True))
        await db.commit()
        print(f"Superuser '{username}' үүслээ.")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("username")
    p.add_argument("password")
    p.add_argument("--name", default="")
    p.add_argument("--email", default="")
    a = p.parse_args()
    asyncio.run(main(a.username, a.password, a.name, a.email))
```
(`hash_password` Task 3-д бичигдэнэ; энэ скриптийг Task 3-ын дараа ажиллуулна.)

- [ ] **Step 8: Миграци ажиллуулах**

Run: `uv run alembic upgrade head`
Expected: `Running upgrade  -> 0001, users, roles, user_roles`. Шалгах: `docker exec shineue-db psql -U shineue -d shineue -c "select code from roles"` → 3 мөр.

---

### Task 3: JWT нэвтрэлт — token, refresh, me, эрхийн dependency

**Files:**
- Create: `backend/app/auth/security.py`, `backend/app/auth/schemas.py`, `backend/app/auth/deps.py`, `backend/app/auth/router.py`
- Modify: `backend/app/main.py` (router бүртгэх)
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Produces: `security.hash_password(p) -> str`, `security.verify_password(p, h) -> bool`, `security.create_token(user_id: int, kind: "access"|"refresh") -> str`, `security.decode_token(token) -> dict` (raises `jwt.PyJWTError`); deps: `current_user` (User, 401 үгүй бол), `optional_user` (User | None), `require_staff` (403 бол), `require_role(code: str)` → dependency (superuser үргэлж зөвшөөрнө), `require_superuser`; тестийн fixture `make_user(username, password="pass1234", *, superuser=False, roles=())` (conftest.py), туслах `tests/helpers.py`: `login(client, username, password) -> dict`, `staff_headers(client, make_user, username="staff", *, roles=("olympiad",), superuser=False) -> dict`.

- [ ] **Step 1: Failing тестүүд**

`backend/tests/conftest.py`-д fixture нэмэх (файлын төгсгөлд):
```python
from sqlalchemy import select

from app.auth.models import Role, User
from app.auth.security import hash_password


@pytest.fixture
async def make_user(db):
    """make_user("bat", roles=["manager"]) → User. Role байхгүй бол үүсгэнэ."""
    async def _make(username, password="pass1234", *, superuser=False, roles=()):
        role_objs = []
        for code in roles:
            r = (await db.execute(select(Role).where(Role.code == code))).scalar_one_or_none()
            if r is None:
                r = Role(code=code, name=code)
                db.add(r)
            role_objs.append(r)
        u = User(username=username, password_hash=hash_password(password), full_name=username,
                 email=f"{username}@example.com", is_superuser=superuser, roles=role_objs)
        db.add(u)
        await db.flush()
        return u
    return _make
```

`backend/tests/helpers.py` (шинэ):
```python
"""Тестийн туслахууд: нэвтрэх, staff header."""


async def login(client, username, password="pass1234"):
    r = await client.post("/api/auth/token/", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


async def staff_headers(client, make_user, username="staff", *, roles=("olympiad",), superuser=False):
    await make_user(username, roles=list(roles), superuser=superuser)
    t = await login(client, username)
    return {"Authorization": f"Bearer {t['access']}"}
```

`backend/tests/test_auth.py`-д нэмэх (дээрх `from tests.helpers import login` импорттой):
```python
from tests.helpers import login


async def test_login_returns_tokens(client, make_user):
    await make_user("admin", superuser=True)
    t = await login(client, "admin")
    assert set(t) == {"access", "refresh"}


async def test_login_wrong_password(client, make_user):
    await make_user("admin")
    r = await client.post("/api/auth/token/", json={"username": "admin", "password": "wrong"})
    assert r.status_code == 401
    assert r.json() == {"detail": "Нэвтрэх нэр эсвэл нууц үг буруу байна."}


async def test_me(client, make_user):
    await make_user("mgr", roles=["manager"])
    t = await login(client, "mgr")
    r = await client.get("/api/auth/me/", headers={"Authorization": f"Bearer {t['access']}"})
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "mgr"
    assert body["is_staff"] is True
    assert body["is_superuser"] is False
    assert body["roles"] == ["manager"]
    assert set(body) == {"id", "username", "full_name", "email", "is_staff", "is_superuser", "roles"}


async def test_me_without_token(client):
    r = await client.get("/api/auth/me/")
    assert r.status_code == 401


async def test_refresh_rotates(client, make_user):
    await make_user("admin", superuser=True)
    t = await login(client, "admin")
    r = await client.post("/api/auth/token/refresh/", json={"refresh": t["refresh"]})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"access", "refresh"}
    assert body["refresh"] != t["refresh"]


async def test_refresh_with_access_token_rejected(client, make_user):
    await make_user("admin", superuser=True)
    t = await login(client, "admin")
    r = await client.post("/api/auth/token/refresh/", json={"refresh": t["access"]})
    assert r.status_code == 401


async def test_inactive_user_cannot_login(client, make_user):
    u = await make_user("old")
    u.is_active = False
    r = await client.post("/api/auth/token/", json={"username": "old", "password": "pass1234"})
    assert r.status_code == 401
```

- [ ] **Step 2: Тест унаж байгааг батлах**

Run: `uv run pytest tests/test_auth.py -v`
Expected: FAIL, `ModuleNotFoundError: app.auth.security`

- [ ] **Step 3: security.py**

`backend/app/auth/security.py`:
```python
"""Нууц үгийн hash (bcrypt) ба JWT (HS256)."""

import secrets
from datetime import UTC, datetime, timedelta
from typing import Literal

import bcrypt
import jwt

from ..config import settings

TokenKind = Literal["access", "refresh"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_token(user_id: int, kind: TokenKind) -> str:
    now = datetime.now(UTC)
    ttl = timedelta(hours=settings.access_ttl_hours) if kind == "access" else timedelta(days=settings.refresh_ttl_days)
    # jti: нэг секундэд үүссэн хоёр токен ч өөр байх (refresh rotation тест)
    payload = {"sub": str(user_id), "type": kind, "iat": now, "exp": now + ttl, "jti": secrets.token_hex(8)}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_token(token: str) -> dict:
    """Хугацаа дууссан, буруу гарын үсэгтэй бол jwt.PyJWTError шидэгдэнэ."""
    return jwt.decode(token, settings.secret_key, algorithms=["HS256"])
```

- [ ] **Step 4: schemas.py**

`backend/app/auth/schemas.py`:
```python
from pydantic import BaseModel


class LoginIn(BaseModel):
    username: str
    password: str


class RefreshIn(BaseModel):
    refresh: str


class TokenPair(BaseModel):
    access: str
    refresh: str


class MeOut(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    is_staff: bool
    is_superuser: bool
    roles: list[str]
```

- [ ] **Step 5: deps.py**

`backend/app/auth/deps.py`:
```python
"""Эрхийн dependency-ууд."""

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from .models import User
from .security import decode_token


def _bearer(request: Request) -> str | None:
    h = request.headers.get("authorization", "")
    if h.lower().startswith("bearer "):
        return h[7:].strip()
    return None


async def optional_user(request: Request, db: Annotated[AsyncSession, Depends(get_db)]) -> User | None:
    token = _bearer(request)
    if not token:
        return None
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Токен хүчингүй эсвэл хугацаа дууссан.")
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Access токен шаардлагатай.")
    user = await db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Хэрэглэгч олдсонгүй.")
    return user


async def current_user(user: Annotated[User | None, Depends(optional_user)]) -> User:
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Нэвтрэх шаардлагатай.")
    return user


async def require_staff(user: Annotated[User, Depends(current_user)]) -> User:
    if not user.is_staff:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Энэ үйлдэлд эрх хүрэхгүй.")
    return user


def require_role(code: str):
    async def _dep(user: Annotated[User, Depends(current_user)]) -> User:
        if user.is_superuser or code in user.role_codes:
            return user
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Энэ үйлдэлд эрх хүрэхгүй.")
    return _dep


async def require_superuser(user: Annotated[User, Depends(current_user)]) -> User:
    if not user.is_superuser:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Зөвхөн superuser.")
    return user
```

- [ ] **Step 6: router.py**

`backend/app/auth/router.py`:
```python
"""
Нэвтрэлтийн API.
  POST /api/auth/token/          {username, password} → {access, refresh}
  POST /api/auth/token/refresh/  {refresh}            → {access, refresh}
  GET  /api/auth/me/             Bearer               → хэрэглэгчийн мэдээлэл
"""

from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from .deps import current_user
from .models import User
from .schemas import LoginIn, MeOut, RefreshIn, TokenPair
from .security import create_token, decode_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _pair(user: User) -> TokenPair:
    return TokenPair(access=create_token(user.id, "access"), refresh=create_token(user.id, "refresh"))


def me_out(user: User) -> MeOut:
    return MeOut(id=user.id, username=user.username, full_name=user.full_name or user.username,
                 email=user.email, is_staff=user.is_staff, is_superuser=user.is_superuser, roles=user.role_codes)


@router.post("/token/", response_model=TokenPair)
async def login(body: LoginIn, db: Annotated[AsyncSession, Depends(get_db)]):
    user = (await db.execute(select(User).where(User.username == body.username))).scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Нэвтрэх нэр эсвэл нууц үг буруу байна.")
    return _pair(user)


@router.post("/token/refresh/", response_model=TokenPair)
async def refresh(body: RefreshIn, db: Annotated[AsyncSession, Depends(get_db)]):
    try:
        payload = decode_token(body.refresh)
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh токен хүчингүй.")
    if payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh токен шаардлагатай.")
    user = await db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Хэрэглэгч олдсонгүй.")
    return _pair(user)


@router.get("/me/", response_model=MeOut)
async def me(user: Annotated[User, Depends(current_user)]):
    return me_out(user)
```

`backend/app/main.py`-д нэмэх (health-ийн доор):
```python
from .auth.router import router as auth_router

app.include_router(auth_router)
```

- [ ] **Step 7: Тестүүд давахыг батлах**

Run: `uv run pytest tests/test_auth.py -v`
Expected: 8 PASS.

- [ ] **Step 8: Superuser үүсгэх**

Run: `uv run python scripts/create_admin.py admin admin1234 --name "Админ"`
Expected: `Superuser 'admin' үүслээ.`

---

### Task 4: DRF маягийн алдааны формат

**Files:**
- Create: `backend/app/common/errors.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_errors.py`

**Interfaces:**
- Produces: `errors.register(app)` — RequestValidationError → 400 `{field: [msg]}`; `errors.FieldError(field, msg)` exception → 400 `{field: [msg]}`; 404 → `{detail: "Олдсонгүй."}`.

- [ ] **Step 1: Failing тест**

`backend/tests/test_errors.py`:
```python
async def test_validation_error_is_drf_shaped(client):
    r = await client.post("/api/auth/token/", json={"username": "a"})
    assert r.status_code == 400
    assert r.json() == {"password": ["Энэ талбар заавал шаардлагатай."]}


async def test_unknown_path_is_detail(client):
    r = await client.get("/api/nothing/")
    assert r.status_code == 404
    assert r.json() == {"detail": "Олдсонгүй."}
```

- [ ] **Step 2: Тест унаж байгааг батлах**

Run: `uv run pytest tests/test_errors.py -v`
Expected: FAIL (422 ба `{"detail": [...]}` ирнэ)

- [ ] **Step 3: errors.py**

`backend/app/common/errors.py`:
```python
"""
Алдааны хариуг DRF-ийн хэлбэрт оруулна: frontend-ийн ApiError.fieldErrors үүнийг уншдаг.
  400 → {"талбар": ["мессеж"]} эсвэл {"non_field_errors": ["мессеж"]}
  404 → {"detail": "Олдсонгүй."}
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

MESSAGES = {
    "missing": "Энэ талбар заавал шаардлагатай.",
    "int_parsing": "Бүхэл тоо оруулна уу.",
    "float_parsing": "Тоо оруулна уу.",
    "string_type": "Текст оруулна уу.",
    "bool_parsing": "true эсвэл false байх ёстой.",
    "date_from_datetime_parsing": "Огноо буруу (YYYY-MM-DD).",
    "date_parsing": "Огноо буруу (YYYY-MM-DD).",
    "enum": "Зөвшөөрөгдөөгүй утга.",
    "literal_error": "Зөвшөөрөгдөөгүй утга.",
    "greater_than_equal": "Хэт бага утга.",
    "less_than_equal": "Хэт их утга.",
    "string_too_long": "Хэт урт.",
}


class FieldError(Exception):
    """Бизнес логикийн талбарын алдаа: raise FieldError("year", "Оныг тодорхойлж чадсангүй.")"""

    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message


def register(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        errors: dict[str, list[str]] = {}
        for e in exc.errors():
            loc = [str(x) for x in e.get("loc", []) if x not in ("body", "query", "path", "form")]
            field = loc[-1] if loc else "non_field_errors"
            errors.setdefault(field, []).append(MESSAGES.get(e.get("type", ""), e.get("msg", "Буруу утга.")))
        return JSONResponse(errors, status_code=400)

    @app.exception_handler(FieldError)
    async def _field(request: Request, exc: FieldError):
        return JSONResponse({exc.field: [exc.message]}, status_code=400)

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        detail = exc.detail if exc.status_code != 404 or exc.detail != "Not Found" else "Олдсонгүй."
        return JSONResponse({"detail": detail}, status_code=exc.status_code, headers=exc.headers)
```

`backend/app/main.py`-д (app үүссэний дараа):
```python
from .common import errors

errors.register(app)
```

- [ ] **Step 4: Тест давахыг батлах**

Run: `uv run pytest -v`
Expected: бүгд PASS.

---

### Task 5: Олимпиадын модель ба миграци

**Files:**
- Create: `backend/app/olympiad/models.py`, `backend/alembic/versions/0002_olympiad.py`
- Modify: `backend/app/models_all.py`
- Test: `backend/tests/test_olympiad_read.py` (эхний тест)

**Interfaces:**
- Produces: `Stage` (id, year, order, title, date_text, date, text, tags: list, location), `Result` (id, year, category, last_name, first_name, school, code, scores: list, score: Decimal|None, rank_label, medal, rank: int|None, note; `student`, `full_name` property), `AlbumPhoto` (id, image: str — MEDIA_DIR-ээс хамаарах зам "album/x.jpg", caption, order, is_published), `CATEGORY_LABELS: dict[str, str]`, `CATEGORIES: list[dict]`.

- [ ] **Step 1: Failing тест**

`backend/tests/test_olympiad_read.py`:
```python
from decimal import Decimal

from sqlalchemy import select

from app.olympiad.models import CATEGORIES, Result, Stage


async def test_models_persist(db):
    db.add(Stage(year=2026, order=1, title="Бүртгэл", date_text="2026 · 10 сар", tags=["Онлайн"]))
    db.add(Result(year=2025, category="9", last_name="Бат", first_name="Мухулай", school="Шинэ Үе", scores=[7, 7], score=Decimal("14")))
    await db.flush()
    r = (await db.execute(select(Result))).scalar_one()
    assert r.student == "Б.Мухулай"
    assert r.full_name == "Бат Мухулай"
    assert CATEGORIES[0] == {"value": "6", "label": "VI анги"}
    assert CATEGORIES[-1] == {"value": "teacher_secondary", "label": "Дунд ангийн багш"}
```

- [ ] **Step 2: Тест унаж байгааг батлах**

Run: `uv run pytest tests/test_olympiad_read.py -v`
Expected: FAIL, `ModuleNotFoundError: app.olympiad.models`

- [ ] **Step 3: models.py**

`backend/app/olympiad/models.py`:
```python
"""
Олимпиадын өгөгдлийн загварууд (Django-ийн Stage, Result, AlbumPhoto-той ижил талбартай).
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, Integer, Numeric, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base

CATEGORY_LABELS: dict[str, str] = {
    "6": "VI анги", "7": "VII анги", "8": "VIII анги", "9": "IX анги",
    "10": "X анги", "11": "XI анги", "12": "XII анги",
    "teacher_primary": "Бага ангийн багш", "teacher_secondary": "Дунд ангийн багш",
}
CATEGORIES = [{"value": v, "label": l} for v, l in CATEGORY_LABELS.items()]
RANK_LABELS = ("", "I", "II", "III")
MEDALS = ("", "АЛТ", "МӨНГӨ", "ХҮРЭЛ")


class Stage(Base):
    __tablename__ = "olympiad_stages"
    __table_args__ = (UniqueConstraint("year", "order", name="uq_stage_year_order"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    order: Mapped[int] = mapped_column(SmallInteger, default=1)
    title: Mapped[str] = mapped_column(String(120))
    date_text: Mapped[str] = mapped_column(String(60))
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    text: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list] = mapped_column(JSONB, default=list)
    location: Mapped[str] = mapped_column(String(120), default="")


class Result(Base):
    __tablename__ = "olympiad_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    category: Mapped[str] = mapped_column(String(20), index=True)
    last_name: Mapped[str] = mapped_column(String(80), default="")
    first_name: Mapped[str] = mapped_column(String(80))
    school: Mapped[str] = mapped_column(String(160), default="")
    code: Mapped[str] = mapped_column(String(30), default="")
    scores: Mapped[list] = mapped_column(JSONB, default=list)
    score: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    rank_label: Mapped[str] = mapped_column(String(4), default="")
    medal: Mapped[str] = mapped_column(String(10), default="")
    rank: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    note: Mapped[str] = mapped_column(String(200), default="")

    @property
    def student(self) -> str:
        """Б.Мухулай"""
        if self.last_name and self.last_name != "*":
            return f"{self.last_name[0]}.{self.first_name}"
        return self.first_name

    @property
    def full_name(self) -> str:
        return f"{self.last_name} {self.first_name}".strip()


class AlbumPhoto(Base):
    __tablename__ = "olympiad_album_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    image: Mapped[str] = mapped_column(String(255))  # MEDIA_DIR доторх зам: "album/xxx.jpg"
    caption: Mapped[str] = mapped_column(Text)
    order: Mapped[int] = mapped_column(SmallInteger, default=1)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
```

`backend/app/models_all.py`-д мөр нэмэх:
```python
from .olympiad import models as olympiad_models  # noqa: F401
```

- [ ] **Step 4: Тест давахыг батлах**

Run: `uv run pytest tests/test_olympiad_read.py -v`
Expected: PASS (conftest `create_all` шинэ хүснэгтүүдийг үүсгэнэ).

- [ ] **Step 5: Миграци**

`backend/alembic/versions/0002_olympiad.py`:
```python
"""olympiad stages, results, album photos

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "olympiad_stages",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("year", sa.Integer, nullable=False, index=True),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="1"),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("date_text", sa.String(60), nullable=False),
        sa.Column("date", sa.Date, nullable=True),
        sa.Column("text", sa.Text, nullable=False, server_default=""),
        sa.Column("tags", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("location", sa.String(120), nullable=False, server_default=""),
        sa.UniqueConstraint("year", "order", name="uq_stage_year_order"),
    )
    op.create_table(
        "olympiad_results",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("year", sa.Integer, nullable=False, index=True),
        sa.Column("category", sa.String(20), nullable=False, index=True),
        sa.Column("last_name", sa.String(80), nullable=False, server_default=""),
        sa.Column("first_name", sa.String(80), nullable=False),
        sa.Column("school", sa.String(160), nullable=False, server_default=""),
        sa.Column("code", sa.String(30), nullable=False, server_default=""),
        sa.Column("scores", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("score", sa.Numeric(6, 2), nullable=True),
        sa.Column("rank_label", sa.String(4), nullable=False, server_default=""),
        sa.Column("medal", sa.String(10), nullable=False, server_default=""),
        sa.Column("rank", sa.SmallInteger, nullable=True),
        sa.Column("note", sa.String(200), nullable=False, server_default=""),
    )
    op.create_table(
        "olympiad_album_photos",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("image", sa.String(255), nullable=False),
        sa.Column("caption", sa.Text, nullable=False),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="1"),
        sa.Column("is_published", sa.Boolean, nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_table("olympiad_album_photos")
    op.drop_table("olympiad_results")
    op.drop_table("olympiad_stages")
```

Run: `uv run alembic upgrade head`
Expected: `Running upgrade 0001 -> 0002`.

---

### Task 6: Олимпиадын унших API — years, categories, stats, schedule, results (rank-тэй), album

**Files:**
- Create: `backend/app/olympiad/schemas.py`, `backend/app/olympiad/router.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_olympiad_read.py`

**Interfaces:**
- Produces: `schemas.StageOut`, `StageIn`, `StagePatch`, `ResultOut`, `ResultIn`, `ResultPatch`, `AlbumOut`; `router.router` (prefix `/api/olympiad`); туслах `router.result_out(r: Result, rank: int | None) -> ResultOut`, `router.album_out(request, p) -> AlbumOut`.

- [ ] **Step 1: Failing тестүүд**

`backend/tests/test_olympiad_read.py`-д нэмэх:
```python
async def seed(db):
    db.add_all([
        Stage(year=2025, order=1, title="Бүртгэл", date_text="2025 · 10 сар", tags=["Онлайн"]),
        Stage(year=2026, order=2, title="I шат", date_text="2026 · 11 сар"),
        Stage(year=2026, order=1, title="Бүртгэл", date_text="2026 · 10 сар"),
        Result(year=2025, category="9", last_name="Бат", first_name="А", score=Decimal("95")),
        Result(year=2025, category="9", last_name="Дорж", first_name="Б", score=Decimal("88"), rank=7),
        Result(year=2025, category="9", last_name="Цэнд", first_name="В", score=None),
        Result(year=2025, category="10", last_name="Сүх", first_name="Г", score=Decimal("90")),
        Result(year=2024, category="6", last_name="Наран", first_name="Д", score=Decimal("70")),
    ])
    await db.flush()


async def test_years(client, db):
    await seed(db)
    r = await client.get("/api/olympiad/years/")
    assert r.json() == {"schedule": [2025, 2026], "results": [2024, 2025]}


async def test_categories_all_and_by_year(client, db):
    await seed(db)
    assert len((await client.get("/api/olympiad/categories/")).json()) == 9
    r = await client.get("/api/olympiad/categories/?year=2025")
    assert [c["value"] for c in r.json()] == ["9", "10"]


async def test_stats(client, db):
    await seed(db)
    body = (await client.get("/api/olympiad/stats/")).json()
    assert body == {
        "stages": 3, "results": 5, "photos": 0,
        "results_by_year": [{"year": 2024, "count": 1}, {"year": 2025, "count": 4}],
        "latest_year": 2026,
    }


async def test_schedule_filtered_and_ordered(client, db):
    await seed(db)
    r = await client.get("/api/olympiad/schedule/?year=2026")
    body = r.json()
    assert [s["order"] for s in body] == [1, 2]
    assert set(body[0]) == {"id", "year", "order", "title", "date_text", "date", "text", "tags", "location"}
    assert body[0]["date"] is None and body[0]["tags"] == []


async def test_results_rank_computed_or_manual(client, db):
    await seed(db)
    r = await client.get("/api/olympiad/results/?year=2025&category=9")
    body = r.json()
    assert [(x["student"], x["rank"], x["score"]) for x in body] == [("Б.А", 1, 95.0), ("Д.Б", 7, 88.0), ("Ц.В", 3, None)]
    assert body[0]["category_label"] == "IX анги"
    assert body[0]["full_name"] == "Бат А"
    assert set(body[0]) == {"id", "year", "category", "category_label", "rank", "rank_label", "medal", "last_name",
                            "first_name", "student", "full_name", "school", "code", "scores", "score", "note"}


async def test_album_public_only_published(client, db):
    from app.olympiad.models import AlbumPhoto
    db.add_all([AlbumPhoto(image="album/a.jpg", caption="А", order=2), AlbumPhoto(image="album/b.jpg", caption="Б", order=1, is_published=False)])
    await db.flush()
    body = (await client.get("/api/olympiad/album/")).json()
    assert len(body) == 1
    assert body[0]["image"] == "http://test/media/album/a.jpg"
    assert set(body[0]) == {"id", "order", "image", "caption", "is_published"}
```

- [ ] **Step 2: Тест унаж байгааг батлах**

Run: `uv run pytest tests/test_olympiad_read.py -v`
Expected: 404-өөр FAIL.

- [ ] **Step 3: schemas.py**

`backend/app/olympiad/schemas.py`:
```python
"""Pydantic схемүүд. JSON бүтэц frontend/src/lib/types.ts-тэй тохирно."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

Category = Literal["6", "7", "8", "9", "10", "11", "12", "teacher_primary", "teacher_secondary"]
RankLabel = Literal["", "I", "II", "III"]
Medal = Literal["", "АЛТ", "МӨНГӨ", "ХҮРЭЛ"]


class StageIn(BaseModel):
    year: int = Field(ge=2000, le=2100)
    order: int = Field(default=1, ge=1)
    title: str = Field(max_length=120)
    date_text: str = Field(max_length=60)
    date: date | None = None
    text: str = ""
    tags: list[str] = []
    location: str = Field(default="", max_length=120)


class StagePatch(BaseModel):
    year: int | None = Field(default=None, ge=2000, le=2100)
    order: int | None = Field(default=None, ge=1)
    title: str | None = Field(default=None, max_length=120)
    date_text: str | None = Field(default=None, max_length=60)
    date: date | None = None
    text: str | None = None
    tags: list[str] | None = None
    location: str | None = Field(default=None, max_length=120)


class StageOut(StageIn):
    id: int
    model_config = {"from_attributes": True}


class ResultIn(BaseModel):
    year: int = Field(ge=2000, le=2100)
    category: Category
    last_name: str = Field(default="", max_length=80)
    first_name: str = Field(max_length=80)
    school: str = Field(default="", max_length=160)
    code: str = Field(default="", max_length=30)
    scores: list[float | None] = []
    score: float | None = None
    rank_label: RankLabel = ""
    medal: Medal = ""
    note: str = Field(default="", max_length=200)


class ResultPatch(BaseModel):
    year: int | None = Field(default=None, ge=2000, le=2100)
    category: Category | None = None
    last_name: str | None = Field(default=None, max_length=80)
    first_name: str | None = Field(default=None, max_length=80)
    school: str | None = Field(default=None, max_length=160)
    code: str | None = Field(default=None, max_length=30)
    scores: list[float | None] | None = None
    score: float | None = None
    rank_label: RankLabel | None = None
    medal: Medal | None = None
    note: str | None = Field(default=None, max_length=200)


class ResultOut(BaseModel):
    id: int
    year: int
    category: str
    category_label: str
    rank: int | None
    rank_label: str
    medal: str
    last_name: str
    first_name: str
    student: str
    full_name: str
    school: str
    code: str
    scores: list[float | None]
    score: float | None
    note: str


class AlbumOut(BaseModel):
    id: int
    order: int
    image: str
    caption: str
    is_published: bool


class AlbumPatch(BaseModel):
    caption: str | None = None
    order: int | None = None
    is_published: bool | None = None
```

- [ ] **Step 4: router.py (унших хэсэг)**

`backend/app/olympiad/router.py`:
```python
"""
Олимпиадын API. Унших нээлттэй, бичих staff.

  GET  /api/olympiad/years/                      → {"schedule": [...], "results": [...]}
  GET  /api/olympiad/stats/                      → админ дашбоардын тоон үзүүлэлт
  GET  /api/olympiad/categories/?year=           → [{value, label}]
  GET  /api/olympiad/schedule/?year=             → шатууд (order-оор)
  GET  /api/olympiad/results/?year=&category=    → үр дүн (байртай)
  GET  /api/olympiad/album/                      → нийтлэгдсэн зургууд (staff: бүгд)
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy import Integer, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import optional_user
from ..auth.models import User
from ..db import get_db
from .models import CATEGORIES, CATEGORY_LABELS, AlbumPhoto, Result, Stage
from .schemas import AlbumOut, ResultOut, StageOut

router = APIRouter(prefix="/api/olympiad", tags=["olympiad"])

DB = Annotated[AsyncSession, Depends(get_db)]


def result_out(r: Result, rank: int | None) -> ResultOut:
    return ResultOut(
        id=r.id, year=r.year, category=r.category, category_label=CATEGORY_LABELS.get(r.category, r.category),
        rank=r.rank or rank, rank_label=r.rank_label, medal=r.medal, last_name=r.last_name, first_name=r.first_name,
        student=r.student, full_name=r.full_name, school=r.school, code=r.code,
        scores=[None if s is None else float(s) for s in (r.scores or [])],
        score=None if r.score is None else float(r.score), note=r.note,
    )


def album_out(request: Request, p: AlbumPhoto) -> AlbumOut:
    return AlbumOut(id=p.id, order=p.order, caption=p.caption, is_published=p.is_published,
                    image=f"{request.base_url}media/{p.image}")


@router.get("/years/")
async def years(db: DB):
    sched = (await db.execute(select(Stage.year).distinct().order_by(Stage.year))).scalars().all()
    res = (await db.execute(select(Result.year).distinct().order_by(Result.year))).scalars().all()
    return {"schedule": list(sched), "results": list(res)}


@router.get("/categories/")
async def categories(db: DB, year: int | None = None):
    if year is None:
        return CATEGORIES
    present = set((await db.execute(select(Result.category).where(Result.year == year).distinct())).scalars().all())
    return [c for c in CATEGORIES if c["value"] in present]


@router.get("/stats/")
async def stats(db: DB):
    stages = (await db.execute(select(func.count(Stage.id)))).scalar_one()
    results = (await db.execute(select(func.count(Result.id)))).scalar_one()
    photos = (await db.execute(select(func.count(AlbumPhoto.id)))).scalar_one()
    by_year = (await db.execute(
        select(Result.year, func.count(Result.id)).group_by(Result.year).order_by(Result.year)
    )).all()
    latest = (await db.execute(select(func.max(Stage.year)))).scalar_one()
    return {
        "stages": stages, "results": results, "photos": photos,
        "results_by_year": [{"year": y, "count": c} for y, c in by_year],
        "latest_year": latest,
    }


@router.get("/schedule/", response_model=list[StageOut])
async def schedule_list(db: DB, year: int | None = None):
    q = select(Stage).order_by(Stage.year, Stage.order)
    if year is not None:
        q = q.where(Stage.year == year)
    return (await db.execute(q)).scalars().all()


def _ranked_results_query(year: int | None, category: str | None):
    """Оноогоор он+ангилал дотор RANK() тооцсон query. Мөр: (Result, computed_rank)."""
    rank_col = func.rank().over(
        partition_by=[Result.year, Result.category], order_by=Result.score.desc().nulls_last()
    ).label("computed_rank")
    q = select(Result, rank_col)
    if year is not None:
        q = q.where(Result.year == year)
    if category is not None:
        q = q.where(Result.category == category)
    return q.order_by(Result.year, Result.category, rank_col, Result.last_name, Result.first_name)


@router.get("/results/", response_model=list[ResultOut])
async def results_list(db: DB, year: int | None = None, category: str | None = None):
    rows = (await db.execute(_ranked_results_query(year, category))).all()
    return [result_out(r, int(rank)) for r, rank in rows]


@router.get("/album/", response_model=list[AlbumOut])
async def album_list(request: Request, db: DB, user: Annotated[User | None, Depends(optional_user)]):
    q = select(AlbumPhoto).order_by(AlbumPhoto.order, AlbumPhoto.id)
    if not (user and user.is_staff):
        q = q.where(AlbumPhoto.is_published.is_(True))
    return [album_out(request, p) for p in (await db.execute(q)).scalars().all()]
```

`backend/app/main.py`-д нэмэх:
```python
from .olympiad.router import router as olympiad_router

app.include_router(olympiad_router)
```

- [ ] **Step 5: Тест давахыг батлах**

Run: `uv run pytest tests/test_olympiad_read.py -v`
Expected: 7 PASS. Хэрэв `test_results_rank_computed_or_manual`-д Ц.В-ийн rank 3 биш бол `nulls_last()` ажиллаж байгааг шалгана (PostgreSQL дээр `ORDER BY score DESC NULLS LAST` → null сүүлд, rank 3).

---

### Task 7: Олимпиадын бичих API — stages, results CRUD, album upload, media

**Files:**
- Create: `backend/app/common/media.py`
- Modify: `backend/app/olympiad/router.py`, `backend/app/main.py`
- Test: `backend/tests/test_olympiad_write.py`

**Interfaces:**
- Produces: `media.save_upload(upload: UploadFile, subdir: str) -> str` (MEDIA_DIR доторх харьцангуй зам буцаана, зөвхөн jpg/png/webp, нэрийг uuid-ээр солино), `media.delete_file(rel: str)`; endpoint-ууд: `POST/PATCH/DELETE /api/olympiad/schedule/{id}/`, `.../results/{id}/`, `POST /api/olympiad/album/` (multipart `image`, `caption`, `order`, `is_published`), `PATCH /api/olympiad/album/{id}/` (JSON `caption`, `order`, `is_published`), `DELETE`; `/media/` static.

- [ ] **Step 1: Failing тестүүд**

`backend/tests/test_olympiad_write.py`:
```python
import io

from PIL import Image

from tests.helpers import login, staff_headers

STAGE = {"year": 2026, "order": 1, "title": "Бүртгэл", "date_text": "2026 · 10 сар", "date": None, "text": "", "tags": ["Онлайн"], "location": ""}


async def test_stage_write_requires_staff(client, make_user):
    r = await client.post("/api/olympiad/schedule/", json=STAGE)
    assert r.status_code == 401
    await make_user("plain")
    t = await login(client, "plain")
    r = await client.post("/api/olympiad/schedule/", json=STAGE, headers={"Authorization": f"Bearer {t['access']}"})
    assert r.status_code == 403


async def test_stage_crud(client, make_user):
    h = await staff_headers(client, make_user)
    r = await client.post("/api/olympiad/schedule/", json=STAGE, headers=h)
    assert r.status_code == 201, r.text
    sid = r.json()["id"]
    r = await client.patch(f"/api/olympiad/schedule/{sid}/", json={"title": "Бүртгэл 2"}, headers=h)
    assert r.status_code == 200 and r.json()["title"] == "Бүртгэл 2" and r.json()["tags"] == ["Онлайн"]
    r = await client.delete(f"/api/olympiad/schedule/{sid}/", headers=h)
    assert r.status_code == 204
    assert (await client.get("/api/olympiad/schedule/")).json() == []


async def test_stage_duplicate_order_is_field_error(client, make_user):
    h = await staff_headers(client, make_user)
    await client.post("/api/olympiad/schedule/", json=STAGE, headers=h)
    r = await client.post("/api/olympiad/schedule/", json=STAGE, headers=h)
    assert r.status_code == 400
    assert r.json() == {"order": ["Энэ онд ийм дараалалтай шат аль хэдийн байна."]}


async def test_stage_validation_error(client, make_user):
    h = await staff_headers(client, make_user)
    r = await client.post("/api/olympiad/schedule/", json={**STAGE, "year": "abc"}, headers=h)
    assert r.status_code == 400
    assert r.json() == {"year": ["Бүхэл тоо оруулна уу."]}


async def test_result_crud(client, make_user):
    h = await staff_headers(client, make_user)
    body = {"year": 2025, "category": "9", "last_name": "Бат", "first_name": "А", "school": "", "code": "",
            "scores": [7, None, 5], "score": 12, "rank_label": "I", "medal": "АЛТ", "note": ""}
    r = await client.post("/api/olympiad/results/", json=body, headers=h)
    assert r.status_code == 201, r.text
    rid = r.json()["id"]
    assert r.json()["student"] == "Б.А" and r.json()["rank"] == 1 and r.json()["scores"] == [7.0, None, 5.0]
    r = await client.patch(f"/api/olympiad/results/{rid}/", json={"score": 20}, headers=h)
    assert r.json()["score"] == 20.0
    r = await client.delete(f"/api/olympiad/results/{rid}/", headers=h)
    assert r.status_code == 204
    assert (await client.delete(f"/api/olympiad/results/{rid}/", headers=h)).status_code == 404


def png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), "blue").save(buf, format="PNG")
    return buf.getvalue()


async def test_album_upload_patch_delete(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await staff_headers(client, make_user)
    r = await client.post("/api/olympiad/album/", headers=h,
                          files={"image": ("photo.png", png_bytes(), "image/png")},
                          data={"caption": "Анхны хичээл", "order": "1", "is_published": "false"})
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    assert r.json()["image"].startswith("http://test/media/album/") and r.json()["image"].endswith(".png")
    assert (await client.get("/api/olympiad/album/")).json() == []
    assert len((await client.get("/api/olympiad/album/", headers=h)).json()) == 1
    r = await client.patch(f"/api/olympiad/album/{pid}/", json={"is_published": True}, headers=h)
    assert r.status_code == 200
    assert len((await client.get("/api/olympiad/album/")).json()) == 1
    assert (tmp_path / "album").exists() and len(list((tmp_path / "album").iterdir())) == 1
    r = await client.delete(f"/api/olympiad/album/{pid}/", headers=h)
    assert r.status_code == 204
    assert list((tmp_path / "album").iterdir()) == []


async def test_album_rejects_non_image(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await staff_headers(client, make_user)
    r = await client.post("/api/olympiad/album/", headers=h,
                          files={"image": ("x.txt", b"hello", "text/plain")}, data={"caption": "х"})
    assert r.status_code == 400
    assert r.json() == {"image": ["Зөвхөн JPG, PNG, WebP зураг хүлээн авна."]}
```

- [ ] **Step 2: Тест унаж байгааг батлах**

Run: `uv run pytest tests/test_olympiad_write.py -v`
Expected: FAIL (405/404).

- [ ] **Step 3: media.py**

`backend/app/common/media.py`:
```python
"""Файл хадгалах (MEDIA_DIR). Зургийг uuid нэрээр хадгална."""

import io
import uuid
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from ..config import settings
from .errors import FieldError

ALLOWED = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


async def save_upload(upload: UploadFile, subdir: str, field: str = "image") -> str:
    """Зургийг шалгаад хадгална; MEDIA_DIR-ээс хамаарах зам ("album/uuid.jpg") буцаана."""
    data = await upload.read()
    try:
        fmt = Image.open(io.BytesIO(data)).format
    except UnidentifiedImageError:
        fmt = None
    if fmt not in ALLOWED:
        raise FieldError(field, "Зөвхөн JPG, PNG, WebP зураг хүлээн авна.")
    rel = f"{subdir}/{uuid.uuid4().hex}{ALLOWED[fmt]}"
    path: Path = settings.media_dir / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return rel


def delete_file(rel: str) -> None:
    p = settings.media_dir / rel
    if p.is_file():
        p.unlink()
```

- [ ] **Step 4: router.py-д бичих endpoint-ууд нэмэх**

`backend/app/olympiad/router.py`-ийн импортод нэмэх:
```python
from fastapi import File, Form, HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError

from ..auth.deps import require_staff
from ..common.errors import FieldError
from ..common.media import delete_file, save_upload
from .schemas import ResultIn, ResultPatch, StageIn, StagePatch
```

Модулийн доод хэсэгт нэмэх:
```python
Staff = Annotated[User, Depends(require_staff)]


async def _get_or_404(db: AsyncSession, model, id: int):
    obj = await db.get(model, id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return obj


# ---- шатууд ----
@router.post("/schedule/", response_model=StageOut, status_code=201)
async def stage_create(body: StageIn, db: DB, _: Staff):
    s = Stage(**body.model_dump())
    db.add(s)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise FieldError("order", "Энэ онд ийм дараалалтай шат аль хэдийн байна.")
    await db.commit()
    return s


@router.patch("/schedule/{id}/", response_model=StageOut)
async def stage_patch(id: int, body: StagePatch, db: DB, _: Staff):
    s = await _get_or_404(db, Stage, id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise FieldError("order", "Энэ онд ийм дараалалтай шат аль хэдийн байна.")
    await db.commit()
    return s


@router.delete("/schedule/{id}/", status_code=204)
async def stage_delete(id: int, db: DB, _: Staff):
    s = await _get_or_404(db, Stage, id)
    await db.delete(s)
    await db.commit()


# ---- үр дүн ----
async def _rank_of(db: AsyncSession, r: Result) -> int | None:
    rows = (await db.execute(_ranked_results_query(r.year, r.category))).all()
    return next((int(rank) for row, rank in rows if row.id == r.id), None)


@router.post("/results/", response_model=ResultOut, status_code=201)
async def result_create(body: ResultIn, db: DB, _: Staff):
    r = Result(**body.model_dump())
    db.add(r)
    await db.commit()
    return result_out(r, await _rank_of(db, r))


@router.patch("/results/{id}/", response_model=ResultOut)
async def result_patch(id: int, body: ResultPatch, db: DB, _: Staff):
    r = await _get_or_404(db, Result, id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    await db.commit()
    return result_out(r, await _rank_of(db, r))


@router.delete("/results/{id}/", status_code=204)
async def result_delete(id: int, db: DB, _: Staff):
    r = await _get_or_404(db, Result, id)
    await db.delete(r)
    await db.commit()


# ---- албум ----
def _to_bool(v: str | None, default: bool) -> bool:
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


@router.post("/album/", response_model=AlbumOut, status_code=201)
async def album_create(request: Request, db: DB, _: Staff,
                       image: Annotated[UploadFile, File()], caption: Annotated[str, Form()],
                       order: Annotated[int, Form()] = 1, is_published: Annotated[str | None, Form()] = None):
    rel = await save_upload(image, "album")
    p = AlbumPhoto(image=rel, caption=caption, order=order, is_published=_to_bool(is_published, True))
    db.add(p)
    await db.commit()
    return album_out(request, p)


@router.patch("/album/{id}/", response_model=AlbumOut)
async def album_patch(id: int, body: AlbumPatch, request: Request, db: DB, _: Staff):
    p = await _get_or_404(db, AlbumPhoto, id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    await db.commit()
    return album_out(request, p)


@router.delete("/album/{id}/", status_code=204)
async def album_delete(id: int, db: DB, _: Staff):
    p = await _get_or_404(db, AlbumPhoto, id)
    delete_file(p.image)
    await db.delete(p)
    await db.commit()
```
(`AlbumPatch`-ийг `schemas.py`-ээс импортолно: `from .schemas import AlbumPatch, ResultIn, ResultPatch, StageIn, StagePatch`.)

`backend/app/main.py`-д media static:
```python
from fastapi.staticfiles import StaticFiles

settings.media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")
```

- [ ] **Step 5: Тест давахыг батлах**

Run: `uv run pytest -v`
Expected: бүгд PASS. Тэмдэглэл: тестийн `db` fixture дээр `db.commit()` нь savepoint-ийн commit тул гадна transaction rollback хэвээр.

---

### Task 8: Excel импорт

**Files:**
- Create: `backend/app/olympiad/importer.py`
- Modify: `backend/app/olympiad/router.py`
- Test: `backend/tests/test_import.py`

**Interfaces:**
- Produces: `importer.parse_workbook(source: bytes, year: int | None) -> ParsedWorkbook` (Django хувилбартай ижил: `sheets: list[SheetResult]`, `detected_date`, `total`; `SheetResult.rows: list[dict]` — Result-ийн талбарууд), `importer.import_workbook(db, parsed, year, replace=True) -> {"deleted", "created"}`; endpoint `POST /api/olympiad/results/import/`.

- [ ] **Step 1: Failing тест (Excel fixture-ийг openpyxl-ээр үүсгэнэ)**

`backend/tests/test_import.py`:
```python
import io
from datetime import datetime

from openpyxl import Workbook

from tests.helpers import staff_headers


def workbook_bytes() -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "suragch_IX"
    ws.append(["Ү.Маамын нэрэмжит олимпиад", None, None])
    ws.append(["Огноо:", datetime(2026, 2, 21)])
    ws.append(["№", "Овог", "Нэр", "Сургууль", "1", "2", "3", "Нийт оноо", "Байр", "Медаль"])
    ws.append([1, "Бат", "А", "Шинэ Үе", 7, 7, 6, 20, "I", "АЛТ"])
    ws.append([2, "Дорж", "Б", "1-р сургууль", 7, 0, 5, None, "II", "МӨНГӨ"])
    ws.append([3, None, None, None, None, None, None, None, None, None])
    ws2 = wb.create_sheet("bagsh_baga")
    ws2.append(["№", "Овог", "Нэр", "Сургууль", "Шифр", "1", "2", "Нийт оноо", "Байр", "Медаль"])
    ws2.append([1, "Цэнд", "В", "Шинэ Үе", 1042, 5, 5, 10, "", ""])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


async def test_import_dry_run_then_import(client, make_user):
    h = await staff_headers(client, make_user)
    files = {"file": ("дүн.xlsx", workbook_bytes(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = await client.post("/api/olympiad/results/import/", headers=h, files=files, data={"dry_run": "true"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["year"] == 2026 and body["detected_date"] == "2026-02-21" and body["dry_run"] is True
    assert body["total"] == 3
    assert [s["category"] for s in body["sheets"]] == ["9", "teacher_primary"]
    assert body["sheets"][0]["problems"] == 3 and body["sheets"][0]["count"] == 2 and body["sheets"][0]["skipped"] == 1
    assert "deleted" not in body
    assert (await client.get("/api/olympiad/results/?year=2026")).json() == []

    r = await client.post("/api/olympiad/results/import/", headers=h,
                          files={"file": ("дүн.xlsx", workbook_bytes(), "application/octet-stream")},
                          data={"dry_run": "false", "replace": "true", "year": "2026"})
    body = r.json()
    assert body["created"] == 3 and body["deleted"] == 0
    res = (await client.get("/api/olympiad/results/?year=2026&category=9")).json()
    assert [(x["student"], x["score"], x["rank"], x["medal"]) for x in res] == [("Б.А", 20.0, 1, "АЛТ"), ("Д.Б", 12.0, 2, "МӨНГӨ")]
    teacher = (await client.get("/api/olympiad/results/?year=2026&category=teacher_primary")).json()
    assert teacher[0]["code"] == "1042"

    r = await client.post("/api/olympiad/results/import/", headers=h,
                          files={"file": ("дүн.xlsx", workbook_bytes(), "application/octet-stream")},
                          data={"dry_run": "false", "replace": "true", "year": "2026"})
    assert r.json()["deleted"] == 3 and r.json()["created"] == 3


async def test_import_rejects_non_excel(client, make_user):
    h = await staff_headers(client, make_user)
    r = await client.post("/api/olympiad/results/import/", headers=h, files={"file": ("a.csv", b"x", "text/csv")})
    assert r.status_code == 400
    assert r.json() == {"file": ["Зөвхөн Excel (.xlsx) файл хүлээн авна."]}
```

- [ ] **Step 2: Тест унаж байгааг батлах**

Run: `uv run pytest tests/test_import.py -v`
Expected: FAIL (404/405).

- [ ] **Step 3: importer.py (Django хувилбарыг ORM-оос салгаж хуулна)**

`backend/app/olympiad/importer.py`:
```python
"""
Олимпиадын дүнгийн Excel файлыг уншиж Result мөрүүд болгоно.

Хүлээгдэж буй бүтэц (sheet бүр нэг ангилал):
    A1        : гарчиг
    ...       : "Ангилал:" мөрөнд "VI анги" / "Бага ангийн багш" гэх мэт
    толгой мөр: № | Овог | Нэр | Сургууль | [Шифр] | 1 | 2 | ... | Нийт оноо | Байр | Медаль
    дараа нь  : оролцогч бүр нэг мөр

Sheet-ийн нэр (suragch_VI, bagsh_baga ...) эсвэл "Ангилал:" мөрөөс ангиллыг таньна.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO

from python_calamine import CalamineWorkbook
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from .models import CATEGORY_LABELS, Result

ROMAN = {"VI": "6", "VII": "7", "VIII": "8", "IX": "9", "X": "10", "XI": "11", "XII": "12"}
SHEET_CATEGORY = {
    "suragch_vi": "6", "suragch_vii": "7", "suragch_viii": "8", "suragch_ix": "9",
    "suragch_x": "10", "suragch_xi": "11", "suragch_xii": "12",
    "bagsh_baga": "teacher_primary", "bagsh_dund": "teacher_secondary",
}
RANKS = {"I", "II", "III"}
MEDALS = {"АЛТ", "МӨНГӨ", "ХҮРЭЛ"}


@dataclass
class SheetResult:
    sheet: str
    category: str | None
    category_label: str
    problems: int = 0
    rows: list[dict] = field(default_factory=list)
    skipped: int = 0
    warnings: list[str] = field(default_factory=list)

    def summary(self) -> dict:
        return {
            "sheet": self.sheet, "category": self.category, "category_label": self.category_label,
            "problems": self.problems, "count": len(self.rows), "skipped": self.skipped,
            "warnings": self.warnings[:20],
        }


@dataclass
class ParsedWorkbook:
    sheets: list[SheetResult]
    detected_date: date | None

    @property
    def total(self) -> int:
        return sum(len(s.rows) for s in self.sheets)


def _text(v) -> str:
    return "" if v is None else str(v).strip()


def _num(v) -> Decimal | None:
    if v is None or v == "" or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return Decimal(str(v))
    try:
        return Decimal(str(v).strip().replace(",", "."))
    except Exception:
        return None


def _fmt_code(v) -> str:
    n = _num(v)
    if n is not None and n == n.to_integral_value():
        return str(int(n))
    return _text(v)


def detect_category(sheet_name: str, rows: list[list]) -> str | None:
    key = sheet_name.strip().lower()
    if key in SHEET_CATEGORY:
        return SHEET_CATEGORY[key]
    for r in rows[:12]:
        cells = [_text(c) for c in r]
        if cells and cells[0].lower().startswith("ангилал"):
            label = " ".join(c for c in cells[1:] if c).upper()
            m = re.search(r"\b(VI|VII|VIII|IX|X|XI|XII)\b", label)
            if m:
                return ROMAN[m.group(1)]
            if "БАГА" in label:
                return "teacher_primary"
            if "ДУНД" in label:
                return "teacher_secondary"
    return None


def parse_sheet(name: str, rows: list[list], year: int) -> SheetResult:
    category = detect_category(name, rows)
    label = CATEGORY_LABELS[category] if category else "Танигдсангүй"
    res = SheetResult(sheet=name, category=category, category_label=label)
    if not category:
        res.warnings.append("Ангиллыг танисангүй (sheet-ийн нэр эсвэл 'Ангилал:' мөр). Алгасав.")
        return res

    hdr_i = next((i for i, r in enumerate(rows) if r and _text(r[0]) == "№" and "Овог" in [_text(c) for c in r]), None)
    if hdr_i is None:
        res.warnings.append("Толгой мөр (№ | Овог | Нэр ...) олдсонгүй. Алгасав.")
        return res
    hdr = [_text(c) for c in rows[hdr_i]]

    def col(name: str) -> int | None:
        for i, h in enumerate(hdr):
            if h.lower() == name.lower():
                return i
        return None

    c_last, c_first, c_school = col("Овог"), col("Нэр"), col("Сургууль")
    c_code, c_total, c_rank, c_medal = col("Шифр"), col("Нийт оноо"), col("Байр"), col("Медаль")
    problem_cols = [i for i, h in enumerate(hdr) if re.fullmatch(r"\d+(\.0)?", h)]
    res.problems = len(problem_cols)
    if c_first is None:
        res.warnings.append("'Нэр' багана олдсонгүй. Алгасав.")
        return res

    for r_i, r in enumerate(rows[hdr_i + 1:], start=hdr_i + 2):
        def get(i):
            return r[i] if i is not None and i < len(r) else None

        last, first = _text(get(c_last)), _text(get(c_first))
        school = _text(get(c_school))
        scores = [_num(get(i)) for i in problem_cols]
        has_scores = any(s is not None for s in scores)
        if not first and not last and not has_scores:
            res.skipped += 1
            continue
        if not first and not last:
            res.warnings.append(f"{r_i}-р мөр: нэргүй боловч оноотой. Алгасав.")
            res.skipped += 1
            continue

        total = _num(get(c_total))
        if total is None and has_scores:
            total = sum(s for s in scores if s is not None)

        rank_label = _text(get(c_rank)).upper()
        medal = _text(get(c_medal)).upper()
        if rank_label and rank_label not in RANKS:
            res.warnings.append(f"{r_i}-р мөр: 'Байр' утга танигдсангүй: {rank_label!r}")
            rank_label = ""
        if medal and medal not in MEDALS:
            res.warnings.append(f"{r_i}-р мөр: 'Медаль' утга танигдсангүй: {medal!r}")
            medal = ""

        res.rows.append(dict(
            year=year, category=category,
            last_name=last[:80], first_name=(first or "*")[:80], school=school[:160],
            code=_fmt_code(get(c_code))[:30],
            scores=[float(s) if s is not None else None for s in scores],
            score=total, rank_label=rank_label, medal=medal,
        ))
    return res


def detect_date(rows: list[list]) -> date | None:
    for r in rows[:6]:
        for c in r:
            if isinstance(c, datetime):
                return c.date()
            if isinstance(c, date):
                return c
    return None


def parse_workbook(source: bytes, year: int | None = None) -> ParsedWorkbook:
    wb = CalamineWorkbook.from_filelike(BytesIO(source))
    all_rows = {name: wb.get_sheet_by_name(name).to_python(skip_empty_area=False) for name in wb.sheet_names}
    detected = None
    for rows in all_rows.values():
        detected = detect_date(rows)
        if detected:
            break
    if year is None:
        year = detected.year if detected else date.today().year
    return ParsedWorkbook(sheets=[parse_sheet(n, r, year) for n, r in all_rows.items()], detected_date=detected)


async def import_workbook(db: AsyncSession, parsed: ParsedWorkbook, year: int, replace: bool = True) -> dict:
    """Уншсан мөрүүдийг баазад хадгална. replace=True бол тухайн он + ангиллын хуучин мөрүүдийг устгана."""
    deleted = created = 0
    categories = [s.category for s in parsed.sheets if s.category and s.rows]
    if replace and categories:
        res = await db.execute(delete(Result).where(Result.year == year, Result.category.in_(categories)))
        deleted = res.rowcount or 0
    for s in parsed.sheets:
        for row in s.rows:
            db.add(Result(**{**row, "year": year}))
        created += len(s.rows)
    await db.commit()
    return {"deleted": deleted, "created": created}
```

- [ ] **Step 4: router.py-д import endpoint нэмэх**

```python
from .importer import import_workbook, parse_workbook


@router.post("/results/import/")
async def results_import(db: DB, _: Staff, file: Annotated[UploadFile, File()],
                         year: Annotated[int | None, Form()] = None,
                         dry_run: Annotated[str | None, Form()] = None,
                         replace: Annotated[str | None, Form()] = None):
    """Excel-ээс үр дүн импортлох. dry_run=true бол зөвхөн шалгаад тайлан буцаана."""
    if not (file.filename or "").lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise FieldError("file", "Зөвхөн Excel (.xlsx) файл хүлээн авна.")
    if year is not None and not (2000 <= year <= 2100):
        raise FieldError("year", "Он 2000–2100 хооронд байх ёстой.")
    try:
        parsed = parse_workbook(await file.read(), year)
    except Exception as e:  # noqa: BLE001
        raise FieldError("file", f"Файлыг уншиж чадсангүй: {e}")
    year = year or (parsed.detected_date.year if parsed.detected_date else None)
    if not year:
        raise FieldError("year", "Оныг тодорхойлж чадсангүй. Оноо оруулна уу.")
    is_dry = _to_bool(dry_run, False)
    payload = {
        "year": year, "detected_date": parsed.detected_date.isoformat() if parsed.detected_date else None,
        "total": parsed.total, "sheets": [s.summary() for s in parsed.sheets], "dry_run": is_dry,
    }
    if not is_dry:
        payload.update(await import_workbook(db, parsed, year, replace=_to_bool(replace, True)))
    return payload
```
Анхаар: `/results/import/` замыг `/results/{id}/`-ээс **өмнө** тодорхойлно, эс тэгвэл `import` нь id гэж танигдана. `result_patch`/`result_delete`-ийн `id: int` тул `import` string-д validation алдаа өгнө; аюулгүй байхын тулд import функцийг файлд тэдгээрээс дээр байрлуулна.

- [ ] **Step 5: Тест давахыг батлах**

Run: `uv run pytest -v`
Expected: бүгд PASS.

---

### Task 9: Seed скрипт

**Files:**
- Create: `backend/scripts/seed.py`

**Interfaces:**
- Produces: `uv run python scripts/seed.py [--reset]` — Django-ийн `seed_olympiad`-тай ижил жишээ өгөгдөл.

- [ ] **Step 1: seed.py**

```python
"""
Прототипийн жишээ өгөгдлийг (хуваарь, үр дүн) баазад оруулна.

    uv run python scripts/seed.py           # хоосон бол л оруулна
    uv run python scripts/seed.py --reset   # хуучныг устгаад дахин оруулна

⚠ Жишээ мэдээлэл. Бодит дүнг админ дашбоардаас эсвэл Excel импортоор оруулна.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, func, select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.olympiad.models import Result, Stage  # noqa: E402

SCHEDULES = {
    2024: [
        ("2024 · 10 сарын 2–18", "Бүртгэл", "6–12-р ангийн сурагчдын бүртгэл онлайнаар явагдсан.", ["6–12-р анги", "Онлайн"]),
        ("2024 · 11 сарын 9", "I шат — Сургуулийн", "Сургууль бүр дээрээ явагдсан. Анги бүрээс шилдэг 5 сурагч шалгарсан.", ["90 минут", "5 бодлого"]),
        ("2024 · 12 сарын 14", "II шат — Дүүргийн", "Дүүргийн шилдгүүд өрсөлдөж, бүлэг тус бүрээс 10 сурагч шалгарсан.", ["120 минут", "6 бодлого"]),
        ("2025 · 2 сарын 22", "III шат — Шигшээ", "Ү.Маамын нэрэмжит шигшээ олимпиад Шинэ Үе сургууль дээр явагдсан.", ["180 минут", "4 бодлого"]),
        ("2025 · 3 сарын 8", "Шагнал гардуулах ёслол", "Анги бүрийн эхний 3 байр медаль, өргөмжлөлөөр шагнагдсан.", ["Медаль", "Өргөмжлөл"]),
    ],
    2025: [
        ("2025 · 10 сарын 1–17", "Бүртгэл", "6–12-р ангийн сурагчдын бүртгэл онлайнаар явагдсан.", ["6–12-р анги", "Онлайн"]),
        ("2025 · 11 сарын 8", "I шат — Сургуулийн", "Сургууль бүр дээрээ явагдсан. Анги бүрээс шилдэг 5 сурагч шалгарсан.", ["90 минут", "5 бодлого"]),
        ("2025 · 12 сарын 13", "II шат — Дүүргийн", "Дүүргийн шилдгүүд өрсөлдөж, бүлэг тус бүрээс 10 сурагч шалгарсан.", ["120 минут", "6 бодлого"]),
        ("2026 · 2 сарын 21", "III шат — Шигшээ", "Ү.Маамын нэрэмжит шигшээ олимпиад Шинэ Үе сургууль дээр явагдсан.", ["180 минут", "4 бодлого"]),
        ("2026 · 3 сарын 7", "Шагнал гардуулах ёслол", "Анги бүрийн эхний 3 байр медаль, өргөмжлөлөөр шагнагдсан.", ["Медаль", "Өргөмжлөл"]),
    ],
    2026: [
        ("2026 · 10 сарын 1–20", "Бүртгэл", "Сургууль бүр 6–12-р ангийн сурагчдаа бүртгүүлнэ. Бүртгэл онлайнаар явагдана.", ["6–12-р анги", "Онлайн"]),
        ("2026 · 11 сарын 7", "I шат — Сургуулийн", "Сургууль бүр дээрээ явагдана. Анги бүрээс шилдэг 5 сурагч дараагийн шатанд шалгарна.", ["90 минут", "5 бодлого"]),
        ("2026 · 12 сарын 12", "II шат — Дүүргийн", "Дүүргийн сургуулиудын шилдгүүд өрсөлдөнө. Ангийн бүлэг тус бүрээс 10 сурагч шалгарна.", ["120 минут", "6 бодлого"]),
        ("2027 · 2 сарын 20", "III шат — Шигшээ", "Ү.Маамын нэрэмжит шигшээ олимпиад. Шинэ Үе сургууль дээр явагдана.", ["180 минут", "4 бодлого"]),
        ("2027 · 3 сарын 6", "Шагнал гардуулах ёслол", "Анги бүрийн эхний 3 байр медаль, өргөмжлөлөөр шагнагдана.", ["Медаль", "Өргөмжлөл"]),
    ],
}

RESULTS = {
    2024: {
        6: [("Сурагч А", "Шинэ Үе сургууль", 92), ("Сурагч Б", "1-р сургууль", 88), ("Сурагч В", "23-р сургууль", 85), ("Сурагч Г", "11-р сургууль", 79)],
        7: [("Сурагч Д", "Шинэ Үе сургууль", 94), ("Сурагч Е", "5-р сургууль", 87), ("Сурагч Ж", "45-р сургууль", 81)],
        8: [("Сурагч З", "2-р сургууль", 90), ("Сурагч И", "Шинэ Үе сургууль", 89), ("Сурагч К", "18-р сургууль", 83), ("Сурагч Л", "33-р сургууль", 76)],
        9: [("Сурагч М", "Шинэ Үе сургууль", 95), ("Сурагч Н", "Орчлон сургууль", 88), ("Сурагч О", "3-р сургууль", 80)],
        10: [("Сурагч П", "Сант сургууль", 91), ("Сурагч Р", "Шинэ Үе сургууль", 90), ("Сурагч С", "14-р сургууль", 82)],
        11: [("Сурагч Т", "Шинэ Үе сургууль", 96), ("Сурагч У", "Монгени сургууль", 92), ("Сурагч Ф", "28-р сургууль", 85), ("Сурагч Х", "50-р сургууль", 78)],
        12: [("Сурагч Ц", "Шинэ Үе сургууль", 97), ("Сурагч Ч", "Хобби сургууль", 93), ("Сурагч Ш", "1-р сургууль", 86)],
    },
    2025: {
        6: [("Сурагч А", "Шинэ Үе сургууль", 95), ("Сурагч Б", "1-р сургууль", 91), ("Сурагч В", "23-р сургууль", 88), ("Сурагч Г", "Шинэ Үе сургууль", 84), ("Сурагч Д", "11-р сургууль", 80)],
        7: [("Сурагч Е", "Шинэ Үе сургууль", 97), ("Сурагч Ж", "5-р сургууль", 90), ("Сурагч З", "Шинэ Үе сургууль", 86), ("Сурагч И", "45-р сургууль", 79)],
        8: [("Сурагч К", "Шинэ Үе сургууль", 93), ("Сурагч Л", "2-р сургууль", 92), ("Сурагч М", "Шинэ Үе сургууль", 85), ("Сурагч Н", "18-р сургууль", 81), ("Сурагч О", "33-р сургууль", 77)],
        9: [("Сурагч П", "Шинэ Үе сургууль", 96), ("Сурагч Р", "Орчлон сургууль", 89), ("Сурагч С", "Шинэ Үе сургууль", 87), ("Сурагч Т", "3-р сургууль", 82)],
        10: [("Сурагч У", "Шинэ Үе сургууль", 94), ("Сурагч Ф", "Сант сургууль", 90), ("Сурагч Х", "14-р сургууль", 83), ("Сурагч Ц", "Шинэ Үе сургууль", 78)],
        11: [("Сурагч Ч", "Шинэ Үе сургууль", 98), ("Сурагч Ш", "Монгени сургууль", 93), ("Сурагч Щ", "Шинэ Үе сургууль", 88), ("Сурагч Э", "28-р сургууль", 84), ("Сурагч Ю", "50-р сургууль", 80)],
        12: [("Сурагч Я", "Шинэ Үе сургууль", 99), ("Сурагч А.А", "Хобби сургууль", 95), ("Сурагч Б.Б", "Шинэ Үе сургууль", 90), ("Сурагч В.В", "1-р сургууль", 86)],
    },
}


async def main(reset: bool) -> None:
    async with SessionLocal() as db:
        if reset:
            await db.execute(delete(Stage))
            await db.execute(delete(Result))
        n = (await db.execute(select(func.count(Stage.id)))).scalar_one() + (await db.execute(select(func.count(Result.id)))).scalar_one()
        if n:
            print("Өгөгдөл аль хэдийн байна. --reset ашиглана уу.")
            return
        stages = [Stage(year=y, order=i + 1, date_text=d, title=t, text=tx, tags=tags)
                  for y, items in SCHEDULES.items() for i, (d, t, tx, tags) in enumerate(items)]
        results = [
            Result(year=y, category=str(g), last_name=s.split(" ", 1)[0], first_name=s.split(" ", 1)[1] if " " in s else s,
                   school=sc, score=score, rank_label=["I", "II", "III"][i] if i < 3 else "",
                   medal=["АЛТ", "МӨНГӨ", "ХҮРЭЛ"][i] if i < 3 else "")
            for y, grades in RESULTS.items() for g, rows in grades.items() for i, (s, sc, score) in enumerate(rows)
        ]
        db.add_all(stages + results)
        await db.commit()
        print(f"{len(stages)} шат, {len(results)} үр дүн орлоо.")


if __name__ == "__main__":
    asyncio.run(main("--reset" in sys.argv))
```

- [ ] **Step 2: Ажиллуулж шалгах**

Run: `uv run python scripts/seed.py` → `15 шат, 55 үр дүн орлоо.`
Run: `uv run uvicorn app.main:app --port 8000` (тусдаа терминал) → `curl http://127.0.0.1:8000/api/olympiad/years/` → `{"schedule":[2024,2025,2026],"results":[2024,2025]}`.

---

### Task 10: Хэрэглэгч удирдах API (superuser)

**Files:**
- Modify: `backend/app/auth/schemas.py`, `backend/app/auth/router.py`
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Produces: `GET /api/auth/users/` → `[UserOut]`, `POST /api/auth/users/` (`{username, password, full_name, email, is_active, is_superuser, roles: [code]}`) → 201, `PATCH /api/auth/users/{id}/` (бүх талбар сонголттой, `password` өгвөл солино), `DELETE /api/auth/users/{id}/` → 204 (өөрийгөө устгаж болохгүй → 400 `non_field_errors`). `UserOut = MeOut + is_active`. `GET /api/auth/roles/` → `[{code, name}]`.

- [ ] **Step 1: Failing тестүүд**

`backend/tests/test_auth.py`-д нэмэх:
```python
async def su_headers(client, make_user):
    await make_user("root", superuser=True)
    t = await login(client, "root")
    return {"Authorization": f"Bearer {t['access']}"}


async def test_users_requires_superuser(client, make_user):
    await make_user("mgr", roles=["manager"])
    t = await login(client, "mgr")
    r = await client.get("/api/auth/users/", headers={"Authorization": f"Bearer {t['access']}"})
    assert r.status_code == 403


async def test_users_crud(client, make_user):
    h = await su_headers(client, make_user)
    r = await client.get("/api/auth/roles/", headers=h)
    assert r.status_code == 200 and {x["code"] for x in r.json()} >= {"manager"}
    r = await client.post("/api/auth/users/", headers=h, json={
        "username": "bat", "password": "pass1234", "full_name": "Бат", "email": "b@x.mn", "roles": ["manager"]})
    assert r.status_code == 201, r.text
    uid = r.json()["id"]
    assert r.json()["roles"] == ["manager"] and r.json()["is_staff"] is True and r.json()["is_active"] is True
    assert "password" not in r.json() and "password_hash" not in r.json()
    r = await client.post("/api/auth/users/", headers=h, json={"username": "bat", "password": "pass1234"})
    assert r.status_code == 400 and r.json() == {"username": ["Ийм нэвтрэх нэртэй хэрэглэгч байна."]}
    r = await client.patch(f"/api/auth/users/{uid}/", headers=h, json={"roles": [], "password": "newpass99"})
    assert r.json()["roles"] == [] and r.json()["is_staff"] is False
    t = await login(client, "bat", "newpass99")
    assert "access" in t
    users = (await client.get("/api/auth/users/", headers=h)).json()
    assert [u["username"] for u in users] == ["bat", "root"]
    r = await client.delete(f"/api/auth/users/{uid}/", headers=h)
    assert r.status_code == 204


async def test_cannot_delete_self(client, make_user):
    h = await su_headers(client, make_user)
    me = (await client.get("/api/auth/me/", headers=h)).json()
    r = await client.delete(f"/api/auth/users/{me['id']}/", headers=h)
    assert r.status_code == 400 and r.json() == {"non_field_errors": ["Өөрийгөө устгаж болохгүй."]}
```

- [ ] **Step 2: Тест унаж байгааг батлах**

Run: `uv run pytest tests/test_auth.py -v`
Expected: шинэ 3 тест FAIL (404).

- [ ] **Step 3: schemas.py-д нэмэх**

```python
class UserOut(MeOut):
    is_active: bool


class UserIn(BaseModel):
    username: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=6)
    full_name: str = ""
    email: str = ""
    is_active: bool = True
    is_superuser: bool = False
    roles: list[str] = []


class UserPatch(BaseModel):
    username: str | None = Field(default=None, min_length=1, max_length=150)
    password: str | None = Field(default=None, min_length=6)
    full_name: str | None = None
    email: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
    roles: list[str] | None = None


class RoleOut(BaseModel):
    code: str
    name: str
```
(`from pydantic import BaseModel, Field`.)

- [ ] **Step 4: router.py-д нэмэх**

```python
from sqlalchemy.exc import IntegrityError

from ..common.errors import FieldError
from .deps import require_superuser
from .models import ROLE_CODES, Role
from .schemas import RoleOut, UserIn, UserOut, UserPatch
from .security import hash_password

Super = Annotated[User, Depends(require_superuser)]


def user_out(u: User) -> UserOut:
    return UserOut(**me_out(u).model_dump(), is_active=u.is_active)


async def _roles(db: AsyncSession, codes: list[str]) -> list[Role]:
    bad = [c for c in codes if c not in ROLE_CODES]
    if bad:
        raise FieldError("roles", f"Танигдаагүй эрх: {', '.join(bad)}")
    if not codes:
        return []
    return list((await db.execute(select(Role).where(Role.code.in_(codes)))).scalars().all())


@router.get("/roles/", response_model=list[RoleOut])
async def roles_list(db: Annotated[AsyncSession, Depends(get_db)], _: Super):
    return (await db.execute(select(Role).order_by(Role.id))).scalars().all()


@router.get("/users/", response_model=list[UserOut])
async def users_list(db: Annotated[AsyncSession, Depends(get_db)], _: Super):
    return [user_out(u) for u in (await db.execute(select(User).order_by(User.username))).scalars().all()]


@router.post("/users/", response_model=UserOut, status_code=201)
async def users_create(body: UserIn, db: Annotated[AsyncSession, Depends(get_db)], _: Super):
    u = User(username=body.username, password_hash=hash_password(body.password), full_name=body.full_name,
             email=body.email, is_active=body.is_active, is_superuser=body.is_superuser,
             roles=await _roles(db, body.roles))
    db.add(u)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise FieldError("username", "Ийм нэвтрэх нэртэй хэрэглэгч байна.")
    await db.commit()
    return user_out(u)


@router.patch("/users/{id}/", response_model=UserOut)
async def users_patch(id: int, body: UserPatch, db: Annotated[AsyncSession, Depends(get_db)], _: Super):
    u = await db.get(User, id)
    if u is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    data = body.model_dump(exclude_unset=True)
    if "password" in data:
        u.password_hash = hash_password(data.pop("password"))
    if "roles" in data:
        u.roles = await _roles(db, data.pop("roles"))
    for k, v in data.items():
        setattr(u, k, v)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise FieldError("username", "Ийм нэвтрэх нэртэй хэрэглэгч байна.")
    await db.commit()
    return user_out(u)


@router.delete("/users/{id}/", status_code=204)
async def users_delete(id: int, db: Annotated[AsyncSession, Depends(get_db)], me: Super):
    if id == me.id:
        raise FieldError("non_field_errors", "Өөрийгөө устгаж болохгүй.")
    u = await db.get(User, id)
    if u is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    await db.delete(u)
    await db.commit()
```

- [ ] **Step 5: Тест давахыг батлах**

Run: `uv run pytest -v`
Expected: бүгд PASS.

---

### Task 11: Frontend — roles, цэс, хэрэглэгч ба албумын хуудас

**Files:**
- Modify: `frontend/src/lib/types.ts`, `frontend/src/lib/api.ts`, `frontend/src/app/admin/(dashboard)/layout.tsx`, `frontend/src/app/admin/(dashboard)/page.tsx`
- Create: `frontend/src/app/admin/(dashboard)/users/page.tsx`, `frontend/src/app/admin/(dashboard)/album/page.tsx`

**Interfaces:**
- Consumes: Task 3, 7, 10-ын endpoint-ууд.
- Produces: `User.roles`, `User.is_active?`, `Role`, `UserInput`; `api.users.{list, create, update, remove}`, `api.roles()`, `api.album.{list, create(file, caption, order, isPublished), update, remove}`.

- [ ] **Step 1: types.ts**

`User` интерфейсийг солих ба нэмэх:
```ts
export type RoleCode = "manager" | "olympiad" | "news";

export interface Role { code: RoleCode; name: string }

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  roles: RoleCode[];
  is_active?: boolean;   // зөвхөн /api/auth/users/ хариунд
}

export interface UserInput {
  username: string;
  password?: string;     // үүсгэхэд заавал, засахад сонголттой
  full_name: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  roles: RoleCode[];
}
```

- [ ] **Step 2: api.ts-д нэмэх**

Импортод `Role, UserInput, AlbumPhoto` нэмээд `api` объектод:
```ts
  /* ---- хэрэглэгч (superuser) ---- */
  roles: () => request<Role[]>("/api/auth/roles/"),
  users: {
    list: () => request<User[]>("/api/auth/users/"),
    create: (d: UserInput) => request<User>("/api/auth/users/", { method: "POST", body: d }),
    update: (id: number, d: Partial<UserInput>) => request<User>(`/api/auth/users/${id}/`, { method: "PATCH", body: d }),
    remove: (id: number) => request<void>(`/api/auth/users/${id}/`, { method: "DELETE" }),
  },

  /* ---- албум ---- */
  album: {
    list: () => request<AlbumPhoto[]>("/api/olympiad/album/"),
    create: (file: File, caption: string, order: number, isPublished: boolean) => {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("caption", caption);
      fd.append("order", String(order));
      fd.append("is_published", String(isPublished));
      return request<AlbumPhoto>("/api/olympiad/album/", { method: "POST", body: fd });
    },
    update: (id: number, d: { caption?: string; order?: number; is_published?: boolean }) =>
      request<AlbumPhoto>(`/api/olympiad/album/${id}/`, { method: "PATCH", body: d }),
    remove: (id: number) => request<void>(`/api/olympiad/album/${id}/`, { method: "DELETE" }),
  },
```
Мөн `types.ts`-ийн `AlbumPhoto`-д `is_published: boolean` талбар нэмнэ (backend Task 6-аас хойш буцаадаг).

- [ ] **Step 3: layout.tsx — цэсийг эрхээр шүүх, Django admin холбоосыг хасах**

`NAV`-ийг солих:
```ts
const NAV: { href: string; label: string; icon: string; exact?: boolean; superuser?: boolean }[] = [
  { href: "/admin", label: "Нүүр", icon: "▦" },
  { href: "/admin/schedule", label: "Олимпиадын хуваарь", icon: "◷" },
  { href: "/admin/results", label: "Олимпиадын үр дүн", icon: "★", exact: true },
  { href: "/admin/results/import", label: "Excel-ээс оруулах", icon: "⇪" },
  { href: "/admin/album", label: "Албумын зураг", icon: "▣" },
  { href: "/admin/users", label: "Хэрэглэгчид", icon: "♟", superuser: true },
];
```
Компонент дотор `const nav = NAV.filter((n) => !n.superuser || user.is_superuser);` гээд хоёр `NAV.map` хоёуланг нь `nav.map` болгоно. Хажуугийн цэсний доод `<div className="border-t ...">Django admin ↗</div>` блокийг бүхэлд нь устгана.

- [ ] **Step 4: page.tsx — албумын tile холбоос**

`{ label: "Албумын зураг", value: stats.photos, href: "#" }` → `href: "/admin/album"`.

- [ ] **Step 5: users/page.tsx**

`frontend/src/app/admin/(dashboard)/users/page.tsx`:
```tsx
"use client";

/* Хэрэглэгч удирдах (зөвхөн superuser): жагсаалт, нэмэх, засах, устгах, эрхийн бүлэг. */

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/lib/useFetch";
import type { RoleCode, User, UserInput } from "@/lib/types";
import { Badge, Button, Empty, Field, Input, Modal, Spinner, Table, Td, Th } from "@/components/ui";

const empty = (): UserInput => ({ username: "", password: "", full_name: "", email: "", is_active: true, is_superuser: false, roles: [] });

export default function UsersPage() {
  const { user: me } = useAuth();
  const usersQ = useFetch(() => api.users.list(), []);
  const rolesQ = useFetch(() => api.roles(), []);
  const [editing, setEditing] = useState<{ id?: number; data: UserInput } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (me && !me.is_superuser) return <p className="text-sm text-slate-600">Энэ хуудас зөвхөн superuser-т нээлттэй.</p>;

  const set = (patch: Partial<UserInput>) => editing && setEditing({ ...editing, data: { ...editing.data, ...patch } });

  function openEdit(u: User) {
    setErrors({});
    setEditing({ id: u.id, data: { username: u.username, password: "", full_name: u.full_name, email: u.email, is_active: u.is_active ?? true, is_superuser: u.is_superuser, roles: u.roles } });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true); setErrors({});
    try {
      const d = { ...editing.data };
      if (editing.id && !d.password) delete d.password;
      if (editing.id) await api.users.update(editing.id, d);
      else await api.users.create(d);
      setEditing(null);
      usersQ.reload();
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  async function remove(u: User) {
    if (!confirm(`"${u.username}" хэрэглэгчийг устгах уу?`)) return;
    try { await api.users.remove(u.id); usersQ.reload(); }
    catch (err) { alert(err instanceof ApiError ? Object.values(err.fieldErrors).join(" ") : "Устгаж чадсангүй."); }
  }

  const toggleRole = (code: RoleCode) => editing && set({ roles: editing.data.roles.includes(code) ? editing.data.roles.filter((r) => r !== code) : [...editing.data.roles, code] });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">Хэрэглэгчид</h1>
          <p className="text-sm text-slate-600">Админ дашбоардад нэвтрэх хэрэглэгчид ба тэдний эрх.</p>
        </div>
        <Button onClick={() => { setErrors({}); setEditing({ data: empty() }); }}>+ Хэрэглэгч нэмэх</Button>
      </div>

      {usersQ.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{usersQ.error}</p>}
      {usersQ.loading ? <Spinner /> : !usersQ.data?.length ? <Empty>Хэрэглэгч байхгүй.</Empty> : (
        <Table head={<><Th>Нэвтрэх нэр</Th><Th>Нэр</Th><Th>Эрх</Th><Th>Төлөв</Th><Th className="text-right">Үйлдэл</Th></>}>
          {usersQ.data.map((u) => (
            <tr key={u.id} className="border-t border-slate-100">
              <Td className="font-semibold">{u.username}</Td>
              <Td>{u.full_name}<div className="text-xs text-slate-500">{u.email}</div></Td>
              <Td className="space-x-1">
                {u.is_superuser && <Badge tone="gold">superuser</Badge>}
                {u.roles.map((r) => <Badge key={r}>{rolesQ.data?.find((x) => x.code === r)?.name ?? r}</Badge>)}
              </Td>
              <Td>{u.is_active ? <Badge tone="green">идэвхтэй</Badge> : <Badge tone="slate">идэвхгүй</Badge>}</Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => openEdit(u)}>Засах</Button>
                {u.id !== me?.id && <Button variant="danger" onClick={() => remove(u)}>Устгах</Button>}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!editing} title={editing?.id ? "Хэрэглэгч засах" : "Хэрэглэгч нэмэх"} onClose={() => setEditing(null)}
             footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Болих</Button><Button type="submit" form="user-form" disabled={busy}>Хадгалах</Button></>}>
        {editing && (
          <form id="user-form" onSubmit={save} className="space-y-4">
            {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
            <Field label="Нэвтрэх нэр" error={errors.username}><Input value={editing.data.username} onChange={(e) => set({ username: e.target.value })} required /></Field>
            <Field label={editing.id ? "Шинэ нууц үг (хоосон бол өөрчлөхгүй)" : "Нууц үг"} error={errors.password} hint="Хамгийн багадаа 6 тэмдэгт">
              <Input type="password" value={editing.data.password ?? ""} onChange={(e) => set({ password: e.target.value })} required={!editing.id} />
            </Field>
            <Field label="Бүтэн нэр" error={errors.full_name}><Input value={editing.data.full_name} onChange={(e) => set({ full_name: e.target.value })} /></Field>
            <Field label="И-мэйл" error={errors.email}><Input type="email" value={editing.data.email} onChange={(e) => set({ email: e.target.value })} /></Field>
            <Field label="Эрхийн бүлэг" error={errors.roles}>
              <div className="flex flex-wrap gap-3">
                {(rolesQ.data ?? []).map((r) => (
                  <label key={r.code} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editing.data.roles.includes(r.code)} onChange={() => toggleRole(r.code)} />{r.name}
                  </label>
                ))}
              </div>
            </Field>
            <div className="flex gap-6 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.data.is_superuser} onChange={(e) => set({ is_superuser: e.target.checked })} />Superuser</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.data.is_active} onChange={(e) => set({ is_active: e.target.checked })} />Идэвхтэй</label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
```

- [ ] **Step 6: album/page.tsx**

`frontend/src/app/admin/(dashboard)/album/page.tsx`:
```tsx
"use client";

/* Маам багшийн албумын зураг: оруулах, тайлбар, дараалал, нийтлэх, устгах. */

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AlbumPhoto } from "@/lib/types";
import { Button, Card, Empty, Field, Input, Modal, Spinner, Textarea } from "@/components/ui";

export default function AlbumPage() {
  const q = useFetch(() => api.album.list(), []);
  const [adding, setAdding] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [order, setOrder] = useState(1);
  const [published, setPublished] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!file) { setErrors({ image: "Зураг сонгоно уу." }); return; }
    setBusy(true); setErrors({});
    try {
      await api.album.create(file, caption, order, published);
      setAdding(false); setFile(null); setCaption(""); setOrder((o) => o + 1);
      q.reload();
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  async function patch(p: AlbumPhoto, d: { caption?: string; order?: number; is_published?: boolean }) {
    try { await api.album.update(p.id, d); q.reload(); } catch { alert("Хадгалж чадсангүй."); }
  }

  async function remove(p: AlbumPhoto) {
    if (!confirm("Зургийг устгах уу?")) return;
    try { await api.album.remove(p.id); q.reload(); } catch { alert("Устгаж чадсангүй."); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">Албумын зураг</h1>
          <p className="text-sm text-slate-600">Маам багшийн хуудасны дурсамжийн албум. Дарааллаар харагдана.</p>
        </div>
        <Button onClick={() => { setErrors({}); setAdding(true); }}>+ Зураг оруулах</Button>
      </div>

      {q.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>}
      {q.loading ? <Spinner /> : !q.data?.length ? <Empty>Зураг байхгүй.</Empty> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {q.data.map((p) => (
            <Card key={p.id} className="space-y-3">
              <div className="relative h-48 w-full overflow-hidden rounded-lg bg-slate-100">
                <Image src={p.image} alt="" fill unoptimized className="object-cover" />
              </div>
              <Textarea defaultValue={p.caption} onBlur={(e) => e.target.value !== p.caption && patch(p, { caption: e.target.value })} />
              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-1">Дараалал <Input type="number" className="w-16" defaultValue={p.order} onBlur={(e) => Number(e.target.value) !== p.order && patch(p, { order: Number(e.target.value) })} /></label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={p.is_published ?? true} onChange={(e) => patch(p, { is_published: e.target.checked })} />Нийтлэх</label>
                <Button variant="danger" className="ml-auto" onClick={() => remove(p)}>Устгах</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={adding} title="Зураг оруулах" onClose={() => setAdding(false)}
             footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Болих</Button><Button type="submit" form="album-form" disabled={busy}>Оруулах</Button></>}>
        <form id="album-form" onSubmit={save} className="space-y-4">
          {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
          <Field label="Зураг (JPG, PNG, WebP)" error={errors.image}><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
          <Field label="Тайлбар өгүүлбэр" error={errors.caption}><Textarea value={caption} onChange={(e) => setCaption(e.target.value)} required /></Field>
          <Field label="Дараалал" error={errors.order}><Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />Нийтлэх</label>
        </form>
      </Modal>
    </div>
  );
}
```
`next/image`-д backend-ийн хост зөвшөөрөгдөөгүй бол `unoptimized` нь үүнийг тойрно (дээр тавьсан).

- [ ] **Step 7: Шалгах**

```bash
cd frontend
npx tsc --noEmit -p tsconfig.json
npx eslint src
```
Expected: алдаагүй. Дараа нь `.claude/launch.json`-ын `frontend` ба шинэ `backend` тохиргоог (Task 12) асаагаад browser дээр: `/admin/login` → admin/admin1234 → цэсэнд "Албумын зураг", "Хэрэглэгчид" харагдана; хэрэглэгч нэмэх, зураг оруулах ажиллана; олимпиадын хуваарь, үр дүн, импорт хуудсууд өмнөх шигээ ажиллана.

---

### Task 12: Django-г устгах, launch.json ба README шинэчлэх

**Files:**
- Delete: `backend/config/`, `backend/olympiad/`, `backend/manage.py`, `backend/db.sqlite3`, `backend/uv.lock` (дахин үүснэ)
- Modify: `.claude/launch.json`, `README.md`, `.gitignore`

- [ ] **Step 1: Django файлуудыг устгах**

```powershell
Remove-Item -Recurse -Force backend\config, backend\olympiad, backend\manage.py
Remove-Item -Force backend\db.sqlite3 -ErrorAction SilentlyContinue
```
`backend/media/` хавтас (Django-ийн зургууд) байвал хэвээр үлдээнэ: замууд `album/...` ижил тул шинэ backend ч харна.

- [ ] **Step 2: launch.json**

`backend` тохиргоог солих:
```json
{
  "name": "backend",
  "runtimeExecutable": "uv",
  "runtimeArgs": ["run", "--directory", "backend", "uvicorn", "app.main:app", "--reload", "--port", "8000"],
  "port": 8000
}
```

- [ ] **Step 3: .gitignore**

`# Python / Django` хэсгийг `# Python` болгож, `*.sqlite3`, `staticfiles/` мөрүүдийг хасна; `media/`, `.env`, `.venv/` хэвээр.

- [ ] **Step 4: README.md — backend хэсгийг бүхэлд нь шинэчлэх**

"Технологийн стек" хэсэгт `Backend: Django` → `Backend: FastAPI + SQLAlchemy + PostgreSQL (Docker Compose)`. "Backend (Django)" хэсгийг доорхоор солино:

````markdown
### Backend (FastAPI + PostgreSQL)

Шаардлага: Python 3.14+, [uv](https://docs.astral.sh/uv/), Docker Desktop.

```bash
cd backend
docker compose up -d                          # PostgreSQL 17 (shineue, shineue_test баазууд)
copy .env.example .env                        # шаардлагатай бол утгуудыг засна
uv sync                                       # сангуудыг суулгана
uv run alembic upgrade head                   # хүснэгтүүдийг үүсгэнэ
uv run python scripts/create_admin.py admin "нууц үг" --name "Админ"
uv run python scripts/seed.py                 # жишээ хуваарь, үр дүн (сонголттой)
uv run uvicorn app.main:app --reload          # http://127.0.0.1:8000, баримт: /docs
uv run pytest                                 # тест (shineue_test бааз дээр)
```

| Хаяг | Тайлбар |
|------|---------|
| `/docs` | OpenAPI баримт |
| `/api/auth/token/`, `/api/auth/token/refresh/`, `/api/auth/me/` | JWT нэвтрэлт |
| `/api/auth/users/`, `/api/auth/roles/` | Хэрэглэгч удирдах (superuser) |
| `/api/olympiad/years/`, `/schedule/`, `/results/`, `/album/`, `/stats/`, `/categories/` | Олимпиад (унших нээлттэй, бичих staff) |
| `/api/olympiad/results/import/` | Excel импорт |
| `/media/...` | Оруулсан зургууд |

Эрх: superuser бүх эрхтэй; эрхийн бүлгүүд `manager` (сургалтын менежер), `olympiad`, `news`. Ямар нэг бүлэгтэй эсвэл superuser хэрэглэгч "staff" гэж тооцогдоно.

Бүтэц: `app/main.py` (app), `app/auth/` (хэрэглэгч, JWT), `app/olympiad/` (модель, схем, router, importer), `app/common/` (алдааны формат, файл хадгалах), `alembic/` (миграци), `scripts/` (admin, seed), `tests/`.
````

Excel импортын дэд хэсэг хэвээр, зөвхөн `uv run manage.py import_results ...` мөрүүдийг хасаж, "Админ дашбоардын `/admin/results/import` хуудас эсвэл API" гэж үлдээнэ. Frontend хэсэгт `/admin/album`, `/admin/users` мөр нэмнэ. "Нэмэлт (админ дашбоард, Django)" гарчгийг "Нэмэлт (админ дашбоард)" болгоно.

- [ ] **Step 5: Бүрэн шалгалт**

```bash
cd backend && uv run pytest -v
cd ../frontend && npx tsc --noEmit -p tsconfig.json && npx eslint src
```
Дараа нь `backend` ба `frontend` launch тохиргоог асааж, админ дашбоардын бүх хуудас (нэвтрэх, хуваарь, үр дүн, импорт, албум, хэрэглэгчид) ба нүүр хуудас ажиллаж байгааг browser дээр шалгана. Бүгд OK бол хэрэглэгчид мэдэгдэнэ; commit хийхгүй.
