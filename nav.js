/* =====================================================================
   NAVIGATION — DrawSVG + MotionPath, сургуулийн логоны өнгөөр
   ---------------------------------------------------------------------
   1. Лого тэмдэг (тойрог, хөх/шар хагас, бамбай) stroke-оор зурагдана.
   2. Цэсийн ард долгион зам зурагдаж, түүгээр геометр дүрсүүд
      (шар дугуй, хөх ромб, шар цагираг) MotionPath-аар тасралтгүй хөдөлнө.
   3. Холбоос дээр hover хийхэд доогуур шар зураас DrawSVG-ээр зурагдана.
   4. Баруун талын жижиг дүрсүүд ээлжлэн зурагдаж, аажим эргэнэ.
   ===================================================================== */

gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin);

(function initNav() {
  const nav = document.getElementById("topbar");
  const art = document.getElementById("nav-art");
  if (!nav || !art) return;

  const NAVY = "#1E3A8F";
  const GOLD = "#FFC20E";
  const SVG_NS = "http://www.w3.org/2000/svg";

  /* --------------------- долгион зам (өргөнөөс хамаарна) --------------------- */
  let wave, travelers = [], travelTweens = [];

  function buildArt() {
    const W = nav.clientWidth;
    const H = nav.clientHeight;
    art.setAttribute("viewBox", `0 0 ${W} ${H}`);

    // Долгион: цэсийн доод ирмэгийн дагуу, 160px тутамд нэг давалгаа.
    const base = H - 10;
    const amp = 6;
    const seg = 160;
    let d = `M-20,${base}`;
    for (let x = -20; x < W + seg; x += seg) {
      d += ` Q${x + seg / 4},${base - amp} ${x + seg / 2},${base}`
         + ` T${x + seg},${base}`;
    }

    art.innerHTML = `
      <path id="nav-wave" d="${d}" fill="none" stroke="${NAVY}" stroke-opacity="0.22" stroke-width="2"/>
      <g class="tr tr-dot"><circle r="5" fill="${GOLD}"/></g>
      <g class="tr tr-diamond"><rect x="-5" y="-5" width="10" height="10" fill="${NAVY}"/></g>
      <g class="tr tr-ring"><circle r="5" fill="none" stroke="${GOLD}" stroke-width="2.5"/></g>
    `;

    wave = art.querySelector("#nav-wave");
    travelers = gsap.utils.toArray(".tr", art);
  }

  /* ------------------------------ анимаци ------------------------------ */
  const mm = gsap.matchMedia();

  mm.add(
    { reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" },
    (ctx) => {
      const { reduce } = ctx.conditions;
      buildArt();

      const mark  = gsap.utils.toArray(".brand-mark > *", nav);
      const fills = gsap.utils.toArray(".brand-mark [fill-opacity]", nav);

      if (reduce) {
        gsap.set([mark, wave], { drawSVG: "0% 100%" });
        gsap.set(fills, { fillOpacity: 1 });
        gsap.set(travelers, { autoAlpha: 0 });
        return;
      }

      /* 1–2. Лого, долгион зурагдаж, баруун талын "2026" гарч ирнэ. */
      const enter = gsap.timeline({ defaults: { ease: "power2.inOut" } });
      enter
        .from(mark, { drawSVG: "0% 0%", duration: 0.9, stagger: 0.15 })
        .to(fills, { fillOpacity: 1, duration: 0.5, ease: "power1.out", stagger: 0.06 }, "-=0.3")
        .from(wave, { drawSVG: "0% 0%", duration: 1.6, ease: "power1.inOut" }, 0.2)
        .from(".nav-year .tile", {
          scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(1.6)",
          stagger: { each: 0.015, from: "start" },
        }, 0.5)
        .from(".brand-text, .nav-links li", { autoAlpha: 0, y: 8, duration: 0.5, stagger: 0.08, ease: "power2.out" }, 0.4);

      /* 2. MotionPath: дүрсүүд долгионыг дагаж тасралтгүй хөдөлнө. */
      function startTravel() {
        travelTweens.forEach((t) => t.kill());
        travelTweens = travelers.map((el, i) =>
          gsap.to(el, {
            duration: 14 + i * 4,
            repeat: -1,
            ease: "none",
            delay: -i * 5,               // өөр өөр цэгээс эхэлнэ
            motionPath: {
              path: wave,
              align: wave,
              alignOrigin: [0.5, 0.5],
              autoRotate: i === 1,       // ромб зам дагуу эргэнэ
            },
          })
        );
        // Ромб 45° эргэсэн байдлаар харагдана.
        gsap.set(".tr-diamond rect", { rotation: 45, transformOrigin: "50% 50%" });
      }
      startTravel();

      /* Цонхны хэмжээ өөрчлөгдвөл замыг дахин байгуулна. */
      let resizeTimer;
      const onResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { buildArt(); startTravel(); }, 150);
      };
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
        travelTweens.forEach((t) => t.kill());
        enter.kill();
      };
    }
  );

  /* 3. Hover: доогуур зураас зурагдана / арилна. */
  gsap.utils.toArray(".nav-links a", nav).forEach((link) => {
    const path = link.querySelector(".ul path");
    if (!path) return;
    gsap.set(path, { drawSVG: link.classList.contains("is-active") ? "0% 100%" : "0% 0%" });

    link.addEventListener("mouseenter", () => {
      gsap.to(path, { drawSVG: "0% 100%", duration: 0.45, ease: "power2.out", overwrite: true });
    });
    link.addEventListener("mouseleave", () => {
      if (link.classList.contains("is-active")) return;
      gsap.to(path, { drawSVG: "100% 100%", duration: 0.35, ease: "power2.in", overwrite: true });
    });
  });

  /* Гүйлгэх үед идэвхтэй холбоосыг солино. */
  const links = gsap.utils.toArray(".nav-links a", nav);
  function setActive(hash) {
    links.forEach((l) => {
      const on = l.getAttribute("href") === hash;
      l.classList.toggle("is-active", on);
      const path = l.querySelector(".ul path");
      if (path) gsap.to(path, { drawSVG: on ? "0% 100%" : "0% 0%", duration: 0.4, overwrite: true });
    });
  }
  links.forEach((l) => l.addEventListener("click", () => setActive(l.getAttribute("href"))));

  if (window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    /* Зөвхөн цэсэнд байгаа гурван хэсэг идэвхтэй холбоосыг сольно. */
    ["#hero", "#schedule", "#results"].forEach((id) => {
      if (!document.querySelector(id)) return;
      ScrollTrigger.create({
        trigger: id,
        start: "top 50%",
        end: "bottom 50%",
        onToggle: (self) => { if (self.isActive) setActive(id); },
      });
    });
  }
})();
