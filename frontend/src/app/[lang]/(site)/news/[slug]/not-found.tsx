/* /news/[slug] дуудлагад тохирох мэдээ олдоогүй (эсвэл ноорог/ирээдүйн) үед харагдана. */

import Link from "next/link";
import { SiteFooter } from "@/components/home/SiteFooter";

export default function NewsPostNotFound() {
  return (
    <>
      <main className="paper-grid flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="font-display text-[28px] font-extrabold text-navy lg:text-[36px]">Мэдээ олдсонгүй</h1>
        <p className="max-w-md text-muted">Хайж буй мэдээ устсан, эсвэл хаяг буруу байна.</p>
        <Link href="/news" className="inline-flex items-center rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90">
          Бүх мэдээ рүү буцах
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
