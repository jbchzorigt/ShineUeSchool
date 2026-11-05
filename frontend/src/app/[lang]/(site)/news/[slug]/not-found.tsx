"use client";

/* /news/[slug] дуудлагад тохирох мэдээ олдоогүй (эсвэл ноорог/ирээдүйн, эсвэл тухайн хэлгүй) үед харагдана. Хэл — LangProvider-оос. */

import { SiteFooter } from "@/components/home/SiteFooter";
import { useDict, useLang } from "@/components/site/LangProvider";
import { NotFoundView } from "@/components/site/NotFoundView";
import { localePath } from "@/lib/i18n";

export default function NewsPostNotFound() {
  const dict = useDict();
  const t = dict.news;
  const lang = useLang();
  return (
    <>
      <NotFoundView title={t.notFoundTitle} text={t.notFoundText} note={dict.common.notFoundNote} action={{ href: localePath(lang, "/news"), label: t.backToAll }} />
      <SiteFooter />
    </>
  );
}
