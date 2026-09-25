"use client";

/* Typewriter: текст дэлгэцэнд орж ирэхэд үсэг үсгээр бичигдэж, ард нь анивчдаг курсор (|) байна — нэг удаа (IntersectionObserver).
   SSR-д бүтэн текст render хийгддэг (SEO); client дээр эхлэхдээ хоослоод GSAP-аар тэмдэгтийн тоог 0 → n тоолж бичнэ.
   prefers-reduced-motion: бүтэн текст шууд, курсоргүй. Курсорын анивчилт: globals.css .tw-cursor. */

import { useRef, type ElementType } from "react";
import { gsap, reduceMotion, useGSAP } from "./gsap";

export function Typewriter({ text, as: Tag = "span", className, charMs = 45, delay = 0.2, id }: {
  text: string; as?: ElementType; className?: string; charMs?: number; delay?: number; id?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(".tw-text");
    const cursor = el.querySelector<HTMLElement>(".tw-cursor");
    if (!target || !cursor) return;
    if (reduceMotion()) { cursor.style.display = "none"; return; }
    target.textContent = "";
    cursor.style.visibility = "visible";
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const o = { n: 0 };
      gsap.to(o, { n: text.length, duration: (text.length * charMs) / 1000, ease: "none", delay, snap: { n: 1 },
        onUpdate: () => { target.textContent = text.slice(0, o.n); } });
    }, { rootMargin: "0px 0px -15% 0px", threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, { scope: ref, dependencies: [text, charMs, delay] });

  return (
    <Tag ref={ref} id={id} className={className} aria-label={text}>
      <span className="tw-text" aria-hidden="true">{text}</span>
      <span className="tw-cursor" aria-hidden="true" style={{ visibility: "hidden" }}>|</span>
    </Tag>
  );
}
