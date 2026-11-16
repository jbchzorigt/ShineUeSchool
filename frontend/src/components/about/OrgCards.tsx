"use client";

/* Байгууллагын бүтцийн картууд.
   - LeaderCard: зураг (байхгүй бол navy дээр алтан эхний үсэг), нэр, албан тушаал. Хамгийн дээд (root) карт navy дэвсгэртэй, алтан хүрээтэй зурагтай —
     диаграмын цорын ганц тод цэг; бусад нь цагаан. Гар утсанд хэвтээ (зураг зүүн талд), md+ босоо, голлуулсан.
   - DepartmentCard: удирдлагын карттай ижил хэв маяг (цагаан карт, хүрээ, ижил хэмжээ; гар утсанд хэвтээ, md+ босоо голлуулсан) — зурагны оронд
     номын тэмдэгтэй алтан тойрог; нэр, эрхлэгч(ид), багшийн тоо. Багштай бол товч дарж багш нарын жагсаалтыг (эхний үсэгтэй жижиг мөрүүд)
     нээж/хаана (GSAP өндөр + opacity; reduced motion үед шууд). Багшгүй бол "удахгүй" гэсэн мөр. */

import { BookOpen } from "lucide-react";
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
  const closing = useRef(false);   // хаах анимаци явж байгаа эсэх (дахин дарвал буцааж нээнэ)
  const heads = department.teachers.filter((x) => x.is_head);
  const n = department.teachers.length;

  // Нээх: render-ийн дараа өндрийг 0-ээс; хаах: анимацийн дараа state (hidden) солино
  const { contextSafe } = useGSAP(() => {
    const panel = box.current?.querySelector<HTMLElement>("[data-panel]");
    if (!open || !panel || reduceMotion()) return;
    gsap.from(panel, { height: 0, autoAlpha: 0, duration: 0.35, ease: "power2.out", clearProps: "height,opacity,visibility" });
  }, { scope: box, dependencies: [open] });
  // Анимаци дунд дахин дарвал: өмнөх tween-ийг зогсоож одоогийн өндрөөс үргэлжилнэ (анивчихгүй, давхар хаахгүй)
  function toggle() {
    const panel = box.current?.querySelector<HTMLElement>("[data-panel]");
    if (panel) gsap.killTweensOf(panel);
    if (!open) { setOpen(true); return; }
    if (!panel || reduceMotion()) { closing.current = false; setOpen(false); return; }
    if (closing.current) {
      closing.current = false;
      contextSafe(() => { gsap.to(panel, { height: "auto", autoAlpha: 1, duration: 0.25, ease: "power2.out", clearProps: "height,opacity,visibility" }); })();
      return;
    }
    closing.current = true;
    contextSafe(() => {
      gsap.to(panel, { height: 0, autoAlpha: 0, duration: 0.25, ease: "power2.in", onComplete: () => { closing.current = false; gsap.set(panel, { clearProps: "height,opacity,visibility" }); setOpen(false); } });
    })();
  }

  return (
    <div ref={box} className="flex w-full flex-col rounded-2xl border border-line bg-white px-4 py-4 md:w-52 md:px-5 md:py-6">
      <div className="flex items-center gap-4 md:flex-col md:gap-3 md:text-center">
        <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gold/25 text-navy ring-4 ring-paper-3 md:h-20 md:w-20">
          <BookOpen className="h-6 w-6 md:h-8 md:w-8" strokeWidth={2.2} />
        </span>
        <span className="flex min-w-0 flex-col gap-1 md:w-full">
          <span className="font-display text-[17px] font-extrabold leading-tight break-words text-ink">{department.name}</span>
          {heads.length > 0 && <span className="text-sm leading-snug break-words text-muted">{t.head}: {heads.map((h) => h.full_name).join(", ")}</span>}
          {n === 0 && <span className="text-xs leading-snug text-muted">{t.teachersSoon}</span>}
        </span>
      </div>
      {n > 0 && (
        <>
          <button type="button" onClick={toggle} aria-expanded={open} aria-controls={`${id}-teachers`} title={open ? t.orgHideTeachers : t.orgShowTeachers}
                  className="mt-3 inline-flex w-fit items-center gap-1.5 self-start rounded-full bg-paper-3 px-3 py-1 text-xs font-bold text-navy transition hover:bg-navy hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy md:self-center">
            {t.orgTeachers(n)}<span className="sr-only">, {open ? t.orgHideTeachers : t.orgShowTeachers}</span>
            <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
          </button>
          <ul id={`${id}-teachers`} data-panel hidden={!open} className="overflow-hidden">
            {department.teachers.map((x) => (
              <li key={x.id} className="flex items-center gap-2.5 border-t border-line py-2 text-left first:mt-3">
                <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy/10 text-xs font-bold text-navy">{x.full_name.trim().charAt(0)}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold leading-snug break-words text-ink">{x.full_name}</span>
                  {(x.is_head || x.role) && (
                    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-snug break-words text-muted">
                      {x.is_head && <span className="rounded-full bg-gold/25 px-2 py-0.5 text-[11px] font-bold text-ink">{t.head}</span>}
                      {x.role}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
