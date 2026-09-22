/* Холбоо барих секц (section-3, хөх дэвсгэр) — админаас. */

import type { OlympiadPage } from "@/lib/types";
import { FORMULAS } from "@/lib/olympiad-data";
import { Formulas } from "./Formulas";
import { Heading } from "./Heading";

export function Contact({ page }: { page: OlympiadPage | null }) {
  return (
    <section className="section section-3" id="contact">
      <Formulas items={FORMULAS.contact} />
      <div className="section-inner narrow">
        <p className="eyebrow">Холбоо барих</p>
        <Heading variant={1}>Бидэнтэй холбогдоорой</Heading>
        {page ? (
          <ul className="contact-list">
            <li><span>Хаяг</span><strong>{page.contact_address}</strong></li>
            <li><span>Утас</span><strong>{page.contact_phone}</strong></li>
            <li><span>И-мэйл</span><strong>{page.contact_email}</strong></li>
          </ul>
        ) : <p className="section-note">Мэдээлэл түр байхгүй.</p>}
      </div>
    </section>
  );
}
