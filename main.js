/* =====================================================================
   "2026" — Bauhaus маягийн хавтан (tile) дүрсийг GSAP-аар амилуулах
   ---------------------------------------------------------------------
   1. Цифр бүр 3 багана × 5 мөр торон дээр зурагдана.
   2. Гадна талын дугуйрсан булан бүрт "arcs" (төвлөрсөн нум) хавтан очно.
   3. Бусад хавтанд санамсаргүй хээ сонгоно.
   4. GSAP timeline-аар оруулах анимаци, hover, хээ солих эффект хийнэ.
   ===================================================================== */

const TILE = 100;      // нэг хавтангийн хэмжээ (viewBox нэгж)
const GAP  = 1;        // цифр хоорондын зай (хавтангийн тоогоор)

const C = {
  orange: "#F26B2B",
  yellow: "#FFF200",
  blue:   "#0A63B2",
  green:  "#8CC63F",
  red:    "#BF1F2E",
  teal:   "#0B8A80",
  purple: "#8A2B8F",
  navy:   "#2C2F8F",
  amber:  "#F6A21E",
  pale:   "#EEF29A",
  white:  "#FFFFFF",
};
const ARC_COLORS = [C.orange, C.yellow, C.blue, C.green, C.red, C.teal, C.amber];

/* 3×5 тор: 1 = хавтан бий, 0 = хоосон */
const DIGITS = {
  "0": [
    [1,1,1],
    [1,0,1],
    [1,0,1],
    [1,0,1],
    [1,1,1],
  ],
  "2": [
    [1,1,1],
    [0,0,1],
    [1,1,1],
    [1,0,0],
    [1,1,1],
  ],
  "6": [
    [1,1,1],
    [1,0,0],
    [1,1,1],
    [1,0,1],
    [1,1,1],
  ],
};

const YEAR = "2026";

/* ----------------------------- туслах ------------------------------ */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pick2 = (arr) => {
  const a = pick(arr);
  let b = pick(arr);
  while (b === a) b = pick(arr);
  return [a, b];
};

/* ------------------------- хээний генераторууд ---------------------- */
/* Бүх хээ 0..100 локал координатад зурагдана. */

// Төвлөрсөн нум. corner = аль булан нь дугуйрах вэ (tl, tr, bl, br).
// Нумын төв нь эсрэг буланд байрлана.
function arcs(corner, color) {
  const cx = corner.includes("l") ? 100 : 0;
  const cy = corner.includes("t") ? 100 : 0;
  let s = `<circle cx="${cx}" cy="${cy}" r="9" fill="${color}"/>`;
  for (let r = 23; r <= 95; r += 14) {
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="8"/>`;
  }
  return s;
}

// Хагас тойрог нум — төв нь ирмэгийн дунд.
function halfArcs(color) {
  const side = pick(["l", "r", "t", "b"]);
  const cx = side === "l" ? 0 : side === "r" ? 100 : 50;
  const cy = side === "t" ? 0 : side === "b" ? 100 : 50;
  let s = `<circle cx="${cx}" cy="${cy}" r="8" fill="${color}"/>`;
  for (let r = 20; r <= 60; r += 13) {
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="7"/>`;
  }
  return s;
}

// Гурвалжин + диагональ зураас.
function stripes(color) {
  let s = `<polygon points="0,0 100,0 0,100" fill="${color}"/>`;
  for (let k = 14; k < 100; k += 14) {
    s += `<line x1="${k}" y1="100" x2="100" y2="${k}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`;
  }
  return s;
}

// Дөрөвний нэг дугуй + 2×2 цэгүүд.
function quarterDots(a, b) {
  const dots = (ox, oy, col) =>
    [12, 38].flatMap((dx) => [12, 38].map((dy) =>
      `<circle cx="${ox + dx}" cy="${oy + dy}" r="7" fill="${col}"/>`)).join("");
  return `
    <path d="M0,0 A50,50 0 0 1 50,50 L0,50 Z" fill="${a}"/>
    ${dots(50, 0, a)}
    ${dots(0, 50, b)}
    <path d="M100,100 A50,50 0 0 1 50,50 L100,50 Z" fill="${b}"/>`;
}

// Өнгөт дөрвөлжин дээр цагаан дугуй, 2×2.
function circles(a, b) {
  const cells = [[0,0,a],[50,0,b],[0,50,b],[50,50,a]];
  return cells.map(([x,y,col]) =>
    `<rect x="${x}" y="${y}" width="50" height="50" fill="${col}"/>
     <circle cx="${x+25}" cy="${y+25}" r="16" fill="${C.white}"/>`).join("");
}

// 4 үзүүрт од + дугуйтай дөрвөлжин, 2×2.
function stars(starCol, sqA, sqB) {
  const star = (x, y) =>
    `<path d="M${x+25},${y} Q${x+25},${y+25} ${x+50},${y+25} Q${x+25},${y+25} ${x+25},${y+50}
              Q${x+25},${y+25} ${x},${y+25} Q${x+25},${y+25} ${x+25},${y} Z" fill="${starCol}"/>`;
  const sq = (x, y, col) =>
    `<rect x="${x}" y="${y}" width="50" height="50" fill="${col}"/>
     <circle cx="${x+25}" cy="${y+25}" r="16" fill="${C.white}"/>`;
  return star(0,0) + sq(50,0,sqA) + sq(0,50,sqB) + star(50,50);
}

// Жижиг цэг + дугуйтай дөрвөлжин, 2×2.
function dotCircles(dotCol, sqA, sqB) {
  const sq = (x, y, col) =>
    `<rect x="${x}" y="${y}" width="50" height="50" fill="${col}"/>
     <circle cx="${x+25}" cy="${y+25}" r="16" fill="${C.white}"/>`;
  return `<circle cx="25" cy="25" r="8" fill="${dotCol}"/>` + sq(50,0,sqA) +
         sq(0,50,sqB) + `<circle cx="75" cy="75" r="8" fill="${dotCol}"/>`;
}

// Төвлөрсөн ромб.
function diamond(solid, outline) {
  let s = "";
  for (let c = 2; c <= 30; c += 9) {
    s += `<polygon points="50,${c} ${100-c},50 50,${100-c} ${c},50" fill="none" stroke="${outline}" stroke-width="5"/>`;
  }
  s += `<polygon points="50,30 70,50 50,70 30,50" fill="${solid}"/>`;
  return s;
}

// Төвлөрсөн цагираг.
function rings(color) {
  let s = `<circle cx="50" cy="50" r="6" fill="${color}"/>`;
  for (let r = 14; r <= 46; r += 8) {
    s += `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="4.5"/>`;
  }
  return s;
}

// Дөрвөн буланд дөрөвний нэг дугуй → дунд нь цагаан од үлдэнэ.
function petals(a, b) {
  return `
    <path d="M0,0 L50,0 A50,50 0 0 1 0,50 Z" fill="${a}"/>
    <path d="M100,0 L100,50 A50,50 0 0 1 50,0 Z" fill="${b}"/>
    <path d="M0,100 L0,50 A50,50 0 0 1 50,100 Z" fill="${b}"/>
    <path d="M100,100 L50,100 A50,50 0 0 1 100,50 Z" fill="${a}"/>`;
}

/* Дүүргэгч хээнүүд (булангийн бус хавтанд). */
const FILLERS = [
  () => stripes(pick([C.orange, C.blue, C.green, C.red])),
  () => quarterDots(...pick2([C.orange, C.red, C.amber, C.teal])),
  () => circles(...pick2([C.yellow, C.orange, C.blue, C.green])),
  () => stars(C.red, C.navy, C.blue),
  () => dotCircles(C.purple, C.navy, C.blue),
  () => diamond(C.orange, C.pale),
  () => rings(pick([C.purple, C.teal, C.navy])),
  () => petals(...pick2([C.teal, C.red, C.orange, C.blue])),
  () => halfArcs(pick(ARC_COLORS)),
];

/* --------------------------- тор байгуулах -------------------------- */
const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Өгөгдсөн <svg> дотор "2026" хавтан торыг үүсгэнэ.
 * @param {SVGElement} svg      - зорилтот svg (viewBox 0 0 1500 500)
 * @param {string}     idPrefix - clipPath id-ийн угтвар (нэг хуудсанд хэд хэдэн хуулбар байж болно)
 * @returns {Array} tiles - { el, inner, kind, col, row }
 */
function buildYear(svg, idPrefix = "y") {
  const tiles = [];
  let colOffset = 0;

  for (const ch of YEAR) {
    const grid = DIGITS[ch];
    const has = (r, c) => !!(grid[r] && grid[r][c]);

    grid.forEach((rowArr, r) => {
      rowArr.forEach((cell, c) => {
        if (!cell) return;

        // Гадна талын дугуйрах булан: хоёр хажуугийн хөрш хоёулаа хоосон бол.
        let corner = null;
        if (!has(r-1, c) && !has(r, c-1)) corner = "tl";
        else if (!has(r-1, c) && !has(r, c+1)) corner = "tr";
        else if (!has(r+1, c) && !has(r, c-1)) corner = "bl";
        else if (!has(r+1, c) && !has(r, c+1)) corner = "br";

        const kind = corner ? "arcs" : "filler";
        const content = corner ? arcs(corner, pick(ARC_COLORS)) : pick(FILLERS)();

        const col = colOffset + c;
        const x = col * TILE;
        const y = r * TILE;
        const clipId = `${idPrefix}-clip-${col}-${r}`;

        const wrap = document.createElementNS(SVG_NS, "g");
        wrap.setAttribute("transform", `translate(${x},${y})`);
        wrap.innerHTML = `
          <g class="tile" data-kind="${kind}">
            <clipPath id="${clipId}"><rect width="${TILE}" height="${TILE}"/></clipPath>
            <g class="inner" clip-path="url(#${clipId})">${content}</g>
          </g>`;
        svg.appendChild(wrap);

        tiles.push({
          el: wrap.querySelector(".tile"),
          inner: wrap.querySelector(".inner"),
          kind, col, row: r,
        });
      });
    });

    colOffset += grid[0].length + GAP;
  }

  /* Хавтангуудыг зүүнээс баруун тийш, дээрээс доош эрэмбэлнэ (stagger-т). */
  tiles.sort((a, b) => a.col - b.col || a.row - b.row);
  return tiles;
}

/* Navigation-ийн жижиг "2026": статик, cursor хүрэхэд хөдөлдөггүй. */
const navYear = document.getElementById("nav-year");
if (navYear) buildYear(navYear, "nav");

/* Section-1-ийн том "2026": анимацитай, харилцан үйлдэлтэй. */
const svg = document.getElementById("year");
const tiles = buildYear(svg, "y");
const tileEls = tiles.map((t) => t.el);

/* -------------------------- GSAP анимаци --------------------------- */
gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ ease: "power2.out" });
gsap.set(tileEls, { transformOrigin: "50% 50%" });

const mm = gsap.matchMedia();
let intro;

mm.add(
  { reduceMotion: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" },
  (ctx) => {
    const { reduceMotion } = ctx.conditions;

    /* Оруулах timeline */
    intro = gsap.timeline({ paused: true });

    intro.from(tileEls, {
      scale: 0,
      rotation: () => gsap.utils.random([-90, 90, 180]),
      autoAlpha: 0,
      duration: reduceMotion ? 0 : 0.7,
      ease: "back.out(1.6)",
      stagger: reduceMotion ? 0 : { each: 0.045, from: "start" },
    });

    // Дуусах үед бүхэлдээ бага зэрэг үсрэх (bounce) эффект.
    if (!reduceMotion) {
      intro.to(tileEls, {
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
    ScrollTrigger.create({
      trigger: "#section-1",
      start: "top 70%",
      once: true,
      onEnter: () => intro.play(),
    });

    /* Оруулах анимаци дуусмагц автомат хээ солилт эхэлнэ. */
    intro.eventCallback("onComplete", () => { autoShuffle = true; });

    /* Цагираг хавтангуудын үргэлжилсэн амьсгал */
    if (!reduceMotion) {
      const ringEls = tiles
        .filter((t) => t.inner.querySelector("circle[r='6']"))
        .map((t) => t.inner);
      gsap.to(ringEls, {
        scale: 1.08,
        transformOrigin: "50% 50%",
        duration: 1.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: { each: 0.3 },
      });
    }

    return () => { intro && intro.kill(); };
  }
);

/* Hover: хавтан нэг эргэлт хийнэ. */
tileEls.forEach((el) => {
  el.addEventListener("mouseenter", () => {
    gsap.to(el, {
      rotation: "+=360",
      duration: 0.8,
      ease: "power3.inOut",
      overwrite: "auto",
    });
  });
});

/* Хээ солих: дүүргэгч хавтангууд эргэж, шинэ хээгээр солигдоно. */
function shuffle() {
  const fillers = tiles.filter((t) => t.kind === "filler");
  const els = fillers.map((t) => t.el);
  const tl = gsap.timeline({ defaults: { duration: 0.35, ease: "power2.in" } });

  tl.to(els, {
    scaleX: 0,
    stagger: { each: 0.03, from: "random" },
    onComplete() {
      fillers.forEach((t) => { t.inner.innerHTML = pick(FILLERS)(); });
    },
  }).to(els, {
    scaleX: 1,
    ease: "back.out(1.4)",
    duration: 0.45,
    stagger: { each: 0.03, from: "random" },
  });
  return tl;
}

document.getElementById("replay").addEventListener("click", () => {
  intro && intro.restart();
});
document.getElementById("shuffle").addEventListener("click", shuffle);

/* 6 секунд тутам автоматаар хээ солино — зөвхөн оруулах анимаци дууссан
   бөгөөд section-1 дэлгэцэнд харагдаж байх үед. */
let autoShuffle = false;
let inView = false;

ScrollTrigger.create({
  trigger: "#section-1",
  start: "top 80%",
  end: "bottom 20%",
  onToggle: (self) => { inView = self.isActive; },
});

gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
  const id = setInterval(() => {
    if (autoShuffle && inView && !intro.isActive()) shuffle();
  }, 6000);
  return () => clearInterval(id);
});
