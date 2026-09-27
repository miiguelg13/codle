import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { storage } from './storage';

export type Theme = 'dark' | 'light';
export type Skin = 'bloc' | 'classic';

export type MonacoTheme = 'codle-dark' | 'codle-light' | 'classic-dark' | 'classic-light';

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  skin: Skin;
  setSkin: (s: Skin) => void;
  monacoTheme: MonacoTheme;
}

const Ctx = createContext<ThemeCtx | null>(null);

const THEME_COLOR: Record<Skin, Record<Theme, string>> = {
  bloc: { light: '#e3eddb', dark: '#101913' },
  classic: { light: '#ffffff', dark: '#12161f' },
};

function initialTheme(): Theme {
  const saved = storage.get('theme');
  if (saved === 'dark' || saved === 'light') return saved;
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function initialSkin(): Skin {
  return storage.get('skin') === 'classic' ? 'classic' : 'bloc';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [skin, setSkinState] = useState<Skin>(initialSkin);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.skin = skin;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[skin][theme]);
  }, [theme, skin]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark';
      storage.set('theme', next);
      return next;
    });
  }, []);

  const setSkin = useCallback((s: Skin) => {
    storage.set('skin', s);
    setSkinState(s);
  }, []);

  const monacoTheme: MonacoTheme =
    skin === 'classic'
      ? theme === 'light'
        ? 'classic-light'
        : 'classic-dark'
      : theme === 'light'
        ? 'codle-light'
        : 'codle-dark';

  return <Ctx.Provider value={{ theme, toggle, skin, setSkin, monacoTheme }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme fuera de ThemeProvider');
  return c;
}
