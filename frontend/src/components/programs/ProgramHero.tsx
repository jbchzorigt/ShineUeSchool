/* Хөтөлбөрийн толгой (Figma «02 · IB»): хөтөлбөрийн өнгөтэй блок дээр badge, нэр, summary, хуудасны хэсгүүдийн tab (anchor),
   баруун талд 1–12-р ангийн «сургалтын зам». Өнгө theme.ts-ээс. Server component. */

import Link from "next/link";
import { getDict, localePath, type Lang } from "@/lib/i18n";
import type { ProgramCard, ProgramDetail } from "@/lib/types";
import { ProgramPathway } from "./ProgramPathway";
import { themeFor } from "./theme";

export function ProgramHero({ program, programs, sections, lang = "mn" }: {
  program: ProgramDetail; programs: ProgramCard[]; sections: { id: string; label: string }[]; lang?: Lang;
}) {
  const t = getDict(lang).programs;
  const theme = themeFor(program.slug);
  const ink = theme.light ? "text-white" : "text-ink";
  return (
    <div className="flex flex-col gap-4">
      <p><Link href={localePath(lang, "/")} className="text-sm font-medium text-navy hover:underline">{t.back}</Link></p>
      <div className={`flex flex-col gap-8 rounded-3xl p-6 lg:flex-row lg:items-end lg:justify-between lg:p-12 ${ink}`} style={{ background: theme.hero }}>
        <div className="flex max-w-2xl flex-col gap-4">
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${theme.light ? "bg-gold text-ink" : "bg-ink text-white"}`}>{program.badge}</span>
          <h1 className="font-display text-[32px] font-extrabold leading-tight lg:text-[50px]">{program.name}</h1>
          {program.summary && <p className={`text-[15px] lg:text-lg ${theme.light ? "text-white/85" : "text-ink/80"}`}>{program.summary}</p>}
          {sections.length > 1 && (
            <nav aria-label={t.sectionsAria} className="mt-2 flex flex-wrap gap-2">
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`}
                   className={`rounded-full px-4 py-2 text-sm font-bold transition ${theme.light ? "bg-white/15 hover:bg-white hover:text-navy" : "bg-ink/10 hover:bg-ink hover:text-white"}`}>{s.label}</a>
              ))}
            </nav>
          )}
        </div>
        {programs.length > 1 && <ProgramPathway current={program.slug} programs={programs} light={theme.light} lang={lang} />}
      </div>
    </div>
  );
}
