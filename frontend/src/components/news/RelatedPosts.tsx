/* Мэдээний дэлгэрэнгүйн доод хэсэг: "Санал болгох мэдээ" — 3 жижиг карт (утсанд 1, desktop-д 3 багана) + "Бүх мэдээ" холбоос.
   Өгөгдөл нь page.tsx-д server дээр fetchRelatedPosts-оор бэлтгэгдэнэ; хоосон бол юу ч render хийхгүй. */

import Link from "next/link";
import { getDict, localePath, type Lang } from "@/lib/i18n";
import type { PostCard } from "@/lib/types";
import { SmallCard } from "./PostGrid";

export function RelatedPosts({ posts, lang = "mn" }: { posts: PostCard[]; lang?: Lang }) {
  if (posts.length === 0) return null;
  const t = getDict(lang).news;
  return (
    <section aria-labelledby="related-heading" className="flex flex-col gap-5 border-t border-line pt-8 lg:gap-6 lg:pt-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="related-heading" className="font-display text-[22px] font-extrabold text-ink lg:text-[26px]">{t.related}</h2>
        <Link href={localePath(lang, "/news")} className="whitespace-nowrap text-sm font-medium text-navy hover:underline">{t.allArrow}</Link>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {posts.map((post) => <SmallCard key={post.id} post={post} lang={lang} />)}
      </div>
    </section>
  );
}
