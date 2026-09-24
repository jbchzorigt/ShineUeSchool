/* Хөтөлбөрийн толгой: cover (эсвэл navy блок) дээр badge, нэр, summary. Server component. */

import Image from "next/image";
import Link from "next/link";
import type { ProgramDetail } from "@/lib/types";

export function ProgramHero({ program }: { program: ProgramDetail }) {
  return (
    <div className="flex flex-col gap-4">
      <p><Link href="/" className="text-sm font-medium text-navy hover:underline">← Нүүр</Link></p>
      <div className="relative h-[240px] overflow-hidden rounded-xl bg-navy lg:h-[440px]">
        {program.cover_image && <Image src={program.cover_image} alt="" fill unoptimized sizes="(max-width: 1440px) 100vw, 1440px" priority className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 text-white lg:p-10">
          <span className="w-fit rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy">{program.badge}</span>
          <h1 className="font-display text-[30px] font-extrabold leading-tight lg:text-[42px]">{program.name}</h1>
          {program.summary && <p className="max-w-2xl text-[15px] text-white/85 lg:text-lg">{program.summary}</p>}
        </div>
      </div>
    </div>
  );
}
