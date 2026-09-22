"use client";

/* Цагийн хүснэгтүүд (карт бүр нэг хүснэгт) ба цаг бүрийн мөр. Завсарлагыг тусдаа мөр болгож оруулна.
   Дугаарлалт: Period.order бол ХИЧЭЭЛИЙН дугаар (1..n); мөрүүд цагаар (start_time) эрэмблэгдэнэ.
   Завсарлагын order нь 101+ байх ба дугаараар харуулагдахгүй. */

import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { PeriodInput, PeriodSet } from "@/lib/types";
import { Badge, Button, Card, Empty, Field, Input, Modal, Spinner, Table, Td, Th } from "@/components/ui";
import { hm } from "@/components/timetable/format";
import { confirmRemove, FormError, useModalForm } from "./forms";

/** Дараагийн ЗАВСАРЛАГЫН order: 101 + одоо байгаа завсарлагын тоо, авагдсан бол цааш нэмнэ. */
function nextBreakOrder(s: PeriodSet | undefined): number {
  const taken = new Set((s?.periods ?? []).filter((p) => p.is_break).map((p) => p.order));
  let order = 101 + taken.size;
  while (taken.has(order)) order++;
  return order;
}

export function PeriodsTab({ yearId }: { yearId: number }) {
  const setsQ = useFetch(() => api.timetable.periodSets.list(yearId), [yearId]);
  const setForm = useModalForm<{ name: string }>();
  const periodForm = useModalForm<PeriodInput>();

  const saveSet = () => setForm.submit((id, d) => (id ? api.timetable.periodSets.update(id, d) : api.timetable.periodSets.create({ year_id: yearId, name: d.name })), setsQ.reload);
  const savePeriod = () => periodForm.submit((id, d) => {
    const set = setsQ.data?.find((s) => s.id === d.period_set_id);
    let order = d.order;
    // Хоёр чиглэлд симметр: хичээл ↔ завсарлага сэлгэхэд дугаарыг зохих мужид дахин тооцно.
    if (d.is_break && order < 101) order = nextBreakOrder(set);
    if (!d.is_break && order >= 101) order = nextOrder(set);
    const data: PeriodInput = { ...d, order };
    return id ? api.timetable.periods.update(id, { order: data.order, start_time: data.start_time, end_time: data.end_time, is_break: data.is_break }) : api.timetable.periods.create(data);
  }, setsQ.reload);
  /** Дараагийн ХИЧЭЭЛИЙН дугаар: зөвхөн завсарлага биш мөрүүдийг тоолно.
      Засварлаж буй мөр өөрөө завсарлага хэвээрээ бол s.periods дотор is_break=true хэвээр байгаа тул автоматаар хасагдана. */
  const nextOrder = (s: PeriodSet | undefined) => {
    const lessons = (s?.periods ?? []).filter((p) => !p.is_break);
    return lessons.length ? Math.max(...lessons.map((p) => p.order)) + 1 : 1;
  };
  const lastEnd = (s: PeriodSet) => (s.periods.length ? hm(s.periods[s.periods.length - 1].end_time) : "08:00");

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button onClick={() => setForm.open({ name: "" })}>+ Цагийн хүснэгт</Button></div>
      <p className="text-xs text-slate-500">Дугаар = хичээлийн дугаар (1, 2, …); мөрүүд цагаар эрэмблэгдэнэ. Завсарлагад дугаар өгөхгүй.</p>
      {setsQ.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{setsQ.error}</p>}
      {setsQ.loading ? <Spinner /> : !setsQ.data?.length ? (
        <Empty>Цагийн хүснэгт байхгүй. Жишээ: &quot;Бага анги&quot; (35 мин), &quot;Дунд, ахлах анги&quot; (40 мин).</Empty>
      ) : setsQ.data.map((s) => (
        <Card key={s.id} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-navy">{s.name}</h2>
            <div className="space-x-2">
              <Button variant="ghost" onClick={() => periodForm.open({ period_set_id: s.id, order: nextOrder(s), start_time: lastEnd(s), end_time: "", is_break: false })}>+ Цаг</Button>
              <Button variant="ghost" onClick={() => setForm.open({ name: s.name }, s.id)}>Нэр засах</Button>
              <Button variant="danger" onClick={() => confirmRemove(`"${s.name}" хүснэгтийг устгах уу?`, () => api.timetable.periodSets.remove(s.id), setsQ.reload)}>Устгах</Button>
            </div>
          </div>
          {s.periods.length === 0 ? <p className="text-sm text-slate-500">Цаг нэмээгүй байна.</p> : (
            <Table head={<><Th>№</Th><Th>Эхлэх</Th><Th>Дуусах</Th><Th>Төрөл</Th><Th className="text-right">Үйлдэл</Th></>}>
              {s.periods.map((p) => (
                <tr key={p.id} className={p.is_break ? "bg-slate-50" : ""}>
                  <Td>{p.is_break ? "—" : p.order}</Td><Td>{hm(p.start_time)}</Td><Td>{hm(p.end_time)}</Td>
                  <Td>{p.is_break ? <Badge tone="slate">Завсарлага</Badge> : <Badge tone="navy">Хичээл</Badge>}</Td>
                  <Td className="text-right space-x-2">
                    <Button variant="ghost" onClick={() => periodForm.open({ period_set_id: s.id, order: p.order, start_time: hm(p.start_time), end_time: hm(p.end_time), is_break: p.is_break }, p.id)}>Засах</Button>
                    <Button variant="danger" onClick={() => confirmRemove(p.is_break ? "Завсарлагыг устгах уу?" : `${p.order}-р цагийг устгах уу?`, () => api.timetable.periods.remove(p.id), setsQ.reload)}>Устгах</Button>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      ))}

      <Modal open={!!setForm.editing} title={setForm.editing?.id ? "Хүснэгтийн нэр" : "Цагийн хүснэгт нэмэх"} onClose={setForm.close}
             footer={<><Button variant="ghost" onClick={setForm.close}>Болих</Button><Button type="submit" form="period-set-form" disabled={setForm.busy}>Хадгалах</Button></>}>
        {setForm.editing && (
          <form id="period-set-form" onSubmit={(e) => { e.preventDefault(); saveSet(); }} className="space-y-4">
            <FormError errors={setForm.errors} />
            <Field label="Нэр" error={setForm.errors.name}><Input value={setForm.editing.data.name} onChange={(e) => setForm.set({ name: e.target.value })} required /></Field>
          </form>
        )}
      </Modal>

      <Modal open={!!periodForm.editing} title={periodForm.editing?.id ? "Цаг засах" : "Цаг нэмэх"} onClose={periodForm.close}
             footer={<><Button variant="ghost" onClick={periodForm.close}>Болих</Button><Button type="submit" form="period-form" disabled={periodForm.busy}>Хадгалах</Button></>}>
        {periodForm.editing && (() => {
          const editingData = periodForm.editing.data;
          const set = setsQ.data?.find((s) => s.id === editingData.period_set_id);
          return (
            <form id="period-form" onSubmit={(e) => { e.preventDefault(); savePeriod(); }} className="space-y-4">
              <FormError errors={periodForm.errors} />
              {!editingData.is_break && (
                <Field label="Дугаар" error={periodForm.errors.order} hint="Хичээлийн дугаар (1, 2, …)">
                  <Input type="number" min={1} max={20} value={editingData.order} onChange={(e) => periodForm.set({ order: Number(e.target.value) })} required />
                </Field>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Эхлэх" error={periodForm.errors.start_time}><Input type="time" value={editingData.start_time} onChange={(e) => periodForm.set({ start_time: e.target.value })} required /></Field>
                <Field label="Дуусах" error={periodForm.errors.end_time}><Input type="time" value={editingData.end_time} onChange={(e) => periodForm.set({ end_time: e.target.value })} required /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editingData.is_break}
                  onChange={(e) => {
                    const isBreak = e.target.checked;
                    periodForm.set({ is_break: isBreak, order: isBreak ? nextBreakOrder(set) : nextOrder(set) });
                  }}
                  className="h-4 w-4 accent-navy"
                />
                Завсарлага (хичээл оруулахгүй, хуваарьт саарал мөр, дугааргүй)
              </label>
            </form>
          );
        })()}
      </Modal>
    </div>
  );
}
