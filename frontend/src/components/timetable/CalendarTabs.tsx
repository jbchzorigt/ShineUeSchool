"use client";

/* Календарийн хуудасны дэд таб: Академик календарь (/calendar) · Хичээлийн хуваарь (/calendar/timetable). */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/calendar", label: "Академик календарь", exact: true },
  { href: "/calendar/timetable", label: "Хичээлийн хуваарь" },
];

export function CalendarTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Календарийн хэсгүүд" className="flex flex-wrap gap-2 border-b border-line">
      {TABS.map((t) => {
        const active = t.exact ? path === t.href : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
                className={`-mb-px border-b-2 px-4 py-2.5 text-base font-semibold transition ${active ? "border-navy text-navy" : "border-transparent text-muted hover:text-navy"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
