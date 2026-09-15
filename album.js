/* =====================================================================
   АЛБУМ — Маам багштай холбоотой зургийн слайд
   ---------------------------------------------------------------------
   - Слайд солигдох бүрт тухайн зургийн тайлбар өгүүлбэр (data-caption)
     SplitText-ээр үг үгээр гарч ирнэ.
   - Зураг: гарах нь зүүн/баруун тийш бүдгэрч, орох нь бага зэрэг
     томорсон байдлаас жинхэнэ хэмжээндээ ирнэ (Ken Burns маягийн).
   - Автоматаар 6 секунд тутам солигдоно; hover хийхэд зогсоно.
   - Өмнөх/дараах товч, цэгүүд, доод шар progress зураас.
   ===================================================================== */

gsap.registerPlugin(SplitText);

(function initAlbum() {
  const stage   = document.getElementById("album-stage");
  const caption = document.getElementById("album-caption");
  const dotsBox = document.getElementById("album-dots");
  const bar     = document.getElementById("album-bar");
  const prevBtn = document.getElementById("album-prev");
  const nextBtn = document.getElementById("album-next");
  if (!stage || !caption) return;

  const slides = gsap.utils.toArray(".slide", stage);
  if (!slides.length) return;

  const AUTOPLAY = 6;           // секунд
  let index = 0;
  let split = null;
  let busy = false;
  let progress = null;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Цэгүүд */
  const dots = slides.map((_, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", `${i + 1}-р зураг`);
    b.addEventListener("click", () => go(i));
    dotsBox.appendChild(b);
    return b;
  });

  /* Эхний төлөв */
  gsap.set(slides, { autoAlpha: 0, xPercent: 0, scale: 1 });
  gsap.set(slides[0], { autoAlpha: 1 });
  slides[0].classList.add("is-active");
  dots[0].classList.add("is-active");
  showCaption(slides[0].dataset.caption || "");
  startProgress();

  /* Тайлбар өгүүлбэрийг үг үгээр гаргана. */
  function showCaption(text) {
    if (split) { split.revert(); split = null; }
    caption.textContent = text;
    if (reduce || typeof SplitText === "undefined") return;
    split = SplitText.create(caption, { type: "words", wordsClass: "w" });
    gsap.from(split.words, {
      autoAlpha: 0,
      y: 14,
      duration: 0.5,
      ease: "power2.out",
      stagger: 0.045,
    });
  }

  /* Доод progress зураас: дуусахад дараагийн слайд. */
  function startProgress() {
    if (progress) progress.kill();
    if (reduce) return;
    progress = gsap.fromTo(bar, { scaleX: 0 }, {
      scaleX: 1,
      transformOrigin: "left center",
      duration: AUTOPLAY,
      ease: "none",
      onComplete: () => go(index + 1, 1),
    });
  }

  /* Слайд солих */
  function go(to, dir) {
    const next = gsap.utils.wrap(0, slides.length, to);
    if (next === index || busy) return;
    dir = dir || (next > index ? 1 : -1);
    busy = true;

    const cur = slides[index];
    const nxt = slides[next];
    index = next;

    dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
    cur.classList.remove("is-active");
    nxt.classList.add("is-active");

    const tl = gsap.timeline({
      defaults: { duration: reduce ? 0 : 0.9, ease: "power3.inOut" },
      onComplete: () => { busy = false; startProgress(); },
    });

    tl.to(cur, { autoAlpha: 0, xPercent: -10 * dir, scale: 1.04 }, 0)
      .fromTo(nxt,
        { autoAlpha: 0, xPercent: 12 * dir, scale: 1.08 },
        { autoAlpha: 1, xPercent: 0, scale: 1 }, 0)
      .set(cur, { xPercent: 0, scale: 1 })
      .add(() => showCaption(nxt.dataset.caption || ""), 0.35);

    if (progress) progress.kill();
  }

  prevBtn && prevBtn.addEventListener("click", () => go(index - 1, -1));
  nextBtn && nextBtn.addEventListener("click", () => go(index + 1, 1));

  /* Hover / focus үед автомат гүйлтийг зогсооно. */
  const album = stage.closest(".album");
  if (album && progress) {
    album.addEventListener("mouseenter", () => progress && progress.pause());
    album.addEventListener("mouseleave", () => progress && progress.play());
    album.addEventListener("focusin",  () => progress && progress.pause());
    album.addEventListener("focusout", () => progress && progress.play());
  }

  /* Гарын сум */
  album && album.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft")  go(index - 1, -1);
    if (e.key === "ArrowRight") go(index + 1, 1);
  });
})();
