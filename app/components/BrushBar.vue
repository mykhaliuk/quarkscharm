<script setup lang="ts">
const props = defineProps<{
  brushes: number[];
  active: number | null;
  highlighted: boolean;
  status: 'idle' | 'loading' | 'ready' | 'failed';
  label: (natureId: number | null) => string;
  colorToken: (natureId: number | null) => string;
}>();

const emit = defineEmits<{
  (e: 'select', natureId: number | null): void;
  (e: 'retry'): void;
}>();

const KEYS = ['T', 'F', 'C'];

const toggle = (id: number) => emit('select', props.active === id ? null : id);
</script>

<template>
  <div class="bar" :class="{ highlighted }" data-testid="brush-bar">
    <span v-if="props.status === 'failed'" class="note caption" role="alert">
      The absence natures did not load.
      <button type="button" class="chip label" @click="emit('retry')">
        Retry
      </button>
    </span>
    <span
      v-else-if="props.status === 'ready' && brushes.length === 0"
      class="note caption"
    >
      No nature to paint with: quarksUp returned none of TT, FOFF or CP.
    </span>
    <button
      v-for="(id, i) in brushes"
      :key="id"
      type="button"
      class="chip label"
      :class="{ active: active === id }"
      :data-nature-id="id"
      :aria-pressed="active === id"
      @click="toggle(id)"
    >
      <span class="sw" :style="`background: var(${colorToken(id)})`"></span>
      {{ label(id) }}
      <kbd v-if="i < KEYS.length">{{ KEYS[i] }}</kbd>
    </button>
  </div>
</template>

<style scoped>
.bar {
  display: inline-flex;
  gap: var(--space-2);
  padding: var(--space-1);
  background: var(--surface-sunk);
  border-radius: var(--radius-btn);
  width: max-content;
  transition: box-shadow 150ms;
}

.note {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px var(--space-2);
  color: var(--ink-2);
}

.highlighted {
  box-shadow: 0 0 0 2px var(--accent);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-3);
  border-radius: var(--radius-btn);
  border: 1px solid var(--hairline-2);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
  font: inherit;
}

.chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.chip.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.sw {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

kbd {
  font-size: 11px;
  line-height: 14px;
  color: var(--ink-2);
  border: 1px solid var(--hairline-2);
  border-radius: 4px;
  padding: 0 4px;
}
</style>
