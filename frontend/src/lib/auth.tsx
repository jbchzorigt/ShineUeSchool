"use client";

/* Нэвтэрсэн хэрэглэгчийн context. Админ хуудсууд useAuth()-аар ашиглана. */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokens } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Хуудас ачаалахад хадгалсан токеноор хэрэглэгчийг сэргээнэ.
  // (setState-ууд promise callback дотор байгаа тул lint дүрэмтэй нийцнэ.)
  useEffect(() => {
    Promise.resolve(tokens.get())
      .then((t) => (t ? api.me() : null))
      .then(setUser)
      .catch(() => { tokens.clear(); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    await api.login(username, password);
    setUser(await api.me());
  }, []);

  const logout = useCallback(() => { api.logout(); setUser(null); }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() нь AuthProvider дотор л ажиллана");
  return ctx;
}
