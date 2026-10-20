/* /news/[slug] (/en/news/[slug]) — мэдээний дэлгэрэнгүй: ковер, ангилал/огноо-цаг, гарчиг, бие
   (backend цэвэрлэсэн HTML), галерей, лайк/share, зочны нэвтрэлт, сэтгэгдэл, санал болгох мэдээ.
   Хэл: тухайн хэлгүй мэдээ → 404; <LangAvailability> хэл солих товчид байгаа хэлнүүдийг мэдэгдэнэ; англи бие хоосон бол товч (excerpt) харагдана. */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { Comments } from "@/components/news/Comments";
import { formatDateTime } from "@/components/news/format";
import { Gallery } from "@/components/news/Gallery";
import { LikeButton } from "@/components/news/LikeButton";
import { RelatedPosts } from "@/components/news/RelatedPosts";
import { ShareButtons } from "@/components/news/ShareButtons";
import { VisitorBar } from "@/components/news/VisitorBar";
import { LangAvailability } from "@/components/site/LangSwitch";
import { fetchPost, fetchRelatedPosts } from "@/lib/news-api";
import { getDict, isLang, localePath, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/i18n/metadata";
import { SITE_URL } from "@/lib/site-url";

type Params = Promise<{ lang: string; slug: string }>;
const read = async (params: Params): Promise<{ lang: Lang; slug: string }> => {
  const { lang, slug } = await params;
  return { lang: isLang(lang) ? lang : "mn", slug };
};


export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await read(params);
  const t = getDict(lang);
  const post = await fetchPost(slug, lang);
  if (!post) return { title: t.meta.title(t.news.notFoundTitle) };
  return {
    title: t.meta.title(post.title),
    alternates: alternates(`/news/${slug}`, lang, post.languages),
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${SITE_URL}${localePath(lang, `/news/${slug}`)}`,
      locale: lang === "en" ? "en_US" : "mn_MN",
      type: "article",
      images: post.cover_image ? [post.cover_image] : [],
    },
  };
}

export default async function NewsPostPage({ params }: { params: Params }) {
  const { lang, slug } = await read(params);
  const t = getDict(lang).news;
  const post = await fetchPost(slug, lang);
  if (!post) notFound();
  const related = await fetchRelatedPosts(post, 3, lang);

  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <LangAvailability languages={post.languages} />
        <Reveal as="article" className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-4 py-10 lg:gap-8 md:px-10 lg:py-[72px]">
          <p>
            <Link href={localePath(lang, "/news")} className="text-sm font-medium text-navy hover:underline">
              {t.back}
            </Link>
          </p>

          {post.cover_image && (
            <span className="relative block h-[240px] overflow-hidden rounded-xl lg:h-[440px]">
              <Image src={post.cover_image} alt={post.title} fill unoptimized sizes="(max-width: 880px) 100vw, 880px" className="object-cover" priority />
            </span>
          )}

          <div className="flex items-center gap-3 text-sm text-muted">
            {post.category && <span className="rounded-full bg-paper-3 px-3 py-1 font-medium text-navy">{post.category.name}</span>}
            {post.published_at && (
              <time dateTime={post.published_at} className="tabular-nums">
                {formatDateTime(post.published_at, lang)}
              </time>
            )}
          </div>

          <h1 className="font-display text-[30px] font-extrabold leading-tight text-ink lg:text-[42px]">{post.title}</h1>

          {post.body_html
            ? <div className="news-body text-[17px] text-ink" dangerouslySetInnerHTML={{ __html: post.body_html }} />
            : post.excerpt && <p className="text-[19px] leading-relaxed text-ink">{post.excerpt}</p>}

          {post.images.length > 0 && <Gallery images={post.images} />}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
            <LikeButton slug={post.slug} initialCount={post.likes_count} initialLiked={post.liked_by_me} />
            <ShareButtons url={`${SITE_URL}${localePath(lang, `/news/${slug}`)}`} title={post.title} />
          </div>

          <div className="flex flex-col gap-4 border-t border-line pt-6">
            <VisitorBar />
            <Comments slug={post.slug} initialCount={post.comments_count} />
          </div>

          <RelatedPosts posts={related} lang={lang} />
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
