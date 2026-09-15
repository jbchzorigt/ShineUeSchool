"use client";

/* Дашбоардын нүүр: тоон үзүүлэлт + хурдан холбоосууд */

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Stats } from "@/lib/types";
import { Card, Spinner } from "@/components/ui";

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { api.stats().then(setStats).catch(() => setError("Статистик ачаалж чадсангүй.")); }, []);

  const tiles = stats ? [
    { label: "Олимпиадын шат", value: stats.stages, href: "/admin/schedule" },
    { label: "Үр дүнгийн мөр", value: stats.results, href: "/admin/results" },
    { label: "Албумын зураг", value: stats.photos, href: "#" },
    { label: "Сүүлийн олимпиад", value: stats.latest_year ?? "—", href: "/admin/schedule" },
  ] : [];

  const max = Math.max(1, ...(stats?.results_by_year.map((r) => r.count) ?? [1]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-navy">Нүүр</h1>
        <p className="text-sm text-slate-600">Ү.Маамын нэрэмжит математикийн олимпиадын өгөгдлийн тойм.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!stats && !error && <Spinner />}

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {tiles.map((t) => (
              <Link key={t.label} href={t.href}>
                <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.label}</div>
                  <div className="mt-2 text-3xl font-black text-navy">{t.value}</div>
                </Card>
              </Link>
            ))}
          </div>

          <Card>
            <h2 className="mb-4 font-bold text-navy">Оноор үр дүнгийн тоо</h2>
            <div className="space-y-3">
              {stats.results_by_year.map((r) => (
                <div key={r.year} className="flex items-center gap-3 text-sm">
                  <span className="w-12 font-semibold text-slate-700">{r.year}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${(r.count / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-semibold text-navy">{r.count}</span>
                </div>
              ))}
              {stats.results_by_year.length === 0 && <p className="text-sm text-slate-500">Үр дүн ороогүй байна.</p>}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h2 className="font-bold text-navy">Хуваарь оруулах</h2>
              <p className="mt-1 text-sm text-slate-600">Он сонгоод шатуудыг нэмэх, засах, устгах.</p>
              <Link href="/admin/schedule" className="mt-3 inline-block text-sm font-semibold text-navy hover:underline">Хуваарь руу →</Link>
            </Card>
            <Card>
              <h2 className="font-bold text-navy">Үр дүн оруулах</h2>
              <p className="mt-1 text-sm text-slate-600">Он, анги сонгоод сурагчдын оноог оруулах. Байр автоматаар тооцогдоно.</p>
              <Link href="/admin/results" className="mt-3 inline-block text-sm font-semibold text-navy hover:underline">Үр дүн рүү →</Link>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
