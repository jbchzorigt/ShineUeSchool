"use client";

/* Секцийн хөвөгч KaTeX томъёонууд: орж ирэх (доороос + доогуур зураас DrawSVG), parallax (өөр өөр хурд, бага зэрэг эргэлт),
   тайван хөвөх давталт. Section = хамгийн ойрын section/header. */

import katex from "katex";
import { useRef } from "react";
import type { Formula } from "@/lib/olympiad-data";
import { gsap, reduceMotion, useGSAP } from "./gsap";

export function Formulas({ items }: { items: Formula[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const els = gsap.utils.toArray<HTMLElement>(".formula", root.current!);
    const sec = root.current!.closest("section, header");
    if (!els.length || !sec) return;
    if (reduceMotion()) {
      gsap.set(els, { autoAlpha: 1 });
      gsap.set(".fx-ul path", { drawSVG: "0% 100%" });
      return;
    }
    gsap.timeline({ scrollTrigger: { trigger: sec, start: "top 65%", toggleActions: "play none none reverse" }, defaults: { ease: "power3.out" } })
      .from(els, { autoAlpha: 0, y: 40, scale: 0.85, duration: 0.8, stagger: 0.12 })
      .from(els.map((e) => e.querySelector(".fx-ul path")), { drawSVG: "0% 0%", duration: 0.6, ease: "power2.inOut", stagger: 0.12 }, "-=0.5")
      .from(els.map((e) => e.querySelector(".fx-grade")), { autoAlpha: 0, x: -8, duration: 0.4, stagger: 0.12 }, "-=0.6");
    els.forEach((el) => {
      const speed = Number(el.dataset.speed || "1");
      gsap.to(el, { yPercent: -60 * speed, rotation: (speed - 1) * 14, ease: "none",
                    scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: 1.2 } });
    });
    gsap.to(els.map((e) => e.querySelector(".fx-math")), { y: -6, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 0.35, from: "random" } });
  }, { scope: root });

  return (
    <div ref={root} className="formulas">
      {items.map((f, i) => (
        <div key={f.cls} className={`formula ${f.cls}`} data-speed={f.speed} style={{ ["--tilt" as string]: `${((i % 3) - 1) * 4}deg` }}>
          <span className="fx-math" dangerouslySetInnerHTML={{ __html: katex.renderToString(f.tex, { throwOnError: false, displayMode: false }) }} />
          {f.grade && <span className="fx-grade">{f.grade}</span>}
          <svg className="fx-ul" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2,6 Q25,2 50,6 T98,6" /></svg>
        </div>
      ))}
    </div>
  );
}
