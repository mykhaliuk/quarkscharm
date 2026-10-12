import { createSelection, type SelectionStore } from '~/utils/selection-store';

let store: SelectionStore | null = null;

export const useSelection = (): SelectionStore => {
  if (store === null) {
    const { store: yearStore, year } = useYear();
    const created = createSelection({
      isSelectable: yearStore.isSelectable,
      occupant: (ymd, half) =>
        yearStore.slots.value.get(ymd)?.[half]?.requestId ?? null,
    });
    watch(year, () => created.reset());
    store = created;
  }
  return store;
};
