/* /about — Бидний тухай: танилцуулга + үзүүлэлт, түүх 2003–2026 (snake timeline), хамт олон (marquee картууд), тэнхимүүд. Server component. */

import type { Metadata } from "next";
import { Departments } from "@/components/about/Departments";
import { IntroSection } from "@/components/about/IntroSection";
import { LeadershipChart } from "@/components/about/LeadershipChart";
import { HistoryTimeline } from "@/components/home/HistoryTimeline";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { fetchAbout } from "@/lib/about-api";

const FALLBACK_DESC = "Шинэ Үе сургуулийн удирдлага, тэнхим, багш нар";

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchAbout();
  const text = (data?.page.intro_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { title: "Бидний тухай — Шинэ Үе сургууль", description: text ? text.slice(0, 160) : FALLBACK_DESC };
}

export default async function Page() {
  const data = await fetchAbout();
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        {data ? <IntroSection page={data.page} /> : (
          <Reveal as="section" className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-10 lg:px-24 lg:py-[72px]">
            <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Бидний тухай</h1>
          </Reveal>
        )}
        <Reveal><HistoryTimeline /></Reveal>
        {data && <LeadershipChart leaders={data.leaders} />}
        {data && <Departments departments={data.departments} />}
      </main>
      <SiteFooter />
    </>
  );
}
