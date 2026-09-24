"use client";

/* =====================================================================
   Төгсөлт: сургуулийн төгсөгчдийн тоо — GSAP counter. Navy дэвсгэр дээр том gold тоо (нийт төгсөгч) + их дээд сургуульд
   элссэн хувь/тоо, гадаадын их сургуулийн тоо. Тоонууд админаас (GET /api/graduates/stats/), гарчиг/тайлбар home-data.ts.
   - Хэсэг дэлгэцэнд орж ирэхэд (IntersectionObserver, нэг удаа) тоонууд 0-ээс gsap.to-оор өсч (power2.out, snap),
     мянгатын тусгаарлагчтай форматлагдана; том тоо 2.2с, жижиг нь 1.6с stagger-тэй.
   - Доор нь дэлхийн зураг (GraduationMap.tsx): улсууд админаас (GET /api/graduates/), path-уудыг page.tsx server дээр buildMapData()-аар.
   - prefers-reduced-motion: анимацигүй, эцсийн тоо шууд.
   ===================================================================== */

import Link from "next/link";
import { useRef } from "react";
import { GRADUATION } from "@/lib/home-data";
import type { GraduateDestination, GraduateStats } from "@/lib/types";
import type { MapData } from "@/lib/world-map";
import { GraduationMap } from "./GraduationMap";
import { gsap, reduceMotion, useGSAP } from "@/components/site/gsap";

const fmt = new Intl.NumberFormat("en-US");

export function Graduation({ stats, map, destinations }: { stats: GraduateStats; map: MapData | null; destinations: GraduateDestination[] }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = root.current;
    if (!el) return;
    const nums = gsap.utils.toArray<HTMLElement>("[data-count]", el);
    const render = (n: HTMLElement, v: number) => { n.textContent = fmt.format(Math.round(v)) + (n.dataset.suffix ?? ""); };
    if (reduceMotion()) { nums.forEach((n) => render(n, Number(n.dataset.count))); return; }
    nums.forEach((n) => render(n, 0));

    const play = () => {
      nums.forEach((n, i) => {
        const target = Number(n.dataset.count);
        const big = n.dataset.big === "true";
        const o = { v: 0 };
        gsap.to(o, { v: target, duration: big ? 2.2 : 1.6, delay: big ? 0 : 0.3 + i * 0.12, ease: "power2.out", onUpdate: () => render(n, o.v) });
      });
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { play(); io.disconnect(); }
    }, { rootMargin: "0px 0px -20% 0px", threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, { scope: root });

  return (
    <section ref={root} id="graduation" className="scroll-mt-20 bg-navy text-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-14 md:px-10 lg:flex-row lg:items-center lg:gap-16 lg:px-24 lg:py-[88px]">
        {/* Зүүн: гарчиг + нийт төгсөгч */}
        <div className="flex flex-1 flex-col gap-4">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Төгсөлт</span>
          <h2 className="font-display text-[32px] font-extrabold leading-tight lg:text-[44px]">{GRADUATION.title}</h2>
          <p className="max-w-[34em] text-white/80 lg:text-lg">{GRADUATION.text}</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span data-count={stats.total_graduates} data-big="true" className="font-display text-[72px] font-extrabold leading-none text-gold tabular-nums lg:text-[120px]" aria-label={`${fmt.format(stats.total_graduates)} төгсөгч`}>
              {fmt.format(stats.total_graduates)}
            </span>
            <span className="text-lg font-semibold text-white/80 lg:text-2xl">төгсөгч</span>
          </div>
          <Link href="/about#history" className="mt-2 inline-flex w-fit items-center gap-2 text-[15px] font-semibold text-gold underline decoration-2 underline-offset-[5px] hover:text-white">
            Сургуулийн түүх →
          </Link>
        </div>

        {/* Баруун: их дээд сургуульд элссэн хувь + тоо, гадаадын их сургууль */}
        <ul className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-5" aria-label="Төгсөлтийн үзүүлэлт">
          <li className="rounded-2xl border border-white/15 bg-white/5 px-6 py-5 lg:flex lg:items-baseline lg:justify-between lg:gap-6">
            <span className="flex items-baseline gap-3">
              <span data-count={stats.university_percent} data-suffix="%" className="font-display text-[40px] font-extrabold leading-none text-white tabular-nums lg:text-[48px]">{stats.university_percent}%</span>
              <span className="text-sm text-white/75"><span data-count={stats.university_count} className="font-semibold text-white tabular-nums">{fmt.format(stats.university_count)}</span> сурагч</span>
            </span>
            <span className="mt-2 block text-sm text-white/75 lg:mt-0 lg:text-right lg:text-base">Их, дээд сургуульд элссэн</span>
          </li>
          <li className="rounded-2xl border border-white/15 bg-white/5 px-6 py-5 lg:flex lg:items-baseline lg:justify-between lg:gap-6">
            <span data-count={stats.abroad_count} className="block font-display text-[40px] font-extrabold leading-none text-white tabular-nums lg:text-[48px]">{fmt.format(stats.abroad_count)}</span>
            <span className="mt-2 block text-sm text-white/75 lg:mt-0 lg:text-right lg:text-base">Гадаадын их сургуульд элссэн</span>
          </li>
        </ul>
      </div>

      {/* Дэлхийн зураг: Монголоос очсон улсууд руу нум, улс сонгоход сургуулиудын жагсаалт (админаас улс нэмээгүй бол нуугдана) */}
      {map && destinations.length > 0 && (
        <div className="mx-auto max-w-[1440px] px-4 pb-14 md:px-10 lg:px-24 lg:pb-[88px]">
          <h3 className="mb-6 font-display text-[24px] font-extrabold lg:text-[30px]">Төгсөгчид маань дэлхийн хаана сурч байна</h3>
          <GraduationMap map={map} destinations={destinations} />
        </div>
      )}
    </section>
  );
}
