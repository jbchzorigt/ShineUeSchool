/* Бидний тухай: navy дэвсгэрт гарчиг + танилцуулга (backend цэвэрлэсэн HTML) + үзүүлэлтийн мөр (0–4). Server component. */

import { Reveal } from "@/components/site/Reveal";
import type { AboutPage } from "@/lib/types";

export function IntroSection({ page }: { page: AboutPage }) {
  return (
    <section aria-labelledby="about-title" className="bg-navy text-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-12 md:px-10 lg:gap-12 lg:px-24 lg:py-[88px]">
        <Reveal className="flex max-w-3xl flex-col gap-5">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">Бидний тухай</p>
          <h1 id="about-title" className="font-display text-[30px] font-extrabold leading-tight lg:text-[42px]">{page.intro_title}</h1>
          {page.intro_html && <div className="news-body text-[17px] text-white/90 [&_a]:text-gold" dangerouslySetInnerHTML={{ __html: page.intro_html }} />}
        </Reveal>
        {page.stats.length > 0 && (
          <Reveal as="ul" stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
            {page.stats.map((s) => (
              <li key={s.label} className="flex flex-col gap-1 rounded-2xl border border-white/15 bg-white/5 px-5 py-5 lg:px-7 lg:py-6">
                <span className="font-display text-3xl font-extrabold text-gold lg:text-[40px]">{s.value}</span>
                <span className="text-sm text-white/80">{s.label}</span>
              </li>
            ))}
          </Reveal>
        )}
      </div>
    </section>
  );
}
