<script setup lang="ts">
import { computed } from 'vue';
import type { Slot } from '~~/shared/utils/slots';
import type { CellPress } from '~/utils/calendar-events';
import { formatDay } from '~/utils/format';

const props = defineProps<{
  date: string;
  slot: Slot;
  muted: boolean;
  holiday: string | null;
  school?: string | null;
  today: boolean;
  pending: boolean;
  selected: boolean;
  focused?: boolean;
  cursor?: boolean;
  ranged?: boolean;
  colorToken: (natureId: number | null) => string;
  label?: (natureId: number | null) => string;
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
const numberColor = computed(() => {
  const paint = props.slot.am;
  if (!full.value || paint === null) return undefined;
  const token = props.colorToken(paint.natureId).slice(2);
  return `--cell-on: var(--on-${token}, var(--on-nature))`;
});
const status = computed(() => {
  if (requestId.value !== null) return props.pending ? 'pending' : 'validated';
  return props.selected ? 'selected' : null;
});
const accessibleName = computed(() => {
  const natures = new Set<string>();
  for (const paint of [props.slot.am, props.slot.pm]) {
    if (paint !== null && props.label) natures.add(props.label(paint.natureId));
  }
  const school = props.school ?? null;
  return [
    formatDay(props.date),
    props.holiday,
    school,
    ...natures,
    status.value,
  ]
    .filter((part) => part !== null)
    .join(', ');
});
const classes = computed(() => ({
  muted: props.muted,
  holiday: props.holiday !== null,
  today: props.today,
  pending: props.pending,
  selected: props.selected,
  focused: props.focused === true,
  cursor: props.cursor === true,
  ranged: props.ranged === true,
  full: full.value,
  painted: props.slot.am !== null || props.slot.pm !== null,
}));
</script>

<template>
  <div
    class="cell"
    :class="classes"
    :style="numberColor"
    :aria-label="accessibleName"
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
    <span v-if="school" class="school" data-testid="school-dot"></span>
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

.holiday {
  background: var(--cell-holiday-bg);
}

.holiday .n {
  color: var(--cell-holiday-fg);
}

.full .n {
  color: var(--cell-on, var(--on-nature));
}

.cell:not(.muted) {
  cursor: pointer;
}

.today::before,
.focused::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-cell);
  pointer-events: none;
  z-index: 1;
}

.today::before {
  border: 2px solid var(--cell-today);
}

.focused::before {
  border: 2px solid var(--ink);
}

.today.focused::before {
  border-color: var(--ink);
  box-shadow: inset 0 0 0 2px var(--cell-today);
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

.school {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 5px;
  height: 5px;
  border-radius: var(--radius-pill);
  background: var(--cell-school);
  box-shadow: 0 0 0 1px var(--surface);
  pointer-events: none;
  z-index: 1;
}

.cursor {
  z-index: 2;
  box-shadow: 0 0 0 2px var(--cell-cursor);
}

.selected::after,
.ranged::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-cell);
  border: 1px dashed var(--cell-selected);
  pointer-events: none;
  z-index: 1;
}
</style>
