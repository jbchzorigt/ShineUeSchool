/* main.js-ийн "2026" хавтан үүсгэгч (Bauhaus хээ). Nav-ийн жижиг ба YearTiles-ийн том хувилбар хоёулаа ашиглана. */

export const TILE = 100; // нэг хавтангийн хэмжээ (viewBox нэгж)
const GAP = 1; // цифр хоорондын зай (хавтангийн тоогоор)

const C = {
  orange: "#F26B2B",
  yellow: "#FFF200",
  blue: "#0A63B2",
  green: "#8CC63F",
  red: "#BF1F2E",
  teal: "#0B8A80",
  purple: "#8A2B8F",
  navy: "#2C2F8F",
  amber: "#F6A21E",
  pale: "#EEF29A",
  white: "#FFFFFF",
};
const ARC_COLORS = [C.orange, C.yellow, C.blue, C.green, C.red, C.teal, C.amber];

/* 3×5 тор: 1 = хавтан бий, 0 = хоосон */
const DIGITS: Record<string, number[][]> = {
  "0": [
    [1, 1, 1],
    [1, 0, 1],
    [1, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
  ],
  "2": [
    [1, 1, 1],
    [0, 0, 1],
    [1, 1, 1],
    [1, 0, 0],
    [1, 1, 1],
  ],
  "6": [
    [1, 1, 1],
    [1, 0, 0],
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ],
  "1": [[0, 1, 0], [1, 1, 0], [0, 1, 0], [0, 1, 0], [1, 1, 1]],
  "3": [[1, 1, 1], [0, 0, 1], [1, 1, 1], [0, 0, 1], [1, 1, 1]],
  "4": [[1, 0, 1], [1, 0, 1], [1, 1, 1], [0, 0, 1], [0, 0, 1]],
  "5": [[1, 1, 1], [1, 0, 0], [1, 1, 1], [0, 0, 1], [1, 1, 1]],
  "7": [[1, 1, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1]],
  "8": [[1, 1, 1], [1, 0, 1], [1, 1, 1], [1, 0, 1], [1, 1, 1]],
  "9": [[1, 1, 1], [1, 0, 1], [1, 1, 1], [0, 0, 1], [1, 1, 1]],
};

/* ----------------------------- туслах ------------------------------ */
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pick2 = <T,>(arr: T[]): [T, T] => {
  const a = pick(arr);
  let b = pick(arr);
  while (b === a) b = pick(arr);
  return [a, b];
};

/* ------------------------- хээний генераторууд ---------------------- */
/* Бүх хээ 0..100 локал координатад зурагдана. */

// Төвлөрсөн нум. corner = аль булан нь дугуйрах вэ (tl, tr, bl, br).
// Нумын төв нь эсрэг буланд байрлана.
function arcs(corner: string, color: string): string {
  const cx = corner.includes("l") ? 100 : 0;
  const cy = corner.includes("t") ? 100 : 0;
  let s = `<circle cx="${cx}" cy="${cy}" r="9" fill="${color}"/>`;
  for (let r = 23; r <= 95; r += 14) {
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="8"/>`;
  }
  return s;
}

// Хагас тойрог нум — төв нь ирмэгийн дунд.
function halfArcs(color: string): string {
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
function stripes(color: string): string {
  let s = `<polygon points="0,0 100,0 0,100" fill="${color}"/>`;
  for (let k = 14; k < 100; k += 14) {
    s += `<line x1="${k}" y1="100" x2="100" y2="${k}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`;
  }
  return s;
}

// Дөрөвний нэг дугуй + 2×2 цэгүүд.
function quarterDots(a: string, b: string): string {
  const dots = (ox: number, oy: number, col: string) =>
    [12, 38].flatMap((dx) => [12, 38].map((dy) =>
      `<circle cx="${ox + dx}" cy="${oy + dy}" r="7" fill="${col}"/>`)).join("");
  return `
    <path d="M0,0 A50,50 0 0 1 50,50 L0,50 Z" fill="${a}"/>
    ${dots(50, 0, a)}
    ${dots(0, 50, b)}
    <path d="M100,100 A50,50 0 0 1 50,50 L100,50 Z" fill="${b}"/>`;
}

// Өнгөт дөрвөлжин дээр цагаан дугуй, 2×2.
function circles(a: string, b: string): string {
  const cells: [number, number, string][] = [[0, 0, a], [50, 0, b], [0, 50, b], [50, 50, a]];
  return cells.map(([x, y, col]) =>
    `<rect x="${x}" y="${y}" width="50" height="50" fill="${col}"/>
     <circle cx="${x + 25}" cy="${y + 25}" r="16" fill="${C.white}"/>`).join("");
}

// 4 үзүүрт од + дугуйтай дөрвөлжин, 2×2.
function stars(starCol: string, sqA: string, sqB: string): string {
  const star = (x: number, y: number) =>
    `<path d="M${x + 25},${y} Q${x + 25},${y + 25} ${x + 50},${y + 25} Q${x + 25},${y + 25} ${x + 25},${y + 50}
              Q${x + 25},${y + 25} ${x},${y + 25} Q${x + 25},${y + 25} ${x + 25},${y} Z" fill="${starCol}"/>`;
  const sq = (x: number, y: number, col: string) =>
    `<rect x="${x}" y="${y}" width="50" height="50" fill="${col}"/>
     <circle cx="${x + 25}" cy="${y + 25}" r="16" fill="${C.white}"/>`;
  return star(0, 0) + sq(50, 0, sqA) + sq(0, 50, sqB) + star(50, 50);
}

// Жижиг цэг + дугуйтай дөрвөлжин, 2×2.
function dotCircles(dotCol: string, sqA: string, sqB: string): string {
  const sq = (x: number, y: number, col: string) =>
    `<rect x="${x}" y="${y}" width="50" height="50" fill="${col}"/>
     <circle cx="${x + 25}" cy="${y + 25}" r="16" fill="${C.white}"/>`;
  return `<circle cx="25" cy="25" r="8" fill="${dotCol}"/>` + sq(50, 0, sqA) +
         sq(0, 50, sqB) + `<circle cx="75" cy="75" r="8" fill="${dotCol}"/>`;
}

// Төвлөрсөн ромб.
function diamond(solid: string, outline: string): string {
  let s = "";
  for (let c = 2; c <= 30; c += 9) {
    s += `<polygon points="50,${c} ${100 - c},50 50,${100 - c} ${c},50" fill="none" stroke="${outline}" stroke-width="5"/>`;
  }
  s += `<polygon points="50,30 70,50 50,70 30,50" fill="${solid}"/>`;
  return s;
}

// Төвлөрсөн цагираг.
function rings(color: string): string {
  let s = `<circle cx="50" cy="50" r="6" fill="${color}"/>`;
  for (let r = 14; r <= 46; r += 8) {
    s += `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="4.5"/>`;
  }
  return s;
}

// Дөрвөн буланд дөрөвний нэг дугуй → дунд нь цагаан од үлдэнэ.
function petals(a: string, b: string): string {
  return `
    <path d="M0,0 L50,0 A50,50 0 0 1 0,50 Z" fill="${a}"/>
    <path d="M100,0 L100,50 A50,50 0 0 1 50,0 Z" fill="${b}"/>
    <path d="M0,100 L0,50 A50,50 0 0 1 50,100 Z" fill="${b}"/>
    <path d="M100,100 L50,100 A50,50 0 0 1 100,50 Z" fill="${a}"/>`;
}

/* Дүүргэгч хээнүүд (булангийн бус хавтанд). */
const FILLERS: Array<() => string> = [
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

export const randomFiller = (): string => pick(FILLERS)();

/* --------------------------- тор байгуулах -------------------------- */
const SVG_NS = "http://www.w3.org/2000/svg";

export interface Tile {
  el: SVGGElement;
  inner: SVGGElement;
  kind: "arcs" | "filler";
  col: number;
  row: number;
}

/**
 * Өгөгдсөн <svg> дотор "он" хавтан торыг үүсгэнэ.
 * @param svg      - зорилтот svg (viewBox 0 0 1500 500)
 * @param year     - зурах он (тэмдэгт мөр, тоо бүр DIGITS-д байх ёстой)
 * @param idPrefix - clipPath id-ийн угтвар (нэг хуудсанд хэд хэдэн хуулбар байж болно)
 */
export function buildYear(svg: SVGSVGElement, year: string, idPrefix = "y"): Tile[] {
  const tiles: Tile[] = [];
  let colOffset = 0;

  for (const ch of year) {
    const grid = DIGITS[ch];
    if (!grid) continue;
    const has = (r: number, c: number) => !!(grid[r] && grid[r][c]);

    grid.forEach((rowArr, r) => {
      rowArr.forEach((cell, c) => {
        if (!cell) return;

        // Гадна талын дугуйрах булан: хоёр хажуугийн хөрш хоёулаа хоосон бол.
        let corner: string | null = null;
        if (!has(r - 1, c) && !has(r, c - 1)) corner = "tl";
        else if (!has(r - 1, c) && !has(r, c + 1)) corner = "tr";
        else if (!has(r + 1, c) && !has(r, c - 1)) corner = "bl";
        else if (!has(r + 1, c) && !has(r, c + 1)) corner = "br";

        const kind: "arcs" | "filler" = corner ? "arcs" : "filler";
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
          el: wrap.querySelector(".tile") as SVGGElement,
          inner: wrap.querySelector(".inner") as SVGGElement,
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
