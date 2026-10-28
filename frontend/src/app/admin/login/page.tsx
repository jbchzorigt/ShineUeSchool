"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Аль хэдийн нэвтэрсэн бол дашбоард руу.
  useEffect(() => { if (!loading && user) router.replace("/admin"); }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await login(username, password);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Нэвтрэх нэр эсвэл нууц үг буруу байна." : "Сервертэй холбогдож чадсангүй.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        {/* Сургуулийн бүтэн лого + "Удирдлагын самбар" */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <Image src="/logo-full.png" alt="Шинэ Үе сургууль" width={483} height={143} priority className="h-16 w-auto" />
          <div className="text-xs font-semibold tracking-widest text-slate-500">УДИРДЛАГЫН САМБАР</div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Нэвтрэх</h1>
          <Field label="Нэвтрэх нэр">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required autoFocus />
          </Field>
          <Field label="Нууц үг">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </Field>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Шалгаж байна…" : "Нэвтрэх"}</Button>
          <p className="text-center text-xs text-slate-500">Superuser эсвэл эрхийн бүлэгтэй хэрэглэгчийн нэвтрэх нэр, нууц үг.</p>
        </form>
      </div>
    </main>
  );
}
