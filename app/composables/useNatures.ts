import { getNatures } from '~/utils/qs/api';
import { whenConnected } from '~/utils/qs/retry';
import type { RawNature } from '~/utils/qs/types';
import { natureColorToken } from '~~/shared/utils/natures';

const byId = ref(new Map<number, RawNature>());
let loading: Promise<void> | null = null;

export const useNatures = () => {
  const load = (): Promise<void> => {
    if (loading === null) {
      loading = whenConnected(getNatures)
        .then((natures) => {
          byId.value = new Map(natures.map((nature) => [nature.id, nature]));
        })
        .catch(() => {
          loading = null;
        });
    }
    return loading;
  };
  const label = (id: number | null): string =>
    (id === null ? null : byId.value.get(id)?.label) ?? 'Absence';
  const colorToken = (id: number | null): string =>
    natureColorToken(
      id === null ? null : (byId.value.get(id)?.reference ?? null),
    );
  return { byId, load, label, colorToken };
};
