<script setup lang="ts">
import type { CellPress } from '~/utils/calendar-events';
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
const submitErrors = ref(new Map<string, string>());
const canSubmit = computed(
  () => selection.runs.value.length > 0 && previews.allReady.value,
);

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
  if (selection.brush.value === null) {
    if (requestIdOf(press.date) !== null) card.pin(press.date);
    else askForBrush();
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
const onEnter = (date: string) => {
  if (drag !== null) {
    drag.to = date;
    return;
  }
  card.enter(date);
};
const onRelease = () => {
  if (drag === null) return;
  const { from, to, half, shift } = drag;
  drag = null;
  if (from !== to) selection.paintRange(from, to);
  else if (shift) selection.paintHalf(from, half);
  else selection.paintDay(from);
};

const selectBrush = (index: number) => {
  const id = natures.brushes.value[index];
  if (id !== undefined) selection.setBrush(id);
};

useShortcuts({
  t: () => selectBrush(0),
  f: () => selectBrush(1),
  c: () => selectBrush(2),
  Escape: () => {
    selection.clear();
    submitErrors.value = new Map();
  },
});

onMounted(() => {
  window.addEventListener('mouseup', onRelease);
  natures.load();
  if (store.state.status.requests === 'idle') store.load(year.value);
});
onBeforeUnmount(() => window.removeEventListener('mouseup', onRelease));
</script>

<template>
  <main class="planner">
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
        :label="natures.label"
        :color-token="natures.colorToken"
        @select="selection.setBrush"
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
        @leave="card.leave"
        @press="onPress"
      />
    </section>
    <ReviewPanel
      :runs="selection.runs.value"
      :entries="previews.state"
      :errors="submitErrors"
      :can-submit="canSubmit"
      :submitting="false"
      :editing="selection.editing.value !== null"
      :label="natures.label"
      :color-token="natures.colorToken"
      @retry="previews.retry"
      @clear="selection.clear"
    />
    <RequestCard
      v-if="card.request.value"
      :request="card.request.value"
      :anchor="card.anchor.value"
      :pinned="card.pinned.value"
      :label="natures.label"
      :color-token="natures.colorToken"
    />
  </main>
</template>

<style scoped>
.planner {
  display: grid;
  grid-template-columns: 1fr 320px;
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

.retry {
  padding: 4px var(--space-3);
  border-radius: var(--radius-btn);
  border: 1px solid var(--hairline-2);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}
</style>
