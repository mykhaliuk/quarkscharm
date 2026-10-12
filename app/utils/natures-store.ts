import { computed, ref } from 'vue';
import { DEFAULT_BRUSHES, natureColorToken } from '~~/shared/utils/natures';
import type { RawNature } from './qs/types';

export type NatureDeps = { getNatures: () => Promise<RawNature[]> };

export const createNatureStore = ({ getNatures }: NatureDeps) => {
  const byId = ref(new Map<number, RawNature>());
  const seen = ref<number[]>([]);
  let loading: Promise<void> | null = null;
  let loaded = false;

  const load = (): Promise<void> => {
    if (loaded) return Promise.resolve();
    if (loading === null) {
      loading = getNatures()
        .then((natures) => {
          byId.value = new Map(natures.map((nature) => [nature.id, nature]));
          loaded = true;
        })
        .catch(() => undefined)
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

  return { byId, brushes, load, noteSeen, label, colorToken };
};

export type NatureStore = ReturnType<typeof createNatureStore>;
