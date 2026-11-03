/* /admission/results — элсэлтийн шалгалтын дүн. Зөвхөн элсэгчийн код, анги, оноо, дүн нийтлэгдэнэ;
   элсэгч кодоороо хайж эсвэл жагсаалтыг гүйлгэж хайна. Дүнгийн хэсэг унтраалттай эсвэл эцсийн хугацаа
   өнгөрсөн бол хуудас сайтаас алга болно (404) — админ дахин асаах хүртэл. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultsList } from "@/components/admission/ResultsList";
import { formatDateTime } from "@/components/news/format";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { fetchAdmissionResults } from "@/lib/admissions-api";

export const metadata: Metadata = {
  title: "Элсэлтийн дүн — Шинэ Үе сургууль",
  description: "Шинэ Үе сургуулийн элсэлтийн шалгалтын дүн — элсэгчийн кодоор хайна.",
};

export default async function Page() {
  const data = await fetchAdmissionResults();
  if (data && !data.round?.results.open) notFound();
  const published = Boolean(data?.published_at);

  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <Reveal as="section" className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 py-10 md:px-10 lg:py-[72px]">
          <div className="flex flex-col gap-2">
            <p><Link href="/admission" className="text-sm font-medium text-navy hover:underline">← Элсэлт</Link></p>
            <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Элсэлтийн дүн</h1>
            {data?.round && (
              <p className="text-[17px] text-muted">
                {data.round.name}
                {data.published_at && <> · <span className="tabular-nums">{formatDateTime(data.published_at)}</span>-д нийтэлсэн</>}
                {data.round.results.deadline && <> · <span className="tabular-nums">{formatDateTime(data.round.results.deadline)}</span> хүртэл</>}
              </p>
            )}
          </div>

          {!data ? (
            <p className="text-muted">Мэдээлэл түр ачаалагдсангүй. Дараа дахин оролдоно уу.</p>
          ) : !published ? (
            <p className="max-w-[40em] rounded-xl border border-line bg-white px-5 py-4 text-[15px] text-ink">
              Шалгалтын дүн хараахан нийтлэгдээгүй байна. Дүн зарлагдмагц энэ хуудсанд элсэгчийн кодоор хайх боломжтой болно.
            </p>
          ) : (
            <>
              <p className="max-w-[46em] text-[15px] text-muted">
                Жагсаалтад зөвхөн элсэгчийн код харагдана — нэр, хувийн мэдээлэл нийтлэгдэхгүй. Кодоо бүртгүүлэх үед дэлгэцэнд
                болон имэйлээр хүлээн авсан. Мартсан бол <Link href="/admission" className="font-semibold text-navy underline underline-offset-4">Элсэлт</Link> хуудаснаас имэйлээр дахин авна.
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
