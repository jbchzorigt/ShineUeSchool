"use client";

/* Мэдээний ангилал удирдах: жагсаалт, нэмэх, засах, устгах. */

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { NewsCategory } from "@/lib/types";
import { Badge, Button, Empty, Field, Input, Modal, Spinner, Table, Td, Th } from "@/components/ui";

interface CategoryForm { name: string; slug: string; order: number }

const empty = (): CategoryForm => ({ name: "", slug: "", order: 0 });

export default function NewsCategoriesPage() {
  const catsQ = useFetch(() => api.news.categories.list(), []);
  const [editing, setEditing] = useState<{ id?: number; data: CategoryForm } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<CategoryForm>) => editing && setEditing({ ...editing, data: { ...editing.data, ...patch } });

  function openEdit(c: NewsCategory) {
    setErrors({});
    setEditing({ id: c.id, data: { name: c.name, slug: c.slug, order: c.order } });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true); setErrors({});
    try {
      const d = { name: editing.data.name, slug: editing.data.slug || undefined, order: editing.data.order };
      if (editing.id) await api.news.categories.update(editing.id, d);
      else await api.news.categories.create(d);
      setEditing(null);
      catsQ.reload();
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  async function remove(c: NewsCategory) {
    if (!confirm(`"${c.name}" ангиллыг устгах уу? Мэдээнүүд ангилалгүй болно.`)) return;
    try { await api.news.categories.remove(c.id); catsQ.reload(); }
    catch (err) { alert(err instanceof ApiError ? Object.values(err.fieldErrors).join(" ") : "Устгаж чадсангүй."); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">Мэдээний ангилал</h1>
          <p className="text-sm text-slate-600">Мэдээг ангилахад ашиглагдах бүлгүүд.</p>
        </div>
        <Button onClick={() => { setErrors({}); setEditing({ data: empty() }); }}>+ Ангилал нэмэх</Button>
      </div>

      {catsQ.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{catsQ.error}</p>}
      {catsQ.loading ? <Spinner /> : !catsQ.data?.length ? <Empty>Ангилал байхгүй.</Empty> : (
        <Table head={<><Th>Нэр</Th><Th>Slug</Th><Th>Дараалал</Th><Th>Мэдээ</Th><Th className="text-right">Үйлдэл</Th></>}>
          {catsQ.data.map((c) => (
            <tr key={c.id} className="border-t border-slate-100">
              <Td className="font-semibold">{c.name}</Td>
              <Td className="text-slate-600">{c.slug}</Td>
              <Td>{c.order}</Td>
              <Td><Badge tone="navy">{c.post_count}</Badge></Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => openEdit(c)}>Засах</Button>
                <Button variant="danger" onClick={() => remove(c)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!editing} title={editing?.id ? "Ангилал засах" : "Ангилал нэмэх"} onClose={() => setEditing(null)}
             footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Болих</Button><Button type="submit" form="category-form" disabled={busy}>Хадгалах</Button></>}>
        {editing && (
          <form id="category-form" onSubmit={save} className="space-y-4">
            {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
            <Field label="Нэр" error={errors.name}><Input value={editing.data.name} onChange={(e) => set({ name: e.target.value })} required /></Field>
            <Field label="Slug" error={errors.slug} hint="Хоосон орхивол нэрнээс автоматаар үүснэ">
              <Input value={editing.data.slug} onChange={(e) => set({ slug: e.target.value })} />
            </Field>
            <Field label="Дараалал" error={errors.order}>
              <Input type="number" value={editing.data.order} onChange={(e) => set({ order: Number(e.target.value) })} />
            </Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
