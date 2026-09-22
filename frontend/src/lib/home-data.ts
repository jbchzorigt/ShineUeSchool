/* =====================================================================
   Нүүр хуудасны өгөгдөл (түүх, хаяг, цэс).
   ⚠ Түүх, хаягийн хэсэг одоогоор жишээ мэдээлэл; бодит мэдээллээр солино.
   Мэдээ (Мэдээний булан) — src/lib/news-api.ts-ээр backend-ээс татна.
   ===================================================================== */

export interface HistoryEvent {
  /** Он; бодит он тодорхойгүй бол null (хуудсанд "[он]" гэж харагдана) */
  year: number | null;
  title: string;
  text: string;
  /** Слайдын дэвсгэр зураг, /public доторх зам (жишээ: /history/1995.jpg); байхгүй бол хөх дэвсгэр */
  image?: string;
}

export interface ProgramLogo {
  name: string;
  /** /public доторх зам; байхгүй бол нэрийг нь харуулна */
  src?: string;
}

export const PROGRAM_LOGOS: ProgramLogo[] = [
  { name: "Cambridge International" },
  { name: "IB Diploma Programme" },
];

/* "Давуу тал" хэсэг: 4 үзүүлэлт + 3 карт. Icon нэрс components/home/Advantages.tsx-ийн ICONS-оос. */
export type IconName = "students" | "teachers" | "trophy" | "clubs" | "cap" | "chart" | "star" | "book" | "layers" | "user" | "check" | "target" | "report" | "room" | "map" | "medal";

export interface Stat { icon: IconName; value: string; label: string }
export const STATS: Stat[] = [
  { icon: "students", value: "[1200+]", label: "Суралцагчид" },
  { icon: "teachers", value: "[80+]", label: "Багш нар" },
  { icon: "trophy", value: "3", label: "Олимпиадын шат" },
  { icon: "clubs", value: "[12]", label: "Дугуйлан" },
];

export interface Advantage { icon: IconName; title: string; items: { icon: IconName; text: string }[]; href: string }
export const ADVANTAGES: Advantage[] = [
  { icon: "cap", title: "Сургалтын давуу тал", href: "/olympiad", items: [
    { icon: "book", text: "Математикийн уламжлал" }, { icon: "layers", text: "Олимпиадын бэлтгэл" }, { icon: "user", text: "Гүнзгийрүүлсэн хөтөлбөр" } ] },
  { icon: "chart", title: "Хөгжлийг хэмжих", href: "/calendar", items: [
    { icon: "check", text: "Улирлын үнэлгээ" }, { icon: "target", text: "Олимпиадын үр дүн" }, { icon: "report", text: "Хөгжлийн тайлан" } ] },
  { icon: "star", title: "Орчин ба боломж", href: "/clubs", items: [
    { icon: "clubs", text: "Дугуйлангууд" }, { icon: "room", text: "Стандарт анги, лаборатори" }, { icon: "medal", text: "Тэмцээн, арга хэмжээ" } ] },
];

export const HISTORY: HistoryEvent[] = [
  { year: null, title: "Сургууль үүсгэн байгуулагдав", text: "[Хэн, хаана, хэдэн сурагчтай эхэлсэн. 2–3 өгүүлбэр.]" },
  { year: null, title: "Анхны төгсөлт", text: "[Анхны төгсөгчдийн тухай. 2–3 өгүүлбэр.]" },
  { year: null, title: "Шинэ хичээлийн байр", text: "[Барилга, лабораторийн тухай. 2–3 өгүүлбэр.]" },
  { year: null, title: "Ү.Маамын нэрэмжит анхны олимпиад", text: "[Анхны олимпиадын тухай. 2–3 өгүүлбэр.]" },
  { year: 2026, title: "Өнөөдөр", text: "[Сурагч, багш, тэнхмийн тоо. 2–3 өгүүлбэр.]" },
];

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

// Дээд цэс: зөвхөн тусдаа хуудсууд (нүүрний #хэсэг рүү анкор байхгүй)
export const NAV_LINKS = [
  { href: "/", label: "Нүүр" },
  { href: "/news", label: "Мэдээ" },
  { href: "/calendar", label: "Календарь" },
  { href: "/clubs", label: "Дугуйлан" },
  { href: "/olympiad", label: "Ү.Маамын нэрэмжит олимпиад" },
];
