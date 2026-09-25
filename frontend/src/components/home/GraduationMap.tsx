"use client";

/* =====================================================================
   Төгсөгчдийн газрын зураг: дэлхийн зураг дээр Монголоос очсон улс бүр рүү нислэгийн маягийн нум (great-circle),
   улс/цэг/чип дээр дарахад тухайн улсад элссэн сургуулиудын цагаан жагсаалт — bullet нь тивийн өнгөөр (CONTINENTS).
   - Улс, сургуулиуд админаас (/admin/graduates → GET /api/graduates/); path-ууд server дээр (lib/world-map.ts) prop-оор ирнэ.
   - Монгол: логоны gold дүүргэлт + цагаан хүрээ + гэрэл, Улаанбаатар дээр байнга лугшдаг цагаан цагираг (GSAP repeat).
   - Хэсэг дэлгэцэнд орж ирэхэд нумууд DrawSVG-ээр Монголоос гарч зурагдаж, төгсгөлийн цэгүүд гарч ирнэ (нэг удаа);
     сонгосон улсын нум тод, бусад нь бүдэг. Reduced motion: шууд бүрэн.
   - Газрын зураг бүтэн өргөн; сонгосон улсын карт үргэлж доор нь бүтэн өргөнөөр, сургуулиуд 2–4 баганат сүлжээ (8+ бол цагаан толгойн дарааллаар); тоо badge-тай.
   - Хүртээмж: цэг бүр <button> (aria-pressed), улсын чипүүд газрын зургийн доор — утсанд гол удирдлага.
   ===================================================================== */

import { useRef, useState } from "react";
import { CONTINENTS, MONGOLIA } from "@/lib/home-data";
import type { GraduateDestination } from "@/lib/types";
import type { MapData } from "@/lib/world-map";
import { gsap, reduceMotion, useGSAP } from "@/components/site/gsap";

export function GraduationMap({ map, destinations: DESTINATIONS }: { map: MapData; destinations: GraduateDestination[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string>(DESTINATIONS[0]?.code ?? "");
  const dest = DESTINATIONS.find((d) => d.code === selected) ?? DESTINATIONS[0];
  const color = (code: string) => CONTINENTS[DESTINATIONS.find((d) => d.code === code)?.continent ?? "other"].color;
  // Карт үргэлж зургийн доор бүтэн өргөнөөр; 8-аас олон сургуультай бол (АНУ) цагаан толгойн дарааллаар
  const many = (dest?.universities.length ?? 0) > 8;
  const unis = dest ? (many ? [...dest.universities].sort((a, b) => a.localeCompare(b, "en")) : dest.universities) : [];

  useGSAP(() => {
    const el = root.current;
    if (!el) return;
    const arcs = gsap.utils.toArray<SVGPathElement>(".gm-arc", el);
    const dots = gsap.utils.toArray<SVGGElement>(".gm-dot", el);
    const pulses = gsap.utils.toArray<SVGCircleElement>(".gm-pulse", el);
    if (reduceMotion()) return;
    // Улаанбаатарын лугшилт: 2 цагираг ээлжлэн томорч бүдгэрнэ (байнга)
    gsap.fromTo(pulses, { scale: 1, opacity: 0.9, transformOrigin: "50% 50%" }, { scale: 3.2, opacity: 0, duration: 2, ease: "power1.out", repeat: -1, stagger: 1 });
    gsap.set(arcs, { drawSVG: "0% 0%" });
    gsap.set(dots, { scale: 0, transformOrigin: "50% 50%" });
    const play = () => {
      gsap.timeline()
        .to(arcs, { drawSVG: "0% 100%", duration: 1.4, ease: "power2.inOut", stagger: 0.1 })
        .to(dots, { scale: 1, duration: 0.5, ease: "back.out(2)", stagger: 0.1 }, "-=1.2");
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { play(); io.disconnect(); }
    }, { rootMargin: "0px 0px -20% 0px", threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, { scope: root });

  return (
    <div ref={root} className="flex flex-col gap-6 lg:gap-8">
      {/* Газрын зураг */}
      <div className="flex flex-col gap-4">
        <svg viewBox={`0 0 ${map.width} ${map.height}`} className="w-full" role="img" aria-label="Төгсөгчид элссэн улсуудын газрын зураг">
          <path d={map.land} fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
          {map.countries.map((c) => {
            const on = c.code === selected;
            return <path key={c.code} d={c.d} fill={color(c.code)} fillOpacity={on ? 0.9 : 0.4} stroke={on ? "#fff" : "none"} strokeWidth="0.8" className="cursor-pointer transition-[fill-opacity] hover:fill-opacity-80" onClick={() => setSelected(c.code)} />;
          })}
          {/* Нумууд: сонгосон нь тод */}
          {map.arcs.map((a) => (
            <path key={a.code} d={a.d} className="gm-arc" fill="none" stroke={color(a.code)} strokeWidth={a.code === selected ? 2.4 : 1.2} strokeOpacity={a.code === selected ? 1 : 0.55} strokeLinecap="round" strokeDasharray={a.code === selected ? undefined : "4 3"} />
          ))}
          {/* Монгол: логоны шар (gold) дүүргэлт, цагаан хүрээ, гэрэлтэй; Улаанбаатар дээр лугшдаг цагираг */}
          <path d={map.mongolia} fill="#ffc20e" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px rgba(255,194,14,0.8))" }} />
          <g transform={`translate(${map.home.x},${map.home.y})`}>
            <circle className="gm-pulse" r="7" fill="none" stroke="#fff" strokeWidth="1.5" />
            <circle className="gm-pulse" r="7" fill="none" stroke="#fff" strokeWidth="1.5" />
            <circle r="4.5" fill="#fff" stroke="#12245c" strokeWidth="1.5" />
            <text y="-14" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" stroke="#12245c" strokeWidth="3" paintOrder="stroke">{MONGOLIA.name}</text>
          </g>
          {/* Төгсгөлийн цэгүүд (товч) */}
          {map.arcs.map((a) => {
            const d = DESTINATIONS.find((x) => x.code === a.code)!;
            const on = a.code === selected;
            return (
              <g key={a.code} className="gm-dot cursor-pointer" transform={`translate(${a.x},${a.y})`} role="button" tabIndex={0} aria-pressed={on} aria-label={d.name}
                 onClick={() => setSelected(a.code)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(a.code); } }}>
                <circle r={on ? 11 : 8} fill={color(a.code)} fillOpacity="0.3" />
                <circle r={on ? 5.5 : 4} fill={color(a.code)} stroke="#12245c" strokeWidth="1.5" />
              </g>
            );
          })}
        </svg>
        {/* Улсын чипүүд (утсанд гол удирдлага) + тивийн тайлбар */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Улс">
          {DESTINATIONS.map((d) => {
            const on = d.code === selected;
            return (
              <button key={d.code} type="button" role="tab" aria-selected={on} onClick={() => setSelected(d.code)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${on ? "border-white bg-white text-navy" : "border-white/25 text-white/85 hover:border-white/60"}`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: CONTINENTS[d.continent].color }} aria-hidden="true" />
                {d.name}
              </button>
            );
          })}
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/70" aria-label="Тивийн өнгө">
          {Object.values(CONTINENTS).map((c) => (
            <li key={c.name} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} aria-hidden="true" />{c.name}</li>
          ))}
        </ul>
      </div>

      {/* Сонгосон улсын сургуулиуд — зургийн доор цагаан карт, бүх улсад ижил */}
      <div className="rounded-2xl bg-white p-6 text-ink lg:p-7" aria-live="polite">
        {dest ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{CONTINENTS[dest.continent].name}</span>
                <h3 className="mt-1 font-display text-2xl font-extrabold text-navy">{dest.name}</h3>
                <p className="mt-1 text-sm text-muted">Манай төгсөгчид элссэн сургуулиуд</p>
              </div>
              <span className="inline-flex items-baseline gap-1.5 rounded-full px-4 py-1.5 font-display text-2xl font-extrabold text-navy-deep" style={{ background: CONTINENTS[dest.continent].color }}>
                {dest.universities.length}<span className="text-xs font-semibold uppercase tracking-wider">сургууль</span>
              </span>
            </div>
            <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {unis.map((u) => (
                <li key={u} className="flex items-start gap-3 text-[15px] font-medium leading-snug">
                  <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.15)]" style={{ background: CONTINENTS[dest.continent].color }} aria-hidden="true" />
                  {u}
                </li>
              ))}
            </ul>
          </>
        ) : <p className="text-muted">Газрын зураг дээрээс улс сонгоно уу.</p>}
      </div>
    </div>
  );
}
