/* Мэдээний өнгөтэй таг: өнгийг админ сонгоно (/admin/news/categories), текстийн өнгө дэвсгэрээсээ автоматаар. */

import { readableOn, tagColor } from "@/lib/color";

export function CategoryTag({ name, color, className = "" }: { name: string; color?: string; className?: string }) {
  return (
    <span style={{ backgroundColor: tagColor(color), color: readableOn(color) }} className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold leading-5 lg:text-[13px] ${className}`}>
      {name}
    </span>
  );
}
