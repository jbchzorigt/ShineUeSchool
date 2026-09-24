# Хөтөлбөрүүд (IBDP, Cambridge …) — дизайн

Огноо: 2026-09-24. Төлөв: батлагдсан, хэрэгжүүлэх төлөвлөгөө бичих шатанд. Суурь загварууд: дугуйлан (`backend/app/clubs/` CRUD + зураг + дараалал, `components/admin/clubs/`), "Бидний тухай" (`backend/app/about/`, `components/admin/about/`, `useFetch` reload хэв маяг), мэдээний rich text (`components/admin/RichText.tsx`, `app/news/sanitize.clean_html`, `app/news/slug.slugify`).

## 1. Зорилго

Нүүр хуудасны "Шинэ Үе сургуулийн давуу тал" (үзүүлэлт + 3 карт) ба "Олон улсын хөтөлбөрүүдийн лого тууз" хэсгүүдийг **арилгаж**, оронд нь **"Хөтөлбөрүүд"** хэсэг: хөтөлбөр бүр reference загварын карт (cover зураг, badge, гарчиг, summary, "Дэлгэрэнгүй →"). Хөтөлбөр бүр өөрийн хуудастай (`/programs/[slug]`): хэрэгжилтийн тайлбар, аль ангиас эхэлж ордог, **сурагчдын бүтээлийн булан** (зураг + гарчиг + сурагчийн нэр), **тэтгэлэгт хамрагдсан сурагчид** (нэр, зураг, их сургууль, төгссөн он, дүн USD, нийт дүн). Бүгдийг менежер `/admin/programs`-аас удирдана; хөтөлбөр хязгааргүй нэмнэ.

Хамрахгүй: header nav-д холбоос (нүүрний картаас орно); хөтөлбөрийн хуудсан дээрх мэдээ/сэтгэгдэл; тэтгэлгийн валют USD-ээс өөр; хайлт.

Эрх: `manager` ба superuser. Ажлын журам: commit, push хийхгүй; `git add`-аар дуусгана.

## 2. Өгөгдлийн загвар

Backend модуль `backend/app/programs/` (`models.py`, `schemas.py`, `service.py`, `router_public.py`, `router_admin.py`). Migration `0011_programs.py`. `models_all.py`-д импорт.

| Хүснэгт | Баганууд |
|---|---|
| `programs` | `id`; `slug` String(200) unique (нэрээс `slugify`, давхардвал `-2`, `-3`; `news/slug.unique_slug`-тай ижил логик, Program моделиор); `name` String(120); `badge` String(40) (картын tag, ж: "IBDP", "Cambridge"); `summary` String(280) default ""; `cover_image` String(255) nullable (`programs/<uuid>.jpg`); `grade_from` SmallInteger; `grade_to` SmallInteger; `body_html` Text default ""; `order` SmallInteger default 0; `is_published` Boolean default true; `created_at`, `updated_at` |
| `program_works` | `id`; `program_id` FK → programs (ondelete CASCADE, index); `image` String(255) (заавал); `title` String(160); `student` String(120) default "" (нэр/анги, ж: "Б.Ану, 11а"); `caption` String(280) default ""; `order` SmallInteger default 0 |
| `program_scholarships` | `id`; `program_id` FK → programs (ondelete CASCADE, index); `student_name` String(120); `photo` String(255) nullable; `university` String(160) default ""; `year` SmallInteger; `amount_usd` Integer; `order` SmallInteger default 0 |

Relationship: `Program.works` (selectin, `order, id`, cascade delete-orphan), `Program.scholarships` (selectin, `year DESC, order, id`, cascade delete-orphan). Эрэмбэ: хөтөлбөр `order, id`.

Зураг: `save_upload(upload, "programs", field)` (`field` = "image" бүтээл/cover, "photo" тэтгэлэг); солиход/устгахад `delete_file`. Хөтөлбөр устгахад cover + бүх бүтээл/тэтгэлгийн файлууд устна. `body_html` хадгалахын өмнө `clean_html`.

## 3. API

### Олон нийт (нэвтрэлтгүй, зөвхөн `is_published`)

- `GET /api/programs/` → `[ProgramCard]`: `{id, slug, name, badge, summary, cover_image (бүрэн URL | null), grade_from, grade_to}` `order, id`-оор.
- `GET /api/programs/{slug}/` → `ProgramDetail` = `ProgramCard` + `body_html`, `works: [{id, image, title, student, caption}]`, `scholarships: [{id, student_name, photo, university, year, amount_usd}]`, `scholarship_total_usd` (нийлбэр), `scholarship_count`. Нийтлэгдээгүй/олдохгүй → 404 `"Олдсонгүй."`.

### Менежер (`require_role("manager")`, prefix `/api/programs/admin`)

| Method | Path | Body / Тайлбар |
|---|---|---|
| GET | `/programs/` | `[ProgramAdmin]` = `ProgramCard` + `body_html, is_published, order, works_count, scholarships_count` (нийтлэгдээгүйг оруулаад) |
| POST | `/programs/` | JSON `ProgramIn {name, badge, summary?, grade_from, grade_to, body_html?, is_published?}` → 201; slug автомат; `order` = сүүлийн + 1 |
| GET | `/programs/{id}/` | `ProgramAdminDetail` = `ProgramAdmin` + `works`, `scholarships` |
| PATCH | `/programs/{id}/` | `ProgramPatch` (бүх талбар optional; `name` солиход slug өөрчлөгдөхгүй) |
| DELETE | `/programs/{id}/` | 204; бүх файл устна |
| PUT | `/programs/order/` | `{ids}` бүх хөтөлбөрийн id, зөрвөл 400 `ids` |
| POST | `/programs/{id}/cover/` | multipart `image` → `ProgramAdmin`; хуучин файл устна |
| DELETE | `/programs/{id}/cover/` | `ProgramAdmin` |
| POST | `/programs/{id}/works/` | multipart `image` (заавал), `title`, `student?`, `caption?` → 201 `WorkOut`; `order` = сүүлийн + 1 |
| PATCH | `/works/{id}/` | JSON `{title?, student?, caption?}` |
| POST | `/works/{id}/image/` | multipart `image` → `WorkOut`; хуучин устна |
| DELETE | `/works/{id}/` | 204; файл устна |
| PUT | `/programs/{id}/works/order/` | `{ids}` тухайн хөтөлбөрийн бүх бүтээлийн id |
| POST | `/programs/{id}/scholarships/` | JSON `ScholarshipIn {student_name, university?, year, amount_usd}` → 201 |
| PATCH | `/scholarships/{id}/` | бүх талбар optional |
| DELETE | `/scholarships/{id}/` | 204; зураг устна |
| POST | `/scholarships/{id}/photo/` | multipart `photo` |
| DELETE | `/scholarships/{id}/photo/` | зураг устгана |
| PUT | `/programs/{id}/scholarships/order/` | `{ids}` тухайн хөтөлбөрийн бүх тэтгэлгийн id (нэг оны дотор дараалал) |
| POST | `/upload-image/` | multipart `image` → `{url}` (rich text дундах зураг, `programs/body/`) |

Validation (`FieldError` → 400 `{field: [msg]}`): `name`, `badge`, `title`, `student_name` trim, хоосон биш (`"Нэр оруулна уу."`, `"Badge оруулна уу."`, `"Гарчиг оруулна уу."`); `grade_from`, `grade_to` 1–12, `grade_from ≤ grade_to` → `grade_to: "Төгсөх анги эхлэх ангиас бага байж болохгүй."`; `year` 2000–2100 → `year: "Он 2000–2100 байна."`; `amount_usd` ≥ 0 → `amount_usd: "Дүн сөрөг байж болохгүй."`; бүтээлд зураг байхгүй → `image: "Зураг оруулна уу."`; зургийн формат/хэмжээ → `save_upload`-ын мессеж; 404 `"Олдсонгүй."`; эрхгүй 403.

## 4. Frontend — нүүр ба хөтөлбөрийн хуудас

Устгах: `components/home/Advantages.tsx`, `components/home/ProgramLogos.tsx`, `home-data.ts`-ийн `STATS`, `ADVANTAGES`, `PROGRAM_LOGOS`, `IconName`, `Stat`, `Advantage`, `ProgramLogo` (өөр газар ашиглагдаагүйг шалгана). Хэрэв `Advantages`-ийн `Icon` компонентыг өөр газар ашигладаггүй бол хамт устгана.

`lib/programs-api.ts` (server, 60 сек revalidate, news-api загвар): `fetchPrograms(): Promise<ProgramCard[] | null>`, `fetchProgram(slug): Promise<ProgramDetail | null>`.

**Нүүр** (`app/(site)/page.tsx`): Hero → `<ProgramsSection programs={...}/>` → NewsSection → HistoryTimeline → LocationSection. `components/home/ProgramsSection.tsx` (server, `section#programs`, `bg-paper-2`):
- Гарчиг "Хөтөлбөрүүд" (display 32/44px navy), дэд текст "Олон улсын хөтөлбөрөөр сургалт явуулдаг".
- Карт (`ProgramCard.tsx`): `rounded-2xl border border-line bg-white overflow-hidden`, hover `-translate-y-1 shadow-md`; дээр cover (`aspect-[16/10]`, `object-cover`; зураггүй бол navy дэвсгэр дээр badge текст том цагаанаар); доор голлосон `p-6`: badge pill (`bg-navy/10 text-navy text-xs font-semibold rounded-full px-2.5 py-1`, өмнө нь жижиг ★ icon), гарчиг `name` (font-display 22/26px), `summary` (muted), "Дэлгэрэнгүй →" (navy товч, `Link` → `/programs/[slug]`). Карт бүхэлдээ `Link` биш — товч л холбоос (гарчиг ч холбоос).
- Grid: 1 багана утсанд, `md:grid-cols-2`, 3+ хөтөлбөр бол `lg:grid-cols-3`. `Reveal stagger`. Хөтөлбөргүй (эсвэл backend null) бол хэсэг render хийгдэхгүй.

**Хөтөлбөрийн хуудас** `app/(site)/programs/[slug]/page.tsx` (server; `fetchProgram` null → `notFound()`; `generateMetadata`: title `"{name} — Шинэ Үе сургууль"`, description `summary`, OG image cover):
1. **Толгой** `components/programs/ProgramHero.tsx`: cover бүтэн өргөнөөр (240px / lg 440px, `rounded-xl`, зураггүй бол navy блок), дээр нь (доод зүүн, gradient дэвсгэр) badge pill, нэр (30/42px цагаан), summary. Дээр "← Нүүр" холбоос.
2. **Мэдээллийн мөр** `ProgramFacts.tsx`: 3 карт (утсанд 1 багана): "Хэрэгжих анги" → `"{grade_from}–{grade_to}-р анги"` (ижил бол `"{n}-р анги"`); "Бүтээл" → тоо; "Тэтгэлэг" → `"$1,250,000"` + `"{n} сурагч"` (тэтгэлэггүй бол карт нуугдана).
3. **Хэрэгжилт**: гарчиг "Хөтөлбөрийн хэрэгжилт", `body_html` `news-body`; хоосон бол хэсэг нуугдана.
4. **Бүтээлийн булан** `WorksGallery.tsx` (client): гарчиг "Сурагчдын бүтээлийн булан", grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`; карт: зураг (`aspect-square object-cover rounded-xl`), доор `title` (semibold), `student` (muted, жижиг). Дарахад `<dialog>` lightbox (`components/news/Gallery.tsx`-ийн бүтцээр: зураг, гарчиг, сурагч, caption, ←/→, Esc). Бүтээлгүй бол нуугдана.
5. **Тэтгэлэг** `Scholarships.tsx`: гарчиг "Тэтгэлэгт хамрагдсан сурагчид"; толгой карт navy дэвсгэр: нийт дүн `$X` (шар, display 36/48px), "нийт тэтгэлэг · N сурагч". Доор оноор бүлэглэсэн (шинэ эхэнд), он бүр дэд гарчиг; мөр: зураг тойрог 48px (эсвэл эхний үсэг navy), `student_name` (semibold), `university` (muted), баруун талд `amount_usd` `$` форматтай (`Intl.NumberFormat("en-US")`, semibold navy). Desktop-д хүснэгт хэлбэр (`divide-y`), утсанд ижил мөр багасаж. Тэтгэлэггүй бол нуугдана.
6. `SiteFooter`. Бүх хэсэг `Reveal`.

`lib/types.ts`: `ProgramCard {id, slug, name, badge, summary, cover_image, grade_from, grade_to}`, `ProgramWork {id, image, title, student, caption}`, `Scholarship {id, student_name, photo, university, year, amount_usd}`, `ProgramDetail extends ProgramCard {body_html, works, scholarships, scholarship_total_usd, scholarship_count}`, `ProgramAdmin extends ProgramCard {body_html, is_published, order, works_count, scholarships_count}`, `ProgramAdminDetail extends ProgramAdmin {works, scholarships}`, `ProgramInput {name, badge, summary, grade_from, grade_to, body_html, is_published}`, `WorkInput {title, student, caption}`, `ScholarshipInput {student_name, university, year, amount_usd}`.

`lib/api.ts` `api.programs`: `list/get(id)/create/update/remove/reorder/setCover/removeCover/uploadImage`, `works.create(programId, fd)/update/setImage/remove/reorder(programId, ids)`, `scholarships.create(programId, d)/update/remove/setPhoto/removePhoto/reorder(programId, ids)`.

## 5. Frontend — менежер (`/admin/programs`)

Sidebar `NAV`: `{ href: "/admin/programs", label: "Хөтөлбөр", icon: "◆", role: "manager" }` Бидний тухайн дараа.

**Жагсаалт** `app/admin/(dashboard)/programs/page.tsx` + `components/admin/programs/ProgramTable.tsx`, `ProgramForm.tsx`:
- Хүснэгт: ▲▼ (`reorder` бүх id), cover thumbnail 64×40 (зураггүй бол navy), нэр + badge pill + slug (жижиг muted), анги "11–12", бүтээл/тэтгэлгийн тоо, `Badge` "Нийтлээгүй" (`is_published` false), үйлдэл ✎ (форм), ☷ (`/admin/programs/[id]`), 🗑 confirm `«name» хөтөлбөр, N бүтээл, N тэтгэлгийн бичлэгийг устгах уу?`. Дээр "Хөтөлбөр нэмэх". Хоосон төлөв "Хөтөлбөр нэмнэ үү."
- Форм (Modal, `max-w-2xl`): нэр, badge, summary (Textarea, `maxLength 280`, тоолуур), эхлэх/төгсөх анги (2 `Select` 1–12, анхдагч 11–12), "Нүүр хуудсанд харуулах" checkbox, cover зураг (preview, засах үед "Зураг устгах"), хэрэгжилт `RichText` (`onUploadImage` → `api.programs.uploadImage`). Засах үед slug зөвхөн уншигдана. Хадгалах: create/update → cover файл сонгосон бол `setCover`. Алдаа талбарын доор.
- Жагсаалт state-д хадгалагдана (`useFetch` reload үед `data` undefined болохыг нөхөх хэв маяг: `about/leaders/page.tsx`).

**Дэлгэрэнгүй** `app/admin/(dashboard)/programs/[id]/page.tsx`: толгой (нэр, badge, `/programs/[slug]` руу "Хуудсыг харах" холбоос, "← Хөтөлбөрүүд"); tab (URL `?tab=works|scholarships`, анхдагч works): 
- **Бүтээлийн булан** `WorksPanel.tsx`: grid карт (зураг, гарчиг, сурагч), ▲▼, ✎ inline (гарчиг, сурагч, тайлбар Input-ууд, OK/✕), "Зураг солих" file input, 🗑 confirm. "Бүтээл нэмэх" Modal `WorkDialog.tsx`: зураг (заавал, preview), гарчиг, сурагч, тайлбар → multipart нэг хүсэлт.
- **Тэтгэлэг** `ScholarshipsPanel.tsx`: хүснэгт ▲▼, зураг тойрог 40px, нэр, их сургууль, он, дүн (`$` формат), ✎ inline (нэр, их сургууль, он, дүн), зураг солих/устгах, 🗑 confirm; хүснэгтийн доор "Нийт: $X · N сурагч". "Тэтгэлэг нэмэх" Modal `ScholarshipDialog.tsx`: нэр, их сургууль, он (number, анхдагч энэ он), дүн USD (number ≥ 0), зураг (сонголттой) → JSON create, дараа зурагтай бол `setPhoto`.
- Мутаци бүрийн дараа refetch; `key`-ээр Modal шинэчлэгдэнэ; алдаа `ApiError.fieldErrors`.

## 6. Тест ба шалгалт

Backend `tests/test_programs_public.py`, `tests/test_programs_admin.py` (~14 тест):
- public: list зөвхөн нийтлэгдсэн, `order`-оор; detail: works `order`, scholarships `year DESC, order`, `scholarship_total_usd`/`count` зөв; нийтлэгдээгүй slug → 404.
- admin program: create → slug `ib-diploma-programme`, давхардвал `-2`; validation (`grade_from > grade_to`, badge хоосон); PATCH нэр солиход slug хэвээр; cover set/replace/remove (файлууд); reorder (дутуу id → 400); delete → cover + works + scholarship файлууд устна (tmp media dir).
- works: multipart create (зураггүй → 400 `image`), PATCH текст, image replace (хуучин устна), order (өөр хөтөлбөрийн id → 400), delete.
- scholarships: create/validation (year 1999 → 400, amount −1 → 400), photo set/remove, order, delete.
- upload-image manager 201, news-role 403; бүх admin route 401/403.

Frontend: tsc/eslint; browser: нүүр (картууд desktop 2 багана / 375px 1 багана, hover), `/programs/[slug]` бүх 5 хэсэг + lightbox, admin бүтэн урсгал (2 хөтөлбөр үүсгэх → бүтээл 3, тэтгэлэг 2 нэмэх → нүүр/хуудсанд харагдах, нийт дүн зөв). README-д "Хөтөлбөрүүд" хэсэг.
