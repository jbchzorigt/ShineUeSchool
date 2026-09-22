/* Нүүр хуудас: видео толгой → мэдээ → хөтөлбөрийн логонууд → түүх → хаяг. */

import { Hero } from "@/components/home/Hero";
import { Advantages } from "@/components/home/Advantages";
import { NewsSection } from "@/components/home/NewsSection";
import { ProgramLogos } from "@/components/home/ProgramLogos";
import { HistoryTimeline } from "@/components/home/HistoryTimeline";
import { LocationSection } from "@/components/home/LocationSection";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";

export default function Home() {
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <Hero />
        <Advantages />
        <Reveal><NewsSection /></Reveal>
        <Reveal><ProgramLogos /></Reveal>
        <Reveal><HistoryTimeline /></Reveal>
        <Reveal><LocationSection /></Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
