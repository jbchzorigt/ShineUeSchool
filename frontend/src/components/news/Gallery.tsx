"use client";

/* Мэдээний галерей: grid-ээр жижиг зураг, дарвал <dialog>-д томруулж харуулна.
   Esc/backdrop дарж хаана (dialog-ийн built-in Esc + гараар backdrop click). */

import Image from "next/image";
import { useRef, useState } from "react";
import type { NewsImage as NewsImageData } from "@/lib/types";

export function Gallery({ images }: { images: NewsImageData[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<NewsImageData | null>(null);

  const open = (img: NewsImageData) => {
    setActive(img);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-extrabold text-navy">Галерей</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {images.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => open(img)}
            aria-label={img.caption || "Зургийг томруулж харах"}
            className="group relative block h-[140px] overflow-hidden rounded-lg border border-line lg:h-[180px]"
          >
            <Image src={img.image} alt={img.caption} fill unoptimized sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition group-hover:opacity-90" />
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setActive(null)}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-auto max-h-[90vh] max-w-[90vw] rounded-xl bg-white p-0 backdrop:bg-ink/70"
      >
        {active && (
          <div className="flex flex-col">
            <div className="flex justify-end p-2">
              <button type="button" onClick={close} aria-label="Хаах" className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-paper-3">
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <span className="relative block h-[70vh] w-[min(90vw,800px)]">
              <Image src={active.image} alt={active.caption} fill unoptimized sizes="90vw" className="object-contain" />
            </span>
            {active.caption && <p className="px-4 pb-4 text-sm text-muted">{active.caption}</p>}
          </div>
        )}
      </dialog>
    </div>
  );
}
