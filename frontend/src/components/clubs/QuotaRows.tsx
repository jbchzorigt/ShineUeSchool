/* Анги тутмын слот — мөр мөрөөр: "5-р анги [bar] 3/5 сул" (эсвэл админд "2/5"); доод талд "Нийт X/Y" мөр.
   Бар — MeterBar (дэлгэцэнд орж ирэхэд 0-ээс дүүрнэ, градиент, хөдөлгөөнт судал). */

import { MeterBar } from "@/components/site/MeterBar";
import type { ClubQuota } from "@/lib/types";

export function QuotaRows({ quotas, showLeft = false, total = true, compact = false }: {
  quotas: ClubQuota[]; showLeft?: boolean; total?: boolean; compact?: boolean;
}) {
  const cap = quotas.reduce((s, q) => s + q.capacity, 0);
  const taken = quotas.reduce((s, q) => s + q.taken, 0);
  const left = quotas.reduce((s, q) => s + q.slots_left, 0);
  const num = (q: { taken: number; capacity: number; slots_left: number }) =>
    showLeft ? <><span className="font-semibold">{q.slots_left}</span>/{q.capacity} сул</> : <><span className="font-semibold">{q.taken}</span>/{q.capacity}</>;
  return (
    <div className={compact ? "space-y-0.5 text-xs" : "space-y-1.5 text-sm"} aria-label="Анги тутмын слот">
      {quotas.map((q) => {
        return (
          <div key={q.grade} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <span className={`${compact ? "w-8" : "w-16"} shrink-0 text-slate-600`}>{q.grade}-р{compact ? "" : " анги"}</span>
            <MeterBar taken={q.taken} capacity={q.capacity} height={compact ? "h-1.5" : "h-2"} label={`${q.grade}-р ангийн слот`} />
            <span className={`whitespace-nowrap ${q.full ? "text-slate-500" : "text-ink"}`}>{num(q)}</span>
          </div>
        );
      })}
      {total && (
        <div className={`flex items-center justify-between border-t border-slate-200 pt-1 font-semibold text-navy ${compact ? "" : "text-sm"}`}>
          <span>Нийт</span>
          <span>{showLeft ? <>{left}/{cap} сул</> : <>{taken}/{cap}</>}</span>
        </div>
      )}
    </div>
  );
}
