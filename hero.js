/* =====================================================================
   HEADER — геометр дүрсүүд "зурагдаж буй мэт" гарч ирнэ
   ---------------------------------------------------------------------
   DrawSVGPlugin нь stroke-ийн dasharray/dashoffset-ийг хөдөлгөж,
   шугам зурагдаж байгаа мэт харагдуулна. Дараа нь зарим дүрсийн
   дүүргэлт (fill) аажмаар гарч ирнэ. Хэдэн секундын дараа арилж,
   дахин зурагдана (давталттай).
   ===================================================================== */

gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin);

(function initHero() {
  const svg = document.getElementById("hero-art");
  if (!svg) return;

  const P = {
    orange: "#F26B2B",
    yellow: "#FFD500",
    blue:   "#0A63B2",
    green:  "#8CC63F",
    red:    "#BF1F2E",
    teal:   "#0B8A80",
    purple: "#8A2B8F",
    navy:   "#2C2F8F",
  };

  /* ---------------- дүрс үүсгэгч туслахууд (SVG string) ---------------- */

  // Төвлөрсөн дөрөвний нэг нум. cx,cy = төв; dir = нум аль тийш харах вэ.
  function quarterArcs(cx, cy, dir, color, radii, sw = 10) {
    const sx = dir.includes("r") ? 1 : -1;   // x чиглэл
    const sy = dir.includes("b") ? 1 : -1;   // y чиглэл
    const sweep = (sx * sy > 0) ? 1 : 0;
    return radii.map((r) =>
      `<path d="M${cx + sx * r},${cy} A${r},${r} 0 0 ${sweep} ${cx},${cy + sy * r}"
             fill="none" stroke="${color}" stroke-width="${sw}"/>`).join("");
  }

  function ringSet(cx, cy, color, radii, sw = 7) {
    return radii.map((r) =>
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}"/>`).join("");
  }

  // 4 үзүүрт од (Q муруй нь төв рүү татагдсан).
  function star(cx, cy, s, color, sw = 6) {
    const h = s / 2;
    return `<path d="M${cx},${cy - h} Q${cx},${cy} ${cx + h},${cy} Q${cx},${cy} ${cx},${cy + h}
                     Q${cx},${cy} ${cx - h},${cy} Q${cx},${cy} ${cx},${cy - h} Z"
                  fill="${color}" fill-opacity="0" stroke="${color}" stroke-width="${sw}"
                  stroke-linejoin="round" data-fill/>`;
  }

  function diamondNest(cx, cy, sizes, color, sw = 6) {
    return sizes.map((s, i) => {
      const last = i === sizes.length - 1;
      return `<polygon points="${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}"
                fill="${color}" fill-opacity="0" stroke="${color}" stroke-width="${sw}"
                stroke-linejoin="round" ${last ? "data-fill" : ""}/>`;
    }).join("");
  }

  function stripes(x, y, size, count, color, sw = 8) {
    let s = "";
    const step = size / count;
    for (let i = 1; i <= count; i++) {
      const k = i * step;
      s += `<line x1="${x}" y1="${y + k}" x2="${x + k}" y2="${y}"
                  stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
    }
    return s;
  }

  function dots(cx, cy, gap, r, color) {
    let s = "";
    for (const dx of [-gap, gap]) for (const dy of [-gap, gap]) {
      s += `<circle cx="${cx + dx}" cy="${cy + dy}" r="${r}"
                    fill="${color}" fill-opacity="0" stroke="${color}" stroke-width="5" data-fill/>`;
    }
    return s;
  }

  // Дөрвөн буланд дөрөвний нэг дугуй → дунд нь од хэлбэрийн хоосон зай.
  function petals(cx, cy, s, a, b, sw = 6) {
    const h = s / 2;
    const q = (x1, y1, x2, y2, x3, y3, col) =>
      `<path d="M${x1},${y1} L${x2},${y2} A${h},${h} 0 0 1 ${x3},${y3} Z"
             fill="${col}" fill-opacity="0" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round" data-fill/>`;
    return q(cx - h, cy - h, cx, cy - h, cx - h, cy, a)
         + q(cx + h, cy - h, cx + h, cy, cx, cy - h, b)
         + q(cx - h, cy + h, cx - h, cy, cx, cy + h, b)
         + q(cx + h, cy + h, cx, cy + h, cx + h, cy, a);
  }

  /* ------------------- header-ийн найруулга (1600×900) ------------------- */
  const shapes = [
    quarterArcs(0, 0, "rb", P.orange, [120, 180, 240, 300, 360]),        // зүүн дээд булан
    quarterArcs(1600, 900, "lt", P.blue, [120, 180, 240, 300, 360]),     // баруун доод булан
    ringSet(1370, 170, P.purple, [30, 60, 90, 120, 150]),                // баруун дээд цагираг
    star(230, 690, 170, P.red),                                          // зүүн доод од
    diamondNest(1290, 690, [120, 90, 60, 30], P.yellow),                 // баруун доод ромб
    stripes(660, 60, 220, 6, P.green),                                   // дээд зураас
    quarterArcs(800, 900, "lt", P.teal, [90, 140, 190], 8),              // доод төв хагас нум (зүүн)
    quarterArcs(800, 900, "rt", P.teal, [90, 140, 190], 8),              // доод төв хагас нум (баруун)
    dots(1120, 250, 22, 12, P.orange),                                   // цэгүүд
    petals(390, 200, 150, P.teal, P.red),                                // дэлбээ
    star(1250, 470, 70, P.red),                                          // жижиг од
    ringSet(520, 780, P.navy, [16, 34, 52], 5),                          // жижиг цагираг
    dots(280, 430, 20, 10, P.purple),                                    // цэгүүд
  ];

  svg.innerHTML = shapes.map((s) => `<g class="shape">${s}</g>`).join("");

  const groups  = gsap.utils.toArray(".shape", svg);
  const strokes = gsap.utils.toArray(".shape > *", svg);
  const fills   = gsap.utils.toArray("[data-fill]", svg);

  /* ------------------------------ анимаци ------------------------------ */
  const mm = gsap.matchMedia();

  mm.add(
    { reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" },
    (ctx) => {
      const { reduce } = ctx.conditions;

      const frame = gsap.utils.toArray(".photo-frame > *");
      const copy = [".hero .eyebrow", ".hero .title", ".hero .lead", ".hero .scroll-hint"];

      if (reduce) {
        // Хөдөлгөөн багасгах: шууд бүрэн зурсан байдлаар харуулна.
        gsap.set([strokes, frame], { drawSVG: "0% 100%" });
        gsap.set([fills, ".photo-frame [data-fill]"], { fillOpacity: 1 });
        gsap.set([copy, ".hero-photo img", ".hero-photo figcaption"], { autoAlpha: 1 });
        return;
      }

      /* Зургийн хүрээ зурагдаж, зураг гарч ирнэ (нэг л удаа). */
      gsap.timeline({ delay: 0.3, defaults: { ease: "power2.inOut" } })
        .from(frame, { drawSVG: "0% 0%", duration: 1.1, stagger: 0.15 })
        .to(".photo-frame [data-fill]", { fillOpacity: 1, duration: 0.5 }, "-=0.4")
        .from(".hero-photo img", { autoAlpha: 0, scale: 0.94, duration: 0.9, ease: "power3.out" }, 0.5)
        .from(".hero-photo figcaption", { autoAlpha: 0, y: 10, duration: 0.5, ease: "power2.out" }, "-=0.3")
        .add(startFrameOrbit, "-=0.2");

      /* MotionPath: хүрээний дагуу дүрсүүд тойрон урсана. */
      function startFrameOrbit() {
        const frameSvg = document.querySelector(".photo-frame");
        const rect = frameSvg && frameSvg.querySelector(".pf-rect");
        if (!rect) return;

        // Дөрвөлжин хүрээг path болгож хөрвүүлнэ (MotionPath зам болгон ашиглана).
        const framePath = MotionPathPlugin.convertToPath(rect)[0];

        // Тойрох дүрсүүд: шар дугуй (том, удаан), хөх ромб, хөх цагираг, жижиг шар дугуй.
        frameSvg.insertAdjacentHTML("beforeend", `
          <g class="pf-orbit pf-o1"><rect x="-8" y="-8" width="16" height="16" fill="${P.navy}"/></g>
          <g class="pf-orbit pf-o2"><circle r="8" fill="none" stroke="${P.navy}" stroke-width="3.5"/></g>
          <g class="pf-orbit pf-o3"><circle r="6" fill="${P.yellow}"/></g>`);

        const orbit = (target, duration, start, extra = {}) =>
          gsap.to(target, {
            duration,
            repeat: -1,
            ease: "none",
            motionPath: { path: framePath, align: framePath, alignOrigin: [0.5, 0.5], start, end: start + 1, ...extra },
          });

        gsap.set(".pf-o1 rect", { rotation: 45, transformOrigin: "50% 50%" });
        gsap.from(".pf-orbit", { autoAlpha: 0, scale: 0, duration: 0.6, ease: "back.out(2)", stagger: 0.1, transformOrigin: "50% 50%" });

        orbit(".pf-circle", 28, 0.12);                        // том шар дугуй: удаан тойрно
        orbit(".pf-o1", 16, 0.55, { autoRotate: true });      // ромб: замын дагуу эргэнэ
        orbit(".pf-o2", 22, 0.8);
        orbit(".pf-o3", 11, 0.3);
      }

      /* Зурах ↔ арилгах давталттай timeline */
      const draw = gsap.timeline({ repeat: -1, repeatDelay: 5 });

      draw
        .addLabel("draw")
        // 1. Stroke-ууд эхнээсээ зурагдана.
        .fromTo(strokes,
          { drawSVG: "0% 0%" },
          { drawSVG: "0% 100%", duration: 1.4, ease: "power2.inOut", stagger: { each: 0.05, from: "random" } },
          "draw")
        // 2. Дүүргэлт аажмаар орж ирнэ.
        .to(fills, { fillOpacity: 1, duration: 0.8, ease: "power1.out", stagger: 0.04 }, "draw+=1.2")
        // 3. Зурагдсан байдлаараа хэсэг хугацаанд үлдэнэ (энэ үед MotionPath урсгал үргэлжилнэ).
        .addLabel("erase", "draw+=6.5")
        // 4. Арилах: дүүргэлт алга болж, stroke-ууд төгсгөл рүүгээ "хумигдана".
        .to(fills, { fillOpacity: 0, duration: 0.5, ease: "power1.in" }, "erase")
        .to(strokes, {
          drawSVG: "100% 100%",
          duration: 1,
          ease: "power2.inOut",
          stagger: { each: 0.03, from: "random" },
        }, "erase+=0.1");

      /* MotionPath урсгал: дүрс бүр өөрийн байрлалыг тойрсон зөөлөн гогцоо замаар хөвнө.
         Зам нь харьцангуй цэгүүд (x, y) тул дүрс анхны байрлалаасаа ±R хүрээнд хөдөлнө. */
      groups.forEach((g, i) => {
        const R = 18 + (i % 4) * 8;                 // гогцооны радиус
        const dir = i % 2 ? 1 : -1;                 // ээлжлэн цагийн зүү / эсрэг
        const loop = [
          { x: 0,        y: 0 },
          { x: R * dir,  y: -R * 0.6 },
          { x: R * 0.4 * dir, y: -R * 1.4 },
          { x: -R * 0.8 * dir, y: -R * 0.9 },
          { x: -R * 0.5 * dir, y: R * 0.3 },
          { x: 0,        y: 0 },
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
      gsap.to(".scroll-hint span", {
        y: 14,
        autoAlpha: 0,
        duration: 1.1,
        ease: "power1.in",
        repeat: -1,
        repeatDelay: 0.3,
      });

      return () => draw.kill();
    }
  );
})();
