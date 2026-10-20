"use client";

/* Хөл хэсэг: нэр + хуудсуудын холбоос (хэлээр; англи хувилбаргүй хуудсууд англи хөлд байхгүй — home-data FOOTER_LINKS). */

import Link from "next/link";
import { useDict, useLang } from "@/components/site/LangProvider";
import { localePath } from "@/lib/i18n";
import { FOOTER_LINKS, OLYMPIAD_HREF } from "@/lib/home-data";

export function SiteFooter() {
  const lang = useLang();
  const t = useDict().footer;
  return (
    <footer className="mt-auto bg-navy text-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-7 lg:min-h-[120px] lg:flex-row lg:items-center lg:justify-between md:px-10 lg:px-24 lg:py-9">
        <span className="font-display text-xl font-extrabold lg:text-[22px]">{t.name}</span>
        <nav aria-label={t.pages} className="flex flex-wrap gap-x-7 gap-y-2">
          {FOOTER_LINKS[lang].map((l) => (
            <Link key={l.href} href={l.href === OLYMPIAD_HREF ? l.href : localePath(lang, l.href)} className="text-[15px] text-white hover:underline hover:underline-offset-4">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
