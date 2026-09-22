"use client";

/* Эхний ачаалалтын splash: navy давхарга, сүлд лого зурагдах анимаци (GSAP DrawSVG, LogoDraw.tsx), нэр.
   window load + document.fonts.ready-ийн дараа, гэхдээ хамгийн багадаа MIN_MS (2.5 сек) харуулаад fade-аар алга болно.
   Нэг session-д нэг л удаа: хаагдахдаа sessionStorage-д тэмдэг + head-д ".site-splash{display:none}" style нэмнэ; reload дээр
   root layout-ийн beforeInteractive скрипт ижил style-ийг render-ийн өмнө нэмдэг тул гялсхийхгүй (html атрибут өөрчлөхгүй → hydration зөрчилгүй). Reduced motion
   үед анимацигүй, шууд алга. Dev StrictMode-ийн давхар effect: тэмдэг зөвхөн хаагдах үед тавигддаг тул асуудалгүй. */

import { useEffect, useState } from "react";
import { LogoDraw } from "./LogoDraw";

const KEY = "shineue.splash";
const MIN_MS = 2500;   // хамгийн багадаа 2.5 сек харагдана (хэрэглэгчийн хүсэлт)

export function Splash() {
  const [phase, setPhase] = useState<"show" | "hide" | "gone">("show");

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(KEY) === "1"; } catch { /* хувийн горим г.м. */ }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen) { setPhase("gone"); return; }   // eslint-disable-line react-hooks/set-state-in-effect -- session шалгалт зөвхөн client дээр
    // "Үзсэн" тэмдэг: sessionStorage + html.splash-seen (layout-ийн inline script ба CSS дараагийн mount-д шууд нуухад)
    const markSeen = () => {
      try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
      if (!document.getElementById("splash-seen")) {   // дараагийн mount-д (client шилжилт) шууд нуух; React-ийн атрибутад хүрэхгүй
        const st = document.createElement("style"); st.id = "splash-seen"; st.textContent = ".site-splash{display:none}"; document.head.appendChild(st);
      }
    };

    const start = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const loaded = new Promise<void>((r) => (document.readyState === "complete" ? r() : window.addEventListener("load", () => r(), { once: true })));
    const fonts = document.fonts?.ready ?? Promise.resolve();
    // Хэт удаан ачаалахад ч 5 сек-ээс илүү халхлахгүй
    const cap = new Promise<void>((r) => setTimeout(r, 5000));
    Promise.race([Promise.all([loaded, fonts]).then(() => undefined), cap]).then(() => {
      const wait = reduce ? 0 : Math.max(0, MIN_MS - (performance.now() - start));
      timer = setTimeout(() => {
        markSeen();
        if (reduce) { setPhase("gone"); return; }
        setPhase("hide");
        timer = setTimeout(() => setPhase("gone"), 500);
      }, wait);
    });
    return () => clearTimeout(timer);
  }, []);

  if (phase === "gone") return null;
  return (
    <div aria-hidden="true"
         className={`site-splash fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-navy text-white transition-opacity duration-500 ${phase === "hide" ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      <LogoDraw size={168} exiting={phase === "hide"} />
      <div className="font-display text-2xl font-extrabold tracking-wide lg:text-3xl">Шинэ Үе сургууль</div>
    </div>
  );
}
