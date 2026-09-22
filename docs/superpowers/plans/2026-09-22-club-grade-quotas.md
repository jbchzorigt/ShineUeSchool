# Дугуйлангийн анги тутмын квот — хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дугуйлангийн багтаамжийг нийт нэг тоо биш анги бүрийн квот болгож (`{"3": 8, "7": 3}`), бүртгэл/жагсаалт/менежерийн UI бүгд анги тутмын слотыг харуулдаг болгох.

**Architecture:** `clubs.capacity` баганыг `quotas` JSONB-ээр солино (migration 0009 backfill). `service.py`-д анги тутмын бүртгэлийн тоо (`taken_by_grade`), квотын мөрүүд (`quota_rows`), дугуйлангийн төлөв (`full` = бүх анги дүүрсэн). API `ClubOut`-д `quotas: [{grade, capacity, taken, slots_left, full}]` нэмэгдэж, `capacity/taken/slots_left` нийлбэр болно; бүртгэл тухайн ангийн квотыг `FOR UPDATE` дор шалгана. Frontend: `SlotBar` нүүр/админ хоёуланд, карт сонгосон ангийн слотыг, форм анги бүрийн квотын талбарыг харуулна.

**Tech Stack:** FastAPI + SQLAlchemy 2 async + Alembic + PostgreSQL JSONB; Next.js 16 + React 19 + Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-22-club-grade-quotas-design.md` (суурь нь `docs/superpowers/specs/2026-09-21-clubs-registration-design.md`)

## Global Constraints

- **Commit хийхгүй.** Task бүр `git add`-аар дуусна (хэрэглэгчийн журам).
- Backend тест: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest -q` — одоо 138 passed; task бүрийн төгсгөлд бүгд ногоон.
- Frontend: `cd frontend && npx tsc --noEmit && node node_modules/eslint/bin/eslint.js src` (`npx eslint` segfault хийдэг) — 0 problems.
- Windows Git Bash: хаалттай замуудыг ишлэлд (`"frontend/src/app/admin/(dashboard)/clubs/[id]/page.tsx"`); урт heredoc-ийн оронд Write tool.
- Алдааны формат: `FieldError(field, msg)` → 400 `{field: [msg]}`. Мессежүүд spec §4-өөс үгчлэн: `grade: "Энэ дугуйлан <g>-р ангид зориулагдаагүй"`, `grade: "<g>-р ангид суудал дүүрсэн"`, `quotas: "<g>-р ангид бүртгэгдсэн <n> сурагчаас бага байж болохгүй"`, `quotas: "<g>-р ангид бүртгэл байгаа тул хасах боломжгүй"`.
- `quotas` JSONB түлхүүр string анги ("3"), утга int ≥ 1; `grades` массив үргэлж `sorted(int(k) for k in quotas)` — код л тавина.
- Дугуйлангийн `state`: `upcoming` (now < start) → `closed` (now ≥ end) → `full` (бүх анги дүүрсэн) → `open`.
- Монгол хэлээр коммент/UI текст; одоогийн кодын хэв маяг.

## Файлын бүтэц

Backend: `app/clubs/models.py` (quotas), `alembic/versions/0009_club_quotas.py` (шинэ), `app/clubs/schemas.py` (QuotaOut/QuotaIn, ClubIn/Patch), `app/clubs/service.py` (taken_by_grade, quota_rows, club_state, _base), `app/clubs/router_public.py` (list, register), `app/clubs/router_admin.py` (_club_admin, _clubs_of_round, club_create, club_patch), `tests/helpers.py` (seed_clubs), `tests/test_clubs_public.py`, `tests/test_clubs_admin.py`.

Frontend: `lib/types.ts`, `components/clubs/SlotBar.tsx` (admin-аас зөөнө), `components/clubs/format.ts` (`quotaFor`), `components/clubs/ClubCard.tsx`, `components/clubs/ClubsPage.tsx`, `components/clubs/RegisterDialog.tsx`, `components/admin/clubs/ClubForm.tsx`, `components/admin/clubs/ClubTable.tsx`, `app/admin/(dashboard)/clubs/[id]/page.tsx`, `README.md`.

---

### Task 1: Backend — quotas модель, migration, service, API, тест

**Files:**
- Create: `backend/alembic/versions/0009_club_quotas.py`
- Modify: `backend/app/clubs/models.py`, `backend/app/clubs/schemas.py`, `backend/app/clubs/service.py`, `backend/app/clubs/router_public.py`, `backend/app/clubs/router_admin.py`, `backend/tests/helpers.py`, `backend/tests/test_clubs_public.py`, `backend/tests/test_clubs_admin.py`

**Interfaces:**
- Consumes: одоогийн `Club`, `ClubRegistration`, `FieldError`, `with_for_update` бүртгэлийн урсгал.
- Produces: `Club.quotas: dict` (JSONB), `service.quota_map(club) -> dict[int,int]`, `async service.taken_by_grade(db, club_ids) -> dict[int, dict[int,int]]`, `service.quota_rows(club, taken_g) -> list[QuotaOut]`, `service.club_state(club, taken_g: dict[int,int], now) -> str`, `service.club_out(request, club, taken_g, now)`, `service.club_admin_out(request, club, taken_g, now)`; schemas `QuotaOut {grade, capacity, taken, slots_left, full}`, `QuotaIn {grade, capacity}`, `ClubOut.quotas: list[QuotaOut]` (capacity/taken/slots_left нийлбэр хэвээр), `ClubIn.quotas: list[QuotaIn]` (`grades`, `capacity` хасагдсан), `ClubPatch.quotas: list[QuotaIn] | None`; `seed_clubs` квотууд: Шатар `{5:2, 6:1, 7:1, 8:1}` (нийт 5), Робот `{9:1, 10:1}` (2), Дуу `{1:5, 2:5, 3:5}`, Зураг `{5:5}`, Нууц `{5:5}`.

- [ ] **Step 1: Тестүүдийг шинэ загварт шилжүүлэх (эхлээд улаан)**

`backend/tests/helpers.py` `seed_clubs`: docstring-ийн `capacity` мөрүүдийг квот болгож, `mk`-г дараахаар солино:

```python
    def mk(name, quotas, *, start=-1, end=7, published=True, paid=False, fee=0, note="", order=0):
        # quotas: {анги: квот}; grades нь квотын түлхүүрүүдээс гарна (код л тавина)
        return Club(round_id=rnd.id, name=name, description=f"{name} дугуйлан",
                    quotas={str(g): n for g, n in quotas.items()}, grades=sorted(quotas),
                    is_paid=paid, fee=fee, fee_note=note, registration_start=now + timedelta(days=start),
                    registration_end=now + timedelta(days=end), is_published=published, order=order)

    chess = mk("Шатар", {5: 2, 6: 1, 7: 1, 8: 1}, order=1)
    robot = mk("Робот", {9: 1, 10: 1}, paid=True, fee=150000, note="сард", order=2)
    song = mk("Дуу", {1: 5, 2: 5, 3: 5}, start=1, order=3)
    draw = mk("Зураг", {5: 5}, end=-1 / 24, order=4)
    hidden = mk("Нууц", {5: 5}, published=False, order=5)
```

`backend/tests/test_clubs_public.py` — дараах тестүүдийг солино/нэмнэ:

```python
async def test_public_list_filters_and_state(client, db):
    s = await seed_clubs(db)
    r = await client.get("/api/clubs/")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["round"]["name"] == "2026–2027 намар"
    names = [c["name"] for c in body["clubs"]]
    assert names == ["Шатар", "Робот", "Дуу", "Зураг"]
    by = {c["name"]: c for c in body["clubs"]}
    ch = by["Шатар"]
    assert ch["state"] == "open" and ch["capacity"] == 5 and ch["taken"] == 0 and ch["slots_left"] == 5
    assert ch["grades"] == [5, 6, 7, 8]
    assert ch["quotas"] == [{"grade": 5, "capacity": 2, "taken": 0, "slots_left": 2, "full": False},
                            {"grade": 6, "capacity": 1, "taken": 0, "slots_left": 1, "full": False},
                            {"grade": 7, "capacity": 1, "taken": 0, "slots_left": 1, "full": False},
                            {"grade": 8, "capacity": 1, "taken": 0, "slots_left": 1, "full": False}]
    assert by["Дуу"]["state"] == "upcoming" and by["Зураг"]["state"] == "closed"
    assert by["Робот"]["is_paid"] and by["Робот"]["fee"] == 150000 and by["Робот"]["capacity"] == 2
    r = await client.get("/api/clubs/?grade=5")
    assert [c["name"] for c in r.json()["clubs"]] == ["Шатар", "Зураг"]
    r = await client.get("/api/clubs/?grade=12")
    assert r.json()["clubs"] == [] and r.json()["round"]["id"] == s.round_id


async def test_public_list_full_state_and_taken(client, db):
    from app.clubs.models import ClubRegistration
    s = await seed_clubs(db)

    def reg(email, grade, **over):
        d = dict(club_id=s.robot_id, round_id=s.round_id, email=email, student_last_name="Б", student_first_name="Бат",
                 guardian_last_name="Д", guardian_first_name="Дорж", phone="99001122", grade=grade)
        d.update(over)
        return ClubRegistration(**d)

    db.add(reg("a@shineue.edu.mn", 9))
    db.add(reg("b@shineue.edu.mn", 9, status="removed"))
    await db.flush()
    by = {c["name"]: c for c in (await client.get("/api/clubs/")).json()["clubs"]}
    rb = by["Робот"]
    assert rb["taken"] == 1 and rb["slots_left"] == 1 and rb["state"] == "open"     # 9-р анги дүүрсэн, 10-р нээлттэй
    assert rb["quotas"][0] == {"grade": 9, "capacity": 1, "taken": 1, "slots_left": 0, "full": True}
    assert rb["quotas"][1]["full"] is False
    db.add(reg("c@shineue.edu.mn", 10))
    await db.flush()
    rb = {c["name"]: c for c in (await client.get("/api/clubs/")).json()["clubs"]}["Робот"]
    assert rb["state"] == "full" and rb["slots_left"] == 0 and all(q["full"] for q in rb["quotas"])


def test_club_state_closed_beats_full():
    from datetime import UTC, datetime, timedelta
    from types import SimpleNamespace

    from app.clubs.service import club_state
    now = datetime.now(UTC)
    c = SimpleNamespace(quotas={"5": 1, "6": 1}, registration_start=now - timedelta(days=2), registration_end=now - timedelta(days=1))
    assert club_state(c, {5: 1, 6: 1}, now) == "closed"
    c.registration_end = now + timedelta(days=1)
    assert club_state(c, {5: 1, 6: 1}, now) == "full"
    assert club_state(c, {5: 1}, now) == "open"           # 6-р анги нээлттэй
    assert club_state(c, {}, now) == "open"
    c.registration_start = now + timedelta(hours=1)
    assert club_state(c, {}, now) == "upcoming"
```

Бүртгэлийн тестүүд:

```python
async def test_register_success_and_slot(client, db):
    s = await seed_clubs(db)
    r = await client.post(REG, json=reg_body(tok("bat@shineue.edu.mn"), s.chess_id, 6))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["club"] == {"id": s.chess_id, "name": "Шатар", "is_paid": False, "fee": 0, "fee_note": ""}
    assert body["email"] == "bat@shineue.edu.mn" and body["grade"] == 6
    ch = {c["name"]: c for c in (await client.get("/api/clubs/")).json()["clubs"]}["Шатар"]
    assert ch["taken"] == 1 and ch["slots_left"] == 4 and ch["state"] == "open"
    q6 = next(q for q in ch["quotas"] if q["grade"] == 6)
    assert q6 == {"grade": 6, "capacity": 1, "taken": 1, "slots_left": 0, "full": True}


async def test_register_grade_quota_full(client, db):
    s = await seed_clubs(db)
    assert (await client.post(REG, json=reg_body(tok("a@shineue.edu.mn"), s.chess_id, 6))).status_code == 201
    r = await client.post(REG, json=reg_body(tok("b@shineue.edu.mn"), s.chess_id, 6))
    assert r.status_code == 400 and r.json()["grade"] == ["6-р ангид суудал дүүрсэн"]
    assert (await client.post(REG, json=reg_body(tok("b@shineue.edu.mn"), s.chess_id, 5))).status_code == 201   # өөр анги нээлттэй
```

`test_register_duplicate_full_and_readd_after_remove`-ийг солино:

```python
async def test_register_duplicate_full_and_readd_after_remove(client, db):
    s = await seed_clubs(db)
    assert (await client.post(REG, json=reg_body(tok("a@shineue.edu.mn"), s.robot_id, 9))).status_code == 201
    r = await client.post(REG, json=reg_body(tok("a@shineue.edu.mn"), s.chess_id, 5))    # ижил имэйл өөр дугуйлан
    assert r.status_code == 400 and "Робот" in r.json()["email"][0]
    r = await client.post(REG, json=reg_body(tok("b@shineue.edu.mn"), s.robot_id, 9))    # 9-р ангийн квот 1 → дүүрсэн
    assert r.status_code == 400 and r.json()["grade"] == ["9-р ангид суудал дүүрсэн"]
    assert (await client.post(REG, json=reg_body(tok("b@shineue.edu.mn"), s.robot_id, 10))).status_code == 201  # 10-р анги нээлттэй
    from datetime import UTC, datetime

    from sqlalchemy import update

    from app.clubs.models import ClubRegistration
    await db.execute(update(ClubRegistration).where(ClubRegistration.email == "a@shineue.edu.mn")
                     .values(status="removed", removed_at=datetime.now(UTC)))
    await db.flush()
    assert (await client.post(REG, json=reg_body(tok("c@shineue.edu.mn"), s.robot_id, 9))).status_code == 201
    assert (await client.post(REG, json=reg_body(tok("a@shineue.edu.mn"), s.chess_id, 5))).status_code == 201
```

Race тест: `Club(round_id=rnd.id, name="Race", grades=[5], capacity=1, ...)` → `Club(round_id=rnd.id, name="Race", grades=[5], quotas={"5": 1}, ...)`; `assert "Дугуйлан дүүрсэн" in (r1.text + r2.text)` → `assert "суудал дүүрсэн" in (r1.text + r2.text)`.

`backend/tests/test_clubs_admin.py`: `club_payload` → `"quotas": [{"grade": 7, "capacity": 10}, {"grade": 5, "capacity": 5}]` (`grades`, `capacity` түлхүүрүүдийг хасна). `test_clubs_create_validate_patch`-д:
- `assert c["grades"] == [5, 7] and c["capacity"] == 15 and c["order"] == 6 and c["state"] == "open" and c["taken"] == 0`
- `assert c["quotas"] == [{"grade": 5, "capacity": 5, "taken": 0, "slots_left": 5, "full": False}, {"grade": 7, "capacity": 10, "taken": 0, "slots_left": 10, "full": False}]`
- `club_payload(grades=[])` → `club_payload(quotas=[])` ба `"quotas" in r.json()`; `club_payload(grades=[13])` → `club_payload(quotas=[{"grade": 13, "capacity": 1}])`; `club_payload(capacity=0)` → `club_payload(quotas=[{"grade": 5, "capacity": 0}])` → `"quotas" in r.json()`; нэмнэ: `club_payload(quotas=[{"grade": 5, "capacity": 1}, {"grade": 5, "capacity": 2}])` → 400 `quotas`.
- PATCH `{"is_published": False, "grades": [9]}` → `{"is_published": False, "quotas": [{"grade": 9, "capacity": 3}]}` ба `r.json()["grades"] == [9] and r.json()["capacity"] == 3`.

`test_club_capacity_not_below_taken` → бүхэлд нь солино:

```python
async def test_club_quota_not_below_taken(client, db, make_user):
    from app.clubs.models import ClubRegistration
    s = await seed_clubs(db)
    h = await manager_headers(client, make_user)
    ids = []
    for i in range(2):
        reg = ClubRegistration(club_id=s.chess_id, round_id=s.round_id, email=f"s{i}@shineue.edu.mn",
                               student_last_name="Б", student_first_name="Бат", guardian_last_name="Д",
                               guardian_first_name="Дорж", phone="99001122", grade=5)
        db.add(reg)
        await db.flush()
        ids.append(reg.id)
    q = lambda five: [{"grade": 5, "capacity": five}, {"grade": 6, "capacity": 1}, {"grade": 7, "capacity": 1}, {"grade": 8, "capacity": 1}]
    r = await client.patch(f"{A}/clubs/{s.chess_id}/", headers=h, json={"quotas": q(1)})
    assert r.status_code == 400 and r.json()["quotas"] == ["5-р ангид бүртгэгдсэн 2 сурагчаас бага байж болохгүй"]
    r = await client.patch(f"{A}/clubs/{s.chess_id}/", headers=h, json={"quotas": [{"grade": 6, "capacity": 1}]})
    assert r.status_code == 400 and r.json()["quotas"] == ["5-р ангид бүртгэл байгаа тул хасах боломжгүй"]
    r = await client.patch(f"{A}/clubs/{s.chess_id}/", headers=h, json={"quotas": q(2)})
    assert r.status_code == 200 and r.json()["state"] == "open" and r.json()["quotas"][0]["full"] is True
    # нэгийг нь хассаны дараа квот 1 боломжтой
    assert (await client.post(f"{A}/registrations/{ids[0]}/remove/", headers=h)).status_code == 200
    r = await client.patch(f"{A}/clubs/{s.chess_id}/", headers=h, json={"quotas": q(1)})
    assert r.status_code == 200 and r.json()["taken"] == 1 and r.json()["quotas"][0]["full"] is True
```

Run: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest tests/test_clubs_public.py tests/test_clubs_admin.py -q` → Expected: олон FAIL (`Club` `quotas` kwarg байхгүй).

- [ ] **Step 2: Модель ба migration**

`backend/app/clubs/models.py`: `from sqlalchemy.dialects.postgresql import ARRAY, JSONB`; `Club`-д `capacity: Mapped[int] = mapped_column(Integer)` мөрийг солино:

```python
    quotas: Mapped[dict] = mapped_column(JSONB, default=dict)   # {"3": 8, "7": 3} — анги тутмын квот; grades нь түлхүүрүүд
```

`backend/alembic/versions/0009_club_quotas.py`:

```python
"""clubs: per-grade quotas replace capacity

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-22
"""
import json

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clubs", sa.Column("quotas", JSONB, nullable=False, server_default="{}"))
    conn = op.get_bind()
    # Хуучин нийт багтаамжийг анги тутамд квот болгон тавина (одоогоор тестийн өгөгдөл л байна)
    for cid, grades, cap in conn.execute(sa.text("SELECT id, grades, capacity FROM clubs")).fetchall():
        conn.execute(sa.text("UPDATE clubs SET quotas = CAST(:q AS jsonb) WHERE id = :id"),
                     {"q": json.dumps({str(g): int(cap) for g in (grades or [])}), "id": cid})
    op.drop_column("clubs", "capacity")


def downgrade() -> None:
    op.add_column("clubs", sa.Column("capacity", sa.Integer, nullable=False, server_default="1"))
    op.get_bind().execute(sa.text(
        "UPDATE clubs SET capacity = COALESCE((SELECT MAX(v::int) FROM jsonb_each_text(quotas) AS t(k, v)), 1)"))
    op.drop_column("clubs", "quotas")
```

Run: `cd backend && uv run alembic upgrade head && uv run alembic check` → `0008 -> 0009`, "No new upgrade operations detected."

- [ ] **Step 3: Схем**

`backend/app/clubs/schemas.py`: `ImageOut`-ийн дараа нэмнэ:

```python
class QuotaOut(BaseModel):
    grade: int
    capacity: int
    taken: int
    slots_left: int
    full: bool


class QuotaIn(BaseModel):
    grade: int = Field(ge=1, le=12)
    capacity: int = Field(ge=1, le=500)
```

`ClubOut`-д `images` мөрийн өмнө `quotas: list[QuotaOut]` нэмнэ (`grades`, `capacity`, `taken`, `slots_left`, `state` хэвээр — нийлбэр). `_clean_grades`-ийг солино:

```python
def _clean_quotas(v):
    if not isinstance(v, list) or not v:
        raise ValueError("Дор хаяж нэг ангид квот оруулна уу.")
    grades = [q.get("grade") if isinstance(q, dict) else getattr(q, "grade", None) for q in v]
    if len(set(grades)) != len(grades):
        raise ValueError("Анги давхардаж байна.")
    return sorted(v, key=lambda q: q.get("grade") if isinstance(q, dict) else q.grade)
```

`ClubIn`: `grades: list[int]` ба `capacity: int = Field(ge=1, le=1000)` мөрүүдийг `quotas: list[QuotaIn]`-аар солино; `_grades` validator-ыг:

```python
    @field_validator("quotas", mode="before")
    @classmethod
    def _quotas(cls, v):
        return _clean_quotas(v)
```

`ClubPatch`: `grades`, `capacity` мөрүүдийг `quotas: list[QuotaIn] | None = None`-оор солино; validator `return None if v is None else _clean_quotas(v)`.

- [ ] **Step 4: Service**

`backend/app/clubs/service.py`: `from .schemas import ClubAdminOut, ClubOut, ImageOut, QuotaOut`. `club_state` ба `taken_counts`-ийг солино:

```python
def quota_map(club) -> dict[int, int]:
    """{"3": 8} → {3: 8}."""
    return {int(g): int(n) for g, n in (club.quotas or {}).items()}


def club_state(club, taken_g: dict[int, int], now: datetime) -> str:
    """upcoming → closed → full (бүх анги дүүрсэн) → open."""
    if now < club.registration_start:
        return "upcoming"
    if now >= club.registration_end:
        return "closed"
    qm = quota_map(club)
    if qm and all(taken_g.get(g, 0) >= cap for g, cap in qm.items()):
        return "full"
    return "open"


async def taken_by_grade(db: AsyncSession, club_ids: list[int]) -> dict[int, dict[int, int]]:
    """club_id → {анги → баталгаажсан бүртгэлийн тоо}."""
    if not club_ids:
        return {}
    rows = (await db.execute(
        select(ClubRegistration.club_id, ClubRegistration.grade, func.count(ClubRegistration.id))
        .where(ClubRegistration.club_id.in_(club_ids), ClubRegistration.status == REG_CONFIRMED)
        .group_by(ClubRegistration.club_id, ClubRegistration.grade)
    )).all()
    out: dict[int, dict[int, int]] = {}
    for cid, g, n in rows:
        out.setdefault(cid, {})[int(g)] = int(n)
    return out


def quota_rows(club, taken_g: dict[int, int]) -> list[QuotaOut]:
    rows = []
    for g, cap in sorted(quota_map(club).items()):
        t = taken_g.get(g, 0)
        rows.append(QuotaOut(grade=g, capacity=cap, taken=t, slots_left=max(cap - t, 0), full=t >= cap))
    return rows
```

`_base`, `club_out`, `club_admin_out`:

```python
def _base(request: Request, club: Club, taken_g: dict[int, int], now: datetime) -> dict:
    rows = quota_rows(club, taken_g)
    return dict(
        id=club.id, name=club.name, description=club.description, grades=list(club.grades),
        capacity=sum(r.capacity for r in rows), taken=sum(r.taken for r in rows), slots_left=sum(r.slots_left for r in rows),
        state=club_state(club, taken_g, now), quotas=rows,
        is_paid=club.is_paid, fee=club.fee, fee_note=club.fee_note,
        registration_start=club.registration_start, registration_end=club.registration_end,
        images=[ImageOut(id=i.id, url=media_url(request, i.file), order=i.order) for i in club.images],
    )


def club_out(request: Request, club: Club, taken_g: dict[int, int], now: datetime) -> ClubOut:
    return ClubOut(**_base(request, club, taken_g, now))


def club_admin_out(request: Request, club: Club, taken_g: dict[int, int], now: datetime) -> ClubAdminOut:
    return ClubAdminOut(**_base(request, club, taken_g, now), is_published=club.is_published, order=club.order,
                        round_id=club.round_id)
```

`taken_counts`-ийг устгана (бүх дуудлагыг `taken_by_grade`-ээр солино — доор).

- [ ] **Step 5: Олон нийтийн router**

`backend/app/clubs/router_public.py`: импорт `taken_counts` → `taken_by_grade`, `quota_map` нэмнэ. `clubs_list`:

```python
    taken = await taken_by_grade(db, [c.id for c in clubs])
    now = datetime.now(UTC)
    return ClubsResponse(round=RoundRef(id=rnd.id, name=rnd.name),
                         clubs=[club_out(request, c, taken.get(c.id, {}), now) for c in clubs])
```

`register`-т `taken = ...` мөрөөс `if state == "full": ...` хүртэлх шалгалтуудыг дараахаар солино:

```python
    now = datetime.now(UTC)
    taken_g = (await taken_by_grade(db, [club.id])).get(club.id, {})
    state = club_state(club, taken_g, now)
    if state == "upcoming":
        raise FieldError("club", "Бүртгэл хараахан эхлээгүй")
    if state == "closed":
        raise FieldError("club", "Бүртгэлийн хугацаа дууссан")
    qm = quota_map(club)
    if body.grade not in qm:
        raise FieldError("grade", f"Энэ дугуйлан {body.grade}-р ангид зориулагдаагүй")
    existing = await find_confirmed(db, rnd.id, email)
    if existing is not None:
        raise FieldError("email", f"Энэ хаягаар «{existing.club.name}» дугуйланд бүртгүүлсэн байна")
    if taken_g.get(body.grade, 0) >= qm[body.grade]:
        raise FieldError("grade", f"{body.grade}-р ангид суудал дүүрсэн")
```

- [ ] **Step 6: Менежерийн router**

`backend/app/clubs/router_admin.py`: импорт `taken_counts` → `taken_by_grade`, мөн `from .service import club_admin_out, quota_map, taken_by_grade`. `_club_admin`, `_clubs_of_round`:

```python
async def _club_admin(request: Request, db: AsyncSession, club: Club) -> ClubAdminOut:
    taken = (await taken_by_grade(db, [club.id])).get(club.id, {})
    return club_admin_out(request, club, taken, datetime.now(UTC))


async def _clubs_of_round(request: Request, db: AsyncSession, round_id: int) -> list[ClubAdminOut]:
    clubs = (await db.execute(select(Club).where(Club.round_id == round_id).order_by(Club.order, Club.id))).scalars().all()
    taken = await taken_by_grade(db, [c.id for c in clubs])
    now = datetime.now(UTC)
    return [club_admin_out(request, c, taken.get(c.id, {}), now) for c in clubs]


def _quotas_to_columns(quotas) -> dict:
    """[{grade, capacity}] → {"quotas": {"5": 2}, "grades": [5]}."""
    qm = {int(q.grade): int(q.capacity) for q in quotas}
    return {"quotas": {str(g): n for g, n in sorted(qm.items())}, "grades": sorted(qm)}
```

`club_create`: `club = Club(round_id=id, order=int(max_order) + 1, **body.model_dump())` → 

```python
    data = body.model_dump(exclude={"quotas"})
    club = Club(round_id=id, order=int(max_order) + 1, **data, **_quotas_to_columns(body.quotas))
```

`club_patch`: `merged` түлхүүрүүдээс `"capacity"`-г хасна; `taken = ...; if merged["capacity"] < taken: ...` хоёр мөрийг солино:

```python
    if body.quotas is not None:
        new = {int(q.grade): int(q.capacity) for q in body.quotas}
        taken_g = (await taken_by_grade(db, [club.id])).get(club.id, {})
        for g, n in sorted(taken_g.items()):
            if n <= 0:
                continue
            if g not in new:
                raise FieldError("quotas", f"{g}-р ангид бүртгэл байгаа тул хасах боломжгүй")
            if new[g] < n:
                raise FieldError("quotas", f"{g}-р ангид бүртгэгдсэн {n} сурагчаас бага байж болохгүй")
        data.pop("quotas", None)
        data.update(_quotas_to_columns(body.quotas))
```

(`data`-д `quotas` нь `model_dump`-аас dict жагсаалт байдаг тул `pop` хийж `_quotas_to_columns`-оор солино.)

- [ ] **Step 7: Тест ажиллуулах**

Run: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest -q` → Expected: бүгд passed (138 − 0 + 1 шинэ `test_register_grade_quota_full` = 139). `uv run alembic check` цэвэр.

- [ ] **Step 8: Stage**

```bash
git add backend/app/clubs backend/alembic/versions/0009_club_quotas.py backend/tests/helpers.py backend/tests/test_clubs_public.py backend/tests/test_clubs_admin.py
```

---

### Task 2: Frontend — нүүр хуудас (карт, диалог) анги тутмын слот

**Files:**
- Create: `frontend/src/components/clubs/SlotBar.tsx` (админаас зөөнө)
- Delete: `frontend/src/components/admin/clubs/SlotBar.tsx`
- Modify: `frontend/src/lib/types.ts`, `frontend/src/components/clubs/format.ts`, `frontend/src/components/clubs/ClubCard.tsx`, `frontend/src/components/clubs/ClubsPage.tsx`, `frontend/src/components/clubs/RegisterDialog.tsx`, `frontend/src/components/admin/clubs/ClubTable.tsx` (импортын зам), `frontend/src/app/admin/(dashboard)/clubs/[id]/page.tsx` (импортын зам)

**Interfaces:**
- Consumes: Task 1 API (`Club.quotas`, нийлбэр талбарууд, `grade` алдаа).
- Produces: `types.ts` — `ClubQuota {grade, capacity, taken, slots_left, full}`, `Club.quotas: ClubQuota[]`, `ClubInput.quotas: {grade: number; capacity: number}[]` (`grades`, `capacity` хасагдана); `format.ts` — `quotaFor(club, grade) => ClubQuota | undefined`; `SlotBar({taken, capacity, label?, className?})` `@/components/clubs/SlotBar`; `ClubCard({club, selectedGrade, onRegister})`.

- [ ] **Step 1: Төрөл, format, SlotBar зөөх**

`frontend/src/lib/types.ts` Club блок:

```ts
export interface ClubQuota { grade: number; capacity: number; taken: number; slots_left: number; full: boolean }
export interface Club {
  id: number;
  name: string;
  description: string;
  grades: number[];
  capacity: number;      // нийт (квотуудын нийлбэр)
  taken: number;
  slots_left: number;
  state: ClubState;
  quotas: ClubQuota[];   // анги тутам
  is_paid: boolean;
  fee: number;
  fee_note: string;
  registration_start: string;
  registration_end: string;
  images: ClubImage[];
}
```

`ClubInput`: `grades: number[];` ба `capacity: number;` мөрүүдийг `quotas: { grade: number; capacity: number }[];`-аар солино.

`frontend/src/components/clubs/format.ts` төгсгөлд:

```ts
export function quotaFor(club: Pick<Club, "quotas">, grade: number | null): ClubQuota | undefined {
  return grade === null ? undefined : club.quotas.find((q) => q.grade === grade);
}
```

(`import type { Club, ClubQuota, ClubState } from "@/lib/types";`)

`git mv frontend/src/components/admin/clubs/SlotBar.tsx frontend/src/components/clubs/SlotBar.tsx`; файлд `label?: string` prop нэмнэ — тооны мөрийн ард `label` байвал ` · {label}` (`text-muted`):

```tsx
export function SlotBar({ taken, capacity, label, className = "" }: { taken: number; capacity: number; label?: string; className?: string }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((taken / capacity) * 100)) : 0;
  const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-gold" : "bg-navy";
  return (
    <div className={`min-w-24 ${className}`}>
      <div className="text-sm"><span className="font-semibold">{taken}</span>/{capacity}{label && <span className="text-slate-500"> · {label}</span>}</div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={taken} aria-label="Слотын дүүргэлт">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

`ClubTable.tsx` ба `clubs/[id]/page.tsx`-ийн импортыг `@/components/clubs/SlotBar` болгоно.

- [ ] **Step 2: ClubCard**

`frontend/src/components/clubs/ClubCard.tsx` — `MAX_SLOT_SQUARES` ба дөрвөлжингүүдийг хасаж, слотын хэсгийг дараахаар солино (props: `{ club, selectedGrade, onRegister }: { club: Club; selectedGrade: number | null; onRegister: (club: Club) => void }`; импорт `SlotBar`, `quotaFor`):

```tsx
        <div className="mt-auto space-y-2">
          {sel ? (
            <SlotBar taken={sel.taken} capacity={sel.capacity} label={`${sel.grade}-р анги`} />
          ) : (
            <>
              <SlotBar taken={club.taken} capacity={club.capacity} label="нийт" />
              <ul className="flex flex-wrap gap-1.5 text-xs" aria-label="Анги тутмын слот">
                {club.quotas.map((q) => (
                  <li key={q.grade} className={`rounded-full px-2 py-0.5 ${q.full ? "bg-slate-100 text-slate-500" : "bg-navy/10 text-navy"}`}>
                    {q.grade}-р {q.taken}/{q.capacity}
                  </li>
                ))}
              </ul>
            </>
          )}
          <Button className="w-full" disabled={!canRegister} onClick={() => onRegister(club)}>{buttonLabel}</Button>
        </div>
```

Функцийн эхэнд:

```tsx
  const sel = quotaFor(club, selectedGrade);
  const gradeFull = !!sel?.full;
  const canRegister = club.state === "open" && !gradeFull;
  const buttonLabel = club.state !== "open" ? STATE_LABEL[club.state] : gradeFull ? "Энэ ангид дүүрсэн" : "Бүртгүүлэх";
```

`ClubsPage.tsx`: `<ClubCard key={c.id} club={c} selectedGrade={grade} onRegister={setTarget} />`.

- [ ] **Step 3: RegisterDialog ангийн сонголт**

`frontend/src/components/clubs/RegisterDialog.tsx`: `formGrade` анхны утга:

```tsx
  const [formGrade, setFormGrade] = useState<number>(() => {
    if (!club) return 0;
    const open = club.quotas.filter((q) => !q.full).map((q) => q.grade);
    return grade !== null && open.includes(grade) ? grade : (open[0] ?? club.grades[0] ?? 0);
  });
```

Select:

```tsx
                  <Select value={formGrade} onChange={(e) => setFormGrade(Number(e.target.value))}>
                    {club.quotas.map((q) => (
                      <option key={q.grade} value={q.grade} disabled={q.full}>
                        {q.grade}-р анги · {q.full ? "дүүрсэн" : `${q.slots_left} сул`}
                      </option>
                    ))}
                  </Select>
```

- [ ] **Step 4: Шалгах**

Run: `cd frontend && npx tsc --noEmit && node node_modules/eslint/bin/eslint.js src` → `ClubForm.tsx` дээр `grades`/`capacity` төрлийн алдаа гарна (Task 3-д засагдана) — энэ task-д `ClubForm.tsx`-ийн `Draft`/`toDraft`/`body`-г түр хамгийн бага өөрчлөлтөөр tsc-д тэнцүүлнэ: `Draft`-ийн `capacity`-г хасаж `quotas: { grade: number; capacity: string }[]` болгож, `toDraft` нь `c.quotas.map((q) => ({ grade: q.grade, capacity: String(q.capacity) }))` (шинэ бол `[]`), `body.quotas = d.quotas.map((q) => ({ grade: q.grade, capacity: Number(q.capacity) }))`, `grades` талбарын chip toggle-ийг `d.quotas`-оор (`toggleGrade` нь квот 5-аар нэмэх/хасах) — UI-г Task 3 гүйцээнэ. tsc/eslint 0 problems байх ёстой.

Browser (`preview_start` backend/frontend; Task 1-ийн дараа backend-ийг дахин асаах): `/clubs` — "Бүх анги": карт бүрт "N/M · нийт" bar + анги бүрийн badge; анги сонгох: тэр ангийн bar + label; квот дүүрсэн анги сонгоход товч "Энэ ангид дүүрсэн"; диалогийн сонголтод "· N сул"/"дүүрсэн" (disabled). Console алдаагүй. 375px.

- [ ] **Step 5: Stage**

```bash
git add -A frontend/src/components/clubs frontend/src/components/admin/clubs frontend/src/lib/types.ts "frontend/src/app/admin/(dashboard)/clubs"
```

---

### Task 3: Frontend — менежер: форм квот, хүснэгт, дэлгэрэнгүй; README

**Files:**
- Modify: `frontend/src/components/admin/clubs/ClubForm.tsx`, `frontend/src/components/admin/clubs/ClubTable.tsx`, `frontend/src/app/admin/(dashboard)/clubs/[id]/page.tsx`, `README.md`

**Interfaces:**
- Consumes: `ClubAdmin.quotas`, `ClubInput.quotas`, `SlotBar` (`@/components/clubs/SlotBar`), `GRADES`.
- Produces: `ClubForm` квотын UI; `ClubTable` анги тутмын badge; дэлгэрэнгүй "Анги тутмын квот" хүснэгт.

- [ ] **Step 1: ClubForm**

`Draft`: `quotas: { grade: number; capacity: string }[]` (Task 2-ын түр хувилбар дээр). Туслахууд функц дотор:

```tsx
  const DEFAULT_QUOTA = "5";
  const has = (g: number) => d.quotas.some((q) => q.grade === g);
  const toggleGrade = (g: number) =>
    up("quotas", has(g) ? d.quotas.filter((q) => q.grade !== g) : [...d.quotas, { grade: g, capacity: DEFAULT_QUOTA }].sort((a, b) => a.grade - b.grade));
  const setQuota = (g: number, v: string) => up("quotas", d.quotas.map((q) => (q.grade === g ? { ...q, capacity: v } : q)));
  const allGrades = () => up("quotas", d.quotas.length === 12 ? [] : GRADES.map((g) => d.quotas.find((q) => q.grade === g) ?? { grade: g, capacity: DEFAULT_QUOTA }));
```

"Ангиуд" талбар ба "Багтаамж" талбарыг дараахаар солино (Багтаамж талбар устана):

```tsx
        <Field label="Ангиуд ба анги тутмын квот" error={errors.quotas} hint="Анги сонгоод хажууд нь элсэх тоог оруулна">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={allGrades} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/10">Бүгд</button>
            {GRADES.map((g) => (
              <label key={g} className={`cursor-pointer rounded-full border px-3 py-1 text-sm font-semibold ${has(g) ? "border-navy bg-navy text-white" : "border-slate-300 text-slate-700"}`}>
                <input type="checkbox" className="sr-only" checked={has(g)} onChange={() => toggleGrade(g)} />{g}
              </label>
            ))}
          </div>
          {d.quotas.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {d.quotas.map((q) => (
                <label key={q.grade} className="flex items-center gap-2 text-sm">
                  <span className="w-16 shrink-0 text-slate-600">{q.grade}-р анги</span>
                  <Input type="number" min={1} max={500} value={q.capacity} onChange={(e) => setQuota(q.grade, e.target.value)} required aria-label={`${q.grade}-р ангийн квот`} />
                </label>
              ))}
              <p className="col-span-full text-xs text-slate-500">Нийт: {d.quotas.reduce((s, q) => s + (Number(q.capacity) || 0), 0)} суудал</p>
            </div>
          )}
        </Field>
```

`save`-ийн `body`: `quotas: d.quotas.map((q) => ({ grade: q.grade, capacity: Number(q.capacity) }))`; `grades`/`capacity` түлхүүр байхгүй.

- [ ] **Step 2: ClubTable ба дэлгэрэнгүй**

`ClubTable.tsx` "Бүртгэл" нүд:

```tsx
          <Td>
            <SlotBar taken={c.taken} capacity={c.capacity} />
            <div className="mt-1 flex flex-wrap gap-1">
              {c.quotas.map((q) => (
                <span key={q.grade} className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${q.full ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{q.grade}-р {q.taken}/{q.capacity}</span>
              ))}
            </div>
          </Td>
```

`clubs/[id]/page.tsx`: `ImagesPanel`-ийн өмнө:

```tsx
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-navy">Анги тутмын квот</h2>
        <Table head={<><Th>Анги</Th><Th>Квот</Th><Th>Бүртгэгдсэн</Th><Th>Сул</Th><Th className="w-48">Дүүргэлт</Th></>}>
          {club.quotas.map((q) => (
            <tr key={q.grade}>
              <Td className="font-semibold text-navy">{q.grade}-р анги</Td>
              <Td>{q.capacity}</Td>
              <Td>{q.taken}</Td>
              <Td>{q.full ? <Badge tone="red">Дүүрсэн</Badge> : q.slots_left}</Td>
              <Td><SlotBar taken={q.taken} capacity={q.capacity} /></Td>
            </tr>
          ))}
        </Table>
      </section>
```

(`Table, Th, Td` импорт `@/components/ui`.)

- [ ] **Step 3: README**

"Дугуйлангийн бүртгэл" хэсгийн эхний догол мөрийн `(анги 1–12, багтаамж, ...)` → `(анги 1–12, анги тутмын квот, ...)`; хоёр дахь догол мөрд "Нэг имэйл ..." өгүүлбэрийн өмнө: `Багтаамж анги бүрт тусдаа (ж: 3-р анги 8, 7-р анги 3); нэг анги дүүрсэн ч бусад анги нээлттэй, дугуйлан бүх анги дүүрсэн үед л "Дүүрсэн" болно.`

- [ ] **Step 4: Шалгах**

Run: `cd frontend && npx tsc --noEmit && node node_modules/eslint/bin/eslint.js src` → 0 problems. `cd backend && PYTHONIOENCODING=utf-8 uv run pytest -q` → бүгд ногоон.

Browser (`task9admin`/`Task9Pass!23`): `/admin/clubs` — "+ Шинэ дугуйлан": анги chip дарахад квотын талбар гарч "Нийт: N суудал" тоологдох, "Бүгд" 12 × 5; хадгалахад хүснэгтэнд нийт bar + анги бүрийн badge; квотыг бүртгэгдсэн тооноос бага болгоход алдаа талбарын доор (`quotas`); `/admin/clubs/[id]` — "Анги тутмын квот" хүснэгт bar-тай; `/clubs`-д тухайн дугуйлан анги бүрээр зөв. Console алдаагүй.

- [ ] **Step 5: Stage**

```bash
git add frontend/src/components/admin/clubs "frontend/src/app/admin/(dashboard)/clubs" README.md
```
