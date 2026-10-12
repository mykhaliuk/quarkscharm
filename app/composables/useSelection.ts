import { createSelection, type SelectionStore } from '~/utils/selection-store';

let store: SelectionStore | null = null;

export const useSelection = (): SelectionStore => {
  if (store === null) {
    const { store: yearStore, year } = useYear();
    const created = createSelection({ isSelectable: yearStore.isSelectable });
    watch(year, () => created.clear());
    store = created;
  }
  return store;
};
