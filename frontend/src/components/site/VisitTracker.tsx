"use client";

/* Сайтын хандалт тоологч: нийтийн хуудас нээгдэх (эсвэл клиент дээр шилжих) бүрт POST /api/analytics/view/ {path, visitor}.
   visitor — хөтчийн localStorage дахь санамсаргүй нэргүй ID (IP, хувийн мэдээлэл илгээхгүй). "Do Not Track" асаалттай бол илгээхгүй.
   Робот, давтан ачаалалтыг backend шүүнэ. Алдааг чимээгүй алгасна (хуудсанд нөлөөлөхгүй). */

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";   // admin-ийн lib/api-г нийтийн bundle-д оруулахгүй
const KEY = "shineue.visitor";

function visitorId(): string | null {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;   // хувийн горим, хадгалалт хаагдсан г.м.
  }
}

export function VisitTracker() {
  const pathname = usePathname();   // зөвхөн шилжилтийг мэдэхэд; бодит URL-ийг window.location-оос (дотоод /mn угтвар биш)
  useEffect(() => {
    if (navigator.doNotTrack === "1") return;
    const visitor = visitorId();
    if (!visitor) return;
    fetch(`${API_URL}/api/analytics/view/`, {
      method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname, visitor }),
    }).catch(() => {});
  }, [pathname]);
  return null;
}
