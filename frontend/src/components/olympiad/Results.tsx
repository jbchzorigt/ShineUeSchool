"use client";

/* Үр дүн (results.js): он ба ангиллын табууд; хүснэгт мөрүүд зүүнээс орж ирж, байрын дугуй үсэрч, нийт оноо 0-оос тоолно.
   Багана: №, Овог · нэр (нэр тод + медалийн тэмдэг, «Алт/Мөнгө/Хүрэл»), Сургууль, тухайн ангийн бодлого бүр (Б1…Бn — scores-ийн хамгийн
   урт), Нийт. Байрын дугуй ба мөр медалийн (АЛТ/МӨНГӨ/ХҮРЭЛ) өнгөөр. Section дэлгэцэнд орж ирэхэд сүүлийн он идэвхжинэ.
   Байр/эрэмбэ backend-ийн rank (RANK() — тэнцвэл ижил байр). */

import { useId, useState, useRef } from "react";
import { CATEGORIES, type Result } from "@/lib/types";
import { FORMULAS } from "@/lib/olympiad-data";
import { fmtScore, medalKind, problemCount, type MedalKind } from "@/lib/olympiad-results";
import { gsap, ScrollTrigger, reduceMotion, useGSAP } from "./gsap";
import { Formulas } from "./Formulas";
import { Heading } from "./Heading";

const MEDAL_LABEL: Record<MedalKind, string> = { gold: "Алт", silver: "Мөнгө", bronze: "Хүрэл" };
/** Медалийн өнгө: [гэрэл, дунд, сүүдэр, хүрээ] — градиентаар металл гялбаа */
const MEDAL_TONE: Record<MedalKind, [string, string, string, string]> = {
  gold: ["#fff3b0", "#f7c948", "#d99a06", "#a87300"],
  silver: ["#ffffff", "#d7dce6", "#a9b1c2", "#7d879b"],
  bronze: ["#ffd9b8", "#e39a5c", "#b8682c", "#8a4a1a"],
};

/** Туузтай медаль: navy тууз (голдоо алтан судал), металл градиенттай диск, дотор цагираг, од, гялбаа. ID-ууд useId-аар давхцахгүй. */
function MedalIcon({ kind }: { kind: MedalKind }) {
  const id = useId().replace(/:/g, "");
  const [light, mid, dark, rim] = MEDAL_TONE[kind];
  return (
    <svg width="20" height="26" viewBox="0 0 20 26" aria-hidden="true" className="medal-icon">
      <defs>
        <linearGradient id={`${id}d`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={light} /><stop offset="0.45" stopColor={mid} /><stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a4aa8" /><stop offset="1" stopColor="#12245c" />
        </linearGradient>
      </defs>
      {/* тууз — хоёр тал, голдоо алтан судал */}
      <path d="M4 0h5.2l2.6 9.2H6.6z" fill={`url(#${id}r)`} />
      <path d="M10.8 0H16l-2.6 9.2H8.2z" fill={`url(#${id}r)`} />
      <path d="M6.3 0h1.3l2.4 8.2-.7 1z" fill="#ffc20e" />
      <path d="M12.4 0h1.3l-3.1 9.2-.7-1z" fill="#ffc20e" />
      {/* диск */}
      <circle cx="10" cy="17" r="8" fill={`url(#${id}d)`} stroke={rim} strokeWidth="1" />
      <circle cx="10" cy="17" r="5.6" fill="none" stroke={light} strokeOpacity="0.85" strokeWidth="0.9" />
      <path d="M10 13.1l1.15 2.33 2.57.37-1.86 1.81.44 2.56L10 19l-2.3 1.17.44-2.56-1.86-1.81 2.57-.37z" fill={rim} fillOpacity="0.9" />
      {/* гялбаа */}
      <path d="M5.2 14.6a5.6 5.6 0 0 1 3.4-3.4" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function Results({ results }: { results: Result[] | null }) {
  const root = useRef<HTMLElement>(null);
  const all = results ?? [];
  const years = Array.from(new Set(all.map((r) => r.year))).sort((a, b) => a - b);
  const [year, setYear] = useState<number | null>(null);       // null = дэлгэцэнд орж ирэх хүртэл хүснэгт хоосон
  const [grade, setGrade] = useState<string | null>(null);
  const cats = CATEGORIES.filter((c) => all.some((r) => r.year === year && r.category === c.value));
  const cat = grade && cats.some((c) => c.value === grade) ? grade : cats[0]?.value ?? null;
  const rows = all.filter((r) => r.year === year && r.category === cat).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const problems = Array.from({ length: problemCount(rows) }, (_, i) => i);   // тухайн ангийн бодлогын тоо

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
      scores.forEach((s) => { if (s.dataset.score !== undefined) s.textContent = fmtScore(Number(s.dataset.score)); });
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
      gsap.to(obj, { v: target, duration: 1.1, delay: 0.15 + i * 0.07, ease: "power2.out",
                     onUpdate: () => (s.textContent = String(Math.round(obj.v))), onComplete: () => (s.textContent = fmtScore(target)) });   // 22.5 → «22.5» (бутархай алдагдахгүй)
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
                <thead>
                  <tr>
                    <th className="col-rank">№</th><th>Овог · нэр</th><th>Сургууль</th>
                    {problems.map((i) => <th key={i} className="col-p" title={`${i + 1}-р бодлого`}>Б{i + 1}</th>)}
                    <th className="col-total">Нийт</th>
                  </tr>
                </thead>
                <tbody id="results-body" key={`${year}-${cat}`}>
                  {rows.map((r) => {
                    const kind = medalKind(r.medal);
                    return (
                      <tr key={r.id} className={kind ? `medal medal-${kind}` : undefined}>
                        <td className="rank"><span>{r.rank ?? "—"}</span></td>
                        <td className="name">
                          {r.last_name && r.last_name !== "*" && <span className="last">{r.last_name} </span>}<strong>{r.first_name}</strong>
                          {kind && <span className={`medal-tag medal-tag-${kind}`}><MedalIcon kind={kind} />{MEDAL_LABEL[kind]}</span>}
                        </td>
                        <td className="school">{r.school}</td>
                        {problems.map((i) => <td key={i} className="p">{fmtScore(r.scores[i])}</td>)}
                        <td className="score" data-score={r.score ?? undefined}>{r.score === null ? "—" : 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
