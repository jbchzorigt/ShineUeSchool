# Англи хувилбар (EN) ба англи мэдээ — хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Нийтийн сайтыг `/en` угтвартай англи хувилбартай болгож (Нүүр, Бидний тухай, Мэдээ, Хөтөлбөр, Элсэлт, Холбоо барих), мэдээг МН/EN хоёр хэлээр нийтлэх боломж олгох; монгол URL өөрчлөгдөхгүй.

**Architecture:** Backend-д `_en` баганууд (migration 0015) + `app/common/i18n.localized()`; нийтийн endpoint-ууд `?lang=mn|en` авч үндсэн талбарт сонгосон хэлний утгыг буцаана (мэдээ хэлээр шүүгдэж, `languages` талбартай). Frontend-д `app/[lang]/(site)/**` + `src/proxy.ts` (`/x` → дотооддоо `/mn/x`), 3 root layout, `lib/i18n` толь бичиг (`en` нь `Dict` төрлийг хангана), `LangProvider` client context, `MN | EN` товч, hreflang. Админ засварлагчдад English таб/талбарууд.

**Tech Stack:** FastAPI + SQLAlchemy 2 async + Alembic + PostgreSQL; Next.js 16.3 App Router (proxy) + React 19 + Tailwind v4; Node 24 `node --test` (type stripping) — зөвхөн замын цэвэр функцэд.

**Spec:** `docs/superpowers/specs/2026-10-20-english-version-design.md`

## Global Constraints

- **Commit, push хийхгүй.** Task бүр `git add`-аар (stage) дуусна. Хэрэглэгч "commit push" гэхэд л commit.
- Backend тест: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest -q` — одоо **160 passed**; task бүрийн төгсгөлд бүгд ногоон. Windows access violation гарвал дахин ажиллуулна.
- Frontend: `cd frontend && node node_modules/typescript/bin/tsc --noEmit -p . && node node_modules/eslint/bin/eslint.js src` — 0 problems (`npx` segfault хийж болно; V8 segfault гарвал дахин).
- Хэл: `Lang = "mn" | "en"`; анхдагч `mn`. API query `lang`, буруу утга → 422.
- `localized(mn, en, lang)`: `lang == "en"` ба `en.strip()` бол `en`, үгүй бол `mn`. **Мэдээний их бие (`body_html`) fallback хийхгүй**: EN дээр `body_html_en` хоосон бол `""`.
- Мэдээ: `lang=en` → зөвхөн `title_en != ""`; `lang=mn` → зөвхөн `title != ""`; тухайн хэлгүй мэдээний дэлгэрэнгүй → 404 `"Олдсонгүй."`. Slug нэг, хоёр хэлэнд ижил. Коммент/лайк нийтлэг.
- Шинэ `_en` баганууд: `server_default=""`, NOT NULL; урт хязгаар MN талбартай ижил.
- Админ мэдээ: `title` эсвэл `title_en`-ийн аль нэг заавал → `FieldError("title", "Монгол эсвэл англи гарчиг заавал.")`.
- Out schema-ууд нэмэлтээр `_en` талбаруудыг агуулна (админ уншина); үндсэн талбар (`title`, `name` …) нь `lang`-аар localized. Builder функцууд `lang: Lang = "mn"` параметртэй.
- Монгол URL хэвээр: `/`, `/about`, `/news?page=2&category=x` … Англи: `/en/...`. `/mn/...` → 308 угтваргүй рүү. `/en/{calendar,calendar/timetable,timetable,clubs,survey}` → 307 монгол руу.
- Англи цэс: Home `/` · About `/about` · News `/news` | лого | Programs `/#programs` · Admission `/admission` · Contact `/#location` (бүгд `localePath("en", …)`). EN-д Олимпиад (header YearTiles, hero товч) ба "Бүртгэл" drop-down байхгүй.
- Хүний нэр, их сургуулийн нэр, тэтгэлэг, ЭЕШ radar, `badge` орчуулагдахгүй. Админ UI монголоор.
- Windows Git Bash: замыг ишлэлд; олон мөрт python/JS скриптийг scratchpad файлд бичээд ажиллуулна. Монгол коммент, одоогийн кодын хэв маяг.

## Spec-ээс ялгаатай шийдвэрүүд (rulings)

- Spec §4-ийн `href(lang, path)` → **`localePath(lang, path)`** гэж нэрлэнэ (JSX-ийн `href` prop-той андуурагдахгүй).
- Spec §4-ийн `formatDate(lang, date, opts)` → одоогийн `components/news/format.ts`-ийн `formatDate(iso, lang = "mn")`, `formatDateTime(iso, lang = "mn")`-д `lang` нэмнэ (MN формат `2026.09.19` хэвээр үлдэх ёстой).
- Мэдээний ангиллын `post_count` нь тухайн хэлтэй мэдээг л тоолно (spec-д тодорхойгүй; EN chip-ийн тоо EN жагсаалттай таарна).
- Out schema-ууд `_en` талбаруудыг нийтийн хариунд ч агуулна (нэмэлт талбар; үндсэн талбарын бүтэц хэвээр) — админ, нийтийн builder-ыг давхар бичихгүйн тулд. Ганц үл хамаарах нь `DestinationOut` (каталогийн нэр).

## Review Focus

1. Proxy rewrite нь query string-ийг алдахгүй байх: `/news?page=2&category=x` → дотооддоо `/mn/news?page=2&category=x`; `/en/news?page=2` хэвээр (Task 7 `paths.test.ts`).
2. Хэл солих: `/` ↔ `/en`, `/news/abc` ↔ `/en/news/abc`, `/calendar` → `/en` (EN-гүй хуудас), query-г хадгална (Task 7 `paths.test.ts`).
3. Зөвхөн англи мэдээ (MN гарчиг хоосон): MN жагсаалт/related/categories тоонд орохгүй, MN дэлгэрэнгүй 404, админ жагсаалтад харагдана, slug EN гарчгаас (Task 2, Task 3 тест).
4. Proxy статик/админ/API замыг барихгүй: `/logo-full.png`, `/icon.png`, `/favicon.ico`, `/_next/...`, `/admin/news/1`, `/api/revalidate`, `/olympiad` (Task 7 `paths.test.ts` — `shouldHandle`).
5. EN гарчигтай боловч EN бие хоосон мэдээ: EN хуудас гарчиг + товч + зурагтай, бие хоосон (эвдрэхгүй); EN товч хоосон бол MN товч (Task 2 тест, Task 13 UI).

## Файлын бүтэц

**Backend**
- Шинэ: `app/common/i18n.py` (`Lang`, `localized`), `alembic/versions/0015_english.py`, `tests/test_i18n.py`, `tests/test_news_i18n.py`, `tests/test_programs_i18n.py`, `tests/test_about_i18n.py`.
- Өөрчлөх: `app/news/{models,schemas,router_public,router_admin}.py`, `app/programs/{models,schemas,service,router_public,router_admin}.py`, `app/about/{models,schemas,service,router_public,router_admin}.py`, `app/graduates/{countries,schemas,service,router_public}.py`, `tests/test_graduates.py`.

**Frontend**
- Шинэ: `src/lib/i18n/{index.ts,paths.ts,paths.test.ts,mn.ts,en.ts}`, `src/proxy.ts`, `src/app/fonts.ts`, `src/app/[lang]/layout.tsx`, `src/app/[lang]/not-found.tsx`, `src/components/site/LangProvider.tsx`, `src/components/site/LangSwitch.tsx`, `src/lib/i18n/metadata.ts` (`alternates`).
- Зөөх: `src/app/(site)/**` → `src/app/[lang]/(site)/**` (`git mv`).
- Устгах: `src/app/layout.tsx` (агуулга `[lang]/layout.tsx`, `admin/layout.tsx`, `olympiad/layout.tsx` руу).
- Өөрчлөх: `lib/{types,api,news-api,programs-api,about-api,graduates-api,home-data,world-map}.ts`, `components/{home,about,news,programs,site}/*`, админ `components/admin/{PostEditor.tsx,programs/ProgramForm.tsx,programs/WorkDialog.tsx,about/*}`, `app/admin/(dashboard)/{news/page.tsx,news/categories/page.tsx,about/page.tsx}`, `app/admin/layout.tsx`, `app/olympiad/layout.tsx`, `package.json` (`test` script), `tsconfig.json` (`allowImportingTsExtensions`).

---

## Phase 1 — Backend

### Task 1: Migration, загварын баганууд, `localized`

**Files:**
- Create: `backend/app/common/i18n.py`, `backend/alembic/versions/0015_english.py`, `backend/tests/test_i18n.py`
- Modify: `backend/app/news/models.py`, `backend/app/programs/models.py`, `backend/app/about/models.py`

**Interfaces:**
- Produces: `Lang = Literal["mn", "en"]`; `localized(mn: str, en: str, lang: Lang) -> str`. Model атрибутууд: `Post.title_en/excerpt_en/body_html_en`, `Category.name_en`, `PostImage.caption_en`, `Program.name_en/summary_en/body_html_en`, `ProgramWork.title_en/caption_en`, `AboutPage.intro_title_en/intro_html_en`, `Leader.position_en`, `Department.name_en`, `DeptTeacher.role_en` (хүснэгт `about_teachers`).

- [ ] **Step 1: Failing test** `tests/test_i18n.py`:
```python
from app.common.i18n import localized

def test_localized_fallback():
    assert localized("Мэдээ", "News", "en") == "News"
    assert localized("Мэдээ", "   ", "en") == "Мэдээ"
    assert localized("Мэдээ", "News", "mn") == "Мэдээ"
    assert localized("", "News", "mn") == ""

async def test_en_columns_default_empty(db):
    from app.news.models import Post
    p = Post(title="Т", slug="t"); db.add(p); await db.flush(); await db.refresh(p)
    assert (p.title_en, p.excerpt_en, p.body_html_en) == ("", "", "")
```
- [ ] **Step 2:** `uv run pytest tests/test_i18n.py -q` → FAIL (ImportError).
- [ ] **Step 3:** `i18n.py`-д `Lang`, `localized`. Model бүрт хүснэгтийн §5-ын баганууд: `mapped_column(String(N), default="", server_default="")` (Text-д мөн адил). Migration `0015_english` (`revision = "0015"`, `down_revision = "0014"`): бүх баганыг `op.add_column(..., server_default="")`, `downgrade` нь `drop_column`. `about_page.stats` JSONB өөрчлөгдөхгүй (`label_en` schema түвшинд).
- [ ] **Step 4:** `uv run pytest -q` → 162 passed. `uv run alembic upgrade head` локал бааз дээр алдаагүй.
- [ ] **Step 5:** `git add backend/app/common/i18n.py backend/alembic/versions/0015_english.py backend/tests/test_i18n.py backend/app/*/models.py`

### Task 2: Мэдээ — нийтийн API хэлтэй

**Files:**
- Modify: `backend/app/news/schemas.py`, `backend/app/news/router_public.py`
- Test: `backend/tests/test_news_i18n.py`

**Interfaces:**
- Consumes: Task 1 `localized`, `Lang`.
- Produces: `post_card(request, p, likes, comments, lang: Lang = "mn") -> PostCard`, `post_detail(request, p, likes, comments, liked, lang: Lang = "mn") -> PostDetail`, `lang_filter(lang: Lang)` (SQL нөхцөл), `PostDetail.languages: list[Literal["mn","en"]]`. Schema нэмэлт талбарууд: `PostCard.title_en, excerpt_en`, `PostDetail.body_html_en`, `ImageOut.caption_en`, `CategoryRef.name_en`, `CategoryOut.name_en` (бүгд `str = ""`).

- [ ] **Step 1: Failing tests** (`seed`: MN+EN мэдээ `both`, зөвхөн MN `mn_only`, зөвхөн EN `en_only` (`title=""`), EN гарчигтай боловч EN бие/товч хоосон `en_title_only`; бүгд нийтлэгдсэн, нэг ангилал `name="Олимпиад", name_en="Olympiad"`, `both`-д зураг `caption="Зураг", caption_en="Photo"`):
```python
async def test_list_filters_by_lang(client, db):
    await seed(db)
    mn = [p["slug"] for p in (await client.get("/api/news/posts/")).json()["items"]]
    en = [p["slug"] for p in (await client.get("/api/news/posts/?lang=en")).json()["items"]]
    assert set(mn) == {"both", "mn-only", "en-title-only"}
    assert set(en) == {"both", "en-only", "en-title-only"}
    assert (await client.get("/api/news/posts/?lang=fr")).status_code == 422

async def test_detail_lang_and_404(client, db):
    await seed(db)
    d = (await client.get("/api/news/posts/both/?lang=en")).json()
    assert d["title"] == "Both EN" and d["body_html"] == "<p>EN</p>" and d["languages"] == ["mn", "en"]
    assert d["category"]["name"] == "Olympiad" and d["images"][0]["caption"] == "Photo"
    assert (await client.get("/api/news/posts/mn-only/?lang=en")).status_code == 404
    assert (await client.get("/api/news/posts/en-only/")).status_code == 404
    assert (await client.get("/api/news/posts/en-only/?lang=en")).json()["languages"] == ["en"]

async def test_en_title_only_no_body_fallback(client, db):
    await seed(db)
    d = (await client.get("/api/news/posts/en-title-only/?lang=en")).json()
    assert d["title"] == "Title EN" and d["body_html"] == "" and d["excerpt"] == "Товч MN"   # товч fallback, бие fallback-гүй

async def test_related_and_categories_by_lang(client, db):
    await seed(db)
    rel = [p["slug"] for p in (await client.get("/api/news/posts/both/related/?lang=en&limit=10")).json()]
    assert "mn-only" not in rel and "en-only" in rel
    cats = (await client.get("/api/news/categories/?lang=en")).json()
    assert cats[0]["name"] == "Olympiad" and cats[0]["post_count"] == 3   # en хэлтэй мэдээ л тоологдоно
```
- [ ] **Step 2:** `uv run pytest tests/test_news_i18n.py -q` → FAIL.
- [ ] **Step 3:** `router_public.py`: `lang: Lang = "mn"` query бүх GET endpoint-д (categories, posts, posts/{slug}, related); `lang_filter(lang)` → `Post.title_en != ""` эсвэл `Post.title != ""`, `public_filter()`-тэй хамт хэрэглэнэ (жагсаалт, тоо, related нэр дэвшигч, ангиллын тоо). `get_public_post(db, slug, lang: Lang | None = None)` — `None` бол хэлээр шүүхгүй (коммент/лайк endpoint-ууд өөрчлөгдөхгүй). Builder-ууд `localized`-аар; `body_html` EN дээр `p.body_html_en` (fallback-гүй). `languages = [l for l, t in (("mn", p.title), ("en", p.title_en)) if t.strip()]`. Related: `doc_tokens`-д сонгосон хэлний гарчиг/товч/бие.
- [ ] **Step 4:** `uv run pytest -q` → бүгд ногоон (одоогийн `test_news_read.py` өөрчлөлтгүй давна).
- [ ] **Step 5:** `git add backend/app/news/schemas.py backend/app/news/router_public.py backend/tests/test_news_i18n.py`

### Task 3: Мэдээ — админ API англи талбарууд

**Files:**
- Modify: `backend/app/news/schemas.py`, `backend/app/news/router_admin.py`
- Test: `backend/tests/test_news_i18n.py` (нэмнэ)

**Interfaces:**
- Consumes: Task 2 builder-ууд (`lang="mn"` анхдагч → админ хариуд MN үндсэн талбар + `_en` талбарууд).
- Produces: `PostIn` / `PostPatch`: `title: str = Field(default="", max_length=200)` (Patch: `str | None`, min_length хасагдана), `title_en: str = Field(default="", max_length=200)`, `excerpt_en` (≤280), `body_html_en: str = ""`. `ImagePatch.caption_en` (≤200); `POST posts/{id}/images/` Form `caption_en: str = ""`. `CategoryIn/Patch.name_en` (≤80, default ""). `api` хариу `PostAdmin`-д бүх `_en` талбар (Task 2-ын schema-аас удамшина).

- [ ] **Step 1: Failing tests:**
```python
async def test_admin_title_one_required_and_en_slug(client, make_user):
    h = await staff_headers(client, make_user, roles=("news",))
    r = await client.post("/api/news/admin/posts/", json={"title": "", "title_en": ""}, headers=h)
    assert r.status_code == 400 and r.json()["title"] == ["Монгол эсвэл англи гарчиг заавал."]
    r = await client.post("/api/news/admin/posts/", json={"title": "", "title_en": "Open Day 2026", "body_html_en": "<p>Hi</p><script>x</script>"}, headers=h)
    assert r.status_code == 201 and r.json()["slug"] == "open-day-2026" and "<script" not in r.json()["body_html_en"]
    pid = r.json()["id"]
    r = await client.patch(f"/api/news/admin/posts/{pid}/", json={"title_en": ""}, headers=h)
    assert r.status_code == 400   # хоёулаа хоосон болох гэж байна

async def test_admin_lists_en_only_post_and_category_en(client, db, make_user):
    h = await staff_headers(client, make_user, roles=("news",))
    await seed(db)
    slugs = [p["slug"] for p in (await client.get("/api/news/admin/posts/", headers=h)).json()["items"]]
    assert "en-only" in slugs
    r = await client.post("/api/news/admin/categories/", json={"name": "Спорт", "name_en": "Sports"}, headers=h)
    assert r.json()["name_en"] == "Sports"

async def test_facebook_message_falls_back_to_en(client, make_user, fb, monkeypatch):   # fb: conftest.py fixture (FakeFacebook)
    from app.config import settings
    monkeypatch.setattr(settings, "public_site_url", "https://shine-ue.edu.mn")
    h = await staff_headers(client, make_user, roles=("news",))
    pid = (await client.post("/api/news/admin/posts/", json={"title_en": "Open Day", "excerpt_en": "Short"}, headers=h)).json()["id"]
    r = await client.post(f"/api/news/admin/posts/{pid}/publish/", json={"post_to_facebook": True}, headers=h)
    assert fb.posts == [{"message": "Open Day

Short", "link": f"https://shine-ue.edu.mn/en/news/{r.json()['post']['slug']}"}]
```
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** `admin_post_create`/`admin_post_patch`: хадгалахын өмнө (Patch дээр үр дүнгийн утгаар) `if not (title.strip() or title_en.strip()): raise FieldError("title", "Монгол эсвэл англи гарчиг заавал.")`; `body_html_en` → `clean_html`; `_apply_slug(db, p, wanted, p.title or p.title_en)`. Facebook: `title, excerpt = (p.title, p.excerpt) if p.title.strip() else (p.title_en, p.excerpt_en)`; холбоос MN хоосон бол `/en/news/{slug}`. `_comment_admin`-ийн `PostRef.title` → `p.title or p.title_en`.
- [ ] **Step 4:** `uv run pytest -q` → ногоон.
- [ ] **Step 5:** `git add backend/app/news backend/tests/test_news_i18n.py`

### Task 4: Хөтөлбөр — хэлтэй API + админ талбарууд

**Files:**
- Modify: `backend/app/programs/{schemas,service,router_public,router_admin}.py`
- Test: `backend/tests/test_programs_i18n.py`

**Interfaces:**
- Produces: `card_out(request, p, lang: Lang = "mn")`, `detail_out(request, p, lang: Lang = "mn")`, `work_out(request, w, lang: Lang = "mn")`. Schema нэмэлт: `ProgramCard.name_en, summary_en`; `ProgramDetail.body_html_en`; `ProgramAdmin.body_html_en`; `WorkOut.title_en, caption_en`; `ProgramIn/Patch.name_en (≤120), summary_en (≤280), body_html_en`; `WorkPatch.title_en (≤160), caption_en (≤280)`; `work_create` Form `title_en: str = ""`, `caption_en: str = ""`.

- [ ] **Step 1: Failing tests:**
```python
async def test_programs_en_fallback(client, db):
    p = Program(slug="ibdp", name="IB хөтөлбөр", name_en="IB Diploma", badge="IBDP", summary="Товч", body_html="<p>MN</p>", grade_from=11, grade_to=12)
    db.add(p); await db.flush()
    db.add(ProgramWork(program_id=p.id, image="programs/w.jpg", title="Бүтээл", title_en="", caption="Т", caption_en="Cap"))
    await db.flush()
    c = (await client.get("/api/programs/?lang=en")).json()[0]
    assert c["name"] == "IB Diploma" and c["summary"] == "Товч"            # summary_en хоосон → MN
    d = (await client.get("/api/programs/ibdp/?lang=en")).json()
    assert d["body_html"] == "<p>MN</p>"                                    # хөтөлбөрийн бие MN fallback (мэдээнээс ялгаатай)
    assert d["works"][0]["title"] == "Бүтээл" and d["works"][0]["caption"] == "Cap"
    assert (await client.get("/api/programs/ibdp/")).json()["name"] == "IB хөтөлбөр"

async def test_programs_admin_en_fields(client, db, make_user):
    h = await staff_headers(client, make_user, roles=("manager",))
    r = await client.post("/api/programs/admin/programs/", json={"name": "Үндэсний", "badge": "MN", "name_en": "National", "body_html_en": "<p>x</p><script>y</script>"}, headers=h)
    assert r.status_code == 201 and r.json()["name_en"] == "National" and "<script" not in r.json()["body_html_en"]
```
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Public router-ууд `lang: Lang = "mn"`; builder-ууд `localized`; `body_html_en` → `_clean_body` (админ). Admin builder-ууд MN (`lang="mn"`) + `_en` талбарууд.
- [ ] **Step 4:** `uv run pytest -q` → ногоон.
- [ ] **Step 5:** `git add backend/app/programs backend/tests/test_programs_i18n.py`

### Task 5: Бидний тухай — хэлтэй API + админ талбарууд

**Files:**
- Modify: `backend/app/about/{schemas,service,router_public,router_admin}.py`
- Test: `backend/tests/test_about_i18n.py`

**Interfaces:**
- Produces: `page_out(p, lang: Lang = "mn")`, `leader_out(request, l, lang: Lang = "mn")`, `department_out(d, lang: Lang = "mn")`. Schema: `StatItem.label_en: str = Field(default="", max_length=60)`; `PageOut.intro_title_en, intro_html_en`; `PagePatch.intro_title_en (≤160), intro_html_en`; `LeaderOut/LeaderPatch.position_en (≤160)`; `leader_create` Form `position_en: str = ""`; `TeacherOut/In/Patch.role_en (≤120)`; `DepartmentOut/In/Patch.name_en (≤120)`.

- [ ] **Step 1: Failing tests:**
```python
async def test_about_en(client, db, make_user):
    h = await staff_headers(client, make_user, roles=("manager",))
    r = await client.patch("/api/about/admin/page/", headers=h, json={"intro_title_en": "About us", "intro_html_en": "<p>Hi</p>",
        "stats": [{"value": "23", "label": "жил", "label_en": "years"}, {"value": "900", "label": "сурагч"}]})
    assert r.status_code == 200 and r.json()["stats"][0]["label_en"] == "years"
    d = (await client.get("/api/about/?lang=en")).json()
    assert d["page"]["intro_title"] == "About us" and [s["label"] for s in d["page"]["stats"]] == ["years", "сурагч"]
    assert (await client.get("/api/about/")).json()["page"]["stats"][0]["label"] == "жил"
    r = await client.patch("/api/about/admin/page/", headers=h, json={"stats": [{"value": "1", "label": "a", "label_en": "x" * 61}]})
    assert r.status_code in (400, 422)
```
плюс leader `position_en`, department `name_en`, teacher `role_en` нэг тестэд: үүсгээд `?lang=en`-д англи, хоосон бол MN.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** `PagePatch._stats` validator `label_en` ≤ 60 шалгана; stats JSONB-д `label_en`-ийг хадгална (байхгүй мөрийг `""` гэж уншина). Public router `lang`; builder-ууд `localized`; `intro_html` EN хоосон бол MN.
- [ ] **Step 4:** `uv run pytest -q` → ногоон.
- [ ] **Step 5:** `git add backend/app/about backend/tests/test_about_i18n.py`

### Task 6: Төгсөгч — улсын англи нэр

**Files:**
- Modify: `backend/app/graduates/{countries,service,router_public}.py`; Test: `backend/tests/test_graduates.py`

**Interfaces:**
- Produces: `_ROWS` мөр `(code, name, name_en, numeric, continent, lon, lat)`; `CATALOGUE[code]["name_en"]`; `out(c, lang: Lang = "mn") -> DestinationOut` (`name` localized; `DestinationOut`/`CatalogueItem` бүтэц хэвээр, `name_en` талбар **нэмэхгүй** — каталогийн dict-ээс `name_en`-ийг schema руу дамжуулахгүй байх).

- [ ] **Step 1: Failing test:** `GET /api/graduates/?lang=en` → `"US"`-ийн `name == "United States"`; `lang` байхгүй бол `"АНУ"`; `CATALOGUE` бүх 84 мөрөнд `name_en` хоосон биш (`assert all(v["name_en"] for v in CATALOGUE.values())`).
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** 84 улсад ердийн англи нэр (жишээ: "KR" → "South Korea", "KP" → "North Korea", "GB" → "United Kingdom", "ZA" → "South Africa"). Админ catalogue endpoint MN нэрээр хэвээр.
- [ ] **Step 4:** `uv run pytest -q` → ногоон.
- [ ] **Step 5:** `git add backend/app/graduates backend/tests/test_graduates.py`

---

## Phase 2 — Frontend суурь

### Task 7: `lib/i18n` — хэл, зам, толь бичгийн суурь

**Files:**
- Create: `frontend/src/lib/i18n/paths.ts`, `paths.test.ts`, `index.ts`, `mn.ts`, `en.ts`
- Modify: `frontend/package.json` (`"test": "node --test src/lib/i18n/paths.test.ts"`), `frontend/tsconfig.json` (`"allowImportingTsExtensions": true`)

**Interfaces:**
- Produces (`paths.ts`, импортгүй цэвэр модуль):
  - `export type Lang = "mn" | "en"; export const LANGS: Lang[]; export const isLang(v: string): v is Lang`
  - `export const MN_ONLY = ["/calendar", "/timetable", "/clubs", "/survey"]` (угтвар; `/calendar/timetable` орно)
  - `localePath(lang: Lang, path: string): string` — `("en","/")→"/en"`, `("en","/about")→"/en/about"`, `("en","/#programs")→"/en#programs"`, `("mn", p)→p`
  - `stripLang(pathname: string): { lang: Lang; path: string }` — `"/en/news/x"→{en,"/news/x"}`, `"/en"→{en,"/"}`, `"/news"→{mn,"/news"}`
  - `switchPath(pathname: string, search: string, target: Lang): string` — нөгөө хэлний зам + `search`; target `en` ба зам `MN_ONLY` бол `"/en"`
  - `type ProxyAction = { kind: "next" } | { kind: "rewrite"; to: string } | { kind: "redirect"; to: string; status: 307 | 308 }`
  - `proxyAction(pathname: string, search: string): ProxyAction` — `/en…` → next (MN_ONLY бол 307 монгол руу); `/mn` эсвэл `/mn/…` → 308 угтваргүй; бусад → rewrite `/mn${pathname === "/" ? "" : pathname}${search}`
  - `shouldHandle(pathname: string): boolean` — `/admin`, `/olympiad`, `/api`, `/_next` угтвартай эсвэл сүүлийн сегментэд цэг (`.png`, `.ico` …) бол `false`
- Produces (`index.ts`): re-export `paths.ts`; `getDict(lang: Lang): Dict`.
- Produces (`mn.ts`): `export const mn = { meta: { siteName, defaultDescription }, common: { unavailable, allNews, readMore, backToNews … } }; export type Dict = typeof mn;` (string утгууд widened; тоо оролцсон текст функц, ж: `universities: (n: number) => string`). Дараагийн task бүр өөрийн хэсгийг (`nav`, `footer`, `home`, `about`, `news`, `programs`, `admission`) `mn.ts` ба `en.ts`-д зэрэг нэмнэ.
- Produces (`en.ts`): `export const en: Dict = { … }` (түлхүүр дутвал tsc алдаа).

- [ ] **Step 1: Failing test** `paths.test.ts` (`import { … } from "./paths.ts"`, `node:test`, `node:assert/strict`):
```ts
test("proxyAction", () => {
  assert.deepEqual(proxyAction("/", ""), { kind: "rewrite", to: "/mn" });
  assert.deepEqual(proxyAction("/news", "?page=2&category=x"), { kind: "rewrite", to: "/mn/news?page=2&category=x" });
  assert.deepEqual(proxyAction("/en/news", "?page=2"), { kind: "next" });
  assert.deepEqual(proxyAction("/mn/about", "?a=1"), { kind: "redirect", to: "/about?a=1", status: 308 });
  assert.deepEqual(proxyAction("/mn", ""), { kind: "redirect", to: "/", status: 308 });
  assert.deepEqual(proxyAction("/en/calendar/timetable", ""), { kind: "redirect", to: "/calendar/timetable", status: 307 });
  assert.deepEqual(proxyAction("/english", ""), { kind: "rewrite", to: "/mn/english" });
});
test("shouldHandle", () => {
  for (const p of ["/logo-full.png", "/icon.png", "/favicon.ico", "/_next/static/x.js", "/admin/news/1", "/api/revalidate", "/olympiad"]) assert.equal(shouldHandle(p), false, p);
  for (const p of ["/", "/about", "/en", "/news/abc"]) assert.equal(shouldHandle(p), true, p);
});
test("switchPath", () => {
  assert.equal(switchPath("/", "", "en"), "/en");
  assert.equal(switchPath("/en", "", "mn"), "/");
  assert.equal(switchPath("/news/abc", "?x=1", "en"), "/en/news/abc?x=1");
  assert.equal(switchPath("/en/news/abc", "", "mn"), "/news/abc");
  assert.equal(switchPath("/calendar", "", "en"), "/en");
});
test("localePath", () => {
  assert.equal(localePath("en", "/"), "/en");
  assert.equal(localePath("en", "/#programs"), "/en#programs");
  assert.equal(localePath("mn", "/about"), "/about");
});
```
- [ ] **Step 2:** `cd frontend && npm test` → FAIL (module байхгүй).
- [ ] **Step 3:** `paths.ts`, `index.ts`, `mn.ts`, `en.ts` (эхлээд `meta`, `common` хэсэг).
- [ ] **Step 4:** `npm test` → PASS; tsc + eslint → 0.
- [ ] **Step 5:** `git add frontend/src/lib/i18n frontend/package.json frontend/tsconfig.json`

### Task 8: `[lang]` замчлал, proxy, root layout-ууд, LangProvider

**Files:**
- Create: `frontend/src/proxy.ts`, `frontend/src/app/fonts.ts`, `frontend/src/app/[lang]/layout.tsx`, `frontend/src/app/[lang]/not-found.tsx`, `frontend/src/components/site/LangProvider.tsx`
- Move: `git mv "frontend/src/app/(site)" "frontend/src/app/[lang]/(site)"`
- Delete: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/admin/layout.tsx`, `frontend/src/app/olympiad/layout.tsx`

**Interfaces:**
- Consumes: Task 7 `proxyAction`, `shouldHandle`, `isLang`, `Lang`.
- Produces: `fonts.ts`: `export const fontVars: string` (TT Norms + mono + Caveat `variable` className-ууд нийлсэн), `export const baseMetadata: Metadata`. `LangProvider({ lang, children })` ("use client"), `useLang(): Lang`, `useDict(): Dict`. `[lang]/layout.tsx`: `generateStaticParams() → [{lang:"mn"},{lang:"en"}]`; `isLang` биш бол `notFound()`; `<html lang={lang} className={fontVars + " h-full antialiased"}>`, splash script, `VisitorProvider`, `LangProvider`, одоогийн `(site)/layout.tsx`-ийн агуулга (`(site)/layout.tsx` нь header/smoother-оо хэвээр хадгална). **`dynamicParams = false` тавихгүй** (доорх `[slug]` хуудсуудыг 404 болгоно).

- [ ] **Step 1:** `proxy.ts`: `export function proxy(req: NextRequest)` — `shouldHandle` false бол `NextResponse.next()`; `proxyAction` → `NextResponse.rewrite(new URL(to, req.url))` / `NextResponse.redirect(new URL(to, req.url), status)`. `export const config = { matcher: ["/((?!_next/|api/|admin|olympiad|.*\\..*).*)"] }`.
- [ ] **Step 2:** Root layout-ууд: `admin/layout.tsx` ба `olympiad/layout.tsx` нь `<html lang="mn" className=…><body className="min-h-full flex flex-col font-sans">` + `globals.css` (olympiad-д `katex` + `olympiad.css` хэвээр) болно; `app/layout.tsx` устгана. `[lang]/(site)/**` дотор `import` замууд `@/…` тул өөрчлөгдөхгүй.
- [ ] **Step 3:** tsc + eslint → 0. `preview_start frontend` (эсвэл ажиллаж буй dev server) → `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n"`:
  - `/`, `/about`, `/news`, `/news?page=2`, `/calendar`, `/clubs`, `/programs/<slug>` → 200 (монгол агуулга, HTML-д `<html lang="mn"`)
  - `/en` → 200, `<html lang="en"`; `/mn/about` → 308 `/about`; `/en/calendar` → 307 `/calendar`
  - `/admin/login`, `/olympiad` → 200; `/logo-full.png` → 200; `/xyz` → 404
- [ ] **Step 4:** Browser: `/` нүүр өмнөхтэй ижил (splash, header, smoother, газрын зураг), console алдаагүй.
- [ ] **Step 5:** `git add -A frontend/src/app frontend/src/proxy.ts frontend/src/components/site/LangProvider.tsx`

### Task 9: Header, footer, хэл солих товч, hreflang

**Files:**
- Create: `frontend/src/components/site/LangSwitch.tsx`, `frontend/src/lib/i18n/metadata.ts`
- Modify: `frontend/src/components/home/SiteHeader.tsx`, `SiteFooter.tsx`, `frontend/src/lib/home-data.ts`, `mn.ts`, `en.ts`, `frontend/src/app/[lang]/(site)/layout.tsx`

**Interfaces:**
- Consumes: Task 8 `useLang`, `useDict`; Task 7 `switchPath`, `localePath`.
- Produces: `NAV_LINKS: Record<Lang, NavItem[]>` (href-үүд хэлгүй зам; харуулахдаа `localePath`); dict `nav`, `footer` хэсэг. `LangSwitch({ languages?: Lang[] })` — `usePathname` + `useSearchParams`, `switchPath`; `languages`-д target байхгүй бол `localePath(target, "/news")`. Мэдээний дэлгэрэнгүй `languages`-ийг дамжуулах механизм: `LangSwitchContext` (`components/site/LangSwitch.tsx`-д `<LangAvailability languages={…} />` client компонент контекстийг тохируулна) — Task 13 ашиглана. `alternates(path: string, langs?: Lang[]): Metadata["alternates"]` — `{ canonical, languages: { mn: path, en: "/en…", "x-default": path } }` (`langs`-д байхгүй хэлийг орхино).

- [ ] **Step 1:** `SiteHeader`: `useLang()`; EN бол `NAV_LINKS.en`, YearTiles/Олимпиад холбоос, drop-down байхгүй; бүх `href` → `localePath(lang, …)`; лого → `localePath(lang, "/")`; `LangSwitch` desktop баруун захад (grid-ийн баруун баганын төгсгөл), mobile цэсний доод талд. `aria-label`-ууд dict-ээс. `SiteFooter` текст, холбоосууд dict + `localePath`; EN-д MN_ONLY холбоосуудыг харуулахгүй.
- [ ] **Step 2:** `[lang]/(site)/layout.tsx`: олимпиадын оныг зөвхөн `lang === "mn"` үед татна.
- [ ] **Step 3:** tsc + eslint → 0. Browser: `/` header өмнөхтэй ижил + `MN | EN`; `/en` header Home · About · News | лого | Programs · Admission · Contact; `EN` дарахад `/about` → `/en/about`, `MN` дарахад буцна; `/en` mobile (375px) цэс ажиллана.
- [ ] **Step 4:** `git add` өөрчилсөн файлууд.

---

## Phase 3 — Нийтийн хуудсууд

### Task 10: Өгөгдлийн давхарга (`lang` параметр, төрлүүд)

**Files:**
- Modify: `frontend/src/lib/{news-api,programs-api,about-api,graduates-api,types,world-map}.ts`

**Interfaces:**
- Produces: `fetchPosts(opts: { page?; category?; pageSize?; lang?: Lang })`, `fetchPost(slug, lang: Lang = "mn")`, `fetchCategories(lang: Lang = "mn")`, `fetchRelatedPosts(post, limit = 3, lang: Lang = "mn")`, `fetchPrograms(lang: Lang = "mn")`, `fetchProgram(slug, lang: Lang = "mn")`, `fetchAbout(lang: Lang = "mn")`, `fetchGraduates(lang: Lang = "mn")` — бүгд `?lang=${lang}` дамжуулна. `fetchGraduateStats` өөрчлөгдөхгүй. `buildMapData(destinations, lang: Lang = "mn")` — кэш түлхүүрт `lang`. Төрлүүд: `PostDetail.languages: Lang[]`, `PostCard.title_en/excerpt_en`, `PostDetail.body_html_en`, `NewsImage.caption_en`, `NewsCategory.name_en`, `ProgramCard.name_en/summary_en`, `ProgramDetail.body_html_en`, `ProgramAdmin.body_html_en`, `ProgramWork.title_en/caption_en`, `AboutStat.label_en?: string`, `AboutPage.intro_title_en/intro_html_en`, `AboutLeader.position_en`, тэнхим `name_en`, багш `role_en`, `PostInput`/`ProgramInput`-ийн `_en` талбарууд (optional).
- [ ] **Step 1:** Өөрчлөөд tsc + eslint → 0 (анхдагч `mn` тул дуудагчид эвдрэхгүй).
- [ ] **Step 2:** `git add frontend/src/lib`

### Task 11: Нүүр хуудас EN

**Files:**
- Modify: `frontend/src/app/[lang]/(site)/page.tsx`, `components/home/{Hero,ProgramsSection,ProgramCard,NewsSection,Graduation,GraduationMap,LocationSection}.tsx`, `components/news/PostGrid.tsx`, `components/site/Typewriter.tsx` (зөвхөн шаардлагатай бол), `lib/home-data.ts`, `mn.ts`, `en.ts`

**Interfaces:**
- Consumes: Task 10 fetch-ууд; Task 8 `useLang/useDict`; Task 9 `alternates`.
- Produces: dict `home` (hero гарчиг `Shine Ue` / `School`, ишлэл EN орчуулга + эх MN мөр, programs/news/graduation/location шошго, тивийн нэрс `continents: Record<Continent, string>`); `home-data.ts`: `GRADUATION: Record<Lang, {title,text}>`, `CONTACT.address/hours: Record<Lang, string>`, `CONTACT.mapEmbedUrl` EN-д `hl=en`. `PostGrid({ posts, lang })` — холбоос `localePath(lang, "/news/" + slug)`, огноо Task 13-ын `formatDate(iso, lang)`.
- [ ] **Step 1:** `page.tsx`: `params.lang` → fetch-д дамжуулна; `generateMetadata` → dict `meta` + `alternates("/")`. Hero EN: олимпиадын товч нуугдана, ишлэл англи (Caveat) + доор нь жижиг эх монгол `lang="mn"`.
- [ ] **Step 2:** tsc + eslint → 0. Browser `/en`: hero, хөтөлбөрийн картууд (EN нэр, `/en/programs/…` холбоос), мэдээ (зөвхөн EN мэдээ эсвэл "No news yet."), төгсөлтийн тоолуур + газрын зураг (улсын/тивийн нэр англи, typewriter англи), байршил (англи хаяг). `/` өмнөхтэй ижил.
- [ ] **Step 3:** `git add` өөрчилсөн файлууд.

### Task 12: Бидний тухай EN

**Files:**
- Modify: `frontend/src/app/[lang]/(site)/about/page.tsx`, `components/about/{IntroSection,LeadershipChart,Departments}.tsx`, `components/home/HistoryTimeline.tsx`, `lib/home-data.ts`, `mn.ts`, `en.ts`

**Interfaces:**
- Produces: `HISTORY: Record<Lang, HistoryItem[]>` (EN 24 мөр: баримттай онууд (2003, 2018, 2021–2026) орчуулга, бусад `[YYYY highlight]` placeholder); dict `about`.
- [ ] **Step 1:** `fetchAbout(lang)`; `HistoryTimeline` `HISTORY[useLang()]`; гарчиг/шошго dict; `generateMetadata` + `alternates("/about")`.
- [ ] **Step 2:** tsc + eslint → 0. Browser `/en/about`: танилцуулга (EN эсвэл MN fallback), үзүүлэлт шошго, түүх англи, хамт олны албан тушаал, тэнхимүүд; snake шугам зөв эгнэсэн.
- [ ] **Step 3:** `git add`.

### Task 13: Мэдээ EN (жагсаалт, дэлгэрэнгүй, коммент)

**Files:**
- Modify: `frontend/src/app/[lang]/(site)/news/page.tsx`, `news/[slug]/page.tsx`, `components/news/{format.ts,Pagination,RelatedPosts,Comments,LikeButton,ShareButtons,VisitorBar,Gallery}.tsx`, `mn.ts`, `en.ts`

**Interfaces:**
- Produces: `formatDate(iso: string, lang: Lang = "mn")`, `formatDateTime(iso: string, lang: Lang = "mn")` — MN хэвээр (`2026.09.19`), EN `19 Sep 2026` / `19 Sep 2026, 14:30` (`Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ulaanbaatar", day: "numeric", month: "short", year: "numeric" })`). dict `news`.
- [ ] **Step 1:** Жагсаалт: `fetchPosts({…, lang})`, `fetchCategories(lang)`, `pageHref` → `localePath`; хоосон үед `news.empty`. Дэлгэрэнгүй: `fetchPost(slug, lang)` null → `notFound()`; `<LangAvailability languages={post.languages} />` (Task 9); `excerpt`-ийг body хоосон үед `<p>`-ээр харуулна; `ShareButtons` URL `SITE_URL + localePath(lang, "/news/" + slug)`; `generateMetadata` → `alternates("/news/" + slug, post.languages)`, openGraph `locale`.
- [ ] **Step 2:** Client компонентууд (`Comments`, `LikeButton`, `ShareButtons`, `VisitorBar`, `Gallery`, `Pagination`) текстээ `useDict().news`-ээс.
- [ ] **Step 3:** tsc + eslint → 0. Локал өгөгдөл: админаар (эсвэл `uv run python` скриптээр) нэг мэдээнд EN бөглөж, нэгийг зөвхөн EN үүсгэнэ. Browser: `/en/news` (зөвхөн EN мэдээ, ангиллын нэр англи), `/en/news/<both>` (англи бие, огноо EN, `MN` дарахад `/news/<both>`), `/en/news/<mn-only>` → 404 хуудас (англи), `/news/<en-only>` → 404, `/news/<mn-only>` дээр `EN` дарахад `/en/news`.
- [ ] **Step 4:** `git add`.

### Task 14: Хөтөлбөр ба Элсэлт EN

**Files:**
- Modify: `frontend/src/app/[lang]/(site)/programs/[slug]/page.tsx`, `admission/page.tsx`, `components/programs/{ProgramHero,ProgramFacts,ProgramRadar,ScholarshipChart,Scholarships,WorksGallery,money.ts}`, `mn.ts`, `en.ts`

**Interfaces:**
- Produces: dict `programs` (`grades: (from, to) => string`, хэрэгжилт, бүтээл, тэтгэлэг, график шошго, tooltip), `admission`. `money.ts` форматлагч `lang` авна (EN `$120,000`).
- [ ] **Step 1:** `fetchProgram(slug, lang)`; ApexCharts шошго/tooltip dict-ээс (client: `useDict`); `generateMetadata` + `alternates`.
- [ ] **Step 2:** tsc + eslint → 0. Browser `/en/programs/<ib>`, `/en/programs/national-core-curriculum` (ЭЕШ график шошго англи, хичээлийн нэр MN хэвээр), `/en/admission`.
- [ ] **Step 3:** `git add`.

---

## Phase 4 — Админ

### Task 15: Админ мэдээ — МН/EN таб

**Files:**
- Modify: `frontend/src/components/admin/PostEditor.tsx`, `frontend/src/app/admin/(dashboard)/news/page.tsx`, `news/categories/page.tsx`, `frontend/src/lib/api.ts`

**Interfaces:**
- Consumes: Task 3 API (`title_en`, `excerpt_en`, `body_html_en`, `caption_en`, `name_en`); Task 10 төрлүүд.
- Produces: `PostEditor` дотор `tab: "mn" | "en"` state; таб шошго `Монгол` / `English ✓` эсвэл `English: хоосон` (`title_en.trim()`-ээс); гарчиг, товч (`n/280`), RichText, зургийн тайлбар (`caption` / `caption_en` onBlur PATCH) табаар; ангилал, slug, огноо, cover, нийтлэх, Facebook таб гадна. Гарчгийн `required`-ийг хасна (backend шалгана; алдаа `errors.title` хоёр табын дээр харагдана).
- [ ] **Step 1:** Хэрэгжүүлнэ; `api.news` хадгалах payload-д `_en` талбарууд; мэдээний жагсаалтад `МН`/`EN` badge (`title`/`title_en` хоосон эсэхээр); ангиллын хуудсанд "Нэр (English)".
- [ ] **Step 2:** tsc + eslint → 0. Browser (локал superuser скриптээр токен — бодит нууц үг ашиглахгүй): шинэ мэдээ зөвхөн English табаар үүсгэж нийтлэх → `/en/news`-д харагдана, `/news`-д үгүй; хоёр гарчиг хоосон хадгалах → "Монгол эсвэл англи гарчиг заавал." алдаа.
- [ ] **Step 3:** `git add`.

### Task 16: Админ хөтөлбөр ба бидний тухай — English талбарууд

**Files:**
- Modify: `frontend/src/components/admin/programs/{ProgramForm,WorkDialog}.tsx`, `frontend/src/app/admin/(dashboard)/about/page.tsx`, `frontend/src/components/admin/about/{LeaderDialog,DepartmentList,TeacherTable}.tsx`, `frontend/src/lib/api.ts`

**Interfaces:**
- Consumes: Task 4, 5 API талбарууд.
- Produces: `ProgramForm` нэр/товч/их бие `Монгол | English` таб (PostEditor-ийн таб товчны ижил хэв маяг — шаардлагатай бол `components/admin/LangTabs.tsx`-д гаргаж хоёуланд ашиглана); `WorkDialog` "Гарчиг (English)", "Тайлбар (English)" (work create FormData-д `title_en`, `caption_en`); about page танилцуулга таб + үзүүлэлт мөр бүрт "Шошго (English)"; `LeaderDialog` "Албан тушаал (English)" (FormData `position_en`); тэнхим "Нэр (English)"; багш "Үүрэг (English)".
- [ ] **Step 1:** Хэрэгжүүлнэ; `afterSave` tag-ууд хэвээр.
- [ ] **Step 2:** tsc + eslint → 0. Browser: IBDP-д `name_en` хадгалах → `/en` картанд англи нэр (revalidate-ийн дараа); about танилцуулгад English бөглөх → `/en/about`.
- [ ] **Step 3:** `git add`.

### Task 17: Эцсийн шалгалт

- [ ] **Step 1:** `cd backend && PYTHONIOENCODING=utf-8 uv run pytest -q` → бүгд ногоон; `cd frontend && npm test` → PASS; tsc + eslint → 0.
- [ ] **Step 2:** Spec §11-ийн браузер жагсаалт: `/`, `/about`, `/news`, `/programs/<slug>`, `/calendar`, `/clubs`, `/olympiad`, `/admin` өмнөх шигээ; `/en`, `/en/about`, `/en/news`, `/en/news/<slug>`, `/en/programs/<slug>`, `/en/admission`; `MN | EN` бүх хуудсанд; `/mn/about` → `/about`; `/en/calendar` → `/calendar`; `<html lang>` зөв; hreflang `<link rel="alternate">` HTML-д; console алдаагүй; mobile 375px header.
- [ ] **Step 3:** `git status` — бүх өөрчлөлт staged; хэрэглэгчид тайлан ("commit push" хүлээнэ).
