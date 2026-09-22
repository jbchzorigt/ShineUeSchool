"use client";

/* Академик календарь: жилийн үйл явдлууд огноогоор (улирал, амралт, шалгалт, үйл явдал). */

import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AppliesTo, CalendarEventInput, EventCategory } from "@/lib/types";
import { Badge, Button, Empty, Field, Input, Modal, Select, Spinner, Table, Td, Textarea, Th } from "@/components/ui";
import { APPLIES_TO, EVENT_CATEGORIES, EVENT_COLORS, eventColor } from "@/components/timetable/format";
import { useYear } from "@/components/timetable/useYear";
import { YearSelect } from "@/components/timetable/YearSelect";
import { confirmRemove, FormError, useModalForm } from "@/components/admin/timetable/forms";

const TONE: Record<EventCategory, "navy" | "green" | "gold" | "slate"> = { term: "navy", holiday: "green", exam: "gold", event: "gold", other: "slate" };

export default function CalendarAdminPage() {
  const { years, year, yearId, setYearId, loading, error: yearsError } = useYear();
  const q = useFetch(() => (yearId ? api.timetable.calendar.list(yearId) : null), [yearId]);
  const form = useModalForm<CalendarEventInput>();
  const save = () => form.submit((id, d) => (id
    ? api.timetable.calendar.update(id, { title: d.title, category: d.category, start_date: d.start_date, end_date: d.end_date, description: d.description, applies_to: d.applies_to, color: d.color })
    : api.timetable.calendar.create(d)), q.reload);
  const dates = (s: string, e: string) => (s === e ? s : `${s} — ${e}`);
  const errorMsg = yearsError || q.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Академик календарь</h1>
          <p className="text-sm text-slate-600">Улирал, амралт, шалгалт, үйл явдлууд. Олон нийтийн /calendar хуудсанд харагдана.</p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelect years={years} value={yearId} onChange={setYearId} />
          <Button disabled={!year} onClick={() => year && form.open({ year_id: year.id, title: "", category: "event", start_date: year.start_date, end_date: year.start_date, description: "", applies_to: "all", color: "" })}>+ Үйл явдал</Button>
        </div>
      </div>
      {errorMsg && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</p>}
      {errorMsg ? null : loading || q.loading ? <Spinner /> : !yearId ? <Empty>Хичээлийн жил байхгүй.</Empty> : !q.data?.length ? <Empty>Үйл явдал байхгүй.</Empty> : (
        <Table head={<><Th>Огноо</Th><Th>Гарчиг</Th><Th>Ангилал</Th><Th>Хэнд</Th><Th className="text-right">Үйлдэл</Th></>}>
          {q.data.map((e) => (
            <tr key={e.id}>
              <Td className="whitespace-nowrap tabular-nums">{dates(e.start_date, e.end_date)}</Td>
              <Td><div className="font-semibold">{e.title}</div>{e.description && <div className="text-xs text-slate-500">{e.description}</div>}</Td>
              <Td><span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: eventColor(e) }} aria-hidden="true" /><Badge tone={TONE[e.category]}>{EVENT_CATEGORIES[e.category]}</Badge></Td>
              <Td>{APPLIES_TO[e.applies_to]}</Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => form.open({ year_id: e.year_id, title: e.title, category: e.category, start_date: e.start_date, end_date: e.end_date, description: e.description, applies_to: e.applies_to, color: e.color }, e.id)}>Засах</Button>
                <Button variant="danger" onClick={() => confirmRemove(`"${e.title}"-г устгах уу?`, () => api.timetable.calendar.remove(e.id), q.reload)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!form.editing} title={form.editing?.id ? "Үйл явдал засах" : "Үйл явдал нэмэх"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="event-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (
          <form id="event-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <Field label="Гарчиг" error={form.errors.title}><Input value={form.editing.data.title} onChange={(e) => form.set({ title: e.target.value })} required /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ангилал" error={form.errors.category}>
                <Select value={form.editing.data.category} onChange={(e) => form.set({ category: e.target.value as EventCategory })}>
                  {(Object.keys(EVENT_CATEGORIES) as EventCategory[]).map((k) => <option key={k} value={k}>{EVENT_CATEGORIES[k]}</option>)}
                </Select>
              </Field>
              <Field label="Хэнд хамаарах" error={form.errors.applies_to}>
                <Select value={form.editing.data.applies_to} onChange={(e) => form.set({ applies_to: e.target.value as AppliesTo })}>
                  {(Object.keys(APPLIES_TO) as AppliesTo[]).map((k) => <option key={k} value={k}>{APPLIES_TO[k]}</option>)}
                </Select>
              </Field>
              <Field label="Эхлэх" error={form.errors.start_date}><Input type="date" value={form.editing.data.start_date} onChange={(e) => form.set({ start_date: e.target.value })} required /></Field>
              <Field label="Дуусах" error={form.errors.end_date}><Input type="date" value={form.editing.data.end_date} onChange={(e) => form.set({ end_date: e.target.value })} required /></Field>
            </div>
            <Field label="Өнгө" error={form.errors.color} hint={form.editing.data.color ? "Өөрийн өнгө" : `Ангиллын анхдагч өнгө (${EVENT_CATEGORIES[form.editing.data.category]})`}>
              <div className="flex items-center gap-3">
                <Input type="color" value={form.editing.data.color || EVENT_COLORS[form.editing.data.category]} onChange={(e) => form.set({ color: e.target.value })} className="h-10 w-20 p-1" aria-label="Өнгө сонгох" />
                {form.editing.data.color && <Button type="button" variant="ghost" onClick={() => form.set({ color: "" })}>Анхдагч руу буцаах</Button>}
              </div>
            </Field>
            <Field label="Тайлбар" error={form.errors.description}><Textarea value={form.editing.data.description} onChange={(e) => form.set({ description: e.target.value })} /></Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
