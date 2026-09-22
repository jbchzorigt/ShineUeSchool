"use client";

/* Мэдээ засварлах хуудасны цөм: гарчиг/slug/ангилал/огноо/тодотгол/бие, ковер, галерей, ноорог хадгалах/нийтлэх. */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { NewsImage, PostAdmin, PostInput } from "@/lib/types";
import { Badge, Button, Card, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { RichText } from "@/components/admin/RichText";

interface Props { post: PostAdmin | null; onSaved: () => void }

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusBadge(post: PostAdmin | null) {
  if (!post) return <Badge tone="slate">Шинэ</Badge>;
  if (!post.is_published) return <Badge tone="slate">Ноорог</Badge>;
  if (post.published_at && new Date(post.published_at) > new Date()) return <Badge tone="gold">Товлосон</Badge>;
  return <Badge tone="green">Нийтлэгдсэн</Badge>;
}

export function PostEditor({ post, onSaved }: Props) {
  const router = useRouter();
  const catsQ = useFetch(() => api.news.categories.list(), []);
  const fbQ = useFetch(() => api.social.status(), []);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body_html ?? "");
  const [categoryId, setCategoryId] = useState(post?.category ? String(post.category.id) : "");
  const [publishedAt, setPublishedAt] = useState(toLocalInput(post?.published_at ?? null));
  const [toFacebook, setToFacebook] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [fbResult, setFbResult] = useState<{ ok: boolean; post_id: string | null; error: string | null } | null>(null);

  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [galleryOrder, setGalleryOrder] = useState(0);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryError, setGalleryError] = useState("");

  const coverFileRef = useRef<HTMLInputElement>(null);
  const [coverBusy, setCoverBusy] = useState(false);

  function buildInput(): PostInput {
    return {
      title: title.trim(),
      slug: slug.trim() || undefined,
      excerpt,
      body_html: body,
      category_id: categoryId ? Number(categoryId) : null,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
    };
  }

  async function saveDraft() {
    setErrors({});
    setSavingDraft(true);
    try {
      const input = buildInput();
      if (post) {
        await api.news.posts.update(post.id, input);
        onSaved();
      } else {
        const created = await api.news.posts.create(input);
        router.replace(`/admin/news/${created.id}`);
      }
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." });
    } finally {
      setSavingDraft(false);
    }
  }

  async function publish() {
    if (!post) return;
    setErrors({});
    setFbResult(null);
    setPublishing(true);
    try {
      const input = buildInput();
      await api.news.posts.update(post.id, input);
      const requestedFb = toFacebook && !!fbQ.data?.enabled;
      const result = await api.news.posts.publish(post.id, requestedFb);
      setFbResult(requestedFb || result.fb.error ? result.fb : null);
      onSaved();
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Нийтэлж чадсангүй." });
    } finally {
      setPublishing(false);
    }
  }

  async function unpublish() {
    if (!post) return;
    try {
      await api.news.posts.unpublish(post.id);
      onSaved();
    } catch {
      alert("Буцааж чадсангүй.");
    }
  }

  async function onCoverChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !post) return;
    setCoverBusy(true);
    try {
      await api.news.posts.setCover(post.id, f);
      onSaved();
    } catch {
      alert("Ковер оруулж чадсангүй.");
    } finally {
      setCoverBusy(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  }

  async function removeCover() {
    if (!post) return;
    if (!confirm("Ковер зургийг устгах уу?")) return;
    try {
      await api.news.posts.removeCover(post.id);
      onSaved();
    } catch {
      alert("Устгаж чадсангүй.");
    }
  }

  async function updateImageField(img: NewsImage, patch: { caption?: string; order?: number }) {
    try {
      await api.news.posts.updateImage(img.id, patch);
      onSaved();
    } catch {
      alert("Хадгалж чадсангүй.");
    }
  }

  async function removeImage(img: NewsImage) {
    if (!confirm("Зургийг устгах уу?")) return;
    try {
      await api.news.posts.removeImage(img.id);
      onSaved();
    } catch {
      alert("Устгаж чадсангүй.");
    }
  }

  async function addGalleryImage() {
    if (!post) return;
    const f = galleryFileRef.current?.files?.[0];
    if (!f) { setGalleryError("Зураг сонгоно уу."); return; }
    setGalleryError("");
    setGalleryBusy(true);
    try {
      await api.news.posts.addImage(post.id, f, galleryCaption, galleryOrder);
      setGalleryCaption("");
      setGalleryOrder((o) => o + 1);
      setGalleryFile(null);
      if (galleryFileRef.current) galleryFileRef.current.value = "";
      onSaved();
    } catch (err) {
      setGalleryError(err instanceof ApiError ? Object.values(err.fieldErrors).join(" ") : "Оруулж чадсангүй.");
    } finally {
      setGalleryBusy(false);
    }
  }

  const images = [...(post?.images ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-navy">{post ? "Мэдээ засах" : "Шинэ мэдээ"}</h1>
          {statusBadge(post)}
        </div>
        {post?.is_published && (
          <a href={`/news/${post.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-navy hover:underline">
            Сайт дээр харах ↗
          </a>
        )}
      </div>

      {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}

      {fbResult && (
        fbResult.ok
          ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Facebook-т нийтлэгдлээ (id {fbResult.post_id})</p>
          : <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Facebook алдаа: {fbResult.error}</p>
      )}

      <Card className="space-y-4">
        <Field label="Гарчиг" error={errors.title}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Slug" error={errors.slug} hint="Хоосон орхивол гарчгаас автоматаар үүснэ">
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ангилал" error={errors.category_id}>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Ангилалгүй</option>
              {(catsQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Нийтлэх огноо" error={errors.published_at} hint="Хоосон бол нийтлэх мөчийн цагаар бүртгэнэ.">
            <Input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
          </Field>
        </div>
        <Field label="Тодотгол" error={errors.excerpt} hint={`${excerpt.length}/280`}>
          <Textarea value={excerpt} maxLength={280} onChange={(e) => setExcerpt(e.target.value)} />
        </Field>
        <div>
          {/* RichText-ийг Field (<label>) дотор оруулбал label дээрх дарах нь
              эхний toolbar товч руу дамждаг тул энд бие даасан span-аар шошгол. */}
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Бие</span>
          <RichText value={body} onChange={setBody} onUploadImage={(f) => api.news.posts.uploadImage(f).then((r) => r.url)} />
          {errors.body_html && <span className="mt-1 block text-xs font-medium text-red-600">{errors.body_html}</span>}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Ковер зураг</h2>
        {!post ? (
          <p className="text-sm text-slate-500">Эхлээд ноорог хадгална уу.</p>
        ) : (
          <div className="space-y-3">
            {post.cover_image && (
              <div className="relative h-48 w-full max-w-md overflow-hidden rounded-lg bg-slate-100">
                <Image src={post.cover_image} alt="" fill unoptimized className="object-cover" />
              </div>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Ковер зураг (JPG, PNG, WebP)">
                <input ref={coverFileRef} type="file" accept="image/*" onChange={onCoverChosen} disabled={coverBusy}
                       className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
              </Field>
              {post.cover_image && <Button variant="danger" type="button" onClick={removeCover}>Ковер устгах</Button>}
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Галерей</h2>
        {!post ? (
          <p className="text-sm text-slate-500">Эхлээд ноорог хадгална уу.</p>
        ) : (
          <div className="space-y-4">
            {images.length === 0 && <p className="text-sm text-slate-500">Зураг нэмээгүй байна.</p>}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {images.map((img) => (
                <div key={img.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <div className="relative h-32 w-full overflow-hidden rounded-lg bg-slate-100">
                    <Image src={img.image} alt="" fill unoptimized className="object-cover" />
                  </div>
                  <Input defaultValue={img.caption} aria-label="Тайлбар" placeholder="Тайлбар"
                         onBlur={(e) => { const v = e.target.value; if (v !== img.caption) updateImageField(img, { caption: v }); }} />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-slate-600">
                      Дараалал
                      <Input type="number" className="w-16" defaultValue={img.order}
                             onBlur={(e) => { const v = Number(e.target.value); if (v !== img.order) updateImageField(img, { order: v }); }} />
                    </label>
                    <Button variant="danger" className="ml-auto" type="button" onClick={() => removeImage(img)}>Устгах</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-slate-300 p-3">
              <Field label="Шинэ зураг">
                <input ref={galleryFileRef} type="file" accept="image/*" onChange={(e) => setGalleryFile(e.target.files?.[0] ?? null)}
                       className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
              </Field>
              <Field label="Тайлбар"><Input value={galleryCaption} onChange={(e) => setGalleryCaption(e.target.value)} /></Field>
              <Field label="Дараалал"><Input type="number" className="w-20" value={galleryOrder} onChange={(e) => setGalleryOrder(Number(e.target.value))} /></Field>
              <Button type="button" variant="secondary" disabled={galleryBusy || !galleryFile} onClick={addGalleryImage}>Нэмэх</Button>
            </div>
            {galleryError && <p className="text-sm text-red-600">{galleryError}</p>}
          </div>
        )}
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:pl-72">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" disabled={savingDraft} onClick={saveDraft}>
            {savingDraft ? <Spinner className="h-4 w-4 border-navy/40 border-t-navy" /> : "Ноорог хадгалах"}
          </Button>
          <label className={`flex items-center gap-2 text-sm ${!fbQ.data?.enabled ? "text-slate-400" : "text-slate-700"}`}>
            <input type="checkbox" checked={toFacebook} disabled={!fbQ.data?.enabled}
                   onChange={(e) => setToFacebook(e.target.checked)} />
            Facebook Page дээр пост тавих
          </label>
          {fbQ.data && !fbQ.data.enabled && <span className="text-xs text-slate-400">Facebook холболт тохируулагдаагүй</span>}
          <Button type="button" disabled={!post || publishing} onClick={publish} className="ml-auto">
            {publishing ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : "Нийтлэх"}
          </Button>
          {post?.is_published && <Button type="button" variant="ghost" onClick={unpublish}>Нийтлэлийг буцаах</Button>}
        </div>
      </div>
    </div>
  );
}
