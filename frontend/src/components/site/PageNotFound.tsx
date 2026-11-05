"use client";

/* Нийтийн сайтын ерөнхий 404-ийн агуулга (хэл нь LangProvider-оос). */

import { useDict, useLang } from "@/components/site/LangProvider";
import { NotFoundView } from "@/components/site/NotFoundView";
import { localePath } from "@/lib/i18n";

export function PageNotFound() {
  const t = useDict().common;
  const lang = useLang();
  return <NotFoundView title={t.notFoundTitle} text={t.notFoundText} note={t.notFoundNote} action={{ href: localePath(lang, "/"), label: t.backHome }} />;
}
