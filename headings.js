/* =====================================================================
   HEADINGS — section гарчгуудыг геометр дүрсээр чимэглэнэ
   ---------------------------------------------------------------------
   .section-inner доторх .h2 бүрийг олж, зүүн/баруун талд нь жижиг
   геометр дүрс, доор нь долгион зураас нэмнэ. Гурван хувилбар ээлжилнэ.
   Section дэлгэцэнд орж ирэхэд DrawSVG-ээр зурагдаж, дүүргэлт орж ирнэ,
   дараа нь зарим дүрс аажим эргэнэ.

   Өнгө CSS-ээр: .oa = хөх (section-3 дээр цагаан), .ob = шар, .ln = зөвхөн stroke
   ===================================================================== */

gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);

(function initHeadings() {
  const heads = gsap.utils.toArray(".section-inner .h2");
  if (!heads.length) return;

  /* Дүрсийн хувилбарууд (viewBox 0 0 80 80) */
  const VARIANTS = [
    {
      left: `
        <path class="oa ln" d="M8,72 A64,64 0 0 1 72,8"/>
        <path class="oa ln" d="M26,72 A46,46 0 0 1 72,26"/>
        <path class="oa ln" d="M44,72 A28,28 0 0 1 72,44"/>
        <circle class="ob fl spin" cx="66" cy="66" r="7"/>`,
      right: `
        <polygon class="oa ln spin" points="40,8 72,40 40,72 8,40"/>
        <circle class="ob fl" cx="40" cy="40" r="9"/>`,
    },
    {
      left: `
        <path class="ob fl" d="M40,6 Q40,40 74,40 Q40,40 40,74 Q40,40 6,40 Q40,40 40,6 Z"/>
        <circle class="oa ln spin" cx="40" cy="40" r="30"/>`,
      right: `
        <line class="oa ln" x1="10" y1="70" x2="70" y2="10"/>
        <line class="oa ln" x1="10" y1="46" x2="46" y2="10"/>
        <line class="oa ln" x1="34" y1="70" x2="70" y2="34"/>
        <circle class="ob ln spin" cx="62" cy="62" r="10"/>`,
    },
    {
      left: `
        <path class="oa ln" d="M8,44 A32,32 0 0 1 72,44"/>
        <path class="oa ln" d="M22,44 A18,18 0 0 1 58,44"/>
        <circle class="ob fl" cx="40" cy="44" r="5"/>
        <line class="oa ln" x1="8" y1="60" x2="72" y2="60"/>`,
      right: `
        <polyline class="ob ln" points="6,56 20,30 34,56 48,30 62,56 74,30"/>
        <rect class="oa fl spin" x="30" y="6" width="16" height="16"/>`,
    },
  ];

  const underline = `<path class="ob ln" d="M2,7 Q17,1 32,7 T62,7 T92,7 T122,7 T152,7"/>`;

  heads.forEach((h2, i) => {
    const v = VARIANTS[i % VARIANTS.length];
    const wrap = document.createElement("div");
    wrap.className = "heading";
    h2.parentNode.insertBefore(wrap, h2);
    wrap.innerHTML = `
      <div class="heading-row">
        <svg class="hd-orn hd-left" viewBox="0 0 80 80" aria-hidden="true">${v.left}</svg>
        <div class="hd-title"></div>
        <svg class="hd-orn hd-right" viewBox="0 0 80 80" aria-hidden="true">${v.right}</svg>
      </div>
      <svg class="hd-ul" viewBox="0 0 154 12" aria-hidden="true">${underline}</svg>`;
    wrap.querySelector(".hd-title").appendChild(h2);
  });

  /* ------------------------------ анимаци ------------------------------ */
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  gsap.utils.toArray(".heading").forEach((wrap) => {
    const strokes = gsap.utils.toArray(".hd-orn .ln, .hd-ul path", wrap);
    const fills   = gsap.utils.toArray(".hd-orn .fl", wrap);
    const spins   = gsap.utils.toArray(".hd-orn .spin", wrap);
    const section = wrap.closest("section, header") || wrap;

    if (reduce) {
      gsap.set(strokes, { drawSVG: "0% 100%" });
      gsap.set(fills, { autoAlpha: 1 });
      return;
    }

    gsap.timeline({
      scrollTrigger: { trigger: wrap, start: "top 80%", toggleActions: "play none none reverse" },
      defaults: { ease: "power2.inOut" },
    })
      .from(strokes, { drawSVG: "0% 0%", duration: 0.9, stagger: 0.07 })
      .from(fills, { autoAlpha: 0, scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2)", stagger: 0.1 }, "-=0.5")
      .from(wrap.querySelectorAll(".hd-orn"), { x: (i) => (i ? 16 : -16), duration: 0.8, ease: "power3.out" }, 0);

    /* Тэмдэглэсэн дүрсүүд аажим эргэнэ (section дэлгэцэнд байхад л). */
    if (spins.length) {
      const spin = gsap.to(spins, {
        rotation: "+=360",
        transformOrigin: "50% 50%",
        duration: 18,
        ease: "none",
        repeat: -1,
        paused: true,
      });
      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? spin.play() : spin.pause()),
      });
    }
  });
})();
