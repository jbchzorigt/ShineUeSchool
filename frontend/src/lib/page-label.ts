/* Сайтын хандалтын замыг (админы "Их үзсэн хуудас") уншигдах нэр болгоно: эхний сегментээр хэсгийн нэр,
   /en угтвартай бол "(EN)" нэмнэ; мэдэгдэхгүй хэсэг бол замыг өөрийг нь буцаана. */

const SECTIONS: Record<string, string> = {
  "": "Нүүр",
  about: "Бидний тухай",
  admission: "Элсэлт",
  calendar: "Хуанли",
  clubs: "Дугуйлан",
  feed: "Мэдээ",
  news: "Мэдээ",
  olympiad: "Олимпиад",
  programs: "Хөтөлбөр",
  survey: "Судалгаа",
  timetable: "Хичээлийн хуваарь",
};

export function pageLabel(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const en = parts[0] === "en";
  const key = (en ? parts[1] : parts[0]) ?? "";
  if (!Object.hasOwn(SECTIONS, key)) return path;   // "constructor" г.м. prototype түлхүүрийг тоохгүй
  return en ? `${SECTIONS[key]} (EN)` : SECTIONS[key];
}
