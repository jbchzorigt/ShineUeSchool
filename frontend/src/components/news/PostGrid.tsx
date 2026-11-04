/* Мэдээний картын grid: сүүлийнх том, хажууд 2 жижиг, доор бусад grid-ээр.
   Нүүр хуудсын NewsSection ба /news жагсаалтын хуудас хоёулаа ашиглана. */

import Link from "next/link";
import { NewsImage, LikeCount } from "@/components/home/NewsBits";
import { localePath, type Lang } from "@/lib/i18n";
import type { PostCard as PostCardData } from "@/lib/types";
import { formatDate } from "./format";

export function PostGrid({ posts, lang = "mn" }: { posts: PostCardData[]; lang?: Lang }) {
  const [lead, second, third, ...rest] = posts;

  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        {lead && <LeadCard post={lead} lang={lang} />}
        <div className="col-span-12 flex flex-col gap-6 lg:col-span-5">
          {second && <SideCard post={second} lang={lang} />}
          {third && <SideCard post={third} lang={lang} />}
        </div>
      </div>

      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-line pt-5 lg:grid-cols-4 lg:gap-x-6 lg:pt-8">
          {rest.map((post) => (
            <SmallCard key={post.id} post={post} lang={lang} />
          ))}
        </div>
      )}
    </>
  );
}

type CardProps = { post: PostCardData; lang: Lang };

function LeadCard({ post, lang }: CardProps) {
  return (
    <Link href={localePath(lang, `/news/${post.slug}`)} className="group col-span-12 flex flex-col gap-3 text-ink lg:col-span-7 lg:gap-4">
      <NewsImage lang={lang} src={post.cover_image} className="h-[220px] rounded-xl lg:h-[400px]" />
      <Meta post={post} lang={lang} />
      <span className="font-display text-[26px] font-extrabold leading-tight group-hover:text-navy group-hover:underline group-hover:underline-offset-[5px] lg:text-[34px]">
        {post.title}
      </span>
      {post.excerpt && <span className="hidden max-w-[38em] text-[17px] leading-relaxed text-muted lg:block">{post.excerpt}</span>}
      <LikeCount lang={lang} n={post.likes_count} />
    </Link>
  );
}

function SideCard({ post, lang }: CardProps) {
  return (
    <Link href={localePath(lang, `/news/${post.slug}`)} className="group flex gap-3.5 text-ink lg:gap-4">
      <NewsImage lang={lang} src={post.cover_image} className="h-[100px] w-[130px] shrink-0 rounded-lg lg:h-[150px] lg:w-[200px] lg:rounded-[10px]" />
      <span className="flex flex-col gap-1.5 lg:gap-2">
        <Meta post={post} lang={lang} />
        <span className="font-display text-[19px] font-extrabold leading-tight group-hover:text-navy group-hover:underline group-hover:underline-offset-[5px] lg:text-[23px]">
          {post.title}
        </span>
        <LikeCount lang={lang} n={post.likes_count} />
      </span>
    </Link>
  );
}

/** Жижиг карт: grid-ийн доод мөр ба мэдээний дэлгэрэнгүйн "Санал болгох мэдээ" (RelatedPosts.tsx) ашиглана. */
export function SmallCard({ post, lang = "mn" }: { post: PostCardData; lang?: Lang }) {
  return (
    <Link href={localePath(lang, `/news/${post.slug}`)} className="group flex flex-col gap-2 text-ink lg:gap-2.5">
      <NewsImage lang={lang} src={post.cover_image} className="h-[120px] rounded-lg lg:h-[190px] lg:rounded-[10px]" />
      <Meta post={post} lang={lang} />
      <span className="font-display text-[17px] font-extrabold leading-tight group-hover:text-navy group-hover:underline group-hover:underline-offset-[5px] lg:text-[21px]">
        {post.title}
      </span>
      <LikeCount lang={lang} n={post.likes_count} />
    </Link>
  );
}

function Meta({ post, lang }: CardProps) {
  return (
    <span className="flex items-center gap-3 text-[13px] text-muted lg:text-sm">
      {post.published_at && (
        <time dateTime={post.published_at} className="tabular-nums">
          {formatDate(post.published_at, lang)}
        </time>
      )}
      {post.category && <span>{post.category.name}</span>}
    </span>
  );
}
