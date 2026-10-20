"use client";

/* Нийтийн сайтын 404 (хэлээр): notFound() эсвэл олдохгүй зам. Header/footer нь (site) layout-аас. */

import Link from "next/link";
import { useDict, useLang } from "@/components/site/LangProvider";
import { localePath } from "@/lib/i18n";

export default function NotFound() {
  const t = useDict();
  const lang = useLang();
  return (
    <main className="paper-grid flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="font-display text-6xl font-extrabold text-navy">404</p>
      <h1 className="font-display text-2xl font-extrabold text-ink lg:text-3xl">{t.common.notFoundTitle}</h1>
      <p className="max-w-md text-muted">{t.common.notFoundText}</p>
      <Link href={localePath(lang, "/")} className="mt-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90">
        {t.common.backHome}
      </Link>
    </main>
  );
}
