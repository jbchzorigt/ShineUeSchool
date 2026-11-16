/* IB хичээлийн дугуйн туслахууд (SubjectWheel): бүлэглэх, тэмдгээс HL/SL таних, бүлгийн нэрийг богино + тайлбар болгох, цагираган хэсгийн SVG зам.
   Зөвхөн `import type` — node test-д шууд ачаалагдана. */

import type { ProgramSubject } from "./types";

export interface SubjectGroup { name: string; items: ProgramSubject[] }

/** Админы эрэмбээр бүлэглэнэ; бүлэггүй хичээлүүд сүүлд `otherName` нэртэй бүлэгт */
export function groupSubjects(subjects: ProgramSubject[], otherName: string): SubjectGroup[] {
  const groups: SubjectGroup[] = [];
  const rest: ProgramSubject[] = [];
  for (const s of subjects) {
    const name = s.group.trim();
    if (!name) { rest.push(s); continue; }
    const g = groups.find((x) => x.name === name);
    if (g) g.items.push(s); else groups.push({ name, items: [s] });
  }
  if (rest.length) groups.push({ name: otherName, items: rest });
  return groups;
}

/** Тэмдгээс HL, SL (бүтэн үг, том жижиг үсэг ялгахгүй) таниж, үлдсэн текстийг (тусгаарлагчгүй) буцаана */
export function levelsOf(tag: string): { hl: boolean; sl: boolean; rest: string } {
  const word = (w: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${w}(?=$|[^\\p{L}\\p{N}])`, "iu");
  const hl = word("HL").test(tag), sl = word("SL").test(tag);
  const rest = tag.replace(new RegExp(`(^|[^\\p{L}\\p{N}])(HL|SL)(?=$|[^\\p{L}\\p{N}])`, "giu"), "$1").replace(/^[\s·/,|+&-]+|[\s·/,|+&-]+$/g, "").trim();
  return { hl, sl, rest };
}

/** "Group 4 · Шинжлэх ухаан" → ["Group 4", "Шинжлэх ухаан"] (· - – : тусгаарлагч); тусгаарлагчгүй бол [нэр, ""] */
export function splitGroupName(name: string): [string, string] {
  const m = name.match(/^(.+?)\s*(?:·|:|\s[-–—]\s)\s*(.+)$/);
  return m ? [m[1].trim(), m[2].trim()] : [name.trim(), ""];
}

/** Дугуй 2–8 бүлэгт л уншигдахуйц (цөөн бол утгагүй, олон бол хэсэг хэт нарийн) */
export const wheelFits = (subjects: ProgramSubject[]) => { const n = groupSubjects(subjects, "").length; return n >= 2 && n <= 8; };

const fmt = (v: number) => String(+v.toFixed(2));

/** Өнцөг (градус, 0 = дээд цэг, цагийн зүүний дагуу) → цэг */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}

/** Цагираган хэсэг: дотор радиус r0, гадна r1, a0→a1 өнцөг (градус) */
export function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = polar(cx, cy, r1, a0), [x1, y1] = polar(cx, cy, r1, a1);
  const [x2, y2] = polar(cx, cy, r0, a1), [x3, y3] = polar(cx, cy, r0, a0);
  return `M ${fmt(x0)} ${fmt(y0)} A ${r1} ${r1} 0 ${large} 1 ${fmt(x1)} ${fmt(y1)} L ${fmt(x2)} ${fmt(y2)} A ${r0} ${r0} 0 ${large} 0 ${fmt(x3)} ${fmt(y3)} Z`;
}

/** Текстийн нум (textPath): дээд хагаст цагийн зүүний дагуу, доод хагаст эсрэг — бичиг хэзээ ч доошоо харахгүй */
export function labelArc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const mid = (a0 + a1) / 2;
  const bottom = mid > 90 && mid < 270;
  const [s, e] = bottom ? [a1, a0] : [a0, a1];
  const [x0, y0] = polar(cx, cy, r, s), [x1, y1] = polar(cx, cy, r, e);
  return `M ${fmt(x0)} ${fmt(y0)} A ${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${bottom ? 0 : 1} ${fmt(x1)} ${fmt(y1)}`;
}
