"use client";

/* Дугуйлангийн карт: нүүр зураг, нэр, анги, тайлбар (дэлгэрэнгүй toggle), төлбөр, хугацаа, слот, төлөв, "Бүртгүүлэх". */

import Image from "next/image";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import type { Club } from "@/lib/types";
import { ClubGallery } from "./ClubGallery";
import { STATE_LABEL, STATE_TONE, formatFee, formatGrades, formatPeriod, quotaFor } from "./format";
import { QuotaRows } from "./QuotaRows";

export function ClubCard({ club, selectedGrade, onRegister }: { club: Club; selectedGrade: number | null; onRegister: (club: Club) => void }) {
  const [more, setMore] = useState(false);
  const [gallery, setGallery] = useState(false);
  const cover = club.images[0];
  const long = club.description.length > 160 || club.description.split("\n").length > 3;
  const sel = quotaFor(club, selectedGrade);
  const gradeFull = !!sel?.full;
  const canRegister = club.state === "open" && !gradeFull;
  const buttonLabel = club.state !== "open" ? STATE_LABEL[club.state] : gradeFull ? "Энэ ангид дүүрсэн" : "Бүртгүүлэх";

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <button type="button" onClick={() => cover && setGallery(true)} disabled={!cover}
              className="relative aspect-[16/9] w-full bg-paper-3 text-left disabled:cursor-default" aria-label={cover ? `${club.name} — зургууд үзэх` : undefined}>
        {cover ? (
          <Image src={cover.url} alt="" fill unoptimized className="object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center font-display text-5xl font-extrabold text-navy/30">{club.name.slice(0, 1)}</span>
        )}
        {club.images.length > 1 && <span className="absolute bottom-2 right-2 rounded-full bg-navy/80 px-2 py-0.5 text-xs font-semibold text-white">{club.images.length} зураг</span>}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-extrabold text-navy">{club.name}</h3>
            <p className="text-sm text-muted">{formatGrades(club.grades)}</p>
          </div>
          <Badge tone={STATE_TONE[club.state]}>{STATE_LABEL[club.state]}</Badge>
        </div>

        {club.description && (
          <div>
            <p className={`whitespace-pre-line text-sm text-ink ${more ? "" : "line-clamp-3"}`}>{club.description}</p>
            {long && <button type="button" onClick={() => setMore((v) => !v)} className="mt-1 text-sm font-semibold text-navy hover:underline">{more ? "Хураах" : "Дэлгэрэнгүй"}</button>}
          </div>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted">Төлбөр</dt><dd className="font-semibold text-ink">{formatFee(club)}</dd>
          <dt className="text-muted">Хугацаа</dt><dd className="text-ink">{formatPeriod(club)}</dd>
        </dl>

        {/* Слотын мөрүүд агуулгын шууд дор; зөвхөн товч картын доод талд (mt-auto) */}
        <div className="flex flex-1 flex-col gap-2">
          {/* Сонгосон анги: зөвхөн тэр ангийн мөр; нийт мөр нь бүх ангийн нийлбэр */}
          <QuotaRows quotas={sel ? [sel] : club.quotas} showLeft total={false} />
          <div className="flex items-center justify-between border-t border-slate-200 pt-1 text-sm font-semibold text-navy">
            <span>Нийт</span><span>{club.slots_left}/{club.capacity} сул</span>
          </div>
          <Button className="mt-auto w-full" disabled={!canRegister} onClick={() => onRegister(club)}>{buttonLabel}</Button>
        </div>
      </div>

      <ClubGallery images={club.images} name={club.name} open={gallery} onClose={() => setGallery(false)} />
    </article>
  );
}
