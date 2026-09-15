import Link from "next/link";

/* Түр нүүр хуудас. Маам багшийн хуудсыг Next.js руу шилжүүлэхэд энд орно. */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-navy text-2xl font-black text-gold">ШҮ</span>
      <h1 className="text-3xl font-black text-navy">Шинэ Үе сургууль</h1>
      <p className="max-w-md text-slate-600">Вэб сайт хөгжүүлэлтийн шатанд байна. Маам багшийн хуудсыг удахгүй энд шилжүүлнэ.</p>
      <Link href="/admin" className="rounded-full bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy/90">Удирдлагын самбар →</Link>
    </main>
  );
}
