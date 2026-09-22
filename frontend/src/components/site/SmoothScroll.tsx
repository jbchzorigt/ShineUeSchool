"use client";

/* Олон нийтийн хуудсуудын ScrollSmoother. (site)/layout-д ХАМГИЙН ЭХНИЙ хүүхэд болгож байрлуулна: React хүүхдийн
   layout effect эцгийнхээс өмнө, ах дүүсийнх дарааллаар ажилладаг тул энэ leaf компонент бусад бүх Reveal-ийн
   ScrollTrigger-ээс өмнө smoother-ийг үүсгэж, тэдгээр нь smoother-т холбогдоно. Анкор холбоосууд (`#id`, `/#id`) ба
   hash-тай ачаалалтыг smoother.scrollTo болгоно. Reduced motion үед smoother үүсгэхгүй. Зам солигдоход дахин үүснэ. */

import { usePathname } from "next/navigation";
import { ScrollSmoother, ScrollTrigger, reduceMotion, useGSAP } from "./gsap";

const HEADER_OFFSET = () => (document.querySelector<HTMLElement>("#site-header")?.offsetHeight ?? 80) + 8;

export function SmoothScroll() {
  const path = usePathname();

  useGSAP(() => {
    const reduce = reduceMotion();
    let smoother: ScrollSmoother | null = null;
    if (!reduce && document.querySelector("#smooth-wrapper") && document.querySelector("#smooth-content")) {
      smoother = ScrollSmoother.create({
        wrapper: "#smooth-wrapper", content: "#smooth-content",
        smooth: 1.2, effects: false, smoothTouch: 0.1,
      });
    }
    // Хүүхэд Reveal-ууд ScrollTrigger-ээ дараа нь үүсгэдэг тул дахин тооцоолно (өгөгдөл ачаалагдахад ScrollSmoother өөрөө хэмжээг ажигладаг)
    requestAnimationFrame(() => ScrollTrigger.refresh());

    const scrollToHash = (hash: string, smooth: boolean) => {
      const target = document.querySelector<HTMLElement>(hash);
      if (!target) return false;
      if (smoother) smoother.scrollTo(target, smooth, `top ${HEADER_OFFSET()}px`);
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET(), behavior: smooth && !reduce ? "smooth" : "auto" });
      return true;
    };

    // "#news" ба "/#news" (энэ хуудсан дээрх) холбоосууд — Next Link-ийн навигацийн оронд зөөлөн гүйлгэнэ
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      const m = href.match(/^(?:\/)?(#[\w-]+)$/);
      if (!m) return;
      if (href.startsWith("/") && location.pathname !== "/") return;   // өөр хуудасны анкор — Next-ээр явна
      if (scrollToHash(m[1], true)) { e.preventDefault(); history.replaceState(null, "", m[1]); }
    };
    document.addEventListener("click", onClick);
    if (location.hash) requestAnimationFrame(() => scrollToHash(location.hash, false));

    return () => { document.removeEventListener("click", onClick); smoother?.kill(); };
  }, [path]);

  return null;
}
