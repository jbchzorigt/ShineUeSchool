/* Админы нүүр: мэдээний сүүлийн 5 сэтгэгдэл (нуугдсан нь тэмдэгтэй). Мэдээ рүү шинэ цонхонд, бүгдийг — сэтгэгдлийн хуудас руу. */

import Link from "next/link";
import type { DashboardComment } from "@/lib/types";
import { timeAgo } from "@/lib/time-ago";
import { Badge, Card } from "@/components/ui";

export function RecentComments({ comments }: { comments: DashboardComment[] }) {
  return (
    <Card className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-bold text-navy">Сүүлийн сэтгэгдлүүд</h2>
        <Link href="/admin/news/comments" className="text-sm font-semibold text-navy hover:underline">Бүгдийг харах</Link>
      </div>
      {comments.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Сэтгэгдэл хараахан ирээгүй байна.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy/10 text-xs font-bold text-navy" aria-hidden>
                {c.author_name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="min-w-0 font-semibold text-slate-800 [overflow-wrap:anywhere]">{c.author_name}</span>
                  <time dateTime={c.created_at} className="text-xs text-slate-400">{timeAgo(c.created_at)}</time>
                  {c.is_hidden && <Badge tone="slate">Нуугдсан</Badge>}
                </div>
                <p className={`mt-0.5 line-clamp-2 text-sm [overflow-wrap:anywhere] ${c.is_hidden ? "text-slate-400" : "text-slate-700"}`}>{c.body}</p>
                <a href={`/news/${c.post_slug}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block max-w-full truncate text-xs font-semibold text-navy/80 hover:underline">
                  {c.post_title} ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
