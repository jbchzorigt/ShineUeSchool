"use client";

/* Жижиг өгөгдөл татах hook.
   - deps өөрчлөгдөх бүрт fetcher-ийг дахин дуудна.
   - Хоцорч ирсэн хуучин хариуг хаяна (race condition-оос хамгаална).
   - reload() нь ижил deps-ээр дахин татна.
   Бүх setState нь promise callback дотор байдаг тул React-ийн
   "set-state-in-effect" lint дүрэмтэй нийцнэ. */

import { useCallback, useEffect, useState } from "react";

export function useFetch<T>(fetcher: () => Promise<T> | null, deps: unknown[]) {
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(deps) + "#" + tick;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key: "" });

  useEffect(() => {
    const p = fetcher();
    if (!p) return;
    let alive = true;
    p.then((data) => alive && setState({ key, data }))
     .catch((e: unknown) => alive && setState({ key, error: e instanceof Error ? e.message : "Алдаа гарлаа" }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const fresh = state.key === key;
  return { data: fresh ? state.data : undefined, error: fresh ? state.error : undefined, loading: !fresh, reload };
}
