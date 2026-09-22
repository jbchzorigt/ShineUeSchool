# Дугуйлангийн бүртгэл — дизайн

Огноо: 2026-09-21. Төлөв: батлагдсан, хэрэгжүүлэх төлөвлөгөө бичих шатанд.

## 1. Зорилго ба хамрах хүрээ

Сургалтын менежер 1–12-р ангийн сурагчдад зориулсан дугуйлангуудыг ээлж (улирал) тутамд зарлана. Дугуйлан бүр өөрийн ангиуд, элсэх тоо (багтаамж), тайлбар, зургууд, бүртгэлийн хугацаа, төлбөрийн мэдээлэлтэй. Зөвхөн `@shineue.edu.mn` имэйлтэй сурагч бүртгүүлнэ; имэйлийг 6 оронтой кодоор баталгаажуулна. Нэг имэйл нэг ээлжид нэг л дугуйланд бүртгүүлнэ. Менежер бүртгэлийг хасвал слот суларна. Хугацаа дуусах эсвэл слот дүүрэхэд дугуйлан хаагдана.

Хамрахгүй: онлайн төлбөр (QPay г.м.), сурагч өөрөө бүртгэлээ цуцлах, бүртгэлийн баталгаажуулах имэйл, зэрэг олон ээлж идэвхтэй байх, сурагчийн нэвтрэх бүртгэл.

Ажлын журам: commit, push хийхгүй; local тест дууссаны дараа push.

## 2. Хувилбарын сонголт

Сонгосон: **эхлээд имэйл баталгаажуулж, дараа нь форм**. Код → 15 минутын JWT → форм + token → бүртгэл шууд "баталгаажсан" төлөвтэй үүснэ. Хагас дутуу (pending) бүртгэл хадгалагдахгүй, цэвэрлэгээ хэрэггүй; слотыг зөвхөн бодит бүртгэл эзэлнэ; сүүлийн слотын уралдааныг `SELECT … FOR UPDATE`-аар шийднэ. Татгалзсан: форм → pending → код (төлөв олон, цэвэрлэгээ), сурагчийн account (хэт их).

## 3. Өгөгдлийн загвар

Модуль `backend/app/clubs/` (`models.py`, `schemas.py`, `router_public.py`, `router_admin.py`, `mailer.py`, `service.py`), migration `alembic/versions/0008_clubs.py`.

| Хүснэгт | Талбарууд |
|---|---|
| `club_rounds` | `id`; `name` String(120), хоосон биш; `is_active` bool default false — **нэг л ээлж идэвхтэй** (идэвхжүүлэхэд бусдыг унтраана); `created_at` |
| `clubs` | `id`; `round_id` FK→club_rounds (RESTRICT); `name` String(120); `description` Text (энгийн олон мөрт текст); `grades` ARRAY(Integer) — 1..12, хоосон биш, давхардалгүй, эрэмбэлсэн; `capacity` int ≥1; `is_paid` bool; `fee` int ≥0 (`is_paid` бол ≥1; ₮); `fee_note` String(120) default "" (ж: "сард"); `registration_start`, `registration_end` DateTime(tz) — start < end; `is_published` bool default false; `order` int default 0; `created_at` |
| `club_images` | `id`; `club_id` FK cascade; `file` String(255); `order` int |
| `club_registrations` | `id`; `club_id` FK RESTRICT; `round_id` FK RESTRICT; `email` String(254) жижиг үсгээр; `student_last_name`, `student_first_name`, `guardian_last_name`, `guardian_first_name` String(80) хоосон биш; `phone` String(30) хоосон биш; `grade` int 1..12; `status` String(12) `confirmed`/`removed`; `is_paid_marked` bool default false; `removed_at` DateTime(tz) nullable; `created_at`. Unique partial index `uq_club_reg_round_email (round_id, email) WHERE status = 'confirmed'` |
| `email_codes` | `id`; `email` String(254) unique; `code_hash` String(128); `expires_at` DateTime(tz); `attempts` int default 0; `sent_count` int default 1; `first_sent_at` DateTime(tz); `created_at`. Нэг хаягт нэг мөр: шинэ код илгээхэд мөрийг шинэчилнэ |

Тооцоолсон утгууд (`service.py`): `taken` = тухайн дугуйлангийн `confirmed` бүртгэлийн тоо; `slots_left = capacity − taken`; `state`:

- `upcoming` — одоо < `registration_start`
- `closed` — одоо ≥ `registration_end`
- `full` — `slots_left ≤ 0`
- `open` — бусад тохиолдол

Дараалал: `closed` шалгалт `full`-аас түрүүнд (хугацаа дууссан дүүрэн дугуйлан "Хаагдсан").

## 4. Backend API

### 4.1 Олон нийт (`/api/clubs/`)

| Endpoint | Тайлбар |
|---|---|
| `GET /api/clubs/` `?grade=7` | Идэвхтэй ээлжийн нийтлэгдсэн дугуйлангууд `order, id`-ээр; `grade` өгвөл `grades` агуулсан нь. Хариу `{round: {id, name} \| null, clubs: [ClubOut]}`. `ClubOut`: id, name, description, grades, capacity, taken, slots_left, state, is_paid, fee, fee_note, registration_start, registration_end, images: [{id, url, order}] (`_media_url`-тэй ижил бүтэн URL). Идэвхтэй ээлж байхгүй бол `round: null, clubs: []`. |
| `POST /api/clubs/email/send/` `{email}` | Хаягийг trim + lowercase. Домэйн `settings.club_email_domain` (анхдагч `shineue.edu.mn`) биш → 400 `email: "Зөвхөн @shineue.edu.mn хаягаар бүртгүүлнэ"`. Идэвхтэй ээлж байхгүй → 400 `email: "Одоогоор бүртгэл нээгдээгүй байна"`. Энэ ээлжид `confirmed` бүртгэлтэй → 400 `email: "Энэ хаягаар «<дугуйлан>» дугуйланд бүртгүүлсэн байна"` (код илгээхгүй). Хязгаар: `first_sent_at`-аас хойш 1 цагийн дотор `sent_count ≥ 3` → 429 `{"detail": "Хэт олон удаа код авлаа. 1 цагийн дараа дахин оролдоно уу"}`; 1 цаг өнгөрсөн бол тоолуур шинээр эхэлнэ. Код: `secrets.randbelow(10**6)` 6 орон (эхэнд 0 байж болно), `sha256(secret_key + email + code)` hash, `expires_at = now + club_code_ttl_minutes` (10), `attempts = 0`. Илгээлт амжилтгүй → 502 `{"detail": "Имэйл илгээж чадсангүй. Дараа дахин оролдоно уу"}`. Хариу `{"ok": true, "expires_in": 600}`. |
| `POST /api/clubs/email/verify/` `{email, code}` | Мөр байхгүй/хугацаа дууссан → 400 `code: "Код хүчингүй. Дахин код авна уу"`. `attempts ≥ 5` → мөн адил. Буруу → `attempts += 1`, 400 `code: "Код буруу байна"`. Зөв → мөрийг устгаж JWT буцаана: `{sub: email, scope: "club-reg", exp: now + club_token_ttl_minutes (15)}` (`auth/security.py`-ийн `secret_key`, HS256). Хариу `{"token": "...", "expires_in": 900}`. |
| `POST /api/clubs/registrations/` | Body: `token`, `club_id`, `grade`, `student_last_name`, `student_first_name`, `guardian_last_name`, `guardian_first_name`, `phone`. Token буруу/хугацаа дууссан/scope зөрсөн → 401 `{"detail": "Баталгаажуулалтын хугацаа дууссан. Кодоо дахин авна уу"}`. Нэг transaction: дугуйланг `SELECT … FOR UPDATE`; дараах шалгалт дарааллаар, эхний зөрчил → 400: дугуйлан байхгүй/нийтлэгдээгүй/ээлж идэвхгүй → `club: "Дугуйлан олдсонгүй"`; `state == upcoming` → `club: "Бүртгэл хараахан эхлээгүй"`; `closed` → `club: "Бүртгэлийн хугацаа дууссан"`; `grade ∉ grades` → `grade: "Энэ дугуйлан <анги>-р ангид зориулагдаагүй"`; ээлжид имэйл бүртгэлтэй → `email: "Энэ хаягаар … бүртгүүлсэн байна"`; `full` → `club: "Дугуйлан дүүрсэн"`. Бүртгэл үүсгэж commit; unique index зөрчил (IntegrityError) → rollback, 400 `email`. Хариу `{id, club: {id, name, is_paid, fee, fee_note}, email, student_*, guardian_*, phone, grade, created_at}`. |

Талбарын урт/хоосон шалгалт pydantic (`min_length=1`, `max_length`), `phone` trim, нэрс trim.

### 4.2 Менежер (`/api/clubs/admin/…`, `require_role("manager")`)

| Endpoint | Тайлбар |
|---|---|
| `GET /rounds/` | Бүх ээлж `id desc`; `clubs_count`, `registrations_count` (confirmed). |
| `POST /rounds/` `{name}` | Шинэ ээлж (идэвхгүй). |
| `PATCH /rounds/{id}/` `{name?, is_active?}` | `is_active=true` бол бусдыг false болгоно (нэг UPDATE). |
| `DELETE /rounds/{id}/` | Бүртгэлтэй (confirmed эсвэл removed) → 409 `{"detail": "Бүртгэлтэй ээлжийг устгах боломжгүй"}`; дугуйлантай ч бүртгэлгүй бол дугуйлан, зургийн файлуудыг устгана. |
| `GET /rounds/{id}/clubs/` | Ээлжийн бүх дугуйлан (нийтлэгдээгүйг оролцуулан) `ClubAdminOut` = `ClubOut` + `is_published`, `order`, `round_id`. |
| `POST /rounds/{id}/clubs/` | `ClubIn`: name, description, grades, capacity, is_paid, fee, fee_note, registration_start, registration_end, is_published. `order` = ээлжийн max+1. Шалгалт: `grades` 1..12 хоосон биш (давхардал арилгаж эрэмбэлнэ); `start < end` → зөрчвөл `registration_end`; `is_paid` ба `fee < 1` → `fee`; `is_paid=false` бол `fee=0`, `fee_note=""`. |
| `PATCH /clubs/{id}/` | `ClubPatch` бүх талбар optional; нэгтгэсэн утгаар шалгана; `capacity < taken` → 400 `capacity: "Бүртгэгдсэн <n> сурагчаас бага байж болохгүй"`. |
| `PUT /rounds/{id}/clubs/order/` `{ids: [..]}` | Эрэмбэ; ээлжийн бүх id байх ёстой → 400. |
| `DELETE /clubs/{id}/` | Бүртгэлтэй → 409; зургийн файлуудыг устгана. |
| `POST /clubs/{id}/images/` | multipart `image` (нэг файл; frontend олон файлыг дараалан илгээнэ), `save_upload(image, "clubs")`, `order` = max+1. Хариу `ClubAdminOut`. |
| `DELETE /images/{id}/` | Файл устгана. Хариу `ClubAdminOut`. |
| `PUT /clubs/{id}/images/order/` `{ids}` | Эрэмбэ. |
| `GET /clubs/{id}/registrations/` | `confirmed` эхэнд (`created_at`), дараа нь `removed`; талбарууд: id, email, student_*, guardian_*, phone, grade, status, is_paid_marked, created_at, removed_at. |
| `POST /registrations/{id}/remove/` | `status=removed`, `removed_at=now`; аль хэдийн removed → 409. |
| `PATCH /registrations/{id}/` `{is_paid_marked}` | |
| `GET /rounds/{id}/registrations.xlsx` | openpyxl; нэг sheet: Дугуйлан, Анги, Сурагчийн овог, Сурагчийн нэр, Бүртгүүлэгчийн овог, Бүртгүүлэгчийн нэр, Утас, Имэйл, Төлөв (Бүртгэгдсэн/Хасагдсан), Төлбөр (Төлсөн/Төлөөгүй/—), Огноо. `Content-Disposition: attachment; filename="clubs-<round id>.xlsx"`. |

Ээлжийн `is_active=false` болгоход олон нийтэд харагдахаа болино; бүртгэлүүд хэвээр.

## 5. Имэйл илгээлт

`app/clubs/mailer.py`: `send_code(email, code)` — `smtplib.SMTP(host, port)` (+`starttls` бол `smtp_tls`), `login` (user/password хоосон биш бол), `asyncio.to_thread`. Захидал: Subject "Шинэ Үе — дугуйлангийн бүртгэлийн код", текст: "Таны баталгаажуулах код: 123456. Код 10 минутын дотор хүчинтэй. Та бүртгүүлээгүй бол энэ захидлыг үл тоомсорлоно уу." (`utf-8`, `From: smtp_from`).

Тохиргоо (`config.py`, `.env.example`): `smtp_host=""`, `smtp_port=587`, `smtp_user=""`, `smtp_password=""`, `smtp_from=""`, `smtp_tls=True`, `club_email_domain="shineue.edu.mn"`, `club_code_ttl_minutes=10`, `club_token_ttl_minutes=15`. `mail_enabled = bool(smtp_host and smtp_from)`. Идэвхгүй бол `logger.warning("Дугуйлангийн код (SMTP тохиргоогүй): %s → %s")` хэвлээд амжилттай гэж үзнэ (хөгжүүлэлт). Тестэд `mailer.send_code`-ийг monkeypatch хийж илгээсэн кодыг барина.

## 6. Frontend — олон нийтийн хуудас `/clubs`

Файлууд: `app/clubs/page.tsx` (server; `fetchClubs()` `lib/clubs-api.ts`, revalidate 60, алдаанд null → "Мэдээлэл түр байхгүй"), `components/clubs/{ClubsPage, GradePicker, ClubCard, ClubGallery, RegisterDialog}.tsx`, `lib/types.ts` (`ClubRound`, `Club`, `ClubImage`, `ClubState`, `ClubRegistrationInput`, `ClubRegistration`), `api.clubs.{sendCode, verifyCode, register}`. `NAV_LINKS`, `SiteFooter`-т "Дугуйлан" → `/clubs`. Metadata title "Дугуйлан".

Урсгал (client state; сонгосон анги `?grade=` URL-д):

1. **Анги сонгох** (`GradePicker`): 1–12 товч, утсан дээр хэвтээ гүйлгэнэ; сонгосон анги тодорно; ээлжийн нэр гарчгийн доор. `round` null эсвэл дугуйлангүй → "Одоогоор зарлагдсан дугуйлан байхгүй". Анги сонгоогүй үед бүх дугуйлан харагдана.
2. **Картууд** (`ClubCard`): нүүр зураг (эхний; байхгүй бол өнгөт орлуулагч + анхны үсэг), нэр, ангиуд ("5–8-р анги" — дараалсан бол муж, үгүй бол "5, 7, 9-р анги"), тайлбар (`line-clamp-3`, "Дэлгэрэнгүй"/"Хураах" toggle, `whitespace-pre-line`), төлбөр ("Үнэгүй" эсвэл "150,000₮ · сард"), хугацаа ("09.25 – 10.05, 18:00 хүртэл" — `registration_end`-ийн цагийг харуулна), слот: `capacity` ширхэг жижиг дөрвөлжин (эзлэгдсэн дүүрэн navy, сул хоосон хүрээтэй; capacity > 40 бол зөвхөн текст) + "3/20 сул". Badge: `upcoming` "Удахгүй" саарал, `open` "Бүртгэл нээлттэй" ногоон, `full` "Дүүрсэн" улаан, `closed` "Хаагдсан" саарал. "Бүртгүүлэх" зөвхөн `open` үед идэвхтэй. Зураг ≥1 бол зураг дээр дарахад `ClubGallery` (`<dialog>`, prev/next, тоолуур, Esc).
3. **Бүртгэлийн диалог** (`RegisterDialog`, `<dialog>`, `@/components/ui` primitives), 3 алхам + заагч ("1 Имэйл · 2 Код · 3 Мэдээлэл"):
   - Имэйл: input, client дээр `@shineue.edu.mn` төгсгөл шалгана; "Код илгээх" → `sendCode`; 400 `email` талбарын доор, 429/502 `detail` дээр нь.
   - Код: 6 орон (`inputMode="numeric"`, `maxLength=6`, `autoComplete="one-time-code"`), "Баталгаажуулах" → `verifyCode`; "Дахин илгээх" 60 сек countdown-той; алдаа талбарын доор; амжилттай бол token state.
   - Мэдээлэл: сурагчийн овог, нэр; бүртгүүлэгчийн овог, нэр; утас; анги select (дугуйлангийн `grades`; анхдагч = сонгосон анги, эс бөгөөс эхний); имэйл readonly. "Бүртгүүлэх" → `register`; `fieldErrors` талбар бүрт; `club` алдаа диалогийн дээд хэсэгт + `router.refresh()`; 401 → кодын алхам руу буцна ("Хугацаа дууссан, кодоо дахин авна уу").
   - Амжилттай: "✓ <Сурагчийн нэр> «<Дугуйлан>» дугуйланд бүртгэгдлээ", имэйл, төлбөртэй бол "Төлбөр: 150,000₮ · сард — сургууль дээр төлнө"; "Хаах" → `router.refresh()`.
   Диалог хаахад state reset.

Хэв маяг: `/timetable`, `/calendar`-тай ижил Tailwind загвар; утсан дээр нэг багана, диалог бүтэн өргөн.

## 7. Frontend — менежерийн хуудас `/admin/clubs`

Цэс: `{ href: "/admin/clubs", label: "Дугуйлан", icon: "◎" }` — `manager` role эсвэл superuser-т л харагдана (одоогийн NAV-д role шүүлт байхгүй бол `roles` талбараар шүүх дэмжлэг нэмнэ); backend 403 тул бусад staff хуудсанд орвол "Эрх хүрэхгүй".

Файлууд: `app/admin/(dashboard)/clubs/page.tsx`, `clubs/[id]/page.tsx`, `components/admin/clubs/{RoundBar, ClubTable, ClubForm, ImagesPanel, RegistrationsTable}.tsx`, `api.clubsAdmin.*` (rounds, clubs, images, registrations, `exportUrl`).

- `RoundBar`: ээлж select (анхдагч идэвхтэй, үгүй бол сүүлийнх; `?round=` URL), идэвхтэй badge, "Шинэ ээлж" (inline нэр input), "Нэр засах", "Идэвхжүүлэх" (confirm: "Бусад ээлж идэвхгүй болно"), "Устгах" (confirm; 409 → мессеж), "Excel татах" (staff token-той fetch → blob → download).
- `ClubTable`: эрэмбэ ▲▼ (`PUT order`), нэр, ангиуд, `taken/capacity`, төлбөр, хугацаа, badge (олон нийтийнх + "Нийтлээгүй" шар), "Засах" (форм modal), "Бүртгэл/Зураг" (→ `/admin/clubs/[id]`), "Устгах" (confirm; 409 → мессеж). "Шинэ дугуйлан" → форм.
- `ClubForm` (шинэ/засах): нэр, тайлбар textarea, ангиуд 12 checkbox (+ "Бүгд"), багтаамж number, төлбөртэй checkbox → дүн number + тайлбар ("сард" г.м.), бүртгэл эхлэх/дуусах `datetime-local` (локал цагаар ISO болгоно), нийтлэх checkbox; `ApiError.fieldErrors`.
- `/admin/clubs/[id]`: толгой (нэр, ээлж, `taken/capacity`, badge, "Засах"), `ImagesPanel` (олон файл сонгож дараалан upload, устгах confirm, ▲▼ эрэмбэ; album-ийн загвар), `RegistrationsTable` (огноо, анги, сурагч, бүртгүүлэгч, утас, имэйл, төлсөн checkbox — зөвхөн төлбөртэй дугуйланд, "Хасах" confirm → removed; removed мөрүүд саарал, доор, "Хасагдсан <огноо>").

## 8. Тохиргоо, баримт, dependency

- `pyproject.toml`: `openpyxl>=3.1` үндсэн dependency руу (dev-ээс шилжүүлнэ).
- `.env.example`: SMTP хувьсагчид + `CLUB_EMAIL_DOMAIN`.
- README: "Дугуйлангийн бүртгэл" хэсэг — урсгал, `/clubs`, `/admin/clubs` (manager), SMTP тохиргоо (Brevo/Mailgun г.м. SMTP relay: host, port 587, user, password, from), хөгжүүлэлтэд код логт хэвлэгдэнэ; route хүснэгтэд мөрүүд.
- `models_all.py`-д clubs models импорт; `main.py`-д router бүртгэл.

## 9. Тест ба шалгалт

Backend (`tests/test_clubs_public.py`, `test_clubs_admin.py`; `tests/helpers.py`-д `seed_clubs` — идэвхтэй ээлж + 2–3 дугуйлан; `mailer.send_code` monkeypatch → кодыг барих):

- Олон нийт: анги шүүлт; нийтлэгдээгүй/идэвхгүй ээлжийн дугуйлан харагдахгүй; state (`upcoming`/`open`/`full`/`closed`) — хугацааг өгөгдлөөр тохируулна.
- Код: буруу домэйн 400; ээлж идэвхгүй 400; бүртгэлтэй имэйл 400; 4 дэх илгээлт 429; буруу код ×5 → хүчингүй; хугацаа дууссан 400; зөв код → token, код устсан (дахин ашиглагдахгүй).
- Бүртгэл: амжилттай → `taken` +1, слот; ижил имэйл дахин (шинэ код авахыг оролдвол 400); дүүрсэн 400; хаагдсан/эхлээгүй 400; анги тохирохгүй 400; буруу/хуучирсан/scope зөрсөн token 401; хассаны дараа дахин бүртгүүлж болно; **зэрэгцээ 2 бүртгэл сүүлийн 1 слот** (`asyncio.gather`, тусдаа session) → нэг 201, нэг 400.
- Админ: manager биш 403; ээлж идэвхжүүлэхэд бусад унтарна; `capacity < taken` 400; `start ≥ end` 400; `is_paid` ба `fee=0` 400; бүртгэлтэй ээлж/дугуйлан устгах 409; зураг upload/устгах/эрэмбэ, файл устсан эсэх; remove → status/removed_at, давхар remove 409; Excel мөрийн тоо, толгой.

Frontend: `tsc --noEmit`, eslint. Browser: `/clubs` анги сонгох → карт → диалог 3 алхам (dev-д код серверийн логоос), алдааны мессежүүд, дүүрсэн/хаагдсан/удахгүй badge, галерей, утсан хэмжээ (375px); `/admin/clubs` ээлж/дугуйлан/зураг/бүртгэл/хасах/Excel; manager биш хэрэглэгчид цэс харагдахгүй.
