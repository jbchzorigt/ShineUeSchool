"use client";

/* =====================================================================
   Зочны (Facebook) нэвтрэлтийн context.
   - Ачаалахад /api/social/facebook/status/-ийг татаж, идэвхтэй бол Facebook
     JS SDK-г динамикаар (script tag) нэг удаа ачаална, FB.init хийнэ.
   - login() → FB.login → access token → POST /api/social/facebook/login/
     → {token, visitor} localStorage-д (shineue.visitor) хадгална.
   - visitorFetch(path, init): localStorage-ийн токеныг Bearer header-ээр
     нэмж backend рүү дуудна (React context-оос үл хамаарах энгийн функц тул
     клиент бүрдэл бүрд useVisitor() дуудаж token дамжуулах шаардлагагүй).
     401 хариу ирвэл хадгалсан токен хүчингүй болсон гэж үзэж storage-г
     цэвэрлээд, идэвхтэй VisitorProvider-ийн logout()-ыг дуудна.
   Бүх setState нь promise callback/handler дотор байгаа тул
   react-hooks/set-state-in-effect дүрэмтэй нийцнэ.
   ===================================================================== */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { FbStatus, VisitorRef } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const STORAGE_KEY = "shineue.visitor";
const FB_VERSION = "v21.0";

interface FBLoginResponse {
  authResponse?: { accessToken: string } | null;
  status: string;
}

declare global {
  interface Window {
    FB?: {
      init: (opts: { appId: string; version: string; xfbml: boolean }) => void;
      login: (cb: (res: FBLoginResponse) => void, opts: { scope: string }) => void;
    };
    fbAsyncInit?: () => void;
  }
}

interface StoredVisitor {
  token: string;
  visitor: VisitorRef;
}

function loadStored(): StoredVisitor | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredVisitor) : null;
  } catch {
    return null;
  }
}

function clearStored() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* Идэвхтэй VisitorProvider-ийн logout()-ыг энд бүртгэнэ, ингэснээр visitorFetch
   (React hook биш, module-level функц) 401 ирэхэд context state-ийг цэвэрлэж чадна. */
let activeLogout: (() => void) | null = null;

/* Facebook SDK скриптийг нэг л удаа нэмнэ; давхар дуудвал ижил promise буцна.
   Амжилттай бол window.FB бэлэн болсны дараа л resolve хийнэ; script ачаалж
   чадаагүй (onerror) бол reject хийнэ — дуудагч талд fbReady false хэвээр үлдэнэ. */
let fbReadyPromise: Promise<void> | null = null;
function ensureFacebookSdk(appId: string): Promise<void> {
  if (fbReadyPromise) return fbReadyPromise;
  fbReadyPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("no window"));
      return;
    }

    const initAndResolve = () => {
      window.FB?.init({ appId, version: FB_VERSION, xfbml: false });
      resolve();
    };

    if (document.getElementById("facebook-jssdk")) {
      // Скрипт өмнө нь (жишээ нь өөр VisitorProvider instance-оор) нэмэгдсэн.
      if (window.FB) {
        resolve();
        return;
      }
      const prevInit = window.fbAsyncInit;
      window.fbAsyncInit = () => {
        prevInit?.();
        initAndResolve();
      };
      // fbAsyncInit аль хэдийн дуудагдсан байж болзошгүй тул богино хугацаанд poll хийж нөхнө.
      let tries = 0;
      const poll = setInterval(() => {
        tries += 1;
        if (window.FB) {
          clearInterval(poll);
          resolve();
        } else if (tries > 40) {
          clearInterval(poll);
          reject(new Error("Facebook SDK ачаалагдсангүй."));
        }
      }, 100);
      return;
    }

    window.fbAsyncInit = initAndResolve;
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/mn_MN/sdk.js";
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Facebook SDK ачаалж чадсангүй."));
    document.body.appendChild(script);
  });
  return fbReadyPromise;
}

interface VisitorState {
  visitor: VisitorRef | null;
  token: string | null;
  loading: boolean;
  fbEnabled: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
}

const VisitorContext = createContext<VisitorState | null>(null);

export function VisitorProvider({ children }: { children: ReactNode }) {
  const [visitor, setVisitor] = useState<VisitorRef | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [fbEnabled, setFbEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fbReady, setFbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    // setState-ийг effect-ийн бие дотор шууд бус, promise callback дотор дуудна
    // (react-hooks/set-state-in-effect дүрэмтэй нийцүүлэхийн тулд).
    Promise.resolve(loadStored()).then((stored) => {
      if (!alive || !stored) return;
      setVisitor(stored.visitor);
      setToken(stored.token);
    });

    fetch(`${API_URL}/api/social/facebook/status/`)
      .then((res) => (res.ok ? (res.json() as Promise<FbStatus>) : null))
      .then((status) => {
        if (!alive) return undefined;
        const enabled = status?.enabled ?? false;
        setFbEnabled(enabled);
        setLoading(false);
        if (enabled && status?.app_id) {
          return ensureFacebookSdk(status.app_id)
            .then(() => alive && setFbReady(!!window.FB))
            .catch(() => alive && setFbReady(false));
        }
        return undefined;
      })
      .catch(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  const logout = useCallback(() => {
    clearStored();
    setVisitor(null);
    setToken(null);
  }, []);

  // visitorFetch (module-level, hook биш) 401 дээр дуудаж болохоор идэвхтэй
  // logout-ыг бүртгэнэ. logout нь тогтвортой identity-тэй (deps: []) тул
  // энэ effect бараг дахин ажиллахгүй.
  useEffect(() => {
    activeLogout = logout;
    return () => {
      if (activeLogout === logout) activeLogout = null;
    };
  }, [logout]);

  const login = useCallback(() => {
    if (!fbReady || typeof window === "undefined" || !window.FB) {
      setError("Facebook SDK ачаалагдсангүй. Ad blocker-оо унтраагаад дахин оролдоно уу.");
      return;
    }
    setError(null);
    window.FB.login(
      (res) => {
        const accessToken = res.authResponse?.accessToken;
        if (!accessToken) {
          setError("Facebook-ээр нэвтрэхийг цуцаллаа.");
          return;
        }
        fetch(`${API_URL}/api/social/facebook/login/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: accessToken }),
        })
          .then(async (r) => {
            if (!r.ok) {
              const data = (await r.json().catch(() => null)) as { detail?: string } | null;
              setError(data?.detail ?? "Нэвтэрч чадсангүй.");
              return null;
            }
            return (await r.json()) as StoredVisitor;
          })
          .then((data) => {
            if (!data) return;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch {
              /* localStorage ажиллахгүй бол state-д л хадгална */
            }
            setVisitor(data.visitor);
            setToken(data.token);
          })
          .catch(() => setError("Нэвтэрч чадсангүй."));
      },
      { scope: "public_profile" },
    );
  }, [fbReady]);

  return <VisitorContext.Provider value={{ visitor, token, loading, fbEnabled, error, login, logout }}>{children}</VisitorContext.Provider>;
}

export function useVisitor(): VisitorState {
  const ctx = useContext(VisitorContext);
  if (!ctx) throw new Error("useVisitor() нь VisitorProvider дотор л ажиллана");
  return ctx;
}

/** Зочны JWT-г (байгаа бол) Bearer header-ээр нэмж backend рүү дуудна.
 *  401 ирвэл хадгалсан токен хүчингүй гэж үзэж storage-г цэвэрлээд идэвхтэй
 *  VisitorProvider-ийн session-ийг гаргана. */
export async function visitorFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const stored = loadStored();
  const headers = new Headers(init.headers);
  if (stored?.token) headers.set("Authorization", `Bearer ${stored.token}`);
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401 && stored?.token) {
    clearStored();
    activeLogout?.();
  }
  return res;
}
