"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Spinner } from "@/components/ui";
import { PostEditor } from "@/components/admin/PostEditor";
import type { PostAdmin } from "@/lib/types";

export default function NewsEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const q = useFetch(() => (isNew ? null : api.news.posts.get(Number(id))), [id]);

  /* useFetch нь reload() дуудахад q.data-г шинэ хариу ирэх хүртэл undefined болгодог
     (key өөрчлөгдөх тул "fresh" биш болно) — тиймээс сүүлийн амжилттай өгөгдлийг энэ
     id-д зориулж state-д хадгалж, шинэ хариу ирэх хүртэл PostEditor-т дамжуулна.
     Ингэснээр ковер/галерей засах бүрд onSaved → q.reload() дуудагдахад PostEditor
     Spinner-ээр солигдож дахин mount хийгдэхгүй (гараар бичсэн гарчиг/тодотгол/бие
     алдагдахгүй). Хадгалалтыг effect дотор биш, render-ийн явцад нөхцөлтэйгөөр
     setState хийж гүйцэтгэнэ (React-ийн "adjusting state during render" загвар) —
     ref-ийг render үед унших/бичихийг react-hooks/refs, харин useEffect дотор
     синхрон setState дуудахыг react-hooks/set-state-in-effect тус тус хориглодог. */
  const [cache, setCache] = useState<{ id: string; data: PostAdmin } | null>(null);
  if (q.data && (cache?.id !== id || cache.data !== q.data)) {
    setCache({ id, data: q.data });
  }
  const post = q.data ?? (cache?.id === id ? cache.data : null);

  if (!isNew && !post && q.loading) return <Spinner />;
  if (!isNew && q.error && !post) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  return <PostEditor post={isNew ? null : post} onSaved={() => q.reload()} />;
}
