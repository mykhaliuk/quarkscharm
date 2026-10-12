import { previewRequest, previewUpdate } from '~/utils/qs/api';
import { whenConnected } from '~/utils/qs/retry';
import { createPreviews, type PreviewStore } from '~/utils/previews-store';
import type { KeyedRun } from '~/utils/selection-store';
import { toApiDate } from '~~/shared/utils/api-dates';

let store: PreviewStore | null = null;

export const usePreviews = (): PreviewStore => {
  if (store !== null) return store;
  const session = useSession();
  const selection = useSelection();
  const natures = useNatures();
  const created = createPreviews({
    preview: (run: KeyedRun) => {
      const employeeId = session.state.me?.employeeId ?? 0;
      const begin = toApiDate(run.beginDate, run.beginHour);
      const end = toApiDate(run.endDate, run.endHour);
      const editing = selection.editing.value;
      return whenConnected(() =>
        editing === null
          ? previewRequest(employeeId, begin, end)
          : previewUpdate(editing, employeeId, begin, end),
      );
    },
  });
  watch(selection.runs, (runs) => created.sync(runs), { immediate: true });
  watch(
    () => [...created.state.values()],
    (entries) => {
      const seen: number[] = [];
      for (const entry of entries) {
        for (const nature of entry.preview?.natures ?? []) seen.push(nature.id);
      }
      if (seen.length > 0) natures.noteSeen(seen);
    },
  );
  store = created;
  return created;
};
