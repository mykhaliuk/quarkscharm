import { computed, reactive } from 'vue';
import { QsError } from './qs/error';
import { toPreview, type Preview } from './qs/map';
import type { RawPreview } from './qs/types';
import type { KeyedRun } from './selection-store';

export const NATURE_UNAVAILABLE_MESSAGE =
  'This leave type is not available on these dates. Pick another one.';

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

const offers = (preview: Preview, natureId: number | null): boolean =>
  natureId === null || preview.natures.some((n) => n.id === natureId);

const signatureOf = (run: KeyedRun): string =>
  `${run.natureId}:${run.beginDate}T${run.beginHour}:${run.endDate}T${run.endHour}`;

export const createPreviews = ({ preview, debounceMs = 250 }: Deps) => {
  const state = reactive(new Map<string, PreviewEntry>());
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const generations = new Map<string, number>();
  let lastGeneration = 0;

  const request = async (run: KeyedRun) => {
    lastGeneration++;
    const generation = lastGeneration;
    generations.set(run.key, generation);
    const signature = signatureOf(run);
    const current = () => state.get(run.key);
    const stale = () =>
      generations.get(run.key) !== generation ||
      current()?.signature !== signature;
    try {
      const raw = await preview(run);
      if (stale()) return;
      const parsed = toPreview(raw);
      if (!offers(parsed, run.natureId)) {
        state.set(run.key, {
          status: 'rejected',
          preview: null,
          messages: [NATURE_UNAVAILABLE_MESSAGE],
          signature,
        });
        return;
      }
      state.set(run.key, {
        status: 'ready',
        preview: parsed,
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
