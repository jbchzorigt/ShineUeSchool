/* =====================================================================
   FORMULAS — section бүрийн математикийн томъёо (6–12-р анги)
   ---------------------------------------------------------------------
   HTML дээр:
     <div class="formula f2-a" data-tex="a^2 + b^2 = c^2"
          data-grade="8-р анги" data-speed="1.2"></div>

   - data-tex   : KaTeX-ээр зурагдах LaTeX томъёо
   - data-grade : жижиг шошго (аль ангийн томъёо вэ)
   - data-speed : parallax хурд (1 = дундаж; их бол хурдан хөдөлнө)

   Анимаци:
   1. Section дэлгэцэнд орж ирэхэд томъёо доороос гарч ирж, доогуур
      шар зураас DrawSVG-ээр зурагдана.
   2. Гүйлгэх явцад parallax-аар өөр өөр хурдтай хөдөлж, бага зэрэг эргэнэ.
   3. Тайван "хөвөх" давталт.
   ===================================================================== */

gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);

(function initFormulas() {
  const items = gsap.utils.toArray(".formula");
  if (!items.length || typeof katex === "undefined") return;

  /* 1. KaTeX-ээр томъёог зурж, шошго ба доогуур зураас нэмнэ. */
  items.forEach((el, i) => {
    const tex = el.dataset.tex || "";
    const grade = el.dataset.grade || "";
    let html = "";
    try {
      html = katex.renderToString(tex, { throwOnError: false, displayMode: false });
    } catch (e) {
      html = `<code>${tex}</code>`;
    }
    el.innerHTML = `
      <span class="fx-math">${html}</span>
      ${grade ? `<span class="fx-grade">${grade}</span>` : ""}
      <svg class="fx-ul" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
        <path d="M2,6 Q25,2 50,6 T98,6"/>
      </svg>`;
    // Бага зэрэг ээлжлэн налуулна (-6 … 6 градус).
    el.style.setProperty("--tilt", `${(i % 3 - 1) * 4}deg`);
  });

  /* 2. GSAP анимаци */
  const mm = gsap.matchMedia();

  mm.add(
    { reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" },
    (ctx) => {
      const { reduce } = ctx.conditions;

      if (reduce) {
        gsap.set(items, { autoAlpha: 1 });
        gsap.set(".fx-ul path", { drawSVG: "0% 100%" });
        return;
      }

      // Section тус бүрээр бүлэглэнэ.
      const sections = new Map();
      items.forEach((el) => {
        const sec = el.closest("section, header");
        if (!sections.has(sec)) sections.set(sec, []);
        sections.get(sec).push(el);
      });

      sections.forEach((els, sec) => {
        /* Орж ирэх: доороос гарч ирж, доогуур зураас зурагдана. */
        const enter = gsap.timeline({
          scrollTrigger: {
            trigger: sec,
            start: "top 65%",
            toggleActions: "play none none reverse",
          },
          defaults: { ease: "power3.out" },
        });
        enter
          .from(els, { autoAlpha: 0, y: 40, scale: 0.85, duration: 0.8, stagger: 0.12 })
          .from(els.map((e) => e.querySelector(".fx-ul path")), {
            drawSVG: "0% 0%", duration: 0.6, ease: "power2.inOut", stagger: 0.12,
          }, "-=0.5")
          .from(els.map((e) => e.querySelector(".fx-grade")), {
            autoAlpha: 0, x: -8, duration: 0.4, stagger: 0.12,
          }, "-=0.6");

        /* Parallax: гүйлгэх явцад өөр өөр хурдтай хөдөлж, бага зэрэг эргэнэ. */
        els.forEach((el) => {
          const speed = parseFloat(el.dataset.speed || "1");
          gsap.to(el, {
            yPercent: -60 * speed,
            rotation: (speed - 1) * 14,
            ease: "none",
            scrollTrigger: {
              trigger: sec,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.2,
            },
          });
        });

        /* Тайван хөвөх давталт (math хэсэг дээр). */
        gsap.to(els.map((e) => e.querySelector(".fx-math")), {
          y: -6,
          duration: 2.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: { each: 0.35, from: "random" },
        });
      });
    }
  );
})();
