/* /survey — Судалгаа: агуулга удахгүй (орлуулагч хуудас; дээд цэсний "Бүртгэл" бүлгээс). */

import type { Metadata } from "next";
import { SiteFooter } from "@/components/home/SiteFooter";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = { title: "Судалгаа — Шинэ Үе сургууль", description: "Сургуулийн судалгаа, санал асуулга." };

export default function Page() {
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <Reveal as="section" className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-10 md:px-10 lg:px-24 lg:py-[72px]">
          <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Судалгаа</h1>
          <p className="max-w-[36em] text-[17px] text-muted lg:text-lg">Сургуулийн судалгаа, санал асуулга.</p>
          <p className="rounded-xl border border-line bg-white px-5 py-4 text-[15px] text-ink">Энэ хуудасны мэдээлэл удахгүй нэмэгдэнэ. Асуулт байвал <a href="mailto:info@shineue.edu.mn" className="font-semibold text-navy underline underline-offset-4">info@shineue.edu.mn</a> хаягаар холбогдоно уу.</p>
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
