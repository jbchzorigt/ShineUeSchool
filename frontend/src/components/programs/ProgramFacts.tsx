/* Мэдээллийн мөр: хэрэгжих анги · бүтээлийн тоо · тэтгэлгийн нийт дүн (тэтгэлэггүй бол сүүлийнх нуугдана). */

import { getDict, type Lang } from "@/lib/i18n";
import type { ProgramDetail } from "@/lib/types";
import { formatUsd } from "./money";

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
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      <Fact label={t.grades} value={t.gradeRange(program.grade_from, program.grade_to)} />
      <Fact label={t.worksLabel} value={String(program.works.length)} sub={t.worksSub} />
      {program.scholarship_count > 0 && <Fact label={t.scholarship} value={formatUsd(program.scholarship_total_usd)} sub={t.students(program.scholarship_count)} />}
    </ul>
  );
}
