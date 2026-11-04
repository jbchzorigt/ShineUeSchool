"use client";

/* Дээд цэс: ГОЛД лого; зүүн талд эхний хагас холбоосууд, баруун талд үлдсэн нь + (монгол дээр) "Олимпиад" + оны Bauhaus хавтан
   (олимпиадын nav-year-тэй ижил buildYear) + MN | EN хэл солих товч. Монгол: Нүүр · Бидний тухай · Мэдээ | лого | Календарь ·
   "Бүртгэл" drop-down (Дугуйлан, Судалгаа, Элсэлт — hover/фокус/дарахад нээгдэнэ, Esc хаана) · Олимпиад. Англи: Home · About · News |
   лого | Programs · Admission · Contact (lib/home-data.ts NAV_LINKS). Холбоосууд localePath-аар хэлтэй. Том дэлгэцэд 3 баганат grid
   (1fr auto 1fr) тул лого яг голд. Утсан дээр зүүнд хэл солих товч, голд лого, баруунд hamburger. */

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useDict, useLang } from "@/components/site/LangProvider";
import { LangSwitch } from "@/components/site/LangSwitch";
import { localePath, stripLang } from "@/lib/i18n";
import { NAV_LINKS, OLYMPIAD_HREF, type NavItem, type NavLink } from "@/lib/home-data";
import { YearTiles } from "./YearTiles";

const isGroup = (i: NavItem): i is { label: string; children: NavLink[] } => "children" in i;
/** Идэвхтэй холбоос: хэлгүй замаар харьцуулна; анкор (/#programs) хэзээ ч идэвхтэй биш. */
const isCurrent = (href: string, path: string) => !href.includes("#") && (href === "/" ? path === "/" : path.startsWith(href));
const LINK = "whitespace-nowrap border-b-2 border-transparent py-2 text-[15px] font-medium text-ink hover:border-navy hover:text-navy aria-[current]:border-navy aria-[current]:text-navy xl:text-base";

export function SiteHeader({ olympiadYear }: { olympiadYear: number }) {
  const lang = useLang();
  const t = useDict().nav;
  const [open, setOpen] = useState(false);
  const path = stripLang(usePathname()).path;
  const [menu, setMenu] = useState<string | null>(null);   // нээлттэй drop-down бүлгийн нэр
  const links = NAV_LINKS[lang];
  const mid = Math.ceil(links.length / 2);
  const showOlympiad = lang === "mn";
  const href = (h: string) => localePath(lang, h);

  const renderItem = (l: NavItem) => isGroup(l) ? (
    <div key={l.label} className="group relative" onMouseEnter={() => setMenu(l.label)} onMouseLeave={() => setMenu(null)}
         onKeyDown={(e) => { if (e.key === "Escape") setMenu(null); }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu === l.label}
        aria-current={l.children.some((c) => isCurrent(c.href, path)) ? "page" : undefined}
        onClick={() => setMenu(menu === l.label ? null : l.label)}
        className={`flex items-center gap-1 aria-expanded:text-navy ${LINK}`}
      >
        {l.label}
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="transition group-aria-expanded:rotate-180"><path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {/* Drop-down: hover (group-hover) эсвэл товчоор нээгдэнэ; хуудасны бусад хэсэг рүү шилжихэд хаагдана */}
      <div className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 ${menu === l.label ? "block" : "hidden group-hover:block"}`}>
        <ul role="menu" className="min-w-[180px] overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-lg shadow-navy/10">
          {l.children.map((c) => (
            <li key={c.href} role="none">
              <Link role="menuitem" href={href(c.href)} onClick={() => setMenu(null)} aria-current={isCurrent(c.href, path) ? "page" : undefined}
                    className="block px-4 py-2 text-[15px] font-medium text-ink hover:bg-paper-2 hover:text-navy aria-[current]:text-navy">
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  ) : (
    <Link key={l.href} href={href(l.href)} aria-current={isCurrent(l.href, path) ? "page" : undefined} className={LINK}>
      {l.label}
    </Link>
  );

  return (
    <header id="site-header" className="fixed inset-x-0 top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-x-4 px-4 md:px-10 lg:h-20 lg:gap-x-10 lg:px-16 xl:gap-x-14 xl:px-24">
        {/* Утсанд зүүн багана: хэл солих товч (лого голдоо) */}
        <LangSwitch className="justify-self-start lg:hidden" />
        {/* Зүүн цэс (логоны зүүн тал) */}
        <nav aria-label={t.left} className="hidden items-center gap-5 lg:flex lg:justify-self-end xl:gap-8">
          {links.slice(0, mid).map(renderItem)}
        </nav>

        {/* Голд: лого */}
        <Link href={href("/")} className="flex items-center lg:justify-self-center" aria-label={t.logo}>
          {/* Бүтэн лого (сүлд + ШИНЭ ҮЕ СУРГУУЛЬ): public/logo-full.png, 483×143 */}
          <Image src="/logo-full.png" alt={t.logoAlt} width={483} height={143} priority className="h-10 w-auto lg:h-12" />
        </Link>

        {/* Баруун цэс (логоны баруун тал) + Олимпиад, оны хавтан (монгол) + хэл солих товч */}
        <nav aria-label={t.right} className="hidden items-center gap-5 lg:flex lg:justify-self-start xl:gap-8">
          {links.slice(mid).map(renderItem)}
          {showOlympiad && (
            <Link href={OLYMPIAD_HREF} aria-current={isCurrent(OLYMPIAD_HREF, path) ? "page" : undefined} aria-label={`${t.olympiad} ${olympiadYear}`}
                  className={`flex items-center gap-2.5 ${LINK}`}>
              {t.olympiad}
              <YearTiles year={olympiadYear} idPrefix="hdr" className="h-6 w-[72px]" />
            </Link>
          )}
          <LangSwitch />
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? t.close : t.open}
          className="grid h-11 w-11 place-items-center justify-self-end rounded-lg text-navy hover:bg-navy/10 lg:hidden"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            {open ? (
              <path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label={t.main} className="flex flex-col border-t border-line bg-white px-4 py-2 lg:hidden">
          {links.map((l) => isGroup(l) ? (
            <div key={l.label} className="border-b border-line py-3">
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted">{l.label}</span>
              {l.children.map((c) => (
                <Link key={c.href} href={href(c.href)} onClick={() => setOpen(false)} className="block py-2 pl-3 text-base font-medium text-ink">{c.label}</Link>
              ))}
            </div>
          ) : (
            <Link key={l.href} href={href(l.href)} onClick={() => setOpen(false)} className="border-b border-line py-3 text-base font-medium text-ink">
              {l.label}
            </Link>
          ))}
          {showOlympiad && (
            <Link href={OLYMPIAD_HREF} onClick={() => setOpen(false)} aria-label={`${t.olympiad} ${olympiadYear}`} className="flex items-center gap-3 py-3 text-base font-medium text-ink">
              {t.olympiad}
              <YearTiles year={olympiadYear} idPrefix="mnav" className="h-6 w-[72px]" />
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
