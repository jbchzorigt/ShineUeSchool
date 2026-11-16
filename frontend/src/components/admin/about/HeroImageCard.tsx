"use client";

/* /admin/about — танилцуулгын hero (бүтэн өргөнтэй дэвсгэр) зураг: сонгомогц хадгална, солих, устгах.
   Урьдчилан харах нь нийтийн хуудастай ижил: зураг дээр navy бүдэг давхарга + гарчиг. */

import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button, Card } from "@/components/ui";

export function HeroImageCard({ url, title, onChange }: { url: string | null; title: string; onChange: (url: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState("");

  async function run(kind: "upload" | "remove", call: () => Promise<{ hero_image?: string | null }>) {
    setBusy(kind); setError("");
    try { onChange((await call()).hero_image ?? null); }
    catch (err) { setError(err instanceof ApiError ? (err.fieldErrors.image ?? err.message) : "Хадгалж чадсангүй."); }
    finally { setBusy(null); }
  }

  function pick(file: File | undefined) {
    if (input.current) input.current.value = "";   // ижил файлыг дахин сонгож болохоор
    if (file) void run("upload", () => api.about.page.setHero(file));
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-bold text-navy">Hero зураг</h2>
        <p className="text-sm text-slate-600">Хуудасны дээд хэсгийн бүтэн өргөнтэй дэвсгэр. Текст уншигдахуйц байхаар зураг дээр цэнхэр бүдэг давхарга тавигдана. Хэвтээ, 1920px-ээс өргөн зураг тохиромжтой.</p>
      </div>
      <div className="relative isolate flex aspect-[16/6] items-end overflow-hidden rounded-xl bg-navy">
        {url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- админы урьдчилан харах, backend media URL */}
            <img src={url} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-navy/35" aria-hidden />   {/* нийтийн IntroSection-той ижил давхарга */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/55 to-transparent" aria-hidden />
          </>
        )}
        <p className="p-4 font-display text-lg font-extrabold text-white sm:p-6 sm:text-2xl">{title || "Гарчиг"}</p>
        {!url && <span className="absolute right-4 top-4 text-xs text-white/60">Зураггүй — цэнхэр дэвсгэр</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Hero зураг сонгох" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <Button type="button" variant="secondary" mutates disabled={busy !== null} onClick={() => input.current?.click()}>
          {busy === "upload" ? "Оруулж байна…" : url ? "Зураг солих" : "Зураг оруулах"}
        </Button>
        {url && (
          <Button type="button" variant="ghost" mutates disabled={busy !== null} className="text-red-600 hover:bg-red-50"
            onClick={() => { if (confirm("Hero зургийг устгах уу?")) void run("remove", () => api.about.page.removeHero()); }}>
            {busy === "remove" ? "Устгаж байна…" : "Устгах"}
          </Button>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </Card>
  );
}
