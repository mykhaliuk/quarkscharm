<script setup lang="ts">
import type { CellPress } from '~/utils/calendar-events';
import type { AbsenceRequest, Preview } from '~/utils/qs/map';
import type { PaintResult } from '~/utils/selection-store';
import type { YearPart } from '~/utils/year-store';
import { withoutRequest } from '~~/shared/utils/slots';
import { isPending } from '~~/shared/utils/status';
import { today } from '~~/shared/utils/ymd';

const PARTS: YearPart[] = ['requests', 'planner', 'holidays'];
const HIGHLIGHT_MS = 1200;

const session = useSession();
const { store, year, previous, next } = useYear();
const natures = useNatures();
const selection = useSelection();
const previews = usePreviews();
const submit = useSubmit();
const { cancel } = useCancel();
const whosOff = useWhosOff();
const cursor = useCursor();

const todayYmd = computed(() =>
  today(session.state.me?.timeZone ?? 'Europe/Paris'),
);
const pendingIds = computed(
  () =>
    new Set(
      store.state.requests
        .filter((r) => isPending(r.statusId))
        .map((r) => r.id),
    ),
);
const failed = computed(() =>
  PARTS.filter((part) => store.state.status[part] === 'failed'),
);
const brushHighlighted = ref(false);
const editingRequest = computed(() =>
  selection.editing.value === null
    ? null
    : (store.state.requests.find((r) => r.id === selection.editing.value) ??
      null),
);
const visibleSlots = computed(() =>
  selection.editing.value === null
    ? store.slots.value
    : withoutRequest(store.slots.value, selection.editing.value),
);
const canSubmit = computed(
  () =>
    selection.runs.value.length > 0 &&
    (selection.editing.value === null || selection.runs.value.length === 1) &&
    selection.runs.value.every(
      (run) => previews.state.get(run.key)?.status === 'ready',
    ) &&
    !submit.submitting.value,
);

const readyPreviews = () => {
  const ready = new Map<string, Preview>();
  for (const [key, entry] of previews.state) {
    if (entry.preview !== null) ready.set(key, entry.preview);
  }
  return ready;
};
const submitAll = async () => {
  if (!canSubmit.value) return;
  await submit.submitAll(
    selection.runs.value,
    readyPreviews(),
    selection.editing.value,
  );
};
const clearAll = () => {
  selection.clear();
  submit.clearErrors();
};

const requestIdOf = (date: string): number | null => {
  const slot = store.slots.value.get(date);
  return slot?.am?.requestId ?? slot?.pm?.requestId ?? null;
};
const card = useRequestCard(() => store.state.requests, requestIdOf);

const askForBrush = () => {
  brushHighlighted.value = true;
  setTimeout(() => {
    brushHighlighted.value = false;
  }, HIGHLIGHT_MS);
};

let drag: {
  from: string;
  to: string;
  half: 'am' | 'pm';
  shift: boolean;
} | null = null;

const onPress = (press: CellPress) => {
  if (press.event.button !== 0) return;
  cursor.moveTo(press.date);
  if (requestIdOf(press.date) !== null && selection.editing.value === null) {
    card.pin(press.date);
    return;
  }
  if (selection.brush.value === null) {
    askForBrush();
    return;
  }
  card.hide();
  drag = {
    from: press.date,
    to: press.date,
    half: press.half,
    shift: press.event.shiftKey,
  };
};
const tooltip = ref<{ text: string; top: number; left: number } | null>(null);
const onEnter = (date: string) => {
  if (drag !== null) {
    drag.to = date;
    return;
  }
  const label = store.state.holidays.get(date);
  if (label === undefined) {
    tooltip.value = null;
    return;
  }
  const rect = document
    .querySelector(`[data-date="${date}"]`)
    ?.getBoundingClientRect();
  tooltip.value = rect
    ? { text: label, top: rect.bottom + 4, left: rect.left }
    : null;
};
const onLeave = () => {
  tooltip.value = null;
};
const onRelease = () => {
  if (drag === null) return;
  const { from, to, half, shift } = drag;
  drag = null;
  if (from !== to) selection.paintRange(from, to);
  else if (shift) selection.paintHalf(from, half);
  else selection.paintDay(from);
};

const startChange = (request: AbsenceRequest) => {
  const natureId = request.segments[0]?.natureId;
  if (natureId === undefined || natureId === null) return;
  card.hide();
  submit.clearErrors();
  selection.loadRequest({
    id: request.id,
    natureId,
    beginDate: request.beginDate,
    beginHour: request.beginHour,
    endDate: request.endDate,
    endHour: request.endHour,
  });
};
const cancelError = ref<string | null>(null);
watch(card.request, () => {
  cancelError.value = null;
});
const confirmCancel = async (request: AbsenceRequest) => {
  cancelError.value = null;
  const message = await cancel(request);
  if (message === null) card.hide();
  else cancelError.value = message;
};

const cardRef = ref<{ askCancel: () => void } | null>(null);
const requestAtCursor = (): AbsenceRequest | null => {
  if (selection.editing.value !== null) return null;
  const id = requestIdOf(cursor.cursor.value);
  return id === null
    ? null
    : (store.state.requests.find((r) => r.id === id) ?? null);
};
const changeAtCursor = () => {
  const request = requestAtCursor();
  if (request !== null) startChange(request);
};
const cancelAtCursor = async () => {
  if (requestAtCursor() === null) return;
  card.open(cursor.cursor.value);
  await nextTick();
  cardRef.value?.askCancel();
};
const enter = () => {
  if (requestAtCursor() === null) void submitAll();
  else card.open(cursor.cursor.value);
};

const anchor = ref<string | null>(null);
const range = computed(() =>
  anchor.value === null
    ? null
    : { from: anchor.value, to: cursor.cursor.value },
);
watch(year, () => {
  anchor.value = null;
});
const toggleRange = () => {
  anchor.value = anchor.value === null ? cursor.cursor.value : null;
};

const paintAtCursor = (paint: (ymd: string) => PaintResult) => {
  card.hide();
  if (paint(cursor.cursor.value) === 'no-brush') askForBrush();
};
const space = () => {
  if (anchor.value === null) {
    paintAtCursor(selection.paintDay);
    return;
  }
  const from = anchor.value;
  paintAtCursor((to) => selection.paintRange(from, to));
  if (selection.brush.value !== null) anchor.value = null;
};

const showCursor = async () => {
  await nextTick();
  document
    .querySelector(`[data-date="${cursor.cursor.value}"]`)
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
};
const motion = (move: () => void) => () => {
  move();
  void showCursor();
};
const byDays = (n: number) => motion(() => cursor.byDays(n));
const byMonths = (n: number) => motion(() => cursor.byMonths(n));

const selectBrush = (index: number) => {
  const id = natures.brushes.value[index];
  if (id !== undefined)
    selection.setBrush(selection.brush.value === id ? null : id);
};
const escape = () => {
  if (anchor.value !== null) {
    anchor.value = null;
    return;
  }
  const idle =
    selection.runs.value.length === 0 && selection.editing.value === null;
  if (idle) selection.setBrush(null);
  else clearAll();
};

useShortcuts({
  KeyT: () => selectBrush(0),
  KeyF: () => selectBrush(1),
  KeyC: () => selectBrush(2),
  Escape: escape,
  Enter: enter,
  NumpadEnter: enter,
  KeyH: byDays(-1),
  KeyL: byDays(1),
  KeyK: byDays(-7),
  KeyJ: byDays(7),
  ArrowLeft: byDays(-1),
  ArrowRight: byDays(1),
  ArrowUp: byDays(-7),
  ArrowDown: byDays(7),
  'Shift+KeyH': byMonths(-1),
  'Shift+KeyL': byMonths(1),
  'Shift+KeyK': byMonths(-4),
  'Shift+KeyJ': byMonths(4),
  Period: motion(cursor.today),
  BracketLeft: motion(previous),
  BracketRight: motion(next),
  Space: space,
  KeyA: () => paintAtCursor((ymd) => selection.paintHalf(ymd, 'am')),
  KeyP: () => paintAtCursor((ymd) => selection.paintHalf(ymd, 'pm')),
  KeyV: toggleRange,
  KeyE: changeAtCursor,
  KeyX: () => void cancelAtCursor(),
  KeyU: selection.undo,
  'Shift+KeyU': selection.redo,
});

onMounted(() => {
  window.addEventListener('mouseup', onRelease);
  natures.load();
  const own =
    store.state.status.requests === 'idle'
      ? store.load(year.value)
      : Promise.resolve();
  void own.then(() => whosOff.load());
});
onBeforeUnmount(() => window.removeEventListener('mouseup', onRelease));
</script>

<template>
  <main class="planner" :class="{ 'with-banner': editingRequest }">
    <WhosOff />
    <section class="grid-area">
      <div v-if="failed.length > 0" class="failed">
        <span class="caption">Some data did not load.</span>
        <button
          v-for="part in failed"
          :key="part"
          type="button"
          class="retry label"
          @click="store.retry(part)"
        >
          Retry {{ part }}
        </button>
      </div>
      <div v-if="editingRequest" class="editing" data-testid="editing-banner">
        <span class="label">
          Changing a
          {{ natures.label(editingRequest.segments[0]?.natureId ?? null) }}
          request
        </span>
        <span class="caption">
          Click days to add or remove them, pick another brush to change the
          nature, then press "Save change". Escape cancels.
        </span>
        <button type="button" class="retry label" @click="clearAll">
          Cancel change
        </button>
      </div>
      <BrushBar
        :brushes="natures.brushes.value"
        :active="selection.brush.value"
        :highlighted="brushHighlighted"
        :status="natures.status.value"
        :label="natures.label"
        :color-token="natures.colorToken"
        @select="selection.setBrush"
        @retry="natures.load"
      />
      <YearGrid
        :year="year"
        :slots="visibleSlots"
        :selection="selection.paint"
        :is-selectable="store.isSelectable"
        :holidays="store.state.holidays"
        :today="todayYmd"
        :pending-ids="pendingIds"
        :focused-date="card.date.value"
        :cursor="cursor.cursor.value"
        :range="range"
        :color-token="natures.colorToken"
        :label="natures.label"
        @enter="onEnter"
        @leave="onLeave"
        @press="onPress"
      />
      <div
        v-if="tooltip"
        class="tooltip caption"
        data-testid="day-tooltip"
        :style="`top: ${tooltip.top}px; left: ${tooltip.left}px`"
      >
        {{ tooltip.text }}
      </div>
    </section>
    <ReviewPanel
      :runs="selection.runs.value"
      :entries="previews.state"
      :errors="submit.errors"
      :can-submit="canSubmit"
      :submitting="submit.submitting.value"
      :editing="selection.editing.value !== null"
      :label="natures.label"
      :color-token="natures.colorToken"
      @retry="previews.retry"
      @clear="clearAll"
      @submit="submitAll"
    />
    <RequestCard
      v-if="card.request.value"
      ref="cardRef"
      :key="card.request.value.id"
      :request="card.request.value"
      :error="cancelError"
      :anchor="card.anchor.value"
      :pinned="card.pinned.value"
      :label="natures.label"
      :color-token="natures.colorToken"
      @change="startChange"
      @cancel="confirmCancel"
    />
    <ShortcutSheet />
  </main>
</template>

<style scoped>
.planner {
  display: grid;
  grid-template-columns: 220px 1fr 320px;
  gap: var(--space-6);
  align-items: start;
}

.with-banner {
  padding-bottom: 96px;
}

.grid-area {
  display: grid;
  gap: var(--space-4);
  align-content: start;
}

.editing {
  position: fixed;
  z-index: 5;
  left: 50%;
  bottom: var(--space-4);
  transform: translateX(-50%);
  width: min(720px, calc(100vw - 32px));
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.12);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--accent-soft);
  border-radius: var(--radius-card);
}

.editing .caption {
  color: var(--ink-2);
  flex: 1;
  min-width: 0;
}

.failed {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--warn-soft);
  border-radius: var(--radius-card);
}

.tooltip {
  position: fixed;
  z-index: 6;
  padding: 2px var(--space-2);
  border-radius: 6px;
  background: var(--ink);
  color: var(--bg);
  pointer-events: none;
  white-space: nowrap;
}

.retry {
  padding: 4px var(--space-3);
  border-radius: var(--radius-btn);
  border: 1px solid var(--hairline-2);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}
</style>
