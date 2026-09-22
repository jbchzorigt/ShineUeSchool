"use client";

/* Хуваарийн тойм: жил сонгох, тоон үзүүлэлт, хичээлийн жилүүдийн удирдлага (нэмэх, засах, одоогийн болгох, устгах). */

import Link from "next/link";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AcademicYear, AcademicYearInput } from "@/lib/types";
import { Badge, Button, Card, Empty, Field, Input, Modal, Select, Spinner, Table, Td, Th } from "@/components/ui";
import { useYear } from "@/components/timetable/useYear";
import { YearSelect } from "@/components/timetable/YearSelect";
import { confirmRemove, FormError, useModalForm } from "@/components/admin/timetable/forms";

const emptyYear = (): AcademicYearInput => ({ name: "", start_date: "", end_date: "", working_days: 5 });

export default function TimetableHome() {
  const { years, yearId, setYearId, loading, error, reload } = useYear();
  const statsQ = useFetch(() => (yearId ? api.timetable.stats(yearId) : null), [yearId]);
  const form = useModalForm<AcademicYearInput>();

  const save = () => form.submit((id, d) => (id ? api.timetable.years.update(id, d) : api.timetable.years.create(d)), reload);
  async function setCurrent(y: AcademicYear) {
    try { await api.timetable.years.setCurrent(y.id); reload(); } catch { alert("Солиж чадсангүй."); }
  }

  const s = statsQ.data;
  const tiles = s ? [
    { label: "Анги", value: s.classes, href: "/admin/timetable/setup?tab=classes" },
    { label: "Багш", value: s.teachers, href: "/admin/timetable/setup?tab=teachers" },
    { label: "Өрөө", value: s.rooms, href: "/admin/timetable/setup?tab=rooms" },
    { label: "Хуваарьт цаг", value: s.lessons, href: "/admin/timetable/grid" },
    { label: "Хөтөлбөртэй таарахгүй анги", value: s.mismatched_classes, href: "/admin/timetable/curriculum", warn: s.mismatched_classes > 0 },
  ] : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Хичээлийн хуваарь</h1>
          <p className="text-sm text-slate-600">Хичээлийн жил, цагийн хүснэгт, анги, багш, өрөө, хуваарь, хөтөлбөр, календарь.</p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelect years={years} value={yearId} onChange={setYearId} />
          <Button onClick={() => form.open(emptyYear())}>+ Шинэ жил</Button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading ? <Spinner /> : years.length === 0 ? (
        <Empty>Хичээлийн жил үүсгээгүй байна. &quot;Шинэ жил&quot; дарж эхэлнэ үү.</Empty>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {tiles.map((t) => (
              <Link key={t.label} href={t.href} className="block">
                <Card className={t.warn ? "border-red-200 bg-red-50" : ""}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.label}</div>
                  <div className={`mt-1 text-3xl font-black ${t.warn ? "text-red-700" : "text-navy"}`}>{t.value}</div>
                </Card>
              </Link>
            ))}
          </div>

          <Table head={<><Th>Жил</Th><Th>Эхлэх</Th><Th>Дуусах</Th><Th>Ажлын өдөр</Th><Th>Төлөв</Th><Th className="text-right">Үйлдэл</Th></>}>
            {years.map((y) => (
              <tr key={y.id}>
                <Td className="font-semibold">{y.name}</Td>
                <Td>{y.start_date}</Td>
                <Td>{y.end_date}</Td>
                <Td>{y.working_days}</Td>
                <Td>{y.is_current ? <Badge tone="green">Одоогийн</Badge> : <Button variant="ghost" onClick={() => setCurrent(y)}>Одоогийн болгох</Button>}</Td>
                <Td className="text-right space-x-2">
                  <Button variant="ghost" onClick={() => form.open({ name: y.name, start_date: y.start_date, end_date: y.end_date, working_days: y.working_days }, y.id)}>Засах</Button>
                  <Button variant="danger" onClick={() => confirmRemove(`"${y.name}" жилийг устгах уу? Түүний бүх анги, хуваарь, хөтөлбөр, календарь устана.`, () => api.timetable.years.remove(y.id), reload)}>Устгах</Button>
                </Td>
              </tr>
            ))}
          </Table>
        </>
      )}

      <Modal open={!!form.editing} title={form.editing?.id ? "Жил засах" : "Шинэ хичээлийн жил"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="year-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (
          <form id="year-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <Field label="Нэр" error={form.errors.name} hint="Жишээ: 2026–2027">
              <Input value={form.editing.data.name} onChange={(e) => form.set({ name: e.target.value })} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Эхлэх огноо" error={form.errors.start_date}><Input type="date" value={form.editing.data.start_date} onChange={(e) => form.set({ start_date: e.target.value })} required /></Field>
              <Field label="Дуусах огноо" error={form.errors.end_date}><Input type="date" value={form.editing.data.end_date} onChange={(e) => form.set({ end_date: e.target.value })} required /></Field>
            </div>
            <Field label="Долоо хоногийн ажлын өдөр" error={form.errors.working_days}>
              <Select value={form.editing.data.working_days} onChange={(e) => form.set({ working_days: Number(e.target.value) })}>
                <option value={5}>5 (Даваа–Баасан)</option>
                <option value={6}>6 (Даваа–Бямба)</option>
              </Select>
            </Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
