"use client";

/* =====================================================================
   Толгой хэсэг: дэвсгэр видео + гарчиг.
   - Видео дуугүй, давталттай, autoplay. Файл: /public/video/school.mp4
     (байхгүй бол хөх дэвсгэр харагдана). Зогсоох товчтой.
   - Хуудас ачаалахад гарчгийн доорх шар шугам DrawSVG-ээр нэг удаа зурагдана.
     Энэ бол хуудасны цорын ганц автомат хөдөлгөөн.
   - prefers-reduced-motion: шугам шууд бүрэн харагдана, видео зогссон байна.
   ===================================================================== */

import Link from "next/link";
import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(useGSAP, DrawSVGPlugin);

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia(root);
      mm.add(
        { reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" },
        (ctx) => {
          const { reduce } = ctx.conditions ?? {};
          if (reduce) {
            gsap.set(".hero-underline", { drawSVG: "0% 100%" });
            video.current?.pause();
            setPaused(true);
            return;
          }
          gsap.fromTo(
            ".hero-underline",
            { drawSVG: "0% 0%" },
            { drawSVG: "0% 100%", duration: 1.1, ease: "power2.inOut", delay: 0.35 },
          );
        },
      );
    },
    { scope: root },
  );

  function togglePlay() {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  }

  return (
    <section ref={root} className="relative overflow-hidden bg-navy-deep text-white">
      {/* ⚠ /public/video/school.mp4 болон poster зургийг оруулна */}
      <video
        ref={video}
        className="absolute inset-0 h-full w-full object-cover"
        src="/video/school.mp4"
        poster="/video/school-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-navy-deep/55" aria-hidden="true" />

      <div className="relative mx-auto grid min-h-[520px] max-w-[1440px] grid-cols-12 items-center gap-x-6 px-4 py-16 lg:min-h-[680px] md:px-10 lg:px-24">
        <div className="col-span-12 flex flex-col items-start gap-5 lg:col-span-8 lg:gap-6">
          <h1 className="font-display text-[44px] font-extrabold leading-none tracking-tight lg:text-[76px]">Шинэ Үе сургууль</h1>
          <svg className="-mt-2 h-[14px] w-[220px] lg:h-[18px] lg:w-[360px]" viewBox="0 0 360 18" aria-hidden="true">
            <path className="hero-underline" d="M3,12 Q70,2 150,9 T290,7 T357,10" fill="none" stroke="#ffc20e" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <p className="max-w-[30em] text-[17px] leading-relaxed lg:text-[22px]">
            Математикийн уламжлалтай, сурагч бүрийг хөгжүүлдэг сургууль. Мэдээ, олимпиад, түүх, хаягийг эндээс.
          </p>
          <div className="mt-1 flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:gap-7">
            <Link href="/#news" className="inline-flex h-[52px] items-center rounded-lg bg-white px-7 text-[17px] font-semibold text-navy hover:bg-paper-3">
              Мэдээ үзэх
            </Link>
            <Link href="/olympiad" className="text-[17px] font-semibold text-white underline decoration-2 underline-offset-[5px] hover:text-gold">
              Ү.Маамын нэрэмжит олимпиад
            </Link>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={togglePlay}
        aria-label={paused ? "Видеог тоглуулах" : "Видеог зогсоох"}
        className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full border-2 border-white text-white hover:bg-white/15 lg:bottom-8 lg:right-24 lg:h-12 lg:w-12"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          {paused ? (
            <path d="M7 4l13 8-13 8z" fill="currentColor" />
          ) : (
            <path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          )}
        </svg>
      </button>
    </section>
  );
}
