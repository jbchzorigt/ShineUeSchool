/* "Олимпиадын тухай" секц (section-2): гарчиг, текст (LineReveal — дэлгэцэнд орж ирэхэд мөр мөрөөр), үзүүлэлтүүд — админаас. */

import type { OlympiadPage } from "@/lib/types";
import { FORMULAS } from "@/lib/olympiad-data";
import { Formulas } from "./Formulas";
import { Heading } from "./Heading";
import { LineReveal } from "./LineReveal";

export function About({ page }: { page: OlympiadPage | null }) {
  return (
    <section className="section section-2" id="about">
      <Formulas items={FORMULAS.about} />
      <div className="section-inner narrow">
        <p className="eyebrow">Олимпиадын тухай</p>
        {page ? (
          <>
            <Heading variant={0}>{page.about_title}</Heading>
            <LineReveal className="lead" text={page.about_lead} variant="rise" />
            {page.stats.length > 0 && (
              <ul className="stats">{page.stats.map((s, i) => <li key={i}><strong>{s.value}</strong><span>{s.label}</span></li>)}</ul>
            )}
          </>
        ) : <p className="section-note">Мэдээлэл түр байхгүй.</p>}
      </div>
    </section>
  );
}
