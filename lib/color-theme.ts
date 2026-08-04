export const COLOR_THEMES = ['od', 'neon', 'bloom'] as const;

export type ColorTheme = (typeof COLOR_THEMES)[number];

export const COLOR_THEME_STORAGE_KEY = 'apex-color-theme';

export const COLOR_THEME_LABELS: Record<ColorTheme, string> = {
  od: 'Olive',
  neon: 'Neon',
  bloom: 'Bloom',
};

export function isColorTheme(value: unknown): value is ColorTheme {
  return typeof value === 'string' && (COLOR_THEMES as readonly string[]).includes(value);
}

export function applyColorTheme(theme: ColorTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}
