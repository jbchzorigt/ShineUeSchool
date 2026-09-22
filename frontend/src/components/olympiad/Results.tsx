"use client";

/* Үр дүн (results.js): он ба ангиллын табууд; хүснэгт мөрүүд зүүнээс орж ирж, байрын дугуй үсэрч, оноо 0-оос тоолно;
   эхний 3 байр медалийн өнгөөр. Section дэлгэцэнд орж ирэхэд сүүлийн он идэвхжинэ. Байр/эрэмбэ backend-ийн rank. */

import { useState, useRef } from "react";
import { CATEGORIES, type Result } from "@/lib/types";
import { FORMULAS } from "@/lib/olympiad-data";
import { gsap, ScrollTrigger, reduceMotion, useGSAP } from "./gsap";
import { Formulas } from "./Formulas";
import { Heading } from "./Heading";

const MEDAL = ["gold", "silver", "bronze"];

export function Results({ results }: { results: Result[] | null }) {
  const root = useRef<HTMLElement>(null);
  const all = results ?? [];
  const years = Array.from(new Set(all.map((r) => r.year))).sort((a, b) => a - b);
  const [year, setYear] = useState<number | null>(null);       // null = дэлгэцэнд орж ирэх хүртэл хүснэгт хоосон
  const [grade, setGrade] = useState<string | null>(null);
  const cats = CATEGORIES.filter((c) => all.some((r) => r.year === year && r.category === c.value));
  const cat = grade && cats.some((c) => c.value === grade) ? grade : cats[0]?.value ?? null;
  const rows = all.filter((r) => r.year === year && r.category === cat).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  useGSAP(() => {
    const el = root.current!;
    if (year === null) {
      const t = ScrollTrigger.create({ trigger: el, start: "top 70%", once: true, onEnter: () => setYear(years[years.length - 1] ?? null) });
      return () => t.kill();
    }
    const body = el.querySelector<HTMLElement>("#results-body");
    if (!body) return; // results-body зөвхөн өгөгдөлтэй салбарт render хийгдэнэ
    const trs = gsap.utils.toArray<HTMLElement>("tr", body);
    const scores = gsap.utils.toArray<HTMLElement>(".score", body);
    if (reduceMotion()) {
      scores.forEach((s) => { if (s.dataset.score !== undefined) s.textContent = s.dataset.score; });
      return;
    }
    gsap.from(gsap.utils.toArray(".grade-tabs button", el), { autoAlpha: 0, y: 6, duration: 0.3, stagger: 0.04 });
    gsap.from(trs, { autoAlpha: 0, x: -20, duration: 0.45, ease: "power2.out", stagger: 0.07 });
    gsap.from(gsap.utils.toArray(".rank span", body), { scale: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.07, transformOrigin: "50% 50%" });
    scores.forEach((s, i) => {
      if (s.dataset.score === undefined) return;
      const target = Number(s.dataset.score);
      if (Number.isNaN(target)) return;
      const obj = { v: 0 };
      gsap.to(obj, { v: target, duration: 1.1, delay: 0.15 + i * 0.07, ease: "power2.out", onUpdate: () => (s.textContent = String(Math.round(obj.v))) });
    });
  }, { scope: root, dependencies: [year, cat] });

  return (
    <section ref={root} className="section section-results" id="results">
      <Formulas items={FORMULAS.results} />
      <div className="section-inner">
        <p className="eyebrow">Үр дүн</p>
        <Heading variant={2}>Байр эзлэлт</Heading>
        <p className="lead">Он болон ангиа сонгоод тухайн жилийн шилдэг сурагчдыг харна уу.</p>
        {!results ? <p className="section-note">Мэдээлэл түр байхгүй.</p> : !years.length ? <p className="section-note">Үр дүн удахгүй.</p> : (
          <>
            <div className="year-tabs" id="results-years" role="tablist" aria-label="Он">
              {years.map((y) => <button key={y} type="button" role="tab" aria-selected={y === year} className={y === year ? "is-active" : undefined} onClick={() => setYear(y)}>{y}</button>)}
            </div>
            <div className="grade-tabs" id="grade-tabs" role="tablist" aria-label="Анги" key={year ?? "none"}>
              {cats.map((c) => <button key={c.value} type="button" role="tab" aria-selected={c.value === cat} className={c.value === cat ? "is-active" : undefined} onClick={() => setGrade(c.value)}>{c.label}</button>)}
            </div>
            <div className="results-wrap">
              <table className="results" id="results-table">
                <thead><tr><th>Байр</th><th>Сурагч</th><th>Сургууль</th><th>Оноо</th></tr></thead>
                <tbody id="results-body" key={`${year}-${cat}`}>
                  {rows.map((r) => (
                    <tr key={r.id} className={r.rank && r.rank <= 3 ? `medal medal-${MEDAL[r.rank - 1]}` : undefined}>
                      <td className="rank"><span>{r.rank ?? "—"}</span></td>
                      <td className="name">{r.student}</td>
                      <td className="school">{r.school}</td>
                      <td className="score" data-score={r.score ?? undefined}>{r.score === null ? "—" : 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
