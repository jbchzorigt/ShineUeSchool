"use client";

/* Хуваарь: босоо төв шугамтай timeline. Оны табууд; шат бүр ээлжлэн зүүн/баруун талд; шугамын дэргэд календарийн карт
   (гарагийн товчлол + өдрийн тоо, гурвалжин заагч → төв шугамын цэг рүү); "он – гарчиг" тод, доор тайлбар, tag-ууд.
   Гүйлгэхэд төв шугам дээрээс доош ургана (ScrollTrigger scrub, scaleY), шат бүр өөрийн талаасаа гулсаж орж ирнэ
   (он солиход шууд дараалан). Утсанд шугам зүүн талд, бүх шат баруун талд. Огноо: stage.date (YYYY-MM-DD) байвал гараг/өдөр,
   үгүй бол date_text-ээс ("2026 · 10 сарын 1–20") сар, өдөр, оныг задалж, задрахгүй бол текстийг картад бичнэ. Reduced motion: анимацигүй. CSS: olympiad.css ".tl" блок. */

import { useState, useRef } from "react";
import type { Stage } from "@/lib/types";
import { FORMULAS } from "@/lib/olympiad-data";
import { gsap, ScrollTrigger, reduceMotion, useGSAP } from "./gsap";
import { Formulas } from "./Formulas";
import { Heading } from "./Heading";

const WEEKDAYS = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];   // JS getDay(): 0 = Ням

interface Cal { top: string; big: string; foot?: string; range?: boolean }
/** Календарийн карт: stage.date ("YYYY-MM-DD") байвал гараг + өдөр; үгүй бол date_text ("2026 · 10 сарын 1–20") → сар + өдөр (+он);
    аль нь ч задрахгүй бол null (карт дээр date_text-ийг шууд бичнэ). */
function calendar(iso: string | null, text: string): Cal | null {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!Number.isNaN(d.getTime())) return { top: WEEKDAYS[d.getDay()], big: m[3], foot: `${Number(m[2])}-р сар ${m[1]}` };
  }
  const t = text.match(/^(\d{4})\s*·\s*(\d{1,2})\s*сарын\s*(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?/);
  if (t) return { top: `${t[2]}-р сар`, big: t[4] ? `${t[3]}–${t[4]}` : t[3], foot: t[1], range: !!t[4] };
  return null;
}

export function Schedule({ stages, currentYear }: { stages: Stage[] | null; currentYear: number }) {
  const root = useRef<HTMLElement>(null);
  const years = Array.from(new Set((stages ?? []).map((s) => s.year))).sort((a, b) => a - b);
  const [year, setYear] = useState<number | null>(null);
  const active = year ?? (years.includes(currentYear) ? currentYear : years[years.length - 1]);
  const items = (stages ?? []).filter((s) => s.year === active).sort((a, b) => a.order - b.order);
  const past = active < currentYear;

  useGSAP(() => {
    const tl = root.current?.querySelector<HTMLElement>(".tl");
    if (!tl || !items.length) return;
    const fill = tl.querySelector<HTMLElement>(".tl-line-fill")!;
    const rows = gsap.utils.toArray<HTMLElement>(".tl-item", tl);
    if (reduceMotion()) { gsap.set(fill, { scaleY: 1 }); return; }
    const instant = year !== null;   // он солиход: гүйлгэхийг хүлээлгүй дараалан
    const created: ScrollTrigger[] = [];
    const tweens: gsap.core.Tween[] = [];

    // Төв шугам: хэсгийг гүйлгэх явцад дээрээс доош ургана
    const draw = gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: "none", transformOrigin: "50% 0%",
      scrollTrigger: { trigger: tl, start: "top 70%", end: "bottom 60%", scrub: 0.6 } });
    if (draw.scrollTrigger) created.push(draw.scrollTrigger);

    rows.forEach((row, i) => {
      const fromLeft = !row.classList.contains("is-right");
      const cal = row.querySelector(".tl-cal"), dot = row.querySelector(".tl-dot"), copy = row.querySelector(".tl-copy");
      const anim = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } })
        .from(dot, { scale: 0, duration: 0.4, ease: "back.out(2)", transformOrigin: "50% 50%" })
        .from(cal, { autoAlpha: 0, x: fromLeft ? 24 : -24, duration: 0.5 }, "-=0.2")
        .from(copy, { autoAlpha: 0, x: fromLeft ? -32 : 32, duration: 0.6 }, "-=0.35");
      tweens.push(anim as unknown as gsap.core.Tween);
      if (instant) anim.delay(i * 0.12).play();
      else created.push(ScrollTrigger.create({ trigger: row, start: "top 82%", onEnter: () => anim.play(), onLeaveBack: () => anim.reverse() }));
    });
    ScrollTrigger.refresh();
    return () => { created.forEach((t) => t.kill()); tweens.forEach((t) => t.kill()); };
  }, { scope: root, dependencies: [active, items.length] });

  return (
    <section ref={root} className="section section-schedule" id="schedule">
      <Formulas items={FORMULAS.schedule} />
      <div className="section-inner">
        <p className="eyebrow">Хуваарь</p>
        <Heading variant={1}>Олимпиад хэрхэн явагдах вэ</Heading>
        <p className="lead">6–12-р ангийн сурагчид гурван шаттай оролцоно. Оноо сонгоод тухайн жилийн хуваарийг харна уу.</p>
        {!stages ? <p className="section-note">Мэдээлэл түр байхгүй.</p> : !years.length ? <p className="section-note">Хуваарь удахгүй.</p> : (
          <>
            <div className="year-tabs" id="schedule-years" role="tablist" aria-label="Он">
              {years.map((y) => <button key={y} type="button" role="tab" aria-selected={y === active} className={y === active ? "is-active" : undefined} onClick={() => setYear(y)}>{y}</button>)}
            </div>
            <div className="tl" key={active}>
              <div className="tl-line" aria-hidden="true"><span className="tl-line-fill" /></div>
              <ol className="tl-list">
                {items.map((s, i) => {
                  const cal = calendar(s.date, s.date_text);
                  return (
                    <li key={s.id} className={`tl-item ${i % 2 ? "is-right" : "is-left"}`}>
                      <div className="tl-side">
                        <div className="tl-copy">
                          <span className="tl-step">{i + 1}-р шат{past ? " · явагдсан" : ""}</span>
                          <h3><span className="tl-year">{s.year} –</span> {s.title}</h3>
                          <p>{s.text}</p>
                          {s.location && <p className="tl-loc">{s.location}</p>}
                          {s.tags.length > 0 && <ul className="tl-tags">{s.tags.map((t, idx) => <li key={`${t}-${idx}`}>{t}</li>)}</ul>}
                        </div>
                        <div className="tl-cal" title={s.date_text}>
                          {cal ? (
                            <>
                              <span className="tl-cal-top">{cal.top}</span>
                              <span className={`tl-cal-day${cal.range ? " is-range" : ""}`}>{cal.big}</span>
                              {cal.foot && <span className="tl-cal-foot">{cal.foot}</span>}
                            </>
                          ) : (
                            <><span className="tl-cal-top">Огноо</span><span className="tl-cal-text">{s.date_text}</span></>
                          )}
                          <span className="tl-cal-arrow" aria-hidden="true" />
                        </div>
                      </div>
                      <span className="tl-dot" aria-hidden="true" />
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
