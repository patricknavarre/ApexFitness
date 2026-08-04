'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  applyColorTheme,
  COLOR_THEME_STORAGE_KEY,
  isColorTheme,
  type ColorTheme,
} from '@/lib/color-theme';

type ThemeContextValue = {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'od',
  setTheme: () => {},
});

export function useColorTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ColorTheme>('od');

  useEffect(() => {
    try {
      const cached = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
      if (isColorTheme(cached)) {
        setThemeState(cached);
        applyColorTheme(cached);
      }
    } catch {
      // ignore
    }

    let cancelled = false;
    fetch('/api/user/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { colorTheme?: string } | null) => {
        if (cancelled || !data || !isColorTheme(data.colorTheme)) return;
        setThemeState(data.colorTheme);
        applyColorTheme(data.colorTheme);
      })
      .catch(() => {
        // keep local cache
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((next: ColorTheme) => {
    setThemeState(next);
    applyColorTheme(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}
