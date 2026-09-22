"use client";

/* ScrollSmoother-ийг хамгийн эхэнд (Nav-аас ч өмнө) mount хийж, #smooth-wrapper > #smooth-content-ийг зөөлөн гүйлгэнэ.
   Хүүхэд секцүүдийн useGSAP layout effect Nav-ынхаас өмнө ажиллаж болзошгүй тул (React child-ийн layout effect эцэг
   компонентынхаас өмнө гүйцэтгэгддэг) энэ бие даасан leaf компонентыг .olympiad дотор ХАМГИЙН ЭХНИЙ хүүхэд болгож
   байрлуулснаар ScrollSmoother нь бусад бүх секцийн ScrollTrigger үүсэхээс өмнө үүсч, тэдгээр нь smoother-т scroller
   болгон шууд холбогдоно (цонхны scroller-т биш). "#id" холбоосуудыг smoother.scrollTo болгоно. Reduced motion үед
   smoother үүсгэхгүй, энгийн гүйлгэлт. Хуудас #id-тэй нээгдвэл тэр хэсэг рүү очно. */

import { ScrollSmoother, ScrollTrigger, reduceMotion, useGSAP } from "./gsap";

export function Smoother() {
  useGSAP(() => {
    const el = document.querySelector<HTMLElement>(".olympiad");
    if (!el) return;
    const reduce = reduceMotion();
    const navH = () => (el.querySelector<HTMLElement>("#topbar")?.offsetHeight ?? 72);
    let smoother: ScrollSmoother | null = null;
    if (!reduce) {
      smoother = ScrollSmoother.create({
        wrapper: "#smooth-wrapper", content: "#smooth-content",
        smooth: 1.2, effects: false, smoothTouch: 0.1,
      });
    }
    ScrollTrigger.refresh(); // энэ мөрд хүрэх үед хүүхэд секцүүд ScrollTrigger хараахан үүсгээгүй тул тэдгээрийг дараа нь дахин тооцно

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href")!;
      if (id === "#") return;
      const target = el.querySelector<HTMLElement>(id);
      if (!target) return;
      e.preventDefault();
      if (smoother) smoother.scrollTo(target, true, `top ${navH()}px`);
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH(), behavior: reduce ? "auto" : "smooth" });
      history.replaceState(null, "", id);
    };
    el.addEventListener("click", onClick);
    if (location.hash && smoother) {
      const target = el.querySelector<HTMLElement>(location.hash);
      if (target) requestAnimationFrame(() => smoother?.scrollTo(target, false, `top ${navH()}px`));
    }
    return () => { el.removeEventListener("click", onClick); smoother?.kill(); };
  }, []);

  return null;
}
