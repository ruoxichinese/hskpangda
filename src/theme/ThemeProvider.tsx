import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export const THEMES = [
  { id: 'nature', emoji: '🌿', name: 'Nature & Eco', colors: ['#48BB78', '#68D391'] },
  { id: 'energy', emoji: '🔥', name: 'Energy & Bold', colors: ['#ED8936', '#F56500'] },
  { id: 'creative', emoji: '💜', name: 'Creative & Art', colors: ['#9F7AEA', '#805AD5'] },
  { id: 'ocean', emoji: '🌊', name: 'Ocean Blue', colors: ['#4299E1', '#3182CE'] },
  { id: 'pink', emoji: '🌸', name: 'Soft Pink', colors: ['#ED64A6', '#D53F8C'] },
] as const;
export type ThemeId = (typeof THEMES)[number]['id'];
export type ModePref = 'system' | 'light' | 'dark';

interface ThemeCtx {
  theme: ThemeId;
  modePref: ModePref;
  mode: 'light' | 'dark';
  setTheme(t: ThemeId): void;
  setModePref(m: ModePref): void;
  cycleMode(): void;
}
const Ctx = createContext<ThemeCtx | null>(null);

const read = (k: string, d: string) => {
  try { return localStorage.getItem(k) || d; } catch { return d; }
};
const write = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* bỏ qua */ }
};
const systemDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => read('pangda.theme', 'energy') as ThemeId);
  const [modePref, setModeState] = useState<ModePref>(() => read('pangda.mode', 'system') as ModePref);
  const [sysDark, setSysDark] = useState(systemDark);

  // tự cập nhật khi hệ điều hành đổi sáng/tối
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const fn = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const mode = modePref === 'system' ? (sysDark ? 'dark' : 'light') : modePref;

  useEffect(() => {
    const r = document.documentElement;
    r.setAttribute('data-theme', theme);
    r.setAttribute('data-mode', mode);
    r.style.colorScheme = mode;
  }, [theme, mode]);

  const setTheme = useCallback((t: ThemeId) => { setThemeState(t); write('pangda.theme', t); }, []);
  const setModePref = useCallback((m: ModePref) => { setModeState(m); write('pangda.mode', m); }, []);
  const cycleMode = useCallback(() => {
    setModePref(modePref === 'system' ? 'light' : modePref === 'light' ? 'dark' : 'system');
  }, [modePref, setModePref]);

  return <Ctx.Provider value={{ theme, modePref, mode, setTheme, setModePref, cycleMode }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme phải nằm trong ThemeProvider');
  return c;
}
