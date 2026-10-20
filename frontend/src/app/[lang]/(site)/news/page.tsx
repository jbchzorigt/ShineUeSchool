/* /news — мэдээний жагсаалт: ангиллаар шүүх (chip мөр) + хуудаслалт.
   Server component; Next 16-д searchParams Promise тул await хийнэ. */

import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { Pagination } from "@/components/news/Pagination";
import { PostGrid } from "@/components/news/PostGrid";
import { fetchCategories, fetchPosts } from "@/lib/news-api";

export const metadata: Metadata = {
  title: "Мэдээ — Шинэ Үе сургууль",
  description: "Шинэ Үе сургуулийн мэдээ, үйл явдлууд.",
};

const PAGE_SIZE = 11;

function pageHref(p: number, category?: string): string {
  const params = new URLSearchParams();
  if (p > 1) params.set("page", String(p));
  if (category) params.set("category", category);
  const qs = params.toString();
  return `/news${qs ? `?${qs}` : ""}`;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const category = sp.category || undefined;

  const [data, categories] = await Promise.all([
    fetchPosts({ page, category, pageSize: PAGE_SIZE }),
    fetchCategories(),
  ]);

  const chipBase = "rounded-full border px-4 py-1.5 text-sm font-medium";
  const chipActive = "border-navy bg-navy text-white";
  const chipInactive = "border-line text-ink hover:border-navy hover:text-navy";

  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <Reveal as="section" className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 lg:gap-10 md:px-10 lg:px-24 lg:py-[72px]">
          <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Мэдээ</h1>

          {categories.length > 0 && (
            <nav aria-label="Ангиллаар шүүх" className="flex flex-wrap gap-2">
              <Link href={pageHref(1)} className={`${chipBase} ${!category ? chipActive : chipInactive}`}>
                Бүгд
              </Link>
              {categories.map((c) => (
                <Link key={c.id} href={pageHref(1, c.slug)} className={`${chipBase} ${category === c.slug ? chipActive : chipInactive}`}>
                  {c.name}
                </Link>
              ))}
            </nav>
          )}

          {!data ? (
            <p className="text-muted">Мэдээг ачаалж чадсангүй.</p>
          ) : data.items.length === 0 ? (
            <p className="text-muted">Мэдээ удахгүй.</p>
          ) : (
            <>
              <PostGrid posts={data.items} />
              <Pagination
                page={data.page}
                pages={Math.max(1, Math.ceil(data.total / data.page_size))}
                hrefFor={(p) => pageHref(p, category)}
              />
            </>
          )}
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
