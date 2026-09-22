/* Анги тутмын слот — мөр мөрөөр: "5-р анги [bar] 3/5 сул" (эсвэл админд "2/5"); доод талд "Нийт X/Y" мөр. */

import type { ClubQuota } from "@/lib/types";

function pctColor(taken: number, capacity: number) {
  const pct = capacity > 0 ? Math.min(100, Math.round((taken / capacity) * 100)) : 0;
  return { pct, color: pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-gold" : "bg-navy" };
}

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
        const { pct, color } = pctColor(q.taken, q.capacity);
        return (
          <div key={q.grade} className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <span className={`${compact ? "w-8" : "w-16"} shrink-0 text-slate-600`}>{q.grade}-р{compact ? "" : " анги"}</span>
            <div className={`${compact ? "h-1.5" : "h-2"} w-full overflow-hidden rounded-full bg-slate-200`} role="progressbar" aria-valuemin={0} aria-valuemax={q.capacity} aria-valuenow={q.taken} aria-label={`${q.grade}-р ангийн слот`}>
              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
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
