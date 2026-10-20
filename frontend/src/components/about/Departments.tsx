/* Тэнхимүүд: карт бүрт нэр + багш нар (эрхлэгч эхэнд, шар badge; бусад нэр + role). Server component. */

import { Reveal } from "@/components/site/Reveal";
import { getDict, type Lang } from "@/lib/i18n";
import type { AboutDepartment } from "@/lib/types";

export function Departments({ departments, lang = "mn" }: { departments: AboutDepartment[]; lang?: Lang }) {
  if (departments.length === 0) return null;
  const tx = getDict(lang).about;
  return (
    <section aria-labelledby="departments-title">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-12 md:px-10 lg:px-24 lg:py-[72px]">
        <Reveal><h2 id="departments-title" className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">{tx.departmentsTitle}</h2></Reveal>
        <Reveal as="ul" stagger className="grid gap-6 lg:grid-cols-2">
          {departments.map((d) => (
            <li key={d.id} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
              <h3 className="font-display text-xl font-extrabold text-navy">{d.name}</h3>
              {d.teachers.length > 0 ? (
                <ul className="divide-y divide-line">
                  {d.teachers.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                      <span className={t.is_head ? "font-bold text-ink" : "text-ink"}>{t.full_name}</span>
                      {t.is_head && <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-semibold text-ink">{tx.head}</span>}
                      {t.role && <span className="text-sm text-muted">{t.role}</span>}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">{tx.teachersSoon}</p>}
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
