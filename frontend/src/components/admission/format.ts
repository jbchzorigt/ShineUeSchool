/* Элсэлтийн шошго, өнгө (олон нийт + админ). */

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

/** Хайлтын оролтыг кодтой харьцуулах хэлбэрт: зай, зураас хасна, том үсэг ("su27 7kq" → "SU277KQ"). */
export function codeKey(s: string): string {
  return s.replace(/[\s-]+/g, "").toUpperCase();
}

export function formatScore(n: number | null): string {
  if (n === null) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(n * 10 === Math.round(n * 10) ? 1 : 2);
}
