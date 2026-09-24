"use client";

/* =====================================================================
   Сургуулийн түүх: "могой" timeline (олимпиадын хуваарийн Schedule.tsx-ийн бүтэц, сайтын хэв маягаар).
   - Үе шатууд мөрөнд (desktop 3 / tablet 2 / утас 1 багана), мөр бүр эсрэг чиглэлд (RTL), нэг SVG зам мөрийн дагуу
     явж булангаар доош эргэнэ. Он шугамын дээр "сууна" (дэвсгэр нь шугамыг таслана), доор нь карт.
   - Гүйлгэхэд зам DrawSVG-ээр зурагдаж, үзүүрийн цэг замын дагуу явна: gsap.ticker дээр хэсгийн
     getBoundingClientRect-ээр прогресс тооцно (ScrollSmoother-ийн transform дор ScrollTrigger найдваргүй байсан).
   - Үе шат бүр дэлгэцэнд орж ирэхэд IntersectionObserver-оор гарч ирнэ (дээшээ гүйлгэж алга болбол буцна).
   - Өргөн өөрчлөгдвөл багана дахин тооцоолж зам дахин барина. prefers-reduced-motion: зам бүтэн, бүгд шууд харагдана.
   - /about хуудас ашиглана (нүүрэнд оронд нь Graduation.tsx). Өгөгдөл: lib/home-data.ts HISTORY.
   CSS: globals.css ".history-snake" блок. ===================================================================== */

import { useRef, useState } from "react";
import { HISTORY } from "@/lib/home-data";
import { gsap, reduceMotion, useGSAP } from "@/components/site/gsap";

const TL_COLORS = ["#FF3F33", "#9FC87E", "#FF9800", "#FF6666"];
const R = 44, LINE_Y = 26;
const perRow = () => (typeof window === "undefined" ? 3 : innerWidth < 640 ? 1 : innerWidth < 1024 ? 2 : 3);

export function HistoryTimeline() {
  const root = useRef<HTMLElement>(null);
  const [cols, setCols] = useState(3);
  const rows: (typeof HISTORY)[] = [];
  for (let i = 0; i < HISTORY.length; i += cols) rows.push(HISTORY.slice(i, i + cols));

  useGSAP(() => {
    const snake = root.current?.querySelector<HTMLElement>(".history-snake");
    if (!snake || !HISTORY.length) return;
    const svg = snake.querySelector<SVGSVGElement>(".snake-svg")!;
    const path = svg.querySelector<SVGPathElement>(".snake-path")!;
    const tip = svg.querySelector<SVGGElement>(".snake-tip")!;
    const rowsBox = snake.querySelector<HTMLElement>(".snake-rows")!;
    const reduce = reduceMotion();
    let len = 0;

    /* Зам: мөр бүрийн эхний → сүүлийн үеийн төвөөр, захаар доош эргэж дараагийн мөр рүү (Schedule.tsx buildPath) */
    function buildPath() {
      const box = snake!.getBoundingClientRect();
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
        if (i === 0) d += `M${first},${y}`;
        if (i === rowEls.length - 1) {
          d += ` L${last},${y}`;
        } else {
          const ny = rowY(rowEls[i + 1]);
          d += rev
            ? ` L${xL + R},${y} Q${xL},${y} ${xL},${y + R} L${xL},${ny - R} Q${xL},${ny} ${xL + R},${ny}`
            : ` L${xR - R},${y} Q${xR},${y} ${xR},${y + R} L${xR},${ny - R} Q${xR},${ny} ${xR - R},${ny}`;
        }
      });
      path.setAttribute("d", d);
      len = path.getTotalLength();
      const s = path.getPointAtLength(0), e = path.getPointAtLength(len);
      svg.querySelector(".snake-start")!.setAttribute("transform", `translate(${s.x},${s.y})`);
      svg.querySelector(".snake-end")!.setAttribute("transform", `translate(${e.x},${e.y})`);
    }
    buildPath();

    const items = gsap.utils.toArray<HTMLElement>(".snake-item", rowsBox);
    let onTick: (() => void) | null = null;
    let io: IntersectionObserver | null = null;
    const tls: gsap.core.Timeline[] = [];

    if (reduce) {
      gsap.set(path, { drawSVG: "0% 100%" });
      gsap.set(tip, { autoAlpha: 0 });
    } else {
      /* Гүйлгэх прогресс: хэсгийн дээд зах viewport-ийн 70%-д = 0, доод зах 55%-д = 1 (Schedule-ийн start/end) */
      let lastP = -1;
      onTick = () => {
        const r = snake!.getBoundingClientRect(), vh = innerHeight;
        const p = gsap.utils.clamp(0, 1, (vh * 0.7 - r.top) / (vh * 0.15 + r.height));
        if (p === lastP || !len) return;
        lastP = p;
        gsap.set(path, { drawSVG: `0% ${p * 100}%` });
        const pt = path.getPointAtLength(p * len);
        tip.setAttribute("transform", `translate(${pt.x},${pt.y})`);
      };
      gsap.ticker.add(onTick);

      /* Үе шат бүр: он → карт дараалан гарч ирнэ; дэлгэцээс доошоо гарвал буцна */
      const anims = new Map<Element, gsap.core.Timeline>();
      items.forEach((item) => {
        const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } })
          .from(item.querySelector(".snake-date"), { scale: 0.6, autoAlpha: 0, duration: 0.5, ease: "back.out(2)", transformOrigin: "50% 50%" })
          .from(item.querySelector(".snake-card"), { autoAlpha: 0, y: 24, duration: 0.6 }, "-=0.25");
        anims.set(item, tl); tls.push(tl);
      });
      io = new IntersectionObserver((entries) => {
        for (const en of entries) {
          const tl = anims.get(en.target);
          if (!tl) continue;
          if (en.isIntersecting) tl.play();
          else if (en.boundingClientRect.top > 0) tl.reverse();   // доошоо гарсан → буцаана (дээшээ гарсан бол хэвээр)
        }
      }, { rootMargin: "0px 0px -22% 0px", threshold: 0 });
      items.forEach((it) => io!.observe(it));
    }

    const ro = new ResizeObserver(() => { const c = perRow(); if (c !== cols) setCols(c); else { buildPath(); if (onTick) { onTick(); } } });
    ro.observe(snake);
    return () => {
      ro.disconnect();
      io?.disconnect();
      if (onTick) gsap.ticker.remove(onTick);
      tls.forEach((t) => t.kill());
    };
  }, { scope: root, dependencies: [cols] });

  return (
    <section ref={root} id="history" className="scroll-mt-20 border-t border-line bg-paper-2">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center px-4 py-10 md:px-10 lg:px-24 lg:py-[72px]">
        <h2 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Сургуулийн түүх</h2>
        <p className="mt-3 max-w-[32em] text-center text-muted lg:text-lg">Үүсгэн байгуулагдсанаас өнөөдрийг хүртэлх гол үе шатууд.</p>

        <div className="history-snake">
          <svg className="snake-svg" aria-hidden="true">
            <defs>
              <linearGradient id="history-snake-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1200">
                <stop offset="0%" stopColor="#FF3F33" /><stop offset="33%" stopColor="#9FC87E" /><stop offset="66%" stopColor="#FF9800" /><stop offset="100%" stopColor="#FF6666" />
              </linearGradient>
            </defs>
            <path className="snake-path" d="M0,0" fill="none" stroke="url(#history-snake-grad)" />
            <g className="snake-start"><circle r="9" fill="#1E3A8F" /><circle r="4" fill="#fff" /></g>
            <g className="snake-end"><circle r="9" fill="#FFC20E" /><circle r="4" fill="#1E3A8F" /></g>
            <g className="snake-tip"><circle r="7" fill="#1E3A8F" /><circle r="12" fill="none" stroke="#1E3A8F" strokeWidth="2" opacity="0.4" /></g>
          </svg>
          <ol className="snake-rows" key={cols} aria-label="Сургуулийн түүхийн үе шатууд">
            {rows.map((row, r) => (
              <li key={r} className={`snake-row${r % 2 ? " is-rev" : ""}`}>
                {row.map((e, j) => {
                  const i = r * cols + j;
                  return (
                    <article key={i} className="snake-item" style={{ ["--tl-c" as string]: TL_COLORS[i % TL_COLORS.length] }}>
                      <div className="snake-date"><span className="snake-date-big">{e.year ?? "[он]"}</span><span className="snake-date-yr">{i + 1}-р үе</span></div>
                      <div className="snake-card">
                        <h3>{e.title}</h3>
                        <p>{e.text}</p>
                      </div>
                    </article>
                  );
                })}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
