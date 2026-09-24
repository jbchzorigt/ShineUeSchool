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

export default async function Home() {
  const [programs, years, graduates, gradStats] = await Promise.all([fetchPrograms(), fetchOlympiadYears(), fetchGraduates(), fetchGraduateStats()]);
  const destinations = graduates ?? [];
  const stats = gradStats ?? { total_graduates: 0, university_percent: 0, university_count: 0, abroad_count: 0 };
  const olympiadYear = latestYear(years);
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <Hero olympiadYear={olympiadYear} />
        <ProgramsSection programs={programs ?? []} />
        <Reveal><NewsSection /></Reveal>
        <Reveal><Graduation stats={stats} map={destinations.length ? buildMapData(destinations) : null} destinations={destinations} /></Reveal>
        <Reveal><LocationSection /></Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
