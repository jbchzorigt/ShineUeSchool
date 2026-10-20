/* Нүүр хуудас: математик canvas толгой → хөтөлбөрүүд → мэдээ → төгсөлт (counter) → хаяг. Түүхийн timeline /about дээр. */

import { Hero } from "@/components/home/Hero";
import { ProgramsSection } from "@/components/home/ProgramsSection";
import { NewsSection } from "@/components/home/NewsSection";
import { Graduation } from "@/components/home/Graduation";
import { LocationSection } from "@/components/home/LocationSection";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { fetchPrograms } from "@/lib/programs-api";
import { fetchOlympiadYears, latestYear } from "@/lib/olympiad-api";
import { buildMapData } from "@/lib/world-map";
import { fetchGraduateStats, fetchGraduates } from "@/lib/graduates-api";
import { getDict, isLang, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/i18n/metadata";
import type { Metadata } from "next";

type Props = { params: Promise<{ lang: string }> };
const langOf = async (params: Props["params"]): Promise<Lang> => { const { lang } = await params; return isLang(lang) ? lang : "mn"; };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params);
  const t = getDict(lang).meta;
  return { title: t.siteName, description: t.defaultDescription, alternates: alternates("/", lang) };
}

export default async function Home({ params }: Props) {
  const lang = await langOf(params);
  const [programs, years, graduates, gradStats] = await Promise.all([
    fetchPrograms(lang), lang === "mn" ? fetchOlympiadYears() : null, fetchGraduates(lang), fetchGraduateStats(),
  ]);
  const destinations = graduates ?? [];
  const stats = gradStats ?? { total_graduates: 0, university_percent: 0, university_count: 0, abroad_count: 0 };
  const olympiadYear = latestYear(years);
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <Hero olympiadYear={olympiadYear} />
        <ProgramsSection programs={programs ?? []} lang={lang} />
        <Reveal><NewsSection lang={lang} /></Reveal>
        <Reveal><Graduation stats={stats} map={destinations.length ? buildMapData(destinations) : null} destinations={destinations} /></Reveal>
        <Reveal><LocationSection lang={lang} /></Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
