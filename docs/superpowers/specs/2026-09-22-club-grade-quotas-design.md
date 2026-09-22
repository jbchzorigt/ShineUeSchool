# Дугуйлангийн анги тутмын квот — дизайн

Огноо: 2026-09-22. Төлөв: батлагдсан, хэрэгжүүлэх төлөвлөгөө бичих шатанд. Суурь: `docs/superpowers/specs/2026-09-21-clubs-registration-design.md` (хэрэгжсэн).

## 1. Зорилго

Дугуйлангийн багтаамж нийт нэг тоо биш, **анги бүрт тусдаа квот** болно (ж: 3-р анги 8, 4-р анги 5, 7-р анги 3 → нийт 16). Сурагч зөвхөн өөрийн ангийн квотод багтана; нэг анги дүүрсэн ч бусад анги нээлттэй. Нүүр хуудас, бүртгэлийн диалог, менежерийн хүснэгт/форм/дэлгэрэнгүй бүгд анги тутмын мэдээллийг харуулна.

Хамрахгүй: ээлж, бүртгэлийн урсгал (код/token), Excel экспорт (Анги багана аль хэдийн байна), төлбөр.

Ажлын журам: commit, push хийхгүй; `git add`-аар дуусгана.

## 2. Өгөгдлийн загвар

`clubs` хүснэгт:
- `capacity` баганыг **хасна**.
- `quotas` JSONB (nullable биш, default `{}`) нэмнэ: `{"3": 8, "4": 5, "7": 3}` — түлхүүр = анги (string, 1..12), утга = квот (int ≥ 1).
- `grades` ARRAY хэвээр (SQL шүүлт `Club.grades.any(grade)`); хадгалахдаа **үргэлж** `sorted(int(k) for k in quotas)`-аас гаргана (өөрөө оруулдаггүй).

Migration `0009_club_quotas`: `quotas` багана нэмж, мөр бүрт `quotas = {str(g): capacity for g in grades}` (хуучин нийт тоог анги тутамд тавина — тестийн өгөгдөл л байгаа), дараа нь `capacity`-г хасна. Downgrade: `capacity = max(quotas.values())` буцааж, `quotas` хасна.

Модель: `Club.quotas: Mapped[dict] = mapped_column(JSONB, default=dict)`; property `capacity_total = sum(quotas.values())`.

## 3. Backend логик (`service.py`)

- `taken_by_grade(db, club_ids) -> dict[int, dict[int, int]]` — `club_id → {grade → confirmed тоо}` (`GROUP BY club_id, grade`). Одоогийн `taken_counts` үүнээс нийлбэрээр гарна.
- `quota_rows(club, taken_g: dict[int,int]) -> list[QuotaOut]` — анги бүрт `{grade, capacity, taken, slots_left = max(cap − taken, 0), full = taken ≥ cap}`, ангиар эрэмбэлсэн.
- `club_state(club, taken_g, now)`: `upcoming` (now < start) → `closed` (now ≥ end) → `full` (**бүх** анги `full`) → `open`.
- Дугуйлангийн түвшний `capacity = sum(quotas)`, `taken = sum(taken_g)`, `slots_left = sum(slots_left анги бүр)`.

## 4. API

### Олон нийт
- `ClubOut`: `grades`, `capacity` (нийлбэр), `taken`, `slots_left`, `state` хэвээр + **`quotas: [QuotaOut]`** (`{grade, capacity, taken, slots_left, full}`).
- `POST /api/clubs/registrations/`: `FOR UPDATE`-ийн дараа шалгалтын дараалал: олдсонгүй → `upcoming` → `closed` → `grade ∉ quotas` (`grade: "Энэ дугуйлан <g>-р ангид зориулагдаагүй"`) → имэйл бүртгэлтэй → **тухайн ангийн квот дүүрсэн** → 400 `grade: "<g>-р ангид суудал дүүрсэн"`. Дугуйлангийн түвшний `full` шалгалт хасагдана (анги тутмын шалгалт орлоно).

### Менежер
- `ClubIn`: `grades`, `capacity`-ийн оронд **`quotas: list[QuotaIn]`**, `QuotaIn = {grade: int 1..12, capacity: int 1..500}`; ≥1 мөр, анги давхардахгүй (зөрчвөл 400 `quotas`). `ClubPatch.quotas` optional, ижил дүрэм. Хадгалахдаа `club.quotas = {str(q.grade): q.capacity}`, `club.grades` = эрэмбэлсэн ангиуд.
- `PATCH`: шинэ квот тухайн ангийн бүртгэгдсэн тооноос бага бол 400 `quotas: "<g>-р ангид бүртгэгдсэн <n> сурагчаас бага байж болохгүй"`; бүртгэлтэй ангийг квотоос хасахыг мөн 400 `quotas: "<g>-р ангид бүртгэл байгаа тул хасах боломжгүй"`.
- `ClubAdminOut` = `ClubOut` + `is_published, order, round_id` (quotas орно).
- Бусад endpoint өөрчлөгдөхгүй. Excel хэвээр.

## 5. Frontend — нүүр хуудас (`/clubs`)

Төрөл: `ClubQuota {grade, capacity, taken, slots_left, full}`, `Club.quotas: ClubQuota[]`; `ClubInput`: `quotas: {grade, capacity}[]` (`grades`, `capacity` хасагдана).

`ClubCard` (`selectedGrade: number | null` prop нэмэгдэнэ):
- Анги сонгосон: тэр ангийн мөр — "**3**/5 сул · 7-р анги" + `SlotBar` (одоогийн дөрвөлжингүүдийн оронд; `SlotBar`-ыг `components/clubs/SlotBar.tsx` руу зөөж нүүр/админ хоёулаа ашиглана). Товч: анги дүүрсэн бол "Энэ ангид дүүрсэн" (идэвхгүй); дугуйлан `open` биш бол өмнөх шигээ.
- "Бүх анги": нийт "12/25 сул" + bar, доор нь анги бүрийн жижиг badge мөр `3-р 5/8 · 4-р 2/5 · 7-р 0/3` (дүүрсэн анги саарал, `line-through` биш). Товч `open` үед идэвхтэй.
- Badge `full` = бүх анги дүүрсэн (backend `state`).

`RegisterDialog`: ангийн `<Select>` option текст `7-р анги · 2 сул`; `full` анги `disabled`; анхдагч утга: сонгосон анги (дүүрээгүй бол) → эхний дүүрээгүй анги. `grade` алдаа (дүүрсэн) талбарын доор харагдана (одоогийн `fieldErrors` логик).

## 6. Frontend — менежер

- `ClubForm`: ангийн chip-үүд хэвээр; сонгогдсон анги бүрт хажууд нь `number` талбар ("7-р анги [5]") — `Draft.quotas: {grade, capacity: string}[]` ангиар эрэмбэлсэн; chip дарахад нэмэгдэх/хасагдах (шинэ ангийн анхдагч квот 5); "Бүгд" → 12 анги, тус бүр 5. Алдаа `errors.quotas` талбарын доор.
- `ClubTable` "Бүртгэл" багана: нийт `SlotBar` + доор `7-р 3/5` жижиг badge-ууд (дүүрсэн улаан, бусад саарал).
- Дэлгэрэнгүй `/admin/clubs/[id]`: толгойн нийт bar хэвээр; доор "Анги тутмын квот" хүснэгт — Анги · Квот · Бүртгэгдсэн · Сул · bar. Бүртгэлийн хүснэгт хэвээр.
- `formatGrades(club.grades)` хэвээр (grades backend-ээс ирнэ).

## 7. Тест

Backend (`test_clubs_public.py`, `test_clubs_admin.py`, `seed_clubs` шинэчлэгдэнэ — `quotas`-той: Шатар `{5:1, 6:1, 7:2, 8:2}` г.м.):
- Жагсаалт: `quotas` мөрүүд, `capacity` = нийлбэр, `taken`/`slots_left` анги тутам + нийт; `state=full` зөвхөн бүх анги дүүрсэн үед; нэг анги дүүрсэн ч `open`.
- Бүртгэл: ангийн квот дүүрсэн → 400 `grade` мессеж; өөр анги амжилттай; race тест анги тутмын квотоор (capacity 1 нэг ангид).
- Менежер: `quotas` хоосон/давхардсан/анги 13/квот 0 → 400 `quotas`; PATCH квот < бүртгэгдсэн → 400; бүртгэлтэй ангийг хасах → 400; `grades` хариунд эрэмбэлсэн түлхүүрүүд; migration `alembic check` цэвэр.

Frontend `tsc`, eslint; browser: `/clubs` анги сонгох/бүх анги хоёр төлөв, дүүрсэн анги, диалогийн сонголт; `/admin/clubs` форм (chip + квот), хүснэгт, дэлгэрэнгүй.
