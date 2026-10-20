import type { Metadata } from "next";
import { ClubsPage } from "@/components/clubs/ClubsPage";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { fetchClubs } from "@/lib/clubs-api";

export const metadata: Metadata = {
  title: "Дугуйлан — Шинэ Үе сургууль",
  description: "Шинэ Үе сургуулийн 1–12-р ангийн дугуйлангууд ба бүртгэл.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const sp = await searchParams;
  const g = Number(sp.grade);
  const initialGrade = Number.isInteger(g) && g >= 1 && g <= 12 ? g : null;
  const data = await fetchClubs();
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <Reveal as="section" className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 md:px-10 lg:px-24 lg:py-[72px]">
          <div>
            <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Дугуйлан</h1>
            <p className="mt-2 max-w-2xl text-base text-muted">Ангиа сонгоод дугуйлангуудыг үзнэ үү. Бүртгүүлэхэд сурагчийн @shineue.edu.mn имэйл шаардлагатай; нэг сурагч нэг ээлжид нэг л дугуйланд бүртгүүлнэ.</p>
          </div>
          <ClubsPage data={data} initialGrade={initialGrade} />
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
