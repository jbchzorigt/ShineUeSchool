"use client";

/* Дээд цэс: ГОЛД лого; зүүн талд эхний хагас холбоосууд (Нүүр · Бидний тухай · Мэдээ), баруун талд үлдсэн нь (Календарь ·
   "Бүртгэл" drop-down → Дугуйлан, Судалгаа, Элсэлт — hover/фокус/дарахад нээгдэнэ, Esc хаана) + "Олимпиад" + оны Bauhaus хавтан
   (олимпиадын nav-year-тэй ижил buildYear). Том дэлгэцэд 3 баганат grid (1fr auto 1fr) тул лого яг голд. Утсан дээр лого голд,
   баруунд hamburger товчоор цэс нээгдэнэ. */

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { YearTiles } from "./YearTiles";
import { NAV_LINKS, OLYMPIAD_HREF, type NavItem, type NavLink } from "@/lib/home-data";

const isGroup = (i: NavItem): i is { label: string; children: NavLink[] } => "children" in i;
const PAGE_LINKS = NAV_LINKS.filter((l) => isGroup(l) || l.href !== OLYMPIAD_HREF);
const MID = Math.ceil(PAGE_LINKS.length / 2);
const LEFT_LINKS = PAGE_LINKS.slice(0, MID), RIGHT_LINKS = PAGE_LINKS.slice(MID);   // логоны зүүн / баруун тал
const OLYMPIAD = NAV_LINKS.find((l): l is NavLink => !isGroup(l) && l.href === OLYMPIAD_HREF)!;

const isCurrent = (href: string, path: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function SiteHeader({ olympiadYear }: { olympiadYear: number }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const [menu, setMenu] = useState<string | null>(null);   // нээлттэй drop-down бүлгийн нэр

  return (
    <header id="site-header" className="fixed inset-x-0 top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-x-4 px-4 md:px-10 lg:h-20 lg:gap-x-10 lg:px-16 xl:gap-x-14 xl:px-24">
        <span className="lg:hidden" aria-hidden="true" />   {/* утсанд зүүн багана хоосон → лого голд */}
        {/* Зүүн цэс (логоны зүүн тал) */}
        <nav aria-label="Үндсэн цэс, зүүн" className="hidden items-center gap-5 lg:flex lg:justify-self-end xl:gap-8">
          {LEFT_LINKS.map((l) => isGroup(l) ? (
            <div key={l.label} className="group relative" onMouseEnter={() => setMenu(l.label)} onMouseLeave={() => setMenu(null)}
                 onKeyDown={(e) => { if (e.key === "Escape") setMenu(null); }}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menu === l.label}
                aria-current={l.children.some((c) => isCurrent(c.href, path)) ? "page" : undefined}
                onClick={() => setMenu(menu === l.label ? null : l.label)}
                className="flex items-center gap-1 whitespace-nowrap border-b-2 border-transparent py-2 text-[15px] font-medium text-ink hover:border-navy hover:text-navy aria-[current]:border-navy aria-[current]:text-navy aria-expanded:text-navy xl:text-base"
              >
                {l.label}
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="transition group-aria-expanded:rotate-180"><path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {/* Drop-down: hover (group-hover) эсвэл товчоор нээгдэнэ; хуудасны бусад хэсэг рүү шилжихэд хаагдана */}
              <div className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 ${menu === l.label ? "block" : "hidden group-hover:block"}`}>
                <ul role="menu" className="min-w-[180px] overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-lg shadow-navy/10">
                  {l.children.map((c) => (
                    <li key={c.href} role="none">
                      <Link role="menuitem" href={c.href} onClick={() => setMenu(null)} aria-current={isCurrent(c.href, path) ? "page" : undefined}
                            className="block px-4 py-2 text-[15px] font-medium text-ink hover:bg-paper-2 hover:text-navy aria-[current]:text-navy">
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isCurrent(l.href, path) ? "page" : undefined}
              className="whitespace-nowrap border-b-2 border-transparent py-2 text-[15px] font-medium text-ink hover:border-navy hover:text-navy aria-[current]:border-navy aria-[current]:text-navy xl:text-base"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Голд: лого */}
        <Link href="/" className="flex items-center lg:justify-self-center" aria-label="Шинэ Үе сургууль, нүүр хуудас">
          {/* Бүтэн лого (сүлд + ШИНЭ ҮЕ СУРГУУЛЬ): public/logo-full.png, 483×143 */}
          <Image src="/logo-full.png" alt="Шинэ Үе сургууль" width={483} height={143} priority className="h-10 w-auto lg:h-12" />
        </Link>

        {/* Баруун цэс (логоны баруун тал) + Олимпиад, оны хавтан */}
        <nav aria-label="Үндсэн цэс, баруун" className="hidden items-center gap-5 lg:flex lg:justify-self-start xl:gap-8">
          {RIGHT_LINKS.map((l) => isGroup(l) ? (
            <div key={l.label} className="group relative" onMouseEnter={() => setMenu(l.label)} onMouseLeave={() => setMenu(null)}
                 onKeyDown={(e) => { if (e.key === "Escape") setMenu(null); }}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menu === l.label}
                aria-current={l.children.some((c) => isCurrent(c.href, path)) ? "page" : undefined}
                onClick={() => setMenu(menu === l.label ? null : l.label)}
                className="flex items-center gap-1 whitespace-nowrap border-b-2 border-transparent py-2 text-[15px] font-medium text-ink hover:border-navy hover:text-navy aria-[current]:border-navy aria-[current]:text-navy aria-expanded:text-navy xl:text-base"
              >
                {l.label}
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="transition group-aria-expanded:rotate-180"><path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {/* Drop-down: hover (group-hover) эсвэл товчоор нээгдэнэ; хуудасны бусад хэсэг рүү шилжихэд хаагдана */}
              <div className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 ${menu === l.label ? "block" : "hidden group-hover:block"}`}>
                <ul role="menu" className="min-w-[180px] overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-lg shadow-navy/10">
                  {l.children.map((c) => (
                    <li key={c.href} role="none">
                      <Link role="menuitem" href={c.href} onClick={() => setMenu(null)} aria-current={isCurrent(c.href, path) ? "page" : undefined}
                            className="block px-4 py-2 text-[15px] font-medium text-ink hover:bg-paper-2 hover:text-navy aria-[current]:text-navy">
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isCurrent(l.href, path) ? "page" : undefined}
              className="whitespace-nowrap border-b-2 border-transparent py-2 text-[15px] font-medium text-ink hover:border-navy hover:text-navy aria-[current]:border-navy aria-[current]:text-navy xl:text-base"
            >
              {l.label}
            </Link>
          ))}
        <Link
          href={OLYMPIAD.href}
          aria-current={isCurrent(OLYMPIAD.href, path) ? "page" : undefined}
          aria-label={`${OLYMPIAD.label} ${olympiadYear}`}
          className="flex items-center gap-2.5 whitespace-nowrap border-b-2 border-transparent py-2 text-[15px] font-medium text-ink hover:border-navy hover:text-navy aria-[current]:border-navy aria-[current]:text-navy xl:text-base"
        >
          {OLYMPIAD.label}
          <YearTiles year={olympiadYear} idPrefix="hdr" className="h-6 w-[72px]" />
        </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Цэс хаах" : "Цэс нээх"}
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
        <nav id="mobile-nav" aria-label="Үндсэн цэс" className="flex flex-col border-t border-line bg-white px-4 py-2 lg:hidden">
          {PAGE_LINKS.map((l) => isGroup(l) ? (
            <div key={l.label} className="border-b border-line py-3">
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted">{l.label}</span>
              {l.children.map((c) => (
                <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className="block py-2 pl-3 text-base font-medium text-ink">{c.label}</Link>
              ))}
            </div>
          ) : (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-line py-3 text-base font-medium text-ink">
              {l.label}
            </Link>
          ))}
          <Link href={OLYMPIAD.href} onClick={() => setOpen(false)} aria-label={`${OLYMPIAD.label} ${olympiadYear}`} className="flex items-center gap-3 py-3 text-base font-medium text-ink">
            {OLYMPIAD.label}
            <YearTiles year={olympiadYear} idPrefix="mnav" className="h-6 w-[72px]" />
          </Link>
        </nav>
      )}
    </header>
  );
}
