"use client";

/* =====================================================================
   Толгой хэсэг: navy дэвсгэр дээр математик canvas (components/site/MathematicalCanvas.tsx) + голлосон parallax текст.
   - Өндөр: header-ийг хассан бүтэн дэлгэц (100svh − 64/80px; svh — утасны хаягийн мөр өөрчлөгдөхөд үсрэхгүй).
   - Parallax (2 давхар):
       · Гүйлгэх: текстийн блок canvas-аас удаан (хэсгийн өндрийн 35%) дээшилж, бүдгэрнэ — gsap.ticker дээр хэсгийн
         getBoundingClientRect-ээр тооцно (ScrollSmoother-ийн transform-той ч зөв). Scroll icon хамт бүдгэрнэ.
       · Курсор (зөвхөн fine pointer): гарчиг/тайлбар/товч гүнээрээ ялгаатай (±14/±9/±6px) курсор руу зөөлөн хазайна —
         gsap.quickTo, pointermove бүрт tween үүсгэхгүй. Хэсгээс гарахад төв рүү буцна.
   - Хуудас ачаалахад гарчгийн доорх шар шугам DrawSVG-ээр нэг удаа зурагдана; scroll icon-ы цэг гулсаж бөмбөлзөнө
     (#programs руу гүйлгэнэ — SmoothScroll анкорыг барина).
   - prefers-reduced-motion: parallax, шугам, icon бүгд хөдөлгөөнгүй; canvas ч хөдөлгөөнгүй.
   - .math-cursor-host: fine pointer төхөөрөмжид энэ хэсэг дотор системийн курсор нуугдаж, canvas-ийн цэг+цагираг курсор дагана.
   ===================================================================== */

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MathematicalCanvas } from "@/components/site/MathematicalCanvas";

gsap.registerPlugin(useGSAP, DrawSVGPlugin);

const SCROLL_SHIFT = 0.35;   // гүйлгэхэд текст хэсгийн өндрийн хэдэн хувиар хоцорч дээшлэх
const DEPTH = { h1: 14, p: 9, cta: 6 };   // курсорын parallax-ийн дээд шилжилт (px)

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const text = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = root.current, block = text.current;
      if (!section || !block) return;
      const mm = gsap.matchMedia(root);
      mm.add(
        { reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)", fine: "(hover: hover) and (pointer: fine)" },
        (ctx) => {
          const { reduce, fine } = ctx.conditions ?? {};
          if (reduce) {
            gsap.set(".hero-underline", { drawSVG: "0% 100%" });
            return;
          }
          gsap.fromTo(".hero-underline", { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 1.1, ease: "power2.inOut", delay: 0.35 });
          gsap.fromTo(".hero-scroll-dot", { y: 0, autoAlpha: 1 }, { y: 10, autoAlpha: 0, duration: 1.3, ease: "power1.in", repeat: -1, repeatDelay: 0.4, delay: 1.2 });
          gsap.fromTo(".hero-scroll", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out", delay: 1.4 });

          // --- Гүйлгэх parallax: блок хоцорч дээшилж бүдгэрнэ ---
          const setY = gsap.quickSetter(block, "y", "px");
          const setAlpha = gsap.quickSetter(block, "opacity");
          const icon = section.querySelector<HTMLElement>(".hero-scroll");
          const setIconAlpha = icon ? gsap.quickSetter(icon, "opacity") : null;
          let lastP = -1;
          const onTick = () => {
            const r = section.getBoundingClientRect();
            const p = gsap.utils.clamp(0, 1, -r.top / r.height);   // 0 = дээд захад, 1 = бүрэн гүйлгэгдсэн
            if (p === lastP) return;
            lastP = p;
            setY(p * r.height * SCROLL_SHIFT);
            setAlpha(1 - Math.min(1, p * 1.6));
            if (p > 0.05) setIconAlpha?.(Math.max(0, 1 - p * 4));   // icon-ы орох анимацийг эхэнд нь дарахгүй
          };
          gsap.ticker.add(onTick);

          // --- Курсорын parallax (fine pointer): гүнтэй давхаргууд ---
          let onMove: ((e: PointerEvent) => void) | null = null;
          if (fine) {
            const layers = [
              { el: block.querySelector<HTMLElement>("h1"), d: DEPTH.h1 },
              { el: block.querySelector<HTMLElement>("p"), d: DEPTH.p },
              { el: block.querySelector<HTMLElement>(".hero-cta"), d: DEPTH.cta },
            ].filter((l): l is { el: HTMLElement; d: number } => !!l.el)
             .map((l) => ({ ...l, x: gsap.quickTo(l.el, "x", { duration: 0.7, ease: "power3.out" }), y: gsap.quickTo(l.el, "y", { duration: 0.7, ease: "power3.out" }) }));
            onMove = (e) => {
              const r = section.getBoundingClientRect();
              const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
              const nx = inside ? ((e.clientX - r.left) / r.width - 0.5) * 2 : 0;   // −1..1, гадна бол төв
              const ny = inside ? ((e.clientY - r.top) / r.height - 0.5) * 2 : 0;
              for (const l of layers) { l.x(nx * l.d); l.y(ny * l.d * 0.6); }
            };
            window.addEventListener("pointermove", onMove, { passive: true });
          }

          return () => {
            gsap.ticker.remove(onTick);
            if (onMove) window.removeEventListener("pointermove", onMove);
          };
        },
      );
    },
    { scope: root },
  );

  return (
    <section ref={root} className="math-cursor-host relative flex min-h-[calc(100svh-64px)] flex-col overflow-hidden bg-navy-deep text-white lg:min-h-[calc(100svh-80px)]">
      <MathematicalCanvas tone="dark" />

      <div ref={text} className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center will-change-transform md:px-10 lg:gap-6 lg:px-24">
        <h1 className="font-display text-[44px] font-extrabold leading-none tracking-tight lg:text-[76px]">Шинэ Үе сургууль</h1>
        <svg className="-mt-2 h-[14px] w-[220px] lg:h-[18px] lg:w-[360px]" viewBox="0 0 360 18" aria-hidden="true">
          <path className="hero-underline" d="M3,12 Q70,2 150,9 T290,7 T357,10" fill="none" stroke="#ffc20e" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <p className="max-w-[30em] text-[17px] leading-relaxed lg:text-[22px]">
          Математикийн уламжлалтай, сурагч бүрийг хөгжүүлдэг сургууль. Мэдээ, олимпиад, түүх, хаягийг эндээс.
        </p>
        <div className="hero-cta mt-1 flex flex-col items-center gap-4 lg:flex-row lg:gap-7">
          <Link href="/#news" className="inline-flex h-[52px] items-center rounded-lg bg-white px-7 text-[17px] font-semibold text-navy hover:bg-paper-3">
            Мэдээ үзэх
          </Link>
          <Link href="/olympiad" className="text-[17px] font-semibold text-white underline decoration-2 underline-offset-[5px] hover:text-gold">
            Ү.Маамын нэрэмжит олимпиад
          </Link>
        </div>
      </div>

      {/* Scroll icon: хулганы хүрээ + гулсах цэг, доор нь жижиг бичиг */}
      <a
        href="#programs"
        aria-label="Доош гүйлгэх"
        className="hero-scroll absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-white/70 hover:text-white lg:bottom-8"
      >
        <span className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-current pt-1.5">
          <span className="hero-scroll-dot block h-1.5 w-1.5 rounded-full bg-gold" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Гүйлгэх</span>
      </a>
    </section>
  );
}
