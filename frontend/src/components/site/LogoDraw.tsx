"use client";

/* Сургуулийн сүлдийг зурах анимаци (splash): хялбаршуулсан вектор тойм — гадна цагираг, шар нум, бамбай, атом,
   баганууд, √ Σ — DrawSVG-ээр дарааллан зурагдаж, дараа нь бодит лого (logo-emblem.png) дээр нь гарч ирнэ.
   `exiting` үед scale 0 болж алга. Reduced motion үед зөвхөн бодит лого. Тэгш хэм: бүх зүйл (100,100) төвтэй. */

import { useRef } from "react";
import { gsap, reduceMotion, useGSAP } from "./gsap";

export function LogoDraw({ size = 160, exiting = false, className = "" }: { size?: number; exiting?: boolean; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const img = el.querySelector<HTMLElement>(".logo-img")!;
    if (reduceMotion()) { gsap.set(img, { autoAlpha: 1 }); gsap.set(el.querySelector("svg"), { autoAlpha: 0 }); return; }
    const q = (s: string) => gsap.utils.toArray<SVGElement>(s, el);
    gsap.set([...q(".d-ring"), ...q(".d-band"), ...q(".d-shield"), ...q(".d-glyph")], { drawSVG: "0%" });
    gsap.set(q(".d-glyph"), { autoAlpha: 1 });
    const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
    tl.to(q(".d-ring"), { drawSVG: "100%", duration: 0.7 })
      .to(q(".d-band"), { drawSVG: "100%", duration: 0.5, ease: "power2.out" }, "-=0.25")
      .to(q(".d-shield"), { drawSVG: "100%", duration: 0.5 }, "-=0.2")
      .to(q(".d-glyph"), { drawSVG: "100%", duration: 0.45, stagger: 0.07, ease: "power1.inOut" }, "-=0.15")
      .to(img, { autoAlpha: 1, duration: 0.5, ease: "power2.out" }, "-=0.1")      // бодит лого гарч ирнэ
      .to(el.querySelector("svg"), { autoAlpha: 0, duration: 0.35 }, "<0.15");
  }, { scope: root });

  useGSAP(() => {
    if (!exiting || reduceMotion()) return;
    gsap.to(root.current, { scale: 0, autoAlpha: 0, duration: 0.4, ease: "power2.in", transformOrigin: "50% 50%", overwrite: true });
  }, { scope: root, dependencies: [exiting] });

  return (
    <div ref={root} className={`relative ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 200 200" width={size} height={size} className="absolute inset-0" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Гадна цагираг (navy-ийн оронд цагаан — navy дэвсгэр дээр) */}
        <circle className="d-ring" cx="100" cy="100" r="88" stroke="#ffffff" strokeWidth="3" />
        {/* Шар доод нум (сүлдний шар хэсэг): 8 цаг → 4 цаг */}
        <path className="d-band" d="M 26 138 A 80 80 0 0 0 174 138" stroke="#ffc20e" strokeWidth="14" />
        {/* Бамбай */}
        <path className="d-shield" d="M 100 44 C 112 52 124 56 138 56 V 104 C 138 128 118 146 100 156 C 82 146 62 128 62 104 V 56 C 76 56 88 52 100 44 Z" stroke="#ffffff" strokeWidth="3" />
        {/* Атом: 3 эллипс */}
        <ellipse className="d-glyph" cx="100" cy="72" rx="12" ry="5" stroke="#ffc20e" strokeWidth="2" />
        <ellipse className="d-glyph" cx="100" cy="72" rx="12" ry="5" stroke="#ffc20e" strokeWidth="2" transform="rotate(60 100 72)" />
        <ellipse className="d-glyph" cx="100" cy="72" rx="12" ry="5" stroke="#ffc20e" strokeWidth="2" transform="rotate(120 100 72)" />
        {/* Баганууд (зүүн) */}
        <path className="d-glyph" d="M 72 126 V 110 M 80 126 V 100 M 88 126 V 106" stroke="#ffffff" strokeWidth="3.5" />
        {/* √ (гол) ба Σ (баруун) */}
        <path className="d-glyph" d="M 90 118 L 98 134 L 110 96 H 124" stroke="#ffffff" strokeWidth="3.5" />
        <path className="d-glyph" d="M 128 108 H 112 L 120 118 L 112 128 H 128" stroke="#ffc20e" strokeWidth="3" />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element -- бодит лого, GSAP-аар opacity удирдана */}
      <img src="/logo-emblem.png" alt="" className="logo-img absolute inset-0 h-full w-full object-contain opacity-0" />
    </div>
  );
}
