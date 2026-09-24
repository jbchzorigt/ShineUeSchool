"use client";

/* =====================================================================
   Математик canvas дэвсгэр (Hero-ийн ард). Дахин ашиглагдах: <MathematicalCanvas /> — эцэг нь `relative` байх ёстой.
   - Canvas 2D: ахлах сургуулийн геометрийн зураг (гурвалжин + өндөр, тойрог + радиус, координатын тэнхлэг, өнцөг θ …)
     удаан хөвж, ойрхон дүрсүүд нимгэн байгуулалтын шугамаар холбогдоно; сонгосон цөөн томьёо (квадрат тэгшитгэл,
     Пифагор, sin²+cos²=1 …) маш бүдэг хөвнө. Гүйлгэх/зурах бүхэлдээ requestAnimationFrame + ref (React state-гүй).
   - GSAP зөвхөн: canvas fade-in, курсор (цэг + цагираг, quickTo), pointer-ийн хүчний зөөлөн орох/гарах шилжилт.
   - Pointer Events (хулгана/хүрэлт/үзэг): ойрхон дүрсүүд зөөлөн түлхэгдэж, курсорын эргэн тойронд θ/π байгуулалтын
     нум эргэнэ. Canvas өөрөө pointer-events-none — доорх холбоос/товч хэвийн ажиллана; сонсогч window дээр.
   - Захиалгат курсор зөвхөн (hover: hover) and (pointer: fine) төхөөрөмжид; эцэг элемент `.math-cursor-host` класстай бол
     тэнд системийн курсор нуугдана (globals.css). Хүрэлтийн төхөөрөмжид курсор огт үүсэхгүй.
   - Responsive: DEVICE_CONFIG (mobile < 768 < tablet < 1024 < desktop — Tailwind md/lg) нэг газар; ResizeObserver +
     debounce; түвшин солигдоход дүрсүүд дахин үүснэ; DPR дээд хязгаартай, setTransform хуримтлагдахгүй.
   - prefers-reduced-motion: дүрс/томьёо хөдөлгөөнгүй, нум эргэхгүй, курсор шууд дагана. Tab нуугдвал loop зогсоно.
   - Өнгө: `tone="dark"` (navy дэвсгэр дээр цайвар шугам, gold цэг) эсвэл `tone="light"` (цаасан дээр navy шугам);
     gold/navy-г :root-ийн CSS хувьсагчаас (Tailwind @theme) нэг удаа уншина.
   ===================================================================== */

import { useRef } from "react";
import { gsap, reduceMotion, useGSAP } from "./gsap";

// ---------- Төрлүүд ----------
type ShapeType = "triangle" | "circle" | "square" | "rectangle" | "hexagon" | "pentagon" | "axes" | "angle" | "perpendicular";
type Tier = "mobile" | "tablet" | "desktop";

interface Shape {
  type: ShapeType;
  x: number; y: number; size: number;
  vx: number; vy: number;       // одоогийн хурд (pointer-ийн түлхэлт нэмэгддэг)
  vx0: number; vy0: number;     // суурь хөвөх хурд (буцаж тайвширна)
  rotation: number; rotationSpeed: number;
  alpha: number; boost: number; // boost: pointer ойртоход бага зэрэг тодорно
}
interface Formula { text: string; x: number; y: number; vx: number; vy: number; font: string; width: number; alpha: number }
interface TierConfig {
  shapes: number; formulas: number; connectionDistance: number; pointerRadius: number;
  minShapeSize: number; maxShapeSize: number; fontMin: number; fontMax: number;
  maxFormulaWidth: number;      // viewport өргөний хувь — томьёо үүнээс урт бол фонт багасна
  maxDpr: number; lineWidth: number;
}
interface Rgb { r: number; g: number; b: number }

// ---------- Тохиргоо (нэг газар) ----------
const DEVICE_CONFIG: Record<Tier, TierConfig> = {
  mobile:  { shapes: 9,  formulas: 4, connectionDistance: 115, pointerRadius: 125, minShapeSize: 18, maxShapeSize: 42, fontMin: 12, fontMax: 14, maxFormulaWidth: 0.6,  maxDpr: 1.5, lineWidth: 0.9 },
  tablet:  { shapes: 16, formulas: 6, connectionDistance: 150, pointerRadius: 160, minShapeSize: 22, maxShapeSize: 56, fontMin: 14, fontMax: 17, maxFormulaWidth: 0.45, maxDpr: 2,   lineWidth: 1 },
  desktop: { shapes: 26, formulas: 9, connectionDistance: 175, pointerRadius: 185, minShapeSize: 28, maxShapeSize: 75, fontMin: 15, fontMax: 19, maxFormulaWidth: 0.38, maxDpr: 2,   lineWidth: 1 },
};
const tierFor = (w: number): Tier => (w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop");

const FORMULAS = [
  "x = (-b ± √(b² - 4ac)) / 2a",
  "a² + b² = c²",
  "(a + b)² = a² + 2ab + b²",
  "a² - b² = (a - b)(a + b)",
  "d = √((x₂ - x₁)² + (y₂ - y₁)²)",
  "m = (y₂ - y₁) / (x₂ - x₁)",
  "y - y₁ = m(x - x₁)",
  "(x - a)² + (y - b)² = r²",
  "sin²θ + cos²θ = 1",
  "tan θ = sin θ / cos θ",
  "a / sin A = b / sin B = c / sin C",
  "c² = a² + b² - 2ab cos C",
  "aₙ = a₁ + (n - 1)d",
  "Sₙ = n(a₁ + aₙ) / 2",
  "aₙ = a₁rⁿ⁻¹",
  "Sₙ = a₁(1 - rⁿ) / (1 - r)",
  "logₐ(xy) = logₐx + logₐy",
  "logₐ(xⁿ) = n logₐx",
  "d/dx (xⁿ) = nxⁿ⁻¹",
  "∫ xⁿ dx = xⁿ⁺¹ / (n + 1) + C",
  "P(A ∪ B) = P(A) + P(B) - P(A ∩ B)",
  "P(A|B) = P(A ∩ B) / P(B)",
  "A = πr²",
  "C = 2πr",
  "V = ⅓πr²h",
];
const SHAPE_TYPES: ShapeType[] = ["triangle", "circle", "axes", "angle", "square", "hexagon", "perpendicular", "rectangle", "pentagon"];

// Системийн serif — canvas-д зориулж шинэ фонт ачаалахгүй
const MATH_FONT = '"Times New Roman", Georgia, Cambria, serif';
const LABEL_FONT = `italic 12px ${MATH_FONT}`;
const ORBIT_RADIUS = 30;
const CONNECTION_ALPHA = 0.11;
const MAX_LINKS = 2;            // дүрс бүр хамгийн ихдээ 2 холболт — "байгуулалтын шугам", сүлжээ биш
const FADE_MARGIN = 30;

// ---------- Туслахууд ----------
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const rgba = (c: Rgb, a: number) => `rgba(${c.r},${c.g},${c.b},${a.toFixed(3)})`;
const hexToRgb = (hex: string, fallback: Rgb): Rgb => {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return { r: n >> 16, g: (n >> 8) & 255, b: n & 255 };
};
function shuffled<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------- Дүрс зурах (локал координат: төв 0,0; s = хагас хэмжээ) ----------
function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r = 1.7) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function rightAngle(ctx: CanvasRenderingContext2D, x: number, y: number, ux: number, uy: number, vx: number, vy: number, k = 6) {
  // Тэгш өнцгийн тэмдэг: (x,y) оройгоос u, v чиглэлд k урттай жижиг дөрвөлжин
  ctx.beginPath(); ctx.moveTo(x + ux * k, y + uy * k); ctx.lineTo(x + ux * k + vx * k, y + uy * k + vy * k); ctx.lineTo(x + vx * k, y + vy * k); ctx.stroke();
}
function polygon(ctx: CanvasRenderingContext2D, n: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.closePath(); ctx.stroke();
}
function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
  const r = s.size;
  switch (s.type) {
    case "triangle": {
      const ax = -r, ay = r * 0.6, bx = r, by = r * 0.6, cx = -r * 0.25, cy = -r * 0.7;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, ay); ctx.stroke();          // өндөр
      rightAngle(ctx, cx, ay, 1, 0, 0, -1);
      dot(ctx, ax, ay); dot(ctx, bx, by); dot(ctx, cx, cy);
      break;
    }
    case "circle": {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      const a = -Math.PI / 6, ex = Math.cos(a) * r, ey = Math.sin(a) * r;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex, ey); ctx.stroke();               // радиус
      dot(ctx, 0, 0); dot(ctx, ex, ey, 1.4);
      ctx.fillText("r", ex * 0.5 + 2, ey * 0.5 - 4);
      break;
    }
    case "square": {
      ctx.strokeRect(-r, -r, r * 2, r * 2);
      ctx.beginPath(); ctx.moveTo(-r, r); ctx.lineTo(r, -r); ctx.stroke();               // диагональ
      rightAngle(ctx, -r, r, 1, 0, 0, -1);
      dot(ctx, -r, r); dot(ctx, r, -r);
      break;
    }
    case "rectangle": {
      const w = r * 1.5, h = r * 0.9;
      ctx.strokeRect(-w, -h, w * 2, h * 2);
      ctx.beginPath(); ctx.moveTo(-w, h); ctx.lineTo(w, -h); ctx.stroke();
      dot(ctx, 0, 0);
      ctx.fillText("d", r * 0.25, -r * 0.2);
      break;
    }
    case "hexagon": {
      polygon(ctx, 6, r);
      const vx = Math.cos(-Math.PI / 2) * r, vy = Math.sin(-Math.PI / 2) * r;
      const a1 = -Math.PI / 2 + Math.PI / 3, mx = (vx + Math.cos(a1) * r) / 2, my = (vy + Math.sin(a1) * r) / 2;   // ирмэгийн дунд (апотем)
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(vx, vy); ctx.moveTo(0, 0); ctx.lineTo(mx, my); ctx.stroke();
      const len = Math.hypot(mx, my), ux = mx / len, uy = my / len;
      rightAngle(ctx, mx, my, -ux, -uy, -uy, ux, 5);
      dot(ctx, 0, 0);
      break;
    }
    case "pentagon": {
      polygon(ctx, 5, r);
      const a0 = -Math.PI / 2, a1 = a0 + (2 * Math.PI) / 5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.32, a0, a1); ctx.stroke();                  // төвийн өнцөг
      dot(ctx, 0, 0);
      break;
    }
    case "axes": {
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, r); ctx.lineTo(0, -r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r - 5, -3); ctx.lineTo(r, 0); ctx.lineTo(r - 5, 3); ctx.moveTo(-3, -r + 5); ctx.lineTo(0, -r); ctx.lineTo(3, -r + 5); ctx.stroke();   // сум
      const t = r / 2;
      ctx.beginPath();
      for (const k of [-1, 1]) { ctx.moveTo(k * t, -3); ctx.lineTo(k * t, 3); ctx.moveTo(-3, k * t); ctx.lineTo(3, k * t); }
      ctx.stroke();
      dot(ctx, 0, 0);
      ctx.fillText("x", r + 5, 4); ctx.fillText("y", 5, -r - 3);
      break;
    }
    case "angle": {
      const ox = -r * 0.55, oy = r * 0.4, L = r * 1.6, a = -Math.PI * 0.24;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + L, oy); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * L, oy + Math.sin(a) * L); ctx.stroke();
      ctx.beginPath(); ctx.arc(ox, oy, r * 0.5, a, 0); ctx.stroke();
      dot(ctx, ox, oy);
      ctx.fillText("θ", ox + r * 0.62, oy - r * 0.12);
      break;
    }
    case "perpendicular": {
      const y0 = r * 0.35;
      ctx.beginPath(); ctx.moveTo(-r, y0); ctx.lineTo(r, y0); ctx.moveTo(0, y0); ctx.lineTo(0, -r * 0.7); ctx.stroke();
      rightAngle(ctx, 0, y0, 1, 0, 0, -1);
      dot(ctx, 0, y0); dot(ctx, 0, -r * 0.7, 1.4); dot(ctx, -r, y0, 1.4); dot(ctx, r, y0, 1.4);
      break;
    }
  }
}

// ---------- Компонент ----------
export function MathematicalCanvas({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const host = root.current, canvas = canvasRef.current, dotEl = dotRef.current, ringEl = ringRef.current;
    if (!host || !canvas || !dotEl || !ringEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = reduceMotion();
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const css = getComputedStyle(document.documentElement);
    const gold = hexToRgb(css.getPropertyValue("--color-gold"), { r: 255, g: 194, b: 14 });
    const navy = hexToRgb(css.getPropertyValue("--color-navy"), { r: 30, g: 58, b: 143 });
    const ink: Rgb = tone === "dark" ? { r: 255, g: 255, b: 255 } : navy;   // шугам/текстийн өнгө
    const accent: Rgb = gold;                                                  // цэг, орбитын төв

    // --- Төлөв (бүгд closure-д, React state-гүй) ---
    let W = 0, H = 0, tier: Tier | null = null, cfg = DEVICE_CONFIG.desktop;
    let shapes: Shape[] = [], formulas: Formula[] = [];
    let links = new Uint8Array(0);   // frame бүр дахин ашиглана: дүрс бүрийн холболтын тоо
    let rect = host.getBoundingClientRect();
    const ptr = { cx: -1e4, cy: -1e4, x: 0, y: 0, inside: false, touching: false, hover: false, strength: 0, orbit: 0 };
    const cursor = { fine: finePointer.matches, shown: false, hoverScaled: false };

    // --- GSAP: fade-in, pointer хүчний шилжилт, курсор ---
    gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "power2.out" });
    const strengthTo = gsap.quickTo(ptr, "strength", { duration: reduce ? 0 : 0.45, ease: "power2.out" });
    gsap.set([dotEl, ringEl], { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    const dotX = gsap.quickTo(dotEl, "x", { duration: reduce ? 0 : 0.08, ease: "power3.out" });
    const dotY = gsap.quickTo(dotEl, "y", { duration: reduce ? 0 : 0.08, ease: "power3.out" });
    const ringX = gsap.quickTo(ringEl, "x", { duration: reduce ? 0 : 0.35, ease: "power3.out" });
    const ringY = gsap.quickTo(ringEl, "y", { duration: reduce ? 0 : 0.35, ease: "power3.out" });
    const showCursor = (on: boolean) => {
      if (cursor.shown === on) return;
      cursor.shown = on;
      gsap.to([dotEl, ringEl], { autoAlpha: on ? 1 : 0, duration: reduce ? 0 : 0.25, overwrite: "auto" });
    };
    const setHoverScale = (on: boolean) => {
      if (cursor.hoverScaled === on) return;
      cursor.hoverScaled = on;
      gsap.to(ringEl, { scale: on ? 1.7 : 1, duration: reduce ? 0 : 0.3, ease: "power2.out", overwrite: "auto" });
    };

    // --- Дүрс, томьёо үүсгэх ---
    const makeShape = (type: ShapeType): Shape => {
      const size = rand(cfg.minShapeSize, cfg.maxShapeSize), a = rand(0, Math.PI * 2), sp = reduce ? 0 : rand(0.1, 0.28);
      return {
        type, x: rand(0, W), y: rand(0, H), size,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vx0: Math.cos(a) * sp, vy0: Math.sin(a) * sp,
        rotation: rand(0, Math.PI * 2), rotationSpeed: reduce ? 0 : rand(0.0008, 0.002) * (Math.random() < 0.5 ? -1 : 1),
        alpha: rand(0.12, 0.22), boost: 0,
      };
    };
    const makeFormula = (text: string): Formula => {
      let px = Math.round(rand(cfg.fontMin, cfg.fontMax));
      const maxW = W * cfg.maxFormulaWidth;
      let font = `italic ${px}px ${MATH_FONT}`;
      ctx.font = font;
      let width = ctx.measureText(text).width;
      if (width > maxW) {   // урт томьёо → фонт багасгана (доод хязгаар 10px)
        px = Math.max(10, Math.floor((px * maxW) / width));
        font = `italic ${px}px ${MATH_FONT}`; ctx.font = font; width = ctx.measureText(text).width;
      }
      return {
        text, font, width, x: rand(0, Math.max(0, W - width)), y: rand(24, H - 12),
        vx: reduce ? 0 : rand(0.05, 0.12) * (Math.random() < 0.5 ? -1 : 1), vy: reduce ? 0 : rand(0.02, 0.05) * (Math.random() < 0.5 ? -1 : 1),
        alpha: rand(0.09, 0.15),
      };
    };
    const populate = () => {
      const types = shuffled(SHAPE_TYPES);
      shapes = Array.from({ length: cfg.shapes }, (_, i) => makeShape(types[i % types.length]));
      formulas = shuffled(FORMULAS).slice(0, cfg.formulas).map(makeFormula);   // давхардалгүй сонголт
      links = new Uint8Array(shapes.length);
    };

    // --- Хэмжээ (DPR хязгаартай, setTransform хуримтлагдахгүй) ---
    const resize = () => {
      const nw = host.clientWidth, nh = host.clientHeight;
      if (!nw || !nh) return;
      const nt = tierFor(nw);
      const pw = W, ph = H;
      W = nw; H = nh; cfg = DEVICE_CONFIG[nt];
      const dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (nt !== tier || !shapes.length) { tier = nt; populate(); return; }
      // Ижил түвшин: байрлалыг пропорциональ шилжүүлнэ (дүрсүүд "үсрэхгүй")
      const kx = W / pw, ky = H / ph;
      for (const s of shapes) { s.x *= kx; s.y *= ky; }
      for (const f of formulas) { f.x *= kx; f.y *= ky; }
    };
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); };
    resize();
    const ro = new ResizeObserver(scheduleResize);
    ro.observe(host);
    window.addEventListener("orientationchange", scheduleResize);

    // --- Pointer (window дээр; canvas pointer-events-none тул доорх холбоосууд хэвийн) ---
    const onMove = (e: PointerEvent) => {
      ptr.cx = e.clientX; ptr.cy = e.clientY;
      const t = e.target as Element | null;
      ptr.hover = !!t?.closest?.("a,button");
      if (e.pointerType !== "mouse" && e.buttons) ptr.touching = true;
    };
    const onDown = (e: PointerEvent) => { ptr.cx = e.clientX; ptr.cy = e.clientY; if (e.pointerType !== "mouse") ptr.touching = true; };
    const onUp = () => { ptr.touching = false; };
    const onOut = (e: PointerEvent) => { if (!e.relatedTarget) { ptr.cx = -1e4; ptr.cy = -1e4; ptr.touching = false; } };   // цонхноос гарсан
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    const onFineChange = (e: MediaQueryListEvent) => { cursor.fine = e.matches; if (!e.matches) showCursor(false); };
    finePointer.addEventListener("change", onFineChange);

    // --- Зурах ---
    const drawOrbit = (x: number, y: number, k: number) => {
      const a = ptr.orbit, R = ORBIT_RADIUS;
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(ink, 0.32 * k); ctx.fillStyle = rgba(ink, 0.5 * k);
      ctx.beginPath(); ctx.arc(x, y, R, a, a + 4.2); ctx.stroke();                     // хагас нум
      const p1x = x + Math.cos(a) * R, p1y = y + Math.sin(a) * R, a2 = a + 2.4, p2x = x + Math.cos(a2) * R, p2y = y + Math.sin(a2) * R;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(p1x, p1y); ctx.stroke();           // радиаль шугам
      dot(ctx, p1x, p1y, 1.6); dot(ctx, p2x, p2y, 1.6);
      ctx.fillStyle = rgba(accent, 0.8 * k); dot(ctx, x, y, 1.5);
      ctx.fillStyle = rgba(ink, 0.5 * k); ctx.font = `italic 11px ${MATH_FONT}`;
      const la = a + 1.2, lb = a + 3.7;
      ctx.fillText("θ", x + Math.cos(la) * (R + 10) - 3, y + Math.sin(la) * (R + 10) + 4);
      ctx.fillText("π", x + Math.cos(lb) * (R + 11) - 3, y + Math.sin(lb) * (R + 11) + 4);
    };

    let raf = 0, last = 0, running = false;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const k = last ? Math.min((t - last) / 16.67, 2.5) : 1;   // 60fps-т нормчилсон алхам
      last = t;
      rect = host.getBoundingClientRect();
      const px = ptr.cx - rect.left, py = ptr.cy - rect.top;
      const inside = px >= 0 && py >= 0 && px <= W && py <= H;
      const active = inside && (cursor.fine || ptr.touching);
      if (active !== ptr.inside) { ptr.inside = active; strengthTo(active ? 1 : 0); }
      if (active) { ptr.x = px; ptr.y = py; }
      // Курсор (зөвхөн fine pointer)
      if (cursor.fine) {
        showCursor(inside);
        if (inside) { dotX(px); dotY(py); ringX(px); ringY(py); setHoverScale(ptr.hover); }
      }
      if (!reduce) ptr.orbit += 0.006 * k;

      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = cfg.lineWidth; ctx.lineCap = "round"; ctx.lineJoin = "round";
      const R = cfg.pointerRadius, st = ptr.strength;

      // Дүрсүүд: хөдөлгөөн + pointer-ийн зөөлөн түлхэлт
      for (const s of shapes) {
        if (st > 0.001) {
          const dx = s.x - ptr.x, dy = s.y - ptr.y, d = Math.hypot(dx, dy) || 1;
          if (d < R) {
            const f = (1 - d / R) * st;
            if (!reduce) { s.vx += (dx / d) * f * 0.035 * k; s.vy += (dy / d) * f * 0.035 * k; s.rotation += f * 0.003 * k; }
            s.boost += (f * 0.14 - s.boost) * 0.1;
          } else s.boost *= 0.92;
        } else s.boost *= 0.92;
        s.vx += (s.vx0 - s.vx) * 0.02 * k; s.vy += (s.vy0 - s.vy) * 0.02 * k;   // суурь хурд руу тайвширна
        s.x += s.vx * k; s.y += s.vy * k; s.rotation += s.rotationSpeed * k;
        const m = s.size * 1.6;
        if (s.x < -m) s.x = W + m; else if (s.x > W + m) s.x = -m;
        if (s.y < -m) s.y = H + m; else if (s.y > H + m) s.y = -m;
      }

      // Холболтын шугам (ойрхон, цөөн)
      links.fill(0);
      const D = cfg.connectionDistance;
      for (let i = 0; i < shapes.length; i++) {
        if (links[i] >= MAX_LINKS) continue;
        const a = shapes[i];
        for (let j = i + 1; j < shapes.length; j++) {
          if (links[i] >= MAX_LINKS) break;
          if (links[j] >= MAX_LINKS) continue;
          const b = shapes[j], dx = a.x - b.x, dy = a.y - b.y;
          if (Math.abs(dx) > D || Math.abs(dy) > D) continue;
          const d = Math.hypot(dx, dy);
          if (d > D) continue;
          links[i]++; links[j]++;
          ctx.strokeStyle = rgba(ink, (1 - d / D) * CONNECTION_ALPHA);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      // Pointer → дүрс байгуулалтын шугам
      if (st > 0.001) {
        for (const s of shapes) {
          const d = Math.hypot(s.x - ptr.x, s.y - ptr.y);
          if (d > R) continue;
          ctx.strokeStyle = rgba(ink, (1 - d / R) * 0.16 * st);
          ctx.beginPath(); ctx.moveTo(ptr.x, ptr.y); ctx.lineTo(s.x, s.y); ctx.stroke();
        }
      }

      // Дүрс зурах
      ctx.font = LABEL_FONT;
      for (const s of shapes) {
        const a = s.alpha + s.boost;
        ctx.save();
        ctx.translate(s.x, s.y); ctx.rotate(s.rotation);
        ctx.strokeStyle = rgba(ink, a); ctx.fillStyle = rgba(ink, a + 0.15);
        drawShape(ctx, s);
        ctx.restore();
      }

      // Томьёо
      for (const f of formulas) {
        f.x += f.vx * k; f.y += f.vy * k;
        if (f.x > W + FADE_MARGIN) f.x = -f.width - FADE_MARGIN; else if (f.x < -f.width - FADE_MARGIN) f.x = W + FADE_MARGIN;
        if (f.y > H + FADE_MARGIN) f.y = -8; else if (f.y < -FADE_MARGIN) f.y = H + 8;
        ctx.font = f.font; ctx.fillStyle = rgba(ink, f.alpha);
        ctx.fillText(f.text, f.x, f.y);
      }

      // Pointer-ийн орбит
      if (st > 0.001) drawOrbit(ptr.x, ptr.y, st);
    };
    const start = () => { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const onVisibility = () => (document.visibilityState === "hidden" ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    if (document.visibilityState !== "hidden") start();

    return () => {
      stop();
      clearTimeout(resizeTimer);
      ro.disconnect();
      window.removeEventListener("orientationchange", scheduleResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("visibilitychange", onVisibility);
      finePointer.removeEventListener("change", onFineChange);
    };
  }, { scope: root, dependencies: [tone] });

  const ringBorder = tone === "dark" ? "border-white/60" : "border-navy/60";
  return (
    <div ref={root} className={`pointer-events-none absolute inset-0 h-full w-full overflow-hidden ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full opacity-0" />
      {/* Захиалгат курсор: зөвхөн hover + fine pointer төхөөрөмжид (CSS-ээр ч, JS-ээр ч хаагдана). Эцэг нь transform-той (ScrollSmoother)
          тул fixed биш, энэ давхаргын дотор absolute-аар байрлана. */}
      <div ref={dotRef} className="absolute left-0 top-0 hidden h-1.5 w-1.5 rounded-full bg-gold [@media(hover:hover)_and_(pointer:fine)]:block" />
      <div ref={ringRef} className={`absolute left-0 top-0 hidden h-9 w-9 rounded-full border ${ringBorder} [@media(hover:hover)_and_(pointer:fine)]:block`} />
    </div>
  );
}
