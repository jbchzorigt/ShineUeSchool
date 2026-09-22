"use client";

/* Дээд цэс: лого + холбоосууд. Утсан дээр hamburger товчоор нээгдэнэ. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_LINKS } from "@/lib/home-data";
import { Logo } from "./Logo";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  return (
    <header id="site-header" className="fixed inset-x-0 top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 lg:h-20 md:px-10 lg:px-24">
        <Link href="/" className="flex items-center gap-3 text-ink" aria-label="Шинэ Үе сургууль, нүүр хуудас">
          <Logo className="h-9 w-9 lg:h-10 lg:w-10" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-extrabold text-navy lg:text-xl">Шинэ Үе</span>
            <span className="hidden text-xs text-muted lg:block">сургууль</span>
          </span>
        </Link>

        <nav aria-label="Үндсэн цэс" className="hidden items-center gap-5 lg:flex xl:gap-8">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={(l.href === "/" ? path === "/" : l.href.startsWith("/#") ? false : path.startsWith(l.href)) ? "page" : undefined}
              className="whitespace-nowrap border-b-2 border-transparent py-2 text-[15px] font-medium text-ink hover:border-navy hover:text-navy aria-[current]:border-navy aria-[current]:text-navy xl:text-base"
            >
              {l.label}
            </Link>
          ))}
        </nav>

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
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-line py-3 text-base font-medium text-ink last:border-b-0">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
