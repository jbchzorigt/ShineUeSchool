/* /about — Бидний тухай: танилцуулга + үзүүлэлт, түүх 2003–2026 (snake timeline), хамт олон (marquee картууд), тэнхимүүд. Server component. */

import type { Metadata } from "next";
import { Departments } from "@/components/about/Departments";
import { IntroSection } from "@/components/about/IntroSection";
import { LeadershipChart } from "@/components/about/LeadershipChart";
import { HistoryTimeline } from "@/components/home/HistoryTimeline";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { fetchAbout } from "@/lib/about-api";
import { getDict, isLang, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/i18n/metadata";

type Props = { params: Promise<{ lang: string }> };
const langOf = async (params: Props["params"]): Promise<Lang> => { const { lang } = await params; return isLang(lang) ? lang : "mn"; };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params);
  const t = getDict(lang);
  const data = await fetchAbout(lang);
  const text = (data?.page.intro_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { title: t.meta.title(t.about.title), description: text ? text.slice(0, 160) : t.about.fallbackDescription, alternates: alternates("/about", lang) };
}

export default async function Page({ params }: Props) {
  const lang = await langOf(params);
  const data = await fetchAbout(lang);
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        {data ? <IntroSection page={data.page} lang={lang} /> : (
          <Reveal as="section" className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-10 lg:px-24 lg:py-[72px]">
            <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">{getDict(lang).about.title}</h1>
          </Reveal>
        )}
        <Reveal><HistoryTimeline /></Reveal>
        {data && <LeadershipChart leaders={data.leaders} />}
        {data && <Departments departments={data.departments} lang={lang} />}
      </main>
      <SiteFooter />
    </>
  );
}
