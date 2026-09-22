# Backend шилжүүлэлт (FastAPI + PostgreSQL) ба Timetable систем — дизайн

Огноо: 2026-09-18. Төлөв: батлагдсан, хэрэгжүүлэх төлөвлөгөө бичих шатанд.

## 1. Зорилго ба хамрах хүрээ

Хоёр дэд төсөл, дараалан хэрэгжинэ:

1. **Backend шилжүүлэлт.** `backend/`-ийн Django кодыг FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL болгон дахин бичнэ. Одоогийн API замууд ба JSON хариу яг ижил хадгалагдана; Next.js админ дашбоард өөрчлөлтгүй ажиллана. Django admin алга болж, дутуу хэсгүүд (хэрэглэгч, албум) Next.js админд нэмэгдэнэ.
2. **Timetable систем.** Сургалтын менежер хичээлийн хуваарь, сургалтын хөтөлбөр, академик календарь оруулна; олон нийт ангиар, багшаар, өрөөгөөр харж PDF татна.

Хамрахгүй: Django-ийн SQLite дэх өгөгдөл шилжүүлэх (жишээ өгөгдөл л байгаа), мэдээний булан, "өмнөх жилээс хуваарь хуулах" үйлдэл (дараагийн үе шат).

Ажлын журам: commit, push хийхгүй. Бүх зүйл local дээр тест хийгдэж дууссаны дараа push, дараа нь домэйн холболт.

## 2. Технологи ба төслийн бүтэц

- Python 3.14, uv. FastAPI, SQLAlchemy 2 (async, asyncpg), Alembic, pydantic-settings, PyJWT (JWT HS256), bcrypt (нууц үг), python-calamine (Excel унших), python-multipart, Pillow, ReportLab (PDF). (python-jose, passlib-ийн оронд PyJWT, bcrypt: Python 3.14 дээр найдвартай.)
- PostgreSQL 17, хөгжүүлэлтэд Docker Compose (`backend/docker-compose.yml`), production-д `DATABASE_URL`.
- Тест: pytest, pytest-asyncio, httpx AsyncClient. Тестийн бааз `shineue_test`, тест бүр transaction rollback.

```
backend/
  pyproject.toml
  docker-compose.yml        # postgres:17, порт 5432, named volume
  .env.example              # DATABASE_URL, SECRET_KEY, CORS_ORIGINS, MEDIA_DIR, ACCESS_TTL_HOURS, REFRESH_TTL_DAYS
  alembic.ini, alembic/
  app/
    main.py                 # FastAPI app, CORS, router-ууд, /media static, алдааны handler
    config.py               # Settings (pydantic-settings)
    db.py                   # engine, async_session, Base, get_db dependency
    auth/     models.py schemas.py router.py security.py deps.py
    olympiad/ models.py schemas.py router.py importer.py
    timetable/ models.py schemas.py router.py conflicts.py importer.py pdf.py
    common/   errors.py (DRF маягийн алдаа) media.py (файл хадгалах)
  scripts/create_admin.py, scripts/seed.py
  tests/
  fonts/DejaVuSans.ttf      # PDF-ийн кирилл фонт
```

Ажиллуулах: `docker compose up -d` → `uv run alembic upgrade head` → `uv run python scripts/create_admin.py` → `uv run uvicorn app.main:app --reload --port 8000`. `.claude/launch.json`-ын `backend` тохиргоог шинэчилнэ.

## 3. Нэвтрэлт ба эрх

Хүснэгтүүд: `users` (id, username unique, password_hash, full_name, email, is_active, is_superuser, created_at), `roles` (id, code unique: `manager` | `olympiad` | `news`, name), `user_roles` (user_id, role_id).

Endpoint-ууд (одоогийнхтой ижил зам, ижил хариу):

| Endpoint | Хариу |
|---|---|
| `POST /api/auth/token/` `{username, password}` | `{access, refresh}` |
| `POST /api/auth/token/refresh/` `{refresh}` | `{access, refresh}` (rotation) |
| `GET /api/auth/me/` | `{id, username, full_name, email, is_staff, is_superuser, roles: ["manager"]}` |
| `GET/POST /api/auth/users/`, `PATCH /api/auth/users/{id}/` | зөвхөн superuser; нууц үг солих `PATCH` дээр `password` талбараар |

`is_staff` = `is_superuser or roles байгаа`. JWT: access 8 цаг, refresh 14 хоног, `sub`=user id, `type`=access|refresh.

Dependency-ууд: `current_user` (заавал), `optional_user`, `require_staff`, `require_role(code)` (superuser үргэлж зөвшөөрнө). Унших API нээлттэй. Олимпиад бичих: staff. Timetable бичих: `manager`.

## 4. Олимпиад (parity)

Модель: `olympiad_stages`, `olympiad_results`, `olympiad_album_photos` — Django-ийн Stage, Result, AlbumPhoto-той талбар нэг бүрчлэн ижил (JSON талбарууд `tags`, `scores` → JSONB).

Endpoint-ууд, ижил зам ижил JSON: `years/`, `stats/`, `categories/`, `schedule/` (+`?year=`), `results/` (+`?year=&category=`; `rank` = хадгалсан rank эсвэл `RANK() OVER (PARTITION BY year, category ORDER BY score DESC NULLS LAST)`), `results/import/` (multipart `file, year, dry_run, replace`), `album/` (GET нийтэд `is_published=true`, staff бүгд; POST multipart зураг). Жагсаалт pagination-гүй массив хэвээр.

`importer.py`-ийн parse хэсэг Django-оос өөрчлөлтгүй, бичих хэсэг SQLAlchemy.

Алдааны формат: DRF-тэй ижил `{field: ["msg"]}` ба `{non_field_errors: ["msg"]}`; FastAPI-ийн RequestValidationError-ийг энэ хэлбэрт хөрвүүлнэ. 401/403 нь `{detail}`.

Frontend: `types.ts`-д `User.roles: string[]`; админ цэс эрхээр шүүнэ; `/admin/users`, `/admin/album` хуудас нэмнэ.

## 5. Timetable — өгөгдлийн загвар

| Хүснэгт | Талбарууд | Дүрэм |
|---|---|---|
| academic_years | id, name, start_date, end_date, working_days (int, анхдагч 5), is_current | Зөвхөн нэг `is_current` |
| period_sets | id, year_id, name | Жишээ: "Бага анги", "Дунд, ахлах анги" |
| periods | id, period_set_id, order, start_time, end_time, is_break | `unique(period_set_id, order)` |
| class_groups | id, year_id, grade (1–12), letter, period_set_id, homeroom_teacher_id nullable | `unique(year_id, grade, letter)`; нэр = `f"{grade}{letter}"` |
| subjects | id, name unique, short_name, color | |
| teachers | id, last_name, first_name, short_name unique, is_active | `teacher_subjects` M2M |
| rooms | id, name unique, capacity nullable, kind (`classroom`\|`lab`\|`gym`\|`other`) | |
| lessons | id, class_group_id, weekday (1–6), period_id, subject_id, teacher_id, room_id nullable | `unique(class_group_id, weekday, period_id)`; period нь ангийн period_set-д харьяалагдах ёстой |
| curriculum_entries | id, class_group_id, subject_id, hours_per_week | `unique(class_group_id, subject_id)` |
| calendar_events | id, year_id, title, category (`term`\|`holiday`\|`exam`\|`event`\|`other`), start_date, end_date, description, applies_to (`all`\|`primary`\|`secondary`\|`high`) | `end_date >= start_date` |

Давхардлын дүрэм (`conflicts.py`): нэг жил, нэг weekday дотор хоёр lesson-ийн цагийн зай `[start_time, end_time)` огтлолцож байвал (a) ижил багштай бол багшийн давхардал, (b) ижил өрөөтэй бол өрөөний давхардал. Period-ийн дугаараар биш цагаар шалгана, учир нь цагийн хүснэгтүүд өөр минуттай.

## 6. Timetable — API (`/api/timetable/`)

Унших нээлттэй, бичих `manager`. Жагсаалтууд массив, `?year=` шүүлт (анхдагч: одоогийн жил).

| Endpoint | Тайлбар |
|---|---|
| `years/` CRUD, `POST years/{id}/set-current/` | |
| `period-sets/`, `periods/` CRUD | |
| `classes/`, `subjects/`, `teachers/`, `rooms/`, `curriculum/`, `calendar/` CRUD | |
| `GET lessons/?year=&class=` \| `&teacher=` \| `&room=` | Нэг endpoint, гурван харагдац. Хариу: `[{id, weekday, period: {order, start_time, end_time}, subject: {id, name, short_name, color}, teacher: {id, short_name}, room: {id, name}, class_group: {id, name}}]` |
| `PUT classes/{id}/grid/` body `[{weekday, period_id, subject_id, teacher_id, room_id}]` | Нэг transaction: тухайн ангийн бүх lesson-ийг устгаж шинээр бичнэ. Давхардал олдвол 400 `{conflicts: [{weekday, period_id, kind: "teacher"\|"room", with_class: "9б", who: "Б.Мухулай"}]}`, юу ч хадгалахгүй. |
| `GET classes/{id}/curriculum-check/` | `[{subject: {...}, planned, scheduled}]` |
| `POST lessons/import/` multipart `file, year, dry_run, replace` | Доорх Excel формат |
| `GET classes/{id}/timetable.pdf` | ReportLab, А4 хэвтээ |

Excel формат: нэг файл, sheet бүр нэг бүлэг анги (sheet-ийн нэр "9а"). Толгой мөр `Цаг | Даваа | Мягмар | Лхагва | Пүрэв | Баасан` (+ `Бямба` байж болно). Эхний багана period-ийн order (1, 2, ...). Нүд: `Математик / Б.Мухулай / 204` (`/`-ээр тусгаарлана; өрөө сонголттой). Хичээлийг `name` эсвэл `short_name`-аар, багшийг `short_name`-аар, өрөөг `name`-аар хайна. Олдохгүй нэр, давхардал → dry_run-д жагсаана, импортлохгүй. `replace=true` бол тухайн ангиудын хуучин lesson-ийг устгана.

PDF: нэг анги нэг хуудас, толгойд "Шинэ Үе сургууль", ангийн нэр, жил, хэвлэсэн огноо; мөр = цаг (цагийн зайтай), багана = өдөр; завсарлага саарал мөр; нүдэнд хичээл, багш, өрөө. Фонт DejaVu Sans (`backend/fonts/`).

## 7. Timetable — админ UI (`/admin/timetable/*`)

Одоогийн админы бүрдлүүд (Card, Table, Modal, Field, `useFetch`) ашиглана. Цэсэнд `manager` эсвэл superuser-т л харагдана.

| Хуудас | Агуулга |
|---|---|
| `/admin/timetable` | Жил сонгох, тоон үзүүлэлт (анги, багш, өрөө, хуваарьт орсон цаг, хөтөлбөртэй таарахгүй анги), "Шинэ жил үүсгэх" |
| `/admin/timetable/setup` | Табууд: Цагийн хүснэгт, Ангиуд, Хичээлүүд, Багш нар, Өрөөнүүд; Table + Modal |
| `/admin/timetable/grid` | Анги сонгох → өдөр × цаг хүснэгт. Нүд дээр дарахад popover: хичээл, багш (тухайн хичээлийг заадаг нь эхэнд), өрөө. Өөрчлөлт client дээр, "Хадгалах" → `PUT grid/`. Давхардалтай нүд улаан, тайлбартай. Баруун талд хөтөлбөрийн шалгалт (`Математик 4/5`: дутуу шар, илүү улаан). Гар: Tab нүд хооронд, Enter popover, Esc хаах. Хадгалаагүй өөрчлөлттэй гарахад анхааруулна. |
| `/admin/timetable/import` | Excel: шалгах → импортлох |
| `/admin/timetable/curriculum` | Анги сонгох → хичээл бүрийн цаг |
| `/admin/timetable/calendar` | Үйл явдлын жагсаалт огноогоор, Modal |

## 8. Олон нийтийн хуудас

- `/timetable`: табууд Анги / Багш / Өрөө + select. Хүснэгт: мөр цаг (цагийн зайтай), багана өдөр, завсарлага саарал. Нүдэнд хичээл (хичээлийн өнгөөр зүүн зурвас), доор багш, өрөө. Утсан дээр өдөр бүр босоо блок. "PDF татах". Нүүрийн дизайны систем (Piazzolla гарчиг, `line` өнгө), анимацигүй.
- `/calendar`: жил сараар, улирал өргөн зурвас, бусад категори өнгөөр; дээд талд "Одоо: 1-р улирал, 5-р долоо хоног"; `applies_to` шүүлт.
- Нүүрийн цэс, хөл хэсэгт холбоос.

## 9. Тест

- Backend pytest: нэвтрэлт ба refresh rotation; эрх (staff биш → 403, manager биш → timetable бичихэд 403); олимпиад CRUD, rank тооцоолол, Excel импорт fixture; timetable давхардал (багш, өрөө, огтлолцсон цаг, өөр period set), grid transaction (давхардалтай үед юу ч бичигдээгүй), curriculum-check, Excel импорт, PDF (200, `application/pdf`).
- Frontend: `tsc --noEmit`, ESLint, grid хуудсыг browser дээр гараар.

## 10. Дараалал

1. Backend суурь: Docker Compose, config, db, Alembic, auth, тест суурь.
2. Олимпиад parity → frontend админ өөрчлөлтгүй ажиллахыг батлах.
3. Хэрэглэгч, албумын админ хуудас.
4. Timetable модель, API, давхардал, тест.
5. Timetable админ UI.
6. Олон нийтийн `/timetable`, `/calendar`.
7. Excel импорт, PDF.
8. README шинэчлэх; local тест бүрэн → push → домэйн.
