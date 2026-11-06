/* /programs/[slug] — хөтөлбөрийн хуудас: толгой (сургалтын зам, хэсгийн tab), үзүүлэлтийн мөр, шатууд (Cambridge), хэрэгжилт (rich text),
   үр дүн (оноо — dumbbell, нийт дундаж ба гадаадад элсэлт — area), тэтгэлэг, бүтээлийн булан. Өгөгдөлгүй хэсэг харагдахгүй. Server component. */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/SiteFooter";
import { ProgramFacts } from "@/components/programs/ProgramFacts";
import { ProgramHero } from "@/components/programs/ProgramHero";
import { hasResults, ProgramResults } from "@/components/programs/ProgramResults";
import { ProgramStages } from "@/components/programs/ProgramStages";
import { Scholarships } from "@/components/programs/Scholarships";
import { WorksGallery } from "@/components/programs/WorksGallery";
import { Reveal } from "@/components/site/Reveal";
import { fetchProgram, fetchPrograms } from "@/lib/programs-api";
import { getDict, isLang, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/i18n/metadata";

type Params = Promise<{ lang: string; slug: string }>;
const read = async (params: Params): Promise<{ lang: Lang; slug: string }> => {
  const { lang, slug } = await params;
  return { lang: isLang(lang) ? lang : "mn", slug };
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await read(params);
  const t = getDict(lang);
  const p = await fetchProgram(slug, lang);
  if (!p) return { title: t.meta.title(t.programs.notFound) };
  return { title: t.meta.title(p.name), description: p.summary, alternates: alternates(`/programs/${slug}`, lang), openGraph: { title: p.name, description: p.summary, images: p.cover_image ? [p.cover_image] : [] } };
}

export default async function ProgramPage({ params }: { params: Params }) {
  const { lang, slug } = await read(params);
  const t = getDict(lang).programs;
  const [p, all] = await Promise.all([fetchProgram(slug, lang), fetchPrograms(lang)]);
  if (!p) notFound();
  const programs = all ?? [];
  const results = hasResults(p);
  const overview = !!p.body_html || !!t.stages[p.slug];
  const sections = [
    overview && { id: "overview", label: t.tabs.overview },
    results && { id: "results", label: t.tabs.results },
    p.scholarships.length > 0 && { id: "scholarships", label: t.tabs.scholarships },
    p.works.length > 0 && { id: "works", label: t.tabs.works },
  ].filter((x): x is { id: string; label: string } => !!x);
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 py-10 md:px-10 lg:gap-14 lg:px-24 lg:py-[72px]">
          <Reveal><ProgramHero program={p} programs={programs} sections={sections} lang={lang} /></Reveal>
          <Reveal><ProgramFacts program={p} lang={lang} /></Reveal>
          {overview && (
            <div id="overview" className="flex scroll-mt-28 flex-col gap-10 lg:gap-14">
              {t.stages[p.slug] && <Reveal><ProgramStages program={p} programs={programs} lang={lang} /></Reveal>}
              {p.body_html && (
                <Reveal>
                  <section aria-labelledby="impl-title" className="flex flex-col gap-4">
                    <h2 id="impl-title" className="font-display text-[26px] font-extrabold text-navy lg:text-[32px]">{t.implementation}</h2>
                    <div className="news-body max-w-3xl text-[17px] text-ink" dangerouslySetInnerHTML={{ __html: p.body_html }} />
                  </section>
                </Reveal>
              )}
            </div>
          )}
          {results && <Reveal><ProgramResults program={p} lang={lang} /></Reveal>}
          {p.scholarships.length > 0 && <Reveal><div id="scholarships" className="scroll-mt-28"><Scholarships items={p.scholarships} total={p.scholarship_total_usd} lang={lang} /></div></Reveal>}
          {p.works.length > 0 && <Reveal><div id="works" className="scroll-mt-28"><WorksGallery works={p.works} /></div></Reveal>}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
