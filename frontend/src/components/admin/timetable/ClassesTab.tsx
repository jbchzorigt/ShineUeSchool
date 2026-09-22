"use client";

/* Бүлэг ангиуд: анги (1–12) + үсэг, цагийн хүснэгт, анги даасан багш. */

import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { ClassGroupInput } from "@/lib/types";
import { Button, Empty, Field, Input, Modal, Select, Spinner, Table, Td, Th } from "@/components/ui";
import { confirmRemove, FormError, useModalForm } from "./forms";

export function ClassesTab({ yearId }: { yearId: number }) {
  const classesQ = useFetch(() => api.timetable.classes.list(yearId), [yearId]);
  const setsQ = useFetch(() => api.timetable.periodSets.list(yearId), [yearId]);
  const teachersQ = useFetch(() => api.timetable.teachers.list(true), []);
  const form = useModalForm<ClassGroupInput>();

  const save = () => form.submit((id, d) => (id
    ? api.timetable.classes.update(id, { grade: d.grade, letter: d.letter, period_set_id: d.period_set_id, homeroom_teacher_id: d.homeroom_teacher_id })
    : api.timetable.classes.create(d)), classesQ.reload);
  const setName = (id: number) => setsQ.data?.find((s) => s.id === id)?.name ?? "—";
  const teacherName = (id: number | null) => (id ? teachersQ.data?.find((t) => t.id === id)?.short_name ?? "—" : "—");
  const firstSet = setsQ.data?.[0]?.id ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button disabled={!firstSet} onClick={() => form.open({ year_id: yearId, grade: 1, letter: "а", period_set_id: firstSet, homeroom_teacher_id: null })}>+ Анги</Button>
      </div>
      {!setsQ.loading && !setsQ.data?.length && <p className="text-sm text-amber-700">Эхлээд &quot;Цагийн хүснэгт&quot; таб дээр хүснэгт үүсгэнэ үү — анги бүр нэг хүснэгттэй байна.</p>}
      {classesQ.loading ? <Spinner /> : !classesQ.data?.length ? <Empty>Анги байхгүй.</Empty> : (
        <Table head={<><Th>Анги</Th><Th>Цагийн хүснэгт</Th><Th>Анги даасан багш</Th><Th className="text-right">Үйлдэл</Th></>}>
          {classesQ.data.map((c) => (
            <tr key={c.id}>
              <Td className="font-semibold">{c.name}</Td>
              <Td>{setName(c.period_set_id)}</Td>
              <Td>{teacherName(c.homeroom_teacher_id)}</Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => form.open({ year_id: c.year_id, grade: c.grade, letter: c.letter, period_set_id: c.period_set_id, homeroom_teacher_id: c.homeroom_teacher_id }, c.id)}>Засах</Button>
                <Button variant="danger" onClick={() => confirmRemove(`${c.name} ангийг устгах уу? Хуваарь, хөтөлбөр нь устана.`, () => api.timetable.classes.remove(c.id), classesQ.reload)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!form.editing} title={form.editing?.id ? "Анги засах" : "Анги нэмэх"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="class-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (
          <form id="class-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Анги" error={form.errors.grade}>
                <Select value={form.editing.data.grade} onChange={(e) => form.set({ grade: Number(e.target.value) })}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{g}</option>)}
                </Select>
              </Field>
              <Field label="Үсэг" error={form.errors.letter} hint="а, б, в ..."><Input value={form.editing.data.letter} maxLength={4} onChange={(e) => form.set({ letter: e.target.value })} required /></Field>
            </div>
            <Field label="Цагийн хүснэгт" error={form.errors.period_set_id}>
              <Select value={form.editing.data.period_set_id} onChange={(e) => form.set({ period_set_id: Number(e.target.value) })}>
                {setsQ.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Анги даасан багш" error={form.errors.homeroom_teacher_id}>
              <Select value={form.editing.data.homeroom_teacher_id ?? ""} onChange={(e) => form.set({ homeroom_teacher_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— байхгүй —</option>
                {teachersQ.data?.map((t) => <option key={t.id} value={t.id}>{t.short_name}</option>)}
              </Select>
            </Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
