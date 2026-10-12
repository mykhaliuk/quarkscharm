<script setup lang="ts">
import type { CellPress } from '~/utils/calendar-events';
import type { YearPart } from '~/utils/year-store';
import { isPending } from '~~/shared/utils/status';
import { today } from '~~/shared/utils/ymd';

const PARTS: YearPart[] = ['requests', 'planner', 'holidays'];

const session = useSession();
const { store, year } = useYear();
const natures = useNatures();

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
const selection = ref(new Map());
const failed = computed(() =>
  PARTS.filter((part) => store.state.status[part] === 'failed'),
);

const requestIdOf = (date: string): number | null => {
  const slot = store.slots.value.get(date);
  return slot?.am?.requestId ?? slot?.pm?.requestId ?? null;
};
const card = useRequestCard(() => store.state.requests, requestIdOf);

const onPress = (press: CellPress) => {
  if (requestIdOf(press.date) !== null) card.pin(press.date);
};

onMounted(() => {
  natures.load();
  if (store.state.status.requests === 'idle') store.load(year.value);
});
</script>

<template>
  <main class="planner">
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
    <YearGrid
      :year="year"
      :slots="store.slots.value"
      :selection="selection"
      :is-selectable="store.isSelectable"
      :holidays="store.state.holidays"
      :today="todayYmd"
      :pending-ids="pendingIds"
      :color-token="natures.colorToken"
      @enter="card.enter"
      @leave="card.leave"
      @press="onPress"
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
