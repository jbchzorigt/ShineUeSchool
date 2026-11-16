# "Бидний тухай" — байгууллагын бүтцийн диаграм — хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/about` хуудсанд удирдлагын гишүүдийн харьяаллаар (хэн хэнд) модон бүтцийн диаграм (зураг, нэр, албан тушаал, тэнхимүүд) гаргаж, харьяаллыг `/admin/about`-аас удирддаг болгох; "Хамт олон" marquee-г солих.

**Architecture:** Backend `about_leaders.parent_id`, `about_departments.leader_id` (migration 0023, level-ээс анхны харьяалал). Frontend-д цэвэр функц `buildOrgTree` (`lib/org-tree.ts`) модыг угсарч, client component `OrgChart` нь салаа `ul > li` + бодит `span` шугамаар зурж, GSAP timeline-аар (IntersectionObserver) түвшин түвшнээр нээнэ. Админы dialog/тэнхимийн хуудсанд харьяаллын `Select`.

**Tech Stack:** FastAPI + SQLAlchemy 2 async + Alembic + PostgreSQL; Next.js 16 App Router + React 19 + Tailwind v4; GSAP 3.15 (`@/components/site/gsap`), `@gsap/react` `useGSAP`.

**Spec:** `docs/superpowers/specs/2026-11-16-about-org-chart-design.md`

## Global Constraints

- **Commit хийхгүй.** Task бүр `git add`-аар дуусна (хэрэглэгч тухайн үед хэлэх хүртэл commit/push хийхгүй).
- Backend тест: `cd backend && PYTHONIOENCODING=utf-8 uv run pytest -q` — одоо **238 passed**; task бүрийн төгсгөлд бүгд ногоон.
- Frontend: `cd frontend && node node_modules/typescript/bin/tsc --noEmit -p . && node node_modules/eslint/bin/eslint.js src && npm test` — 0 problems (`npx` биш, `node node_modules/...`).
- Windows: хаалттай замыг ишлэлд (`"frontend/src/app/[lang]/(site)/about/page.tsx"`); файл бичихэд Write tool.
- Алдаа `FieldError(field, msg)` → 400 `{field: [msg]}`. Шинэ мессежүүд үгчлэн: `parent_id: "Ийм гишүүн олдсонгүй."`, `parent_id: "Өөрийгөө дээд албан тушаалтан болгох боломжгүй."`, `parent_id: "Харьяалал давталт үүсгэж байна."`, `leader_id: "Ийм гишүүн олдсонгүй."`.
- Эрэмбэ хэвээр: удирдлага `level, order, id`; тэнхим `order, id`; багш `is_head DESC, order, id`. `PUT /leaders/order/` `parent_id`-г хөндөхгүй.
- GSAP зөвхөн `@/components/site/gsap`-аас импортолно. ScrollTrigger биш **IntersectionObserver** (ScrollSmoother дор ScrollTrigger ажилладаггүй — `Reveal.tsx`). `prefers-reduced-motion` → анимацигүй.
- Сайтын өнгө/фонт: navy `#1e3a8f` (`text-navy`, `bg-navy`), `navy-deep`, `gold`, `border-line`, `bg-paper-2`, `font-display`, `text-muted`, `text-ink`. Картын загварт `frontend-design` skill-ийн зарчим.
- Монгол хэлээр коммент, UI текст; одоогийн кодын хэв маяг (богино, нягт мөрүүд).

## Review Focus

1. Шинэ талбаргүй хуучин API (сервер шинэчлэгдээгүй, Next cache) → `/about` унахгүй, бүх гишүүн үндэс болж харагдана. → Task 3 тест `хуучин API: parent_id байхгүй`.
2. Өгөгдөлд мөчлөг (A→B→A, өөртөө заасан — DB-д шууд оруулсан) → хуудас гацахгүй, гишүүн бүр яг нэг удаа. → Task 3 тест `мөчлөг`.
3. Админ хуучин dropdown-оос аль хэдийн устгагдсан гишүүнийг сонговол → 400 `parent_id`, 500 биш. → Task 1 тест.
4. Нэг дээд албан тушаалтанд олон (6+) доод гишүүн/тэнхим, урт нэр, албан тушаал → зөвхөн диаграмын контейнер хажуу тийш гүйнэ, хуудас (`document.documentElement.scrollWidth`) гүйхгүй; урт текст картаас гарахгүй. → Task 5 браузер шалгалт.
5. Хэсэг ачаалахад аль хэдийн дэлгэцэнд байх / reduced motion / анимаци таслагдах → бүх карт эцэст нь `opacity: 1`. → Task 5 браузер шалгалт.

## Файлын бүтэц

| Файл | Үүрэг |
|---|---|
| `backend/alembic/versions/0023_about_org_chart.py` (шинэ) | 2 багана + FK SET NULL + index; `parent_map()` цэвэр функц + level-ээс анхны утга |
| `backend/app/about/models.py` | `Leader.parent_id`, `Department.leader_id` |
| `backend/app/about/schemas.py` | `LeaderOut/LeaderPatch.parent_id`, `DepartmentOut/In/Patch.leader_id` |
| `backend/app/about/service.py` | `leader_out`/`department_out`-д талбар; `check_parent()`, `check_leader()` |
| `backend/app/about/router_admin.py` | create/patch/delete-д харьяалал |
| `backend/tests/test_about_org.py` (шинэ) | харьяаллын бүх тест |
| `frontend/src/lib/types.ts`, `frontend/src/lib/api.ts` | төрөл, `departments.setLeader` |
| `frontend/src/lib/org-tree.ts` (+ `.test.ts`) (шинэ) | `buildOrgTree`, `descendantIds` |
| `frontend/src/components/admin/about/LeaderDialog.tsx`, `LeaderList.tsx`, `DepartmentList.tsx`, `DepartmentLeaderSelect.tsx` (шинэ) | админ |
| `frontend/src/app/admin/(dashboard)/about/leaders/page.tsx`, `.../departments/page.tsx` | өгөгдөл дамжуулах |
| `frontend/src/components/about/OrgChart.tsx`, `OrgCards.tsx` (шинэ) | нийтийн диаграм |
| `frontend/src/lib/i18n/mn.ts`, `en.ts` | `about.org*` түлхүүрүүд |
| `frontend/src/app/[lang]/(site)/about/page.tsx` | `LeadershipChart` → `OrgChart` |
| `frontend/src/components/about/LeadershipChart.tsx` | устгана |

---

### Task 1: Харьяаллын багана, migration, удирдлагын харьяалал (backend)

**Files:**
- Create: `backend/alembic/versions/0023_about_org_chart.py`, `backend/tests/test_about_org.py`
- Modify: `backend/app/about/models.py`, `schemas.py`, `service.py`, `router_admin.py`

**Interfaces:**
- Produces: `Leader.parent_id: Mapped[int | None]` (FK `about_leaders.id`, `ondelete="SET NULL"`, index); `Department.leader_id: Mapped[int | None]` (FK `about_leaders.id`, `ondelete="SET NULL"`, index); `LeaderOut.parent_id: int | None`; `LeaderPatch.parent_id: int | None = None`; `POST /leaders/` Form `parent_id: str = ""` (хоосон = null); `async def check_parent(db, leader_id: int | None, parent_id: int | None) -> int | None` (service.py); migration-д `def parent_map(rows: list[tuple[int, int, int]]) -> dict[int, int]` (`(id, level, order)` → `{id: parent_id}`).

- [ ] **Step 1: Бүтэлгүйтэх тестүүдийг бич** (`backend/tests/test_about_org.py`; `tests.helpers.manager_headers`, `A = "/api/about/admin"`; гишүүнийг `client.post(f"{A}/leaders/", data={...})`-аар үүсгэх туслах `mk(client, h, name, level, parent="")`)

```python
async def test_parent_set_clear_and_output(client, make_user):
    # root=mk("Захирал",1); child=mk("Дэд",2, parent=str(root["id"]))
    assert child["parent_id"] == root["id"] and root["parent_id"] is None
    # PATCH {"parent_id": None} → 200, parent_id None; PATCH {} → parent_id хөндөгдөхгүй
    # GET /api/about/ leaders[...]["parent_id"] гарна

async def test_parent_validation(client, make_user):
    # PATCH өөр рүүгээ → 400, r.json()["parent_id"] == ["Өөрийгөө дээд албан тушаалтан болгох боломжгүй."]
    # PATCH байхгүй id (99999) → 400 ["Ийм гишүүн олдсонгүй."]; POST parent_id="99999" → 400 мөн
    # a→b→c үед PATCH a.parent_id=c → 400 ["Харьяалал давталт үүсгэж байна."]

async def test_delete_unassigns_children_and_departments(client, make_user, db):
    # root, child(parent=root); Department(name="Мат", leader_id=root.id) db-д шууд
    # DELETE root → 204; GET /api/about/: child parent_id None, Мат тэнхимийн leader_id None (Task 2-оос өмнө: db-ээс шалгана)

async def test_reorder_keeps_parent(client, make_user):
    # child(parent=root) → PUT /leaders/order/ level/order өөрчилнө → child parent_id хэвээр

def test_parent_map_from_levels():
    # importlib.util.spec_from_file_location("m0023", "alembic/versions/0023_about_org_chart.py")
    rows = [(1, 1, 1), (2, 2, 1), (3, 3, 2), (4, 3, 1), (5, 3, 3), (6, 5, 1)]
    assert m.parent_map(rows) == {2: 1, 3: 2, 4: 2, 5: 2, 6: 4}   # 6 → өмнөх хамгийн ойр түвшний (3) эхний гишүүн (order 1 → id 4)
    assert m.parent_map([(1, 2, 1), (2, 2, 2)]) == {}             # нэг түвшин → харьяалалгүй
```

- [ ] **Step 2: Ажиллуулж бүтэлгүйтэхийг шалга** — `cd backend && PYTHONIOENCODING=utf-8 uv run pytest tests/test_about_org.py -q` → FAIL (`parent_id` key / migration файл байхгүй).

- [ ] **Step 3: Model, migration** — models-д хоёр багана (Interfaces). Migration `0023` (down `0022`): `add_column` ×2, `create_foreign_key(..., ondelete="SET NULL")`, `create_index`; дараа нь `SELECT id, level, "order" FROM about_leaders WHERE parent_id IS NULL ORDER BY level, "order", id` → `parent_map` → `UPDATE`. `parent_map`: мөр бүрийн `parent` = түүнээс бага `level`-үүдийн хамгийн их нь болох түвшний `(order, id)`-оор эхний гишүүн; бага түвшин байхгүй бол оруулахгүй. `downgrade`: FK, index, багана устгана.

- [ ] **Step 4: Шалгалт, API** — `check_parent`: `parent_id is None` → None; `parent_id == leader_id` → өөрийгөө алдаа; гишүүн байхгүй → олдсонгүй; `leader_id` байвал шинэ эцгээс `parent_id`-аар дээш явж (зочилсон set-тэй, хязгаартай) `leader_id`-д хүрвэл → давталт алдаа. `leader_create`: Form `parent_id: str = ""` → `int` эсвэл None (тоо биш бол олдсонгүй алдаа) → `check_parent(db, None, ...)`. `leader_patch`: `"parent_id" in d` (exclude_unset) үед л `check_parent(db, l.id, d["parent_id"])`. `leader_delete`: устгахаас өмнө `update(Leader).where(Leader.parent_id == id).values(parent_id=None)` ба `update(Department).where(Department.leader_id == id).values(leader_id=None)` (тестийн session identity map-тай нийцэх; DB FK — нөөц хамгаалалт). `leader_out` → `parent_id=l.parent_id`.

- [ ] **Step 5: Тест ногоон** — `PYTHONIOENCODING=utf-8 uv run pytest -q` → 243 passed орчим, бүгд ногоон.

- [ ] **Step 6: Dev DB migration** — `cd backend && uv run alembic upgrade head` → `0022 -> 0023`; дараа нь `uv run alembic downgrade -1 && uv run alembic upgrade head` алдаагүй; `GET http://localhost:8000/api/about/` хариунд Захирал `parent_id: null`, Гүйцэтгэх захирал → Захирал, 3-р түвшний гурав → Гүйцэтгэх захирал.

- [ ] **Step 7: Stage** — `git add backend/alembic/versions/0023_about_org_chart.py backend/app/about backend/tests/test_about_org.py`

---

### Task 2: Тэнхимийн харьяалал (backend)

**Files:**
- Modify: `backend/app/about/schemas.py`, `service.py`, `router_admin.py`
- Test: `backend/tests/test_about_org.py`

**Interfaces:**
- Consumes: Task 1-ийн `Department.leader_id`.
- Produces: `DepartmentOut.leader_id: int | None`; `DepartmentIn.leader_id: int | None = None`; `DepartmentPatch.leader_id: int | None = None` (exclude_unset); `async def check_leader(db, leader_id: int | None) -> int | None`.

- [ ] **Step 1: Бүтэлгүйтэх тест**

```python
async def test_department_leader(client, make_user):
    # root=mk(...); POST /departments/ {"name": "Мат", "leader_id": root["id"]} → 201, leader_id == root["id"]
    # PATCH {"name": "Математик"} → leader_id хэвээр; PATCH {"leader_id": None} → None
    # PATCH {"leader_id": 99999} → 400, r.json()["leader_id"] == ["Ийм гишүүн олдсонгүй."]
    # GET /api/about/ departments[0]["leader_id"]; ?lang=en хариунд ч бий
```

- [ ] **Step 2: Бүтэлгүйтэхийг шалга** — `uv run pytest tests/test_about_org.py::test_department_leader -q` → FAIL.
- [ ] **Step 3: Хэрэгжүүл** — `check_leader` (None → None; байхгүй → алдаа); `department_create`/`department_patch` (`"leader_id" in d` үед); `department_out` → `leader_id=d.leader_id`. Task 1-ийн delete тестийг API-аар (`departments[...]["leader_id"] is None`) шалгадаг болгож шинэчил.
- [ ] **Step 4: Бүх тест ногоон** — `PYTHONIOENCODING=utf-8 uv run pytest -q`.
- [ ] **Step 5: Stage** — `git add backend/app/about backend/tests/test_about_org.py`

---

### Task 3: Frontend төрөл, API, мод угсрах функц

**Files:**
- Create: `frontend/src/lib/org-tree.ts`, `frontend/src/lib/org-tree.test.ts`
- Modify: `frontend/src/lib/types.ts`, `frontend/src/lib/api.ts`, `frontend/package.json` (`test` script-д `src/lib/org-tree.test.ts`)

**Interfaces:**
- Consumes: API `parent_id`, `leader_id` (Task 1, 2).
- Produces:
  - `AboutLeader.parent_id: number | null`; `AboutLeaderInput.parent_id?: number | null`; `AboutDepartment.leader_id: number | null`.
  - `api.about.leaders.create` нь `parent_id`-г FormData-д (null → `""`) нэмнэ; `api.about.leaders.update` body-д `parent_id` дамжина; `api.about.departments.setLeader(id: number, leaderId: number | null): Promise<AboutDepartment>` (PATCH `{leader_id}`).
  - `org-tree.ts` (зөвхөн `import type` — node test-д ачаалагдана):
    ```ts
    export interface OrgNode { leader: AboutLeader; depth: number; children: OrgNode[]; departments: AboutDepartment[] }
    export function buildOrgTree(leaders: AboutLeader[], departments: AboutDepartment[]): OrgNode[]
    export function descendantIds(leaders: AboutLeader[], id: number): Set<number>   // өөрийг нь оруулахгүй
    ```

- [ ] **Step 1: Бүтэлгүйтэх тест** (`org-tree.test.ts`, `node:test` + `assert/strict`; `L(id, parent)`/`D(id, leader)` жижиг factory)

```ts
test("үндэс ба хүүхдүүд API эрэмбээр, depth", ...)            // [1:null, 2:1, 3:2, 4:2] → roots [1]; 1.children [2]; 2.children [3,4]; depth 0,1,2
test("тэнхим харьяалагдах гишүүндээ, эрэмбээр; харьяалалгүй/байхгүй гишүүн рүү заасан нь гарахгүй", ...)
test("олон үндэс; байхгүй эцэг рүү заасан гишүүн үндэс болно", ...)
test("мөчлөг: 1→2→1 ба 3→3 — гишүүн бүр яг нэг удаа, гацахгүй", ...)  // нийт зангилааны id-ууд [1,2,3] (дараалал: API эрэмбээр анхны зочлоогүй нь үндэс)
test("хуучин API: parent_id/leader_id байхгүй → бүгд үндэс, тэнхим гарахгүй", ...)  // объектод талбар огт байхгүй (as unknown as AboutLeader)
test("descendantIds: доод бүх гишүүн, өөрийг нь оруулахгүй, мөчлөгт гацахгүй", ...)
```

- [ ] **Step 2: Бүтэлгүйтэхийг шалга** — `cd frontend && npm test` → org-tree тест FAIL (модуль байхгүй).
- [ ] **Step 3: Хэрэгжүүл** — алгоритм (тестүүд дарааллыг бүрэн тогтоохгүй тул):
  1. `byId`; `parentOf(l) = l.parent_id ?? null`, эцэг `byId`-д байхгүй эсвэл өөрөө бол null.
  2. `kids: Map<parentId, AboutLeader[]>` (API эрэмбийг хадгална); `depts: Map<leaderId, AboutDepartment[]>` (`leader_id ?? null` нь `byId`-д байгаа бол).
  3. `visited` set; `visit(l, depth)` — зочилсон бол null, үгүй бол тэмдэглээд хүүхдүүдийг рекурсив.
  4. Үндэс = `parentOf == null` гишүүд API эрэмбээр. Дараа нь зочлоогүй гишүүд (мөчлөг) — API эрэмбээр эхний зочлоогүйг нэмэлт үндэс болгож давтана.
  Төрөл, API өөрчлөлт (Interfaces).
- [ ] **Step 4: Ногоон** — `npm test` (бүгд), `tsc`, `eslint` 0 problems.
- [ ] **Step 5: Stage** — `git add frontend/src/lib/org-tree.ts frontend/src/lib/org-tree.test.ts frontend/src/lib/types.ts frontend/src/lib/api.ts frontend/package.json`

---

### Task 4: Админ — харьяаллын сонголт

**Files:**
- Create: `frontend/src/components/admin/about/DepartmentLeaderSelect.tsx`
- Modify: `frontend/src/components/admin/about/LeaderDialog.tsx`, `LeaderList.tsx`, `DepartmentList.tsx`, `frontend/src/app/admin/(dashboard)/about/leaders/page.tsx`, `.../departments/page.tsx`

**Interfaces:**
- Consumes: Task 3-ын `descendantIds`, `api.about.departments.setLeader`, `AboutLeader.parent_id`, `AboutDepartment.leader_id`.
- Produces: `LeaderDialog` шинэ prop `leaders: AboutLeader[]`; `LeaderList` шинэ prop `departments: AboutDepartment[]`; `DepartmentLeaderSelect({ department, leaders, onChanged }: { department: AboutDepartment; leaders: AboutLeader[]; onChanged: () => void })`.

- [ ] **Step 1: LeaderDialog** — "Түвшин"-ий дараа `Field label="Харьяалагдах дээд албан тушаалтан" error={errors.parent_id}` + `Select`: эхний сонголт `— Хамгийн дээд (харьяалалгүй)` (value `""`), дараа нь `leaders` (`${нэр} — ${албан тушаал}`), засах үед өөрийг нь ба `descendantIds(leaders, leader.id)`-г хасна. Шинэ гишүүнд анхдагч: `defaultLevel - 1` түвшний эхний гишүүн байвал тэр, үгүй бол харьяалалгүй. `parent_id`-г create/update body-д илгээнэ.
- [ ] **Step 2: LeaderList** — мөр бүрийн албан тушаалын доор `→ {эцгийн нэр}` эсвэл `Хамгийн дээд` (`text-xs text-slate-500`). `remove` confirm: `«{нэр}» гишүүнийг устгах уу?` + хүүхэд/тэнхим байвал ` {N} гишүүн, {M} тэнхим харьяалалгүй болно.` (тоо 0 бол тухайн хэсгийг орхино).
- [ ] **Step 3: Leaders page** — `api.about.departments.list()`-г мөн `useFetch`-ээр ачаалж `LeaderList`-д; `LeaderDialog`-д `leaders`. Тайлбар текстийг "Харьяаллаар олон нийтийн хуудсанд бүтцийн диаграм болж гарна." болгоно.
- [ ] **Step 4: DepartmentLeaderSelect + departments page** — баруун баганад `TeacherTable`-ийн дээр жижиг `Card`: `Field label="Харьяалагдах удирдлага"` + `Select` (`— Харьяалалгүй (диаграмд гарахгүй)` + гишүүд); сонгоход шууд `setLeader` → `onChanged`; алдааг Card дотор. Page `api.about.leaders.list()`-г ачаална. `DepartmentList` мөрөнд `leader_id == null` бол `диаграмд гарахгүй` жижиг саарал тэмдэг.
- [ ] **Step 5: Шалгалт** — `tsc`, `eslint` 0 problems. Браузер (`/admin/about/leaders`, `/admin/about/departments`, dev servers `preview_start backend/frontend`; нэвтрэх эрх — локал туршилтын superuser, controller өгнө): гишүүний харьяалал солиход жагсаалтад `→ ...` шинэчлэгдэнэ; өөрийнх нь доод гишүүн dropdown-д гарахгүй; тэнхимийн харьяалал сонгоход тэмдэг алга болно.
- [ ] **Step 6: Stage** — `git add "frontend/src/components/admin/about" "frontend/src/app/admin/(dashboard)/about"`

---

### Task 5: Нийтийн байгууллагын бүтцийн диаграм

**Files:**
- Create: `frontend/src/components/about/OrgChart.tsx`, `frontend/src/components/about/OrgCards.tsx`
- Modify: `frontend/src/lib/i18n/mn.ts`, `frontend/src/lib/i18n/en.ts`, `"frontend/src/app/[lang]/(site)/about/page.tsx"`, `frontend/src/components/home/ProgramCard.tsx` (зөвхөн `LeadershipChart` дурдсан тайлбарыг шинэчлэх)
- Delete: `frontend/src/components/about/LeadershipChart.tsx`

**Interfaces:**
- Consumes: Task 3-ын `buildOrgTree`, `OrgNode`.
- Produces: `export function OrgChart({ leaders, departments }: { leaders: AboutLeader[]; departments: AboutDepartment[] })` ("use client"); `OrgCards.tsx`: `LeaderCard({ leader, root }: { leader: AboutLeader; root: boolean })`, `DepartmentCard({ department }: { department: AboutDepartment })`.
- Толь бичиг (`about`), `teamTitle/teamLead/teamAria`-г хасаж нэмнэ (үгчлэн):
  - mn: `orgTitle: "Байгууллагын бүтэц"`, `orgLead: "Сургуулийн удирдлага, тэнхимүүд хэн хэнд харьяалагддаг вэ."`, `orgAria: "Байгууллагын бүтцийн диаграм"`, `orgTeachers: (n: number) => \`${n} багш\``, `orgShowTeachers: "Багш нарыг харах"`, `orgHideTeachers: "Хураах"`
  - en: `orgTitle: "Organisation structure"`, `orgLead: "How the school's leadership and departments are organised."`, `orgAria: "Organisation chart"`, `orgTeachers: (n: number) => \`${n} ${n === 1 ? "teacher" : "teachers"}\``, `orgShowTeachers: "Show teachers"`, `orgHideTeachers: "Hide"`
  - Одоо байгаа `head`, `teachersSoon`-г дахин ашиглана.

- [ ] **Step 1: Карт** (`OrgCards.tsx`) — LeaderCard: зураг (`next/image` `unoptimized`; байхгүй бол navy дээр gold эхний үсэг), нэр, албан тушаал; `root` бол арай том. DepartmentCard: зураггүй өөр төрх, нэр, эрхлэгч(ид) (`is_head`), `orgTeachers(n)`; багштай бол `button` (`aria-expanded`, `aria-controls`, текст `orgShowTeachers`/`orgHideTeachers`) → багшийн жагсаалт (нэр, role, эрхлэгчид `head` тэмдэг) GSAP-аар height/opacity нээгдэж хаагдана (reduced motion → шууд); багшгүй бол `teachersSoon`. Урт текст `break-words`, картаас гарахгүй.
- [ ] **Step 2: Мод** (`OrgChart.tsx`) — `buildOrgTree` → салаа `ul > li` (`aria-labelledby` гарчиг, `aria-label={orgAria}` жагсаалтад); холбох шугам — **бодит `span aria-hidden`** (pseudo element-ийг GSAP хөдөлгөж чадахгүй), `data-org-line` + `data-depth`; карт `data-org-card` + `data-depth`. `md+`: хэвтээ мод (эцэг дээр, хүүхдүүд доор мөрөнд; доошоо босоо шугам, хүүхдүүдийн дээр хэвтээ салаа, хүүхэд бүрт босоо шугам), гишүүдийн дараа тэнхимүүд. `md`-ээс нарийн: босоо догол мод (хүүхэд эцгийнхээ доор зүүн босоо шугамтай, бүтэн өргөн). Нэг DOM, responsive классаар. Гадна контейнер `overflow-x-auto`, багтвал голлуулна (`w-max mx-auto` загвар). Хэсгийн дэвсгэр/гарчиг хуучин `LeadershipChart`-ын хэсгийн байрлалд (`bg-paper-2`, голлуулсан гарчиг `font-display text-navy`).
- [ ] **Step 3: Хөдөлгөөн** — `useGSAP` (scope = root ref); `reduceMotion()` бол юу ч хийхгүй. Эс бөгөөс картууд/шугамуудыг `gsap.set`-ээр нууна (CSS-ээр биш — JS ажиллахгүй бол харагдана), `IntersectionObserver` (Reveal-ийн загвар: аль хэдийн дэлгэцэнд байвал шууд) нэг удаа timeline: depth 0 карт → depth бүрт: тухайн түвшний шугамууд (`scaleY` дээрээс, хэвтээ салаа `scaleX` голоос) → дараагийн түвшний картууд stagger (`autoAlpha`, `y`). Нийт ~2 сек. Cleanup: observer disconnect (useGSAP context revert автоматаар).
- [ ] **Step 4: Хуудас** — `about/page.tsx`: `LeadershipChart`-ын оронд `<OrgChart leaders={data.leaders} departments={data.departments} />` (`data &&`); `LeadershipChart.tsx` устгана; `ProgramCard.tsx` тайлбар дахь дурдлагыг ("LeadershipChart-тай ижил") засна. Толь бичиг (Interfaces).
- [ ] **Step 5: Шалгалт** — `tsc`, `eslint`, `npm test` 0 problems. Dev DB-д туршихын тулд нэг тэнхимд `leader_id` админаас (Task 4) тохируулна. Браузер `/about` ба `/en/about`:
  - 1280px: мод хэвтээ, шугам холбогдсон; 375px (`resize_window mobile`): босоо догол мод.
  - Хоёр өргөнд `document.documentElement.scrollWidth <= window.innerWidth` (Review Focus 4); 6+ доод гишүүнтэй түр өгөгдлөөр (админаас нэмээд дараа нь устгана) зөвхөн диаграмын контейнер гүйнэ.
  - Анимаци дууссаны дараа бүх `[data-org-card]` computed `opacity === "1"`; хуудсыг диаграм дээр scroll хийсэн байрлалд дахин ачаалахад ч мөн (Review Focus 5). Reduced motion: браузерт эмуляц хийх боломжгүй бол `reduceMotion()` true үед `gsap.set` дуудагдахгүй (карт хэзээ ч нуугдахгүй) гэдгийг кодоор баталгаажуулж тайланд бичнэ.
  - Тэнхимийн товч нээх/хаах, `aria-expanded` солигдох; console алдаагүй.
  - Screenshot (desktop + mobile).
- [ ] **Step 6: Stage** — `git add frontend/src/components/about "frontend/src/app/[lang]/(site)/about/page.tsx" frontend/src/lib/i18n frontend/src/components/home/ProgramCard.tsx` (устгасан файлыг `git add -A frontend/src/components/about`).

---

## Дуусгах

Бүх task-ийн дараа: backend бүх тест, frontend tsc/eslint/npm test, `/about` браузер шалгалт. Production-д гаргахдаа (хэрэглэгч commit/push гэж хэлсэн үед): эхлээд `docker compose -f .server/docker-compose.yml up -d --build` (migration 0023 автоматаар), дараа нь push. Frontend шинэ талбаргүй API-д ч ажиллана (Task 3 тест).
