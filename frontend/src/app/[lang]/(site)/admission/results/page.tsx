/* /admission/results, /en/admission/results — элсэлтийн шалгалтын дүн. Зөвхөн элсэгчийн код, анги, оноо, дүн
   нийтлэгдэнэ; элсэгч кодоороо хайж эсвэл жагсаалтыг гүйлгэж хайна. Дүнгийн хэсэг унтраалттай эсвэл эцсийн хугацаа
   өнгөрсөн бол хуудас сайтаас алга болно (404) — админ дахин асаах хүртэл. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultsList } from "@/components/admission/ResultsList";
import { formatDateTime } from "@/components/news/format";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { fetchAdmissionResults } from "@/lib/admissions-api";
import { getDict, isLang, localePath, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/i18n/metadata";

type Params = Promise<{ lang: string }>;
const langOf = async (params: Params): Promise<Lang> => { const { lang } = await params; return isLang(lang) ? lang : "mn"; };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lang = await langOf(params);
  const t = getDict(lang);
  return {
    title: t.meta.title(t.admission.resultsPageTitle),
    description: t.admission.resultsDescription,
    alternates: alternates("/admission/results", lang),
  };
}

export default async function Page({ params }: { params: Params }) {
  const lang = await langOf(params);
  const t = getDict(lang).admission;
  const data = await fetchAdmissionResults(lang);
  if (data && !data.round?.results.open) notFound();
  const published = Boolean(data?.published_at);
  const admissionHref = localePath(lang, "/admission");

  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <Reveal as="section" className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 py-10 md:px-10 lg:py-[72px]">
          <div className="flex flex-col gap-2">
            <p><Link href={admissionHref} className="text-sm font-medium text-navy hover:underline">{t.back}</Link></p>
            <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">{t.resultsPageTitle}</h1>
            {data?.round && (
              <p className="text-[17px] text-muted">
                {data.round.name}
                {data.published_at && <> · <span className="tabular-nums">{t.publishedAt(formatDateTime(data.published_at, lang))}</span></>}
                {data.round.results.deadline && <> · <span className="tabular-nums">{t.until(formatDateTime(data.round.results.deadline, lang))}</span></>}
              </p>
            )}
          </div>

          {!data ? (
            <p className="text-muted">{t.unavailable}</p>
          ) : !published ? (
            <p className="max-w-[40em] rounded-xl border border-line bg-white px-5 py-4 text-[15px] text-ink">{t.notPublished}</p>
          ) : (
            <>
              <p className="max-w-[46em] text-[15px] text-muted">
                {t.privacy[0]}<Link href={admissionHref} className="font-semibold text-navy underline underline-offset-4">{t.privacy[1]}</Link>{t.privacy[2]}
              </p>
              <ResultsList rows={data.rows} />
            </>
          )}
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
