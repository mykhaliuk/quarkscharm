import { describe, expect, test } from 'bun:test';
import { createNatureStore } from '~/utils/natures-store';
import natures from '../fixtures/qs/natures.json';

const build = () =>
  createNatureStore({ getNatures: async () => natures.items });

describe('natures store', () => {
  test('brushes start with the default references, then every active nature by label', async () => {
    const store = build();
    await store.load();
    expect(store.brushes.value).toEqual([75, 17, 14, 32, 54, 55]);
  });

  test('a nature seen in a preview moves up, in first-seen order', async () => {
    const store = build();
    await store.load();
    store.noteSeen([55, 75, 32]);
    store.noteSeen([32, 54]);
    expect(store.brushes.value).toEqual([75, 17, 14, 55, 32, 54]);
  });

  test('label and colorToken read the loaded natures', async () => {
    const store = build();
    await store.load();
    expect(store.label(75)).toBe('Télétravail');
    expect(store.label(999)).toBe('Absence');
    expect(store.colorToken(14)).toBe('--nature-cp');
    expect(store.colorToken(32)).toBe('--nature-other');
    expect(store.colorToken(null)).toBe('--nature-other');
  });

  test('load runs the call once', async () => {
    let calls = 0;
    const store = createNatureStore({
      getNatures: async () => {
        calls++;
        return natures.items;
      },
    });
    await Promise.all([store.load(), store.load()]);
    await store.load();
    expect(calls).toBe(1);
  });

  test('a failed load is visible and can be retried', async () => {
    let calls = 0;
    const store = createNatureStore({
      getNatures: async () => {
        calls++;
        if (calls === 1) throw new Error('down');
        return natures.items;
      },
    });
    await store.load();
    expect(store.status.value).toBe('failed');
    expect(store.byId.value.size).toBe(0);
    await store.load();
    expect(store.status.value).toBe('ready');
    expect(store.byId.value.size).toBe(6);
  });

  test('an answer without the default references still lists the active natures', async () => {
    const store = createNatureStore({
      getNatures: async () => [
        { id: 1, reference: 'XX', label: 'Other' },
        { id: 2, reference: 'YY', label: 'Gone', isActive: false },
      ],
    });
    await store.load();
    expect(store.status.value).toBe('ready');
    expect(store.brushes.value).toEqual([1]);
  });
});
