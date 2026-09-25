/* Мэдээ: backend-ээс сүүлийн 7 мэдээг татаж, нүүрийн загвараар харуулна.
   Server component — API ажиллахгүй бол null буцааж build/SSR тасрахгүй. */

import Link from "next/link";
import { PostGrid } from "@/components/news/PostGrid";
import { fetchPosts } from "@/lib/news-api";

export async function NewsSection() {
  const data = await fetchPosts({ pageSize: 7 });
  if (!data) return null;

  return (
    <section id="news" className="mx-auto flex max-w-[1440px] scroll-mt-20 flex-col gap-8 px-4 pb-10 pt-10 lg:gap-10 md:px-10 lg:px-24 lg:pb-[72px] lg:pt-[72px]">
      <h2 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Мэдээ</h2>

      {data.items.length === 0 ? (
        <p className="text-muted">Мэдээ удахгүй.</p>
      ) : (
        <>
          <PostGrid posts={data.items} />
          <div className="flex justify-center">
            <Link
              href="/news"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-base font-semibold text-navy hover:underline hover:underline-offset-4"
            >
              Бүх мэдээ
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
