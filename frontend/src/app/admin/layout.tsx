import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = { title: "Удирдлага — Шинэ Үе сургууль" };

/* /admin доорх бүх хуудас нэвтрэлтийн context-той байна. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
