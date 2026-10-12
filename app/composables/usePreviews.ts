import { previewRequest, previewUpdate } from '~/utils/qs/api';
import { whenConnected } from '~/utils/qs/retry';
import { previewCallFor } from '~/utils/preview-call';
import { createPreviews, type PreviewStore } from '~/utils/previews-store';
import type { KeyedRun } from '~/utils/selection-store';

let store: PreviewStore | null = null;

export const usePreviews = (): PreviewStore => {
  if (store !== null) return store;
  const session = useSession();
  const selection = useSelection();
  const natures = useNatures();
  const created = createPreviews({
    preview: (run: KeyedRun) => {
      const call = previewCallFor(
        run,
        selection.editing.value,
        session.state.me?.employeeId ?? 0,
      );
      return whenConnected(() =>
        call.requestId === null
          ? previewRequest(call.employeeId, call.begin, call.end)
          : previewUpdate(
              call.requestId,
              call.employeeId,
              call.begin,
              call.end,
            ),
      );
    },
  });
  watch(selection.editing, () => created.clear());
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
