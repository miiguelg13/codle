import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { storage } from './storage';

export type Theme = 'dark' | 'light';

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  monacoTheme: 'codle-dark' | 'codle-light';
}

const Ctx = createContext<ThemeCtx | null>(null);

function initialTheme(): Theme {
  const saved = storage.get('theme');
  if (saved === 'dark' || saved === 'light') return saved;
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#e3eddb' : '#101913');
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark';
      storage.set('theme', next);
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ theme, toggle, monacoTheme: theme === 'light' ? 'codle-light' : 'codle-dark' }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme fuera de ThemeProvider');
  return c;
}
