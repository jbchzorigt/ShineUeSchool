"use client";

/* «Заадаг хичээлүүд» — «Хөтөлбөрийн хэрэгжилт» хэсгийн доод хэсэг (h3, хэсгийн h2-ийг page өгнө): бүлэг бүрийн гарчиг → хичээлийн товчнууд (pill) → сонгосон хичээлийн тайлбар. lg-д товчнууд зүүн,
   тайлбар баруун талд (sticky, эхний хичээл анхнаасаа сонгогдсон); жижиг дэлгэцэнд тайлбар тухайн бүлгийн товчнуудын доор нээгдэнэ
   (дахин дарвал хаагдана). Хичээл онооны графикт байвал тайлбарт сүүлийн дундаж оноо + өөрчлөлт, «Үр дүнг харах» (#results).
   Онооны тооцоог page хийнэ. */

import { useId, useState } from "react";
import { useDict } from "@/components/site/LangProvider";
import type { ProgramSubject } from "@/lib/types";

export interface SubjectScore { value: string; label: string; since?: string }

function Detail({ s, score }: { s: ProgramSubject; score?: SubjectScore }) {
  const t = useDict().programs;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {s.group && <span className="text-xs font-bold uppercase tracking-wider text-muted">{s.group}</span>}
        {s.tag && <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-navy-deep">{s.tag}</span>}
      </div>
      <h4 className="font-display text-2xl font-extrabold leading-tight text-navy lg:text-[28px]">{s.name}</h4>
      <p className="whitespace-pre-line text-[16px] leading-relaxed text-ink">{s.description || t.subjectNoText}</p>
      {score && (
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-line bg-paper-2 px-4 py-3">
          <span className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{score.label}</span>
            <span className="font-display text-[28px] font-extrabold leading-tight text-navy">{score.value}</span>
            {score.since && <span className="text-xs text-muted">{score.since}</span>}
          </span>
          <a href="#results" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline">
            {t.subjectToResults} <span aria-hidden="true" className="text-gold">↓</span>
          </a>
        </div>
      )}
    </div>
  );
}

export function ProgramSubjects({ subjects, scores }: { subjects: ProgramSubject[]; scores: Record<string, SubjectScore> }) {
  const t = useDict().programs;
  const id = useId();
  const [sel, setSel] = useState<string | null>(null);     // lg: баруун талын тайлбар
  const [open, setOpen] = useState<string | null>(null);   // жижиг дэлгэц: бүлэг дотор нээгдсэн
  if (!subjects.length) return null;
  const active = subjects.find((s) => s.key === sel) ?? subjects[0];
  // Админы эрэмбийг хадгалан бүлэглэнэ (бүлэггүй хичээл гарчиггүй бүлэгт)
  const groups: { name: string; items: ProgramSubject[] }[] = [];
  for (const s of subjects) {
    const g = groups.find((x) => x.name === s.group);
    if (g) g.items.push(s); else groups.push({ name: s.group, items: [s] });
  }
  const named = groups.filter((g) => g.name).length;
  const pick = (key: string) => { setSel(key); setOpen(open === key ? null : key); };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h3 className="font-display text-xl font-extrabold text-navy lg:text-2xl">{t.subjectsTitle}</h3>
        <p className="max-w-3xl text-[16px] text-muted">{t.subjectsLead(subjects.length, named)}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
        <div className="flex flex-col gap-5">
          {groups.map((g, gi) => {
            const shown = g.items.find((s) => s.key === open);
            return (
              <div key={g.name || `_${gi}`} className="flex flex-col gap-2.5">
                {g.name && <span className="text-xs font-bold uppercase tracking-wider text-muted">{g.name}</span>}
                <ul aria-label={g.name || t.subjectsListAria} className="flex flex-wrap gap-2">
                  {g.items.map((s) => {
                    const isOpen = open === s.key, isActive = active.key === s.key;
                    return (
                      <li key={s.key}>
                        <button type="button" onClick={() => pick(s.key)} aria-expanded={isOpen} aria-controls={`${id}-g${gi}`}
                                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-left text-[15px] font-semibold transition
                                  ${isOpen ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:border-navy hover:text-navy"}
                                  ${isActive ? "lg:border-navy lg:bg-navy lg:text-white lg:hover:text-white" : "lg:border-line lg:bg-white lg:text-ink"}`}>
                          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${isOpen ? "bg-gold" : "bg-line"} ${isActive ? "lg:bg-gold" : "lg:bg-line"}`} />
                          {s.name}
                          {s.tag && <span className={`text-xs font-bold ${isOpen ? "text-gold" : "text-muted"} ${isActive ? "lg:text-gold" : "lg:text-muted"}`}>{s.tag}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {shown && (
                  <div id={`${id}-g${gi}`} className="rounded-xl border border-line bg-white p-5 lg:hidden">
                    <Detail s={shown} score={scores[shown.key]} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div aria-live="polite" className="sticky top-28 hidden rounded-2xl border border-line bg-white p-7 shadow-sm lg:block">
          <Detail s={active} score={scores[active.key]} />
        </div>
      </div>
    </div>
  );
}
