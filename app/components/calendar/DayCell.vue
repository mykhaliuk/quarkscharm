<script setup lang="ts">
import { computed } from 'vue';
import type { Slot } from '~~/shared/utils/slots';
import type { CellPress } from '~/utils/calendar-events';

const props = defineProps<{
  date: string;
  slot: Slot;
  muted: boolean;
  holiday: string | null;
  today: boolean;
  pending: boolean;
  selected: boolean;
  colorToken: (natureId: number | null) => string;
}>();

const emit = defineEmits<{
  (e: 'enter', date: string): void;
  (e: 'leave', date: string): void;
  (e: 'press', press: CellPress): void;
}>();

const day = computed(() => Number(props.date.slice(8, 10)));
const full = computed(() => props.slot.am !== null && props.slot.pm !== null);
const requestId = computed(
  () => props.slot.am?.requestId ?? props.slot.pm?.requestId ?? null,
);
const fill = (half: 'am' | 'pm') => {
  const paint = props.slot[half];
  return paint === null
    ? undefined
    : `background: var(${props.colorToken(paint.natureId)})`;
};
const classes = computed(() => ({
  muted: props.muted,
  today: props.today,
  pending: props.pending,
  selected: props.selected,
  full: full.value,
  painted: props.slot.am !== null || props.slot.pm !== null,
}));
</script>

<template>
  <div
    class="cell"
    :class="classes"
    :title="holiday ?? undefined"
    :data-date="date"
    :data-selectable="String(!muted)"
    :data-request-id="requestId ?? undefined"
    @mouseenter="emit('enter', date)"
    @mouseleave="emit('leave', date)"
  >
    <div
      class="half am"
      data-half="am"
      :style="fill('am')"
      @mousedown="emit('press', { date, half: 'am', event: $event })"
    ></div>
    <div
      class="half pm"
      data-half="pm"
      :style="fill('pm')"
      @mousedown="emit('press', { date, half: 'pm', event: $event })"
    ></div>
    <span class="n cell-text">{{ day }}</span>
  </div>
</template>

<style scoped>
.cell {
  position: relative;
  width: var(--cell-size);
  height: var(--cell-size);
  border-radius: var(--radius-cell);
  background: var(--surface);
  overflow: hidden;
  display: grid;
  grid-template-rows: 1fr 1fr;
  user-select: none;
}

.half {
  background: transparent;
}

.n {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 11px;
  line-height: 14px;
  font-weight: 500;
  color: var(--ink);
  pointer-events: none;
}

.muted {
  background: var(--cell-muted-bg);
}

.muted .n {
  color: var(--cell-muted-fg);
}

.full .n {
  color: var(--on-nature);
}

.today {
  outline: 2px solid var(--cell-today);
  outline-offset: 1px;
}

.pending::after {
  content: '';
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 5px;
  height: 5px;
  border-radius: var(--radius-pill);
  background: var(--cell-pending);
  box-shadow: 0 0 0 1px var(--ink-2);
}

.selected .half {
  box-shadow: inset 0 0 0 1px var(--cell-selected);
}

.selected .half[style=''] {
  box-shadow: none;
}
</style>
