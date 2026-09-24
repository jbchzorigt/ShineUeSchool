/* Хөтөлбөрийн карт (reference: зураг → badge → гарчиг → summary → "Дэлгэрэнгүй →"). Server component. */

import Image from "next/image";
import Link from "next/link";
import type { ProgramCard as ProgramCardData } from "@/lib/types";

export function ProgramCard({ program }: { program: ProgramCardData }) {
  const href = `/programs/${program.slug}`;
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <Link href={href} className="relative block aspect-[16/10] w-full bg-navy" aria-hidden="true" tabIndex={-1}>
        {program.cover_image
          ? <Image src={program.cover_image} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          : <span className="absolute inset-0 grid place-items-center font-display text-4xl font-extrabold text-white">{program.badge}</span>}
      </Link>
      <div className="flex flex-1 flex-col items-center gap-3 px-6 py-6 text-center lg:px-8">
        <span className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-2.5 py-1 text-xs font-semibold text-navy">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.6 5.8 21l1.6-7L2 9.3l7.1-.7z" /></svg>
          {program.badge}
        </span>
        <h3 className="font-display text-[22px] font-extrabold leading-tight text-ink lg:text-[26px]">
          <Link href={href} className="hover:text-navy">{program.name}</Link>
        </h3>
        {program.summary && <p className="text-[15px] leading-relaxed text-muted">{program.summary}</p>}
        <Link href={href} className="mt-auto inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90">
          Дэлгэрэнгүй <span aria-hidden="true">→</span>
        </Link>
      </div>
    </li>
  );
}
