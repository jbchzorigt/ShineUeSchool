"use client";

/* Дугуйлангийн зургийн галерей: <dialog>, prev/next, тоолуур, Esc. */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ClubImage } from "@/lib/types";

export function ClubGallery({ images, name, open, onClose }: { images: ClubImage[]; name: string; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  if (!images.length) return null;
  const prev = () => setI((v) => (v - 1 + images.length) % images.length);
  const next = () => setI((v) => (v + 1) % images.length);
  const img = images[Math.min(i, images.length - 1)];

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}
            className="m-auto w-[min(96vw,900px)] rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/70"
            aria-label={`${name} — зургууд`}>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-navy">{name} · {i + 1}/{images.length}</span>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Хаах">✕</button>
      </div>
      <div className="relative aspect-[4/3] w-full bg-slate-100">
        <Image key={img.id} src={img.url} alt="" fill unoptimized className="object-contain" />
        {images.length > 1 && (
          <>
            <button type="button" onClick={prev} aria-label="Өмнөх" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg text-navy shadow">‹</button>
            <button type="button" onClick={next} aria-label="Дараах" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg text-navy shadow">›</button>
          </>
        )}
      </div>
    </dialog>
  );
}
