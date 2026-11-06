/* Шаттай зам (Figma «03 · Cambridge»): хөтөлбөрийн шатууд (толь бичгийн `programs.stages[slug]`, одоогоор Cambridge) → сүүлийн карт
   «Сонголт»: энэ хөтөлбөрийн дараагийн ангийг (grade_to + 1) хамардаг бусад хөтөлбөрүүд (IBDP, Үндэсний) холбоосоор. Server component. */

import Link from "next/link";
import { getDict, localePath, type Lang } from "@/lib/i18n";
import type { ProgramCard, ProgramDetail } from "@/lib/types";
import { themeFor } from "./theme";

const Arrow = () => <span aria-hidden="true" className="hidden self-center text-2xl text-muted lg:block">→</span>;

export function ProgramStages({ program, programs, lang = "mn" }: { program: ProgramDetail; programs: ProgramCard[]; lang?: Lang }) {
  const t = getDict(lang).programs;
  const stages = t.stages[program.slug];
  if (!stages?.length) return null;
  const color = themeFor(program.slug).scale[1];
  const g = program.grade_to + 1;
  const next = programs.filter((p) => p.slug !== program.slug && p.grade_from <= g && g <= p.grade_to);
  return (
    <section aria-labelledby="stages-title" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 id="stages-title" className="font-display text-[26px] font-extrabold text-navy lg:text-[32px]">{t.stagesTitle}</h2>
        <p className="max-w-3xl text-[17px] text-muted">{t.stagesLead}</p>
      </div>
      <ol className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {stages.map((s, i) => (
          <li key={s.name} className="contents">
            <div className="flex flex-col gap-2 rounded-2xl border-2 bg-white p-5" style={{ borderColor: color }}>
              <span className="text-xs font-bold uppercase tracking-wider text-muted">{s.grades}</span>
              <h3 className="text-lg font-extrabold text-ink">{s.name}</h3>
              <span className="w-fit rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: color }}>{s.exam}</span>
              <p className="text-[15px] text-ink">{s.text}</p>
            </div>
            {(i < stages.length - 1 || next.length > 0) && <Arrow />}
          </li>
        ))}
        {next.length > 0 && (
          <li className="flex flex-col gap-2 rounded-2xl border-2 border-navy bg-white p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">{t.gradeRange(g, Math.min(12, Math.max(...next.map((p) => p.grade_to))))}</span>
            <h3 className="text-lg font-extrabold text-ink">{t.nextStage}</h3>
            <p className="text-[15px] text-ink">{t.nextStageText}</p>
            <ul className="flex flex-wrap gap-2">
              {next.map((p) => (
                <li key={p.slug}>
                  <Link href={localePath(lang, `/programs/${p.slug}`)} className="inline-flex rounded-full bg-navy px-3 py-1.5 text-sm font-bold text-white transition hover:bg-navy-deep">{p.name} →</Link>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ol>
    </section>
  );
}
