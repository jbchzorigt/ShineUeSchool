"use client";

/* "2026" Bauhaus хавтан (main.js): section дэлгэцэнд орж ирэхэд хавтангууд эргэж орж ирнэ, дараа нь үсэрнэ;
   цагираг хавтан амьсгална; hover-д нэг эргэлт; "Хээ солих" дүүргэгч хавтангуудыг шинэ хээгээр солино;
   6 сек тутам автоматаар (section харагдаж байхад); "Дахин тоглуулах". */

import { useRef } from "react";
import { buildYear, randomFiller, type Tile } from "@/lib/yearTiles";
import { FORMULAS } from "@/lib/olympiad-data";
import { gsap, ScrollTrigger, useGSAP } from "./gsap";
import { Formulas } from "./Formulas";

export function YearTiles({ year }: { year: number }) {
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    const el = root.current;
    if (!svg.current || !el) return;
    const tiles: Tile[] = buildYear(svg.current, String(year), "y");
    const tileEls = tiles.map((t) => t.el);
    gsap.set(tileEls, { transformOrigin: "50% 50%" });

    let intro: gsap.core.Timeline | null = null;
    let autoShuffle = false;
    let inView = false;

    /* Асинхроноор (click/interval) үүсэх shuffle timeline-үүдийг цуглуулж cleanup дээр kill хийнэ
       (useGSAP-ийн context эдгээрийг автоматаар барихгүй, учир нь эхний синхрон гүйцэтгэлийн дараа үүснэ). */
    const shuffleTimelines: gsap.core.Timeline[] = [];

    /* Хээ солих: дүүргэгч хавтангууд эргэж, шинэ хээгээр солигдоно (main.js 336–356). */
    function shuffle() {
      const fillers = tiles.filter((t) => t.kind === "filler");
      const els = fillers.map((t) => t.el);
      const tl = gsap.timeline({ defaults: { duration: 0.35, ease: "power2.in" } });
      tl.to(els, {
        scaleX: 0,
        stagger: { each: 0.03, from: "random" },
        onComplete() {
          fillers.forEach((t) => { t.inner.innerHTML = randomFiller(); });
        },
      }).to(els, {
        scaleX: 1,
        ease: "back.out(1.4)",
        duration: 0.45,
        stagger: { each: 0.03, from: "random" },
      });
      shuffleTimelines.push(tl);
      return tl;
    }

    const mm = gsap.matchMedia();
    mm.add({ reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
      const reduce = !!ctx.conditions?.reduce;

      /* Оруулах timeline (main.js 264–290) */
      intro = gsap.timeline({ paused: true });
      intro.from(tileEls, {
        scale: 0,
        rotation: () => gsap.utils.random([-90, 90, 180]),
        autoAlpha: 0,
        duration: reduce ? 0 : 0.7,
        ease: "back.out(1.6)",
        stagger: reduce ? 0 : { each: 0.045, from: "start" },
      });

      // Дуусах үед бүхэлдээ бага зэрэг үсрэх (bounce) эффект.
      if (!reduce) {
        intro
          .to(tileEls, {
            y: -12,
            duration: 0.25,
            ease: "power2.out",
            stagger: { each: 0.01, from: "center" },
          }, "-=0.2")
          .to(tileEls, {
            y: 0,
            duration: 0.5,
            ease: "bounce.out",
            stagger: { each: 0.01, from: "center" },
          }, "<0.25");
      }

      /* Section-1 дэлгэцэнд орж ирэхэд л оруулах анимаци эхэлнэ. */
      const introTrigger = ScrollTrigger.create({
        trigger: el,
        start: "top 70%",
        once: true,
        onEnter: () => intro!.play(),
      });

      /* Оруулах анимаци дуусмагц автомат хээ солилт эхэлнэ. */
      intro.eventCallback("onComplete", () => { autoShuffle = true; });

      /* Цагираг хавтангуудын үргэлжилсэн амьсгал */
      let ringTween: gsap.core.Tween | null = null;
      if (!reduce) {
        const ringEls = tiles
          .filter((t) => t.inner.querySelector("circle[r='6']"))
          .map((t) => t.inner);
        // Санамсаргүй хээ сонголтоор тухайн оны хавтангуудад "цагираг" хээ огт орохгүй байж болно —
        // тэгвэл target хоосон массив болж gsap "GSAP target  not found" гэж анхааруулна.
        if (ringEls.length) {
          ringTween = gsap.to(ringEls, {
            scale: 1.08,
            transformOrigin: "50% 50%",
            duration: 1.4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            stagger: { each: 0.3 },
          });
        }
      }

      return () => {
        introTrigger.kill();
        ringTween?.kill();
        intro?.kill();
      };
    });

    /* Hover: хавтан нэг эргэлт хийнэ (main.js 324–333). */
    const hoverTweens: gsap.core.Tween[] = [];
    const hoverCleanups: (() => void)[] = [];
    tileEls.forEach((tEl) => {
      const onEnter = () => {
        hoverTweens.push(gsap.to(tEl, {
          rotation: "+=360",
          duration: 0.8,
          ease: "power3.inOut",
          overwrite: "auto",
        }));
      };
      tEl.addEventListener("mouseenter", onEnter);
      hoverCleanups.push(() => tEl.removeEventListener("mouseenter", onEnter));
    });

    /* Товчлуурууд: "Дахин тоглуулах" / "Хээ солих" */
    const replayBtn = el.querySelector<HTMLButtonElement>("#replay");
    const shuffleBtn = el.querySelector<HTMLButtonElement>("#shuffle");
    const onReplay = () => { intro?.restart(); };
    const onShuffle = () => { shuffle(); };
    replayBtn?.addEventListener("click", onReplay);
    shuffleBtn?.addEventListener("click", onShuffle);

    /* 6 секунд тутам автоматаар хээ солино — зөвхөн оруулах анимаци дууссан
       бөгөөд section дэлгэцэнд харагдаж байх үед (main.js 363–378). */
    const inViewTrigger = ScrollTrigger.create({
      trigger: el,
      start: "top 80%",
      end: "bottom 20%",
      onToggle: (self) => { inView = self.isActive; },
    });

    const mmAuto = gsap.matchMedia();
    mmAuto.add("(prefers-reduced-motion: no-preference)", () => {
      const id = setInterval(() => {
        if (autoShuffle && inView && intro && !intro.isActive()) shuffle();
      }, 6000);
      return () => clearInterval(id);
    });

    return () => {
      mm.revert();
      mmAuto.revert();
      inViewTrigger.kill();
      hoverTweens.forEach((t) => t.kill());
      hoverCleanups.forEach((f) => f());
      shuffleTimelines.forEach((t) => t.kill());
      replayBtn?.removeEventListener("click", onReplay);
      shuffleBtn?.removeEventListener("click", onShuffle);
      svg.current!.innerHTML = "";
    };
  }, { scope: root });

  return (
    <section ref={root} className="section section-1" id="section-1">
      <Formulas items={FORMULAS.year} />
      <div className="section-inner">
        <svg ref={svg} id="year" viewBox="0 0 1500 500" role="img" aria-label={String(year)} />
        <div className="controls">
          <button id="replay" type="button">Дахин тоглуулах</button>
          <button id="shuffle" type="button">Хээ солих</button>
        </div>
      </div>
    </section>
  );
}
