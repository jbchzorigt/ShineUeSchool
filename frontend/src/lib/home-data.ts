/* =====================================================================
   Нүүр хуудасны өгөгдөл (түүх — /about, төгсөлт, хаяг, цэс).
   ⚠ Түүх, хаягийн хэсэг одоогоор жишээ мэдээлэл; бодит мэдээллээр солино.
   Мэдээ (Мэдээний булан) — src/lib/news-api.ts-ээр backend-ээс татна.
   ===================================================================== */

export interface HistoryEvent {
  /** Он; бодит он тодорхойгүй бол null (хуудсанд "[он]" гэж харагдана) */
  year: number | null;
  title: string;
  text: string;
  /** (Одоо ашиглагдахгүй — хуучин слайдер timeline-ийн дэвсгэр зураг; snake timeline зураг харуулдаггүй) */
  image?: string;
}

export const HISTORY: HistoryEvent[] = [
  { year: null, title: "Сургууль үүсгэн байгуулагдав", text: "[Хэн, хаана, хэдэн сурагчтай эхэлсэн. 2–3 өгүүлбэр.]" },
  { year: null, title: "Анхны төгсөлт", text: "[Анхны төгсөгчдийн тухай. 2–3 өгүүлбэр.]" },
  { year: null, title: "Шинэ хичээлийн байр", text: "[Барилга, лабораторийн тухай. 2–3 өгүүлбэр.]" },
  { year: null, title: "Ү.Маамын нэрэмжит анхны олимпиад", text: "[Анхны олимпиадын тухай. 2–3 өгүүлбэр.]" },
  { year: 2026, title: "Өнөөдөр", text: "[Сурагч, багш, тэнхмийн тоо. 2–3 өгүүлбэр.]" },
];

/** Төгсөлт (нүүрний Graduation.tsx): гарчиг, тайлбар. Тоонууд админаас (/admin/graduates → GET /api/graduates/stats/). */
export const GRADUATION = {
  title: "Төгсөгчид маань хаа сайгүй",
  text: "[Анхны төгсөлтөөс хойш сургуулийн төгсөгчид дотоод, гадаадын их дээд сургуульд суралцаж, олон салбарт амжилттай ажиллаж байна. 1–2 өгүүлбэр.]",
};

/* ---- Төгсөгчдийн газрын зураг (Graduation.tsx → GraduationMap.tsx) ---- */
/** Тив бүрийн өнгө (графикийн палитр): bullet, улсын дүүргэлт, нум. Түлхүүрүүд backend/app/graduates/countries.py-тэй ижил. */
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
  address: "Улаанбаатар хот, [дүүрэг], [хороо], [гудамж, байр]",
  phone: "[утас]",
  email: "[и-мэйл]",
  hours: "Даваа–Баасан, [цаг]",
  /** Google Maps-ийн холбоос */
  mapUrl: "https://maps.google.com/?q=Улаанбаатар",
  /** Google Maps embed URL; хоосон бол орлуулагч харагдана */
  mapEmbedUrl: "",
};

// Дээд цэс: зөвхөн тусдаа хуудсууд (нүүрний #хэсэг рүү анкор байхгүй).
// /olympiad нь header-т баруун талд "Олимпиад" + оны Bauhaus хавтантай тусдаа гарна (SiteHeader.tsx).
export const OLYMPIAD_HREF = "/olympiad";
export const NAV_LINKS = [
  { href: "/", label: "Нүүр" },
  { href: "/about", label: "Бидний тухай" },
  { href: "/news", label: "Мэдээ" },
  { href: "/calendar", label: "Календарь" },
  { href: "/clubs", label: "Дугуйлан" },
  { href: OLYMPIAD_HREF, label: "Олимпиад" },
];
