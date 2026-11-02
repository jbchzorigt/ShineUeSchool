/* /feed — сургуулийн Facebook Page-ийн нийтлэлүүд мэдээний хэсэг болж харагдана.
   Server component: эхний хуудсыг Graph API-аас (components/fbfeed/graph.ts) татна,
   харилцан үйлдлүүд (реакц, сэтгэгдэл, хуваалцах) components/fbfeed/FacebookFeed.tsx-д. */

import type { Metadata } from "next";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { FacebookFeed } from "@/components/fbfeed/FacebookFeed";
import { fetchFeed } from "@/components/fbfeed/graph";

export const metadata: Metadata = {
  title: "Мэдээ — Шинэ Үе сургууль",
  description: "Шинэ Үе сургуулийн Facebook хуудасны сүүлийн үеийн мэдээ, үйл явдлууд.",
};

/* Segment config заавал литерал утга байх ёстой (graph.ts-ийн FEED_REVALIDATE_SECONDS = 300-тай ижил). */
export const revalidate = 300;

export default async function FeedPage() {
  const result = await fetchFeed();

  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <Reveal as="section" className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 py-10 md:px-10 lg:py-[72px]">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Мэдээ</h1>
            <p className="text-muted">Сургуулийн Facebook хуудасны сүүлийн үеийн нийтлэлүүд. Реакц үлдээх, сэтгэгдэл бичих, хуваалцахад Facebook-ээр нэвтэрнэ.</p>
          </div>

          {!result.ok ? (
            <p className="rounded-lg border border-line bg-white px-4 py-3 text-muted">
              {result.reason === "unconfigured" ? "Facebook feed тохируулагдаагүй байна." : "Мэдээг ачаалж чадсангүй."}
              {process.env.NODE_ENV !== "production" && <span className="block text-xs">{result.message}</span>}
            </p>
          ) : result.page.posts.length === 0 ? (
            <p className="text-muted">Мэдээ удахгүй.</p>
          ) : (
            <FacebookFeed initial={result.page} />
          )}
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
