/* Олон улсын хөтөлбөрүүдийн логоны тууз (Cambridge, IB DP ...). Утсан дээр хэвтээ гүйлгэнэ. */

import Image from "next/image";
import { PROGRAM_LOGOS } from "@/lib/home-data";

export function ProgramLogos() {
  return (
    <section aria-label="Олон улсын хөтөлбөрүүд" className="border-t border-line bg-paper-2">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-7 lg:grid lg:min-h-[160px] lg:grid-cols-[200px_minmax(0,1fr)] lg:items-center lg:gap-6 md:px-10 lg:px-24 lg:py-0">
        <p className="max-w-[12em] text-sm leading-snug text-muted lg:text-[15px]">Олон улсын хөтөлбөрөөр сургалт явуулдаг</p>
        <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:justify-between lg:gap-8 lg:overflow-visible lg:px-0">
          {PROGRAM_LOGOS.map((logo) => (
            <li key={logo.name} className="shrink-0">
              {logo.src ? (
                <Image src={logo.src} alt={logo.name} width={200} height={64} className="h-14 w-auto opacity-85 grayscale lg:h-16" />
              ) : (
                /* ⚠ Логоны файлыг /public/logos/ дотор оруулаад home-data.ts-д src-г заана */
                <span role="img" aria-label={`${logo.name} лого`} className="grid h-14 w-40 place-items-center rounded-md bg-paper-3 px-3 text-center text-xs text-muted lg:h-16 lg:w-52 lg:text-[13px]">
                  [{logo.name}]
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
