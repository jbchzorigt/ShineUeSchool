/* Нүүрний "Хөтөлбөрүүд" хэсэг: backend-ийн нийтлэгдсэн хөтөлбөрүүд картаар (1 / md 2 / 3+ бол lg 3 багана). Хоосон бол render хийхгүй. */

import { Reveal } from "@/components/site/Reveal";
import type { ProgramCard as ProgramCardData } from "@/lib/types";
import { ProgramCard } from "./ProgramCard";

export function ProgramsSection({ programs }: { programs: ProgramCardData[] }) {
  if (programs.length === 0) return null;
  const cols = programs.length >= 3 ? "lg:grid-cols-3" : "";
  return (
    <section id="programs" aria-labelledby="programs-title" className="bg-paper-2">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-10 md:px-10 lg:gap-12 lg:px-24 lg:py-[72px]">
        <Reveal className="flex flex-col gap-3">
          <h2 id="programs-title" className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Хөтөлбөрүүд</h2>
          <p className="border-l-2 border-navy pl-4 text-base text-muted">Олон улсын хөтөлбөрөөр сургалт явуулдаг</p>
        </Reveal>
        <Reveal as="ul" stagger className={`grid gap-6 md:grid-cols-2 ${cols}`}>
          {programs.map((p) => <ProgramCard key={p.id} program={p} />)}
        </Reveal>
      </div>
    </section>
  );
}
