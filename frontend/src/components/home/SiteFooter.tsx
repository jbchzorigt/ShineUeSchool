"use client";

/* Хөл хэсэг: нэр + брэнд icon-той холбоосууд (Google Maps, Gmail, Facebook — хаяг өгөгдсөн бол) + хуудсуудын холбоос
   (хэлээр; англи хувилбаргүй хуудсууд англи хөлд байхгүй — home-data FOOTER_LINKS). */

import Link from "next/link";
import { useDict, useLang } from "@/components/site/LangProvider";
import { localePath } from "@/lib/i18n";
import { BrandIcon, type Brand } from "@/components/site/BrandIcon";
import { CONTACT, FOOTER_LINKS, OLYMPIAD_HREF } from "@/lib/home-data";

export function SiteFooter() {
  const lang = useLang();
  const t = useDict().footer;
  const social: { brand: Brand; href: string; label: string; external?: boolean }[] = [
    { brand: "google-maps", href: CONTACT.mapUrl, label: t.maps, external: true },
    { brand: "gmail", href: `mailto:${CONTACT.email}`, label: t.emailUs },
    ...(CONTACT.facebookUrl ? [{ brand: "facebook" as const, href: CONTACT.facebookUrl, label: t.facebook, external: true }] : []),
  ];
  return (
    <footer className="mt-auto bg-navy text-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-7 lg:min-h-[120px] lg:flex-row lg:items-center lg:justify-between md:px-10 lg:px-24 lg:py-9">
        <div className="flex items-center gap-5">
          <span className="font-display text-xl font-extrabold lg:text-[22px]">{t.name}</span>
          <ul aria-label={t.social} className="flex items-center gap-2">
            {social.map((s) => (
              <li key={s.brand}>
                <a href={s.href} {...(s.external ? { target: "_blank", rel: "noopener" } : {})} aria-label={s.label} title={s.label}
                   className="grid h-9 w-9 place-items-center rounded-full bg-white transition hover:scale-110">
                  <BrandIcon name={s.brand} size={20} />
                </a>
              </li>
            ))}
          </ul>
        </div>
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
