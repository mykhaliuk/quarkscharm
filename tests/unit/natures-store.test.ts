import { describe, expect, test } from 'bun:test';
import { createNatureStore } from '~/utils/natures-store';
import natures from '../fixtures/qs/natures.json';

const build = () => createNatureStore({ getNatures: async () => natures });

describe('natures store', () => {
  test('brushes resolve the default references to ids in order', async () => {
    const store = build();
    await store.load();
    expect(store.brushes.value).toEqual([75, 17, 14]);
  });

  test('a nature seen in a preview joins the brushes once, in first-seen order', async () => {
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
        return natures;
      },
    });
    await Promise.all([store.load(), store.load()]);
    await store.load();
    expect(calls).toBe(1);
  });

  test('a failed load can be retried', async () => {
    let calls = 0;
    const store = createNatureStore({
      getNatures: async () => {
        calls++;
        if (calls === 1) throw new Error('down');
        return natures;
      },
    });
    await store.load();
    expect(store.byId.value.size).toBe(0);
    await store.load();
    expect(store.byId.value.size).toBe(6);
  });
});
