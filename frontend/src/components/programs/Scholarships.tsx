/* Тэтгэлэгт хамрагдсан сурагчид: нийт дүн (шар), жилээрх дүнгийн график (ScholarshipChart, ApexCharts),
   оноор бүлэглэсэн (шинэ эхэнд — backend year DESC-ээр ирнэ) мөрүүд. */

import Image from "next/image";
import type { Scholarship } from "@/lib/types";
import { formatUsd } from "./money";
import { ScholarshipChart } from "./ScholarshipChart";

export function Scholarships({ items, total }: { items: Scholarship[]; total: number }) {
  const years = [...new Set(items.map((s) => s.year))];
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display text-[26px] font-extrabold text-navy lg:text-[32px]">Тэтгэлэгт хамрагдсан сурагчид</h2>
      <div className="flex flex-col gap-1 rounded-2xl bg-navy px-6 py-6 text-white lg:flex-row lg:items-baseline lg:gap-4 lg:px-8">
        <span className="font-display text-4xl font-extrabold text-gold lg:text-[48px]">{formatUsd(total)}</span>
        <span className="text-sm text-white/80 lg:text-base">нийт тэтгэлэг · {items.length} сурагч</span>
      </div>
      <ScholarshipChart items={items} />
      {years.map((y) => (
        <section key={y} aria-labelledby={`sch-${y}`} className="flex flex-col gap-2">
          <h3 id={`sch-${y}`} className="text-sm font-semibold uppercase tracking-wider text-muted">{y} он</h3>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
            {items.filter((s) => s.year === y).map((s) => (
              <li key={s.id} className="flex items-center gap-4 px-4 py-3 lg:px-6">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-navy text-center font-display text-lg font-extrabold leading-[48px] text-gold">
                  {s.photo ? <Image src={s.photo} alt="" fill unoptimized sizes="48px" className="object-cover" /> : s.student_name.trim().charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{s.student_name}</span>
                  {s.university && <span className="block truncate text-sm text-muted">{s.university}</span>}
                </span>
                <span className="whitespace-nowrap font-display text-lg font-extrabold text-navy">{formatUsd(s.amount_usd)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
