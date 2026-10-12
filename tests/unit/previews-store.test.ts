import { describe, expect, test } from 'bun:test';
import { createPreviews } from '~/utils/previews-store';
import { QsError } from '~/utils/qs/error';
import type { KeyedRun } from '~/utils/selection-store';
import preview from '../fixtures/qs/preview.json';
import previewSplit from '../fixtures/qs/preview-split.json';

const run = (
  key: string,
  natureId = 17,
  beginDate = '2026-11-02',
  endDate = '2026-11-04',
): KeyedRun => ({
  key,
  natureId,
  beginDate,
  beginHour: 0,
  endDate,
  endHour: 23,
  days: [],
});

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('previews store', () => {
  test('a late answer from before a reset does not overwrite the new one', async () => {
    const pending: ((value: typeof preview) => void)[] = [];
    const store = createPreviews({
      preview: () => new Promise((resolve) => pending.push(resolve)),
      debounceMs: 0,
    });
    store.sync([run('17:2026-11-02:0')]);
    await tick(5);
    store.reset([run('17:2026-11-02:0')]);
    await tick(5);
    pending[1]!(preview);
    await tick(5);
    const fresh = store.state.get('17:2026-11-02:0')?.preview;
    pending[0]!(previewSplit);
    await tick(5);
    expect(store.state.get('17:2026-11-02:0')?.preview).toEqual(fresh!);
  });

  test('reset drops the old answers and previews the current runs again', async () => {
    let calls = 0;
    const store = createPreviews({
      preview: async () => {
        calls++;
        return preview;
      },
      debounceMs: 10,
    });
    store.sync([run('17:2026-11-02:0')]);
    await tick(30);
    store.reset([run('17:2026-11-02:0')]);
    expect(store.state.get('17:2026-11-02:0')?.status).toBe('loading');
    await tick(30);
    expect(store.state.get('17:2026-11-02:0')?.status).toBe('ready');
    expect(calls).toBe(2);
  });

  test('previews a run after the debounce and maps the answer', async () => {
    const calls: string[] = [];
    const store = createPreviews({
      preview: async (r) => {
        calls.push(`${r.beginDate}..${r.endDate}`);
        return preview;
      },
      debounceMs: 10,
    });
    store.sync([run('17:2026-11-02:0')]);
    expect(store.state.get('17:2026-11-02:0')?.status).toBe('loading');
    await tick(30);
    const entry = store.state.get('17:2026-11-02:0');
    expect(entry?.status).toBe('ready');
    expect(entry?.preview?.segments).toHaveLength(1);
    expect(entry?.preview?.overlaps).toHaveLength(2);
    expect(calls).toEqual(['2026-11-02..2026-11-04']);
  });

  test('several syncs inside the debounce yield one call', async () => {
    let calls = 0;
    const store = createPreviews({
      preview: async () => {
        calls++;
        return preview;
      },
      debounceMs: 20,
    });
    store.sync([run('17:2026-11-02:0')]);
    store.sync([run('17:2026-11-02:0')]);
    store.sync([run('17:2026-11-02:0')]);
    await tick(50);
    expect(calls).toBe(1);
  });

  test('a run whose key is gone drops its late answer', async () => {
    let resolve!: (value: typeof preview) => void;
    const store = createPreviews({
      preview: () =>
        new Promise((r) => {
          resolve = r;
        }),
      debounceMs: 0,
    });
    store.sync([run('17:2026-11-02:0')]);
    await tick(5);
    store.sync([]);
    resolve(preview);
    await tick(5);
    expect(store.state.size).toBe(0);
  });

  test('a changed end date previews again under the same key', async () => {
    const calls: string[] = [];
    const store = createPreviews({
      preview: async (r) => {
        calls.push(r.endDate);
        return preview;
      },
      debounceMs: 0,
    });
    store.sync([run('17:2026-11-02:0')]);
    await tick(5);
    store.sync([run('17:2026-11-02:0', 17, '2026-11-02', '2026-11-05')]);
    await tick(5);
    expect(calls).toEqual(['2026-11-04', '2026-11-05']);
  });

  test('a rejected preview keeps its messages, an unavailable one can be retried', async () => {
    let attempt = 0;
    const store = createPreviews({
      preview: async (r) => {
        attempt++;
        if (r.key === 'a')
          throw new QsError('rejected', 400, ['Solde insuffisant']);
        if (attempt === 2) throw new QsError('unavailable');
        return previewSplit;
      },
      debounceMs: 0,
    });
    store.sync([run('a'), run('b', 14, '2026-11-10', '2026-11-12')]);
    await tick(5);
    expect(store.state.get('a')?.status).toBe('rejected');
    expect(store.state.get('a')?.messages).toEqual(['Solde insuffisant']);
    expect(store.state.get('b')?.status).toBe('unavailable');
    store.retry(run('b', 14, '2026-11-10', '2026-11-12'));
    await tick(5);
    expect(store.state.get('b')?.status).toBe('ready');
    expect(store.state.get('b')?.preview?.segments).toHaveLength(2);
    expect(store.state.get('b')?.preview?.warnings).toHaveLength(1);
  });

  test('allReady is true only when every run is ready', async () => {
    const store = createPreviews({
      preview: async () => preview,
      debounceMs: 0,
    });
    expect(store.allReady.value).toBe(true);
    store.sync([run('x')]);
    expect(store.allReady.value).toBe(false);
    await tick(5);
    expect(store.allReady.value).toBe(true);
  });
});
