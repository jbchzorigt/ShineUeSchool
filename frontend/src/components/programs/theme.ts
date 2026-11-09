/* Хөтөлбөрийн хуудасны өнгө: hero-ийн дэвсгэр, бичгийн өнгө, графикийн өнгөний шкал (цайвар → тод). Бүх хөтөлбөр сургуулийн navy-г
   хэрэглэнэ (Cambridge, Үндэсний-д тусдаа өнгө туршсан ч сайтын үндсэн өнгө рүү буцаасан). Хөтөлбөрт өөр өнгө хэрэгтэй бол THEMES-д slug-аар нэмнэ. */

export interface ProgramTheme {
  hero: string;
  /** hero дээрх бичиг цагаан (true) эсвэл бараан (false) */
  light: boolean;
  /** графикийн шкал: цайвар (эхний он) → тод (сүүлийн он) */
  scale: [string, string];
}

const NAVY: ProgramTheme = { hero: "#1e3a8f", light: true, scale: ["#8fa3d6", "#1e3a8f"] };
const THEMES: Record<string, ProgramTheme> = {};

export const themeFor = (slug: string): ProgramTheme => THEMES[slug] ?? NAVY;

/** Сурагчдын бүтээлийн булан нийтийн хуудсанд (хэсэг, tab, KPI) — одоогоор нуусан. Өгөгдөл ба админы таб хэвээр; буцааж харуулах бол true. */
export const SHOW_WORKS = false;

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/** a → b хооронд n өнгө (n=1 → зөвхөн b) — dumbbell-ийн цуврал бүрт (он) нэг өнгө */
export function ramp([a, b]: [string, string], n: number): string[] {
  if (n <= 1) return [b];
  const [x, y] = [hex(a), hex(b)];
  return Array.from({ length: n }, (_, k) => "#" + x.map((v, i) => Math.round(v + ((y[i] - v) * k) / (n - 1)).toString(16).padStart(2, "0")).join(""));
}

/** Тэнхлэгийн "дугуй" хязгаар: өгөгдлийн мужаас бага зэрэг өргөн, алхам 1/10/20/50 */
export function niceRange(values: number[], floor = 0, ceil = Infinity) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = Math.max(hi - lo, 1);
  const step = span <= 8 ? 1 : span <= 60 ? 10 : span <= 200 ? 20 : 50;
  const pad = span * 0.12;
  const min = Math.max(floor, Math.floor((lo - pad) / step) * step);
  const max = Math.min(ceil, Math.ceil((hi + pad) / step) * step);
  return { min, max, ticks: Math.round((max - min) / step) };
}

/** 1 оронтой бутархай, илүү тэггүй: 74 → "74", 69.6 → "69.6" */
export const num = (v: number) => String(Math.round(v * 10) / 10);
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
export const signed = (v: number) => (v > 0 ? `+${num(v)}` : num(v));
/** Хуримтлагдсан нийлбэр: [10, 14, 20] → [10, 24, 44] (гадаадад элссэн тоо, тэтгэлгийн дүнгийн графикт) */
export const cumulative = (values: number[]) => values.reduce<number[]>((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], []);
