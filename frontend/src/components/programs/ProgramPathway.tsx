/* Hero доторх жижиг «сургалтын зам»: 1–12-р анги 12 баганатай grid, мөр бүр хөтөлбөр (анги эхлэхээр эрэмбэлсэн), энэ хөтөлбөр
   алтан (цайвар hero дээр бараан) өнгөөр, бусад нь тунгалаг холбоос. Өгөгдөл: нийтлэгдсэн хөтөлбөрүүдийн grade_from/grade_to. Server component (JS-гүй). */

import Link from "next/link";
import { getDict, localePath, type Lang } from "@/lib/i18n";
import type { ProgramCard } from "@/lib/types";

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const span = (a: number, b: number) => (a === b ? String(a) : `${a}–${b}`);

export function ProgramPathway({ current, programs, light, lang = "mn" }: { current: string; programs: ProgramCard[]; light: boolean; lang?: Lang }) {
  const t = getDict(lang).programs;
  const rows = [...programs].sort((a, b) => a.grade_from - b.grade_from || b.grade_to - a.grade_to);
  const base = light ? "bg-white/15 text-white hover:bg-white/25" : "bg-ink/10 text-ink hover:bg-ink/20";
  return (
    <figure className={`flex w-full flex-col gap-3 rounded-2xl p-4 lg:w-[440px] ${light ? "bg-white/10" : "bg-white/35"}`}
            aria-label={t.pathwayAria(rows.map((p) => `${p.badge} ${span(p.grade_from, p.grade_to)}`).join(", "))}>
      <figcaption className={`text-xs font-bold uppercase tracking-wider ${light ? "text-white/75" : "text-ink/70"}`}>{t.pathway}</figcaption>
      <div className="grid grid-cols-[76px_repeat(12,minmax(0,1fr))] items-center gap-x-[3px] gap-y-2" aria-hidden="true">
        {rows.map((p, r) => {
          const on = p.slug === current;
          const style = { gridRow: r + 1, gridColumn: `${p.grade_from + 1} / ${p.grade_to + 2}` };
          const bar = `flex h-8 items-center justify-center rounded-lg text-xs font-bold transition ${on ? (light ? "bg-gold text-ink" : "bg-ink text-white") : base}`;
          return [
            <span key={`${p.slug}-l`} style={{ gridRow: r + 1, gridColumn: 1 }} className={`truncate pr-2 text-xs font-bold ${light ? "text-white" : "text-ink"}`}>{p.badge}</span>,
            on
              ? <span key={p.slug} style={style} className={bar}>{span(p.grade_from, p.grade_to)}</span>
              : <Link key={p.slug} href={localePath(lang, `/programs/${p.slug}`)} style={style} className={bar} tabIndex={-1}>{span(p.grade_from, p.grade_to)}</Link>,
          ];
        })}
        {GRADES.map((g) => (
          <span key={g} style={{ gridRow: rows.length + 1, gridColumn: g + 1 }} className={`text-center text-[11px] font-semibold ${light ? "text-white/70" : "text-ink/70"}`}>{g}</span>
        ))}
      </div>
    </figure>
  );
}
