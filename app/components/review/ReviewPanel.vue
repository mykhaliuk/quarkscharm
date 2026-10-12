<script setup lang="ts">
import { ONE_RANGE_MESSAGE } from '~/utils/submit-store';
import type { PreviewEntry } from '~/utils/previews-store';
import type { KeyedRun } from '~/utils/selection-store';

defineProps<{
  runs: KeyedRun[];
  entries: Map<string, PreviewEntry>;
  errors: Map<string, string>;
  canSubmit: boolean;
  submitting: boolean;
  editing: boolean;
  label: (natureId: number | null) => string;
  colorToken: (natureId: number | null) => string;
}>();

const emit = defineEmits<{
  (e: 'retry', run: KeyedRun): void;
  (e: 'submit'): void;
  (e: 'clear'): void;
}>();
</script>

<template>
  <aside class="panel" data-testid="review-panel">
    <h2 class="title">
      {{ editing ? 'Change request' : 'Review' }}
      <span class="caption count"
        >{{ runs.length }} {{ runs.length === 1 ? 'run' : 'runs' }}</span
      >
    </h2>
    <p v-if="runs.length === 0" class="caption empty">
      Pick a brush and paint days on the grid. Shift-click a half for a half
      day.
    </p>
    <RunRow
      v-for="run in runs"
      :key="run.key"
      :run="run"
      :entry="entries.get(run.key)"
      :error="errors.get(run.key) ?? null"
      :label="label"
      :color-token="colorToken"
      @retry="emit('retry', $event)"
    />
    <p
      v-if="editing && runs.length > 1"
      class="caption split"
      data-testid="one-range"
      role="alert"
    >
      {{ ONE_RANGE_MESSAGE }}
    </p>
    <div v-if="runs.length > 0" class="actions">
      <span class="caption hint">Enter to submit · Escape to clear</span>
      <button type="button" class="btn label" @click="emit('clear')">
        Clear
      </button>
      <button
        type="button"
        class="btn primary label"
        :disabled="!canSubmit || submitting"
        data-testid="submit"
        @click="emit('submit')"
      >
        {{ editing ? 'Save change' : `Submit ${runs.length}` }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
.split {
  margin: 0;
  padding: 4px var(--space-2);
  border-radius: 6px;
  background: var(--warn-soft);
}

.panel {
  display: grid;
  gap: var(--space-3);
  align-content: start;
  padding: var(--space-4);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

h2 {
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.count,
.empty,
.hint {
  color: var(--ink-2);
}

.empty {
  margin: 0;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  justify-content: flex-end;
}

.hint {
  flex: 1;
  min-width: 0;
}

.btn {
  white-space: nowrap;
  padding: 6px var(--space-3);
  border-radius: var(--radius-btn);
  border: 1px solid var(--hairline-2);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}

.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.primary {
  background: var(--accent);
  color: var(--on-accent);
  border-color: var(--accent);
}

.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
