/* Харьцангуй хугацаа (админы нүүрний сэтгэгдэл г.м.): "Дөнгөж сая", "5 минутын өмнө", "3 цагийн өмнө", "2 өдрийн өмнө";
   7 хоног ба түүнээс өмнөх бол Улаанбаатарын (UTC+8) огноо "YYYY.MM.DD". Буруу огноо → "". */

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const UB_OFFSET = 8 * HOUR;

export function timeAgo(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = now.getTime() - t;
  if (diff < MIN) return "Дөнгөж сая";
  if (diff < HOUR) return `${Math.floor(diff / MIN)} минутын өмнө`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} цагийн өмнө`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} өдрийн өмнө`;
  const ub = new Date(t + UB_OFFSET);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ub.getUTCFullYear()}.${pad(ub.getUTCMonth() + 1)}.${pad(ub.getUTCDate())}`;
}
