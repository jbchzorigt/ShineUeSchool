/* Админы нүүрний тоон үзүүлэлтийн карт: icon, нэр, том тоо, доор нь тайлбар. href өгвөл бүхэлдээ холбоос. */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";

export function Kpi({ icon: Icon, label, value, sub, href, accent = "#1e3a8f" }: {
  icon: LucideIcon; label: string; value: ReactNode; sub?: ReactNode; href?: string; accent?: string;
}) {
  const body = (
    <Card className={href ? "h-full transition hover:-translate-y-0.5 hover:shadow-md" : "h-full"}>
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${accent}14`, color: accent }}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="text-sm font-semibold text-slate-600">{label}</span>
      </div>
      <div className="mt-3 text-3xl font-black tabular-nums text-navy">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </Card>
  );
  return href ? <Link href={href} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy">{body}</Link> : body;
}
