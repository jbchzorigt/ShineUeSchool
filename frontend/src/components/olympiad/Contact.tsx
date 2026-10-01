/* Холбоо барих секц (section-3, хөх дэвсгэр) — админаас (/admin/olympiad/settings). Дараалал: цахим хаяг · байршил · утас;
   и-мэйл, утас дарахад mailto:/tel: нээгдэнэ. */

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
        <p className="lead">Олимпиадтай холбоотой зүйлс лавлахыг хүсвэл доорх цахим хаяг, байршил, утасны дугаараар холбогдоно уу.</p>
        {page ? (
          <ul className="contact-list">
            <li><span>Цахим хаяг</span><strong><a href={`mailto:${page.contact_email}`}>{page.contact_email}</a></strong></li>
            <li><span>Байршил</span><strong>{page.contact_address}</strong></li>
            <li><span>Утас</span><strong><a href={`tel:${page.contact_phone.replace(/[^\d+]/g, "")}`}>{page.contact_phone}</a></strong></li>
          </ul>
        ) : <p className="section-note">Мэдээлэл түр байхгүй.</p>}
      </div>
    </section>
  );
}
