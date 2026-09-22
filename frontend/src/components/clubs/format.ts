/* Дугуйлангийн текст форматууд (олон нийт + админ хоёуланд). Огноог Asia/Ulaanbaatar
   цагийн бүсээр харуулна — карт server дээр render хийгддэг тул серверийн/хэрэглэгчийн
   local timezone-оос үл хамааран тогтвортой байх ёстой (mirror: news/format.ts). */

import type { Club, ClubQuota, ClubState } from "@/lib/types";

export const EMAIL_DOMAIN = "shineue.edu.mn";
export const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export const STATE_LABEL: Record<ClubState, string> = { upcoming: "Удахгүй", open: "Бүртгэл нээлттэй", full: "Дүүрсэн", closed: "Хаагдсан" };
export const STATE_TONE: Record<ClubState, "slate" | "green" | "red"> = { upcoming: "slate", open: "green", full: "red", closed: "slate" };

/** [5,6,7,8] → "5–8-р анги"; [5,7,9] → "5, 7, 9-р анги"; [5] → "5-р анги" */
export function formatGrades(grades: number[]): string {
  const g = [...grades].sort((a, b) => a - b);
  if (g.length === 0) return "";
  const consecutive = g.every((v, i) => i === 0 || v === g[i - 1] + 1);
  const body = g.length > 1 && consecutive ? `${g[0]}–${g[g.length - 1]}` : g.join(", ");
  return `${body}-р анги`;
}

export function formatFee(c: Pick<Club, "is_paid" | "fee" | "fee_note">): string {
  if (!c.is_paid) return "Үнэгүй";
  const amount = `${c.fee.toLocaleString("en-US")}₮`;
  return c.fee_note ? `${amount} · ${c.fee_note}` : amount;
}

// "year" талбарыг эргэн ашиглахгүй ч зорилготойгоор оруулсан: Node-ийн ICU (сервер дээр) mn-MN
// локалийн "сар+өдөр" (жилгүй) skeleton-ийг рим тоогоор ("IX.21") гаргадаг боловч "жил+сар+өдөр"
// skeleton-ийг тоогоор ("09.21") гаргадаг — browser ICU хоёуланг нь тоогоор гаргадаг тул year-гүй бол
// server/client хооронд hydration mismatch үүсдэг (news/format.ts-ийн DATE_FIELDS үргэлж year агуулдагтай адил).
const MD_FIELDS: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" };
const TIME_FIELDS: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };

function partsOf(iso: string, extra: Intl.DateTimeFormatOptions): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat("mn-MN", { timeZone: "Asia/Ulaanbaatar", ...extra }).formatToParts(new Date(iso));
}

function value(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

function md(iso: string): string {
  const parts = partsOf(iso, MD_FIELDS);
  return `${value(parts, "month")}.${value(parts, "day")}`;
}

/** "09.25 – 10.05, 18:00 хүртэл" (Asia/Ulaanbaatar) */
export function formatPeriod(c: Pick<Club, "registration_start" | "registration_end">): string {
  const eParts = partsOf(c.registration_end, TIME_FIELDS);
  return `${md(c.registration_start)} – ${md(c.registration_end)}, ${value(eParts, "hour")}:${value(eParts, "minute")} хүртэл`;
}

export function quotaFor(club: Pick<Club, "quotas">, grade: number | null): ClubQuota | undefined {
  return grade === null ? undefined : club.quotas.find((q) => q.grade === grade);
}
