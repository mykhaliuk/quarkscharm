import { getNatures } from '~/utils/qs/api';
import { whenConnected } from '~/utils/qs/retry';
import { createNatureStore, type NatureStore } from '~/utils/natures-store';

let store: NatureStore | null = null;

export const useNatures = (): NatureStore => {
  if (store === null) {
    store = createNatureStore({ getNatures: () => whenConnected(getNatures) });
  }
  return store;
};
