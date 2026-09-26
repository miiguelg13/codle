import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Streaks, type User } from './api';

interface AuthCtx {
  user: User | null;
  streak: Streaks | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (login: string, password: string) => Promise<number>;
  register: (email: string, username: string, password: string) => Promise<number>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [streak, setStreak] = useState<Streaks | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me.user);
      setStreak(me.streak);
    } catch {
      /* sin conexión: se mantiene el estado anterior */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (l: string, p: string) => {
      const r = await api.login(l, p);
      setUser(r.user);
      await refresh();
      return r.merged;
    },
    [refresh],
  );

  const register = useCallback(
    async (e: string, u: string, p: string) => {
      const r = await api.register(e, u, p);
      setUser(r.user);
      await refresh();
      return r.merged;
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, streak, loading, refresh, login, register, logout }),
    [user, streak, loading, refresh, login, register, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fuera de AuthProvider');
  return c;
}
