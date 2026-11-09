/* «Үр дүн» хэсэг: хичээлийн оноо (dumbbell, radar өгөгдөл) + нийт дундаж оноо (area, series[].total) + гадаадад элссэн төгсөгчдийн
   хуримтлагдсан тоо (area, outcomes — хуримтлагдсан тул үргэлж өсөх чиглэлтэй; он бүрийн тоо, харьцаа tooltip-д). Өгөгдөлгүй карт харагдахгүй; оноо байвал өргөн карт (3/5), бусад нь 2/5. Server component — графикууд client. */

import { getDict, type Lang } from "@/lib/i18n";
import type { ProgramDetail } from "@/lib/types";
import { ScoreDumbbell } from "./ScoreDumbbell";
import { TrendArea, type TrendPoint } from "./TrendArea";
import { cumulative, num, themeFor } from "./theme";

function ChartCard({ title, sub, wide, children }: { title: string; sub?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <figure className={`scholarship-chart flex min-w-0 flex-col gap-1 rounded-2xl border border-line bg-white p-4 lg:p-6 ${wide ? "lg:col-span-3" : "lg:col-span-2"}`}>
      <figcaption className="flex flex-col gap-0.5 pb-2">
        <span className="text-lg font-extrabold text-ink">{title}</span>
        {sub && <span className="text-sm text-muted">{sub}</span>}
      </figcaption>
      {children}
    </figure>
  );
}

/** Нийт дундаж оноотой цувралууд (Cambridge IGCSE г.м.) */
export const totalsOf = (p: ProgramDetail) => (p.radar?.series ?? []).filter((s) => typeof s.total === "number") as { name: string; total: number }[];

export function hasResults(p: ProgramDetail) {
  return !!p.radar || totalsOf(p).length > 1 || p.outcomes.length > 1;
}

export function ProgramResults({ program, lang = "mn" }: { program: ProgramDetail; lang?: Lang }) {
  const t = getDict(lang).programs;
  const theme = themeFor(program.slug);
  const strong = theme.scale[1];
  const radar = program.radar;
  const totals = totalsOf(program);
  const outcomes = program.outcomes;
  const totalPoints: TrendPoint[] = totals.map((s) => ({ label: s.name, value: s.total }));
  // Гадаадад элссэн төгсөгчдийн хуримтлагдсан тоо (он бүрийн нэмэгдэл, тухайн оны харьцаа tooltip-д)
  const runs = cumulative(outcomes.map((o) => o.abroad));
  const run = runs[runs.length - 1] ?? 0;
  const abroadPoints: TrendPoint[] = outcomes.map((o, i) => ({ label: String(o.year), value: runs[i], detail: `${t.addedIn(o.year, String(o.abroad))} · ${t.abroadOf(o.abroad, o.graduates)}` }));
  const years = outcomes.length ? `${outcomes[0].year}–${outcomes[outcomes.length - 1].year}` : "";
  const first = radar?.series[0]?.name ?? "", last = radar?.series[radar.series.length - 1]?.name ?? "";
  const side = (totals.length > 1 ? 1 : 0) + (outcomes.length > 1 ? 1 : 0);

  return (
    <section id="results" aria-labelledby="results-title" className="flex scroll-mt-28 flex-col gap-6">
      <h2 id="results-title" className="font-display text-[26px] font-extrabold text-navy lg:text-[32px]">{t.resultsTitle}</h2>
      <div className={`grid items-start gap-6 ${radar ? "lg:grid-cols-5" : side > 1 ? "lg:grid-cols-4" : "lg:grid-cols-2"}`}>
        {radar && (
          <ChartCard wide title={radar.title || t.scoresTitle} sub={radar.series.length > 1 ? t.scoresSub(first, last) : undefined}>
            <ScoreDumbbell radar={radar} scale={theme.scale} />
          </ChartCard>
        )}
        {totals.length > 1 && (
          <ChartCard title={t.totalTitle} sub={`${totalPoints.map((p) => num(p.value)).join(" → ")}`}>
            <TrendArea points={totalPoints} color={strong} kind="score" name={t.totalTitle}
                       ariaLabel={t.totalAria(totalPoints.map((p) => `${p.label}: ${num(p.value)}`).join(", "))} />
          </ChartCard>
        )}
        {outcomes.length > 1 && (
          <ChartCard title={t.abroadTitle} sub={t.abroadSub(years, run)}>
            <TrendArea points={abroadPoints} color={strong} kind="count" name={t.abroadSeries}
                       ariaLabel={t.abroadAria(abroadPoints.map((p) => `${p.label}: ${p.value} (${p.detail})`).join(", "))} />
          </ChartCard>
        )}
      </div>
    </section>
  );
}
