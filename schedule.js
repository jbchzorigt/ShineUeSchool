/* =====================================================================
   ХУВААРЬ — "могой" (snake) timeline, оноор (2024, 2025, 2026)
   ---------------------------------------------------------------------
   Санаа: codepen.io/alvarotrigo/pen/MWEgejK ("Creative Timeline").
   Шатууд мөр мөрөөр байрлаж, нэг нимгэн шугам мөрийн дагуу явж, мөрийн
   төгсгөлд дугуй булангаар доош эргээд дараагийн мөрөөр буцаж явна.

   Энд шугамыг нэг SVG path болгон JS-ээр тооцоолж зурдаг тул:
   - гүйлгэх явцад DrawSVG-ээр scrub хэлбэрээр зурагдана,
   - шугамын үзүүрээр жижиг цэг MotionPath-аар дагаж явна,
   - цонхны хэмжээ өөрчлөгдөхөд дахин тооцоолно.

   SCHEDULES объектод жил бүрийн шатуудыг оруулна. Шат бүр:
     { date: "2026 · 10 сарын 1–20", title: "Бүртгэл", text: "...", tags: ["..."] }
   ===================================================================== */

/* ⚠ Жишээ мэдээлэл — бодит хуваариар солино уу. */
const SCHEDULES = {
  "2024": [
    { date: "2024 · 10 сарын 2–18", title: "Бүртгэл", text: "6–12-р ангийн сурагчдын бүртгэл онлайнаар явагдсан.", tags: ["6–12-р анги", "Онлайн"] },
    { date: "2024 · 11 сарын 9",    title: "I шат — Сургуулийн", text: "Сургууль бүр дээрээ явагдсан. Анги бүрээс шилдэг 5 сурагч шалгарсан.", tags: ["90 минут", "5 бодлого"] },
    { date: "2024 · 12 сарын 14",   title: "II шат — Дүүргийн", text: "Дүүргийн шилдгүүд өрсөлдөж, бүлэг тус бүрээс 10 сурагч шалгарсан.", tags: ["120 минут", "6 бодлого"] },
    { date: "2025 · 2 сарын 22",    title: "III шат — Шигшээ", text: "Ү.Маамын нэрэмжит шигшээ олимпиад Шинэ Үе сургууль дээр явагдсан.", tags: ["180 минут", "4 бодлого"] },
    { date: "2025 · 3 сарын 8",     title: "Шагнал гардуулах ёслол", text: "Анги бүрийн эхний 3 байр медаль, өргөмжлөлөөр шагнагдсан.", tags: ["Медаль", "Өргөмжлөл"] },
  ],
  "2025": [
    { date: "2025 · 10 сарын 1–17", title: "Бүртгэл", text: "6–12-р ангийн сурагчдын бүртгэл онлайнаар явагдсан.", tags: ["6–12-р анги", "Онлайн"] },
    { date: "2025 · 11 сарын 8",    title: "I шат — Сургуулийн", text: "Сургууль бүр дээрээ явагдсан. Анги бүрээс шилдэг 5 сурагч шалгарсан.", tags: ["90 минут", "5 бодлого"] },
    { date: "2025 · 12 сарын 13",   title: "II шат — Дүүргийн", text: "Дүүргийн шилдгүүд өрсөлдөж, бүлэг тус бүрээс 10 сурагч шалгарсан.", tags: ["120 минут", "6 бодлого"] },
    { date: "2026 · 2 сарын 21",    title: "III шат — Шигшээ", text: "Ү.Маамын нэрэмжит шигшээ олимпиад Шинэ Үе сургууль дээр явагдсан.", tags: ["180 минут", "4 бодлого"] },
    { date: "2026 · 3 сарын 7",     title: "Шагнал гардуулах ёслол", text: "Анги бүрийн эхний 3 байр медаль, өргөмжлөлөөр шагнагдсан.", tags: ["Медаль", "Өргөмжлөл"] },
  ],
  "2026": [
    { date: "2026 · 10 сарын 1–20", title: "Бүртгэл", text: "Сургууль бүр 6–12-р ангийн сурагчдаа бүртгүүлнэ. Бүртгэл онлайнаар явагдана.", tags: ["6–12-р анги", "Онлайн"] },
    { date: "2026 · 11 сарын 7",    title: "I шат — Сургуулийн", text: "Сургууль бүр дээрээ явагдана. Анги бүрээс шилдэг 5 сурагч дараагийн шатанд шалгарна.", tags: ["90 минут", "5 бодлого"] },
    { date: "2026 · 12 сарын 12",   title: "II шат — Дүүргийн", text: "Дүүргийн сургуулиудын шилдгүүд өрсөлдөнө. Ангийн бүлэг тус бүрээс 10 сурагч шалгарна.", tags: ["120 минут", "6 бодлого"] },
    { date: "2027 · 2 сарын 20",    title: "III шат — Шигшээ", text: "Ү.Маамын нэрэмжит шигшээ олимпиад. Шинэ Үе сургууль дээр явагдана.", tags: ["180 минут", "4 бодлого"] },
    { date: "2027 · 3 сарын 6",     title: "Шагнал гардуулах ёслол", text: "Анги бүрийн эхний 3 байр медаль, өргөмжлөлөөр шагнагдана. Үр дүн доорх хэсэгт нийтлэгдэнэ.", tags: ["Медаль", "Өргөмжлөл"] },
  ],
};
const CURRENT_YEAR = "2026";   // энэ оноос өмнөх жилүүд "Явагдсан" гэж тэмдэглэгдэнэ

/* Өнгөний палитр: шат бүр ээлжлэн нэг өнгө авна. */
const TL_COLORS = ["#FF3F33", "#9FC87E", "#FF9800", "#FF6666"];

gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin, ScrollTrigger);

(function initSchedule() {
  const snake   = document.getElementById("snake");
  const yearBox = document.getElementById("schedule-years");
  if (!snake || !yearBox) return;

  const svg  = snake.querySelector(".snake-svg");
  const path = svg.querySelector(".snake-path");
  const tip  = svg.querySelector(".snake-tip");
  const rowsBox = snake.querySelector(".snake-rows");

  const years  = Object.keys(SCHEDULES).sort();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const R = 44;            // булангийн радиус
  const LINE_Y = 26;       // мөрийн дээд ирмэгээс шугам хүртэлх зай (огнооны шошго энд суух)
  let current = null;
  let triggers = [];
  let scrubTriggers = [];

  /* Оны табууд */
  const tabs = years.map((y) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.textContent = y;
    b.addEventListener("click", () => show(y, true));
    yearBox.appendChild(b);
    return b;
  });

  /* Мөрөнд хэдэн шат багтах вэ (responsive) */
  const perRow = () => (innerWidth < 640 ? 1 : innerWidth < 1024 ? 2 : 3);

  /* ---------------------- HTML үүсгэх ---------------------- */
  function build(year) {
    const past = Number(year) < Number(CURRENT_YEAR);
    const n = perRow();
    const items = SCHEDULES[year];
    let html = "";
    for (let r = 0; r * n < items.length; r++) {
      html += `<div class="snake-row${r % 2 ? " is-rev" : ""}">`;
      items.slice(r * n, r * n + n).forEach((s, j) => {
        const i = r * n + j;
        const [yr, rest] = s.date.split(" · ");
        html += `
          <article class="snake-item" style="--tl-c: ${TL_COLORS[i % TL_COLORS.length]}">
            <div class="snake-date"><span class="snake-date-big">${rest || s.date}</span><span class="snake-date-yr">${yr || ""}</span></div>
            <div class="snake-card">
              <span class="snake-step">${i + 1}-р шат${past ? " · явагдсан" : ""}</span>
              <h3>${s.title}</h3>
              <p>${s.text}</p>
              <ul class="tl-tags">${s.tags.map((t) => `<li>${t}</li>`).join("")}</ul>
            </div>
          </article>`;
      });
      html += `</div>`;
    }
    rowsBox.innerHTML = html;
  }

  /* -------------------- Могой замыг тооцоолох -------------------- */
  function buildPath() {
    const box = snake.getBoundingClientRect();
    const W = box.width, H = box.height;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    const rows = gsap.utils.toArray(".snake-row", rowsBox);
    if (!rows.length) return;

    const cx = (el) => { const r = el.getBoundingClientRect(); return r.left - box.left + r.width / 2; };
    const rowY = (row) => row.getBoundingClientRect().top - box.top + LINE_Y;
    const xR = W - 12, xL = 12;   // мөрийн төгсгөлд шугам хаана эргэх вэ

    let d = "";
    rows.forEach((row, i) => {
      const items = gsap.utils.toArray(".snake-item", row);
      const y = rowY(row);
      const rev = i % 2 === 1;                  // сондгой мөр: баруунаас зүүн тийш
      const first = cx(items[0]);
      const last  = cx(items[items.length - 1]);
      const isLast = i === rows.length - 1;

      if (i === 0) d += `M${first},${y}`;

      if (isLast) {
        d += ` L${last},${y}`;                  // сүүлийн мөр: сүүлийн шат дээр зогсоно
      } else {
        const ny = rowY(rows[i + 1]);
        if (!rev) {
          // зүүнээс баруун → баруун талд доош эргэнэ
          d += ` L${xR - R},${y} Q${xR},${y} ${xR},${y + R} L${xR},${ny - R} Q${xR},${ny} ${xR - R},${ny}`;
        } else {
          // баруунаас зүүн → зүүн талд доош эргэнэ
          d += ` L${xL + R},${y} Q${xL},${y} ${xL},${y + R} L${xL},${ny - R} Q${xL},${ny} ${xL + R},${ny}`;
        }
      }
    });
    path.setAttribute("d", d);

    // Эхлэл/төгсгөлийн цэгүүд
    const startPt = path.getPointAtLength(0);
    const endPt   = path.getPointAtLength(path.getTotalLength());
    svg.querySelector(".snake-start").setAttribute("transform", `translate(${startPt.x},${startPt.y})`);
    svg.querySelector(".snake-end").setAttribute("transform", `translate(${endPt.x},${endPt.y})`);
  }

  /* --------------------------- Анимаци --------------------------- */
  function animate(instant) {
    triggers.forEach((t) => t.kill());
    scrubTriggers.forEach((t) => t.kill());
    triggers = []; scrubTriggers = [];

    if (reduce) {
      gsap.set(path, { drawSVG: "0% 100%" });
      gsap.set(tip, { autoAlpha: 0 });
      ScrollTrigger.refresh();
      return;
    }

    // 1. Шугам гүйлгэхтэй уялдан зурагдана, үзүүрийн цэг дагаж явна.
    const scrub = { trigger: snake, start: "top 70%", end: "bottom 55%", scrub: 0.6 };
    scrubTriggers.push(
      gsap.fromTo(path, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", ease: "none", scrollTrigger: scrub }).scrollTrigger,
      gsap.to(tip, {
        ease: "none",
        motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
        scrollTrigger: { ...scrub },
      }).scrollTrigger
    );

    // 2. Шат бүр: огноо, карт гарч ирнэ.
    gsap.utils.toArray(".snake-item", rowsBox).forEach((item, i) => {
      const anim = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } })
        .from(item.querySelector(".snake-date"), { scale: 0.6, autoAlpha: 0, duration: 0.5, ease: "back.out(2)", transformOrigin: "50% 50%" })
        .from(item.querySelector(".snake-card"), { autoAlpha: 0, y: 24, duration: 0.6 }, "-=0.25")
        .from(item.querySelectorAll(".tl-tags li"), { autoAlpha: 0, y: 6, duration: 0.3, stagger: 0.08 }, "-=0.3");

      if (instant) {
        anim.delay(i * 0.1).play();
      } else {
        triggers.push(ScrollTrigger.create({
          trigger: item,
          start: "top 78%",
          onEnter: () => anim.play(),
          onLeaveBack: () => anim.reverse(),
        }));
      }
    });
    ScrollTrigger.refresh();
  }

  function show(year, instant) {
    if (year === current) return;
    current = year;
    tabs.forEach((t, i) => t.classList.toggle("is-active", years[i] === year));
    build(year);
    buildPath();
    animate(instant);
  }

  /* Цонх өөрчлөгдвөл мөрийн тоо, замыг дахин тооцоолно. */
  let rt;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { const y = current; current = null; show(y, true); }, 200);
  });

  show(CURRENT_YEAR, false);
})();
