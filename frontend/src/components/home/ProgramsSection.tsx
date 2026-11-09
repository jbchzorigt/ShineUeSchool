/* Нүүрний "Хөтөлбөрүүд" хэсэг: гарчиг → хөтөлбөрийн картууд (1 / md 2 / 3+ бол lg 3 багана, сургуулийн navy/алтан загвар),
   карт бүрт гол үзүүлэлт + sparkline. Үзүүлэлт хөтөлбөрийн дэлгэрэнгүйгээс (fetchProgram, 60 сек cache):
   гадаадад элссэн төгсөгчдийн хуримтлагдсан тоо (outcomes) → нийт дундаж оноо (radar total) → тэтгэлгийн хуримтлагдсан дүн. Хоосон бол render хийхгүй. Server component. */

import { Reveal } from "@/components/site/Reveal";
import { formatUsd } from "@/components/programs/money";
import { cumulative, num } from "@/components/programs/theme";
import { getDict, type Lang } from "@/lib/i18n";
import { fetchProgram } from "@/lib/programs-api";
import type { ProgramCard as ProgramCardData, ProgramDetail } from "@/lib/types";
import { ProgramCard, type CardStat } from "./ProgramCard";

function statFor(p: ProgramDetail | null, lang: Lang): CardStat | null {
  if (!p) return null;
  const t = getDict(lang);
  const pt = t.programs, ht = t.home.programs;
  const aria = (label: string, pairs: [string | number, string][]) => ht.sparkAria(label, pairs.map(([k, v]) => `${k}: ${v}`).join(", "));
  const o = p.outcomes;
  if (o.length) {
    // Гадаадад элссэн төгсөгчдийн хуримтлагдсан тоо (хөтөлбөрийн хуудасны графиктай ижил)
    const values = cumulative(o.map((r) => r.abroad));
    const years = o.length > 1 ? `${o[0].year}–${o[o.length - 1].year}` : String(o[0].year);
    return { label: pt.abroadCountKpi, value: String(values[values.length - 1]), sub: pt.abroadCountSub(years), values,
             aria: aria(pt.abroadCountKpi, o.map((r, i) => [r.year, String(values[i])])) };
  }
  const totals = (p.radar?.series ?? []).filter((s): s is typeof s & { total: number } => typeof s.total === "number");
  if (totals.length) {
    const last = totals[totals.length - 1];
    return { label: pt.totalKpi, value: num(last.total), sub: totals.length > 1 ? pt.since(`${last.total >= totals[0].total ? "+" : ""}${num(last.total - totals[0].total)}`, totals[0].name) : last.name,
             values: totals.map((s) => s.total), aria: aria(pt.totalKpi, totals.map((s) => [s.name, num(s.total)])) };
  }
  if (p.scholarships.length) {
    const byYear = new Map<number, number>();
    for (const s of p.scholarships) byYear.set(s.year, (byYear.get(s.year) ?? 0) + s.amount_usd);
    const years = [...byYear.keys()].sort((a, b) => a - b);
    const values = cumulative(years.map((y) => byYear.get(y)!));   // хуримтлагдсан (тэтгэлгийн графиктай ижил)
    return { label: pt.scholarship, value: formatUsd(p.scholarship_total_usd), sub: years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : String(years[0]),   // мөрүүд нь ихэвчлэн жилийн нийт дүн тул сурагчийн тоо биш
             values, aria: aria(pt.scholarship, years.map((y, i) => [y, formatUsd(values[i])])) };
  }
  return null;
}

export async function ProgramsSection({ programs, lang = "mn" }: { programs: ProgramCardData[]; lang?: Lang }) {
  if (programs.length === 0) return null;
  const t = getDict(lang).home.programs;
  const details = await Promise.all(programs.map((p) => fetchProgram(p.slug, lang)));
  const cols = programs.length >= 3 ? "lg:grid-cols-3" : "";
  return (
    <section id="programs" aria-labelledby="programs-title" className="bg-paper-2">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-10 md:px-10 lg:gap-12 lg:px-24 lg:py-[72px]">
        <Reveal className="flex flex-col gap-3">
          <h2 id="programs-title" className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">{t.title}</h2>
          <p className="border-l-2 border-navy pl-4 text-base text-muted">{t.lead}</p>
        </Reveal>
        <Reveal as="ul" stagger className={`grid gap-6 md:grid-cols-2 ${cols}`}>
          {programs.map((p, i) => <ProgramCard key={p.id} program={p} stat={statFor(details[i], lang)} lang={lang} />)}
        </Reveal>
      </div>
    </section>
  );
}
