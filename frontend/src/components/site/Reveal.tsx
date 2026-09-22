"use client";

/* Гүйлгэхэд гарч ирэх анимаци: доороос 24px, fade — нэг удаа (start "top 85%"). `stagger` бол шууд хүүхдүүд дараалан.
   Reduced motion үед анимацигүй. Server component-оос ч ашиглаж болно (children дамжуулна). */

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, reduceMotion, useGSAP } from "./gsap";

export function Reveal({ as: Tag = "div", className, children, stagger = false, delay = 0, id }: {
  as?: ElementType; className?: string; children: ReactNode; stagger?: boolean; delay?: number; id?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el || reduceMotion()) return;
    const targets = stagger ? Array.from(el.children) : [el];
    if (!targets.length) return;
    // Аль хэдийн дэлгэцэн дээр байвал шууд тоглуулна (богино хуудсанд гүйлгэлт байхгүй тул ScrollTrigger идэвхжихгүй)
    const inView = el.getBoundingClientRect().top < window.innerHeight * 0.85;
    gsap.from(targets, {
      autoAlpha: 0, y: 24, duration: 0.7, ease: "power2.out", delay, stagger: stagger ? 0.08 : 0,
      ...(inView ? {} : { scrollTrigger: { trigger: el, start: "top 85%", once: true } }),
    });
  }, { scope: ref });

  return <Tag ref={ref} id={id} className={className}>{children}</Tag>;
}
