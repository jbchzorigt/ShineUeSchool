# "Бидний тухай" хуудас — дизайн

Огноо: 2026-09-23. Төлөв: батлагдсан, хэрэгжүүлэх төлөвлөгөө бичих шатанд. Суурь загварууд: олимпиадын хуудасны тохиргоо (`backend/app/olympiad/models.py` `OlympiadPage`, `/admin/olympiad/settings`), дугуйлангийн CRUD + зураг + дараалал (`backend/app/clubs/`, `frontend/src/components/admin/clubs/`).

## 1. Зорилго

Олон нийтийн `/about` хуудас: сургуулийн танилцуулга, тоон үзүүлэлт, **удирдлагын шатлалтай бүтэц** (зураг, нэр, албан тушаал), **тэнхимүүд** (эрхлэгч тодруулсан багш нарын нэрс, хичээл/албан тушаал), сургуулийн түүх. Бүх мэдээллийг (түүхээс бусад) менежер `/admin/about`-аас удирдана.

Хамрахгүй: түүхийн timeline-ийг admin-аас засах (нүүрийн статик `HISTORY` дахин ашиглагдана); багш нарын зураг, хувийн хуудас; хуваарийн модулийн багш нартай холбох; хайлт.

Эрх: `manager` (Сургалтын менежер) ба superuser. Ажлын журам: commit, push хийхгүй; `git add`-аар дуусгана.

## 2. Өгөгдлийн загвар

Backend модуль `backend/app/about/` (`models.py`, `schemas.py`, `router_public.py`, `router_admin.py`). Migration `0010_about.py`. `models_all.py`-д импорт нэмнэ. Хүснэгтийн нэр `about_` угтвартай (хуваарийн модульд `teachers` хүснэгт аль хэдийн бий).

| Хүснэгт | Баганууд |
|---|---|
| `about_page` | `id` (үргэлж 1), `intro_title` String(160) default "Шинэ Үе сургууль", `intro_html` Text default "", `stats` JSONB default `[]` (`[{value: str ≤20, label: str ≤60}]`, 0–4), `updated_at` DateTime(tz) |
| `about_leaders` | `id`, `full_name` String(120), `position` String(160), `level` SmallInteger (1–10; admin-аас түвшин нэмнэ, 3-аас дээш түвшин хуудсанд жижиг картаар), `order` SmallInteger default 0, `photo` String(255) nullable (`about/<uuid>.jpg`) |
| `about_departments` | `id`, `name` String(120), `order` SmallInteger default 0 |
| `about_teachers` | `id`, `department_id` FK → about_departments (ondelete CASCADE), `full_name` String(120), `role` String(120) default "", `is_head` Boolean default false, `order` SmallInteger default 0 |

Эрэмбэ:
- удирдлага: `level`, `order`, `id`;
- тэнхим: `order`, `id`;
- багш: `is_head DESC`, `order`, `id` (эрхлэгчид үргэлж эхэнд).

`intro_html` хадгалахын өмнө `app.news.sanitize.clean_html`-ээр цэвэрлэнэ. Зураг `save_upload(upload, "about", "photo")` (JPG/PNG/WebP, 10 MB хүртэл); солиход, устгахад хуучин файлыг `delete_file`-аар устгана.

## 3. API

### Олон нийт (нэвтрэлтгүй)

`GET /api/about/` →
```json
{
  "page": {"intro_title": "...", "intro_html": "...", "stats": [{"value": "1200+", "label": "Суралцагчид"}]},
  "leaders": [{"id": 1, "full_name": "...", "position": "Захирал", "level": 1, "photo": "https://.../media/about/x.jpg"}],
  "departments": [{"id": 1, "name": "Математикийн тэнхим",
                   "teachers": [{"id": 3, "full_name": "...", "role": "Математикийн багш", "is_head": true}]}]
}
```
Тохиргооны мөр байхгүй бол анхдагч утгаар үүсгэж буцаана (`get_page` — олимпиадынхтай ижил). Зургийн URL `media_url`-аар бүрэн хаяг (`MEDIA_BASE_URL` эсвэл `request.base_url`).

### Менежер (`require_role("manager")`, prefix `/api/about/admin`)

| Method | Path | Body / Тайлбар |
|---|---|---|
| GET | `/page/` | `PageOut` |
| PATCH | `/page/` | `PagePatch {intro_title?, intro_html?, stats?}` |
| GET | `/leaders/` | `[LeaderOut]` (эрэмбэлсэн; `photo` бүрэн URL) |
| POST | `/leaders/` | multipart: `full_name`, `position`, `level`, `photo?` (файл) → `LeaderOut` |
| PATCH | `/leaders/{id}/` | JSON `LeaderPatch {full_name?, position?, level?}`; `level` солиход `order` = тухайн түвшний сүүлийн + 1 |
| DELETE | `/leaders/{id}/` | 204; зургийн файл устна |
| POST | `/leaders/{id}/photo/` | multipart `photo` → `LeaderOut`; хуучин файл устна |
| DELETE | `/leaders/{id}/photo/` | `LeaderOut` (photo null) |
| PUT | `/leaders/order/` | `[{id, level, order}]` — бүх гишүүнийг нэг дор; дутуу/илүү id бол 400 `items` |
| GET | `/departments/` | `[DepartmentAdminOut]` (багш нартайгаа) |
| POST | `/departments/` | `{name}` → `DepartmentAdminOut`; `order` = сүүлийн + 1 |
| PATCH | `/departments/{id}/` | `{name?}` |
| DELETE | `/departments/{id}/` | 204; багш нар cascade |
| PUT | `/departments/order/` | `[id, ...]` бүх тэнхимийн id дараалал; зөрвөл 400 `items` |
| POST | `/departments/{id}/teachers/` | `{full_name, role?, is_head?}` → `TeacherOut`; `order` = сүүлийн + 1 |
| PATCH | `/teachers/{id}/` | `{full_name?, role?, is_head?}` |
| DELETE | `/teachers/{id}/` | 204 |
| PUT | `/departments/{id}/teachers/order/` | `[id, ...]` тухайн тэнхимийн бүх багшийн id |

Validation (`FieldError` → 400 `{field: [msg]}`):
- `full_name`, `position`, `name` хоосон биш, trim хийнэ (`"Нэр оруулна уу."` гэх мэт).
- `level` 1–10 биш → `level: "Түвшин 1–10 байна."`.
- `stats` 4-өөс олон, эсвэл `value`/`label` хоосон → `stats`.
- зураг формат/хэмжээ → `photo` (`save_upload`-ын мессеж).
- Олдоогүй id → 404 `"Олдсонгүй."`. Эрхгүй → 403.

## 4. Frontend — олон нийт (`/about`)

Файлууд: `app/(site)/about/page.tsx` (server), `lib/about-api.ts` (`fetchAbout(): Promise<AboutData | null>`, 60 сек revalidate, news-api загвар), `components/about/{IntroSection,LeadershipChart,Departments}.tsx`.

Хуудасны бүтэц (дээрээс доош, бүгд `Reveal`-тэй):
1. **Танилцуулга** — navy дэвсгэр, `intro_title` display гарчиг (30/42px), `intro_html` `news-body` загвараар цагаан текст. Доор нь **үзүүлэлт**: `stats` картууд (нүүрийн `Advantages` stat картын хэв маяг, icon-гүй: том тоо + шошго), desktop 4 багана, утсанд 2. `stats` хоосон бол мөр гарахгүй; `intro_html` хоосон бол зөвхөн гарчиг.
2. **Удирдлагын бүтэц** — гарчиг "Удирдлага". Түвшин бүр нэг мөр, голд зэрэгцүүлсэн: 1-р түвшин том карт (зураг 160px тойрог, нэр 22px, албан тушаал), 2-р түвшин дунд (120px), 3-р түвшин жижиг (96px). Desktop-д мөр хооронд 1px `border-line` босоо холбогч (org chart мэдрэмж); утсанд холбогчгүй, мөр бүр 2 баганат grid. Зураггүй бол navy тойрогт нэрийн эхний үсэг. Карт `Reveal` stagger (0.08s). Гишүүнгүй бол хэсэг бүхэлдээ нуугдана.
3. **Тэнхимүүд** — гарчиг "Тэнхимүүд". Тэнхим бүр цагаан карт (`border-line`, `rounded-xl`, p-6): нэр (20px, navy), доор нь багш нарын жагсаалт: эрхлэгч мөр — нэр bold + шар (`bg-gold/20 text-ink`) "Эрхлэгч" badge; бусад — нэр + `role` саарал жижиг (хоосон бол зөвхөн нэр). Desktop 2 багана, утсанд 1. Тэнхимгүй бол хэсэг нуугдана.
4. **Түүх** — `HistoryTimeline` (нүүрийнх) өөрчлөлтгүй.
5. `SiteFooter`.

`fetchAbout()` null (backend унасан) бол зөвхөн гарчиг "Бидний тухай" + түүх + хөл харагдана.

Metadata: title "Бидний тухай — Шинэ Үе сургууль"; description = `intro_html`-ийн tag хуулсан эхний 160 тэмдэгт (хоосон бол "Шинэ Үе сургуулийн удирдлага, тэнхим, багш нар").

Nav: `NAV_LINKS`-д `{ href: "/about", label: "Бидний тухай" }` Нүүрийн дараа; `SiteFooter` LINKS-д мөн эхэнд. Desktop nav `gap-5 xl:gap-8` 5 холбоостой багтахыг шалгаж, шаардлагатай бол `lg:gap-4`.

## 5. Frontend — менежер (`/admin/about`)

Sidebar `NAV` (`app/admin/(dashboard)/layout.tsx`): `{ href: "/admin/about", label: "Бидний тухай", icon: "◈", role: "manager" }` дугуйлангийн дараа. `app/admin/(dashboard)/about/layout.tsx` олимпиадын layout шиг tab: Танилцуулга (`/admin/about`, exact) · Удирдлага (`/admin/about/leaders`) · Тэнхим (`/admin/about/departments`).

Төрлүүд (`lib/types.ts`, `About` угтвартай — хуваарийн `Teacher` төрөлтэй зөрчилдөхгүй): `AboutStat {value, label}`, `AboutPage {intro_title, intro_html, stats}`, `AboutPageInput = AboutPage`, `AboutLeader {id, full_name, position, level, photo}`, `AboutLeaderInput {full_name, position, level}`, `AboutTeacher {id, full_name, role, is_head}`, `AboutTeacherInput {full_name, role, is_head}`, `AboutDepartment {id, name, teachers}`, `AboutData {page, leaders, departments}`.

`lib/api.ts` `api.about`: `page.get/update`, `leaders.list/create(FormData)/update/remove/setPhoto/removePhoto/reorder`, `departments.list/create/update/remove/reorder`, `teachers.create(deptId)/update/remove/reorder(deptId)`.

Хуудсууд (`components/admin/about/`):
- **Танилцуулга** `page.tsx`: `useFetch(api.about.page.get)`, форм: гарчиг `Input`, `RichText` (мэдээний editor), үзүүлэлт: мөр бүр `value` + `label` Input, "Мөр нэмэх" (4 хүртэл), устгах icon. "Хадгалах" → PATCH; амжилтад "Хадгалагдлаа" 2 сек; алдаа талбар доор.
- **Удирдлага** `leaders/page.tsx` + `LeaderList.tsx`, `LeaderDialog.tsx`: 3 блок ("1-р түвшин", "2-р", "3-р"), блок толгойд "Гишүүн нэмэх". Мөр: 40px тойрог зураг (эсвэл үсэг), нэр, албан тушаал, ▲▼ (эхний/сүүлийнд идэвхгүй), ✎, 🗑 (confirm). ▲▼ → local дараалал солиод бүх жагсаалтыг `reorder`. Dialog: нэр, албан тушаал, түвшин `Select`, зураг file input + preview, засах үед "Зураг устгах". Үүсгэх: multipart нэг хүсэлт; засах: PATCH + (зураг сонгосон бол) `setPhoto`.
- **Тэнхим** `departments/page.tsx` + `DepartmentList.tsx`, `TeacherTable.tsx`: зүүн 1/3 тэнхимийн жагсаалт (сонгосон нь navy тодруулгатай; inline нэр засах ✎; ▲▼; 🗑 confirm "Тэнхим болон N багшийг устгах уу?"), доор "Тэнхим нэмэх" inline Input. Баруун 2/3 сонгосон тэнхимийн багш нар хүснэгт: Нэр · Хичээл/албан тушаал · Эрхлэгч (checkbox, шууд PATCH) · ▲▼ · ✎ (inline засах) · 🗑. Доор "Багш нэмэх" inline мөр (нэр, role, эрхлэгч checkbox, Нэмэх). Утсанд дээр доороо. Тэнхимгүй бол "Тэнхим нэмнэ үү" хоосон төлөв.

Бүх мутацийн дараа жагсаалтыг дахин татна (`useFetch` refetch). Алдаа `ApiError.fieldErrors` → талбарын доор, бусад → мөрийн дээр улаан текст.

## 6. Тест

Backend (`tests/test_about_public.py`, `tests/test_about_admin.py`, ~14 тест):
- public GET: анхдагч мөр үүснэ; удирдлага түвшин/дараалал, тэнхим дараалал, эрхлэгч эхэнд; зургийн URL бүрэн.
- page PATCH: `intro_html` цэвэрлэгдэнэ (`<script>` устна); stats 5 мөр → 400 `stats`.
- leader: create (multipart, зурагтай/зураггүй), level 4 → 400, PATCH level солиход order сүүлд, photo set/remove (файл үүсэх/устах, `MEDIA_DIR` tmp), delete → файл устна, reorder (дутуу id → 400).
- department/teacher: create/patch/delete cascade, reorder, өөр тэнхимийн багшийн id-тэй reorder → 400.
- эрх: news эрхтэй хэрэглэгч → 403.

Frontend: `tsc`, `eslint`; browser: `/about` desktop + 375px (зурагтай/зураггүй гишүүн, эрхлэгч badge), admin бүтэн урсгал: тэнхим + багш нэмэх, гишүүн зурагтай нэмэх, дараалал солих → `/about` дээр тусгагдах. README-д "Бидний тухай" хэсэг (API, admin).
