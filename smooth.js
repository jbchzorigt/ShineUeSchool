/* =====================================================================
   SMOOTH SCROLL — GSAP ScrollSmoother
   ---------------------------------------------------------------------
   - #smooth-wrapper > #smooth-content бүтцийг зөөлөн гүйлгэнэ.
   - Fixed nav нь wrapper-ийн гадна тул хэвийн ажиллана.
   - "#id" холбоосууд (цэс, лого, 2026, гүйлгэх зөвлөмж) smoother.scrollTo-оор
     nav-ийн өндрийг тооцон зөөлөн очно.
   - Хөдөлгөөн багасгах тохиргоотой үед ScrollSmoother үүсгэхгүй,
     энгийн гүйлгэлт хэвээр үлдэнэ.
   ===================================================================== */

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

(function initSmooth() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const navH = () => (document.getElementById("topbar") || {}).offsetHeight || 72;
  let smoother = null;

  if (!reduce && document.getElementById("smooth-wrapper")) {
    smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.2,          // гүйлгэлтийг хэдэн секундэд "гүйцэх" вэ
      effects: false,       // data-speed эффектийг ашиглахгүй (formulas.js өөрөө хийдэг)
      smoothTouch: 0.1,     // утсан дээр бага зэрэг зөөлрүүлнэ
      normalizeScroll: false,
    });
  }

  /* "#id" холбоосуудыг зөөлөн гүйлгэлттэй болгоно. */
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();

    if (smoother) {
      smoother.scrollTo(target, true, `top ${navH()}px`);
    } else {
      const y = target.getBoundingClientRect().top + window.scrollY - navH();
      window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    }
    history.replaceState(null, "", id);
  });

  /* Хуудас #id-тэй нээгдсэн бол тэр хэсэг рүү очно. */
  if (location.hash && smoother) {
    const target = document.querySelector(location.hash);
    if (target) requestAnimationFrame(() => smoother.scrollTo(target, false, `top ${navH()}px`));
  }

  window.__smoother = smoother;   // бусад скрипт хэрэгтэй бол ашиглана
})();
