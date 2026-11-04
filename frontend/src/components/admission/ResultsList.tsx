"use client";

/* Элсэлтийн дүнгийн жагсаалт: кодоор хайх (бүтэн код таарвал том картаар), ангиар шүүх, эсвэл бүх жагсаалтыг гүйлгэж харах.
   Өгөгдөлд зөвхөн код, анги, оноо, дүн байна (backend /api/admissions/results/) — нэр, хувийн мэдээлэл огт ирэхгүй. */

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { gsap, reduceMotion, useGSAP } from "@/components/site/gsap";
import { useDict } from "@/components/site/LangProvider";
import { Badge } from "@/components/ui";
import type { AdmissionResultRow } from "@/lib/types";
import { codeKey, formatScore, RESULT_ORDER, RESULT_TONE } from "./format";

export function ResultsList({ rows }: { rows: AdmissionResultRow[] }) {
  const t = useDict().admission;
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const q = codeKey(useDeferredValue(query));

  const grades = useMemo(() => [...new Set(rows.map((r) => r.grade))].sort((a, b) => a - b), [rows]);
  const exact = q.length >= 6 ? rows.find((r) => codeKey(r.code) === q) : undefined;
  const shown = useMemo(
    () => rows.filter((r) => (grade === null || r.grade === grade) && (!q || codeKey(r.code).includes(q))),
    [rows, grade, q],
  );
  const counts = useMemo(() => {
    const c: Partial<Record<string, number>> = {};
    for (const r of rows) if ((grade === null || r.grade === grade) && r.result) c[r.result] = (c[r.result] ?? 0) + 1;
    return c;
  }, [rows, grade]);

  const root = useRef<HTMLDivElement>(null);

  // Ачаалах болон анги солих үед эхний ~30 мөр дараалан гарна (бүх мянган мөрийг биш — хурд)
  useGSAP(() => {
    if (reduceMotion()) return;
    const rowsEl = gsap.utils.toArray<HTMLElement>("tbody tr").slice(0, 30);
    gsap.from(rowsEl, { autoAlpha: 0, y: 8, duration: 0.35, ease: "power2.out", stagger: 0.018 });
  }, { scope: root, dependencies: [grade] });

  // Бүтэн код таарахад: карт "pop", оноо 0-ээс тоологдоно, жагсаалтын мөр алтан өнгөөр анивчина
  useGSAP(() => {
    if (!exact || reduceMotion()) return;
    gsap.from("[data-anim='match']", { autoAlpha: 0, y: 10, scale: 0.97, duration: 0.4, ease: "back.out(1.6)" });
    gsap.from("[data-anim='verdict']", { autoAlpha: 0, x: -12, duration: 0.45, delay: 0.15, ease: "power3.out" });
    const scoreEl = root.current?.querySelector<HTMLElement>("[data-anim='score']");
    if (scoreEl && exact.score !== null) {
      const n = { v: 0 };
      gsap.to(n, { v: exact.score, duration: 0.9, delay: 0.1, ease: "power2.out", onUpdate: () => { scoreEl.textContent = formatScore(Math.round(n.v * 10) / 10); },
                   onComplete: () => { scoreEl.textContent = formatScore(exact.score); } });
    }
    gsap.from("[data-anim='hit']", { backgroundColor: "rgba(255, 194, 14, 0.75)", duration: 1.4, ease: "power1.out", clearProps: "backgroundColor" });
    // revertOnUpdate: өөр код хайхад өмнөх тоолуур/анивчилтыг зогсооно. Карт key={code}-оор шинээр mount болдог тул
    // оноог textContent-оор шууд бичих нь React-ийн удирддаг өөр кодын текстэй холилдохгүй.
  }, { scope: root, dependencies: [exact?.code], revertOnUpdate: true });

  const chip = "rounded-full border px-4 py-1.5 text-sm font-medium transition";
  const chipOn = "border-navy bg-navy text-white";
  const chipOff = "border-line bg-white text-ink hover:border-navy hover:text-navy";

  return (
    <div ref={root} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <label htmlFor="code-search" className="text-sm font-semibold text-ink">{t.searchLabel}</label>
        <div className="relative max-w-xl">
          <input
            id="code-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-full rounded-xl border-2 border-line bg-white px-4 py-3.5 font-mono text-lg uppercase tracking-wider text-ink shadow-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/70 focus:border-navy focus:outline-none focus:ring-4 focus:ring-navy/15"
          />
        </div>
        {exact ? (
          <div key={exact.code} data-anim="match" role="status" className="max-w-xl rounded-2xl border-2 border-navy bg-white p-5 shadow-sm">
            <p className="font-mono text-sm font-semibold tracking-wider text-muted">{exact.code} · {t.grade(exact.grade)}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              {exact.result && <span data-anim="verdict" className="font-display text-[30px] font-extrabold leading-none text-navy">{t.result[exact.result]}</span>}
              {exact.score !== null && <span className="text-lg text-ink"><span data-anim="score" className="font-bold tabular-nums">{formatScore(exact.score)}</span> {t.points}</span>}
            </div>
          </div>
        ) : q.length >= 6 && shown.length === 0 ? (
          <p role="status" className="max-w-xl rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {t.codeNotFound(query.trim())}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {grades.length > 1 && (
          <nav aria-label={t.gradeFilter} className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setGrade(null)} aria-pressed={grade === null} className={`${chip} ${grade === null ? chipOn : chipOff}`}>{t.allGrades}</button>
            {grades.map((g) => (
              <button key={g} type="button" onClick={() => setGrade(g)} aria-pressed={grade === g} className={`${chip} ${grade === g ? chipOn : chipOff}`}>{t.grade(g)}</button>
            ))}
          </nav>
        )}
        <p className="text-sm text-muted tabular-nums">
          {RESULT_ORDER.filter((r) => counts[r]).map((r) => `${t.result[r]} ${counts[r]}`).join(" · ")}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full text-left text-[15px]">
          <caption className="sr-only">{t.tableCaption}</caption>
          <thead className="bg-navy text-xs uppercase tracking-wider text-white">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold sm:px-6">{t.colCode}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{t.colGrade}</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">{t.colScore}</th>
              <th scope="col" className="px-4 py-3 font-semibold sm:px-6">{t.colResult}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {shown.map((r) => (
              <tr key={r.code} data-anim={exact?.code === r.code ? "hit" : undefined} className={exact?.code === r.code ? "bg-gold/20" : "hover:bg-paper-2"}>
                <td className="px-4 py-2.5 font-mono font-semibold tracking-wider text-ink sm:px-6">{r.code}</td>
                <td className="px-4 py-2.5 tabular-nums text-muted">{r.grade}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink">{formatScore(r.score)}</td>
                <td className="px-4 py-2.5 sm:px-6">{r.result ? <Badge tone={RESULT_TONE[r.result]}>{t.result[r.result]}</Badge> : <span className="text-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="px-6 py-8 text-center text-sm text-muted">{t.noMatches}</p>}
      </div>
      <p className="text-sm text-muted tabular-nums">{t.total(shown.length, rows.length)}</p>
    </div>
  );
}
