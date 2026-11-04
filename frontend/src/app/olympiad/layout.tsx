import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import { bodyClass, htmlClass } from "../fonts";
import "../globals.css";
import "./olympiad.css";

export const metadata: Metadata = {
  title: "Ү.Маамын нэрэмжит математикийн олимпиад — Шинэ Үе сургууль",
  description: "Монгол Улсын Ардын багш Ү.Маамын нэрэмжит математикийн олимпиад: хуваарь, үр дүн, дурсамжийн албум.",
};

/* /olympiad-ийн root layout (зөвхөн монгол; нийтийн сайт `[lang]`, админ тусдаа root layout-тай). */
export default function OlympiadLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={htmlClass}>
      <body className={bodyClass}>{children}</body>
    </html>
  );
}
