<script setup lang="ts">
import { previewedDurations } from '~/utils/entitlements-store';
const entitlements = useEntitlements();
const natures = useNatures();
const selection = useSelection();
const previews = usePreviews();

const durations = computed(() => {
  const runs = [];
  for (const run of selection.runs.value) {
    const preview = previews.state.get(run.key)?.preview;
    if (preview) runs.push({ natureId: run.natureId, preview });
  }
  return previewedDurations(runs);
});

const trim = (value: number) => String(Math.round(value * 100) / 100);
const projected = (id: number, balance: number): number | null => {
  const after = entitlements.after(id, durations.value);
  return after === null || after === balance ? null : after;
};
const sharedNatures = computed(() => {
  const seen = new Set<number>();
  const shared = new Set<number>();
  for (const counter of entitlements.counters.value) {
    if (seen.has(counter.natureId)) shared.add(counter.natureId);
    seen.add(counter.natureId);
  }
  return shared;
});
const ratio = (used: number, earned: number) =>
  earned <= 0 ? 0 : Math.min(100, Math.round((used / earned) * 100));

onMounted(() => {
  if (entitlements.status.value === 'idle') entitlements.load();
});
</script>

<template>
  <div class="counters" data-testid="counters">
    <div
      v-for="counter in entitlements.counters.value"
      :key="counter.id"
      class="counter"
      :data-entitlement-id="counter.id"
      :data-nature-id="counter.natureId"
      :title="`${counter.periodLabel} · ${trim(counter.pending)} pending`"
    >
      <div class="head caption">
        <span>{{ natures.label(counter.natureId) }}</span>
        <span v-if="sharedNatures.has(counter.natureId)">
          {{ counter.periodName ?? counter.periodBegin?.slice(0, 4) ?? '' }}
        </span>
      </div>
      <div class="value counter-text" data-testid="balance">
        {{ trim(counter.balance) }}
        <span
          v-if="projected(counter.id, counter.balance) !== null"
          class="after"
        >
          → {{ trim(projected(counter.id, counter.balance) as number) }}
        </span>
      </div>
      <div class="bar">
        <i
          :style="`width: ${ratio(counter.used, counter.earned)}%; background: var(${natures.colorToken(counter.natureId)})`"
        ></i>
      </div>
    </div>
  </div>
</template>

<style scoped>
.counters {
  display: flex;
  gap: var(--space-3);
}

.counter {
  min-width: 132px;
  padding: var(--space-2) var(--space-3);
  background: var(--surface-sunk);
  border-radius: var(--radius-card);
}

.head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  color: var(--ink-2);
}

.value {
  font-size: 22px;
  line-height: 26px;
  font-weight: 600;
  white-space: nowrap;
}

.after {
  color: var(--accent);
}

.bar {
  height: 3px;
  margin-top: 6px;
  background: var(--hairline);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
}
</style>
