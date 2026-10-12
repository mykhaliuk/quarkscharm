import { describe, expect, test } from 'bun:test';
import { applyTheme, isTheme, nextTheme } from '~/utils/theme';

describe('theme', () => {
  test('isTheme accepts the three values only', () => {
    expect(isTheme('light')).toBe(true);
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('system')).toBe(true);
    expect(isTheme('sepia')).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  test('nextTheme cycles system, light, dark', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });

  test('applyTheme sets data-theme for an explicit choice', () => {
    const root = { dataset: {} as Record<string, string | undefined> };
    applyTheme(root, 'dark');
    expect(root.dataset.theme).toBe('dark');
  });

  test('applyTheme removes data-theme for system', () => {
    const root = {
      dataset: { theme: 'light' } as Record<string, string | undefined>,
    };
    applyTheme(root, 'system');
    expect('theme' in root.dataset).toBe(false);
  });
});
