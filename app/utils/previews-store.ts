import { computed, reactive } from 'vue';
import { QsError } from './qs/error';
import { toPreview, type Preview } from './qs/map';
import type { RawPreview } from './qs/types';
import type { KeyedRun } from './selection-store';

export type PreviewStatus = 'loading' | 'ready' | 'rejected' | 'unavailable';

export type PreviewEntry = {
  status: PreviewStatus;
  preview: Preview | null;
  messages: string[];
  signature: string;
};

type Deps = {
  preview: (run: KeyedRun) => Promise<RawPreview>;
  debounceMs?: number;
};

const signatureOf = (run: KeyedRun): string =>
  `${run.natureId}:${run.beginDate}T${run.beginHour}:${run.endDate}T${run.endHour}`;

export const createPreviews = ({ preview, debounceMs = 250 }: Deps) => {
  const state = reactive(new Map<string, PreviewEntry>());
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const generations = new Map<string, number>();

  const request = async (run: KeyedRun) => {
    const generation = (generations.get(run.key) ?? 0) + 1;
    generations.set(run.key, generation);
    const signature = signatureOf(run);
    const current = () => state.get(run.key);
    const stale = () =>
      generations.get(run.key) !== generation ||
      current()?.signature !== signature;
    try {
      const raw = await preview(run);
      if (stale()) return;
      state.set(run.key, {
        status: 'ready',
        preview: toPreview(raw),
        messages: [],
        signature,
      });
    } catch (error) {
      if (stale()) return;
      const kind = error instanceof QsError ? error.kind : 'unavailable';
      const messages = error instanceof QsError ? error.messages : [];
      state.set(run.key, {
        status: kind === 'rejected' ? 'rejected' : 'unavailable',
        preview: null,
        messages,
        signature,
      });
    }
  };

  const schedule = (run: KeyedRun) => {
    const existing = timers.get(run.key);
    if (existing !== undefined) clearTimeout(existing);
    state.set(run.key, {
      status: 'loading',
      preview: null,
      messages: [],
      signature: signatureOf(run),
    });
    timers.set(
      run.key,
      setTimeout(() => {
        timers.delete(run.key);
        void request(run);
      }, debounceMs),
    );
  };

  const drop = (key: string) => {
    const timer = timers.get(key);
    if (timer !== undefined) clearTimeout(timer);
    timers.delete(key);
    generations.delete(key);
    state.delete(key);
  };

  const sync = (runs: KeyedRun[]) => {
    const keys = new Set(runs.map((run) => run.key));
    for (const key of Array.from(state.keys())) if (!keys.has(key)) drop(key);
    for (const run of runs) {
      const entry = state.get(run.key);
      if (entry === undefined || entry.signature !== signatureOf(run))
        schedule(run);
    }
  };

  const retry = (run: KeyedRun) => schedule(run);

  const clear = () => {
    for (const key of Array.from(state.keys())) drop(key);
  };

  const reset = (runs: KeyedRun[]) => {
    clear();
    sync(runs);
  };

  const allReady = computed(() => {
    for (const entry of state.values())
      if (entry.status !== 'ready') return false;
    return true;
  });

  return { state, sync, retry, clear, reset, allReady };
};

export type PreviewStore = ReturnType<typeof createPreviews>;
