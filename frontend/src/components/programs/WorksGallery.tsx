"use client";

/* Сурагчдын бүтээлийн булан: grid (2 / md 3 / lg 4), дарвал <dialog> lightbox (гарчиг, сурагч, тайлбар, ←/→, Esc/backdrop). */

import Image from "next/image";
import { useRef, useState } from "react";
import type { ProgramWork } from "@/lib/types";

export function WorksGallery({ works }: { works: ProgramWork[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState<number | null>(null);
  const open = (idx: number) => { setI(idx); dialogRef.current?.showModal(); };
  const close = () => dialogRef.current?.close();
  const step = (d: -1 | 1) => setI((cur) => (cur === null ? cur : (cur + d + works.length) % works.length));
  const active = i === null ? null : works[i];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-display text-[26px] font-extrabold text-navy lg:text-[32px]">Сурагчдын бүтээлийн булан</h2>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {works.map((w, idx) => (
          <li key={w.id} className="flex flex-col gap-2">
            <button type="button" onClick={() => open(idx)} aria-label={`${w.title} — томруулж харах`}
                    className="group relative block aspect-square overflow-hidden rounded-xl border border-line bg-white">
              <Image src={w.image} alt={w.title} fill unoptimized sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition group-hover:scale-[1.03]" />
            </button>
            <span className="font-semibold leading-tight text-ink">{w.title}</span>
            {w.student && <span className="text-sm text-muted">{w.student}</span>}
          </li>
        ))}
      </ul>

      <dialog ref={dialogRef} onClose={() => setI(null)} onClick={(e) => { if (e.target === dialogRef.current) close(); }}
              onKeyDown={(e) => { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); }}
              className="m-auto max-h-[92vh] max-w-[92vw] rounded-xl bg-white p-0 backdrop:bg-ink/70">
        {active && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2 p-2 pl-4">
              <span className="text-sm text-muted">{i! + 1} / {works.length}</span>
              <button type="button" onClick={close} aria-label="Хаах" className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-paper-3">✕</button>
            </div>
            <span className="relative block h-[65vh] w-[min(92vw,900px)]">
              <Image src={active.image} alt={active.title} fill unoptimized sizes="92vw" className="object-contain" />
              {works.length > 1 && (
                <>
                  <button type="button" onClick={() => step(-1)} aria-label="Өмнөх" className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy shadow">‹</button>
                  <button type="button" onClick={() => step(1)} aria-label="Дараах" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy shadow">›</button>
                </>
              )}
            </span>
            <div className="flex flex-col gap-1 px-4 pb-4 pt-3">
              <span className="font-display text-lg font-extrabold text-ink">{active.title}</span>
              {active.student && <span className="text-sm text-navy">{active.student}</span>}
              {active.caption && <p className="text-sm text-muted">{active.caption}</p>}
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
