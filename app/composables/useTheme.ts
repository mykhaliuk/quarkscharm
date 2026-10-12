import { readJson, writeJson } from '~/utils/storage';
import {
  THEME_KEY,
  applyTheme,
  isTheme,
  nextTheme,
  type Theme,
} from '~/utils/theme';

export const useTheme = () => {
  const theme = useState<Theme>('theme', () => 'system');

  const set = (value: Theme) => {
    theme.value = value;
    if (import.meta.client) applyTheme(document.documentElement, value);
    writeJson(THEME_KEY, value);
  };

  const cycle = () => set(nextTheme(theme.value));

  const restore = () => {
    const stored = readJson<unknown>(THEME_KEY);
    const value = isTheme(stored) ? stored : 'system';
    theme.value = value;
    if (import.meta.client) applyTheme(document.documentElement, value);
  };

  return { theme, set, cycle, restore };
};
