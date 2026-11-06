/* Хөтөлбөрийн карт (reference: зураг → badge → гарчиг → summary → гол үзүүлэлт + sparkline → "Дэлгэрэнгүй →") — сургуулийн сайтын
   загвараар: navy блок + дэвтрийн нүд, гэрлийн тойрог (нүүр зураг байвал navy-д уусгаж доор нь), алтан ангийн хаяг, цагаан карт
   border-line, үзүүлэлтийн мөр paper-2 дээр navy тоо, navy товч; hover-т дээш хөдөлж navy сүүдэр (LeadershipChart-тай ижил).
   Үзүүлэлтийг ProgramsSection тооцоолж өгнө (өгөгдөлгүй бол харагдахгүй). Server component; sparkline client. */

import Image from "next/image";
import Link from "next/link";
import { getDict, localePath, type Lang } from "@/lib/i18n";
import type { ProgramCard as ProgramCardData } from "@/lib/types";
import { Sparkline } from "./Sparkline";

/** Картын гол үзүүлэлт: гадаадад элссэн % / нийт дундаж оноо / тэтгэлэг — жилээрх утгатай */
export interface CardStat { label: string; value: string; sub: string; values: number[]; aria: string }

export function ProgramCard({ program, stat, lang = "mn" }: { program: ProgramCardData; stat?: CardStat | null; lang?: Lang }) {
  const href = localePath(lang, `/programs/${program.slug}`);
  const dict = getDict(lang);
  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-navy/15">
      <Link href={href} className="relative block aspect-[16/10] w-full overflow-hidden bg-navy" aria-hidden="true" tabIndex={-1}>
        {program.cover_image && (
          <>
            <Image src={program.cover_image} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="object-cover opacity-45 mix-blend-luminosity transition duration-500 group-hover:scale-[1.04]" />
            <span className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
          </>
        )}
        {/* дэвтрийн нүд (сайтын paper-grid санаа) + гэрлийн тойргууд */}
        <span className="absolute inset-0 opacity-15 [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:28px_28px]" />
        <span className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 transition duration-500 group-hover:scale-110" />
        <span className="absolute -right-4 top-24 h-24 w-24 rounded-full transition duration-500 group-hover:-translate-y-2" style={{ border: "3px solid rgb(255 194 14 / 0.7)" }} />
        <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy-deep">{dict.programs.gradeRange(program.grade_from, program.grade_to)}</span>
        <span className="absolute bottom-4 left-5 font-display text-[34px] font-extrabold leading-none text-white lg:text-[40px]">{program.badge}</span>
      </Link>
      <div className="flex flex-1 flex-col gap-4 px-6 py-6 lg:px-7">
        <h3 className="font-display text-[22px] font-extrabold leading-tight text-ink lg:text-[25px]">
          <Link href={href} className="transition hover:text-navy">{program.name}</Link>
        </h3>
        {program.summary && <p className="text-[15px] leading-relaxed text-muted">{program.summary}</p>}
        {stat && (
          <div className="flex w-full items-end justify-between gap-3 rounded-xl border border-line bg-paper-2 px-4 py-3">
            <span className="flex min-w-0 flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{stat.label}</span>
              <span className="font-display text-[28px] font-extrabold leading-tight text-navy">{stat.value}</span>
              <span className="truncate text-xs text-muted">{stat.sub}</span>
            </span>
            <Sparkline values={stat.values} color="#1e3a8f" dot="#ffc20e" ariaLabel={stat.aria} />
          </div>
        )}
        <Link href={href} className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:gap-3 hover:bg-navy-deep">
          {dict.home.programs.more} <span aria-hidden="true" className="text-gold">→</span>
        </Link>
      </div>
    </li>
  );
}
