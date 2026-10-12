import { describe, expect, test } from 'bun:test';
import { loadTokens } from '../../scripts/lib/ds-tokens.js';

const tokens = {
  color: {
    themes: [{ id: 'light' }, { id: 'dark' }],
    tokens: [
      { name: 'bg', value: { light: '#eef2f7', dark: '#121720' } },
      { name: 'cell-today', value: { light: '{accent}', dark: '{accent}' } },
      { name: 'accent', value: '#2d6a5a' },
    ],
  },
  type: { families: { sans: '"Golos Text", sans-serif' } },
  spacing: { tokens: [{ name: 'space-1', value: '4px' }] },
  radius: { tokens: [{ name: 'radius-cell', value: '6px' }] },
  shadow: {
    tokens: [
      {
        name: 'shadow-card',
        value: { light: '0 1px 2px #0001', dark: '0 1px 2px #0006' },
      },
    ],
  },
};

describe('loadTokens', () => {
  test('splits colours and shadows into a light and a dark map', () => {
    const { light, dark } = loadTokens(tokens);
    expect(light.get('--bg')).toBe('#eef2f7');
    expect(dark.get('--bg')).toBe('#121720');
    expect(light.get('--shadow-card')).toBe('0 1px 2px #0001');
    expect(dark.get('--shadow-card')).toBe('0 1px 2px #0006');
  });

  test('turns an alias into a var() reference', () => {
    const { light, dark } = loadTokens(tokens);
    expect(light.get('--cell-today')).toBe('var(--accent)');
    expect(dark.get('--cell-today')).toBe('var(--accent)');
  });

  test('a plain string value is the first theme and is inherited by the dark one', () => {
    const { light, dark } = loadTokens(tokens);
    expect(light.get('--accent')).toBe('#2d6a5a');
    expect(dark.get('--accent')).toBe('#2d6a5a');
  });

  test('spacing, radius and families are theme-less', () => {
    const { shared } = loadTokens(tokens);
    expect(shared.get('--space-1')).toBe('4px');
    expect(shared.get('--radius-cell')).toBe('6px');
    expect(shared.get('--font-sans')).toBe('"Golos Text", sans-serif');
  });
});
