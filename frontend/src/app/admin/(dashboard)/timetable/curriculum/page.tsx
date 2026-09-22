"use client";

/* Хөтөлбөр: анги сонгоод хичээл бүрийн долоо хоногийн цаг. Хажууд хуваарьт орсон тоо (curriculum-check). */

import { useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Badge, Button, Empty, Field, Input, Modal, Select, Spinner, Table, Td, Th } from "@/components/ui";
import { useYear } from "@/components/timetable/useYear";
import { YearSelect } from "@/components/timetable/YearSelect";
import { confirmRemove, FormError, useModalForm } from "@/components/admin/timetable/forms";

interface EntryForm { subject_id: number; hours_per_week: number }

export default function CurriculumPage() {
  const { years, yearId, setYearId, loading, error: yearsError } = useYear();
  const classesQ = useFetch(() => (yearId ? api.timetable.classes.list(yearId) : null), [yearId]);
  const subjectsQ = useFetch(() => api.timetable.subjects.list(), []);
  const [classId, setClassId] = useState<number | null>(null);
  const cls = classesQ.data?.find((c) => c.id === classId) ?? classesQ.data?.[0] ?? null;
  const entriesQ = useFetch(() => (cls ? api.timetable.curriculum.list(cls.id) : null), [cls?.id]);
  const checkQ = useFetch(() => (cls ? api.timetable.classes.curriculumCheck(cls.id) : null), [cls?.id]);
  const form = useModalForm<EntryForm>();

  const reload = () => { entriesQ.reload(); checkQ.reload(); };
  const save = () => cls && form.submit((id, d) => (id
    ? api.timetable.curriculum.update(id, { hours_per_week: d.hours_per_week })
    : api.timetable.curriculum.create({ class_group_id: cls.id, subject_id: d.subject_id, hours_per_week: d.hours_per_week })), reload);
  const scheduled = (subjectId: number) => checkQ.data?.find((c) => c.subject.id === subjectId)?.scheduled ?? 0;
  const unplanned = checkQ.data?.filter((c) => c.planned === 0) ?? [];
  const available = subjectsQ.data?.filter((s) => !entriesQ.data?.some((e) => e.subject_id === s.id)) ?? [];
  const status = (planned: number, sch: number) =>
    sch === planned ? <Badge tone="green">Таарна</Badge> : sch < planned ? <Badge tone="gold">Дутуу {planned - sch}</Badge> : <Badge tone="slate">Илүү {sch - planned}</Badge>;
  const errorMsg = yearsError || classesQ.error || subjectsQ.error || entriesQ.error || checkQ.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Сургалтын хөтөлбөр</h1>
          <p className="text-sm text-slate-600">Анги бүрт хичээл бүр долоо хоногт хэдэн цаг байхыг заана; хуваарь үүнтэй харьцуулагдана.</p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelect years={years} value={yearId} onChange={(id) => { setClassId(null); setYearId(id); }} />
          <Select value={cls?.id ?? ""} onChange={(e) => setClassId(Number(e.target.value))} className="w-auto" aria-label="Анги">
            {classesQ.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Button disabled={!cls || available.length === 0} onClick={() => form.open({ subject_id: available[0]?.id ?? 0, hours_per_week: 1 })}>+ Хичээл</Button>
        </div>
      </div>

      {errorMsg && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</p>}

      {errorMsg ? null : loading || classesQ.loading ? <Spinner /> : !cls ? <Empty>Энэ жилд анги байхгүй.</Empty> : entriesQ.loading ? <Spinner /> : !entriesQ.data?.length ? (
        <Empty>{cls.name} ангид хөтөлбөр оруулаагүй байна.</Empty>
      ) : (
        <Table head={<><Th>Хичээл</Th><Th>Долоо хоногт</Th><Th>Хуваарьт</Th><Th>Төлөв</Th><Th className="text-right">Үйлдэл</Th></>}>
          {entriesQ.data.map((e) => (
            <tr key={e.id}>
              <Td className="font-semibold"><span className="mr-2 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: e.subject.color }} />{e.subject.name}</Td>
              <Td className="tabular-nums">{e.hours_per_week}</Td>
              <Td className="tabular-nums">{scheduled(e.subject_id)}</Td>
              <Td>{status(e.hours_per_week, scheduled(e.subject_id))}</Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => form.open({ subject_id: e.subject_id, hours_per_week: e.hours_per_week }, e.id)}>Засах</Button>
                <Button variant="danger" onClick={() => confirmRemove(`${e.subject.name}-ийг хөтөлбөрөөс хасах уу?`, () => api.timetable.curriculum.remove(e.id), reload)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      {unplanned.length > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Хөтөлбөрт байхгүй ч хуваарьт орсон: {unplanned.map((c) => `${c.subject.name} (${c.scheduled} цаг)`).join(", ")}
        </p>
      )}

      <Modal open={!!form.editing} title={form.editing?.id ? "Цаг засах" : "Хичээл нэмэх"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="curriculum-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (
          <form id="curriculum-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <Field label="Хичээл" error={form.errors.subject_id}>
              {form.editing.id ? (
                <Input value={subjectsQ.data?.find((s) => s.id === form.editing?.data.subject_id)?.name ?? ""} disabled />
              ) : (
                <Select value={form.editing.data.subject_id} onChange={(e) => form.set({ subject_id: Number(e.target.value) })}>
                  {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Долоо хоногт хэдэн цаг" error={form.errors.hours_per_week}>
              <Input type="number" min={1} max={20} value={form.editing.data.hours_per_week} onChange={(e) => form.set({ hours_per_week: Number(e.target.value) })} required />
            </Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
