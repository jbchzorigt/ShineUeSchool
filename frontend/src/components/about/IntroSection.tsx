/* Бидний тухай: гарчиг + танилцуулга (backend цэвэрлэсэн HTML) + үзүүлэлтийн мөр (0–4). Server component.
   hero_image байвал: header-ийн доорх бүтэн дэлгэцийн hero — зураг дэвсгэр, дээр нь navy бүдэг давхарга (текст уншигдахуйц),
   агуулга доод талдаа. Зураггүй бол өмнөх шигээ navy дэвсгэр. */

import Image from "next/image";
import { Reveal } from "@/components/site/Reveal";
import { getDict, type Lang } from "@/lib/i18n";
import type { AboutPage } from "@/lib/types";

export function IntroSection({ page, lang = "mn" }: { page: AboutPage; lang?: Lang }) {
  const hero = page.hero_image || null;
  return (
    <section aria-labelledby="about-title" className="relative isolate overflow-hidden bg-navy text-white">
      {hero && (
        <>
          <Image src={hero} alt="" fill unoptimized priority sizes="100vw" className="hero-zoom -z-20 object-cover" />
          {/* бүхэлд нь бага зэрэг бүдэгрүүлж, доод талд (текстийн ард) илүү бараан */}
          <div aria-hidden className="absolute inset-0 -z-10 bg-navy/35" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/55 to-transparent" />
        </>
      )}
      <div className={`mx-auto flex max-w-[1440px] flex-col gap-8 px-4 md:px-10 lg:gap-12 lg:px-24 ${hero
        ? "min-h-[calc(100svh-4rem)] justify-end pb-12 pt-24 lg:min-h-[calc(100svh-5rem)] lg:pb-20"
        : "py-12 lg:py-[88px]"}`}>
        <Reveal className="flex max-w-3xl flex-col gap-5">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">{getDict(lang).about.title}</p>
          <h1 id="about-title" className={`font-display font-extrabold leading-tight ${hero ? "text-[34px] drop-shadow-sm lg:text-[56px]" : "text-[30px] lg:text-[42px]"}`}>{page.intro_title}</h1>
          {page.intro_html && <div className="news-body text-[17px] text-white/90 [&_a]:text-gold" dangerouslySetInnerHTML={{ __html: page.intro_html }} />}
        </Reveal>
        {page.stats.length > 0 && (
          <Reveal as="ul" stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
            {page.stats.map((s) => (
              <li key={s.label} className={`flex flex-col gap-1 rounded-2xl border border-white/15 px-5 py-5 lg:px-7 lg:py-6 ${hero ? "bg-white/10 backdrop-blur-sm" : "bg-white/5"}`}>
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
