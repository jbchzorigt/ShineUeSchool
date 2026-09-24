"use client";

/* /admin/about/departments — зүүн тэнхимийн жагсаалт, баруун сонгосон тэнхимийн багш нар. Утсанд дээр доороо. */

import { useState } from "react";
import { DepartmentList } from "@/components/admin/about/DepartmentList";
import { TeacherTable } from "@/components/admin/about/TeacherTable";
import { Empty, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AboutDepartment } from "@/lib/types";

export default function DepartmentsAdminPage() {
  const q = useFetch(() => api.about.departments.list(), []);
  const [picked, setPicked] = useState<number | null>(null);
  // reload() дуудагдахад q.data агшин зуур undefined болдог (useFetch); хэрэв үүнд тулгуурлаж Spinner
  // үзүүлбэл DepartmentList/TeacherTable unmount хийгдэж, дотоод state (inline засварын мөр) алдагдана.
  // Тиймээс сүүлд амжилттай ирсэн жагсаалтыг state-д барьж, дахин ачаалах хооронд харуулна.
  const [departments, setDepartments] = useState<AboutDepartment[] | null>(null);
  if (q.data && q.data !== departments) setDepartments(q.data);

  if (q.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  if (!departments) return <Spinner />;
  const list = departments;
  const selected = list.find((d) => d.id === picked) ?? list[0] ?? null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Тэнхимүүд</h1>
        <p className="text-sm text-slate-600">Тэнхим бүрийн багш нар; эрхлэгч олон нийтийн хуудсанд эхэнд, шар тэмдэгтэй харагдана.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <DepartmentList departments={list} selectedId={selected?.id ?? null} onSelect={setPicked} onChanged={q.reload} />
        <div className="lg:col-span-2">
          {selected ? <TeacherTable key={selected.id} department={selected} onChanged={q.reload} /> : <Empty>Тэнхим нэмнэ үү.</Empty>}
        </div>
      </div>
    </div>
  );
}
