# Шинэ Үе сургуулийн вэб сайт

## Технологийн стек (зорилтот)

- **Backend:** FastAPI + SQLAlchemy + PostgreSQL (Docker Compose)
- **Frontend:** Next.js, responsive
- **Анимаци:** GSAP (React дээр `@gsap/react`-ийн `useGSAP` hook ашиглана)

## Ажиллуулах

### Олимпиадын хуудас (`/olympiad`)

Ү.Маамын нэрэмжит олимпиадын хуудас Next.js-ийн `/olympiad` route (`frontend/src/app/olympiad/`, `frontend/src/components/olympiad/`).
GSAP 3.15 (DrawSVG, MotionPath, ScrollTrigger, ScrollSmoother, SplitText — бүгд npm багцад) ба KaTeX. Хуваарь, үр дүн, албум
`/api/olympiad/*`-аас; намтар, тухай, холбоо барих, хөрөг зураг `/admin/olympiad/settings`-ээс (`olympiad_page` хүснэгт, migration 0007).
Хөдөлгөөн багасгах (prefers-reduced-motion) тохиргоотой үед анимацигүй, ScrollSmoother-гүй харагдана.

### Дугуйлангийн бүртгэл

Сургалтын менежер `/admin/clubs` дээр ээлж (улирал) үүсгэж идэвхжүүлээд дугуйлангуудыг (анги 1–12, анги тутмын квот, тайлбар, зураг, бүртгэлийн хугацаа, төлбөрийн мэдээлэл) зарлана. Олон нийтэд `/clubs` дээр зөвхөн идэвхтэй ээлжийн нийтлэгдсэн дугуйлан харагдана.

Бүртгэл: сурагч `@shineue.edu.mn` имэйлээ оруулна → 6 оронтой код имэйлээр очно (10 мин) → код зөв бол 15 минутын token → сурагч/бүртгүүлэгчийн овог нэр, утас, анги → бүртгэл. Багтаамж анги бүрт тусдаа (ж: 3-р анги 8, 7-р анги 3); нэг анги дүүрсэн ч бусад анги нээлттэй, дугуйлан бүх анги дүүрсэн үед л "Дүүрсэн" болно. Нэг имэйл нэг ээлжид нэг л дугуйланд бүртгүүлнэ; менежер хасвал слот суларч, дахин бүртгүүлж болно. Хугацаа дуусах эсвэл слот дүүрэхэд дугуйлан хаагдана. Төлбөр сайт дээр төлөгдөхгүй — зөвхөн мэдээлэл; менежер "Төлсөн" гэж тэмдэглэнэ. Ээлжийн бүртгэлийг Excel-ээр татаж болно.

SMTP тохиргоо (`backend/.env`): `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_TLS`. Brevo, Mailgun, SendGrid г.м. үйлчилгээний SMTP relay мэдээллийг бичнэ. `SMTP_HOST`/`SMTP_FROM` хоосон бол код илгээгдэхгүй, backend-ийн логт `Дугуйлангийн код (SMTP тохиргоогүй): ...` гэж хэвлэгдэнэ (хөгжүүлэлт). Домэйн: `CLUB_EMAIL_DOMAIN` (анхдагч `shineue.edu.mn`).

### Бидний тухай (`/about`)

Танилцуулга + тоон үзүүлэлт, удирдлагын шатлалтай бүтэц (түвшин 1–10, admin-аас нэмнэ, зурагтай), тэнхим бүрийн багш нар (эрхлэгч эхэнд), түүх.
Менежер `/admin/about`-аас удирдана (Танилцуулга · Удирдлага · Тэнхим). API: `GET /api/about/` (нээлттэй),
`/api/about/admin/*` (manager). Зураг `MEDIA_DIR/about/`. Модуль `backend/app/about/`, migration `0010_about`.

### Хөтөлбөрүүд (`/programs/[slug]`)

Нүүрний "Хөтөлбөрүүд" картууд (IBDP, Cambridge …) ба хөтөлбөр бүрийн хуудас: хэрэгжилт (rich text), хэрэгжих анги, сурагчдын бүтээлийн булан (зураг + гарчиг + сурагч, lightbox), тэтгэлэгт хамрагдсан сурагчид (нэр, их сургууль, он, USD дүн, нийт).
Менежер `/admin/programs`-аас удирдана (жагсаалт/форм; ☷ → бүтээл, тэтгэлэг). API: `GET /api/programs/`, `GET /api/programs/{slug}/` (нээлттэй, зөвхөн нийтлэгдсэн), `/api/programs/admin/*` (manager). Зураг `MEDIA_DIR/programs/`. Модуль `backend/app/programs/`, migration `0011_programs`.

### Backend (FastAPI + PostgreSQL)

Шаардлага: Python 3.14+, [uv](https://docs.astral.sh/uv/), Docker Desktop.

```bash
cd backend
docker compose up -d                          # PostgreSQL 17 (shineue, shineue_test баазууд)
cp .env.example .env                          # PowerShell: copy .env.example .env
uv sync                                       # сангуудыг суулгана
uv run alembic upgrade head                   # хүснэгтүүдийг үүсгэнэ
uv run python scripts/create_admin.py admin "нууц үг" --name "Админ"
uv run python scripts/seed.py                 # жишээ хуваарь, үр дүн (сонголттой)
uv run python scripts/seed_timetable.py       # жишээ цагийн хуваарь, календарь (сонголттой)
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
| `/api/news/categories/`, `/api/news/posts/`, `/api/news/posts/{slug}/` | Мэдээ, ангилал (унших, олон нийтэд нээлттэй) |
| `/api/news/posts/{slug}/comments/`, `/api/news/comments/{id}/` | Мэдээний сэтгэгдэл (нэмэх, устгах; зочны нэвтрэлт шаардана) |
| `/api/news/posts/{slug}/like/` | Мэдээнд лайк тавих/авах (зочны нэвтрэлт шаардана) |
| `/api/news/admin/posts/...`, `/api/news/admin/categories/...`, `/api/news/admin/comments/...`, `/api/news/admin/visitors/...` | Мэдээ удирдах (бичих, засах, нийтлэх, зураг, ангилал, сэтгэгдэл, зочид; `news` эрх шаардана) |
| `/api/social/facebook/status/` | Facebook тохиргоо идэвхтэй эсэх |
| `/api/social/facebook/login/`, `/api/social/me/` | Зочны Facebook нэвтрэлт (JS SDK-ийн `access_token`-ийг `debug_token`-ээр баталгаажуулна) |
| `/api/clubs/`, `/api/clubs/email/send/`, `/api/clubs/email/verify/`, `/api/clubs/registrations/` | Дугуйлан: жагсаалт, имэйлийн код, бүртгэл (олон нийт) |
| `/api/clubs/admin/rounds/...`, `/api/clubs/admin/clubs/...`, `/api/clubs/admin/registrations/...` | Дугуйлан удирдах (ээлж, дугуйлан, зураг, бүртгэл, Excel; `manager` эрх) |
| `/media/...` | Оруулсан зургууд |

**Production тэмдэглэл:** `.env` файлд `SECRET_KEY`, `CORS_ORIGINS`, `DATABASE_URL`-г production утгаараа заавал тохируулна (анхдагч `dev-insecure-*` түлхүүрээр локал бус хостоос ажиллуулах боломжгүй). uvicorn-ийг reverse proxy-ийн ард `--proxy-headers --forwarded-allow-ips=<proxy IP>` тохиргоотойгоор ажиллуулж, ингэснээр `/media` URL-үүд public host-ыг ашиглана. Хэрэв frontend-ийн `INTERNAL_API_URL` нь backend-ийн олон нийтэд харагдах хаягаас ялгаатай бол (жишээ нь дотоод сүлжээний хаяг ашиглах үед) `MEDIA_BASE_URL`-г заавал backend-ийн public хаягаар тохируулна, эс тэгвээс `/media` зурагнуудын URL дотоод хаягаар үүснэ.

Эрх: superuser бүх эрхтэй; эрхийн бүлгүүд `manager` (сургалтын менежер), `olympiad`, `news`. Ямар нэг бүлэгтэй эсвэл superuser хэрэглэгч "staff" гэж тооцогдоно.

Бүтэц: `app/main.py` (app), `app/auth/` (хэрэглэгч, JWT), `app/olympiad/` (модель, схем, router, importer), `app/common/` (алдааны формат, файл хадгалах), `alembic/` (миграци), `scripts/` (admin, seed), `tests/`.

Нууц үг PBKDF2-SHA256 (600 000 давталт) — өмнөх bcrypt хэш хүчингүй; create_admin-аар шинээр үүсгэнэ.

#### Excel-ээс үр дүн импортлох

Олимпиадын дүнгийн Excel файл (sheet бүр нэг ангилал: `suragch_VI` … `suragch_XII`,
`bagsh_baga`, `bagsh_dund`; толгой мөр `№ | Овог | Нэр | Сургууль | [Шифр] | 1 | 2 | … | Нийт оноо | Байр | Медаль`):

Эсвэл админ дашбоардын `/admin/olympiad/results/import` хуудас, API нь
`POST /api/olympiad/results/import/` (multipart: `file`, `year`, `dry_run`, `replace`).
Импорт нь тухайн он + ангиллын хуучин мөрүүдийг устгаж шинээр бичнэ (`replace=false` бол нэмнэ).
Уншигч: `backend/app/olympiad/importer.py`.

### Мэдээ ба Facebook

`news` эрхтэй хэрэглэгч (эсвэл superuser) `/admin/news`-ээс мэдээ бичиж, ангилал
сонгож, зураг оруулаад нийтэлнэ. Мэдээ нийтэд `/news`, `/news/[slug]`-ээр харагдана;
зочид (Facebook-ээр нэвтэрсэн) сэтгэгдэл бичиж, лайк дарж болно.

Facebook боломжууд (зочны нэвтрэлт → сэтгэгдэл/лайк, мэдээ нийтлэхэд Page дээр
автомат пост) зөвхөн доорх дөрвөн орчны хувьсагчийг **бүгдийг** тохируулсан үед
идэвхжинэ (`backend/.env`-д):

1. [developers.facebook.com](https://developers.facebook.com) дээр App үүсгэнэ
   (төрөл: Consumer), **Facebook Login** бүтээгдэхүүнийг нэмнэ. App-ийн
   тохиргоонд **Valid OAuth Redirect URIs** болон **App Domains**-д сайтын
   домэйныг (жишээ нь `https://shineue.example.mn`) бүртгэнэ.
2. App ID, App Secret-ийг авч `FB_APP_ID`, `FB_APP_SECRET`-д тавина.
3. Мэдээллийн Page-ийн урт хугацааны (non-expiring) Page Access Token-ыг
   гурван алхмаар үүсгэнэ:
   a. [Graph API Explorer](https://developers.facebook.com/tools/explorer/)-оор
      богино хугацааны **User** access token авна (эрх: `pages_manage_posts`,
      `pages_read_engagement`).
   b. Тэр User token-ыг урт хугацааны (long-lived) User token болгож
      сольсоно: `GET /oauth/access_token?grant_type=fb_exchange_token&client_id=<FB_APP_ID>&client_secret=<FB_APP_SECRET>&fb_exchange_token=<богино token>`.
   c. Урт хугацааны User token-оор `GET /{page_id}?fields=access_token`
      дуудаж, хугацаа дуусдаггүй Page token авна. Үр дүнг `FB_PAGE_ID`,
      `FB_PAGE_ACCESS_TOKEN`-д тавина.
4. `PUBLIC_SITE_URL`-г production домэйнаараа тохируулна (мэдээний холбоос,
   Facebook пост дотор ашиглагдана). Facebook Login нь localhost-оос бусад
   орчинд HTTPS шаарддаг тул `PUBLIC_SITE_URL`-г HTTPS домэйнаар тохируулаагүй
   бол Facebook Login ажиллахгүй, мөн auto-post идэвхжүүлэхээс өмнө заавал
   тохируулах ёстой — эс тэгвээс анхдагч `localhost` хаяг постонд гарна.
5. Backend-ийг дахин асаана (`.env`-ийг дахин уншина).
6. `/api/social/facebook/status/` дуудаж `enabled: true` гарч байгааг шалгана.

**Тэмдэглэл:** Facebook App Live mode руу шилжихэд анхдагчаар зөвхөн
`public_profile` зөвшөөрөл идэвхтэй байдаг; `pages_manage_posts`
(автомат пост хийхэд шаардлагатай) зэрэг эрхүүд Facebook-ийн App Review
шалгалт шаардаж болзошгүй. Review хийгдэх хүртэл auto-post ажиллахгүй байж
болно — гэхдээ сэтгэгдэл/лайкийн зочны нэвтрэлт үүнээс хамаарахгүй.

Frontend талд: `NEXT_PUBLIC_SITE_URL` (нийтийн сайтын хаяг, share/OG-д),
`INTERNAL_API_URL` (server component-оос backend руу дуудах дотоод хаяг;
production дээр backend өөр дотоод сүлжээний хаягтай байж болно).

### Хичээлийн хуваарь

- Эрх: `manager` (Сургалтын менежер) эсвэл superuser бичнэ; унших нээлттэй. Хэрэглэгчид эрхийг `/admin/users`-ээс өгнө.
- Админ: `/admin/timetable` (тойм, жилүүд) → `setup` (цагийн хүснэгт, анги, хичээл, багш, өрөө) → `curriculum` (анги бүрийн долоо хоногийн цаг) → `grid` (өдөр × цаг засварлагч, давхардал улаанаар) → `calendar` → `import` (Excel).
- Олон нийт: `/calendar/timetable` (Анги / Багш / Өрөө, PDF татах; хуучин `/timetable` энд redirect), `/calendar` (сар бүр, "Одоо: 1-р улирал, N-р долоо хоног").
- Календарийн үйл явдал бүрт өнгө сонгож болно (`color`, `#rrggbb`); хоосон бол ангиллын анхдагч өнгө (улирал хөх, амралт ногоон, шалгалт улаан, үйл явдал шар, бусад саарал).
- Давхардлыг **цагаар** шалгана (`[start, end)` огтлолцол): бага ангийн 35 минутын цаг ба ахлах ангийн 40 минутын цаг давхцаж болно.
- Цагийн дугаарлалт: `order` бол хичээлийн дугаар (1..n) — цагийн хүснэгтийн мөрүүд бодит `start_time`-аар эрэмблэгдэнэ (дугаараар биш); завсарлагын мөр 101, 102, … (101-ээс эхэлж) дугаартай байж, олон нийт/цагийн хүснэгтэд харагдахгүй (админ UI автоматаар өгнө).
- Excel формат: sheet бүр нэг анги (нэр `9а`); толгой `Цаг | Даваа | Мягмар | Лхагва | Пүрэв | Баасан | [Бямба]`; эхний багана цагийн дугаар; нүд `Математик / Б.Мухулай / 204` (өрөө сонголттой). Алдаатай sheet байвал юу ч бичигдэхгүй.
- PDF: ReportLab + DejaVu Sans (`backend/fonts/`, Bitstream Vera лиценз). Фонт байхгүй бол `/timetable.pdf` 500 өгнө.
- Жишээ өгөгдөл: `cd backend && uv run python scripts/seed_timetable.py` (`--reset` дахин). Windows-ийн консол дээр Cyrillic хэвлэхэд `UnicodeEncodeError` заавал гарвал `PYTHONIOENCODING=utf-8`-г урьдчилж тохируулна (жишээ нь `PYTHONIOENCODING=utf-8 uv run python scripts/seed_timetable.py --reset`); DB-д бичигдэх нь энэ алдаанаас хамаарахгүй, зөвхөн эцсийн хэвлэлтэд нөлөөлнө.

### Frontend (Next.js + Tailwind CSS)

Шаардлага: Node.js 20+. Backend ажиллаж байх ёстой.

```bash
cd frontend
copy .env.example .env.local        # API хаяг (анхдагч: http://127.0.0.1:8000)
npm install --legacy-peer-deps
npm run dev                          # http://localhost:3000
```

| Хаяг | Тайлбар |
|------|---------|
| `/` | Сургуулийн нүүр хуудас |
| `/olympiad` | Ү.Маамын нэрэмжит олимпиадын хуудас (олон нийт) |
| `/admin/olympiad/settings` | Олимпиадын хуудасны текст, хөрөг зураг засах (staff) |
| `/admin/login` | Админ нэвтрэх (superuser эсвэл эрхийн бүлэгтэй хэрэглэгч) |
| `/admin` | Дашбоард: тоон үзүүлэлт |
| `/admin/olympiad/schedule` | Олимпиадын хуваарь: оноор шат нэмэх, засах, устгах |
| `/admin/olympiad/results` | Олимпиадын үр дүн: он + ангиллаар (VI–XII анги, багш нар) оролцогч нэмэх, засах, устгах |
| `/admin/olympiad/results/import` | Excel файлаас үр дүн бөөнөөр оруулах (шалгах → импортлох) |
| `/admin/olympiad/album` | Олимпиадын албумын зураг оруулах, засах, устгах |
| `/admin/users` | Хэрэглэгч удирдах (superuser) |
| `/admin/news` | Мэдээний жагсаалт (`news` эрх эсвэл superuser) |
| `/admin/news/new`, `/admin/news/[id]` | Мэдээ бичих, засах (нийтлэх/буцаах, зураг, ковер) |
| `/admin/news/categories` | Мэдээний ангилал удирдах |
| `/admin/news/comments` | Мэдээний сэтгэгдэл зохицуулах (устгах, нуух) |
| `/news` | Мэдээний жагсаалт (олон нийтэд нээлттэй) |
| `/news/[slug]` | Мэдээний дэлгэрэнгүй, сэтгэгдэл, лайк |
| `/clubs` | Дугуйлан: анги сонгох, бүртгүүлэх (олон нийт) |
| `/calendar` | Академик календарь (олон нийт) |
| `/calendar/timetable` | Хичээлийн хуваарь — календарийн таб (`/timetable` энд redirect) |
| `/admin/clubs`, `/admin/clubs/[id]` | Дугуйлан удирдах (`manager` эрх эсвэл superuser) |

Бүтэц: `src/lib/api.ts` (API клиент, JWT), `src/lib/auth.tsx` (нэвтрэлтийн
context), `src/lib/useFetch.ts`, `src/components/ui.tsx` (Tailwind бүрдлүүд),
`src/app/admin/` (дашбоардын хуудсууд). Брэнд өнгө `globals.css`-ийн
`@theme` дотор: `bg-navy`, `text-gold` гэх мэт.

## Production (Docker)

Backend + PostgreSQL-ийг `docker-compose.prod.yml`-ээр ажиллуулна; frontend-ийг Vercel дээр (Root Directory = `frontend`, env `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL` = backend-ийн public хаяг) байрлуулна.

1. `cp backend/.env.example backend/.env` — production утгууд: `SECRET_KEY` (урт санамсаргүй), `CORS_ORIGINS` (Vercel + өөрийн домэйн), `PUBLIC_SITE_URL`, `MEDIA_BASE_URL` (backend-ийн public хаяг, ж: `https://api.example.mn`), `SMTP_*`, шаардлагатай бол `FB_*`. `DATABASE_URL`-ийг compose өөрөө өгнө (бичих шаардлагагүй).
2. Repo-ийн үндсэн хавтаст `.env`: `POSTGRES_PASSWORD=...` (+ HTTPS бол `API_DOMAIN=api.example.mn`).
3. `docker compose -f docker-compose.prod.yml up -d --build` — контейнер асахдаа DB-г хүлээж `alembic upgrade head` ажиллуулаад `uvicorn --proxy-headers` (2 worker, `WEB_CONCURRENCY`-ээр өөрчилнө) асаана. Порт `8000` (`BACKEND_PORT`).
4. Superuser: `docker compose -f docker-compose.prod.yml exec backend python scripts/create_admin.py admin "Нууц үг" --name "Админ" --email admin@example.com`.
5. HTTPS (VPS, өөрийн домэйн): `docker compose -f docker-compose.prod.yml --profile proxy up -d --build` — Caddy 80/443 дээр автоматаар сертификат авч `backend:8000` руу дамжуулна.

Өгөгдөл: `pgdata` (Postgres), `media` (оруулсан зургууд) volume-д хадгалагдана — backup хийхдээ хоёуланг нь.

### Railway

`backend/railway.json` build (Dockerfile) ба healthcheck (`/health`) тохиргоог өгнө. Project-д **Postgres** нэмээд backend сервисийг GitHub repo-оос үүсгэнэ (Settings → **Root Directory = `backend`**). Variables: `DATABASE_URL=${{Postgres.DATABASE_URL}}` (`postgresql://` хэлбэрийг код өөрөө asyncpg руу хөрвүүлнэ), `SECRET_KEY`, `CORS_ORIGINS`, `PUBLIC_SITE_URL`, `MEDIA_BASE_URL` (сервисийн public домэйн), `SMTP_*`, `RAILWAY_RUN_UID=0` (volume-д бичих эрх). **Volume** нэмж mount path `/app/media` (оруулсан зургууд). Public Networking → Generate Domain (порт 8000). Эхний superuser: сервисийн Shell/`railway run`-аар `python scripts/create_admin.py …`.

## Сайтын бүтэц (шаардлага)

1. **Ү.Маам багшийн хуудас** — animated page ✅ *(одоо хийгдэж байгаа)*
   - Олимпиадын хуваарь: 2024, 2025, 2026
   - Олимпиадын үр дүн: 2024, 2025
2. **Мэдээний булан ✅** — ангилал, зураг, сэтгэгдэл, лайктай мэдээ; `news` эрхтэй хэрэглэгч админ дашбоардаас бичиж, нийтэлнэ; Facebook холбогдсон бол автоматаар пост хийгдэнэ.
   - Постлогдсон цагаар эрэмбэлэгдэнэ
   - Мэдээ бүр ангилалтай
3. **Танилцуулга** — сургуулийн бүрэлдэхүүн, тэнхим бүрийн багш нарын мэдээлэл
4. **Сургуулийн түүх** — timeline story, эхэлсэн огнооноос өнөөг хүртэлх онцлох үйл явдлууд
5. **Academic calendar** — 2026
6. **Сургуулийн тухай** — Хөтөлбөр, Лабораторууд, Олон улсын хөтөлбөр
7. **Timetable** — Хичээлийн хуваарь
8. **Тэтгэлэг ба төгсөгчид**
9. **Сурагчдын клуб** — СУЗ, Охидын зөвлөл

## Нэмэлт (админ дашбоард)

- Мэдээ оруулах
- Форм үүсгэх
- Судалгаа боловсруулах
- Үр дүн болон тайлан харах
- Олимпиадын дүн оруулах

## Брэнд

Сургуулийн логоны өнгө: хөх `#1E3A8F`, шар `#FFC20E`, цагаан дэвсгэр.
