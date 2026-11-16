"use client";

/* Бүртгэлийн алхмын заагч (элсэлт, дугуйлан): дугуй тэмдгүүд, тэдгээрийг холбосон шугам идэвхтэй алхам хүртэл урсан дүүрнэ (CSS transition).
   Дууссан алхамд check тэмдэг зурагдана, идэвхтэй алхам долгион гэрэлтэлттэй, шинэ алхамд шилжихэд тэмдэг нь үсэрнэ (GSAP).
   Өнгө: tone="navy" (анхдагч, дугуйлан) эсвэл "green" (элсэлт). Reduced motion үед хөдөлгөөнгүй (globals.css — step-halo, step-check). */

import { useRef } from "react";
import { gsap, reduceMotion, useGSAP } from "./gsap";

const TONES = {
  navy: { fill: "from-navy to-[#3b5bdb]", done: "bg-navy text-white", active: "text-navy ring-navy", halo: "bg-navy/25", label: "text-navy" },
  green: { fill: "from-emerald-600 to-emerald-400", done: "bg-emerald-600 text-white", active: "text-emerald-700 ring-emerald-600", halo: "bg-emerald-500/30", label: "text-emerald-700" },
};

export function StepProgress({ steps, current, ariaLabel, tone = "navy", className = "" }: {
  steps: string[]; current: number; ariaLabel: string; tone?: keyof typeof TONES; className?: string;
}) {
  const c = TONES[tone];
  const root = useRef<HTMLOListElement>(null);
  const first = useRef(true);
  const n = steps.length;
  const edge = 50 / n;                                              // эхний ба сүүлийн дугуйн төв (%)
  const fill = n > 1 ? ((100 - 2 * edge) * Math.min(current, n - 1)) / (n - 1) : 0;

  useGSAP(() => {
    if (first.current) { first.current = false; return; }
    const dot = root.current?.querySelector("[aria-current='step'] [data-dot]");
    if (!dot || reduceMotion()) return;
    gsap.fromTo(dot, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: "back.out(2.6)", delay: 0.25 });
  }, { scope: root, dependencies: [current] });

  return (
    <ol ref={root} aria-label={ariaLabel} className={`relative grid ${className}`} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <span aria-hidden="true" className="absolute top-[17px] h-1 rounded-full bg-paper-3" style={{ left: `${edge}%`, right: `${edge}%` }} />
      <span aria-hidden="true"
            className={`absolute top-[17px] h-1 rounded-full bg-gradient-to-r ${c.fill} transition-[width] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none`}
            style={{ left: `${edge}%`, width: `${fill}%` }} />
      {steps.map((label, i) => {
        const done = i < current, active = i === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="relative z-[1] flex flex-col items-center gap-1.5 text-center">
            <span data-dot className={`relative grid h-[38px] w-[38px] place-items-center rounded-full text-sm font-extrabold transition-colors duration-300
              ${done ? c.done : active ? `bg-white ring-[3px] ${c.active}` : "bg-paper-3 text-muted"}`}>
              {active && <span aria-hidden="true" className={`step-halo absolute inset-0 rounded-full ${c.halo}`} />}
              {done ? (
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path className="step-check" d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
                </svg>
              ) : <span className="relative">{i + 1}</span>}
            </span>
            <span className={`text-xs font-semibold transition-colors duration-300 ${done || active ? c.label : "text-muted"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
