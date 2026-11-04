"use client";

/* /news/[slug] дуудлагад тохирох мэдээ олдоогүй (эсвэл ноорог/ирээдүйн, эсвэл тухайн хэлгүй) үед харагдана. Хэл — LangProvider-оос. */

import Link from "next/link";
import { SiteFooter } from "@/components/home/SiteFooter";
import { useDict, useLang } from "@/components/site/LangProvider";
import { localePath } from "@/lib/i18n";

export default function NewsPostNotFound() {
  const t = useDict().news;
  const lang = useLang();
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="font-display text-[28px] font-extrabold text-navy lg:text-[36px]">{t.notFoundTitle}</h1>
        <p className="max-w-md text-muted">{t.notFoundText}</p>
        <Link href={localePath(lang, "/news")} className="inline-flex items-center rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90">
          {t.backToAll}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
