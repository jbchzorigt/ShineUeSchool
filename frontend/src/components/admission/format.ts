/* Элсэлтийн шошго, өнгө. RESULT_LABEL — админд (монгол); нийтийн хуудсууд толь бичгийн `admission.result`-ийг хэрэглэнэ. */

import type { AdmissionResult, AdmissionSectionAdmin } from "@/lib/types";

export const RESULT_LABEL: Record<AdmissionResult, string> = { passed: "Тэнцсэн", waitlist: "Нөөц", failed: "Тэнцээгүй", absent: "Ирээгүй" };
export const RESULT_TONE: Record<AdmissionResult, "green" | "gold" | "slate" | "red"> = { passed: "green", waitlist: "gold", failed: "slate", absent: "red" };
export const RESULT_ORDER: AdmissionResult[] = ["passed", "waitlist", "failed", "absent"];

/** Админы хэсгийн төлөв: асаалттай / унтраалттай / хугацаа дуусч автоматаар унтарсан. */
export function sectionStatus(s: AdmissionSectionAdmin): { label: string; tone: "green" | "slate" | "red" } {
  if (s.enabled) return { label: "Асаалттай — сайтад харагдаж байна", tone: "green" };
  if (s.expired) return { label: "Хугацаа дууссан — автоматаар унтарсан", tone: "red" };
  return { label: "Унтраалттай — сайтад харагдахгүй", tone: "slate" };
}

/** Ангиудын хүрээ: [1,2,3] → "1–3", [1,6] → "1, 6". Хэлний шошгыг толь бичиг нэмнэ (`admission.grades`). */
export function gradeSpan(grades: number[]): string {
  const g = [...grades].sort((a, b) => a - b);
  const consecutive = g.every((v, i) => i === 0 || v === g[i - 1] + 1);
  return g.length > 1 && consecutive ? `${g[0]}–${g[g.length - 1]}` : g.join(", ");
}

/** Хайлтын оролтыг кодтой харьцуулах хэлбэрт: зай, зураас хасна, том үсэг ("su27 7kq" → "SU277KQ"). */
export function codeKey(s: string): string {
  return s.replace(/[\s-]+/g, "").toUpperCase();
}

export function formatScore(n: number | null): string {
  if (n === null) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(n * 10 === Math.round(n * 10) ? 1 : 2);
}
