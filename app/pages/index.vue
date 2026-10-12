<script setup lang="ts">
import type { CellPress } from '~/utils/calendar-events';
import type { AbsenceRequest, Preview } from '~/utils/qs/map';
import type { YearPart } from '~/utils/year-store';
import { isPending } from '~~/shared/utils/status';
import { today } from '~~/shared/utils/ymd';

const PARTS: YearPart[] = ['requests', 'planner', 'holidays'];
const HIGHLIGHT_MS = 1200;

const session = useSession();
const { store, year } = useYear();
const natures = useNatures();
const selection = useSelection();
const previews = usePreviews();
const submit = useSubmit();
const { cancel } = useCancel();
const whosOff = useWhosOff();

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
const canSubmit = computed(
  () =>
    selection.runs.value.length > 0 &&
    previews.allReady.value &&
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
  if (press.event.altKey) {
    press.event.preventDefault();
    void whosOff.focus(press.date);
    return;
  }
  if (selection.brush.value === null) {
    if (requestIdOf(press.date) !== null) card.pin(press.date);
    else {
      void whosOff.focus(press.date);
      askForBrush();
    }
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
  card.enter(date);
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
  card.leave();
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
const confirmCancel = async (request: AbsenceRequest) => {
  card.hide();
  await cancel(request);
};

const selectBrush = (index: number) => {
  const id = natures.brushes.value[index];
  if (id !== undefined) selection.setBrush(id);
};

useShortcuts({
  t: () => selectBrush(0),
  f: () => selectBrush(1),
  c: () => selectBrush(2),
  Escape: clearAll,
  Enter: () => void submitAll(),
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
  <main class="planner">
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
        :slots="store.slots.value"
        :selection="selection.paint"
        :is-selectable="store.isSelectable"
        :holidays="store.state.holidays"
        :today="todayYmd"
        :pending-ids="pendingIds"
        :color-token="natures.colorToken"
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
      :request="card.request.value"
      :anchor="card.anchor.value"
      :pinned="card.pinned.value"
      :label="natures.label"
      :color-token="natures.colorToken"
      @change="startChange"
      @cancel="confirmCancel"
      @hold="card.hold"
      @release="card.leave"
    />
  </main>
</template>

<style scoped>
.planner {
  display: grid;
  grid-template-columns: 220px 1fr 320px;
  gap: var(--space-6);
  align-items: start;
}

.grid-area {
  display: grid;
  gap: var(--space-4);
  align-content: start;
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
