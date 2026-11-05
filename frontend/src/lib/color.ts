/* Админы сонгосон дурын өнгөн дэвсгэр дээр уншигдах текстийн өнгө: цагаан ба бэхний (--color-ink) аль нь WCAG тодролт өндөртэйг сонгоно.
   Өнгө API-аас ирдэг тул дутуу байж болно (deploy-ийн үед хуучин backend, хуучин cache): хуудас унахгүй, анхдагч өнгө хэрэглэнэ. */

export const DEFAULT_TAG_COLOR = "#1e3a8f";
/** Мэдээний ангиллын өнгөнүүд: админ эдгээрээс сонгоно (colorkit.co/palette/ec111a-fb6330-ffd42f-138468-009dd6-7849b8-f2609e). */
export const TAG_PALETTE = [
  { hex: "#ec111a", name: "Улаан" },
  { hex: "#fb6330", name: "Улбар шар" },
  { hex: "#ffd42f", name: "Шар" },
  { hex: "#138468", name: "Ногоон" },
  { hex: "#009dd6", name: "Цэнхэр" },
  { hex: "#7849b8", name: "Нил ягаан" },
  { hex: "#f2609e", name: "Ягаан" },
] as const;
const LIGHT = "#ffffff";
const DARK = "#1d1d1f";

function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

export const tagColor = (color?: string | null): string => (color && /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_TAG_COLOR);

export function readableOn(color?: string | null): string {
  const bg = luminance(tagColor(color));
  return contrast(bg, luminance(LIGHT)) >= contrast(bg, luminance(DARK)) ? LIGHT : DARK;
}
