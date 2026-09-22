"use client";

/* Толгой хэсэг (hero.js): зүүн намтар, баруун хөрөг. #hero-art дахь геометр дүрсүүд DrawSVG-ээр зурагдаж/арилж давтагдана,
   MotionPath-аар хөвнө; хүрээ зурагдаж зураг гарч ирнэ, хүрээний дагуу дүрсүүд тойрно. Текст, зураг админаас. */

import { useRef } from "react";
import type { OlympiadPage as PageSettings } from "@/lib/types";
import { gsap, MotionPathPlugin, useGSAP } from "./gsap";

const P = { orange: "#F26B2B", yellow: "#FFD500", blue: "#0A63B2", green: "#8CC63F", red: "#BF1F2E", teal: "#0B8A80", purple: "#8A2B8F", navy: "#2C2F8F" };

/* ---- hero.js-ийн дүрс үүсгэгчид ба `shapes` массивыг hero.js 30–109-р мөрөөс (quarterArcs … shapes массив хаагдах хүртэл)
   ӨӨРЧЛӨЛТГҮЙ хуулав. ---- */

// Төвлөрсөн дөрөвний нэг нум. cx,cy = төв; dir = нум аль тийш харах вэ.
function quarterArcs(cx: number, cy: number, dir: string, color: string, radii: number[], sw = 10): string {
  const sx = dir.includes("r") ? 1 : -1; // x чиглэл
  const sy = dir.includes("b") ? 1 : -1; // y чиглэл
  const sweep = sx * sy > 0 ? 1 : 0;
  return radii
    .map(
      (r) =>
        `<path d="M${cx + sx * r},${cy} A${r},${r} 0 0 ${sweep} ${cx},${cy + sy * r}"
             fill="none" stroke="${color}" stroke-width="${sw}"/>`,
    )
    .join("");
}

function ringSet(cx: number, cy: number, color: string, radii: number[], sw = 7): string {
  return radii.map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}"/>`).join("");
}

// 4 үзүүрт од (Q муруй нь төв рүү татагдсан).
function star(cx: number, cy: number, s: number, color: string, sw = 6): string {
  const h = s / 2;
  return `<path d="M${cx},${cy - h} Q${cx},${cy} ${cx + h},${cy} Q${cx},${cy} ${cx},${cy + h}
                     Q${cx},${cy} ${cx - h},${cy} Q${cx},${cy} ${cx},${cy - h} Z"
                  fill="${color}" fill-opacity="0" stroke="${color}" stroke-width="${sw}"
                  stroke-linejoin="round" data-fill/>`;
}

function diamondNest(cx: number, cy: number, sizes: number[], color: string, sw = 6): string {
  return sizes
    .map((s, i) => {
      const last = i === sizes.length - 1;
      return `<polygon points="${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}"
                fill="${color}" fill-opacity="0" stroke="${color}" stroke-width="${sw}"
                stroke-linejoin="round" ${last ? "data-fill" : ""}/>`;
    })
    .join("");
}

function stripes(x: number, y: number, size: number, count: number, color: string, sw = 8): string {
  let s = "";
  const step = size / count;
  for (let i = 1; i <= count; i++) {
    const k = i * step;
    s += `<line x1="${x}" y1="${y + k}" x2="${x + k}" y2="${y}"
                  stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
  }
  return s;
}

function dots(cx: number, cy: number, gap: number, r: number, color: string): string {
  let s = "";
  for (const dx of [-gap, gap])
    for (const dy of [-gap, gap]) {
      s += `<circle cx="${cx + dx}" cy="${cy + dy}" r="${r}"
                    fill="${color}" fill-opacity="0" stroke="${color}" stroke-width="5" data-fill/>`;
    }
  return s;
}

// Дөрвөн буланд дөрөвний нэг дугуй → дунд нь од хэлбэрийн хоосон зай.
function petals(cx: number, cy: number, s: number, a: string, b: string, sw = 6): string {
  const h = s / 2;
  const q = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, col: string) =>
    `<path d="M${x1},${y1} L${x2},${y2} A${h},${h} 0 0 1 ${x3},${y3} Z"
             fill="${col}" fill-opacity="0" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round" data-fill/>`;
  return (
    q(cx - h, cy - h, cx, cy - h, cx - h, cy, a) +
    q(cx + h, cy - h, cx + h, cy, cx, cy - h, b) +
    q(cx - h, cy + h, cx - h, cy, cx, cy + h, b) +
    q(cx + h, cy + h, cx, cy + h, cx + h, cy, a)
  );
}

/* ------------------- header-ийн найруулга (1600×900) ------------------- */
const shapes: string[] = [
  quarterArcs(0, 0, "rb", P.orange, [120, 180, 240, 300, 360]), // зүүн дээд булан
  quarterArcs(1600, 900, "lt", P.blue, [120, 180, 240, 300, 360]), // баруун доод булан
  ringSet(1370, 170, P.purple, [30, 60, 90, 120, 150]), // баруун дээд цагираг
  star(230, 690, 170, P.red), // зүүн доод од
  diamondNest(1290, 690, [120, 90, 60, 30], P.yellow), // баруун доод ромб
  stripes(660, 60, 220, 6, P.green), // дээд зураас
  quarterArcs(800, 900, "lt", P.teal, [90, 140, 190], 8), // доод төв хагас нум (зүүн)
  quarterArcs(800, 900, "rt", P.teal, [90, 140, 190], 8), // доод төв хагас нум (баруун)
  dots(1120, 250, 22, 12, P.orange), // цэгүүд
  petals(390, 200, 150, P.teal, P.red), // дэлбээ
  star(1250, 470, 70, P.red), // жижиг од
  ringSet(520, 780, P.navy, [16, 34, 52], 5), // жижиг цагираг
  dots(280, 430, 20, 10, P.purple), // цэгүүд
];

export function Hero({ page }: { page: PageSettings | null }) {
  const root = useRef<HTMLElement>(null);
  const art = useRef<SVGSVGElement>(null);
  const noImg = useRef(false);

  useGSAP(
    () => {
      const svg = art.current!;
      svg.innerHTML = shapes.map((s) => `<g class="shape">${s}</g>`).join("");
      const groups = gsap.utils.toArray<SVGGElement>(".shape", svg);
      const strokes = gsap.utils.toArray<SVGElement>(".shape > *", svg);
      const fills = gsap.utils.toArray<SVGElement>("[data-fill]", svg);
      const mm = gsap.matchMedia();
      mm.add({ reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        const reduce = !!ctx.conditions?.reduce;

        const frame = gsap.utils.toArray<SVGElement>(".photo-frame > *", root.current!);
        const copy = [".hero .eyebrow", ".hero .title", ".hero .lead", ".hero .scroll-hint"]
          .map((sel) => root.current!.querySelector<HTMLElement>(sel))
          .filter((el): el is HTMLElement => !!el);
        const heroImg = gsap.utils.toArray<HTMLElement>(".hero-photo img", root.current!);
        const frameFills = gsap.utils.toArray<SVGElement>(".photo-frame [data-fill]", root.current!);
        const figcaption = gsap.utils.toArray<HTMLElement>(".hero-photo figcaption", root.current!);

        if (reduce) {
          // Хөдөлгөөн багасгах: шууд бүрэн зурсан байдлаар харуулна.
          gsap.set([strokes, frame], { drawSVG: "0% 100%" });
          gsap.set([fills, frameFills], { fillOpacity: 1 });
          // copy/heroImg/figcaption-ийг CSS-ээр хэзээ ч нуудаггүй (opacity/visibility анхдагч утгаараа)
          // тул autoAlpha:1 болгож "сэргээх" gsap.set нь no-op — хассан.
          return;
        }

        /* Зургийн хүрээ зурагдаж, зураг гарч ирнэ (нэг л удаа). */
        const introTl = gsap
          .timeline({ delay: 0.3, defaults: { ease: "power2.inOut" } })
          .from(frame, { drawSVG: "0% 0%", duration: 1.1, stagger: 0.15 })
          .to(frameFills, { fillOpacity: 1, duration: 0.5 }, "-=0.4");
        // Хөрөг байхгүй үед <img> DOM-д огт байхгүй тул (прототип шиг display:none биш) хоосон target-аар дуудахгүй.
        if (heroImg.length) introTl.from(heroImg, { autoAlpha: 0, scale: 0.94, duration: 0.9, ease: "power3.out" }, 0.5);
        introTl.from(figcaption, { autoAlpha: 0, y: 10, duration: 0.5, ease: "power2.out" }, "-=0.3").add(startFrameOrbit, "-=0.2");

        /* Хүрээ тойрон урссан дүрсийн tween-ийг цуглуулж, cleanup дээр устгах (rAF/timeline callback-аас
           асинхроноор үүсдэг тул useGSAP-ийн context автоматаар барихгүй). */
        const orbitTweens: gsap.core.Tween[] = [];
        let orbitNodes: Element[] = [];

        /* MotionPath: хүрээний дагуу дүрсүүд тойрон урсана. */
        function startFrameOrbit() {
          const frameSvg = root.current!.querySelector(".photo-frame");
          const rect = frameSvg && frameSvg.querySelector(".pf-rect");
          if (!frameSvg || !rect) return;

          // Дөрвөлжин хүрээг path болгож хөрвүүлнэ (MotionPath зам болгон ашиглана).
          const framePath = MotionPathPlugin.convertToPath(rect as unknown as SVGPathElement)[0];

          // Тойрох дүрсүүд: шар дугуй (том, удаан), хөх ромб, хөх цагираг, жижиг шар дугуй.
          frameSvg.insertAdjacentHTML(
            "beforeend",
            `
          <g class="pf-orbit pf-o1"><rect x="-8" y="-8" width="16" height="16" fill="${P.navy}"/></g>
          <g class="pf-orbit pf-o2"><circle r="8" fill="none" stroke="${P.navy}" stroke-width="3.5"/></g>
          <g class="pf-orbit pf-o3"><circle r="6" fill="${P.yellow}"/></g>`,
          );

          orbitNodes = gsap.utils.toArray<Element>(".pf-orbit", frameSvg);
          const pfCircle = frameSvg.querySelector(".pf-circle");
          const pfO1 = gsap.utils.toArray<Element>(".pf-o1", frameSvg);
          const pfO1Rect = gsap.utils.toArray<Element>(".pf-o1 rect", frameSvg);
          const pfO2 = gsap.utils.toArray<Element>(".pf-o2", frameSvg);
          const pfO3 = gsap.utils.toArray<Element>(".pf-o3", frameSvg);

          const orbit = (target: gsap.TweenTarget, duration: number, start: number, extra = {}) => {
            const tw = gsap.to(target, {
              duration,
              repeat: -1,
              ease: "none",
              motionPath: { path: framePath, align: framePath, alignOrigin: [0.5, 0.5], start, end: start + 1, ...extra },
            });
            orbitTweens.push(tw);
            return tw;
          };

          gsap.set(pfO1Rect, { rotation: 45, transformOrigin: "50% 50%" });
          orbitTweens.push(
            gsap.from(orbitNodes, { autoAlpha: 0, scale: 0, duration: 0.6, ease: "back.out(2)", stagger: 0.1, transformOrigin: "50% 50%" }),
          );

          if (pfCircle) orbit(pfCircle, 28, 0.12); // том шар дугуй: удаан тойрно
          orbit(pfO1, 16, 0.55, { autoRotate: true }); // ромб: замын дагуу эргэнэ
          orbit(pfO2, 22, 0.8);
          orbit(pfO3, 11, 0.3);
        }

        /* Зурах ↔ арилгах давталттай timeline */
        const draw = gsap.timeline({ repeat: -1, repeatDelay: 5 });

        draw
          .addLabel("draw")
          // 1. Stroke-ууд эхнээсээ зурагдана.
          .fromTo(
            strokes,
            { drawSVG: "0% 0%" },
            { drawSVG: "0% 100%", duration: 1.4, ease: "power2.inOut", stagger: { each: 0.05, from: "random" } },
            "draw",
          )
          // 2. Дүүргэлт аажмаар орж ирнэ.
          .to(fills, { fillOpacity: 1, duration: 0.8, ease: "power1.out", stagger: 0.04 }, "draw+=1.2")
          // 3. Зурагдсан байдлаараа хэсэг хугацаанд үлдэнэ (энэ үед MotionPath урсгал үргэлжилнэ).
          .addLabel("erase", "draw+=6.5")
          // 4. Арилах: дүүргэлт алга болж, stroke-ууд төгсгөл рүүгээ "хумигдана".
          .to(fills, { fillOpacity: 0, duration: 0.5, ease: "power1.in" }, "erase")
          .to(
            strokes,
            {
              drawSVG: "100% 100%",
              duration: 1,
              ease: "power2.inOut",
              stagger: { each: 0.03, from: "random" },
            },
            "erase+=0.1",
          );

        /* MotionPath урсгал: дүрс бүр өөрийн байрлалыг тойрсон зөөлөн гогцоо замаар хөвнө.
           Зам нь харьцангуй цэгүүд (x, y) тул дүрс анхны байрлалаасаа ±R хүрээнд хөдөлнө. */
        groups.forEach((g, i) => {
          const R = 18 + (i % 4) * 8; // гогцооны радиус
          const dir = i % 2 ? 1 : -1; // ээлжлэн цагийн зүү / эсрэг
          const loop = [
            { x: 0, y: 0 },
            { x: R * dir, y: -R * 0.6 },
            { x: R * 0.4 * dir, y: -R * 1.4 },
            { x: -R * 0.8 * dir, y: -R * 0.9 },
            { x: -R * 0.5 * dir, y: R * 0.3 },
            { x: 0, y: 0 },
          ];
          gsap.to(g, {
            duration: 9 + (i % 5) * 2,
            repeat: -1,
            ease: "none",
            motionPath: { path: loop, curviness: 1.6 },
          });
        });

        /* Гарчиг: зурагдаж эхэлмэгц дагаж гарч ирнэ (нэг л удаа). */
        gsap.from(copy, {
          autoAlpha: 0,
          y: 28,
          duration: 1,
          ease: "power3.out",
          stagger: 0.12,
          delay: 0.5,
        });

        /* Гүйлгэх зөвлөмжийн цэг */
        const scrollHintSpan = gsap.utils.toArray<HTMLElement>(".scroll-hint span", root.current!);
        gsap.to(scrollHintSpan, {
          y: 14,
          autoAlpha: 0,
          duration: 1.1,
          ease: "power1.in",
          repeat: -1,
          repeatDelay: 0.3,
        });

        return () => {
          draw.kill();
          orbitTweens.forEach((t) => t.kill());
          orbitNodes.forEach((n) => n.remove());
        };
      });
      return () => {
        mm.revert();
        svg.innerHTML = "";
      };
    },
    { scope: root },
  );

  return (
    <header ref={root} className="hero" id="hero">
      <svg ref={art} id="hero-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" />
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{page?.eyebrow ?? "Монгол Улсын Ардын багш"}</p>
          <h1 className="title">{page?.title ?? "Ү.Маамын нэрэмжит математикийн олимпиад"}</h1>
          {page ? <p className="lead bio">{page.bio}</p> : <p className="section-note">Мэдээлэл түр байхгүй.</p>}
          <a className="scroll-hint" href="#album" aria-label="Доош гүйлгэх">
            <span />
          </a>
        </div>
        <figure className={`hero-photo${!page?.portrait_image ? " no-img" : ""}`}>
          <svg className="photo-frame" viewBox="0 0 440 520" aria-hidden="true">
            <rect className="pf-rect" x="20" y="20" width="400" height="480" rx="28" fill="none" stroke="#1E3A8F" strokeWidth="4" />
            <circle className="pf-circle" cx="404" cy="56" r="38" fill="#FFC20E" fillOpacity="0" stroke="#FFC20E" strokeWidth="4" data-fill="" />
          </svg>
          {page?.portrait_image && (
            // eslint-disable-next-line @next/next/no-img-element -- backend media, unoptimized хэвээр
            <img
              src={page.portrait_image}
              alt={page.portrait_caption}
              onError={(e) => {
                noImg.current = true;
                e.currentTarget.parentElement?.classList.add("no-img");
              }}
            />
          )}
          <figcaption>{page?.portrait_caption ?? ""}</figcaption>
        </figure>
      </div>
    </header>
  );
}
