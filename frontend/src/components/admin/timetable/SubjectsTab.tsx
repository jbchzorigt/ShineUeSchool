"use client";

/* Хичээлүүд: нэр, товч нэр (хуваарийн нүдэнд), өнгө (хуваарийн зүүн зурвас). */

import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { SubjectInput } from "@/lib/types";
import { Button, Empty, Field, Input, Modal, Spinner, Table, Td, Th } from "@/components/ui";
import { confirmRemove, FormError, useModalForm } from "./forms";

export function SubjectsTab() {
  const q = useFetch(() => api.timetable.subjects.list(), []);
  const form = useModalForm<SubjectInput>();
  const save = () => form.submit((id, d) => (id ? api.timetable.subjects.update(id, d) : api.timetable.subjects.create(d)), q.reload);

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => form.open({ name: "", short_name: "", color: "#1e3a8f" })}>+ Хичээл</Button></div>
      {q.loading ? <Spinner /> : !q.data?.length ? <Empty>Хичээл байхгүй.</Empty> : (
        <Table head={<><Th>Нэр</Th><Th>Товч</Th><Th>Өнгө</Th><Th className="text-right">Үйлдэл</Th></>}>
          {q.data.map((s) => (
            <tr key={s.id}>
              <Td className="font-semibold">{s.name}</Td>
              <Td>{s.short_name}</Td>
              <Td><span className="inline-block h-5 w-5 rounded align-middle" style={{ background: s.color }} aria-label={s.color} /> <span className="text-xs text-slate-500">{s.color}</span></Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => form.open({ name: s.name, short_name: s.short_name, color: s.color }, s.id)}>Засах</Button>
                <Button variant="danger" onClick={() => confirmRemove(`"${s.name}" хичээлийг устгах уу?`, () => api.timetable.subjects.remove(s.id), q.reload)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={!!form.editing} title={form.editing?.id ? "Хичээл засах" : "Хичээл нэмэх"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="subject-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (
          <form id="subject-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <Field label="Нэр" error={form.errors.name}><Input value={form.editing.data.name} onChange={(e) => form.set({ name: e.target.value })} required /></Field>
            <Field label="Товч нэр" error={form.errors.short_name} hint="Хуваарийн нүдэнд, Excel-д ашиглана"><Input value={form.editing.data.short_name} maxLength={20} onChange={(e) => form.set({ short_name: e.target.value })} required /></Field>
            <Field label="Өнгө" error={form.errors.color}><Input type="color" value={form.editing.data.color} onChange={(e) => form.set({ color: e.target.value })} className="h-10 w-20 p-1" /></Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
