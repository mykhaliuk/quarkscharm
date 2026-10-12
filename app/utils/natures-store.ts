import { computed, ref } from 'vue';
import { DEFAULT_BRUSHES, natureColorToken } from '~~/shared/utils/natures';
import type { RawNature } from './qs/types';

export type NatureDeps = { getNatures: () => Promise<RawNature[]> };

export const createNatureStore = ({ getNatures }: NatureDeps) => {
  const byId = ref(new Map<number, RawNature>());
  const seen = ref<number[]>([]);
  const status = ref<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  let loading: Promise<void> | null = null;

  const load = (): Promise<void> => {
    if (status.value === 'ready') return Promise.resolve();
    if (loading === null) {
      status.value = 'loading';
      loading = getNatures()
        .then((natures) => {
          byId.value = new Map(natures.map((nature) => [nature.id, nature]));
          status.value = 'ready';
        })
        .catch((error: unknown) => {
          console.error('natures: load failed', error);
          status.value = 'failed';
        })
        .finally(() => {
          loading = null;
        });
    }
    return loading;
  };

  const defaults = computed(() => {
    const ids: number[] = [];
    for (const reference of DEFAULT_BRUSHES) {
      for (const nature of byId.value.values()) {
        if (nature.reference === reference) ids.push(nature.id);
      }
    }
    return ids;
  });

  const brushes = computed(() => {
    const ids = [...defaults.value];
    for (const id of seen.value) if (!ids.includes(id)) ids.push(id);
    return ids;
  });

  const noteSeen = (ids: number[]) => {
    const next = [...seen.value];
    for (const id of ids) if (!next.includes(id)) next.push(id);
    seen.value = next;
  };

  const label = (id: number | null): string =>
    (id === null ? null : byId.value.get(id)?.label) ?? 'Absence';

  const colorToken = (id: number | null): string =>
    natureColorToken(
      id === null ? null : (byId.value.get(id)?.reference ?? null),
    );

  return { byId, status, brushes, load, noteSeen, label, colorToken };
};

export type NatureStore = ReturnType<typeof createNatureStore>;
