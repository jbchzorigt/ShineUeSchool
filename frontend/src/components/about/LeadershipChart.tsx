"use client";

/* Удирдлага: түвшин бүр нэг tab (Захирал · Дэд захирлууд · Менежерүүд · 4-р түвшин …), идэвхтэй tab-д тухайн түвшний гишүүд
   дарааллаараа ижил хэмжээтэй картаар (голлосон flex-wrap: утсанд 2 багана, sm+ 200px карт). Зураггүй бол navy тойрогт эхний үсэг.
   Өгөгдөл level, order-оор эрэмбэлэгдэж ирнэ; зөвхөн гишүүнтэй түвшин tab болно. Гар: ←/→ tab солино. */

import Image from "next/image";
import { useId, useState } from "react";
import { Reveal } from "@/components/site/Reveal";
import type { AboutLeader } from "@/lib/types";

const LEVEL_NAME: Record<number, string> = { 1: "Захирал", 2: "Дэд захирлууд", 3: "Менежерүүд" };
const levelName = (lv: number) => LEVEL_NAME[lv] ?? `${lv}-р түвшин`;

function Avatar({ leader }: { leader: AboutLeader }) {
  const cls = "h-24 w-24 md:h-28 md:w-28";
  if (leader.photo) {
    return (
      <span className={`relative block shrink-0 overflow-hidden rounded-full border-4 border-white shadow-md ${cls}`}>
        <Image src={leader.photo} alt="" fill unoptimized sizes="112px" className="object-cover" />
      </span>
    );
  }
  return <span className={`grid shrink-0 place-items-center rounded-full bg-navy font-display text-3xl font-extrabold text-gold ${cls}`} aria-hidden="true">{leader.full_name.trim().charAt(0)}</span>;
}

export function LeadershipChart({ leaders }: { leaders: AboutLeader[] }) {
  const levels = [...new Set(leaders.map((l) => l.level))].sort((a, b) => a - b);
  const [active, setActive] = useState(levels[0] ?? 1);
  const id = useId();
  if (leaders.length === 0) return null;
  const current = levels.includes(active) ? active : levels[0];
  const row = leaders.filter((l) => l.level === current);

  function onKey(e: React.KeyboardEvent) {
    const i = levels.indexOf(current);
    if (e.key === "ArrowRight") { e.preventDefault(); setActive(levels[(i + 1) % levels.length]); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setActive(levels[(i - 1 + levels.length) % levels.length]); }
  }

  return (
    <section aria-labelledby="leaders-title" className="bg-paper-2">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-12 md:px-10 lg:gap-10 lg:px-24 lg:py-[72px]">
        <Reveal><h2 id="leaders-title" className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Удирдлага</h2></Reveal>
        <Reveal className="flex flex-col gap-6 lg:gap-8">
          {/* Түвшний tab-ууд */}
          <div role="tablist" aria-label="Удирдлагын түвшин" onKeyDown={onKey} className="flex flex-wrap gap-2 border-b border-line">
            {levels.map((lv) => {
              const on = lv === current;
              return (
                <button key={lv} type="button" role="tab" id={`${id}-tab-${lv}`} aria-selected={on} aria-controls={`${id}-panel-${lv}`} tabIndex={on ? 0 : -1}
                        onClick={() => setActive(lv)}
                        className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[15px] font-semibold transition lg:px-4 lg:text-base ${on ? "border-navy text-navy" : "border-transparent text-muted hover:text-navy"}`}>
                  {levelName(lv)}
                  <span className="ml-1.5 rounded-full bg-navy/10 px-1.5 py-0.5 text-xs text-navy">{leaders.filter((l) => l.level === lv).length}</span>
                </button>
              );
            })}
          </div>
          {/* Идэвхтэй түвшний гишүүд: key-ээр дахин mount → fade-in (globals.css .leaders-panel) */}
          <ul key={current} role="tabpanel" id={`${id}-panel-${current}`} aria-labelledby={`${id}-tab-${current}`}
              className="leaders-panel flex flex-wrap justify-center gap-4 md:gap-6">
            {row.map((l) => (
              <li key={l.id} className="flex w-[calc(50%-8px)] flex-col items-center gap-3 rounded-2xl border border-line bg-white px-3 py-5 text-center break-words sm:w-[200px] md:px-5 md:py-6">
                <Avatar leader={l} />
                <span className="max-w-full font-display text-base font-extrabold leading-tight text-ink md:text-lg">{l.full_name}</span>
                <span className="max-w-full text-xs text-muted md:text-sm">{l.position}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
