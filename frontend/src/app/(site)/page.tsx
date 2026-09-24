/* Нүүр хуудас: математик canvas толгой → хөтөлбөрүүд → мэдээ → түүх → хаяг. */

import { Hero } from "@/components/home/Hero";
import { ProgramsSection } from "@/components/home/ProgramsSection";
import { NewsSection } from "@/components/home/NewsSection";
import { HistoryTimeline } from "@/components/home/HistoryTimeline";
import { LocationSection } from "@/components/home/LocationSection";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { fetchPrograms } from "@/lib/programs-api";

export default async function Home() {
  const programs = (await fetchPrograms()) ?? [];
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <Hero />
        <ProgramsSection programs={programs} />
        <Reveal><NewsSection /></Reveal>
        <Reveal><HistoryTimeline /></Reveal>
        <Reveal><LocationSection /></Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
