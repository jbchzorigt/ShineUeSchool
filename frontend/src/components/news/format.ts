/* Мэдээний огноо форматлах туслахууд. Улаанбаатарын цагийн бүсээр (Asia/Ulaanbaatar)
   харуулна — backend UTC-ээр хадгалдаг тул серверийн/хэрэглэгчийн local timezone-оос
   үл хамааран тогтвортой байх ёстой. */

import type { Lang } from "@/lib/i18n/paths";

const DATE_FIELDS: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" };
const TIME_FIELDS: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };

function partsOf(iso: string, extra: Intl.DateTimeFormatOptions): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat("mn-MN", { timeZone: "Asia/Ulaanbaatar", ...DATE_FIELDS, ...extra }).formatToParts(new Date(iso));
}

function value(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/** Англи: "19 Sep 2026" (+ ", 14:30") — Asia/Ulaanbaatar */
function formatEn(iso: string, time: boolean): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ulaanbaatar", day: "numeric", month: "short", year: "numeric", ...(time ? TIME_FIELDS : {}),
  }).format(new Date(iso));
}

/** ISO огноо-цаг → "2026.09.19" (Asia/Ulaanbaatar); англи "19 Sep 2026" */
export function formatDate(iso: string, lang: Lang = "mn"): string {
  if (lang === "en") return formatEn(iso, false);
  const parts = partsOf(iso, {});
  return `${value(parts, "year")}.${value(parts, "month")}.${value(parts, "day")}`;
}

/** ISO огноо-цаг → "2026.09.19, 14:30" (Asia/Ulaanbaatar); англи "19 Sep 2026, 14:30" */
export function formatDateTime(iso: string, lang: Lang = "mn"): string {
  if (lang === "en") return formatEn(iso, true);
  const parts = partsOf(iso, TIME_FIELDS);
  return `${value(parts, "year")}.${value(parts, "month")}.${value(parts, "day")}, ${value(parts, "hour")}:${value(parts, "minute")}`;
}
