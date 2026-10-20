/* Монгол толь бичиг — эх бүтэц. `Dict` төрөл эндээс; en.ts ижил бүтэцтэй байх ёстой (түлхүүр дутвал tsc алдаа).
   Хэсэг бүрийг тухайн хуудас/компонентын task нэмнэ: meta, common, nav, footer, home, about, news, programs, admission. */

export const mn = {
  meta: {
    siteName: "Шинэ Үе сургууль",
    defaultDescription: "Шинэ Үе сургуулийн албан ёсны вэб сайт: мэдээ, Ү.Маамын нэрэмжит математикийн олимпиад, сургуулийн түүх, хаяг.",
    /** "Мэдээ" → "Мэдээ — Шинэ Үе сургууль" */
    title: (page: string) => `${page} — Шинэ Үе сургууль`,
  },
  common: {
    unavailable: "Мэдээлэл түр байхгүй.",
    notFoundTitle: "Хуудас олдсонгүй",
    notFoundText: "Таны хайсан хуудас байхгүй эсвэл зөөгдсөн байна.",
    backHome: "Нүүр хуудас руу",
    loading: "Ачаалж байна",
  },
  nav: {
    main: "Үндсэн цэс",
    left: "Үндсэн цэс, зүүн",
    right: "Үндсэн цэс, баруун",
    logo: "Шинэ Үе сургууль, нүүр хуудас",
    logoAlt: "Шинэ Үе сургууль",
    open: "Цэс нээх",
    close: "Цэс хаах",
    olympiad: "Олимпиад",
    language: "Хэл сонгох",
  },
  footer: {
    name: "Шинэ Үе сургууль",
    pages: "Хуудсууд",
  },
};

export type Dict = typeof mn;
