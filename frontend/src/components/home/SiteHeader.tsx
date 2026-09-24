"use client";

/* Дээд цэс: зүүн лого · голд хуудасны холбоосууд · баруунд "Олимпиад" + оны Bauhaus хавтан (олимпиадын nav-year-тэй ижил
   buildYear). Том дэлгэцэд 3 баганат grid (1fr auto 1fr) тул цэс хуудасны яг голд байрлана. Утсан дээр hamburger товчоор нээгдэнэ. */

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_LINKS, OLYMPIAD_HREF } from "@/lib/home-data";
import { buildYear } from "@/lib/yearTiles";

const PAGE_LINKS = NAV_LINKS.filter((l) => l.href !== OLYMPIAD_HREF);
const OLYMPIAD = NAV_LINKS.find((l) => l.href === OLYMPIAD_HREF)!;

/** Оны хавтан (viewBox 1500×500, 3:1): client дээр buildYear-ээр дүүргэнэ; unmount-д цэвэрлэнэ (StrictMode давхардал). */
function YearTiles({ year, idPrefix, className }: { year: number; idPrefix: string; className: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    buildYear(svg, String(year), idPrefix);
    return () => { svg.innerHTML = ""; };
  }, [year, idPrefix]);
  return <svg ref={ref} viewBox="0 0 1500 500" className={`shrink-0 overflow-visible ${className}`} aria-hidden="true" />;
}

const isCurrent = (href: string, path: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function SiteHeader({ olympiadYear }: { olympiadYear: number }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  return (
    <header id="site-header" className="fixed inset-x-0 top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 md:px-10 lg:grid lg:h-20 lg:grid-cols-[1fr_auto_1fr] lg:px-24">
        <Link href="/" className="flex items-center lg:justify-self-start" aria-label="Шинэ Үе сургууль, нүүр хуудас">
          {/* Бүтэн лого (сүлд + ШИНЭ ҮЕ СУРГУУЛЬ): public/logo-full.png, 483×143 */}
          <Image src="/logo-full.png" alt="Шинэ Үе сургууль" width={483} height={143} priority className="h-10 w-auto lg:h-12" />
        </Link>

        {/* Голд: хуудасны холбоосууд */}
        <nav aria-label="Үндсэн цэс" className="hidden items-center gap-5 lg:flex lg:justify-self-center xl:gap-8">
          {PAGE_LINKS.map((l) => (
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

        {/* Баруунд: Олимпиад + оны хавтан */}
        <Link
          href={OLYMPIAD.href}
          aria-current={isCurrent(OLYMPIAD.href, path) ? "page" : undefined}
          aria-label={`${OLYMPIAD.label} ${olympiadYear}`}
          className="hidden items-center gap-2.5 whitespace-nowrap border-b-2 border-transparent py-2 text-[15px] font-medium text-ink hover:border-navy hover:text-navy aria-[current]:border-navy aria-[current]:text-navy lg:flex lg:justify-self-end xl:text-base"
        >
          {OLYMPIAD.label}
          <YearTiles year={olympiadYear} idPrefix="hdr" className="h-6 w-[72px]" />
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Цэс хаах" : "Цэс нээх"}
          className="grid h-11 w-11 place-items-center rounded-lg text-navy hover:bg-navy/10 lg:hidden"
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
          {PAGE_LINKS.map((l) => (
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
