"use client";

/* Толгой хэсэг: зүүн намтар (гарчиг, намтар — LineReveal мөр мөрөөр), баруун хөрөг. #hero-art дахь 8 Bauhaus хавтан (дөрвөн буланд
   төвлөрсөн нумууд, дунд захаар дэлбээ / цэгэн / шатрын хавтангууд) GSAP-аар эргэж орж ирээд зөөлөн хөвнө: нумууд DrawSVG-ээр
   долгиолж, цэгүүд лугшиж, шатар/дэлбээ хавтан үе үе 90° эргэнэ. Хөргийн хүрээ зурагдаж, хүрээний дагуу дүрсүүд тойрно (MotionPath).
   Текст, зураг админаас. prefers-reduced-motion: хавтангууд хөдөлгөөнгүй. */

import { useRef } from "react";
import type { OlympiadPage as PageSettings } from "@/lib/types";
import { gsap, MotionPathPlugin, useGSAP } from "./gsap";
import { LineReveal } from "./LineReveal";

const P = { yellow: "#FFD500", navy: "#2C2F8F" };   // хөргийн хүрээг тойрох дүрсүүд
const C = { green: "#8CC63F", purple: "#92278F", orange: "#FDB013", red: "#C1272D", blue: "#0066CC" };

/* ---- Хавтангууд: тус бүр 100×100 нэгж талбайд зурагдана ---- */

// Буланд (cx,cy ∈ {0,100}) төвлөрсөн дөрөвний нэг нумууд + дүүрэн цөм
function arcTile(cx: number, cy: number, color: string): string {
  const sx = cx === 0 ? 1 : -1, sy = cy === 0 ? 1 : -1, sweep = sx * sy > 0 ? 1 : 0;
  const core = `<path class="t-core" d="M${cx},${cy} L${cx + sx * 22},${cy} A22,22 0 0 ${sweep} ${cx},${cy + sy * 22} Z" fill="${color}"/>`;
  return core + [38, 56, 74, 92].map((r) =>
    `<path class="t-arc" d="M${cx + sx * r},${cy} A${r},${r} 0 0 ${sweep} ${cx},${cy + sy * r}" fill="none" stroke="${color}" stroke-width="10"/>`).join("");
}
const dot = (cx: number, cy: number, r: number, color: string) => `<circle class="t-dot" cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
const dots4 = (x: number, y: number, color: string) => [14, 36].map((dx) => [14, 36].map((dy) => dot(x + dx, y + dy, 8.5, color)).join("")).join("");
const sq = (x: number, y: number, color: string) => `<rect x="${x}" y="${y}" width="50" height="50" fill="${color}"/>`;

const TILES = {
  // Ногоон дөрөвний дугуй + ягаан цэгүүд
  leaf: `<path d="M50,0 L0,0 A50,50 0 0 0 50,50 Z" fill="${C.green}"/><path d="M50,100 L50,50 A50,50 0 0 1 100,100 Z" fill="${C.green}"/>${dots4(50, 0, C.purple)}${dots4(0, 50, C.purple)}`,
  // Дөрвөн булангийн дэлбээ → дунд нь од хэлбэрийн зай
  petals: `<path d="M0,0 L50,0 A50,50 0 0 1 0,50 Z" fill="${C.orange}"/><path d="M100,0 L100,50 A50,50 0 0 1 50,0 Z" fill="${C.red}"/><path d="M0,100 L0,50 A50,50 0 0 1 50,100 Z" fill="${C.red}"/><path d="M100,100 L50,100 A50,50 0 0 1 100,50 Z" fill="${C.orange}"/>`,
  // Ягаан/ногоон шатар, цагаан дугуйтай
  checker: sq(0, 0, C.purple) + sq(50, 0, C.green) + sq(0, 50, C.green) + sq(50, 50, C.purple) + [25, 75].map((x) => [25, 75].map((y) => dot(x, y, 16, "#fff")).join("")).join(""),
  // Хөх шатар: цагаан дугуй + ногоон цэг
  blue: sq(50, 0, C.blue) + sq(0, 50, C.blue) + dot(75, 25, 17, "#fff") + dot(25, 75, 17, "#fff") + dot(25, 25, 8, C.green) + dot(75, 75, 8, C.green),
};

/* ------------------- header-ийн найруулга: [төрөл, агуулга, байрлал] -------------------
   Байрлалыг #hero-art-ийн бодит хэмжээнээс (px) тооцно: 4 нуман хавтан яг буланд, 4 жижиг хавтан дээд/доод захаар.
   Нарийн дэлгэцэд (< 760px) жижиг хавтангуудыг нууна. */
type Place = (W: number, H: number, big: number, small: number) => [number, number, number] | null;
const TOP = 88;   // nav-ийн доор
const mid = (fx: number, bottom: boolean): Place => (W, H, _big, small) => (W < 760 ? null : [W * fx, bottom ? H - small - 28 : TOP + 12, small]);
const LAYOUT: ["arc" | "spin", string, Place][] = [
  ["arc", arcTile(0, 0, C.purple), (_W, _H, big) => [0, TOP - 16, big]],                 // зүүн дээд булан
  ["arc", arcTile(100, 0, C.green), (W, _H, big) => [W - big, TOP - 16, big]],           // баруун дээд булан
  ["arc", arcTile(0, 100, C.red), (_W, H, big) => [0, H - big, big]],                    // зүүн доод булан
  ["arc", arcTile(100, 100, C.orange), (W, H, big) => [W - big, H - big, big]],          // баруун доод булан
  ["spin", TILES.petals, mid(0.3, false)],
  ["spin", TILES.leaf, mid(0.56, false)],
  ["spin", TILES.blue, mid(0.4, true)],
  ["spin", TILES.checker, mid(0.66, true)],
];
const shapes = LAYOUT.map(([kind, body]) => `<g class="tile-pos"><g class="tile-float"><g class="tile-in" data-kind="${kind}">${body}</g></g></g>`);

export function Hero({ page }: { page: PageSettings | null }) {
  const root = useRef<HTMLElement>(null);
  const art = useRef<SVGSVGElement>(null);
  const noImg = useRef(false);

  useGSAP(
    () => {
      const svg = art.current!;
      svg.innerHTML = shapes.join("");
      /* Хавтангуудыг бодит хэмжээгээр байрлуулна (өргөн өөрчлөгдөхөд дахин) */
      const pos = gsap.utils.toArray<SVGGElement>(".tile-pos", svg);
      const place = () => {
        const W = svg.clientWidth, H = svg.clientHeight;
        if (!W || !H) return;
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        const big = gsap.utils.clamp(96, 220, W * 0.13), small = gsap.utils.clamp(64, 104, W * 0.065);
        pos.forEach((g, i) => {
          const at = LAYOUT[i][2](W, H, big, small);
          g.style.display = at ? "" : "none";
          if (at) g.setAttribute("transform", `translate(${at[0]},${at[1]}) scale(${at[2] / 100})`);
        });
      };
      place();
      const ro = new ResizeObserver(place);
      ro.observe(svg);
      const floats = gsap.utils.toArray<SVGGElement>(".tile-float", svg);
      const tiles = gsap.utils.toArray<SVGGElement>(".tile-in", svg);
      const spinners = tiles.filter((t) => t.dataset.kind === "spin");
      const arcTiles = tiles.filter((t) => t.dataset.kind === "arc");
      const tileDots = gsap.utils.toArray<SVGElement>(".t-dot", svg);
      const mm = gsap.matchMedia();
      mm.add({ reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        const reduce = !!ctx.conditions?.reduce;

        const frame = gsap.utils.toArray<SVGElement>(".photo-frame > *", root.current!);
        // .title, .lead — LineReveal (SplitText мөр мөрөөр) өөрөө анимаци хийнэ
        const copy = [".hero .eyebrow", ".hero .scroll-hint"]
          .map((sel) => root.current!.querySelector<HTMLElement>(sel))
          .filter((el): el is HTMLElement => !!el);
        const heroImg = gsap.utils.toArray<HTMLElement>(".hero-photo img", root.current!);
        const frameFills = gsap.utils.toArray<SVGElement>(".photo-frame [data-fill]", root.current!);
        const figcaption = gsap.utils.toArray<HTMLElement>(".hero-photo figcaption", root.current!);

        if (reduce) {
          // Хөдөлгөөн багасгах: шууд бүрэн зурсан байдлаар харуулна.
          gsap.set(frame, { drawSVG: "0% 100%" });
          gsap.set(frameFills, { fillOpacity: 1 });
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

        /* Хавтангууд: эргэж томорч орж ирнэ → нумууд зурагдана */
        gsap.set(tiles, { svgOrigin: "50 50" });
        const tilesIn = gsap.timeline({ delay: 0.2 })
          .from(tiles, { scale: 0, rotation: (i) => (i % 2 ? 90 : -90), autoAlpha: 0, duration: 0.8, ease: "back.out(1.6)", stagger: 0.08 })
          .from(gsap.utils.toArray<SVGElement>(".t-arc", svg), { drawSVG: "0% 0%", duration: 0.9, ease: "power2.out", stagger: 0.04 }, 0.3);

        /* Үргэлжилсэн хөдөлгөөн: зөөлөн хөвөлт; цэгүүд лугшина; шатар/дэлбээ хавтан үе үе 90° эргэнэ; нумууд дотроосоо гадагш долгиолно */
        const loops: gsap.core.Animation[] = [tilesIn];
        floats.forEach((f, i) => loops.push(gsap.to(f, { y: i % 2 ? 7 : -7, duration: 3 + (i % 3) * 0.7, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.3 })));
        loops.push(gsap.to(tileDots, { scale: 0.78, transformOrigin: "50% 50%", duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 0.12, from: "random" } }));
        spinners.forEach((t, i) => loops.push(gsap.to(t, { rotation: "+=90", duration: 1, ease: "back.inOut(1.4)", repeat: -1, repeatDelay: 4 + i, delay: 2.5 + i * 1.3 })));
        arcTiles.forEach((t, i) => {
          const arcs = t.querySelectorAll(".t-arc");
          loops.push(gsap.timeline({ repeat: -1, repeatDelay: 5, delay: 4 + i * 1.5 })
            .to(arcs, { drawSVG: "100% 100%", duration: 0.6, ease: "power2.in", stagger: 0.08 })
            .fromTo(arcs, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.8, ease: "power2.out", stagger: 0.1, immediateRender: false }, ">0.1"));
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
          loops.forEach((t) => t.kill());
          orbitTweens.forEach((t) => t.kill());
          orbitNodes.forEach((n) => n.remove());
        };
      });
      return () => {
        mm.revert();
        ro.disconnect();
        svg.innerHTML = "";
      };
    },
    { scope: root },
  );

  return (
    <header ref={root} className="hero" id="hero">
      <svg ref={art} id="hero-art" aria-hidden="true" />
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{page?.eyebrow ?? "Монгол Улсын Ардын багш"}</p>
          <LineReveal as="h1" className="title" text={page?.title ?? "Ү.Маамын нэрэмжит математикийн олимпиад"} immediate delay={0.5} />
          {page ? <LineReveal as="p" className="lead bio" text={page.bio} variant="rise" immediate delay={0.9} /> : <p className="section-note">Мэдээлэл түр байхгүй.</p>}
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
