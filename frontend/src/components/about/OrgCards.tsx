"use client";

/* Байгууллагын бүтцийн картууд.
   - LeaderCard: зураг (байхгүй бол navy дээр алтан эхний үсэг), нэр, албан тушаал. Хамгийн дээд (root) карт navy дэвсгэртэй, алтан хүрээтэй зурагтай —
     диаграмын цорын ганц тод цэг; бусад нь цагаан. Гар утсанд хэвтээ (зураг зүүн талд), md+ босоо, голлуулсан.
   - DepartmentCard: зураггүй, дээд талдаа алтан зураастай; нэр, эрхлэгч(ид), багшийн тоо. Багштай бол товч дарж багш нарын жагсаалтыг
     нээж/хаана (GSAP өндөр + opacity; reduced motion үед шууд). Багшгүй бол "удахгүй" гэсэн мөр. */

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { gsap, reduceMotion, useGSAP } from "@/components/site/gsap";
import { useDict } from "@/components/site/LangProvider";
import type { AboutDepartment, AboutLeader } from "@/lib/types";

export function LeaderCard({ leader, root }: { leader: AboutLeader; root: boolean }) {
  const photo = root ? "h-16 w-16 md:h-24 md:w-24 ring-gold" : "h-14 w-14 md:h-20 md:w-20 ring-paper-3";
  return (
    <div className={`flex w-full items-center gap-4 rounded-2xl px-4 py-4 md:w-52 md:flex-col md:gap-3 md:px-5 md:py-6 md:text-center ${root ? "bg-navy text-white shadow-lg shadow-navy/25" : "border border-line bg-white"}`}>
      <span className={`relative shrink-0 overflow-hidden rounded-full ring-4 ${photo}`}>
        {leader.photo
          ? <Image src={leader.photo} alt="" fill unoptimized sizes="96px" className="object-cover object-top" />
          : <span className="grid h-full w-full place-items-center bg-navy font-display text-2xl font-extrabold text-gold md:text-3xl" aria-hidden="true">{leader.full_name.trim().charAt(0)}</span>}
      </span>
      {/* md:w-full — босоо картад урт нэг үгтэй нэр ч картын өргөнд таслагдана (fit-content-оос болж халихгүй) */}
      <span className="flex min-w-0 flex-col gap-1 md:w-full">
        <span className={`font-display text-[17px] font-extrabold leading-tight break-words ${root ? "text-white" : "text-ink"}`}>{leader.full_name}</span>
        <span className={`text-sm leading-snug break-words ${root ? "text-gold" : "text-muted"}`}>{leader.position}</span>
      </span>
    </div>
  );
}

export function DepartmentCard({ department }: { department: AboutDepartment }) {
  const t = useDict().about;
  const id = useId();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const heads = department.teachers.filter((x) => x.is_head);
  const n = department.teachers.length;

  // Нээх: render-ийн дараа өндрийг 0-ээс; хаах: анимацийн дараа state (hidden) солино
  const { contextSafe } = useGSAP(() => {
    const panel = box.current?.querySelector<HTMLElement>("[data-panel]");
    if (!open || !panel || reduceMotion()) return;
    gsap.from(panel, { height: 0, autoAlpha: 0, duration: 0.35, ease: "power2.out", clearProps: "height,opacity,visibility" });
  }, { scope: box, dependencies: [open] });
  function toggle() {
    if (!open) { setOpen(true); return; }
    const panel = box.current?.querySelector<HTMLElement>("[data-panel]");
    if (!panel || reduceMotion()) { setOpen(false); return; }
    contextSafe(() => {
      gsap.to(panel, { height: 0, autoAlpha: 0, duration: 0.25, ease: "power2.in", onComplete: () => { gsap.set(panel, { clearProps: "height,opacity,visibility" }); setOpen(false); } });
    })();
  }

  return (
    <div ref={box} className="flex w-full flex-col gap-2 rounded-2xl border border-line border-t-4 border-t-gold bg-white px-4 py-4 md:w-52 md:px-5">
      <span className="font-display text-[16px] font-extrabold leading-tight break-words text-navy">{department.name}</span>
      {heads.map((h) => (
        <span key={h.id} className="text-sm leading-snug break-words text-ink">
          <span className="text-muted">{t.head}:</span> {h.full_name}
        </span>
      ))}
      {n > 0 ? (
        <>
          <button type="button" onClick={toggle} aria-expanded={open} aria-controls={`${id}-teachers`} title={open ? t.orgHideTeachers : t.orgShowTeachers}
                  className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-paper-3 px-3 py-1 text-xs font-bold text-navy transition hover:bg-navy hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy">
            {t.orgTeachers(n)}<span className="sr-only">, {open ? t.orgHideTeachers : t.orgShowTeachers}</span>
            <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
          </button>
          <ul id={`${id}-teachers`} data-panel hidden={!open} className="overflow-hidden">
            {department.teachers.map((x) => (
              <li key={x.id} className="flex flex-col border-t border-line py-2 text-left first:mt-1">
                <span className="text-sm font-semibold leading-snug break-words text-ink">
                  {x.full_name}{x.is_head && <span className="ml-1.5 rounded-full bg-gold/25 px-2 py-0.5 text-[11px] font-bold text-ink">{t.head}</span>}
                </span>
                {x.role && <span className="text-xs leading-snug break-words text-muted">{x.role}</span>}
              </li>
            ))}
          </ul>
        </>
      ) : <span className="text-xs text-muted">{t.teachersSoon}</span>}
    </div>
  );
}
