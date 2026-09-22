"use client";

/* Хуваарийн хэсгийн дэд цэс (табууд). Хуудас бүр өөрөө жилээ сонгоно (useYear). */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/timetable", label: "Тойм", exact: true },
  { href: "/admin/timetable/setup", label: "Тохиргоо" },
  { href: "/admin/timetable/grid", label: "Хуваарь" },
  { href: "/admin/timetable/curriculum", label: "Хөтөлбөр" },
  { href: "/admin/timetable/calendar", label: "Календарь" },
  { href: "/admin/timetable/import", label: "Excel импорт" },
];

export default function TimetableLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="space-y-6">
      <nav aria-label="Хуваарийн хэсгүүд" className="flex flex-wrap gap-1 border-b border-slate-200">
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
