"use client";

/* Бидний тухай хэсгийн дэд цэс (табууд) — олимпиадын layout-тай ижил загвар. */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/about", label: "Танилцуулга", exact: true },
  { href: "/admin/about/leaders", label: "Удирдлага" },
  { href: "/admin/about/departments", label: "Тэнхим" },
];

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="space-y-6">
      <nav aria-label="Бидний тухай хэсгүүд" className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const active = t.exact ? path === t.href : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${active ? "border-navy text-navy" : "border-transparent text-slate-600 hover:text-navy"}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
