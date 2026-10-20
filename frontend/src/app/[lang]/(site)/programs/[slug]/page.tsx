/* /programs/[slug] — хөтөлбөрийн хуудас: толгой, мэдээллийн мөр, хэрэгжилт (rich text), бүтээлийн булан, тэтгэлэг. Server component. */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/SiteFooter";
import { ProgramFacts } from "@/components/programs/ProgramFacts";
import { ProgramHero } from "@/components/programs/ProgramHero";
import { ProgramRadar } from "@/components/programs/ProgramRadar";
import { Scholarships } from "@/components/programs/Scholarships";
import { WorksGallery } from "@/components/programs/WorksGallery";
import { Reveal } from "@/components/site/Reveal";
import { fetchProgram } from "@/lib/programs-api";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await fetchProgram(slug);
  if (!p) return { title: "Хөтөлбөр олдсонгүй — Шинэ Үе сургууль" };
  return { title: `${p.name} — Шинэ Үе сургууль`, description: p.summary, openGraph: { title: p.name, description: p.summary, images: p.cover_image ? [p.cover_image] : [] } };
}

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await fetchProgram(slug);
  if (!p) notFound();
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 py-10 md:px-10 lg:gap-14 lg:px-24 lg:py-[72px]">
          <Reveal><ProgramHero program={p} /></Reveal>
          <Reveal><ProgramFacts program={p} /></Reveal>
          {p.body_html && (
            <Reveal>
              <section aria-labelledby="impl-title" className="flex flex-col gap-4">
                <h2 id="impl-title" className="font-display text-[26px] font-extrabold text-navy lg:text-[32px]">Хөтөлбөрийн хэрэгжилт</h2>
                <div className="news-body max-w-3xl text-[17px] text-ink" dangerouslySetInnerHTML={{ __html: p.body_html }} />
              </section>
            </Reveal>
          )}
          {p.radar && <Reveal><ProgramRadar radar={p.radar} /></Reveal>}
          {p.works.length > 0 && <Reveal><WorksGallery works={p.works} /></Reveal>}
          {p.scholarships.length > 0 && <Reveal><Scholarships items={p.scholarships} total={p.scholarship_total_usd} /></Reveal>}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
