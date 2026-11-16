"use client";

/* IB-ийн «Заадаг хичээлүүд» — бүлгийн дугуй: бүлэг бүр (Group 1, Group 2 …) цагирагийн нэг өнгөт хэсэг (сайтын 7 өнгийн палитр), дотор захдаа цайвар
   зурвас, нум дагуу бичигтэй (богино нэр + тайлбар; доод хагаст бичиг доошоо харахгүй). Голд IBDP тэмдэг, сонгосон бүлэг, хичээлийн тоо.
   Хэсэг дарахад (эсвэл сумаар — radiogroup) тухайн бүлэг гадагш тодорч, хажууд (гар утсанд доор) хичээлүүд HL/SL тэмдэгтэйгээ гарна.
   Хөдөлгөөн: хэсэг дэлгэцэнд орход хэсгүүд эргэлдэн дэлгэгдэнэ (GSAP, IntersectionObserver — Reveal.tsx-ийн шалтгаанаар); сонголт солигдоход
   жагсаалт зөөлөн солигдоно. Reduced motion үед анимацигүй. Өгөгдөл: админы «Хичээлүүд» таб (бүлэг, нэр, тэмдэг — "HL · SL", тайлбар). */

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { gsap, reduceMotion, useGSAP } from "@/components/site/gsap";
import { useDict } from "@/components/site/LangProvider";
import { readableOn, TAG_PALETTE } from "@/lib/color";
import { arcPath, groupSubjects, labelArc, levelsOf, polar, splitGroupName } from "@/lib/subject-wheel";
import type { ProgramSubject } from "@/lib/types";

const C = 200, R0 = 116, R1 = 194, BAND = 16, GAP = 1.6;

function Level({ kind }: { kind: "HL" | "SL" }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold tracking-wide ${kind === "HL" ? "bg-navy text-white" : "border border-navy text-navy"}`}>{kind}</span>;
}

export function SubjectWheel({ subjects, badge }: { subjects: ProgramSubject[]; badge: string }) {
  const t = useDict().programs;
  const uid = useId().replace(/:/g, "");
  const groups = groupSubjects(subjects, t.wheelOther);
  const [sel, setSel] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const n = groups.length, span = 360 / n;
  const i0 = Math.min(sel, n - 1);
  const active = groups[i0];
  const [short, sub] = splitGroupName(active.name);
  const color = (i: number): string => TAG_PALETTE[i % TAG_PALETTE.length].hex;

  // Анхны дэлгэгдэх хөдөлгөөн
  useGSAP(() => {
    const el = root.current;
    if (!el || reduceMotion()) return;
    const segs = gsap.utils.toArray<SVGGElement>("[data-seg]", el);
    const hub = el.querySelector("[data-hub]");
    gsap.set(segs, { autoAlpha: 0, scale: 0.72, rotation: -28, svgOrigin: `${C} ${C}` });
    if (hub) gsap.set(hub, { autoAlpha: 0, scale: 0.8 });
    const tl = gsap.timeline({ paused: true, onComplete: () => { gsap.set([...segs, ...(hub ? [hub] : [])], { clearProps: "all" }); } });
    tl.to(segs, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.7, ease: "back.out(1.4)", stagger: 0.07 });
    if (hub) tl.to(hub, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power2.out" }, 0.2);
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) { tl.play(); return; }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { tl.play(); io.disconnect(); } }, { rootMargin: "0px 0px -15% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, { scope: root });

  // Сонголт солигдоход жагсаалт зөөлөн гарч ирнэ (эхний render-д биш)
  useGSAP(() => {
    if (first.current) { first.current = false; return; }
    if (!panel.current || reduceMotion()) return;
    gsap.fromTo(panel.current.children, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out", stagger: 0.04, clearProps: "all" });
  }, { dependencies: [i0], scope: panel });

  function onKey(e: KeyboardEvent<SVGGElement>, i: number) {
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i - 1 + n) % n : null;
    if (next !== null) {
      e.preventDefault();
      setSel(next);
      root.current?.querySelector<SVGGElement>(`[data-seg-btn="${next}"]`)?.focus();
    } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(i); }
  }

  return (
    <div ref={root} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h3 className="font-display text-xl font-extrabold text-navy lg:text-2xl">{t.subjectsTitle}</h3>
        <p className="max-w-3xl text-[16px] text-muted">{t.wheelLead(subjects.length, n)}</p>
      </div>
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,11fr)_minmax(0,10fr)] lg:gap-12">
        <div className="relative mx-auto w-full max-w-[440px]">
          <svg viewBox="-12 -12 424 424" className="block w-full overflow-visible" role="radiogroup" aria-label={t.wheelAria}>
            <defs>
              {groups.map((g, i) => {
                const a0 = i * span + GAP / 2, a1 = (i + 1) * span - GAP / 2, mid = (a0 + a1) / 2, bottom = mid > 90 && mid < 270;
                const [, s2] = splitGroupName(g.name);
                const rTop = s2 ? (bottom ? 146 : 170) : 158, rSub = bottom ? 172 : 145;
                return [
                  <path key={`a${i}`} id={`${uid}a${i}`} d={labelArc(C, C, rTop, a0, a1)} />,
                  <path key={`b${i}`} id={`${uid}b${i}`} d={labelArc(C, C, rSub, a0, a1)} />,
                ];
              })}
            </defs>
            <circle cx={C} cy={C} r={R0 - 8} className="fill-white" />
            {groups.map((g, i) => {
              const a0 = i * span + GAP / 2, a1 = (i + 1) * span - GAP / 2, on = i === i0;
              const [dx, dy] = polar(0, 0, on ? 10 : 0, (a0 + a1) / 2);
              const [s1, s2] = splitGroupName(g.name);
              const ink = readableOn(color(i));
              return (
                <g key={g.name} data-seg-btn={i} role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
                   aria-label={`${g.name}: ${t.wheelCount(g.items.length)}`} onClick={() => setSel(i)} onKeyDown={(e) => onKey(e, i)}
                   style={{ transform: `translate(${dx}px, ${dy}px)`, opacity: on ? 1 : 0.62 }}
                   className="group cursor-pointer outline-none transition-[transform,opacity] duration-300 ease-out hover:opacity-100! motion-reduce:transition-none">
                  <g data-seg>
                    <path d={arcPath(C, C, R0, R1, a0, a1)} fill={color(i)} className="stroke-navy-deep stroke-0 group-focus-visible:stroke-[3]" />
                    <path d={arcPath(C, C, R0, R0 + BAND, a0, a1)} fill="#fff" opacity={0.38} />
                    <text fill={ink} fontSize={15} fontWeight={800} dominantBaseline="central">
                      <textPath href={`#${uid}a${i}`} startOffset="50%" textAnchor="middle">{s1}</textPath>
                    </text>
                    {s2 && (
                      <text fill={ink} fontSize={10.5} fontWeight={600} dominantBaseline="central" opacity={0.92}>
                        <textPath href={`#${uid}b${i}`} startOffset="50%" textAnchor="middle">{s2}</textPath>
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          </svg>
          {/* Гол: IBDP тэмдэг, сонгосон бүлэг, хичээлийн тоо (HTML — бичгийн чанар) */}
          <div data-hub aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="flex w-[46%] flex-col items-center gap-1 text-center">
              <span className="rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-extrabold text-navy-deep">{badge}</span>
              <span className="font-display text-[22px] font-extrabold leading-tight break-words text-navy sm:text-[26px]">{short}</span>
              {sub && <span className="text-[12px] leading-snug break-words text-muted sm:text-[13px]">{sub}</span>}
              <span className="text-[12px] font-bold text-ink/70">{t.wheelCount(active.items.length)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div ref={panel} aria-live="polite" className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: color(i0) }} />
              <h4 className="font-display text-xl font-extrabold leading-tight text-navy lg:text-2xl">{active.name}</h4>
            </div>
            <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-white">
              {active.items.map((s) => {
                const lv = levelsOf(s.tag);
                return (
                  <li key={s.key} className="flex flex-col gap-1 px-5 py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="text-[16px] font-bold leading-snug break-words text-ink">{s.name}</span>
                      <span className="flex items-center gap-1.5">
                        {lv.hl && <Level kind="HL" />}
                        {lv.sl && <Level kind="SL" />}
                        {lv.rest && <span className="text-xs font-semibold text-muted">{lv.rest}</span>}
                      </span>
                    </div>
                    {s.description && <p className="whitespace-pre-line text-[14px] leading-relaxed text-muted">{s.description}</p>}
                  </li>
                );
              })}
            </ul>
          </div>
          {subjects.some((s) => { const lv = levelsOf(s.tag); return lv.hl || lv.sl; }) && <p className="text-xs text-muted">{t.wheelLegend}</p>}
        </div>
      </div>
    </div>
  );
}
