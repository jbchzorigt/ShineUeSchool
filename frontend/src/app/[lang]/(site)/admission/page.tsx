/* /admission — Элсэлт: агуулга удахгүй (орлуулагч хуудас; дээд цэсний "Бүртгэл" бүлгээс). */

import type { Metadata } from "next";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { CONTACT } from "@/lib/home-data";
import { getDict, isLang, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/i18n/metadata";

type Params = Promise<{ lang: string }>;
const langOf = async (params: Params): Promise<Lang> => { const { lang } = await params; return isLang(lang) ? lang : "mn"; };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lang = await langOf(params);
  const t = getDict(lang);
  return { title: t.meta.title(t.admission.title), description: t.admission.lead, alternates: alternates("/admission", lang) };
}

export default async function Page({ params }: { params: Params }) {
  const t = getDict(await langOf(params)).admission;
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <Reveal as="section" className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-10 md:px-10 lg:px-24 lg:py-[72px]">
          <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">{t.title}</h1>
          <p className="max-w-[36em] text-[17px] text-muted lg:text-lg">{t.lead}</p>
          <p className="rounded-xl border border-line bg-white px-5 py-4 text-[15px] text-ink">{t.soonBefore} <a href={`mailto:${CONTACT.email}`} className="font-semibold text-navy underline underline-offset-4">{CONTACT.email}</a>{t.soonAfter.startsWith(".") ? "" : " "}{t.soonAfter}</p>
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
