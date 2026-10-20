# Англи хувилбар (EN) ба англи мэдээ — дизайн

Огноо: 2026-10-20. Төлөв: хэлэлцэж батлагдсан, хэрэглэгчийн хяналтад. Суурь: нийтийн хуудсууд `frontend/src/app/(site)/`, серверийн fetch `lib/*-api.ts`, мэдээ `backend/app/news/`, хөтөлбөр `backend/app/programs/`, бидний тухай `backend/app/about/`, төгсөгч `backend/app/graduates/`, админ мэдээ засварлагч `components/admin/PostEditor.tsx`.

## 1. Зорилго

Сайтыг гадаадын зочид (гадаад эцэг эх, түнш сургууль, их сургуулиуд) үзэх **англи хувилбартай** болгох, мэдээг **англи хэл дээр нийтлэх** боломж олгох.

- Англи хуудсууд `/en` угтвартай: `/en`, `/en/about`, `/en/news`, `/en/news/<slug>`, `/en/programs/<slug>`, `/en/admission`. Монгол хаяг **өөрчлөгдөхгүй** (`/`, `/about` …).
- Англиар байх хуудсууд: Нүүр, Бидний тухай, Мэдээ (жагсаалт + дэлгэрэнгүй), Хөтөлбөр (3), Элсэлт, Холбоо барих (нүүрний байршлын хэсэг).
- Монголоор үлдэх: Календарь, Хичээлийн хуваарь, Дугуйлан, Судалгаа, Олимпиад. Англи цэсэнд **харагдахгүй**; `/en/<эдгээр>` → монгол хуудас руу redirect.
- Мэдээ: **нэг мэдээ, 2 хэл**. Мэдээ бүрт МН / EN таб; EN-ийг бөглөсөн мэдээ л англи сайтад гарна. Зөвхөн англи мэдээ (МН хоосон) боломжтой.
- Админ хэсэг монголоор үлдэнэ.

Хамрахгүй: олимпиад, хуваарь, календарь, дугуйлан, судалгааг англи болгох; админыг англи болгох; автомат (AI) орчуулга; гурав дахь хэл.

Ажлын журам: commit, push зөвхөн хэрэглэгч "commit push" гэхэд; бусад үед `git add`-аар дуусгана.

## 2. Сонгосон арга

`[lang]` замын сегмент + Next 16 `proxy` + өөрийн толь бичиг файлууд + backend-д `_en` баганууд + нийтийн API `?lang=`. Шинэ сан нэмэхгүй (next-intl биш).

## 3. Frontend: замчлал

- `app/(site)/**` → `app/[lang]/(site)/**`. `lang` ∈ `{"mn","en"}`; бусад утга → `notFound()`. `generateStaticParams` → `[{lang:"mn"},{lang:"en"}]`.
- `src/proxy.ts` (Next 16 middleware):
  - `matcher` нь `/admin`, `/olympiad`, `/api`, `/_next`, статик файл (цэгтэй зам: `.png`, `.ico` …)-ыг **алгасна**.
  - `/en` эсвэл `/en/...` → өөрчлөлтгүй дамжина.
  - `/mn` эсвэл `/mn/...` → **308 redirect** угтваргүй зам руу (`/mn/about` → `/about`), давхар URL гаргахгүй.
  - Бусад (`/`, `/about` …) → **rewrite** `/mn/...` (хэрэглэгчийн URL хэвээр).
  - `/en/calendar`, `/en/calendar/timetable`, `/en/timetable`, `/en/clubs`, `/en/survey` → 307 redirect монгол хувилбар руу.
- Root layout-ууд: одоогийн `app/layout.tsx`-ийг 3 root layout болгоно — `app/[lang]/layout.tsx` (`<html lang={lang}>`), `app/admin/layout.tsx` (`lang="mn"`), `app/olympiad/layout.tsx` (`lang="mn"`, одоогийн layout-тай нэгтгэнэ). Фонт (`next/font`: TT Norms, mono, Caveat), `globals.css`, favicon/metadata-г `app/fonts.ts` хуваалцсан модульд (favicon/metadata-ийн суурь нь `app/site-metadata.ts`) гаргана. Root layout хооронд шилжихэд бүтэн ачаалалт болох нь хүлээн зөвшөөрөгдөнө.
- `app/api/revalidate/route.ts` байрандаа (proxy алгасна).
- `not-found`, `error` хуудсууд `[lang]` дотор хэлтэй.

## 4. Frontend: хэл, толь бичиг

- `lib/i18n/mn.ts` (эх), `lib/i18n/en.ts` (`satisfies Dict` — `Dict = typeof mn` бүтэцтэй; түлхүүр дутвал build алдаа). `lib/i18n/index.ts`: `type Lang = "mn" | "en"`, `LANGS`, `isLang()`, `getDict(lang)`, `href(lang, path)` (mn → `path`, en → `/en${path}`), `formatDate(lang, date, opts)` (`Intl.DateTimeFormat("mn-MN" | "en-GB")`).
- Агуулга: цэс, footer, товчлуур, хэсгийн гарчиг, hero (гарчиг, ишлэл), төгсөлтийн шошго ба typewriter гарчиг, газрын зургийн легенд/тивийн нэр, хоосон/алдааны төлөвийн текст, хөтөлбөрийн хуудасны шошго (анги, тэтгэлэг, график), мэдээний шошго (уншиж эхлэх, холбоотой мэдээ, коммент), элсэлтийн placeholder, `metadata` (title, description).
- `home-data.ts`-ийн статик агуулга (`HISTORY`, `GRADUATION`, `CONTACT`, `CONTINENTS` шошго) → `Record<Lang, …>` хэлбэрт шилжинэ (ж: `HISTORY: Record<Lang, HistoryItem[]>`, `CONTACT.address: Record<Lang, string>`); хэрэглэгч `HISTORY[lang]` гэж уншина. Ү.Маамын ишлэл EN дээр англи орчуулга + эх монгол ишлэл (жижиг, `lang="mn"`).
- Server Component: `params.lang`-аас `getDict`. Client компонентууд: `LangProvider` (`[lang]/layout.tsx`-д) + `useLang()` / `useDict()`.
- **Англи цэс:** Home · About · News | лого | Programs · Admission · Contact. "Programs" нь нүүрний `#programs` хэсэг рүү (`/en#programs`), "Contact" нь `/en#location`. Олимпиадын YearTiles товч болон Бүртгэл drop-down EN-д байхгүй. Hero-ийн олимпиадын товч EN-д нуугдана.
- **Хэл солих товч** `MN | EN`: header (desktop баруун зах, mobile цэсэнд). Одоогийн замын нөгөө хэл рүү (`usePathname`). Мэдээний дэлгэрэнгүйд `post.languages`-д тухайн хэл байхгүй бол нөгөө хэлний `/news` жагсаалт руу. EN-д байхгүй хуудаснаас (календарь г.м.) EN дарвал `/en`.
- **SEO:** `generateMetadata` бүрт `alternates.languages` (`mn` ↔ `en`, `x-default` → mn). Англигүй мэдээнд `en` alternate тавихгүй.

## 5. Backend: өгөгдөл

Migration `0015_english.py` — бүгд `server_default=""`, NOT NULL:

| Хүснэгт | Шинэ баганууд |
|---|---|
| `news_posts` | `title_en` String(200), `excerpt_en` String(280), `body_html_en` Text |
| `news_categories` | `name_en` String(80) |
| `news_images` | `caption_en` String(200) |
| `programs` | `name_en` String(120), `summary_en` String(280), `body_html_en` Text |
| `program_works` | `title_en` String(160), `caption_en` String(280) |
| `about_page` | `intro_title_en` String(160), `intro_html_en` Text; `stats` JSONB мөр бүрт нэмэлт түлхүүр `label_en` (байхгүй бол "") |
| `about_leaders` | `position_en` String(160) |
| `about_departments` / `about_teachers` | `name_en` String(120) / `role_en` String(120) |

`graduates/countries.py`: CATALOGUE мөр бүрт англи нэр (`name_en`), `CONTINENTS` англи шошго. Хүний нэр, их сургуулийн нэр, тэтгэлэг (нэр, их сургууль, дүн), ЭЕШ-ийн radar, `badge` хэвээр (орчуулгагүй).

`Post.title`: хоосон байж болно (MN хоосон = зөвхөн англи мэдээ). DB багана өөрчлөгдөхгүй (String(200), NOT NULL, "" хадгална); админ `PostIn.title` `min_length=1` → `min_length=0` (default ""), "аль нэг заавал" дүрмийг §6 шалгана.

## 6. Backend: API

- Нийтийн endpoint бүр `lang: Literal["mn","en"] = "mn"` query авна (мэдээ, ангилал, хөтөлбөр, бидний тухай, төгсөгч). Буруу утга → 422.
- `app/common/i18n.py`: `localized(mn: str, en: str, lang) -> str` — `lang == "en"` ба `en.strip()` бол `en`, үгүй бол `mn`. Response schema-ууд **өөрчлөгдөхгүй** (ж: `name`, `body_html` талбарт сонгосон хэлний утга).
- **Мэдээ (онцгой дүрэм):**
  - `GET /posts/?lang=en` → зөвхөн `title_en != ""`; `?lang=mn` → зөвхөн `title != ""`. Related мөн адил.
  - `GET /posts/{slug}/?lang=en` англигүй бол **404**; `?lang=mn` монгол гарчиггүй бол 404.
  - `PostDetail.languages: list[Literal["mn","en"]]` — бөглөсөн хэлнүүд.
  - EN хариунд `excerpt`, `body_html`, зургийн `caption`, ангиллын `name` нь `localized` (EN хоосон бол MN fallback — мэдээний их биеэс бусад).
  - Slug нэг; хоёр хэлэнд ижил. Коммент, лайк нийтлэг.
- **Админ:** `PostIn` ба бусад `*In` schema-д `_en` талбарууд (урт хязгаар MN-тэй ижил, `body_html_en` → `clean_html`). Мэдээ: `title` эсвэл `title_en`-ийн **аль нэг заавал** (`FieldError("title", "Монгол эсвэл англи гарчиг заавал.")`). Slug: MN гарчгаас, хоосон бол EN гарчгаас `slugify`. Админ GET хариунд MN ба EN бүх талбар.
- **Facebook** автомат нийтлэл: MN хувилбар; MN хоосон бол EN.
- About `stats` шалгалт: `label_en` ≤ одоогийн `label` урт.

## 7. Frontend: өгөгдөл ба кэш

- `lib/news-api.ts`, `programs-api.ts`, `about-api.ts`, `graduates-api.ts`: функц бүр `lang` параметр → `?lang=` (mn дээр ч тодорхой дамжуулна). Fetch URL өөр тул кэш хэл тус бүрт тусдаа; одоогийн tag-ууд (`graduates`, `programs` …) хоёр хэлийг хамт invalidate.
- `afterSave` / `revalidateCache` — tag дээр суурилсан тул өөрчлөлтгүй; path revalidate хэрэглэдэг газарт `/en` замыг нэмнэ.
- Газрын зураг: улсын нэрийг API-аас (`lang`-аар) авна; `buildMapData` кэш түлхүүрт `lang` нэмнэ.
- ApexCharts (тэтгэлэг, ЭЕШ) шошго, tooltip: толь бичгээс.

## 8. Админ UI

- `PostEditor`: гарчиг, товч, их бие (RichText), зургийн тайлбарт `Монгол | English` таб; ангилал, огноо, cover, нийтлэх нь таб гадна. Табын шошго дээр "English ✓" / "English: хоосон". Мэдээний жагсаалтад `МН` / `EN` тэмдэг.
- Мэдээний ангилал: "Нэр (English)" талбар.
- Хөтөлбөр (`ProgramForm`, `WorkDialog`): нэр, товч, их бие — таб; бүтээлийн гарчиг/тайлбарт English талбар.
- Бидний тухай (`about/page.tsx`): танилцуулга — таб; үзүүлэлт мөр бүрт "Шошго (English)"; `LeaderDialog` "Албан тушаал (English)"; `DepartmentList`/`TeacherTable` English талбарууд.
- Англи талбарууд заавал биш. Хадгалсны дараа одоогийн `afterSave`.

## 9. Алдаа ба хязгаарын тохиолдол

- API алдаа → одоогийнх шиг `null` → хэлтэй "Мэдээлэл түр байхгүй / Information is temporarily unavailable".
- `/fr/...` → 404 (хэлтэй not-found).
- `/en/news` хоосон → "No news yet."
- Англигүй мэдээ `/en/news/<slug>` → 404; хэл солих товч жагсаалт руу.
- Fallback: мэдээнээс бусад агуулгад EN хоосон бол MN текст харагдана (хуудас эвдрэхгүй).

## 10. Хэрэгжүүлэх дараалал

1. **Backend:** migration 0015, `localized`, `?lang` нийтийн API, мэдээний хэлний шүүлт/404/`languages`, админ schema `_en` талбарууд, улсын англи нэр, pytest.
2. **Frontend суурь:** `[lang]` шилжүүлэлт, `proxy.ts`, 3 root layout + хуваалцсан фонт, `lib/i18n`, `LangProvider`, header/footer толь бичгээр, хэл солих товч, hreflang. Монгол сайт өмнөхтэй яг ижил ажиллах ёстой.
3. **Нийтийн хуудсууд:** нүүр (hero, хөтөлбөр, мэдээ, төгсөлт + газрын зураг, байршил), бидний тухай (танилцуулга, түүх, хамт олон, тэнхим), мэдээ (жагсаалт, дэлгэрэнгүй, коммент шошго), хөтөлбөр (их бие, бүтээл, тэтгэлэг, ЭЕШ), элсэлт.
4. **Админ:** PostEditor таб, ангилал, хөтөлбөр, бидний тухай English талбарууд.

## 11. Шалгалт

- Backend: pytest — `localized` fallback; мэдээ `lang` шүүлт (жагсаалт, related); англигүй мэдээ 404; "аль нэг гарчиг заавал"; slug EN гарчгаас; `languages`; хөтөлбөр/бидний тухай EN fallback; одоогийн бүх тест ногоон.
- Frontend: `tsc --noEmit`, `eslint`. Локал браузер: `/` ба `/about` өмнөх шигээ (URL, агуулга); `/en`, `/en/about`, `/en/news`, `/en/news/<slug>` (EN бөглөсөн ба бөглөөгүй); `/en/programs/<slug>`; `MN | EN` товч бүх хуудсанд; `/mn/about` → `/about`; `/en/calendar` → `/calendar`; `/admin`, `/olympiad` эвдрээгүй; `<html lang>` зөв; console алдаагүй.
