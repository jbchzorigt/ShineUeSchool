/* /programs/[slug] — хөтөлбөрийн хуудас: толгой (сургалтын зам, хэсгийн tab), үзүүлэлтийн мөр, шатууд (Cambridge), хэрэгжилт (rich text), заадаг хичээлүүд,
   үр дүн (оноо — dumbbell, нийт дундаж ба гадаадад элсэлт — area), тэтгэлэг, бүтээлийн булан (SHOW_WORKS — одоогоор нуусан). Өгөгдөлгүй хэсэг харагдахгүй. Server component. */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/SiteFooter";
import { ProgramFacts } from "@/components/programs/ProgramFacts";
import { ProgramHero } from "@/components/programs/ProgramHero";
import { hasResults, ProgramResults } from "@/components/programs/ProgramResults";
import { ProgramStages } from "@/components/programs/ProgramStages";
import { Scholarships } from "@/components/programs/Scholarships";
import { ProgramSubjects, type SubjectScore } from "@/components/programs/ProgramSubjects";
import { num, SHOW_WORKS, signed } from "@/components/programs/theme";
import { WorksGallery } from "@/components/programs/WorksGallery";
import { Reveal } from "@/components/site/Reveal";
import { fetchProgram, fetchPrograms } from "@/lib/programs-api";
import { getDict, isLang, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/i18n/metadata";
import type { ProgramDetail } from "@/lib/types";

type Params = Promise<{ lang: string; slug: string }>;

/** Хичээл онооны графикт (монгол эсвэл англи нэрээр) байвал: сүүлийн оноо + эхний оноотой зөрүү — хичээлийн тайлбарт харуулна */
function subjectScores(p: ProgramDetail, lang: Lang): Record<string, SubjectScore> {
  const t = getDict(lang).programs;
  const r = p.radar;
  if (!r) return {};
  const out: Record<string, SubjectScore> = {};
  for (const s of p.subjects) {
    const names = [s.key, s.name_en].filter(Boolean).map((x) => x.toLocaleLowerCase());
    const i = r.subjects.findIndex((x) => names.includes(x.toLocaleLowerCase()));
    if (i < 0) continue;
    const pts = r.series.flatMap((sr) => (sr.values[i] == null ? [] : [{ name: sr.name, v: sr.values[i] as number }]));
    if (!pts.length) continue;
    const [a, z] = [pts[0], pts[pts.length - 1]];
    out[s.key] = { value: num(z.v), label: t.subjectScore(z.name), since: pts.length > 1 ? t.since(signed(z.v - a.v), a.name) : undefined };
  }
  return out;
}
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
  const overview = !!p.body_html || !!t.stages[p.slug] || p.subjects.length > 0;
  const works = SHOW_WORKS && p.works.length > 0;
  // Хэрэгжилтийн текстийг эхний дэд гарчгаар (<h2>) хуваана: оршил → заадаг хичээлүүд → үлдсэн хэсэг (Тэтгэлэг г.м. дэд гарчгууд)
  const cut = p.subjects.length ? p.body_html.search(/<h2[\s>]/i) : -1;
  const [intro, rest] = cut < 0 ? [p.body_html, ""] : [p.body_html.slice(0, cut).trim(), p.body_html.slice(cut)];
  const sections = [
    overview && { id: "overview", label: t.tabs.overview },
    results && { id: "results", label: t.tabs.results },
    p.scholarships.length > 0 && { id: "scholarships", label: t.tabs.scholarships },
    works && { id: "works", label: t.tabs.works },
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
              {(p.body_html || p.subjects.length > 0) && (
                <Reveal>
                  <section aria-labelledby="impl-title" className="flex flex-col gap-8 lg:gap-10">
                    <div className="flex flex-col gap-4">
                      <h2 id="impl-title" className="font-display text-[26px] font-extrabold text-navy lg:text-[32px]">{t.implementation}</h2>
                      {intro && <div className="news-body max-w-3xl text-[17px] text-ink" dangerouslySetInnerHTML={{ __html: intro }} />}
                    </div>
                    {p.subjects.length > 0 && <ProgramSubjects subjects={p.subjects} scores={subjectScores(p, lang)} />}
                    {rest && <div className="news-body max-w-3xl text-[17px] text-ink" dangerouslySetInnerHTML={{ __html: rest }} />}
                  </section>
                </Reveal>
              )}
            </div>
          )}
          {results && <Reveal><ProgramResults program={p} lang={lang} /></Reveal>}
          {p.scholarships.length > 0 && <Reveal><div id="scholarships" className="scroll-mt-28"><Scholarships items={p.scholarships} total={p.scholarship_total_usd} lang={lang} /></div></Reveal>}
          {works && <Reveal><div id="works" className="scroll-mt-28"><WorksGallery works={p.works} /></div></Reveal>}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
