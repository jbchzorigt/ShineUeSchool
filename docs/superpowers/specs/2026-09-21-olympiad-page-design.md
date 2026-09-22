# Олимпиадын хуудсыг Next.js рүү шилжүүлэх — дизайн

Огноо: 2026-09-21. Төлөв: батлагдсан, хэрэгжүүлэх төлөвлөгөө бичих шатанд.

## 1. Зорилго ба хамрах хүрээ

Repo-ийн үндсэн хавтас дахь статик прототипийг (`index.html`, `style.css`, `main.js`, `nav.js`, `hero.js`, `album.js`, `schedule.js`, `results.js`, `headings.js`, `formulas.js`, `smooth.js`) Next.js сайтын `/olympiad` хуудас болгон **1:1 харагдац, бүх анимацитай** шилжүүлнэ. Хуваарь, үр дүн, албум одоо байгаа `/api/olympiad/*`-аас ирнэ; намтар, "тухай", холбоо барих текст, Маам багшийн хөрөг зураг админаас засагдана. Шилжүүлсний дараа прототипийн файлуудыг устгана.

Хамрахгүй: олимпиадын бүртгэлийн форм, англи хувилбар, дизайны өөрчлөлт.

Ажлын журам: commit, push хийхгүй; local тест дууссаны дараа push.

## 2. Хувилбарын сонголт

Сонгосон: **React бүрдэл + `useGSAP` порт**. Прототипийн JS модуль бүр нэг client компонент болно; DOM-д SVG үүсгэдэг imperative код ref дотор хэвээр ажиллана; CSS-ийн класс нэрс хэвээр. GSAP 3.15 (npm) бүх plugin-ийг агуулна (DrawSVG, MotionPath, ScrollTrigger, ScrollSmoother, SplitText); KaTeX npm-ээс. Татгалзсан: статик файлыг public-д хуулах (API интеграцигүй), declarative дахин бичих (1:1 алдагдах эрсдэл, 2–3 дахин их ажил).

## 3. Frontend бүтэц

```
frontend/src/app/olympiad/
  layout.tsx           # SiteHeader/SiteFooter ашиглахгүй; metadata; katex css import
  page.tsx             # server component: бүх өгөгдлийг Promise.all-оор татаж OlympiadPage-д дамжуулна
  olympiad.css         # прототипийн style.css; бүх сонгогч `.olympiad` root дор (globals.css-тэй зөрчилдөхгүй)
frontend/src/components/olympiad/
  OlympiadPage.tsx     # "use client"; .olympiad root, #smooth-wrapper > #smooth-content, секцүүдийн дараалал
  Nav.tsx              # topbar: лого DrawSVG, долгион зам + MotionPath дүрсүүд, hover доогуур зураас, "← Сургуулийн сайт" (/) холбоос
  Hero.tsx             # намтар + хөрөг (props: page settings); hero-art DrawSVG, хүрээ
  Album.tsx            # props: AlbumPhoto[]; SplitText тайлбар, auto 6 сек, prev/next/dots/progress
  Schedule.tsx         # props: Stage[] (бүх он); оны таб state; "могой" зам DrawSVG scrub + MotionPath үзүүр
  Results.tsx          # props: Result[] (бүх он), CategoryItem[]; он/ангийн таб; оноо тоолох; медалийн өнгө
  YearTiles.tsx        # "2026" Bauhaus хавтан (main.js); он = хуваарийн хамгийн сүүлийн жил (хуваарьгүй бол одоогийн он); replay/shuffle
  About.tsx            # props: page settings (about_title, about_lead, stats)
  Contact.tsx          # props: page settings (contact_*)
  useHeadingArt.ts     # .h2 бүрийн геометр чимэглэл (headings.js) — секц компонентууд гарчгийн ref-ээ өгч дуудна
  Formulas.tsx         # секц бүрийн KaTeX томъёо (formulas.js): props { items: Formula[] }
  gsap.ts              # gsap + бүх plugin-ийг нэг удаа registerPlugin; `reduceMotion()` туслах
  useSmoother.ts       # ScrollSmoother үүсгэх/устгах, "#id" холбоосуудыг smoother.scrollTo болгох
frontend/src/lib/olympiad-api.ts   # server-side fetch (news-api.ts загвар, revalidate 60, алдаанд null)
frontend/src/lib/olympiad-data.ts  # статик чимэглэл: секц бүрийн томъёо { tex, grade, speed, cls }, хавтангийн өнгө/хээ (main.js-ийн C, DIGITS)
```

- `page.tsx` нь `fetchOlympiadPage()`, `fetchOlympiadYears()`, `fetchOlympiadSchedule()` (бүх он), `fetchOlympiadResults()` (бүх он), `fetchOlympiadAlbum()`-ийг зэрэг татна. Аль нэг нь `null` бол тухайн секц "Мэдээлэл түр байхгүй" гэсэн мөртэй харагдана; хуудас тасрахгүй. Албум хоосон бол секц бүхэлдээ нуугдана.
- Он солих (Schedule, Results) client state; өгөгдөл эхэнд бүгд татагдсан. `Result.rank`, `category_label` backend-ээс — `results.js`-ийн локал эрэмбэлэлт/байр тооцоолол хасагдана. Үр дүнгийн ангийн табууд `categories/?year=` логиктой ижил: тухайн онд өгөгдөлтэй ангиллууд.
- Портрет байхгүй бол прототипийн `.no-img` орлуулагч; албумын зураг ачаалагдахгүй бол мөн адил.
- Нүүр (`NAV_LINKS`) ба хөлийн `/olympiad` холбоосууд хэвээр ажиллана.

## 4. Backend — хуудасны тохиргоо

Хүснэгт `olympiad_page` (нэг мөр, `id=1`; `GET` дуудахад байхгүй бол анхдагч утгаар үүсгэнэ):

| Талбар | Төрөл | Анхдагч |
|---|---|---|
| id | int PK | 1 |
| eyebrow | String(80) | "Монгол Улсын Ардын багш" |
| title | String(160) | "Ү.Маамын нэрэмжит математикийн олимпиад" |
| bio | Text | прототипийн намтрын текст |
| portrait_image | String(255) nullable | null |
| portrait_caption | String(160) | "Монгол Улсын Ардын багш Ү.Маам" |
| about_title | String(160) | "Математикт дурлах залуу үеийг дэмжинэ" |
| about_lead | Text | прототипийн текст |
| stats | JSONB `[{value: str, label: str}]` | `[{"2026","Олимпиадын жил"},{"6–12","Анги"},{"3","Шат"}]` |
| contact_address | String(200) | "Улаанбаатар хот" |
| contact_phone | String(60) | "+976 0000-0000" |
| contact_email | String(120) | "info@shine-ue.edu.mn" |

Migration `0007_olympiad_page` (мөр оруулахгүй; код анхдагч мөрийг үүсгэнэ).

Endpoint-ууд (`app/olympiad/router.py`-д нэмнэ, схем `schemas.py`):

| Endpoint | Эрх | Тайлбар |
|---|---|---|
| `GET /api/olympiad/page/` | нээлттэй | бүх талбар; `portrait_image` → бүтэн URL (`album_out`-той ижил `media_base_url` логик) эсвэл null |
| `PATCH /api/olympiad/page/` | staff | бүх талбар optional; `stats` 1–4 элемент, `value`/`label` хоосон биш, урт ≤ 40/80 → зөрчвөл 400 `stats` |
| `POST /api/olympiad/page/portrait/` | staff | multipart `image`, `save_upload(image, "olympiad")`; хуучин файлыг устгана; хариу `GET`-тэй ижил |
| `DELETE /api/olympiad/page/portrait/` | staff | файл устгаж `portrait_image=null`; хариу `GET`-тэй ижил |

Тест: анхдагч мөр автоматаар үүсэх; PATCH текст/stats; stats алдаа (5 элемент, хоосон label) → 400 `stats`; портрет upload → URL, дахин upload хуучныг солих, DELETE → null; staff биш → 401/403.

## 5. Админ

- Цэс: "Олимпиадын хуудас" (`/admin/olympiad-page`, бүх staff-д — олимпиадын бусад хуудастай адил).
- Нэг хуудас, нэг форм (`useFetch` + `ApiError.fieldErrors`): eyebrow, title, bio (textarea), about_title, about_lead (textarea), stats мөрүүд (value/label, нэмэх/хасах, 1–4), contact_address/phone/email, "Хадгалах" → PATCH. Портрет: одоогийн зураг/орлуулагч, "Зураг сонгох" → шууд upload, "Устгах" → DELETE (файл сонгомогц илгээнэ, текст форм тусдаа хадгалагдана).
- `api.olympiadPage = { get, update, setPortrait, removePortrait }`, `types.ts`-д `OlympiadPage`, `OlympiadStat`.

## 6. Анимацийн порт

- Компонент бүр `useGSAP(() => {...}, { scope: rootRef, dependencies })` (`@gsap/react`): tween/ScrollTrigger context-оор цэвэрлэгдэнэ; өөрөө үүсгэсэн DOM SVG-г буцаах функцээр устгана.
- `gsap.ts`: `gsap.registerPlugin(ScrollTrigger, ScrollSmoother, DrawSVGPlugin, MotionPathPlugin, SplitText)` нэг удаа; `reduceMotion()` = `matchMedia("(prefers-reduced-motion: reduce)").matches`. Reduced motion үед прототипийнх шиг: анимаци алгасаж эцсийн төлөв, ScrollSmoother үүсгэхгүй.
- ScrollSmoother `OlympiadPage`-ийн `useGSAP` дотор үүснэ (`smooth: 1.2, effects: false, smoothTouch: 0.1`); `useSmoother` нь instance-ийг ref-д хадгалж, `#id` анкоруудыг `scrollTo(target, true, "top <navH>")` болгоно. Хүүхэд компонентуудын ScrollTrigger-ууд smoother-ийн дараа үүсэх нь чухал: `OlympiadPage` smoother-ийг үүсгэсний дараа `ready` state-ийг true болгож, секцүүд тэр үед л render болно (нэг frame-ийн хоцрогдол, харагдахгүй).
- Хэмжээ өөрчлөгдөхөд дахин тооцоолох (nav долгион, могой зам): `ResizeObserver` + `ScrollTrigger.refresh()`, прототипийнхтэй ижил логик.
- Он солиход `dependencies: [year]` → анимаци дахин үүснэ (могой зам дахин зурагдана, оноо дахин тоолно).
- KaTeX: `katex.renderToString(tex, { throwOnError: false })` client дээр; `katex/dist/katex.min.css` layout-д.
- Nav: прототипийн 3 анкор (Нүүр, Хуваарь, Үр дүн) + "2026" хавтан руу холбоос + "← Сургуулийн сайт" (`/`, Next `Link`).

## 7. Цэвэрлэгээ, баримт

- Устгана: `index.html`, `style.css`, `main.js`, `nav.js`, `hero.js`, `album.js`, `schedule.js`, `results.js`, `headings.js`, `formulas.js`, `smooth.js`, `images/`, `.claude/dev-server.js`; `.claude/launch.json`-оос `static` тохиргоо.
- README: "Прототип (статик хуудас)" хэсгийг "/olympiad — Next.js хуудас (олон нийт), /admin/olympiad-page (тохиргоо)" болгон солино.
- Frontend dependency: `katex` (+ `@types/katex`); `gsap`, `@gsap/react` аль хэдийн байгаа.

## 8. Тест ба шалгалт

- Backend pytest (§4). Frontend `tsc --noEmit`, eslint.
- Browser: `/olympiad` desktop ба mobile (375px): nav анимаци, hero DrawSVG, албум auto/prev/next/dots, хуваарийн он солих + могой зам scrub, үр дүнгийн он/анги таб + оноо тоолох + медалийн өнгө, "2026" replay/shuffle, томъёоны parallax, холбоо барих; `/`-ээс `/olympiad` руу, буцах; reduced-motion үед (JS-ээр `matchMedia` override) анимацигүй ч бүх агуулга харагдана; console алдаагүй; admin `/admin/olympiad-page`-ээс текст, портрет солиход хуудсанд тусах.
- Хуучин прототипийг устгасны дараа `git status`-д устгасан файлууд staged; сайт бүхэлдээ tsc/eslint цэвэр.
