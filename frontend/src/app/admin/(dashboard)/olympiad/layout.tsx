"use client";

/* Олимпиадын хэсгийн дэд цэс (табууд) — хичээлийн хуваарийн layout-тай ижил загвар. */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/olympiad/schedule", label: "Хуваарь" },
  { href: "/admin/olympiad/results", label: "Үр дүн", exact: true },
  { href: "/admin/olympiad/results/import", label: "Excel импорт" },
  { href: "/admin/olympiad/album", label: "Албум" },
  { href: "/admin/olympiad/settings", label: "Хуудасны тохиргоо" },
];

export default function OlympiadLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="space-y-6">
      <nav aria-label="Олимпиадын хэсгүүд" className="flex flex-wrap gap-1 border-b border-slate-200">
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
