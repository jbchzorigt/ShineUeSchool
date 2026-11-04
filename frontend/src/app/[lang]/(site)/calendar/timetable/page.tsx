import type { Metadata } from "next";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { CalendarTabs } from "@/components/timetable/CalendarTabs";
import { TimetableView } from "@/components/timetable/TimetableView";

export const metadata: Metadata = {
  title: "Хичээлийн хуваарь — Шинэ Үе сургууль",
  description: "Шинэ Үе сургуулийн ангиудын хичээлийн хуваарь: ангиар, багшаар, өрөөгөөр.",
};

export default function CalendarTimetablePage() {
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <Reveal as="section" className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 md:px-10 lg:px-24 lg:py-[72px]">
          <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Календарь</h1>
          <CalendarTabs />
          <TimetableView />
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
