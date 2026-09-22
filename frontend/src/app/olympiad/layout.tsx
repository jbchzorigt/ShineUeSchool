import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./olympiad.css";

export const metadata: Metadata = {
  title: "Ү.Маамын нэрэмжит математикийн олимпиад — Шинэ Үе сургууль",
  description: "Монгол Улсын Ардын багш Ү.Маамын нэрэмжит математикийн олимпиад: хуваарь, үр дүн, дурсамжийн албум.",
};

export default function OlympiadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
