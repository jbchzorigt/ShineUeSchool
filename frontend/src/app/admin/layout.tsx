import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { bodyClass, htmlClass } from "../fonts";
import "../globals.css";

export const metadata: Metadata = { title: "Удирдлага — Шинэ Үе сургууль" };

/* /admin-ийн root layout (нийтийн сайт `[lang]`, олимпиад тусдаа root layout-тай): монгол хэл, нэвтрэлтийн context. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={htmlClass}>
      <body className={bodyClass}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
