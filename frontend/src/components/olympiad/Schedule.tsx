"use client";

/* Хуваарь (schedule.js): оны табууд; шатууд "могой" мөрөнд (3/2/1 багана responsive); нэг SVG зам мөрийн дагуу явж
   булангаар доош эргэнэ — гүйлгэхэд DrawSVG scrub, үзүүрийн цэг MotionPath-аар дагана; шат бүр ScrollTrigger-ээр гарч ирнэ. */

import { useState, useRef } from "react";
import type { Stage } from "@/lib/types";
import { FORMULAS } from "@/lib/olympiad-data";
import { gsap, ScrollTrigger, reduceMotion, useGSAP } from "./gsap";
import { Formulas } from "./Formulas";
import { Heading } from "./Heading";

const TL_COLORS = ["#FF3F33", "#9FC87E", "#FF9800", "#FF6666"];
const R = 44, LINE_Y = 26;
const perRow = () => (typeof window === "undefined" ? 3 : innerWidth < 640 ? 1 : innerWidth < 1024 ? 2 : 3);

export function Schedule({ stages, currentYear }: { stages: Stage[] | null; currentYear: number }) {
  const root = useRef<HTMLElement>(null);
  const years = Array.from(new Set((stages ?? []).map((s) => s.year))).sort((a, b) => a - b);
  const [year, setYear] = useState<number | null>(null);
  const [cols, setCols] = useState<number>(3);
  const active = year ?? (years.includes(currentYear) ? currentYear : years[years.length - 1]);
  const items = (stages ?? []).filter((s) => s.year === active).sort((a, b) => a.order - b.order);
  const past = active < currentYear;
  const rows: Stage[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));

  // ResizeObserver callback дотор setState — effect биш, observer callback тул зөвшөөрөгдөнө
  const setColsSafe = (c: number) => setCols(c);

  useGSAP(() => {
    const snakeRef = root.current?.querySelector<HTMLElement>("#snake");
    if (!snakeRef || !items.length) return; // stages null/empty үед #snake render хийгдэхгүй
    const snake = snakeRef; // nested функцүүдэд null-гүй төрлөөр дамжуулах
    const svg = snake.querySelector<SVGSVGElement>(".snake-svg")!;
    const path = svg.querySelector<SVGPathElement>(".snake-path")!;
    const tip = svg.querySelector<SVGGElement>(".snake-tip")!;
    const rowsBox = snake.querySelector<HTMLElement>(".snake-rows")!;
    const reduce = reduceMotion();

    /* ---- schedule.js buildPath() 108–151-р мөрийг хуулна ---- */
    function buildPath() {
      const box = snake.getBoundingClientRect();
      const W = box.width, H = box.height;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

      const rowEls = gsap.utils.toArray<HTMLElement>(".snake-row", rowsBox);
      if (!rowEls.length) return;

      const cx = (el: Element) => { const r = el.getBoundingClientRect(); return r.left - box.left + r.width / 2; };
      const rowY = (row: Element) => row.getBoundingClientRect().top - box.top + LINE_Y;
      const xR = W - 12, xL = 12;

      let d = "";
      rowEls.forEach((rowEl, i) => {
        const rowItems = gsap.utils.toArray<HTMLElement>(".snake-item", rowEl);
        const y = rowY(rowEl);
        const rev = i % 2 === 1;
        const first = cx(rowItems[0]);
        const last = cx(rowItems[rowItems.length - 1]);
        const isLast = i === rowEls.length - 1;

        if (i === 0) d += `M${first},${y}`;

        if (isLast) {
          d += ` L${last},${y}`;
        } else {
          const ny = rowY(rowEls[i + 1]);
          if (!rev) {
            d += ` L${xR - R},${y} Q${xR},${y} ${xR},${y + R} L${xR},${ny - R} Q${xR},${ny} ${xR - R},${ny}`;
          } else {
            d += ` L${xL + R},${y} Q${xL},${y} ${xL},${y + R} L${xL},${ny - R} Q${xL},${ny} ${xL + R},${ny}`;
          }
        }
      });
      path.setAttribute("d", d);

      const startPt = path.getPointAtLength(0);
      const endPt = path.getPointAtLength(path.getTotalLength());
      svg.querySelector(".snake-start")!.setAttribute("transform", `translate(${startPt.x},${startPt.y})`);
      svg.querySelector(".snake-end")!.setAttribute("transform", `translate(${endPt.x},${endPt.y})`);
    }

    buildPath();
    /* ---- schedule.js animate(instant) 154–196-р мөрийг хуулна ---- */
    const instant = year !== null;
    const created: ScrollTrigger[] = [];
    const instantTls: gsap.core.Timeline[] = [];

    if (reduce) {
      gsap.set(path, { drawSVG: "0% 100%" });
      gsap.set(tip, { autoAlpha: 0 });
      ScrollTrigger.refresh();
    } else {
      const scrub = { trigger: snake, start: "top 70%", end: "bottom 55%", scrub: 0.6 };
      const drawTween = gsap.fromTo(path, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", ease: "none", scrollTrigger: scrub });
      const tipTween = gsap.to(tip, {
        ease: "none",
        motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
        scrollTrigger: { ...scrub },
      });
      if (drawTween.scrollTrigger) created.push(drawTween.scrollTrigger);
      if (tipTween.scrollTrigger) created.push(tipTween.scrollTrigger);

      gsap.utils.toArray<HTMLElement>(".snake-item", rowsBox).forEach((item, i) => {
        const anim = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } })
          .from(item.querySelector(".snake-date"), { scale: 0.6, autoAlpha: 0, duration: 0.5, ease: "back.out(2)", transformOrigin: "50% 50%" })
          .from(item.querySelector(".snake-card"), { autoAlpha: 0, y: 24, duration: 0.6 }, "-=0.25")
          .from(item.querySelectorAll(".tl-tags li"), { autoAlpha: 0, y: 6, duration: 0.3, stagger: 0.08 }, "-=0.3");
        instantTls.push(anim);

        if (instant) {
          anim.delay(i * 0.1).play();
        } else {
          created.push(ScrollTrigger.create({
            trigger: item,
            start: "top 78%",
            onEnter: () => anim.play(),
            onLeaveBack: () => anim.reverse(),
          }));
        }
      });
      ScrollTrigger.refresh();
    }

    const ro = new ResizeObserver(() => { const c = perRow(); if (c !== cols) setColsSafe(c); else buildPath(); });
    ro.observe(snake);
    return () => { ro.disconnect(); created.forEach((t) => t.kill()); instantTls.forEach((tl) => tl.kill()); };
  }, { scope: root, dependencies: [active, cols, items.length] });

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
            <div className="snake" id="snake">
              <svg className="snake-svg" aria-hidden="true">
                <defs>
                  <linearGradient id="snake-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1200">
                    <stop offset="0%" stopColor="#FF3F33" /><stop offset="33%" stopColor="#9FC87E" /><stop offset="66%" stopColor="#FF9800" /><stop offset="100%" stopColor="#FF6666" />
                  </linearGradient>
                </defs>
                <path className="snake-path" d="M0,0" fill="none" stroke="url(#snake-grad)" />
                <g className="snake-start"><circle r="9" fill="#1E3A8F" /><circle r="4" fill="#fff" /></g>
                <g className="snake-end"><circle r="9" fill="#FFC20E" /><circle r="4" fill="#1E3A8F" /></g>
                <g className="snake-tip"><circle r="7" fill="#1E3A8F" /><circle r="12" fill="none" stroke="#1E3A8F" strokeWidth="2" opacity="0.4" /></g>
              </svg>
              <div className="snake-rows" key={`${active}-${cols}`}>
                {rows.map((row, r) => (
                  <div key={r} className={`snake-row${r % 2 ? " is-rev" : ""}`}>
                    {row.map((s, j) => {
                      const i = r * cols + j;
                      const [yr, rest] = s.date_text.split(" · ");
                      return (
                        <article key={s.id} className="snake-item" style={{ ["--tl-c" as string]: TL_COLORS[i % TL_COLORS.length] }}>
                          <div className="snake-date"><span className="snake-date-big">{rest || s.date_text}</span><span className="snake-date-yr">{rest ? yr : ""}</span></div>
                          <div className="snake-card">
                            <span className="snake-step">{i + 1}-р шат{past ? " · явагдсан" : ""}</span>
                            <h3>{s.title}</h3>
                            <p>{s.text}</p>
                            <ul className="tl-tags">{s.tags.map((t, idx) => <li key={`${t}-${idx}`}>{t}</li>)}</ul>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
