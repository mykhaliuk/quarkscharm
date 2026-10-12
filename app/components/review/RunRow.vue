<script setup lang="ts">
import { computed } from 'vue';
import { formatDayRange, formatDays } from '~/utils/format';
import type { PreviewEntry } from '~/utils/previews-store';
import type { KeyedRun } from '~/utils/selection-store';

const props = defineProps<{
  run: KeyedRun;
  entry: PreviewEntry | undefined;
  error: string | null;
  label: (natureId: number | null) => string;
  colorToken: (natureId: number | null) => string;
}>();

const emit = defineEmits<{ (e: 'retry', run: KeyedRun): void }>();

const preview = computed(() => props.entry?.preview ?? null);
const duration = computed(() =>
  (preview.value?.segments ?? []).reduce((sum, s) => sum + s.duration, 0),
);
const balance = computed(() => {
  const nature = preview.value?.natures.find(
    (n) => n.id === props.run.natureId,
  );
  if (!nature || nature.balance === null) return null;
  return { before: nature.balance, after: nature.balance - duration.value };
});
const trim = (n: number) => String(Math.round(n * 100) / 100);
</script>

<template>
  <div
    class="run"
    :class="entry?.status"
    data-testid="run-row"
    :data-run-key="run.key"
  >
    <div class="head">
      <span
        class="sw"
        :style="`background: var(${colorToken(run.natureId)})`"
      ></span>
      <span class="label">{{ label(run.natureId) }}</span>
      <span class="dates caption">{{
        formatDayRange(run.beginDate, run.endDate)
      }}</span>
    </div>
    <template v-if="entry?.status === 'ready' && preview">
      <div
        v-for="segment in preview.segments"
        :key="segment.beginDate"
        class="line caption"
        data-testid="segment"
      >
        <span>{{ formatDayRange(segment.beginDate, segment.endDate) }}</span>
        <span>{{ formatDays(segment.duration) }}</span>
      </div>
      <div v-if="balance" class="line caption">
        <span>Balance after</span>
        <b data-testid="balance-after"
          >{{ trim(balance.before) }} → {{ trim(balance.after) }}</b
        >
      </div>
      <p
        v-for="warning in preview.warnings"
        :key="warning"
        class="note warn caption"
      >
        {{ warning }}
      </p>
      <p
        v-for="conflict in preview.conflicts"
        :key="conflict"
        class="note error-note caption"
      >
        {{ conflict }}
      </p>
    </template>
    <p
      v-else-if="entry?.status === 'rejected'"
      class="note error-note caption"
      role="alert"
    >
      {{ entry.messages.join(' ') || 'quarksUp rejected this run.' }}
    </p>
    <div v-else-if="entry?.status === 'unavailable'" class="line caption">
      <span>quarksUp did not answer.</span>
      <button type="button" class="btn label" @click="emit('retry', run)">
        Retry
      </button>
    </div>
    <p v-else class="caption muted">Previewing…</p>
    <p v-if="error" class="note error-note caption" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.run {
  border: 1px solid var(--hairline);
  border-radius: var(--radius-card);
  padding: var(--space-3);
  display: grid;
  gap: var(--space-1);
}

.head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.sw {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  box-shadow: inset 0 0 0 1px var(--hairline-2);
}

.dates {
  margin-left: auto;
  color: var(--ink-2);
}

.line {
  display: flex;
  justify-content: space-between;
  color: var(--ink-2);
}

.line b {
  color: var(--ink);
  font-weight: 500;
}

.note {
  margin: 0;
  padding: 4px var(--space-2);
  border-radius: 6px;
}

.warn {
  background: var(--warn-soft);
}

.error-note {
  background: var(--error-soft);
}

.muted {
  color: var(--ink-3);
}

.btn {
  white-space: nowrap;
  padding: 2px var(--space-2);
  border-radius: var(--radius-btn);
  border: 1px solid var(--hairline-2);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}
</style>
