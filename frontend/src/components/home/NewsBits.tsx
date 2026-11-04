/* Мэдээний картын жижиг хэсгүүд: зураг (эсвэл орлуулагч), лайкын тоо. */

import Image from "next/image";
import { getDict, type Lang } from "@/lib/i18n";

export function NewsImage({ src, className = "", lang = "mn" }: { src: string | null; className?: string; lang?: Lang }) {
  if (src) {
    return (
      <span className={`relative block overflow-hidden ${className}`}>
        <Image src={src} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
      </span>
    );
  }
  return (
    <span role="img" aria-label={getDict(lang).news.imageAria} className={`grid place-items-center bg-paper-3 text-sm text-muted ${className}`}>
      {getDict(lang).news.imagePlaceholder}
    </span>
  );
}

export function LikeCount({ n, lang = "mn" }: { n: number; lang?: Lang }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted tabular-nums lg:text-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="none" stroke="#1e3a8f" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">{getDict(lang).news.liked}</span>
      {n}
    </span>
  );
}
