"use client";

/* Хуваарь засах: жил → анги сонгоод GridEditor. Анги солиход хадгалаагүй өөрчлөлт байвал баталгаажуулна. */

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Empty, Select, Spinner } from "@/components/ui";
import { useYear } from "@/components/timetable/useYear";
import { YearSelect } from "@/components/timetable/YearSelect";
import { GridEditor } from "@/components/admin/timetable/GridEditor";

export default function GridPage() {
  const { years, year, yearId, setYearId, loading } = useYear();
  const classesQ = useFetch(() => (yearId ? api.timetable.classes.list(yearId) : null), [yearId]);
  const setsQ = useFetch(() => (yearId ? api.timetable.periodSets.list(yearId) : null), [yearId]);
  const subjectsQ = useFetch(() => api.timetable.subjects.list(), []);
  const teachersQ = useFetch(() => api.timetable.teachers.list(true), []);
  const roomsQ = useFetch(() => api.timetable.rooms.list(), []);
  const [classId, setClassId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const onDirtyChange = useCallback((d: boolean) => setDirty(d), []);

  const cls = classesQ.data?.find((c) => c.id === classId) ?? classesQ.data?.[0] ?? null;
  const lessonsQ = useFetch(() => (cls ? api.timetable.lessons.list({ year: cls.year_id, class: cls.id }) : null), [cls?.id]);
  const currQ = useFetch(() => (cls ? api.timetable.curriculum.list(cls.id) : null), [cls?.id]);
  const periodSet = setsQ.data?.find((s) => s.id === cls?.period_set_id);
  const firstError = classesQ.error ?? setsQ.error ?? subjectsQ.error ?? teachersQ.error ?? roomsQ.error ?? lessonsQ.error ?? currQ.error;

  function pick(id: number) {
    if (dirty && !confirm("Хадгалаагүй өөрчлөлт байна. Хаяад өөр анги руу шилжих үү?")) return;
    setDirty(false);
    setClassId(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Хуваарь</h1>
          <p className="text-sm text-slate-600">Нүд дээр дарж хичээл, багш, өрөө сонгоно. Tab — нүд хооронд, Enter — нээх, Esc — хаах.</p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelect years={years} value={yearId} onChange={(id) => { if (!dirty || confirm("Хадгалаагүй өөрчлөлт байна. Жил солих уу?")) { setDirty(false); setClassId(null); setYearId(id); } }} />
          <Select value={cls?.id ?? ""} onChange={(e) => pick(Number(e.target.value))} className="w-auto" aria-label="Анги">
            {classesQ.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </div>
      {firstError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{firstError}</p>
      ) : loading || classesQ.loading ? <Spinner /> : !classesQ.data?.length ? (
        <Empty>Энэ жилд анги байхгүй. &quot;Тохиргоо → Ангиуд&quot; хэсэгт нэмнэ үү.</Empty>
      ) : cls && setsQ.data && !periodSet ? (
        <Empty>Энэ ангийн цагийн хүснэгт олдсонгүй. Тохиргоо → Ангиуд хэсэгт шалгана уу.</Empty>
      ) : cls && periodSet && year && lessonsQ.data && currQ.data && subjectsQ.data && teachersQ.data && roomsQ.data ? (
        <GridEditor key={cls.id} classGroup={cls} periodSet={periodSet} workingDays={year.working_days}
                    subjects={subjectsQ.data} teachers={teachersQ.data} rooms={roomsQ.data} curriculum={currQ.data}
                    initialLessons={lessonsQ.data} onDirtyChange={onDirtyChange} />
      ) : <Spinner />}
    </div>
  );
}
