<script setup lang="ts">
import { computed } from 'vue';

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
const CHIPS = 3;

const chips = computed(() => props.brushes.slice(0, CHIPS));
const more = computed(() => props.brushes.slice(CHIPS));
const moreValue = computed(() =>
  props.active !== null && more.value.includes(props.active)
    ? String(props.active)
    : '',
);

const toggle = (id: number) => emit('select', props.active === id ? null : id);
const pick = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  emit('select', value === '' ? null : Number(value));
};
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
      v-for="(id, i) in chips"
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
    <label
      v-if="more.length > 0"
      class="more chip label"
      :class="{ active: moreValue !== '' }"
    >
      <span
        v-if="moreValue !== ''"
        class="sw"
        :style="`background: var(${colorToken(Number(moreValue))})`"
      ></span>
      <span class="more-label">{{
        moreValue !== '' ? label(Number(moreValue)) : '⋯'
      }}</span>
      <span class="chev">▾</span>
      <select :value="moreValue" data-testid="brush-more" @change="pick">
        <option value="">More natures</option>
        <option v-for="id in more" :key="id" :value="String(id)">
          {{ label(id) }}
        </option>
      </select>
    </label>
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
  white-space: nowrap;
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
  box-shadow: inset 0 0 0 1px var(--hairline-2);
}

.more {
  position: relative;
}

.more-label {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chev {
  color: var(--ink-2);
  font-size: 11px;
}

.more select {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
}

.more:has(select:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
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
