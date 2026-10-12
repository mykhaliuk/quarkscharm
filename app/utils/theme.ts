export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_KEY = 'qc.theme';

export const isTheme = (value: unknown): value is Theme =>
  typeof value === 'string' && (THEMES as readonly string[]).includes(value);

export const nextTheme = (theme: Theme): Theme => {
  const index = THEMES.indexOf(theme);
  return THEMES[(index + 1) % THEMES.length] as Theme;
};

type ThemeRoot = { dataset: Record<string, string | undefined> };

export const applyTheme = (root: ThemeRoot, theme: Theme): void => {
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
};
