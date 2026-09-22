"use client";

/* Багш нар: овог, нэр, товч нэр (Б.Мухулай — хуваарь, Excel-д), заадаг хичээлүүд, идэвхтэй эсэх. */

import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { TeacherInput } from "@/lib/types";
import { Badge, Button, Empty, Field, Input, Modal, Spinner, Table, Td, Th } from "@/components/ui";
import { confirmRemove, FormError, useModalForm } from "./forms";

export function TeachersTab() {
  const q = useFetch(() => api.timetable.teachers.list(), []);
  const subjectsQ = useFetch(() => api.timetable.subjects.list(), []);
  const form = useModalForm<TeacherInput>();
  const save = () => form.submit((id, d) => (id ? api.timetable.teachers.update(id, d) : api.timetable.teachers.create(d)), q.reload);
  const subjectName = (id: number) => subjectsQ.data?.find((s) => s.id === id)?.short_name ?? "?";

  function toggleSubject(id: number) {
    const ids = form.editing?.data.subject_ids ?? [];
    form.set({ subject_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => form.open({ last_name: "", first_name: "", short_name: "", is_active: true, subject_ids: [] })}>+ Багш</Button></div>
      {q.loading ? <Spinner /> : !q.data?.length ? <Empty>Багш байхгүй.</Empty> : (
        <Table head={<><Th>Товч нэр</Th><Th>Овог, нэр</Th><Th>Хичээлүүд</Th><Th>Төлөв</Th><Th className="text-right">Үйлдэл</Th></>}>
          {q.data.map((t) => (
            <tr key={t.id} className={t.is_active ? "" : "text-slate-400"}>
              <Td className="font-semibold">{t.short_name}</Td>
              <Td>{t.full_name}</Td>
              <Td className="space-x-1">{t.subject_ids.map((id) => <Badge key={id} tone="navy">{subjectName(id)}</Badge>)}</Td>
              <Td>{t.is_active ? <Badge tone="green">Идэвхтэй</Badge> : <Badge tone="slate">Идэвхгүй</Badge>}</Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => form.open({ last_name: t.last_name, first_name: t.first_name, short_name: t.short_name, is_active: t.is_active, subject_ids: t.subject_ids }, t.id)}>Засах</Button>
                <Button variant="danger" onClick={() => confirmRemove(`${t.short_name} багшийг устгах уу?`, () => api.timetable.teachers.remove(t.id), q.reload)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={!!form.editing} title={form.editing?.id ? "Багш засах" : "Багш нэмэх"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="teacher-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (() => { const ids = form.editing.data.subject_ids; return (
          <form id="teacher-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Овог" error={form.errors.last_name}><Input value={form.editing.data.last_name} onChange={(e) => form.set({ last_name: e.target.value })} /></Field>
              <Field label="Нэр" error={form.errors.first_name}><Input value={form.editing.data.first_name} onChange={(e) => form.set({ first_name: e.target.value })} required /></Field>
            </div>
            <Field label="Товч нэр" error={form.errors.short_name} hint="Хуваарь, Excel-д ашиглана. Жишээ: Б.Мухулай">
              <Input value={form.editing.data.short_name} onChange={(e) => form.set({ short_name: e.target.value })} required />
            </Field>
            <Field label="Заадаг хичээлүүд" error={form.errors.subject_ids}>
              <div className="flex flex-wrap gap-2">
                {subjectsQ.data?.map((s) => (
                  <label key={s.id} className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-sm">
                    <input type="checkbox" checked={ids.includes(s.id)} onChange={() => toggleSubject(s.id)} className="accent-navy" />{s.name}
                  </label>
                ))}
              </div>
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.editing.data.is_active} onChange={(e) => form.set({ is_active: e.target.checked })} className="h-4 w-4 accent-navy" />
              Идэвхтэй (хуваарьт сонгогдох боломжтой)
            </label>
          </form>
        ); })()}
      </Modal>
    </div>
  );
}
