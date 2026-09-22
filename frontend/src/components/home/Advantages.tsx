/* "Давуу тал" хэсэг: 4 үзүүлэлтийн мөр + 3 дугаарласан карт (icon, 3 мөр, "Дэлгэрэнгүй →").
   Өгөгдөл home-data.ts (STATS, ADVANTAGES). Картууд Reveal stagger-аар дараалан гарч ирнэ. */

import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { ADVANTAGES, STATS, type IconName } from "@/lib/home-data";

/* Нимгэн шугаман icon-ууд (24×24, currentColor) */
const PATHS: Record<IconName, string> = {
  students: "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-12 9a8 8 0 0 1 16 0M18 8a3 3 0 1 1 3 5",
  teachers: "M4 4h16v10H4zM12 14v6M8 20h8",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6",
  clubs: "M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6L7.1 18.2l.9-5.5-4-3.9L9.5 8z",
  cap: "M3 9l9-4 9 4-9 4-9-4Zm4 3v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4M21 9v5",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  star: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5ZM4 19a2 2 0 0 1 2-2h13",
  layers: "M12 3l9 5-9 5-9-5 9-5Zm-9 9l9 5 9-5M3 16l9 5 9-5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  check: "M4 12l5 5L20 6",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  report: "M6 3h9l4 4v14H6zM15 3v4h4M9 13h6M9 17h6",
  room: "M3 21V8l9-5 9 5v13M9 21v-6h6v6",
  map: "M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10Zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  medal: "M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-3 4l3-2 3 2v-5H9z",
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Advantages() {
  return (
    <section aria-labelledby="advantages-title" className="bg-paper-2">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-10 md:px-10 lg:gap-14 lg:px-24 lg:py-[72px]">
        {/* Үзүүлэлтийн мөр */}
        <Reveal as="ul" stagger className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-3 shadow-sm lg:grid-cols-4 lg:gap-0 lg:p-0">
          {STATS.map((s, i) => (
            <li key={s.label} className={`flex items-center gap-3 px-3 py-3 lg:px-8 lg:py-6 ${i > 0 ? "lg:border-l lg:border-line" : ""}`}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold/25 text-navy"><Icon name={s.icon} className="h-6 w-6" /></span>
              <span className="flex flex-col leading-tight">
                <span className="font-display text-2xl font-extrabold text-navy lg:text-[28px]">{s.value}</span>
                <span className="text-xs text-muted lg:text-sm">{s.label}</span>
              </span>
            </li>
          ))}
        </Reveal>

        <Reveal className="flex flex-col gap-3">
          <h2 id="advantages-title" className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">
            Шинэ Үе сургуулийн <span className="text-blue-600">давуу тал</span>
          </h2>
          <p className="border-l-2 border-navy pl-4 text-base text-muted">Шинэ Үе сургууль — сурагч бүрийн хөгжлийг дэмжих орчин</p>
        </Reveal>

        {/* Картууд */}
        <Reveal as="ul" stagger className="grid gap-6 lg:grid-cols-3">
          {ADVANTAGES.map((a, i) => (
            <li key={a.title} className="flex flex-col overflow-hidden rounded-2xl border-t-4 border-navy bg-white shadow-sm">
              <div className="flex items-center gap-4 px-6 pt-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy text-white"><Icon name={a.icon} className="h-6 w-6" /></span>
                <h3 className="font-display text-xl font-extrabold text-navy">{a.title}</h3>
                <span className="ml-auto font-display text-4xl font-extrabold text-line" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <ul className="mt-4 divide-y divide-line px-6">
                {a.items.map((it) => (
                  <li key={it.text} className="flex items-center gap-3 py-3.5 text-[15px] text-ink">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/25 text-navy"><Icon name={it.icon} /></span>
                    {it.text}
                  </li>
                ))}
              </ul>
              <Link href={a.href} className="mt-auto flex items-center justify-end gap-2 px-6 py-5 text-sm font-semibold text-navy hover:underline hover:underline-offset-4">
                Дэлгэрэнгүй
                <span className="grid h-7 w-7 place-items-center rounded-full border border-line" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
