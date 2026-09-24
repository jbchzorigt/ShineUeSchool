"use client";

/* Мөр мөрөөр гарч ирэх текст (GSAP SplitText, type:"lines"). Хоёр хувилбар:
   - variant="mask" (гарчигт): мөр бүр өөрийн overflow:hidden маскаас доороос дээш гулсаж гарч ирнэ (yPercent 120, stagger 0.09).
   - variant="rise" (тайлбар/намтарт): маскгүй, мөр бүр 30px доороос дээшилж fade (y:30, opacity:0, stagger 0.2, 0.8с, power2.out).
   `immediate` бол ачаалмагц (delay-тэй), үгүй бол дэлгэцэнд орж ирэхэд нэг удаа (ScrollTrigger).
   autoSplit: фонт ачаалагдах/өргөн өөрчлөгдөхөд дахин хуваана — аль хэдийн гарч ирсэн бол дахин анимаци хийхгүй.
   "\n" → <br/> (админаас ирсэн олон мөрт текст; SplitText br-ийг мөр таслалт гэж үзнэ, white-space:pre-line ажиллахгүй тул).
   Reduced motion: хуваахгүй, текст шууд харагдана. Маскын descender тайралтыг .lr-line-mask CSS-ээр нөхнө (olympiad.css). */

import { Fragment, useRef, type ElementType } from "react";
import { gsap, SplitText, reduceMotion, useGSAP } from "./gsap";

export function LineReveal({ as: Tag = "p", className, text, delay = 0, immediate = false, variant = "mask", stagger = variant === "mask" ? 0.09 : 0.2 }: {
  as?: ElementType; className?: string; text: string; delay?: number; immediate?: boolean; variant?: "mask" | "rise"; stagger?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el || reduceMotion()) return;
    let played = false;
    const mask = variant === "mask";
    const split = SplitText.create(el, {
      type: "lines", mask: mask ? "lines" : undefined, linesClass: "lr-line", autoSplit: true,
      onSplit: (self) => {
        if (played) return;   // дахин хуваагдсан ч (resize) аль хэдийн харагдсан текстийг дахин нуухгүй
        return gsap.from(self.lines, {
          ...(mask ? { yPercent: 120, duration: 0.9, ease: "power3.out" } : { y: 30, duration: 0.8, ease: "power2.out" }),
          opacity: 0, stagger, delay,
          onStart: () => { played = true; },
          scrollTrigger: immediate ? undefined : { trigger: el, start: "top 85%", once: true },
        });
      },
    });
    return () => split.revert();
  }, { scope: ref, dependencies: [text, immediate, delay, stagger, variant] });

  const parts = text.split("\n");
  return (
    <Tag ref={ref} className={className}>
      {parts.map((p, i) => <Fragment key={i}>{i > 0 && <br />}{p}</Fragment>)}
    </Tag>
  );
}
