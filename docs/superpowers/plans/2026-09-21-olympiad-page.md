# Олимпиадын хуудас — Next.js порт: хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repo-ийн үндсэн хавтасны статик олимпиадын прототипийг (`index.html` + GSAP JS + `style.css`) Next.js сайтын `/olympiad` хуудас болгон 1:1 харагдац, бүх анимацитай шилжүүлж, хуваарь/үр дүн/албумыг `/api/olympiad/*`-аас, намтар/тухай/холбоо барих текст ба хөргийг админаас засдаг болгож, прототипийг устгана.

**Architecture:** Backend `app/olympiad/`-д нэг мөртэй `olympiad_page` тохиргооны хүснэгт + 4 endpoint. Frontend: `app/olympiad/` (layout, server page, scoped CSS), `components/olympiad/` — прототипийн JS модуль бүр нэг client компонент (`useGSAP` context-оор цэвэрлэгддэг), ScrollSmoother `OlympiadPage`-д; `lib/olympiad-api.ts` (server fetch), `lib/olympiad-data.ts` (томъёо), `lib/yearTiles.ts` (хавтан үүсгэгч). Админ `/admin/olympiad-page`.

**Tech Stack:** FastAPI + SQLAlchemy 2 + Alembic (backend); Next.js 16 App Router, React 19, gsap 3.15 (`gsap/ScrollTrigger`, `gsap/ScrollSmoother`, `gsap/DrawSVGPlugin`, `gsap/MotionPathPlugin`, `gsap/SplitText` — бүгд npm багцад орсон), `@gsap/react` `useGSAP`, `katex`.

**Spec:** `docs/superpowers/specs/2026-09-21-olympiad-page-design.md`

Spec-ээс зөрсөн нэг шийдвэр: гарчгийн чимэглэлийг `useHeadingArt.ts` hook (DOM-ыг дахин бүтээдэг) биш, `Heading.tsx` declarative компонент болгоно — React-д DOM-ыг гаднаас өөрчлөх нь эрсдэлтэй, харагдац ижил.

## Global Constraints

- **Commit, push хийхгүй.** Working tree дээр; task дууссаныг controller `git add`-аар тэмдэглэнэ.
- Backend конвенц: зам төгсгөлийн `/`, алдаа `{field: ["msg"]}` (`FieldError`), 404 `{detail: "Олдсонгүй."}`, монгол мессеж; бичих endpoint `require_staff` (олимпиадын бусад endpoint-той адил); IntegrityError → rollback → FieldError.
- Прототип = харагдацын эталон: T3–T9 бүрт `.claude/launch.json`-ын `static` (порт 5173, `http://localhost:5173/`) ба `frontend` (3000, `/olympiad`) хоёуланг preview tool-оор асааж зэрэгцүүлж харна (прототип T10-д устгагдана).
- CSS: прототипийн `style.css`-ийн бүх дүрэм `.olympiad` root доор (`.olympiad .hero {…}`); класс нэрс, id-ууд хэвээр (JS сонгогчид тулгуурлана). Tailwind preflight (globals.css) `h1–h6`, `ul`, `button`, `img`, `svg` анхдагч стилийг дарж болно — прототипоос ялгарвал `.olympiad`-ийн CSS-д тодорхой утга нэмнэ.
- GSAP: `gsap.ts`-ээс л импортолно (`import { gsap, ScrollTrigger, ScrollSmoother, DrawSVGPlugin, MotionPathPlugin, SplitText } from "./gsap"`); компонент бүр `useGSAP(cb, { scope: rootRef, dependencies })`; өөрөө үүсгэсэн DOM-ыг cleanup-д устгана; `prefers-reduced-motion` → прототипийнх шиг анимаци алгасаж эцсийн төлөв.
- React дүрэм: `setState` effect дотор биш (handler/callback дотор); DOM-ыг `innerHTML`-ээр үүсгэх нь зөвхөн `useGSAP`/effect дотор, ref-ээр, React-ийн render хийдэг элементийг гараар өөрчлөхгүй (SVG чимэглэлийн `<svg>` контейнерууд хоосон render хийгдэж, дотор нь JS дүүргэнэ).
- Өгөгдөл: `page.tsx` server component `Promise.all`-оор татна (`olympiad-api.ts`, `revalidate: 60`, алдаанд `null`); секц `null` авбал `<p class="section-note">Мэдээлэл түр байхгүй.</p>`; албум хоосон бол секц render хийхгүй.
- Тест: `cd backend && uv run pytest --tb=short -q` (одоо 104); frontend `npx tsc --noEmit -p tsconfig.json`, `node node_modules/eslint/bin/eslint.js <paths>` (`npx eslint` segfault хийж болзошгүй); `results/import/page.tsx`-ийн 4 хуучин `no-unescaped-entities` алдаа хамаарахгүй. Dev server-ийг Bash-аас асаахгүй.
- Windows: Bash heredoc ашиглана; Cyrillic хэвлэхэд `PYTHONIOENCODING=utf-8`.

---

## Файлын бүтэц

```
backend/app/olympiad/models.py           # T1: OlympiadPage + PAGE_DEFAULTS
backend/app/olympiad/schemas.py          # T1: StatItem, PageOut, PagePatch
backend/app/olympiad/router.py           # T1: GET/PATCH page/, POST/DELETE page/portrait/
backend/alembic/versions/0007_olympiad_page.py   # T1
backend/tests/test_olympiad_page.py      # T1

frontend/src/lib/types.ts                # T2: OlympiadStat, OlympiadPage
frontend/src/lib/api.ts                  # T2: api.olympiadPage
frontend/src/app/admin/(dashboard)/layout.tsx          # T2: NAV "Олимпиадын хуудас"
frontend/src/app/admin/(dashboard)/olympiad-page/page.tsx  # T2

frontend/package.json                    # T3: katex, @types/katex
frontend/src/lib/olympiad-api.ts         # T3
frontend/src/lib/olympiad-data.ts        # T3: FORMULAS
frontend/src/lib/yearTiles.ts            # T3: buildYear (main.js-ийн генераторууд)
frontend/src/components/olympiad/gsap.ts # T3
frontend/src/components/olympiad/useSmoother.ts  # T3
frontend/src/components/olympiad/OlympiadPage.tsx # T3 (секцүүд T4–T9-д нэмэгдэнэ)
frontend/src/components/olympiad/Heading.tsx     # T3
frontend/src/components/olympiad/Formulas.tsx    # T3
frontend/src/components/olympiad/About.tsx       # T3
frontend/src/components/olympiad/Contact.tsx     # T3
frontend/src/app/olympiad/olympiad.css   # T3 (style.css порт)
frontend/src/app/olympiad/layout.tsx     # T3
frontend/src/app/olympiad/page.tsx       # T3
frontend/src/components/olympiad/Nav.tsx         # T4
frontend/src/components/olympiad/Hero.tsx        # T5
frontend/src/components/olympiad/Album.tsx       # T6
frontend/src/components/olympiad/Schedule.tsx    # T7
frontend/src/components/olympiad/Results.tsx     # T8
frontend/src/components/olympiad/YearTiles.tsx   # T9
index.html style.css *.js images/ .claude/dev-server.js   # T10: устгана
.claude/launch.json, README.md           # T10
```

---

### Task 1: Backend — олимпиадын хуудасны тохиргоо

**Files:**
- Modify: `backend/app/olympiad/models.py`, `backend/app/olympiad/schemas.py`, `backend/app/olympiad/router.py`
- Create: `backend/alembic/versions/0007_olympiad_page.py`
- Test: `backend/tests/test_olympiad_page.py`

**Interfaces:**
- Produces: `GET /api/olympiad/page/` → `PageOut {eyebrow, title, bio, portrait_image: str|null (бүтэн URL), portrait_caption, about_title, about_lead, stats: [{value,label}], contact_address, contact_phone, contact_email}`; `PATCH /api/olympiad/page/` (staff, `PagePatch` бүх талбар optional); `POST /api/olympiad/page/portrait/` (staff, multipart `image`) ба `DELETE …/portrait/` → `PageOut`.

- [ ] **Step 1: Тест бичих**

`backend/tests/test_olympiad_page.py`:

```python
import io

from PIL import Image

from tests.helpers import staff_headers


def png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (40, 50), (30, 58, 143)).save(buf, format="PNG")
    return buf.getvalue()


async def test_page_defaults_created_on_first_get(client):
    r = await client.get("/api/olympiad/page/")
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["title"] == "Ү.Маамын нэрэмжит математикийн олимпиад"
    assert p["eyebrow"] == "Монгол Улсын Ардын багш" and p["portrait_image"] is None
    assert [s["value"] for s in p["stats"]] == ["2026", "6–12", "3"]
    assert p["contact_email"] == "info@shine-ue.edu.mn"
    assert (await client.get("/api/olympiad/page/")).json() == p  # хоёр дахь удаад ижил мөр


async def test_page_patch(client, make_user):
    h = await staff_headers(client, make_user)
    body = {"bio": "Шинэ намтар", "stats": [{"value": "2027", "label": "Он"}, {"value": "7", "label": "Анги"}],
            "contact_phone": "+976 7000-0000"}
    r = await client.patch("/api/olympiad/page/", headers=h, json=body)
    assert r.status_code == 200, r.text
    assert r.json()["bio"] == "Шинэ намтар" and len(r.json()["stats"]) == 2 and r.json()["contact_phone"] == "+976 7000-0000"
    assert r.json()["title"] == "Ү.Маамын нэрэмжит математикийн олимпиад"  # бусад талбар хэвээр

    r = await client.patch("/api/olympiad/page/", headers=h, json={"stats": [{"value": "x", "label": ""}]})
    assert r.status_code == 400 and "stats" in r.json()
    r = await client.patch("/api/olympiad/page/", headers=h, json={"stats": [{"value": str(i), "label": "l"} for i in range(5)]})
    assert r.status_code == 400 and "stats" in r.json()
    r = await client.patch("/api/olympiad/page/", headers=h, json={"stats": []})
    assert r.status_code == 400 and "stats" in r.json()
    r = await client.patch("/api/olympiad/page/", headers=h, json={"title": ""})
    assert r.status_code == 400 and "title" in r.json()


async def test_page_write_requires_staff(client, make_user):
    assert (await client.patch("/api/olympiad/page/", json={"bio": "x"})).status_code == 401
    await make_user("plain")
    from tests.helpers import login
    t = await login(client, "plain")
    r = await client.patch("/api/olympiad/page/", headers={"Authorization": f"Bearer {t['access']}"}, json={"bio": "x"})
    assert r.status_code == 403


async def test_portrait_upload_replace_delete(client, make_user, tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "media_dir", tmp_path)
    h = await staff_headers(client, make_user)
    files = {"image": ("maam.png", png_bytes(), "image/png")}
    r = await client.post("/api/olympiad/page/portrait/", headers=h, files=files)
    assert r.status_code == 200, r.text
    url1 = r.json()["portrait_image"]
    assert url1 and "/media/olympiad/" in url1
    rel1 = url1.split("/media/")[1]
    assert (tmp_path / rel1).exists()

    r = await client.post("/api/olympiad/page/portrait/", headers=h, files={"image": ("maam2.png", png_bytes(), "image/png")})
    url2 = r.json()["portrait_image"]
    assert url2 != url1 and not (tmp_path / rel1).exists()  # хуучин файл устсан

    r = await client.delete("/api/olympiad/page/portrait/", headers=h)
    assert r.status_code == 200 and r.json()["portrait_image"] is None
    assert not (tmp_path / url2.split("/media/")[1]).exists()
    assert (await client.get("/api/olympiad/page/")).json()["portrait_image"] is None
```

`tests/helpers.py`-д `login` байгаа (олимпиадын тестүүд ашигладаг). `make_user("plain")` — эрхгүй хэрэглэгч (`is_staff` False).

- [ ] **Step 2: Тест унахыг батлах**

Run: `cd backend && uv run pytest tests/test_olympiad_page.py -q --tb=line`
Expected: FAIL — 404 (`{"detail": "Олдсонгүй."}`).

- [ ] **Step 3: Модель ба migration**

`backend/app/olympiad/models.py`-ийн төгсгөлд:

```python
PAGE_DEFAULTS: dict = {
    "eyebrow": "Монгол Улсын Ардын багш",
    "title": "Ү.Маамын нэрэмжит математикийн олимпиад",
    "bio": ("Ү.Маам багш нь олон жилийн турш математикийн багшаар ажиллаж, олон үеийн сурагчдыг математикийн "
            "олимпиадад бэлтгэн амжилтад хүргэсэн. Түүний хөдөлмөр, зүтгэлийг үнэлж Монгол Улсын Ардын багш цол "
            "хүртээсэн. Энэхүү олимпиад нь багшийн нэрийг мөнхжүүлж, залуу үеийнхэнд математикийн хайрыг өвлүүлэх зорилготой."),
    "portrait_caption": "Монгол Улсын Ардын багш Ү.Маам",
    "about_title": "Математикт дурлах залуу үеийг дэмжинэ",
    "about_lead": ("Ү.Маамын нэрэмжит математикийн олимпиад нь 6–12-р ангийн сурагчдын дунд жил бүр зохион байгуулагдаж, "
                   "математикийн сэтгэлгээ, бодлого бодох чадварыг хөгжүүлэхэд чиглэнэ."),
    "stats": [{"value": "2026", "label": "Олимпиадын жил"}, {"value": "6–12", "label": "Анги"}, {"value": "3", "label": "Шат"}],
    "contact_address": "Улаанбаатар хот",
    "contact_phone": "+976 0000-0000",
    "contact_email": "info@shine-ue.edu.mn",
}


class OlympiadPage(Base):
    """Олимпиадын хуудасны админаас засагддаг текст, хөрөг. Үргэлж нэг мөр (id=1)."""
    __tablename__ = "olympiad_page"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    eyebrow: Mapped[str] = mapped_column(String(80), default="")
    title: Mapped[str] = mapped_column(String(160))
    bio: Mapped[str] = mapped_column(Text, default="")
    portrait_image: Mapped[str | None] = mapped_column(String(255), nullable=True)  # "olympiad/xxx.jpg"
    portrait_caption: Mapped[str] = mapped_column(String(160), default="")
    about_title: Mapped[str] = mapped_column(String(160), default="")
    about_lead: Mapped[str] = mapped_column(Text, default="")
    stats: Mapped[list] = mapped_column(JSONB, default=list)  # [{value, label}]
    contact_address: Mapped[str] = mapped_column(String(200), default="")
    contact_phone: Mapped[str] = mapped_column(String(60), default="")
    contact_email: Mapped[str] = mapped_column(String(120), default="")
```

`backend/alembic/versions/0007_olympiad_page.py`:

```python
"""olympiad page settings (single row)

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "olympiad_page",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("eyebrow", sa.String(80), nullable=False, server_default=""),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("bio", sa.Text, nullable=False, server_default=""),
        sa.Column("portrait_image", sa.String(255), nullable=True),
        sa.Column("portrait_caption", sa.String(160), nullable=False, server_default=""),
        sa.Column("about_title", sa.String(160), nullable=False, server_default=""),
        sa.Column("about_lead", sa.Text, nullable=False, server_default=""),
        sa.Column("stats", JSONB, nullable=False, server_default="[]"),
        sa.Column("contact_address", sa.String(200), nullable=False, server_default=""),
        sa.Column("contact_phone", sa.String(60), nullable=False, server_default=""),
        sa.Column("contact_email", sa.String(120), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_table("olympiad_page")
```

- [ ] **Step 4: Схем**

`backend/app/olympiad/schemas.py`-ийн төгсгөлд:

```python
class StatItem(BaseModel):
    value: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=80)


class PageOut(BaseModel):
    eyebrow: str
    title: str
    bio: str
    portrait_image: str | None
    portrait_caption: str
    about_title: str
    about_lead: str
    stats: list[StatItem]
    contact_address: str
    contact_phone: str
    contact_email: str


class PagePatch(BaseModel):
    eyebrow: str | None = Field(default=None, max_length=80)
    title: str | None = Field(default=None, min_length=1, max_length=160)
    bio: str | None = None
    portrait_caption: str | None = Field(default=None, max_length=160)
    about_title: str | None = Field(default=None, max_length=160)
    about_lead: str | None = None
    stats: list[StatItem] | None = Field(default=None, min_length=1, max_length=4)
    contact_address: str | None = Field(default=None, max_length=200)
    contact_phone: str | None = Field(default=None, max_length=60)
    contact_email: str | None = Field(default=None, max_length=120)
```

`min_length`/`max_length` зөрчил, `stats[0].label` хоосон зэрэг нь `RequestValidationError` → `errors.py` тэдгээрийг `{field: [...]}` болгоно; `stats`-ийн доторх алдааны `loc` = `["body","stats",0,"label"]` → handler сүүлийн элементийг талбар гэж авдаг тул `label` гэж гарна. Тест `"stats" in r.json()` шаарддаг тул `PagePatch`-д validator нэмнэ:

```python
from pydantic import field_validator


class PagePatch(BaseModel):
    ...
    @field_validator("stats", mode="before")
    @classmethod
    def _stats(cls, v):
        if v is None:
            return v
        if not isinstance(v, list) or not 1 <= len(v) <= 4:
            raise ValueError("1–4 үзүүлэлт байна.")
        for s in v:
            if not isinstance(s, dict) or not str(s.get("value", "")).strip() or not str(s.get("label", "")).strip():
                raise ValueError("Үзүүлэлт бүр утга ба нэртэй байна.")
            if len(str(s["value"])) > 40 or len(str(s["label"])) > 80:
                raise ValueError("Утга 40, нэр 80 тэмдэгтээс урт байж болохгүй.")
        return v
```

(`mode="before"` тул `loc`-ийн сүүлийн элемент `stats` болно; `Field(min_length/max_length)`-ийг `stats`-аас хасна.)

- [ ] **Step 5: Router**

`backend/app/olympiad/router.py`: импортод `OlympiadPage, PAGE_DEFAULTS` (models) ба `PageOut, PagePatch, StatItem` (schemas) нэмнэ. `album_out`-ын дараа:

```python
def _media_url(request: Request, rel: str) -> str:
    if settings.media_base_url:
        return f"{settings.media_base_url.rstrip('/')}/media/{rel}"
    return f"{request.base_url}media/{rel}"


async def get_page(db: AsyncSession) -> OlympiadPage:
    """Нэг мөрт тохиргоо; байхгүй бол анхдагч утгаар үүсгэнэ."""
    p = await db.get(OlympiadPage, 1)
    if p is None:
        p = OlympiadPage(id=1, **PAGE_DEFAULTS)
        db.add(p)
        await db.commit()
    return p


def page_out(request: Request, p: OlympiadPage) -> PageOut:
    return PageOut(
        eyebrow=p.eyebrow, title=p.title, bio=p.bio,
        portrait_image=_media_url(request, p.portrait_image) if p.portrait_image else None,
        portrait_caption=p.portrait_caption, about_title=p.about_title, about_lead=p.about_lead,
        stats=[StatItem(**s) for s in (p.stats or [])],
        contact_address=p.contact_address, contact_phone=p.contact_phone, contact_email=p.contact_email,
    )
```

`album_out`-ыг `_media_url` ашигладаг болгож давхардлыг арилгана (`image=_media_url(request, p.image)`). Файлын төгсгөлд:

```python
# ---- олимпиадын хуудасны тохиргоо ----
@router.get("/page/", response_model=PageOut)
async def page_get(request: Request, db: DB):
    return page_out(request, await get_page(db))


@router.patch("/page/", response_model=PageOut)
async def page_patch(body: PagePatch, request: Request, db: DB, _: Staff):
    p = await get_page(db)
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(p, k, [dict(s) for s in v] if k == "stats" else v)
    await db.commit()
    return page_out(request, p)


@router.post("/page/portrait/", response_model=PageOut)
async def page_portrait(request: Request, db: DB, _: Staff, image: Annotated[UploadFile, File()]):
    p = await get_page(db)
    old = p.portrait_image
    p.portrait_image = await save_upload(image, "olympiad")
    await db.commit()
    if old:
        delete_file(old)
    return page_out(request, p)


@router.delete("/page/portrait/", response_model=PageOut)
async def page_portrait_delete(request: Request, db: DB, _: Staff):
    p = await get_page(db)
    old = p.portrait_image
    p.portrait_image = None
    await db.commit()
    if old:
        delete_file(old)
    return page_out(request, p)
```

`stats` нь `model_dump` дараа dict-ийн list болно (`[dict(s) for s in v]` — dict хэвээр байвал хэвээр). Router-ийн docstring-д 4 endpoint нэмнэ.

- [ ] **Step 6: Тест ажиллуулах, migration**

Run: `cd backend && uv run pytest tests/test_olympiad_page.py -v --tb=short` → 4 PASSED. `save_upload` `media_dir`-ийг `settings`-ээс уншдаг эсэхийг шалгана (`app/common/media.py`); хэрэв модуль ачаалах үед хуулж авдаг бол тест `monkeypatch.setattr(settings, "media_dir", tmp_path)` нөлөөлөхгүй — тэр тохиолдолд `media.py`-д `settings.media_dir`-ийг дуудах бүрт уншдаг болгоно.

Run: `uv run alembic upgrade head` → `0006 -> 0007`; `uv run alembic check` → clean. Run: `uv run pytest --tb=short -q` → 108 passed.

---

### Task 2: Админ — "Олимпиадын хуудас"

**Files:**
- Modify: `frontend/src/lib/types.ts`, `frontend/src/lib/api.ts`, `frontend/src/app/admin/(dashboard)/layout.tsx`
- Create: `frontend/src/app/admin/(dashboard)/olympiad-page/page.tsx`

**Interfaces:**
- Produces: `OlympiadStat {value, label}`, `OlympiadPage` (types), `api.olympiadPage.{get, update(d: Partial<OlympiadPageInput>), setPortrait(file), removePortrait()}`.

- [ ] **Step 1: Төрөл, API**

`types.ts`-ийн `AlbumPhoto`-ийн дараа:

```ts
export interface OlympiadStat { value: string; label: string }
export interface OlympiadPage {
  eyebrow: string; title: string; bio: string; portrait_image: string | null; portrait_caption: string;
  about_title: string; about_lead: string; stats: OlympiadStat[];
  contact_address: string; contact_phone: string; contact_email: string;
}
export type OlympiadPageInput = Omit<OlympiadPage, "portrait_image">;
```

`api.ts`: импортод `OlympiadPage, OlympiadPageInput` нэмж, `album` блокийн дараа:

```ts
  /* ---- олимпиадын хуудасны тохиргоо ---- */
  olympiadPage: {
    get: () => request<OlympiadPage>("/api/olympiad/page/", { auth: false }),
    update: (d: Partial<OlympiadPageInput>) => request<OlympiadPage>("/api/olympiad/page/", { method: "PATCH", body: d }),
    setPortrait: (file: File) => { const fd = new FormData(); fd.append("image", file); return request<OlympiadPage>("/api/olympiad/page/portrait/", { method: "POST", body: fd }); },
    removePortrait: () => request<OlympiadPage>("/api/olympiad/page/portrait/", { method: "DELETE" }),
  },
```

`layout.tsx` NAV: `{ href: "/admin/album", … }`-ийн дараа `{ href: "/admin/olympiad-page", label: "Олимпиадын хуудас", icon: "✦" },`.

- [ ] **Step 2: Хуудас**

`frontend/src/app/admin/(dashboard)/olympiad-page/page.tsx`:

```tsx
"use client";

/* Олимпиадын олон нийтийн хуудасны текст (намтар, тухай, үзүүлэлт, холбоо барих) ба Маам багшийн хөрөг. */

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { OlympiadPage, OlympiadPageInput, OlympiadStat } from "@/lib/types";
import { Button, Card, Field, Input, Spinner, Textarea } from "@/components/ui";

const toInput = (p: OlympiadPage): OlympiadPageInput => ({
  eyebrow: p.eyebrow, title: p.title, bio: p.bio, portrait_caption: p.portrait_caption, about_title: p.about_title,
  about_lead: p.about_lead, stats: p.stats, contact_address: p.contact_address, contact_phone: p.contact_phone, contact_email: p.contact_email,
});

export default function OlympiadPageAdmin() {
  const q = useFetch(() => api.olympiadPage.get(), []);
  const [form, setForm] = useState<OlympiadPageInput | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [portraitBusy, setPortraitBusy] = useState(false);

  // Серверийн өгөгдөл ирэхэд формыг нэг удаа дүүргэнэ (render-д, effect-гүй)
  const data = form ?? (q.data ? toInput(q.data) : null);
  const set = (patch: Partial<OlympiadPageInput>) => data && setForm({ ...data, ...patch });
  const setStat = (i: number, patch: Partial<OlympiadStat>) => data && set({ stats: data.stats.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    setBusy(true); setErrors({}); setSaved(false);
    try {
      const p = await api.olympiadPage.update(data);
      setForm(toInput(p)); setSaved(true);
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  async function uploadPortrait(file: File) {
    setPortraitBusy(true); setErrors({});
    try { await api.olympiadPage.setPortrait(file); q.reload(); }
    catch (err) { setErrors(err instanceof ApiError ? err.fieldErrors : { image: "Зураг оруулж чадсангүй." }); }
    finally { setPortraitBusy(false); }
  }

  async function removePortrait() {
    if (!confirm("Хөрөг зургийг устгах уу?")) return;
    setPortraitBusy(true);
    try { await api.olympiadPage.removePortrait(); q.reload(); }
    catch { alert("Устгаж чадсангүй."); }
    finally { setPortraitBusy(false); }
  }

  if (q.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  if (!data || !q.data) return <Spinner />;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Олимпиадын хуудас</h1>
        <p className="text-sm text-slate-600">Олон нийтийн <code>/olympiad</code> хуудасны намтар, тухай, үзүүлэлт, холбоо барих мэдээлэл. Хуваарь, үр дүн, албум тус тусын хуудаснаас.</p>
      </div>

      <Card className="space-y-3">
        <h2 className="font-bold text-navy">Маам багшийн хөрөг</h2>
        <div className="flex flex-wrap items-start gap-4">
          <div className="relative h-48 w-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {q.data.portrait_image ? <Image src={q.data.portrait_image} alt="Хөрөг" fill unoptimized sizes="160px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs text-slate-500">Зураг байхгүй</span>}
          </div>
          <div className="space-y-2">
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={portraitBusy}
                   onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPortrait(f); e.target.value = ""; }}
                   className="block text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy/90" />
            {errors.image && <p className="text-xs font-medium text-red-600">{errors.image}</p>}
            {q.data.portrait_image && <Button variant="danger" onClick={removePortrait} disabled={portraitBusy}>Зураг устгах</Button>}
            <p className="text-xs text-slate-500">JPEG/PNG/WebP, 10 MB хүртэл. Босоо (4:5) зураг тохиромжтой.</p>
          </div>
        </div>
      </Card>

      <form onSubmit={save} className="space-y-6">
        {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
        <Card className="space-y-4">
          <h2 className="font-bold text-navy">Толгой хэсэг</h2>
          <Field label="Дээд бичиг" error={errors.eyebrow}><Input value={data.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} /></Field>
          <Field label="Гарчиг" error={errors.title}><Input value={data.title} onChange={(e) => set({ title: e.target.value })} required /></Field>
          <Field label="Намтар" error={errors.bio}><Textarea rows={6} value={data.bio} onChange={(e) => set({ bio: e.target.value })} /></Field>
          <Field label="Зургийн тайлбар" error={errors.portrait_caption}><Input value={data.portrait_caption} onChange={(e) => set({ portrait_caption: e.target.value })} /></Field>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-bold text-navy">Олимпиадын тухай</h2>
          <Field label="Гарчиг" error={errors.about_title}><Input value={data.about_title} onChange={(e) => set({ about_title: e.target.value })} /></Field>
          <Field label="Текст" error={errors.about_lead}><Textarea rows={4} value={data.about_lead} onChange={(e) => set({ about_lead: e.target.value })} /></Field>
          <Field label="Үзүүлэлт (1–4)" error={errors.stats}>
            <div className="space-y-2">
              {data.stats.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={s.value} placeholder="2026" onChange={(e) => setStat(i, { value: e.target.value })} className="w-32" />
                  <Input value={s.label} placeholder="Олимпиадын жил" onChange={(e) => setStat(i, { label: e.target.value })} />
                  <Button type="button" variant="ghost" disabled={data.stats.length <= 1} onClick={() => set({ stats: data.stats.filter((_, j) => j !== i) })}>Хасах</Button>
                </div>
              ))}
              {data.stats.length < 4 && <Button type="button" variant="ghost" onClick={() => set({ stats: [...data.stats, { value: "", label: "" }] })}>+ Үзүүлэлт</Button>}
            </div>
          </Field>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-bold text-navy">Холбоо барих</h2>
          <Field label="Хаяг" error={errors.contact_address}><Input value={data.contact_address} onChange={(e) => set({ contact_address: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Утас" error={errors.contact_phone}><Input value={data.contact_phone} onChange={(e) => set({ contact_phone: e.target.value })} /></Field>
            <Field label="И-мэйл" error={errors.contact_email}><Input value={data.contact_email} onChange={(e) => set({ contact_email: e.target.value })} /></Field>
          </div>
        </Card>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button>
          {saved && <span className="text-sm text-emerald-700">Хадгалагдлаа</span>}
        </div>
      </form>
    </div>
  );
}
```

`next/image`-д backend-ийн host зөвшөөрөгдсөн эсэх: албумын хуудас `unoptimized` + `Image`-ийг ижил хостоос ашигладаг тул ижил.

- [ ] **Step 3: Шалгах**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json && node node_modules/eslint/bin/eslint.js src/lib "src/app/admin/(dashboard)/layout.tsx" "src/app/admin/(dashboard)/olympiad-page"` → цэвэр.

Browser (`admin`/`admin1234`): `/admin/olympiad-page` анхдагч текстүүдтэй ачаална; намтар засаад "Хадгалах" → "Хадгалагдлаа", дахин ачаалахад хадгалагдсан; үзүүлэлт нэмэх/хасах, хоосон label-тэй хадгалахад `stats` алдаа; зураг оруулах → урьдчилан харагдана → устгах. `curl -s http://127.0.0.1:8000/api/olympiad/page/`-д өөрчлөлт харагдана. Screenshot.

---
### Task 3: Суурь — хамаарал, GSAP, CSS порт, өгөгдөл, хуудас, Heading/Formulas/About/Contact

**Files:**
- Modify: `frontend/package.json` (katex, @types/katex)
- Create: `frontend/src/components/olympiad/gsap.ts`, `useSmoother.ts`, `OlympiadPage.tsx`, `Heading.tsx`, `Formulas.tsx`, `About.tsx`, `Contact.tsx`; `frontend/src/lib/olympiad-api.ts`, `olympiad-data.ts`, `yearTiles.ts`; `frontend/src/app/olympiad/olympiad.css`, `layout.tsx`, `page.tsx`

**Interfaces:**
- Produces: `gsap.ts` exports `{ gsap, ScrollTrigger, ScrollSmoother, DrawSVGPlugin, MotionPathPlugin, SplitText, useGSAP, reduceMotion(): boolean }`; `useSmoother(rootRef)`; `OlympiadPage({ page, years, stages, results, album })`; `<Heading variant={0|1|2}>text</Heading>`; `<Formulas items={Formula[]} />`; `olympiad-api.ts`: `fetchOlympiadPage(): Promise<OlympiadPage|null>`, `fetchOlympiadYears(): Promise<Years|null>`, `fetchOlympiadStages(): Promise<Stage[]|null>`, `fetchOlympiadResults(): Promise<Result[]|null>`, `fetchOlympiadAlbum(): Promise<AlbumPhoto[]|null>`; `olympiad-data.ts`: `Formula {tex, grade, speed, cls}`, `FORMULAS.{year, about, contact, schedule, results}`; `yearTiles.ts`: `buildYear(svg: SVGSVGElement, year: string, idPrefix: string): Tile[]`, `Tile {el, inner, kind, col, row}`, `randomFiller(): string`.
- Consumes: T1/T2 `OlympiadPage` төрөл; `Stage`, `Result`, `Years`, `AlbumPhoto` (types.ts-д байгаа).

- [ ] **Step 1: Хамаарал**

Run: `cd frontend && npm install katex && npm install -D @types/katex` (package.json/package-lock шинэчлэгдэнэ). `gsap` 3.15 болон `@gsap/react` аль хэдийн байгаа — `node -e "require('gsap/DrawSVGPlugin');require('gsap/ScrollSmoother');require('gsap/SplitText');console.log('ok')"` → `ok`.

- [ ] **Step 2: gsap.ts, useSmoother.ts**

`frontend/src/components/olympiad/gsap.ts`:

```ts
"use client";

/* GSAP ба бүх plugin нэг газар бүртгэгдэнэ. Олимпиадын компонентууд зөвхөн эндээс импортолно. */

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother, DrawSVGPlugin, MotionPathPlugin, SplitText);

/** Хэрэглэгч "хөдөлгөөн багасгах" тохиргоотой эсэх (SSR дээр false). */
export const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, useGSAP, ScrollTrigger, ScrollSmoother, DrawSVGPlugin, MotionPathPlugin, SplitText };
```

`frontend/src/components/olympiad/useSmoother.ts` (smooth.js порт):

```ts
"use client";

/* ScrollSmoother: #smooth-wrapper > #smooth-content-ийг зөөлөн гүйлгэнэ; "#id" холбоосуудыг smoother.scrollTo болгоно.
   Reduced motion үед smoother үүсгэхгүй, энгийн гүйлгэлт. Хуудас #id-тэй нээгдвэл тэр хэсэг рүү очно. */

import type { RefObject } from "react";
import { gsap, ScrollSmoother, ScrollTrigger, reduceMotion, useGSAP } from "./gsap";

export function useSmoother(root: RefObject<HTMLDivElement | null>) {
  useGSAP(() => {
    const el = root.current;
    if (!el) return;
    const reduce = reduceMotion();
    const navH = () => (el.querySelector<HTMLElement>("#topbar")?.offsetHeight ?? 72);
    let smoother: ScrollSmoother | null = null;
    if (!reduce) {
      smoother = ScrollSmoother.create({
        wrapper: "#smooth-wrapper", content: "#smooth-content",
        smooth: 1.2, effects: false, smoothTouch: 0.1, normalizeScroll: false,
      });
    }
    ScrollTrigger.refresh(); // хүүхэд компонентуудын ScrollTrigger-ууд smoother-ээс өмнө үүссэн тул дахин тооцно

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href")!;
      if (id === "#") return;
      const target = el.querySelector<HTMLElement>(id);
      if (!target) return;
      e.preventDefault();
      if (smoother) smoother.scrollTo(target, true, `top ${navH()}px`);
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH(), behavior: reduce ? "auto" : "smooth" });
      history.replaceState(null, "", id);
    };
    el.addEventListener("click", onClick);
    if (location.hash && smoother) {
      const target = el.querySelector<HTMLElement>(location.hash);
      if (target) requestAnimationFrame(() => smoother?.scrollTo(target, false, `top ${navH()}px`));
    }
    gsap.set(el, { autoAlpha: 1 }); // CSS-д .olympiad { visibility: hidden } байхгүй тул no-op; ирээдүйн FOUC хамгаалалт
    return () => { el.removeEventListener("click", onClick); smoother?.kill(); };
  }, { scope: root });
}
```

- [ ] **Step 3: Өгөгдөл**

`frontend/src/lib/olympiad-api.ts`:

```ts
/* Server-side fetch (олимпиадын хуудас). Алдаанд null; 60 сек revalidate. news-api.ts-тэй ижил загвар. */

import type { AlbumPhoto, OlympiadPage, Result, Stage, Years } from "./types";

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const fetchOlympiadPage = () => getJson<OlympiadPage>("/api/olympiad/page/");
export const fetchOlympiadYears = () => getJson<Years>("/api/olympiad/years/");
export const fetchOlympiadStages = () => getJson<Stage[]>("/api/olympiad/schedule/");
export const fetchOlympiadResults = () => getJson<Result[]>("/api/olympiad/results/");
export const fetchOlympiadAlbum = () => getJson<AlbumPhoto[]>("/api/olympiad/album/");
```

`frontend/src/lib/olympiad-data.ts` — `index.html`-ийн `.formula` div-үүд секц бүрээр (`data-tex`, `data-grade`, `data-speed`, класс):

```ts
/* Олимпиадын хуудасны чимэглэлийн томъёо (KaTeX). index.html-ийн .formula элементүүдийн өгөгдөл. */

export interface Formula { tex: string; grade: string; speed: number; cls: string }

export const FORMULAS: Record<"year" | "about" | "contact" | "schedule" | "results", Formula[]> = {
  year: [
    { tex: "S = a \\cdot b", grade: "6-р анги", speed: 0.6, cls: "f1-a" },
    { tex: "\\frac{a}{b} + \\frac{c}{d} = \\frac{ad + bc}{bd}", grade: "6-р анги", speed: 1.1, cls: "f1-b" },
    { tex: "a^2 - b^2 = (a - b)(a + b)", grade: "7-р анги", speed: 0.8, cls: "f1-c" },
    { tex: "P = 2(a + b)", grade: "6-р анги", speed: 1.3, cls: "f1-d" },
  ],
  about: [
    { tex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", grade: "9-р анги", speed: 0.7, cls: "f2-a" },
    { tex: "a^2 + b^2 = c^2", grade: "8-р анги", speed: 1.2, cls: "f2-b" },
    { tex: "S = \\pi r^2", grade: "8-р анги", speed: 0.9, cls: "f2-c" },
    { tex: "\\sin^2\\alpha + \\cos^2\\alpha = 1", grade: "10-р анги", speed: 1.4, cls: "f2-d" },
    { tex: "(a + b)^2 = a^2 + 2ab + b^2", grade: "8-р анги", speed: 0.5, cls: "f2-e" },
  ],
  contact: [
    { tex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1", grade: "11-р анги", speed: 0.8, cls: "f3-a" },
    { tex: "\\int_a^b f(x)\\,dx = F(b) - F(a)", grade: "12-р анги", speed: 1.2, cls: "f3-b" },
    { tex: "\\frac{d}{dx}\\, x^n = n x^{n-1}", grade: "12-р анги", speed: 0.6, cls: "f3-c" },
    { tex: "\\log_a b = \\frac{\\ln b}{\\ln a}", grade: "11-р анги", speed: 1.0, cls: "f3-d" },
    { tex: "V = \\frac{4}{3}\\pi r^3", grade: "11-р анги", speed: 1.4, cls: "f3-e" },
  ],
  schedule: [
    { tex: "\\frac{a}{b} = \\frac{c}{d} \\Rightarrow ad = bc", grade: "7-р анги", speed: 0.7, cls: "f4-a" },
    { tex: "S = \\frac{a \\cdot h}{2}", grade: "7-р анги", speed: 1.2, cls: "f4-b" },
    { tex: "a^m \\cdot a^n = a^{m+n}", grade: "8-р анги", speed: 0.9, cls: "f4-c" },
    { tex: "\\sqrt{a \\cdot b} = \\sqrt{a} \\cdot \\sqrt{b}", grade: "8-р анги", speed: 1.4, cls: "f4-d" },
  ],
  results: [
    { tex: "\\log_a (xy) = \\log_a x + \\log_a y", grade: "10-р анги", speed: 0.8, cls: "f5-a" },
    { tex: "C_n^k = \\frac{n!}{k!\\,(n-k)!}", grade: "11-р анги", speed: 1.1, cls: "f5-b" },
    { tex: "S_n = \\frac{n(a_1 + a_n)}{2}", grade: "9-р анги", speed: 0.6, cls: "f5-c" },
    { tex: "\\cos 2\\alpha = 1 - 2\\sin^2\\alpha", grade: "10-р анги", speed: 1.3, cls: "f5-d" },
  ],
};
```

`frontend/src/lib/yearTiles.ts` — `main.js`-ийн 12–221-р мөр (`TILE`, `GAP`, `C`, `ARC_COLORS`, `DIGITS`, `pick`, `pick2`, бүх хээний генератор, `FILLERS`, `buildYear`) **өөрчлөлтгүй** TypeScript болгоно:
- `const YEAR = "2026"` тогтмолыг хасч `buildYear(svg, year, idPrefix)` параметр болгоно; `for (const ch of year)`; `DIGITS`-д `"0","2","6"` дээр нэмээд `"1","3","4","5","7","8","9"`-ийг мөн 3×5 торон дээр тодорхойлно (ирээдүйн онуудад): 
  ```
  "1": [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]], "3": [[1,1,1],[0,0,1],[1,1,1],[0,0,1],[1,1,1]],
  "4": [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]], "5": [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  "7": [[1,1,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]], "8": [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
  "9": [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]]
  ```
- Экспорт: `export interface Tile { el: SVGGElement; inner: SVGGElement; kind: "arcs" | "filler"; col: number; row: number }`, `export function buildYear(svg: SVGSVGElement, year: string, idPrefix = "y"): Tile[]`, `export const randomFiller = () => pick(FILLERS)()`, `export const TILE`.
- Төрөл: генераторууд `(…): string`; `wrap.innerHTML` хэвээр (SVG namespace-тэй `g` элемент `innerHTML` дэмждэг — прототипт ажилладаг).
- Файлын толгойд `/* main.js-ийн "2026" хавтан үүсгэгч (Bauhaus хээ). Nav-ийн жижиг ба YearTiles-ийн том хувилбар хоёулаа ашиглана. */`.

- [ ] **Step 4: CSS порт**

`frontend/src/app/olympiad/olympiad.css` = `style.css` бүхэлдээ, дараах хувиргалттай:
1. `:root {…}` → `.olympiad { --bg…; --nav-h: 72px; }` (хувьсагчид root-д биш `.olympiad`-д).
2. `* { box-sizing }` → `.olympiad *, .olympiad *::before, .olympiad *::after { box-sizing: border-box; }`.
3. `html { scroll-behavior: auto }` → хасна (globals-д smooth байхгүй). `html, body {…}` → `.olympiad { margin: 0; min-height: 100vh; background: var(--bg); color: var(--ink); font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }`.
4. Бусад бүх сонгогчийн өмнө `.olympiad ` угтвар нэмнэ (`#smooth-wrapper` → `.olympiad #smooth-wrapper`, `.hero` → `.olympiad .hero`, `@media` блок доторх дүрмүүд мөн). Хамгийн найдвартай арга: файлыг PostCSS-гүйгээр гараар бус, Node скриптээр (`postcss` байхгүй) — энгийн regex хувиргалт эрсдэлтэй тул **гараар** секц секцээр хуулж угтвар нэмнэ; `,`-оор тусгаарласан сонгогч бүрт угтвар (`.hd-orn .oa, .hd-ul .oa` → `.olympiad .hd-orn .oa, .olympiad .hd-ul .oa`).
5. Tailwind preflight-аас хамгаалах нэмэлт (файлын төгсгөлд):
   ```css
   .olympiad h1, .olympiad h2, .olympiad h3, .olympiad p { margin: 0; }   /* прототип margin-ийг өөрөө өгдөг газарт л */
   .olympiad img, .olympiad svg { display: inline-block; }
   .olympiad button { font: inherit; color: inherit; }
   .olympiad ul { list-style: none; }
   ```
   Гэхдээ прототипийн CSS `p`, `h3`-д өөр margin өгдөг бол (`.snake-card h3 { margin: 6px 0 6px }`, `.snake-card p { margin: 0 }`) тэдгээр дүрэм дараа ирдэг/илүү тодорхой тул давамгайлна. `.results th, td` padding-ууд хэвээр.
6. `.section-note { margin: 0; color: var(--muted); font-size: 0.95rem; }` нэмнэ (API-гүй үеийн мессеж).
7. `.hero-photo.no-img::before` ба `.slide.no-img::before` орлуулагч дүрмүүд хэвээр.

Прототипийн `index.html`-ийн `<link>`-үүд (KaTeX css) → `layout.tsx`-д `import "katex/dist/katex.min.css"`.

- [ ] **Step 5: Heading, Formulas, About, Contact**

`frontend/src/components/olympiad/Heading.tsx` (headings.js порт, declarative):

```tsx
"use client";

/* Секцийн гарчгийг геометр дүрсээр чимэглэнэ (headings.js): зүүн/баруун дүрс, доор долгион зураас.
   Гурван хувилбар (variant 0–2). Section дэлгэцэнд орж ирэхэд DrawSVG-ээр зурагдаж, дүүргэлт орж ирнэ; тэмдэглэсэн дүрс аажим эргэнэ. */

import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, reduceMotion, useGSAP } from "./gsap";

const VARIANTS = [
  { left: `<path class="oa ln" d="M8,72 A64,64 0 0 1 72,8"/><path class="oa ln" d="M26,72 A46,46 0 0 1 72,26"/><path class="oa ln" d="M44,72 A28,28 0 0 1 72,44"/><circle class="ob fl spin" cx="66" cy="66" r="7"/>`,
    right: `<polygon class="oa ln spin" points="40,8 72,40 40,72 8,40"/><circle class="ob fl" cx="40" cy="40" r="9"/>` },
  { left: `<path class="ob fl" d="M40,6 Q40,40 74,40 Q40,40 40,74 Q40,40 6,40 Q40,40 40,6 Z"/><circle class="oa ln spin" cx="40" cy="40" r="30"/>`,
    right: `<line class="oa ln" x1="10" y1="70" x2="70" y2="10"/><line class="oa ln" x1="10" y1="46" x2="46" y2="10"/><line class="oa ln" x1="34" y1="70" x2="70" y2="34"/><circle class="ob ln spin" cx="62" cy="62" r="10"/>` },
  { left: `<path class="oa ln" d="M8,44 A32,32 0 0 1 72,44"/><path class="oa ln" d="M22,44 A18,18 0 0 1 58,44"/><circle class="ob fl" cx="40" cy="44" r="5"/><line class="oa ln" x1="8" y1="60" x2="72" y2="60"/>`,
    right: `<polyline class="ob ln" points="6,56 20,30 34,56 48,30 62,56 74,30"/><rect class="oa fl spin" x="30" y="6" width="16" height="16"/>` },
];
const UNDERLINE = `<path class="ob ln" d="M2,7 Q17,1 32,7 T62,7 T92,7 T122,7 T152,7"/>`;

export function Heading({ variant, children }: { variant: 0 | 1 | 2; children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const v = VARIANTS[variant];

  useGSAP(() => {
    const el = wrap.current!;
    const strokes = gsap.utils.toArray<SVGElement>(".hd-orn .ln, .hd-ul path", el);
    const fills = gsap.utils.toArray<SVGElement>(".hd-orn .fl", el);
    const spins = gsap.utils.toArray<SVGElement>(".hd-orn .spin", el);
    const section = el.closest("section, header") ?? el;
    if (reduceMotion()) {
      gsap.set(strokes, { drawSVG: "0% 100%" });
      gsap.set(fills, { autoAlpha: 1 });
      return;
    }
    gsap.timeline({ scrollTrigger: { trigger: el, start: "top 80%", toggleActions: "play none none reverse" }, defaults: { ease: "power2.inOut" } })
      .from(strokes, { drawSVG: "0% 0%", duration: 0.9, stagger: 0.07 })
      .from(fills, { autoAlpha: 0, scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2)", stagger: 0.1 }, "-=0.5")
      .from(el.querySelectorAll(".hd-orn"), { x: (i: number) => (i ? 16 : -16), duration: 0.8, ease: "power3.out" }, 0);
    if (spins.length) {
      const spin = gsap.to(spins, { rotation: "+=360", transformOrigin: "50% 50%", duration: 18, ease: "none", repeat: -1, paused: true });
      ScrollTrigger.create({ trigger: section, start: "top bottom", end: "bottom top", onToggle: (self) => (self.isActive ? spin.play() : spin.pause()) });
    }
  }, { scope: wrap });

  return (
    <div ref={wrap} className="heading">
      <div className="heading-row">
        <svg className="hd-orn hd-left" viewBox="0 0 80 80" aria-hidden="true" dangerouslySetInnerHTML={{ __html: v.left }} />
        <div className="hd-title"><h2 className="h2">{children}</h2></div>
        <svg className="hd-orn hd-right" viewBox="0 0 80 80" aria-hidden="true" dangerouslySetInnerHTML={{ __html: v.right }} />
      </div>
      <svg className="hd-ul" viewBox="0 0 154 12" aria-hidden="true" dangerouslySetInnerHTML={{ __html: UNDERLINE }} />
    </div>
  );
}
```

Прототипт `variant = i % 3` (хуудас дахь h2-ийн дараалал: албум 0, хуваарь 1, үр дүн 2, тухай 0, холбоо 1) — секц бүр өөрийнхөө variant-ыг өгнө.

`frontend/src/components/olympiad/Formulas.tsx` (formulas.js порт):

```tsx
"use client";

/* Секцийн хөвөгч KaTeX томъёонууд: орж ирэх (доороос + доогуур зураас DrawSVG), parallax (өөр өөр хурд, бага зэрэг эргэлт),
   тайван хөвөх давталт. Section = хамгийн ойрын section/header. */

import katex from "katex";
import { useRef } from "react";
import type { Formula } from "@/lib/olympiad-data";
import { gsap, reduceMotion, useGSAP } from "./gsap";

export function Formulas({ items }: { items: Formula[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const els = gsap.utils.toArray<HTMLElement>(".formula", root.current!);
    const sec = root.current!.closest("section, header");
    if (!els.length || !sec) return;
    if (reduceMotion()) {
      gsap.set(els, { autoAlpha: 1 });
      gsap.set(".fx-ul path", { drawSVG: "0% 100%" });
      return;
    }
    gsap.timeline({ scrollTrigger: { trigger: sec, start: "top 65%", toggleActions: "play none none reverse" }, defaults: { ease: "power3.out" } })
      .from(els, { autoAlpha: 0, y: 40, scale: 0.85, duration: 0.8, stagger: 0.12 })
      .from(els.map((e) => e.querySelector(".fx-ul path")), { drawSVG: "0% 0%", duration: 0.6, ease: "power2.inOut", stagger: 0.12 }, "-=0.5")
      .from(els.map((e) => e.querySelector(".fx-grade")), { autoAlpha: 0, x: -8, duration: 0.4, stagger: 0.12 }, "-=0.6");
    els.forEach((el) => {
      const speed = Number(el.dataset.speed || "1");
      gsap.to(el, { yPercent: -60 * speed, rotation: (speed - 1) * 14, ease: "none",
                    scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: 1.2 } });
    });
    gsap.to(els.map((e) => e.querySelector(".fx-math")), { y: -6, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 0.35, from: "random" } });
  }, { scope: root });

  return (
    <div ref={root} className="formulas">
      {items.map((f, i) => (
        <div key={f.cls} className={`formula ${f.cls}`} data-speed={f.speed} style={{ ["--tilt" as string]: `${((i % 3) - 1) * 4}deg` }}>
          <span className="fx-math" dangerouslySetInnerHTML={{ __html: katex.renderToString(f.tex, { throwOnError: false, displayMode: false }) }} />
          {f.grade && <span className="fx-grade">{f.grade}</span>}
          <svg className="fx-ul" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2,6 Q25,2 50,6 T98,6" /></svg>
        </div>
      ))}
    </div>
  );
}
```

`.formulas` wrapper нь layout-д нөлөөлөхгүй байх ёстой: `olympiad.css`-д `.olympiad .formulas { display: contents; }` нэмнэ (`.formula` элементүүд секцийн шууд хүүхэд мэт `position: absolute` байрлана — прототипийн `.formula { position: absolute }` ба `.f1-a { top… }` дүрмүүд хэвээр). `katex.renderToString` SSR дээр ажиллана (katex Node-д ажилладаг) — server/client HTML ижил тул hydration зөрөхгүй.

`frontend/src/components/olympiad/About.tsx`:

```tsx
/* "Олимпиадын тухай" секц (section-2): гарчиг, текст, үзүүлэлтүүд — админаас. */

import type { OlympiadPage } from "@/lib/types";
import { FORMULAS } from "@/lib/olympiad-data";
import { Formulas } from "./Formulas";
import { Heading } from "./Heading";

export function About({ page }: { page: OlympiadPage | null }) {
  return (
    <section className="section section-2" id="about">
      <Formulas items={FORMULAS.about} />
      <div className="section-inner narrow">
        <p className="eyebrow">Олимпиадын тухай</p>
        {page ? (
          <>
            <Heading variant={0}>{page.about_title}</Heading>
            <p className="lead">{page.about_lead}</p>
            <ul className="stats">{page.stats.map((s, i) => <li key={i}><strong>{s.value}</strong><span>{s.label}</span></li>)}</ul>
          </>
        ) : <p className="section-note">Мэдээлэл түр байхгүй.</p>}
      </div>
    </section>
  );
}
```

`frontend/src/components/olympiad/Contact.tsx`:

```tsx
/* Холбоо барих секц (section-3, хөх дэвсгэр) — админаас. */

import type { OlympiadPage } from "@/lib/types";
import { FORMULAS } from "@/lib/olympiad-data";
import { Formulas } from "./Formulas";
import { Heading } from "./Heading";

export function Contact({ page }: { page: OlympiadPage | null }) {
  return (
    <section className="section section-3" id="contact">
      <Formulas items={FORMULAS.contact} />
      <div className="section-inner narrow">
        <p className="eyebrow">Холбоо барих</p>
        <Heading variant={1}>Бидэнтэй холбогдоорой</Heading>
        {page ? (
          <ul className="contact-list">
            <li><span>Хаяг</span><strong>{page.contact_address}</strong></li>
            <li><span>Утас</span><strong>{page.contact_phone}</strong></li>
            <li><span>И-мэйл</span><strong>{page.contact_email}</strong></li>
          </ul>
        ) : <p className="section-note">Мэдээлэл түр байхгүй.</p>}
      </div>
    </section>
  );
}
```

(`Heading`/`Formulas` client компонентуудыг server компонентоос дуудаж болно — тэдгээр `"use client"`.)

- [ ] **Step 6: OlympiadPage, layout, page**

`frontend/src/components/olympiad/OlympiadPage.tsx`:

```tsx
"use client";

/* Олимпиадын хуудасны client root: .olympiad дизайны хүрээ, ScrollSmoother wrapper, секцүүдийн дараалал.
   Nav (T4), Hero (T5), Album (T6), Schedule (T7), Results (T8), YearTiles (T9) тус тусын task-д нэмэгдэнэ. */

import { useRef } from "react";
import type { AlbumPhoto, OlympiadPage as PageSettings, Result, Stage, Years } from "@/lib/types";
import { About } from "./About";
import { Contact } from "./Contact";
import { useSmoother } from "./useSmoother";

export interface OlympiadData {
  page: PageSettings | null;
  years: Years | null;
  stages: Stage[] | null;
  results: Result[] | null;
  album: AlbumPhoto[] | null;
}

/** "2026" хавтан ба хуваарийн анхдагч он: хуваарийн хамгийн сүүлийн жил, байхгүй бол одоогийн он. */
export const latestYear = (years: Years | null) =>
  years && years.schedule.length ? Math.max(...years.schedule) : new Date().getFullYear();

export function OlympiadPage({ page, years, stages, results, album }: OlympiadData) {
  const root = useRef<HTMLDivElement>(null);
  useSmoother(root);
  void stages; void results; void album; void years; // T7–T9-д ашиглагдана
  return (
    <div ref={root} className="olympiad">
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <About page={page} />
          <Contact page={page} />
        </div>
      </div>
    </div>
  );
}
```

(`void` мөрүүдийг T4–T9-д секцүүд нэмэгдэх бүрт хасна.)

`frontend/src/app/olympiad/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./olympiad.css";

export const metadata: Metadata = {
  title: "Ү.Маамын нэрэмжит математикийн олимпиад — Шинэ Үе сургууль",
  description: "Монгол Улсын Ардын багш Ү.Маамын нэрэмжит математикийн олимпиад: хуваарь, үр дүн, дурсамжийн албум.",
};

export default function OlympiadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

`frontend/src/app/olympiad/page.tsx`:

```tsx
/* /olympiad — server component: бүх өгөгдлийг зэрэг татаж client root-д дамжуулна. */

import { OlympiadPage } from "@/components/olympiad/OlympiadPage";
import { fetchOlympiadAlbum, fetchOlympiadPage, fetchOlympiadResults, fetchOlympiadStages, fetchOlympiadYears } from "@/lib/olympiad-api";

export default async function Page() {
  const [page, years, stages, results, album] = await Promise.all([
    fetchOlympiadPage(), fetchOlympiadYears(), fetchOlympiadStages(), fetchOlympiadResults(), fetchOlympiadAlbum(),
  ]);
  return <OlympiadPage page={page} years={years} stages={stages} results={results} album={album} />;
}
```

`Years` төрөл `types.ts`-д `{ schedule: number[]; results: number[] }` байгаа эсэхийг шалгана (байгаа).

- [ ] **Step 7: Шалгах**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json && node node_modules/eslint/bin/eslint.js src/components/olympiad src/app/olympiad src/lib/olympiad-api.ts src/lib/olympiad-data.ts src/lib/yearTiles.ts` → цэвэр (`dangerouslySetInnerHTML` нь тогтмол SVG string ба KaTeX гаралт — `react/no-danger` идэвхгүй; идэвхтэй бол мөрөнд `// eslint-disable-next-line react/no-danger` тайлбартай).

Browser: `static` (5173) ба `frontend` (3000) preview асаана. `http://localhost:3000/olympiad` → "Олимпиадын тухай" (саарал дэвсгэр, 3 үзүүлэлт, гарчгийн чимэглэл зурагдана, томъёо гарч ирнэ) ба "Холбоо барих" (хөх дэвсгэр) секцүүд прототипийн (5173) харгалзах секцтэй харагдацаараа ижил; гүйлгэхэд ScrollSmoother зөөлөн; console-д алдаагүй (`read_console_messages`). Mobile 375px: томъёо секцээс халихгүй. Screenshot хоёуланг.

---

### Task 4: Nav

**Files:**
- Create: `frontend/src/components/olympiad/Nav.tsx`
- Modify: `frontend/src/components/olympiad/OlympiadPage.tsx`

**Interfaces:**
- Consumes: `yearTiles.buildYear`, `gsap.ts`.
- Produces: `<Nav year={number} />` — `#topbar` (fixed, `#smooth-wrapper`-ийн ГАДНА `.olympiad` дотор).

- [ ] **Step 1: Компонент**

`frontend/src/components/olympiad/Nav.tsx` — `index.html` 14–46-р мөрийн markup + `nav.js`:

```tsx
"use client";

/* Дээд цэс (nav.js): лого DrawSVG, долгион зам + MotionPath дүрсүүд, hover доогуур зураас, идэвхтэй холбоос
   ScrollTrigger-ээр солигдоно; баруун талд жижиг "2026" хавтан (статик). "← Сургуулийн сайт" холбоос нэмэгдсэн. */

import Link from "next/link";
import { useRef } from "react";
import { buildYear } from "@/lib/yearTiles";
import { gsap, ScrollTrigger, useGSAP } from "./gsap";

const NAVY = "#1E3A8F";
const GOLD = "#FFC20E";
const LINKS = [{ href: "#hero", label: "Нүүр" }, { href: "#schedule", label: "Хуваарь" }, { href: "#results", label: "Үр дүн" }];
const Ul = () => <svg className="ul" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M2,6 Q25,1 50,6 T98,6" /></svg>;

export function Nav({ year }: { year: number }) {
  const nav = useRef<HTMLElement>(null);
  const art = useRef<SVGSVGElement>(null);
  const navYear = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    const navEl = nav.current!, artEl = art.current!;
    buildYear(navYear.current!, String(year), "nav");

    /* --------------------- долгион зам (өргөнөөс хамаарна) — nav.js buildArt --------------------- */
    let wave: SVGPathElement | null = null, travelers: Element[] = [], travelTweens: gsap.core.Tween[] = [];
    function buildArt() {
      const W = navEl.clientWidth, H = navEl.clientHeight;
      artEl.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const base = H - 10, amp = 6, seg = 160;
      let d = `M-20,${base}`;
      for (let x = -20; x < W + seg; x += seg) d += ` Q${x + seg / 4},${base - amp} ${x + seg / 2},${base} T${x + seg},${base}`;
      artEl.innerHTML = `
        <path id="nav-wave" d="${d}" fill="none" stroke="${NAVY}" stroke-opacity="0.22" stroke-width="2"/>
        <g class="tr tr-dot"><circle r="5" fill="${GOLD}"/></g>
        <g class="tr tr-diamond"><rect x="-5" y="-5" width="10" height="10" fill="${NAVY}"/></g>
        <g class="tr tr-ring"><circle r="5" fill="none" stroke="${GOLD}" stroke-width="2.5"/></g>`;
      wave = artEl.querySelector("#nav-wave");
      travelers = gsap.utils.toArray<Element>(".tr", artEl);
    }

    const mm = gsap.matchMedia();
    mm.add({ reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
      const reduce = !!ctx.conditions?.reduce;
      buildArt();
      const mark = gsap.utils.toArray<Element>(".brand-mark > *", navEl);
      const fills = gsap.utils.toArray<Element>(".brand-mark [fill-opacity]", navEl);
      if (reduce) {
        gsap.set([mark, wave], { drawSVG: "0% 100%" });
        gsap.set(fills, { fillOpacity: 1 });
        gsap.set(travelers, { autoAlpha: 0 });
        return;
      }
      const enter = gsap.timeline({ defaults: { ease: "power2.inOut" } });
      enter
        .from(mark, { drawSVG: "0% 0%", duration: 0.9, stagger: 0.15 })
        .to(fills, { fillOpacity: 1, duration: 0.5, ease: "power1.out", stagger: 0.06 }, "-=0.3")
        .from(wave, { drawSVG: "0% 0%", duration: 1.6, ease: "power1.inOut" }, 0.2)
        .from(navEl.querySelectorAll(".nav-year .tile"), { scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(1.6)", stagger: { each: 0.015, from: "start" } }, 0.5)
        .from(navEl.querySelectorAll(".brand-text, .nav-links li"), { autoAlpha: 0, y: 8, duration: 0.5, stagger: 0.08, ease: "power2.out" }, 0.4);

      function startTravel() {
        travelTweens.forEach((t) => t.kill());
        travelTweens = travelers.map((el, i) => gsap.to(el, {
          duration: 14 + i * 4, repeat: -1, ease: "none", delay: -i * 5,
          motionPath: { path: wave!, align: wave!, alignOrigin: [0.5, 0.5], autoRotate: i === 1 },
        }));
        gsap.set(artEl.querySelectorAll(".tr-diamond rect"), { rotation: 45, transformOrigin: "50% 50%" });
      }
      startTravel();

      let resizeTimer: ReturnType<typeof setTimeout>;
      const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { buildArt(); startTravel(); }, 150); };
      window.addEventListener("resize", onResize);
      return () => { window.removeEventListener("resize", onResize); travelTweens.forEach((t) => t.kill()); enter.kill(); };
    });

    /* Hover: доогуур зураас; гүйлгэхэд идэвхтэй холбоос — nav.js */
    const links = gsap.utils.toArray<HTMLAnchorElement>(".nav-links a", navEl);
    const cleanups: (() => void)[] = [];
    links.forEach((link) => {
      const path = link.querySelector(".ul path");
      if (!path) return;
      gsap.set(path, { drawSVG: link.classList.contains("is-active") ? "0% 100%" : "0% 0%" });
      const enter = () => gsap.to(path, { drawSVG: "0% 100%", duration: 0.45, ease: "power2.out", overwrite: true });
      const leave = () => { if (!link.classList.contains("is-active")) gsap.to(path, { drawSVG: "100% 100%", duration: 0.35, ease: "power2.in", overwrite: true }); };
      link.addEventListener("mouseenter", enter); link.addEventListener("mouseleave", leave);
      cleanups.push(() => { link.removeEventListener("mouseenter", enter); link.removeEventListener("mouseleave", leave); });
    });
    function setActive(hash: string) {
      links.forEach((l) => {
        const on = l.getAttribute("href") === hash;
        l.classList.toggle("is-active", on);
        const path = l.querySelector(".ul path");
        if (path) gsap.to(path, { drawSVG: on ? "0% 100%" : "0% 0%", duration: 0.4, overwrite: true });
      });
    }
    links.forEach((l) => {
      const h = () => { const href = l.getAttribute("href") || ""; if (href.startsWith("#")) setActive(href); };
      l.addEventListener("click", h); cleanups.push(() => l.removeEventListener("click", h));
    });
    // Секцүүд DOM-д бүрэн орсны дараа (хүүхэд секцүүд Nav-ийн дараа mount болж болно)
    const raf = requestAnimationFrame(() => {
      ["#hero", "#schedule", "#results"].forEach((id) => {
        if (!document.querySelector(id)) return;
        ScrollTrigger.create({ trigger: id, start: "top 50%", end: "bottom 50%", onToggle: (self) => { if (self.isActive) setActive(id); } });
      });
    });
    return () => { cancelAnimationFrame(raf); mm.revert(); cleanups.forEach((f) => f()); };
  }, { scope: nav });

  return (
    <nav ref={nav} className="topbar" id="topbar" aria-label="Үндсэн цэс">
      <svg ref={art} className="nav-art" id="nav-art" aria-hidden="true" />
      <a className="brand" href="#hero">
        <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
          <circle className="m-ring" cx="24" cy="24" r="21" fill="none" stroke="#1E3A8F" strokeWidth="3" />
          <path className="m-top" d="M3,24 A21,21 0 0 1 45,24 Z" fill="#1E3A8F" fillOpacity="0" stroke="#1E3A8F" strokeWidth="2" />
          <path className="m-bot" d="M3,24 A21,21 0 0 0 45,24 Z" fill="#FFC20E" fillOpacity="0" stroke="#FFC20E" strokeWidth="2" />
          <path className="m-shield" d="M24,13 L33,16.5 V25 C33,31 24,35.5 24,35.5 C24,35.5 15,31 15,25 V16.5 Z" fill="#FFFFFF" fillOpacity="0" stroke="#1E3A8F" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <span className="brand-text"><strong>ШИНЭ ҮЕ</strong><small>СУРГУУЛЬ</small></span>
      </a>
      <ul className="nav-links">
        {LINKS.map((l, i) => <li key={l.href}><a href={l.href} className={i === 0 ? "is-active" : undefined}>{l.label}<Ul /></a></li>)}
        <li><Link href="/" className="nav-site">← Сургуулийн сайт<Ul /></Link></li>
      </ul>
      <a className="nav-year-link" href="#section-1" aria-label={`${year} хэсэг рүү очих`}>
        <svg ref={navYear} className="nav-year" id="nav-year" viewBox="0 0 1500 500" aria-hidden="true" />
      </a>
    </nav>
  );
}
```

`.nav-site`: "Сургуулийн сайт" утсан дээр заавал харагдана — `olympiad.css`-ийн `@media (max-width: 760px)` дахь `.nav-links` нуух дүрмийг (`style.css:133`) шалгаж, шаардлагатай бол `.olympiad .nav-links .nav-site`-ийг утсан дээр `display: inline-block` болгоно; `setActive` нь `href` харьцуулалтаар ажиллах тул `/` холбоос идэвхтэй болохгүй. `nav.js`-ийн `gsap.registerPlugin` мөрүүд хасагдсан (gsap.ts-д). JSX-д SVG атрибутууд camelCase (`fillOpacity`); `[fill-opacity]` атрибут сонгогч DOM дээр ажиллана.

`OlympiadPage.tsx`: `<div ref={root} className="olympiad">` дотор `#smooth-wrapper`-ийн ӨМНӨ `<Nav year={latestYear(years)} />`; `void years` мөрийг хасна.

- [ ] **Step 2: Шалгах**

tsc/eslint цэвэр. Browser 3000 vs 5173: лого зурагдана, долгион дээгүүр 3 дүрс урсана, жижиг "2026" хавтан баруун талд, hover-д шар доогуур зураас, "← Сургуулийн сайт" дарахад нүүр хуудас; цонх өргөн өөрчлөхөд долгион дахин зурагдана; утсан (375) дээр "Сургуулийн сайт" харагдана. Console цэвэр. Screenshot.

---
### Task 5: Hero (намтар + хөрөг)

**Files:**
- Create: `frontend/src/components/olympiad/Hero.tsx`
- Modify: `frontend/src/components/olympiad/OlympiadPage.tsx`

**Interfaces:**
- Consumes: `OlympiadPage` тохиргоо (page.eyebrow/title/bio/portrait_image/portrait_caption), `gsap.ts`.
- Produces: `<Hero page={PageSettings | null} />` → `<header class="hero" id="hero">`.

- [ ] **Step 1: Компонент**

`frontend/src/components/olympiad/Hero.tsx`:

```tsx
"use client";

/* Толгой хэсэг (hero.js): зүүн намтар, баруун хөрөг. #hero-art дахь геометр дүрсүүд DrawSVG-ээр зурагдаж/арилж давтагдана,
   MotionPath-аар хөвнө; хүрээ зурагдаж зураг гарч ирнэ, хүрээний дагуу дүрсүүд тойрно. Текст, зураг админаас. */

import { useRef } from "react";
import type { OlympiadPage as PageSettings } from "@/lib/types";
import { gsap, MotionPathPlugin, useGSAP } from "./gsap";

const P = { orange: "#F26B2B", yellow: "#FFD500", blue: "#0A63B2", green: "#8CC63F", red: "#BF1F2E", teal: "#0B8A80", purple: "#8A2B8F", navy: "#2C2F8F" };

/* ---- hero.js-ийн дүрс үүсгэгчид (quarterArcs, ringSet, star, diamondNest, stripes, dots, petals) ба `shapes` массивыг
   hero.js 30–109-р мөрөөс (quarterArcs … shapes массив хаагдах хүртэл) ӨӨРЧЛӨЛТГҮЙ хуулна (TypeScript: параметрүүдэд төрөл — cx: number, dir: string, color: string,
   radii: number[], sw = 10 гэх мэт; буцаах string). `shapes` нь модулийн түвшинд тогтмол. ---- */

export function Hero({ page }: { page: PageSettings | null }) {
  const root = useRef<HTMLElement>(null);
  const art = useRef<SVGSVGElement>(null);
  const noImg = useRef(false);

  useGSAP(() => {
    const svg = art.current!;
    svg.innerHTML = shapes.map((s) => `<g class="shape">${s}</g>`).join("");
    const groups = gsap.utils.toArray<SVGGElement>(".shape", svg);
    const strokes = gsap.utils.toArray<SVGElement>(".shape > *", svg);
    const fills = gsap.utils.toArray<SVGElement>("[data-fill]", svg);
    const mm = gsap.matchMedia();
    mm.add({ reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
      const reduce = !!ctx.conditions?.reduce;
      /* ---- hero.js 120–241-р мөрийн (mm.add(...) callback-ийн) биеийг хуулна. Орлуулалт:
         - `gsap.utils.toArray(".photo-frame > *")` → `gsap.utils.toArray(".photo-frame > *", root.current!)`;
         - `copy` сонгогчид, ".hero-photo img", ".photo-frame [data-fill]", ".scroll-hint span", ".pf-orbit", ".pf-o1 rect", ".pf-circle" —
           бүгд root.current дотор (`root.current!.querySelector(...)` эсвэл `gsap.utils.toArray(sel, root.current!)`);
         - `document.querySelector(".photo-frame")` → `root.current!.querySelector(".photo-frame")`;
         - `MotionPathPlugin.convertToPath(rect)[0]` хэвээр (gsap.ts-ээс импортолсон);
         - `return () => draw.kill();` хэвээр. ---- */
    });
    return () => { mm.revert(); svg.innerHTML = ""; };
  }, { scope: root });

  return (
    <header ref={root} className="hero" id="hero">
      <svg ref={art} id="hero-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" />
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{page?.eyebrow ?? "Монгол Улсын Ардын багш"}</p>
          <h1 className="title">{page?.title ?? "Ү.Маамын нэрэмжит математикийн олимпиад"}</h1>
          {page ? <p className="lead bio">{page.bio}</p> : <p className="section-note">Мэдээлэл түр байхгүй.</p>}
          <a className="scroll-hint" href="#album" aria-label="Доош гүйлгэх"><span /></a>
        </div>
        <figure className={`hero-photo${!page?.portrait_image ? " no-img" : ""}`}>
          <svg className="photo-frame" viewBox="0 0 440 520" aria-hidden="true">
            <rect className="pf-rect" x="20" y="20" width="400" height="480" rx="28" fill="none" stroke="#1E3A8F" strokeWidth="4" />
            <circle className="pf-circle" cx="404" cy="56" r="38" fill="#FFC20E" fillOpacity="0" stroke="#FFC20E" strokeWidth="4" data-fill="" />
          </svg>
          {page?.portrait_image && (
            // eslint-disable-next-line @next/next/no-img-element -- backend media, unoptimized хэвээр
            <img src={page.portrait_image} alt={page.portrait_caption} onError={(e) => { noImg.current = true; e.currentTarget.parentElement?.classList.add("no-img"); }} />
          )}
          <figcaption>{page?.portrait_caption ?? ""}</figcaption>
        </figure>
      </div>
    </header>
  );
}
```

`noImg` ref зөвхөн `onError`-ийн state-гүй тэмдэглэгээ (setState-гүй, `classList.add`-ийг React-ийн class-тай зөрчилдүүлэхгүйн тулд `className` дахь `no-img`-ийг page-аас, `onError`-ынхыг DOM-оор — дахин render-д className дарж болзошгүй ч `no-img` нэмэгдэх нь зөвхөн зураг алдаатай үед). `<h1>`-ийн `<br />`-ийг прототип гараар тавьдаг байсан; одоо гарчиг админаас ирэх тул `.hero .title { max-width: 14ch }`-тэй төстэй мөр таслалт: `olympiad.css`-д `.olympiad .hero .title { text-wrap: balance; }` нэмнэ.

`OlympiadPage.tsx`: `#smooth-content` дотор хамгийн эхэнд `<Hero page={page} />`.

- [ ] **Step 2: Шалгах**

tsc/eslint цэвэр. Browser 3000 vs 5173: дүрсүүд зурагдаж, 6.5 сек орчмын дараа арилж дахин зурагдана; хүрээ зурагдаж дүрсүүд тойрно; хөрөг байхгүй үед орлуулагч (`.no-img::before`) прототипийнхтэй ижил; `/admin/olympiad-page`-ээс хөрөг оруулаад дахин ачаалахад зураг харагдана; namtar текст өөрчлөлт тусна. Mobile 375: `.hero-grid` нэг багана (`@media (max-width: 900px)`). Console цэвэр.

---

### Task 6: Album

**Files:**
- Create: `frontend/src/components/olympiad/Album.tsx`
- Modify: `frontend/src/components/olympiad/OlympiadPage.tsx`

**Interfaces:**
- Consumes: `AlbumPhoto[]` (`image` бүтэн URL, `title`, `caption`, `order`), `SplitText`.
- Produces: `<Album photos={AlbumPhoto[] | null} />`; хоосон/null бол `null` буцаана (секц харагдахгүй).

- [ ] **Step 1: Компонент**

`frontend/src/components/olympiad/Album.tsx` (album.js порт — slide/dot-ууд React-ээр render, анимаци ба index imperative):

```tsx
"use client";

/* Дурсамжийн албум (album.js): зураг солигдоход тайлбар SplitText-ээр үг үгээр гарч ирнэ; Ken Burns маягийн шилжилт;
   6 сек тутам автомат, hover/focus-д зогсоно; өмнөх/дараах, цэгүүд, доод progress зураас, гарын сум. */

import { useRef } from "react";
import type { AlbumPhoto } from "@/lib/types";
import { gsap, SplitText, reduceMotion, useGSAP } from "./gsap";
import { FORMULAS } from "@/lib/olympiad-data";
import { Heading } from "./Heading";

const AUTOPLAY = 6;
const captionOf = (p: AlbumPhoto) => (p.caption ? `${p.title}. ${p.caption}` : p.title);

export function Album({ photos }: { photos: AlbumPhoto[] | null }) {
  const root = useRef<HTMLElement>(null);
  const list = photos ?? [];

  useGSAP(() => {
    const el = root.current!;
    const stage = el.querySelector<HTMLElement>("#album-stage")!;
    const caption = el.querySelector<HTMLElement>("#album-caption")!;
    const bar = el.querySelector<HTMLElement>("#album-bar")!;
    const album = el.querySelector<HTMLElement>(".album")!;
    const slides = gsap.utils.toArray<HTMLElement>(".slide", stage);
    const dots = gsap.utils.toArray<HTMLButtonElement>(".album-dots button", el);
    if (!slides.length) return;
    const reduce = reduceMotion();
    let index = 0, split: SplitText | null = null, busy = false, progress: gsap.core.Tween | null = null;

    gsap.set(slides, { autoAlpha: 0, xPercent: 0, scale: 1 });
    gsap.set(slides[0], { autoAlpha: 1 });
    slides[0].classList.add("is-active");
    dots[0]?.classList.add("is-active");

    function showCaption(text: string) {
      if (split) { split.revert(); split = null; }
      caption.textContent = text;
      if (reduce) return;
      split = SplitText.create(caption, { type: "words", wordsClass: "w" });
      gsap.from(split.words, { autoAlpha: 0, y: 14, duration: 0.5, ease: "power2.out", stagger: 0.045 });
    }
    function startProgress() {
      if (progress) progress.kill();
      if (reduce) return;
      progress = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", duration: AUTOPLAY, ease: "none", onComplete: () => go(index + 1, 1) });
    }
    function go(to: number, dir?: number) {
      const next = gsap.utils.wrap(0, slides.length, to);
      if (next === index || busy) return;
      dir = dir || (next > index ? 1 : -1);
      busy = true;
      const cur = slides[index], nxt = slides[next];
      index = next;
      dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
      cur.classList.remove("is-active"); nxt.classList.add("is-active");
      const tl = gsap.timeline({ defaults: { duration: reduce ? 0 : 0.9, ease: "power3.inOut" }, onComplete: () => { busy = false; startProgress(); } });
      tl.to(cur, { autoAlpha: 0, xPercent: -10 * dir, scale: 1.04 }, 0)
        .fromTo(nxt, { autoAlpha: 0, xPercent: 12 * dir, scale: 1.08 }, { autoAlpha: 1, xPercent: 0, scale: 1 }, 0)
        .set(cur, { xPercent: 0, scale: 1 })
        .add(() => showCaption(nxt.dataset.caption || ""), 0.35);
      if (progress) progress.kill();
    }

    showCaption(slides[0].dataset.caption || "");
    startProgress();

    const handlers: [EventTarget, string, EventListener][] = [];
    const on = (t: EventTarget, ev: string, fn: EventListener) => { t.addEventListener(ev, fn); handlers.push([t, ev, fn]); };
    on(el.querySelector("#album-prev")!, "click", () => go(index - 1, -1));
    on(el.querySelector("#album-next")!, "click", () => go(index + 1, 1));
    dots.forEach((d, i) => on(d, "click", () => go(i)));
    on(album, "mouseenter", () => progress?.pause()); on(album, "mouseleave", () => progress?.play());
    on(album, "focusin", () => progress?.pause()); on(album, "focusout", () => progress?.play());
    on(album, "keydown", ((e: KeyboardEvent) => { if (e.key === "ArrowLeft") go(index - 1, -1); if (e.key === "ArrowRight") go(index + 1, 1); }) as EventListener);
    return () => { handlers.forEach(([t, ev, fn]) => t.removeEventListener(ev, fn)); progress?.kill(); split?.revert(); };
  }, { scope: root, dependencies: [list.length] });

  if (!list.length) return null;
  return (
    <section ref={root} className="section section-album" id="album">
      <div className="section-inner">
        <p className="eyebrow">Дурсамжийн албум</p>
        <Heading variant={0}>Маам багшийн он жилүүд</Heading>
        <div className="album" tabIndex={0}>
          <div className="album-stage" id="album-stage">
            {list.map((p, i) => (
              <figure key={p.id} className="slide" data-n={i + 1} data-caption={captionOf(p)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- backend media */}
                <img src={p.image} alt={p.title} onError={(e) => e.currentTarget.parentElement?.classList.add("no-img")} />
              </figure>
            ))}
          </div>
          <p className="album-caption" id="album-caption" aria-live="polite" />
          <div className="album-ui">
            <button className="album-btn" id="album-prev" type="button" aria-label="Өмнөх зураг">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="album-dots" id="album-dots" role="tablist" aria-label="Зургууд">
              {list.map((p, i) => <button key={p.id} type="button" role="tab" aria-label={`${i + 1}-р зураг`} />)}
            </div>
            <button className="album-btn" id="album-next" type="button" aria-label="Дараагийн зураг">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <div className="album-progress" aria-hidden="true"><span id="album-bar" /></div>
        </div>
      </div>
    </section>
  );
}
```

Прототипт албум секц гарчгийн чимэглэл variant 0 (эхний h2). `OlympiadPage.tsx`: Hero-ийн дараа `<Album photos={album} />`; `void album` хасна.

- [ ] **Step 2: Шалгах**

tsc/eslint цэвэр. Browser: seed-д албумын зураг байхгүй бол `/admin/album`-аас 2–3 зураг (гарчиг + тайлбар) оруулаад `/olympiad`: албум секц, тайлбар үг үгээр гарч ирнэ, 6 сек-д автоматаар солигдоно, hover-д зогсоно, prev/next/цэг/сум ажиллана; зураггүй (бүх зураг нийтлэгдээгүй) үед секц харагдахгүй. Прототип (5173) зураггүй тул харагдац орлуулагчаар харьцуулна.

---

### Task 7: Schedule ("могой" хуваарь)

**Files:**
- Create: `frontend/src/components/olympiad/Schedule.tsx`
- Modify: `frontend/src/components/olympiad/OlympiadPage.tsx`

**Interfaces:**
- Consumes: `Stage[]` (`year, order, title, date_text, text, tags`), `latestYear`.
- Produces: `<Schedule stages={Stage[] | null} currentYear={number} />`.

- [ ] **Step 1: Компонент**

`frontend/src/components/olympiad/Schedule.tsx` (schedule.js порт — мөр/карт React-ээр, зам ба анимаци imperative):

```tsx
"use client";

/* Хуваарь (schedule.js): оны табууд; шатууд "могой" мөрөнд (3/2/1 багана responsive); нэг SVG зам мөрийн дагуу явж
   булангаар доош эргэнэ — гүйлгэхэд DrawSVG scrub, үзүүрийн цэг MotionPath-аар дагана; шат бүр ScrollTrigger-ээр гарч ирнэ. */

import { useState, useRef } from "react";
import type { Stage } from "@/lib/types";
import { FORMULAS } from "@/lib/olympiad-data";
import { gsap, ScrollTrigger, reduceMotion, useGSAP } from "./gsap";
import { Formulas } from "./Formulas";
import { Heading } from "./Heading";

const TL_COLORS = ["#FF3F33", "#9FC87E", "#FF9800", "#FF6666"];
const R = 44, LINE_Y = 26;
const perRow = () => (typeof window === "undefined" ? 3 : innerWidth < 640 ? 1 : innerWidth < 1024 ? 2 : 3);

export function Schedule({ stages, currentYear }: { stages: Stage[] | null; currentYear: number }) {
  const root = useRef<HTMLElement>(null);
  const years = Array.from(new Set((stages ?? []).map((s) => s.year))).sort();
  const [year, setYear] = useState<number | null>(null);
  const [cols, setCols] = useState<number>(3);
  const active = year ?? (years.includes(currentYear) ? currentYear : years[years.length - 1]);
  const items = (stages ?? []).filter((s) => s.year === active).sort((a, b) => a.order - b.order);
  const past = active < currentYear;
  const rows: Stage[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));

  useGSAP(() => {
    const snake = root.current!.querySelector<HTMLElement>("#snake")!;
    const svg = snake.querySelector<SVGSVGElement>(".snake-svg")!;
    const path = svg.querySelector<SVGPathElement>(".snake-path")!;
    const tip = svg.querySelector<SVGGElement>(".snake-tip")!;
    const rowsBox = snake.querySelector<HTMLElement>(".snake-rows")!;
    const reduce = reduceMotion();
    if (!items.length) return;

    /* ---- schedule.js buildPath() 108–151-р мөрийг хуулна (snake/svg/path/rowsBox дээрх хувьсагчид) ---- */
    function buildPath() { /* … */ }

    buildPath();
    /* ---- schedule.js animate(instant) 154–196-р мөрийг хуулна: `instant` = хэрэглэгч он солисон эсэх (эхний mount-д false);
       triggers/scrubTriggers массивыг локал хадгална; reduce үед drawSVG 100%, tip нуугдана ---- */
    const instant = year !== null;
    const created: ScrollTrigger[] = [];
    // … animate биеийн ScrollTrigger.create/… үр дүнг created-д push …
    ScrollTrigger.refresh();

    const ro = new ResizeObserver(() => { const c = perRow(); if (c !== cols) setColsSafe(c); else buildPath(); });
    ro.observe(snake);
    return () => { ro.disconnect(); created.forEach((t) => t.kill()); };
  }, { scope: root, dependencies: [active, cols, items.length] });

  // ResizeObserver callback дотор setState — effect биш, observer callback тул зөвшөөрөгдөнө
  const setColsSafe = (c: number) => setCols(c);

  return (
    <section ref={root} className="section section-schedule" id="schedule">
      <Formulas items={FORMULAS.schedule} />
      <div className="section-inner">
        <p className="eyebrow">Хуваарь</p>
        <Heading variant={1}>Олимпиад хэрхэн явагдах вэ</Heading>
        <p className="lead">6–12-р ангийн сурагчид гурван шаттай оролцоно. Оноо сонгоод тухайн жилийн хуваарийг харна уу.</p>
        {!stages ? <p className="section-note">Мэдээлэл түр байхгүй.</p> : !years.length ? <p className="section-note">Хуваарь удахгүй.</p> : (
          <>
            <div className="year-tabs" id="schedule-years" role="tablist" aria-label="Он">
              {years.map((y) => <button key={y} type="button" role="tab" aria-selected={y === active} className={y === active ? "is-active" : undefined} onClick={() => setYear(y)}>{y}</button>)}
            </div>
            <div className="snake" id="snake">
              <svg className="snake-svg" aria-hidden="true">
                <defs>
                  <linearGradient id="snake-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1200">
                    <stop offset="0%" stopColor="#FF3F33" /><stop offset="33%" stopColor="#9FC87E" /><stop offset="66%" stopColor="#FF9800" /><stop offset="100%" stopColor="#FF6666" />
                  </linearGradient>
                </defs>
                <path className="snake-path" d="M0,0" fill="none" stroke="url(#snake-grad)" />
                <g className="snake-start"><circle r="9" fill="#1E3A8F" /><circle r="4" fill="#fff" /></g>
                <g className="snake-end"><circle r="9" fill="#FFC20E" /><circle r="4" fill="#1E3A8F" /></g>
                <g className="snake-tip"><circle r="7" fill="#1E3A8F" /><circle r="12" fill="none" stroke="#1E3A8F" strokeWidth="2" opacity="0.4" /></g>
              </svg>
              <div className="snake-rows" key={`${active}-${cols}`}>
                {rows.map((row, r) => (
                  <div key={r} className={`snake-row${r % 2 ? " is-rev" : ""}`}>
                    {row.map((s, j) => {
                      const i = r * cols + j;
                      const [yr, rest] = s.date_text.split(" · ");
                      return (
                        <article key={s.id} className="snake-item" style={{ ["--tl-c" as string]: TL_COLORS[i % TL_COLORS.length] }}>
                          <div className="snake-date"><span className="snake-date-big">{rest || s.date_text}</span><span className="snake-date-yr">{rest ? yr : ""}</span></div>
                          <div className="snake-card">
                            <span className="snake-step">{i + 1}-р шат{past ? " · явагдсан" : ""}</span>
                            <h3>{s.title}</h3>
                            <p>{s.text}</p>
                            <ul className="tl-tags">{s.tags.map((t) => <li key={t}>{t}</li>)}</ul>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
```

`buildPath`/`animate`-ийн биеийг `schedule.js`-ээс хуулахдаа: `gsap.utils.toArray(".snake-row", rowsBox)`, `innerWidth` хэвээр; `animate`-ийн `triggers.push(ScrollTrigger.create(...))` ба `gsap.fromTo(...).scrollTrigger` бүгдийг `created`-д push; `instant` үед `anim.delay(i * 0.1).play()`. `cols`-ийн анхны утга SSR-д 3 — mount дараа `ResizeObserver` бодит утгыг тавина (утсан дээр нэг удаа дахин зурна). `key` солигдоход React мөрүүдийг дахин үүсгэж, `dependencies` өөрчлөгдсөн тул useGSAP дахин ажиллана (замыг шинэ DOM-оор тооцно).

`OlympiadPage.tsx`: Album-ын дараа `<Schedule stages={stages} currentYear={latestYear(years)} />`; `void stages` хасна.

- [ ] **Step 2: Шалгах**

tsc/eslint. Browser 3000 vs 5173 (seed: 2024/2025/2026, 5 шат): табууд, 3-багана могой мөр, зам гүйлгэхэд зурагдаж үзүүр дагана, шат бүр гарч ирнэ; 2024 сонгоход "· явагдсан"; 2 багана (768px), 1 багана (375px) — зам дахин тооцогдоно; console цэвэр.

---

### Task 8: Results (үр дүн)

**Files:**
- Create: `frontend/src/components/olympiad/Results.tsx`
- Modify: `frontend/src/components/olympiad/OlympiadPage.tsx`

**Interfaces:**
- Consumes: `Result[]` (`year, category, category_label, rank, student, school, score`), `CATEGORIES` (`types.ts`).
- Produces: `<Results results={Result[] | null} />`.

- [ ] **Step 1: Компонент**

`frontend/src/components/olympiad/Results.tsx` (results.js порт; байр/эрэмбэ backend-ээс):

```tsx
"use client";

/* Үр дүн (results.js): он ба ангиллын табууд; хүснэгт мөрүүд зүүнээс орж ирж, байрын дугуй үсэрч, оноо 0-оос тоолно;
   эхний 3 байр медалийн өнгөөр. Section дэлгэцэнд орж ирэхэд сүүлийн он идэвхжинэ. Байр/эрэмбэ backend-ийн rank. */

import { useState, useRef } from "react";
import { CATEGORIES, type Result } from "@/lib/types";
import { FORMULAS } from "@/lib/olympiad-data";
import { gsap, ScrollTrigger, reduceMotion, useGSAP } from "./gsap";
import { Formulas } from "./Formulas";
import { Heading } from "./Heading";

const MEDAL = ["gold", "silver", "bronze"];

export function Results({ results }: { results: Result[] | null }) {
  const root = useRef<HTMLElement>(null);
  const all = results ?? [];
  const years = Array.from(new Set(all.map((r) => r.year))).sort();
  const [year, setYear] = useState<number | null>(null);       // null = дэлгэцэнд орж ирэх хүртэл хүснэгт хоосон
  const [grade, setGrade] = useState<string | null>(null);
  const cats = CATEGORIES.filter((c) => all.some((r) => r.year === year && r.category === c.value));
  const cat = grade && cats.some((c) => c.value === grade) ? grade : cats[0]?.value ?? null;
  const rows = all.filter((r) => r.year === year && r.category === cat).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  useGSAP(() => {
    const el = root.current!;
    if (year === null) {
      const t = ScrollTrigger.create({ trigger: el, start: "top 70%", once: true, onEnter: () => setYear(years[years.length - 1] ?? null) });
      return () => t.kill();
    }
    const body = el.querySelector<HTMLElement>("#results-body")!;
    const trs = gsap.utils.toArray<HTMLElement>("tr", body);
    const scores = gsap.utils.toArray<HTMLElement>(".score", body);
    if (reduceMotion()) { scores.forEach((s) => (s.textContent = s.dataset.score ?? "")); return; }
    gsap.from(gsap.utils.toArray(".grade-tabs button", el), { autoAlpha: 0, y: 6, duration: 0.3, stagger: 0.04 });
    gsap.from(trs, { autoAlpha: 0, x: -20, duration: 0.45, ease: "power2.out", stagger: 0.07 });
    gsap.from(gsap.utils.toArray(".rank span", body), { scale: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.07, transformOrigin: "50% 50%" });
    scores.forEach((s, i) => {
      const target = Number(s.dataset.score);
      if (Number.isNaN(target)) return;
      const obj = { v: 0 };
      gsap.to(obj, { v: target, duration: 1.1, delay: 0.15 + i * 0.07, ease: "power2.out", onUpdate: () => (s.textContent = String(Math.round(obj.v))) });
    });
  }, { scope: root, dependencies: [year, cat] });

  return (
    <section ref={root} className="section section-results" id="results">
      <Formulas items={FORMULAS.results} />
      <div className="section-inner">
        <p className="eyebrow">Үр дүн</p>
        <Heading variant={2}>Байр эзлэлт</Heading>
        <p className="lead">Он болон ангиа сонгоод тухайн жилийн шилдэг сурагчдыг харна уу.</p>
        {!results ? <p className="section-note">Мэдээлэл түр байхгүй.</p> : !years.length ? <p className="section-note">Үр дүн удахгүй.</p> : (
          <>
            <div className="year-tabs" id="results-years" role="tablist" aria-label="Он">
              {years.map((y) => <button key={y} type="button" role="tab" aria-selected={y === year} className={y === year ? "is-active" : undefined} onClick={() => setYear(y)}>{y}</button>)}
            </div>
            <div className="grade-tabs" id="grade-tabs" role="tablist" aria-label="Анги" key={year ?? "none"}>
              {cats.map((c) => <button key={c.value} type="button" role="tab" aria-selected={c.value === cat} className={c.value === cat ? "is-active" : undefined} onClick={() => setGrade(c.value)}>{c.label}</button>)}
            </div>
            <div className="results-wrap">
              <table className="results" id="results-table">
                <thead><tr><th>Байр</th><th>Сурагч</th><th>Сургууль</th><th>Оноо</th></tr></thead>
                <tbody id="results-body" key={`${year}-${cat}`}>
                  {rows.map((r) => (
                    <tr key={r.id} className={r.rank && r.rank <= 3 ? `medal medal-${MEDAL[r.rank - 1]}` : undefined}>
                      <td className="rank"><span>{r.rank ?? "—"}</span></td>
                      <td className="name">{r.student}</td>
                      <td className="school">{r.school}</td>
                      <td className="score" data-score={r.score ?? ""}>{r.score === null ? "—" : 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
```

Прототипийн "хуучин мөр бүдгэрч шинэ мөр орж ирэх" шилжилт: React `key`-ээр tbody дахин үүсэх тул орж ирэх анимаци л үлдэнэ (гарах анимацийг орхино — харагдацын ялгаа бага; ledger-т тэмдэглэнэ). `results-note` ("⚠ Одоогоор жишээ мэдээлэл…") хасагдана. `setYear` нь ScrollTrigger callback дотор (effect биш) — зөвшөөрөгдөнө.

`OlympiadPage.tsx`: Schedule-ийн дараа `<Results results={results} />`; `void results` хасна.

- [ ] **Step 2: Шалгах**

tsc/eslint. Browser vs 5173: секц дэлгэцэнд орж ирэхэд сүүлийн он (2025) сонгогдож, ангиллын табууд (VI–XII анги, багш нар), оноо тоолж гарч ирнэ, 1–3-р байр медалийн өнгөтэй; он/анги солиход анимаци дахин; оноогүй мөр "—". Nav-ийн "Үр дүн" холбоос гүйлгэхэд идэвхжинэ (Nav-ийн ScrollTrigger-ууд одоо бүх секцийг олно).

---

### Task 9: YearTiles ("2026" хавтан)

**Files:**
- Create: `frontend/src/components/olympiad/YearTiles.tsx`
- Modify: `frontend/src/components/olympiad/OlympiadPage.tsx`

**Interfaces:**
- Consumes: `yearTiles.buildYear`, `randomFiller`, `latestYear`.
- Produces: `<YearTiles year={number} />` → `<section class="section section-1" id="section-1">`.

- [ ] **Step 1: Компонент**

`frontend/src/components/olympiad/YearTiles.tsx` (main.js 252–378-р мөрийн порт):

```tsx
"use client";

/* "2026" Bauhaus хавтан (main.js): section дэлгэцэнд орж ирэхэд хавтангууд эргэж орж ирнэ, дараа нь үсэрнэ;
   цагираг хавтан амьсгална; hover-д нэг эргэлт; "Хээ солих" дүүргэгч хавтангуудыг шинэ хээгээр солино;
   6 сек тутам автоматаар (section харагдаж байхад); "Дахин тоглуулах". */

import { useRef } from "react";
import { buildYear, randomFiller, type Tile } from "@/lib/yearTiles";
import { FORMULAS } from "@/lib/olympiad-data";
import { gsap, ScrollTrigger, useGSAP } from "./gsap";
import { Formulas } from "./Formulas";

export function YearTiles({ year }: { year: number }) {
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const tiles: Tile[] = buildYear(svg.current!, String(year), "y");
    const tileEls = tiles.map((t) => t.el);
    gsap.set(tileEls, { transformOrigin: "50% 50%" });
    let intro: gsap.core.Timeline | null = null;
    let autoShuffle = false, inView = false;
    /* ---- main.js 259–321 (mm.add: matchMedia: intro timeline, ScrollTrigger once, onComplete autoShuffle, ring breathing),
       324–333 (hover эргэлт — listener-уудыг cleanup-д remove), 336–356 shuffle(), 363–378 (autoShuffle/inView ScrollTrigger, 6 сек interval)
       -ийг хуулна. Орлуулалт: "#section-1" → el; document.getElementById("replay"/"shuffle") → el.querySelector("#replay"/"#shuffle")
       + click listener (cleanup-д remove); `pick(FILLERS)()` → randomFiller(); gsap.defaults({ ease: "power2.out" }) мөрийг ХАСНА
       (глобал default бусад компонентод нөлөөлнө) — оронд нь энэ файлын tween-үүдэд `ease` тодорхой бичигдсэн байгаа. ---- */
    return () => { /* mm.revert(); listener-ууд; interval */ svg.current!.innerHTML = ""; };
  }, { scope: root });

  return (
    <section ref={root} className="section section-1" id="section-1">
      <Formulas items={FORMULAS.year} />
      <div className="section-inner">
        <svg ref={svg} id="year" viewBox="0 0 1500 500" role="img" aria-label={String(year)} />
        <div className="controls">
          <button id="replay" type="button">Дахин тоглуулах</button>
          <button id="shuffle" type="button">Хээ солих</button>
        </div>
      </div>
    </section>
  );
}
```

`OlympiadPage.tsx`: Results-ийн дараа, About-ын өмнө `<YearTiles year={latestYear(years)} />`. Секцүүдийн эцсийн дараалал (index.html-тэй ижил): Hero → Album → Schedule → Results → YearTiles → About → Contact.

- [ ] **Step 2: Шалгах**

tsc/eslint. Browser vs 5173: гүйлгэж ирэхэд хавтангууд орж ирж үсэрнэ, цагираг амьсгална, hover эргэлт, "Хээ солих" ба 6 сек автомат солилт (харагдаж байхад л), "Дахин тоглуулах"; nav-ийн жижиг 2026 дээр дарахад энэ секц рүү. Reduced motion (browser-т `matchMedia`-г JS-ээр override хийж дахин ачаалах боломжгүй тул `resize_window`-ийн colorScheme биш — Chrome DevTools эмуляц байхгүй; JS override: `window.matchMedia = (q) => ({ matches: q.includes("reduce"), addEventListener(){}, removeEventListener(){} })` гэж тавиад client-side navigation-аар `/` → `/olympiad` дахин ороход анимацигүй, бүх агуулга харагдана). Console цэвэр.

---

### Task 10: Цэвэрлэгээ, README, эцсийн шалгалт

**Files:**
- Delete: `index.html`, `style.css`, `main.js`, `nav.js`, `hero.js`, `album.js`, `schedule.js`, `results.js`, `headings.js`, `formulas.js`, `smooth.js`, `images/` (README.txt-тэй хамт), `.claude/dev-server.js`
- Modify: `.claude/launch.json` (`static` тохиргоо хасна), `README.md`

- [ ] **Step 1: Эцсийн харьцуулалт (устгахаас ӨМНӨ)**

Browser: 5173 ба 3000 хоёуланг бүх секцээр (hero, албум, хуваарь, үр дүн, 2026, тухай, холбоо барих) desktop 1280 ба mobile 375-д зэрэгцүүлж харна; ялгаа олдвол `olympiad.css`-д засна (энэ task-ийн хүрээнд). Nav-ийн 3 анкор + "2026" + "Сургуулийн сайт" бүгд ажиллана; `/`-ийн цэс, хөлөөс `/olympiad` нээгдэнэ.

- [ ] **Step 2: Устгах, тохиргоо**

Run (repo root): `git rm -q --cached index.html style.css main.js nav.js hero.js album.js schedule.js results.js headings.js formulas.js smooth.js .claude/dev-server.js images/README.txt 2>/dev/null; rm -f index.html style.css main.js nav.js hero.js album.js schedule.js results.js headings.js formulas.js smooth.js .claude/dev-server.js; rm -rf images` (`git rm --cached` нь commit хийхгүй; зөвхөн index-ээс хасна — хэрэв файл index-д байхгүй бол алдааг үл тоомсорлоно). `git status`-д эдгээр `D` гэж харагдана.

`.claude/launch.json`: `"name": "static"` объектыг хасна (`backend`, `frontend` үлдэнэ).

`README.md`: "### Прототип (статик хуудас)" хэсгийг ингэж солино:

```markdown
### Олимпиадын хуудас (`/olympiad`)

Ү.Маамын нэрэмжит олимпиадын хуудас Next.js-ийн `/olympiad` route (`frontend/src/app/olympiad/`, `frontend/src/components/olympiad/`).
GSAP 3.15 (DrawSVG, MotionPath, ScrollTrigger, ScrollSmoother, SplitText — бүгд npm багцад) ба KaTeX. Хуваарь, үр дүн, албум
`/api/olympiad/*`-аас; намтар, тухай, холбоо барих, хөрөг зураг `/admin/olympiad-page`-ээс (`olympiad_page` хүснэгт, migration 0007).
Хөдөлгөөн багасгах (prefers-reduced-motion) тохиргоотой үед анимацигүй, ScrollSmoother-гүй харагдана.
```

README-ийн бусад газар прототип/`5173`/`dev-server.js` дурдагдсан бол засна (`grep -n "5173\|dev-server\|прототип" README.md`).

- [ ] **Step 3: Эцсийн шалгалт**

```bash
cd backend && uv run pytest --tb=short -q
```
Expected: 108 passed.

```bash
cd frontend && npx tsc --noEmit -p tsconfig.json && node node_modules/eslint/bin/eslint.js src/components/olympiad src/app/olympiad src/lib "src/app/admin/(dashboard)/olympiad-page"
```
Expected: цэвэр.

Browser: `/olympiad` бүрэн (устгасны дараа ч ажиллана — прототипоос хамааралгүй), `/admin/olympiad-page` засвар хуудсанд тусна, `/` → `/olympiad` → "← Сургуулийн сайт" → `/`. `git status`: устгасан 13 файл `D`, шинэ файлууд.

---

## Self-review тэмдэглэл

- Spec §3 файл бүр task-тай (Heading.tsx ↔ useHeadingArt.ts шийдвэр толгойд тэмдэглэсэн); §4 T1; §5 T2; §6 T3–T9 (ScrollSmoother T3, matchMedia/reduce бүх компонентод, ResizeObserver T7/Nav resize T4, KaTeX T3, nav холбоосууд T4); §7 T10; §8 тест/шалгалт task бүрийн сүүлийн алхам + T10.
- Нэрс: `latestYear` (OlympiadPage.tsx) ← Nav/Schedule/YearTiles; `buildYear(svg, year, idPrefix)` ← Nav/YearTiles; `randomFiller` ← YearTiles; `FORMULAS.{year,about,contact,schedule,results}` ← секцүүд; `Heading variant` 0/1/2 (albom 0, schedule 1, results 2, about 0, contact 1); `Formula.cls` ↔ CSS `.f1-a…`.
- Прототипийн кодыг хуулах алхмууд файлын мөрийн дугаараар заагдсан (T5 hero.js 30–109, 120–241; T7 schedule.js 108–151, 154–196; T9 main.js 259–378); эдгээр файл T10 хүртэл repo-д байна.
