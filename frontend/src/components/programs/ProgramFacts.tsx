/* Үзүүлэлтийн мөр (KPI, ихдээ 4): хэрэгжих анги · нийт дундаж оноо (radar total) · гадаадад элссэн (бүх он ба сүүлийн он, outcomes) ·
   тэтгэлэг · бүтээл · хичээлийн тоо (зай үлдвэл). Өгөгдөлгүй үзүүлэлт харагдахгүй. Server component. */

import { getDict, type Lang } from "@/lib/i18n";
import type { ProgramDetail } from "@/lib/types";
import { formatUsd } from "./money";
import { totalsOf } from "./ProgramResults";
import { num, pct, signed } from "./theme";

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-2xl border border-line bg-white px-5 py-5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      <span className="font-display text-2xl font-extrabold text-navy lg:text-[28px]">{value}</span>
      {sub && <span className="text-sm text-muted">{sub}</span>}
    </li>
  );
}

export function ProgramFacts({ program, lang = "mn" }: { program: ProgramDetail; lang?: Lang }) {
  const t = getDict(lang).programs;
  const totals = totalsOf(program);
  const o = program.outcomes;
  const sum = o.reduce((a, r) => ({ g: a.g + r.graduates, a: a.a + r.abroad }), { g: 0, a: 0 });
  const latest = o[o.length - 1];
  const facts: { label: string; value: string; sub?: string }[] = [{ label: t.grades, value: t.gradeRange(program.grade_from, program.grade_to) }];
  if (totals.length) {
    const [a, z] = [totals[0], totals[totals.length - 1]];
    facts.push({ label: t.totalKpi, value: num(z.total), sub: totals.length > 1 ? t.since(signed(z.total - a.total), a.name) : z.name });
  }
  if (o.length) {
    const years = o.length > 1 ? `${o[0].year}–${latest.year}` : String(latest.year);
    facts.push({ label: t.abroadKpi, value: `${num(pct(sum.a, sum.g))}%`, sub: t.abroadKpiSub(sum.a, sum.g, years) });
    if (o.length > 1) facts.push({ label: t.latestKpi(latest.year), value: `${num(pct(latest.abroad, latest.graduates))}%`, sub: t.abroadOf(latest.abroad, latest.graduates) });
  }
  if (program.scholarship_count > 0) facts.push({ label: t.scholarship, value: formatUsd(program.scholarship_total_usd), sub: t.students(program.scholarship_count) });
  if (program.works.length > 0) facts.push({ label: t.worksLabel, value: String(program.works.length), sub: t.worksSub });
  if (program.radar) facts.push({ label: t.subjectsKpi, value: String(program.radar.subjects.length), sub: program.radar.title || t.scoresTitle });
  return (
    <ul className={`grid gap-4 sm:grid-cols-2 ${facts.length >= 4 ? "lg:grid-cols-4" : facts.length === 3 ? "lg:grid-cols-3" : ""}`}>
      {facts.slice(0, 4).map((f) => <Fact key={f.label} {...f} />)}
    </ul>
  );
}
