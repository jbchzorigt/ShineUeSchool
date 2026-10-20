/* =====================================================================
   Нүүр хуудасны өгөгдөл (түүх — /about, төгсөлт, хаяг, цэс).
   Түүх (2003–2026) — School Profile 2026-27 ба 2022–2026 оны тайлангаас; хаяг бодит.
   Мэдээ (Мэдээний булан) — src/lib/news-api.ts-ээр backend-ээс татна.
   Хэлтэй өгөгдөл `Record<Lang, …>` хэлбэртэй (mn / en).
   ===================================================================== */

import type { Lang } from "./i18n/paths";

export interface HistoryEvent {
  /** Он; бодит он тодорхойгүй бол null (хуудсанд "[он]" гэж харагдана) */
  year: number | null;
  title: string;
  text: string;
  /** (Одоо ашиглагдахгүй — хуучин слайдер timeline-ийн дэвсгэр зураг; snake timeline зураг харуулдаггүй) */
  image?: string;
}

const HISTORY_MN: HistoryEvent[] = [
  // Он бүр нэг онцлох үйл явдал. Эх сурвалж: School Profile 2026-2027, 2022–2026 оны төгсөгчдийн тайлан.
  // ⚠ [ ] хаалттай онуудын үйл явдал баримтад байхгүй — сургуулиас бөглөнө.
  { year: 2003, title: "Сургууль үүсгэн байгуулагдав", text: "Монгол Улсын Ардын багш Ү.Маамын удирдлагаар 86 сурагч, 11 багштайгаар үйл ажиллагаагаа эхлүүлэв. Математик, англи хэлний гүнзгийрүүлсэн сургалт сургуулийн онцлог болов." },
  { year: 2004, title: "[2004 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2005, title: "[2005 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2006, title: "[2006 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2007, title: "[2007 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2008, title: "[2008 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2009, title: "[2009 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2010, title: "[2010 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2011, title: "[2011 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2012, title: "[2012 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2013, title: "[2013 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2014, title: "[2014 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2015, title: "[2015 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2016, title: "[2016 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2017, title: "[2017 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2018, title: "Монголд анх удаа IB Diploma Programme", text: "Олон улсын бакалаврын (IB) дипломын хөтөлбөрийг Монгол Улсад анх удаа хэрэгжүүлж, 11–12-р ангийн сурагчид IB Diploma-тай төгсөх боломжтой болов." },
  { year: 2019, title: "[2019 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2020, title: "[2020 оны онцлох үйл явдал]", text: "[Тухайн оны онцлох үйл явдлын тайлбар — 1–2 өгүүлбэр.]" },
  { year: 2021, title: "Cambridge International School", text: "Cambridge International School болж, 6–8-р ангид Cambridge Lower Secondary (Checkpoint), 9–10-р ангид Cambridge IGCSE хөтөлбөрийг нэвтрүүлэв." },
  { year: 2022, title: "48 төгсөгч, гадаадад 19", text: "Цөм хөтөлбөрөөс 34, IB-ээс 14 сурагч төгсөж, 19 нь гадаадын их, дээд сургуульд элсэв. Төгсөгчид нийт $397 мянган тэтгэлэг хүртэв." },
  { year: 2023, title: "Тэтгэлэг $1.98 сая", text: "38 төгсөгчийн 22 нь гадаадад элсэв (IB төгсөгчдийн 87.5%). Нийт тэтгэлэг $1.98 сая болж өмнөх жилээс 5 дахин өсөв." },
  { year: 2024, title: "67 төгсөгч, IB-ийн хамгийн олон анги", text: "Цөм 42, IB 25 сурагч төгсөж 33 нь гадаадад элсэв. Cambridge IGCSE-ийн дундаж 62.4, IB шалгалтын дүнгээр Mongolian Literature 5.9 оноотой тэргүүлэв." },
  { year: 2025, title: "Тэтгэлэг $9.9 сая", text: "77 төгсөгчийн 50 нь гадаадад элсэж, нийт тэтгэлэг $9.93 сая болов (IB $8.4 сая). IGCSE-ийн дундаж 69.6 болж өсөв." },
  { year: 2026, title: "1670 сурагч, $14.25 сая тэтгэлэг", text: "92 төгсөгчийн 56 нь гадаадад элсэж, 13 улсын 120 гаруй сургуульд хүлээн авагдав; тэтгэлэг $14.25 сая. IGCSE-д Business, IB-д ESS, Computer Science шалгалт анх удаа. Сургууль 1670 сурагч, 150 ажилтантай." },
];

/** Англи түүх: баримттай онуудын орчуулга; бусад он монгол хувилбартай адил placeholder (сургуулиас бөглөнө). */
const HISTORY_EN_KNOWN: Record<number, Omit<HistoryEvent, "year">> = {
  2003: { title: "The school is founded", text: "Founded under the leadership of U. Maam, People’s Teacher of Mongolia, with 86 students and 11 teachers. In-depth mathematics and English became the school’s hallmark." },
  2018: { title: "Mongolia’s first IB Diploma Programme", text: "The school became the first in Mongolia to offer the International Baccalaureate Diploma Programme, allowing Grade 11–12 students to graduate with the IB Diploma." },
  2021: { title: "Cambridge International School", text: "Became a Cambridge International School, introducing Cambridge Lower Secondary (Checkpoint) in Grades 6–8 and Cambridge IGCSE in Grades 9–10." },
  2022: { title: "48 graduates, 19 abroad", text: "34 National Curriculum and 14 IB students graduated; 19 enrolled at universities abroad. Graduates received $397,000 in scholarships." },
  2023: { title: "$1.98 million in scholarships", text: "22 of 38 graduates enrolled abroad (87.5% of IB graduates). Scholarships reached $1.98 million — five times the previous year." },
  2024: { title: "67 graduates, the largest IB cohort", text: "42 National Curriculum and 25 IB students graduated, 33 of them enrolling abroad. The Cambridge IGCSE average was 62.4; Mongolian Literature led the IB results with 5.9." },
  2025: { title: "$9.9 million in scholarships", text: "50 of 77 graduates enrolled abroad, with scholarships totalling $9.93 million ($8.4 million to IB graduates). The IGCSE average rose to 69.6." },
  2026: { title: "1,670 students, $14.25 million in scholarships", text: "56 of 92 graduates enrolled abroad, admitted to more than 120 institutions in 13 countries; scholarships totalled $14.25 million. First IGCSE Business and IB ESS and Computer Science exams. The school has 1,670 students and 150 staff." },
};

export const HISTORY: Record<Lang, HistoryEvent[]> = {
  mn: HISTORY_MN,
  en: HISTORY_MN.map((e) => ({
    year: e.year,
    ...(e.year && HISTORY_EN_KNOWN[e.year]
      ? HISTORY_EN_KNOWN[e.year]
      : { title: `[${e.year ?? "Year"} highlight]`, text: "[Short description of the year’s key event — 1–2 sentences.]" }),
  })),
};

/* ---- Төгсөгчдийн газрын зураг (Graduation.tsx → GraduationMap.tsx) ---- */
/** Тив бүрийн өнгө (графикийн палитр): bullet, улсын дүүргэлт, нум. Түлхүүрүүд backend/app/graduates/countries.py-тэй ижил.
    `name` — админд (монгол); нийтийн хуудас тивийн нэрийг толь бичгээс (home.graduation.continents). Төгсөлтийн гарчиг/тайлбар ч толь бичигт. */
export const CONTINENTS = {
  asia: { name: "Ази", color: "#2EC23C" },
  europe: { name: "Европ", color: "#FFF457" },
  north_america: { name: "Хойд Америк", color: "#FFAB1A" },
  oceania: { name: "Австрали, Далайн орнууд", color: "#D1460A" },
  other: { name: "Бусад", color: "#980B01" },
} as const;
export type Continent = keyof typeof CONTINENTS;
/** Монгол — нумын эхлэл (Улаанбаатар). Очсон улсууд админаас (/admin/graduates, backend каталог). */
export const MONGOLIA = { numeric: "496", name: "Монгол", coords: [106.9, 47.9] as [number, number] };

export const CONTACT = {
  // Утас, и-мэйл — сургуулийн албан ёсны (хэрэглэгчийн өгсөн). Хаяг, ажлын цаг хэлээр — толь бичигт (home.location).
  phone: "(+976) 7012 8044",
  email: "info@shineue.edu.mn",
  /** Google Maps-ийн холбоос (сургуулийн place, cid) */
  mapUrl: "https://www.google.com/maps?cid=17290213854975683691",
  /** Google Maps embed URL (ижил place, output=embed); хоосон бол орлуулагч харагдана */
  mapEmbedUrl: {
    mn: "https://www.google.com/maps?cid=17290213854975683691&output=embed&hl=mn",
    en: "https://www.google.com/maps?cid=17290213854975683691&output=embed&hl=en",
  } as Record<Lang, string>,
};

// Дээд цэс: href-үүд хэлгүй зам (харуулахдаа localePath(lang, href)); хагасыг логоны зүүн, үлдсэнийг баруун талд.
// /olympiad нь монгол header-т баруун талд "Олимпиад" + оны Bauhaus хавтантай тусдаа гарна (SiteHeader.tsx); англи цэсэнд байхгүй.
export const OLYMPIAD_HREF = "/olympiad";
export interface NavLink { href: string; label: string }
/** Дээд цэс: энгийн холбоос эсвэл drop-down бүлэг (children). Монгол "Бүртгэл" бүлэг: Дугуйлан, Судалгаа, Элсэлт. */
export type NavItem = NavLink | { label: string; children: NavLink[] };
export const NAV_LINKS: Record<Lang, NavItem[]> = {
  mn: [
    { href: "/", label: "Нүүр" },
    { href: "/about", label: "Бидний тухай" },
    { href: "/news", label: "Мэдээ" },
    { href: "/calendar", label: "Календарь" },
    { label: "Бүртгэл", children: [
      { href: "/clubs", label: "Дугуйлан" },
      { href: "/survey", label: "Судалгаа" },
      { href: "/admission", label: "Элсэлт" },
    ] },
  ],
  // Англи: зөвхөн англи хувилбартай хуудсууд (календарь, дугуйлан, судалгаа, олимпиад монголоор л)
  en: [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/news", label: "News" },
    { href: "/#programs", label: "Programs" },
    { href: "/admission", label: "Admission" },
    { href: "/#location", label: "Contact" },
  ],
};
/** Хөлийн холбоосууд (дээд цэстэй ижил дараалал). */
export const FOOTER_LINKS: Record<Lang, NavLink[]> = {
  mn: [
    { href: "/about", label: "Бидний тухай" },
    { href: "/news", label: "Мэдээ" },
    { href: "/calendar", label: "Календарь, хуваарь" },
    { href: "/clubs", label: "Дугуйлан" },
    { href: "/survey", label: "Судалгаа" },
    { href: "/admission", label: "Элсэлт" },
    { href: OLYMPIAD_HREF, label: "Олимпиад" },
  ],
  en: [
    { href: "/about", label: "About" },
    { href: "/news", label: "News" },
    { href: "/#programs", label: "Programs" },
    { href: "/admission", label: "Admission" },
    { href: "/#location", label: "Contact" },
  ],
};
