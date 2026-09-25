"use client";

/* Хамт олон: удирдлага, багш, ажилтнуудын картууд хэвтээ гүйдэг (marquee) — жишээ дизайн: зураг хар-цагаан, hover-д өнгөт
   болж бага зэрэг томорно (зураггүй орлуулагч ч саарал → өнгөт); картын доод хэсэгт цагаан хайрцагт нэр + албан тушаал. Зураггүй бол navy дэвсгэрт эхний үсэг.
   - Өгөгдөл level, order-оор эрэмбэлэгдэж ирнэ (админ /admin/about → Удирдлага); бүгд нэг мөрөнд.
   - Marquee: жагсаалтыг 2 удаа давтаж GSAP-аар xPercent −50 хүртэл тасралтгүй гүйлгэнэ (seamless); hover/фокус дээр зөөлөн зогсоно;
     хулгана/хуруугаар чирж, хэвтээ wheel/trackpad-аар гүйлгэж болно (tween-ийн прогрессийг шилжүүлнэ, дараа нь автомат гүйлт үргэлжилнэ).
   - prefers-reduced-motion: гүйлгэхгүй, энгийн хэвтээ scroll-той мөр. */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap, reduceMotion, useGSAP } from "@/components/site/gsap";
import { Reveal } from "@/components/site/Reveal";
import type { AboutLeader } from "@/lib/types";

function Card({ leader }: { leader: AboutLeader }) {
  return (
    <li className="group relative h-[300px] w-[220px] shrink-0 overflow-hidden rounded-2xl border border-line bg-paper-3 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-navy/15 md:h-[320px] md:w-[236px]">
      {leader.photo ? (
        <Image src={leader.photo} alt="" fill unoptimized sizes="236px" className="object-cover object-top grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-navy font-display text-6xl font-extrabold text-gold grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0" aria-hidden="true">{leader.full_name.trim().charAt(0)}</span>
      )}
      {/* Нэр, албан тушаал: доод цагаан хайрцаг */}
      <span className="absolute inset-x-3 bottom-3 flex flex-col gap-0.5 rounded-xl bg-white/95 px-4 py-3 shadow-md backdrop-blur">
        <span className="font-display text-[15px] font-extrabold leading-tight text-ink">{leader.full_name}</span>
        <span className="text-xs text-muted">{leader.position}</span>
      </span>
    </li>
  );
}

export function LeadershipChart({ leaders }: { leaders: AboutLeader[] }) {
  const root = useRef<HTMLDivElement>(null);
  // reduced motion-ийг effect-д уншина (SSR-тэй ижил эхний render → hydration зөрчилгүй)
  const [reduce, setReduce] = useState(false);
  useEffect(() => { if (reduceMotion()) setReduce(true); }, []);   // eslint-disable-line react-hooks/set-state-in-effect -- client-only media query

  useGSAP(() => {
    const track = root.current?.querySelector<HTMLElement>(".team-track");
    if (!track || leaders.length === 0 || reduceMotion()) return;
    // 2 давхар жагсаалт: −50% хүрэхэд яг эхний байрлал → тасралтгүй давталт. Хурд: карт бүрт ~3 сек
    const tween = gsap.to(track, { xPercent: -50, ease: "none", duration: Math.max(20, leaders.length * 3), repeat: -1 });
    const wrap = gsap.utils.wrap(0, 1);
    const slow = () => gsap.to(tween, { timeScale: 0, duration: 0.6, overwrite: true });
    const go = () => gsap.to(tween, { timeScale: 1, duration: 0.6, overwrite: true });
    // Чирж гүйлгэх: dx пикселийг давталтын прогресс болгож (хагас өргөн = нэг бүтэн давталт), seamless wrap
    const shift = (dx: number) => { const half = track.scrollWidth / 2; if (half) tween.progress(wrap(tween.progress() - dx / half)); };
    let dragging = false, lastX = 0;
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; track.setPointerCapture(e.pointerId); track.classList.add("is-dragging"); slow(); };
    const move = (e: PointerEvent) => { if (!dragging) return; shift(e.clientX - lastX); lastX = e.clientX; };
    const up = (e: PointerEvent) => { if (!dragging) return; dragging = false; track.classList.remove("is-dragging"); if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId); go(); };
    // Хэвтээ wheel / trackpad: гүйлгэнэ (босоо wheel хуудсаа гүйлгэсээр)
    const wheel = (e: WheelEvent) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); shift(-e.deltaX); } };
    track.addEventListener("pointerenter", slow); track.addEventListener("pointerleave", go);
    track.addEventListener("focusin", slow); track.addEventListener("focusout", go);
    track.addEventListener("pointerdown", down); track.addEventListener("pointermove", move);
    track.addEventListener("pointerup", up); track.addEventListener("pointercancel", up);
    track.addEventListener("wheel", wheel, { passive: false });
    return () => {
      track.removeEventListener("pointerenter", slow); track.removeEventListener("pointerleave", go);
      track.removeEventListener("focusin", slow); track.removeEventListener("focusout", go);
      track.removeEventListener("pointerdown", down); track.removeEventListener("pointermove", move);
      track.removeEventListener("pointerup", up); track.removeEventListener("pointercancel", up);
      track.removeEventListener("wheel", wheel);
    };
  }, { scope: root, dependencies: [leaders.length] });

  if (leaders.length === 0) return null;
  const copies = reduce ? [leaders] : [leaders, leaders];   // reduced motion: нэг л удаа, scroll-оор

  return (
    <section aria-labelledby="team-title" className="overflow-hidden bg-paper-2">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-3 px-4 pt-12 text-center md:px-10 lg:px-24 lg:pt-[72px]">
        <Reveal><h2 id="team-title" className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Сургуулийн хамт олон</h2></Reveal>
        <Reveal><p className="max-w-[34em] text-muted lg:text-lg">Удирдлага, багш, ажилтнууд — сурагч бүрийн амжилтын төлөө хамтдаа ажилладаг.</p></Reveal>
      </div>
      {/* Marquee: бүтэн өргөнөөр, захууд бүдгэрнэ */}
      <div ref={root} className={`relative mt-8 pb-12 lg:mt-10 lg:pb-[72px] ${reduce ? "overflow-x-auto px-4" : "overflow-hidden"}`}>
        {!reduce && <><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-paper-2 to-transparent" /><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-paper-2 to-transparent" /></>}
        <ul className={`team-track flex w-max gap-5 px-3 select-none ${reduce ? "" : "cursor-grab touch-pan-y [&.is-dragging]:cursor-grabbing"}`} aria-label="Хамт олон">
          {copies.map((list, c) => list.map((l) => <Card key={`${c}-${l.id}`} leader={l} />))}
        </ul>
      </div>
    </section>
  );
}
