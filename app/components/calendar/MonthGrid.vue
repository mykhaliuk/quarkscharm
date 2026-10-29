<script setup lang="ts">
import { computed } from 'vue';
import type { Slot } from '~~/shared/utils/slots';
import type { CellPress } from '~/utils/calendar-events';
import { isoWeek, type MonthGrid } from '~~/shared/utils/ymd';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const EMPTY: Slot = { am: null, pm: null };

const props = defineProps<{
  month: number;
  grid: MonthGrid;
  slots: Map<string, Slot>;
  selection: Map<string, Slot>;
  isSelectable: (ymd: string) => boolean;
  holidays: Map<string, string>;
  school: Map<string, string>;
  today: string;
  pendingIds: Set<number>;
  focusedDate: string | null;
  cursor: string;
  range: { from: string; to: string } | null;
  colorToken: (natureId: number | null) => string;
  label: (natureId: number | null) => string;
}>();

const emit = defineEmits<{
  (e: 'enter', date: string): void;
  (e: 'leave', date: string): void;
  (e: 'press', press: CellPress): void;
}>();

const name = computed(() => MONTHS[props.month - 1]);
const weeks = computed(() => props.grid.map(weekOf));

const slotOf = (date: string): Slot => {
  const selected = props.selection.get(date);
  const loaded = props.slots.get(date) ?? EMPTY;
  if (!selected) return loaded;
  return { am: selected.am ?? loaded.am, pm: selected.pm ?? loaded.pm };
};
const isPending = (date: string): boolean => {
  const slot = props.slots.get(date);
  const id = slot?.am?.requestId ?? slot?.pm?.requestId ?? null;
  return id !== null && props.pendingIds.has(id);
};
const isSelected = (date: string): boolean => props.selection.has(date);
const isRanged = (date: string): boolean => {
  if (props.range === null) return false;
  const { from, to } = props.range;
  return from <= to ? from <= date && date <= to : to <= date && date <= from;
};

function weekOf(row: MonthGrid[number]): number | null {
  const first = row.find((date) => date !== null);
  return first == null ? null : isoWeek(first);
}
</script>

<template>
  <section class="month" :data-month="month">
    <h3 class="name month-text">{{ name }}</h3>
    <div class="grid">
      <span class="wd" aria-hidden="true"></span>
      <span v-for="(weekday, i) in WEEKDAYS" :key="i" class="wd">{{
        weekday
      }}</span>
      <template v-for="(row, r) in grid" :key="r">
        <span
          v-if="weeks[r] != null"
          class="wd wk"
          :data-week="weeks[r]"
          :title="`Week ${weeks[r]}`"
          :aria-label="`Week ${weeks[r]}`"
          >{{ weeks[r] }}</span
        >
        <span v-else class="empty"></span>
        <template v-for="(date, c) in row" :key="c">
          <DayCell
            v-if="date !== null"
            :date="date"
            :slot="slotOf(date)"
            :muted="!isSelectable(date)"
            :holiday="holidays.get(date) ?? null"
            :school="school.get(date) ?? null"
            :today="date === today"
            :pending="isPending(date)"
            :selected="isSelected(date)"
            :focused="date === focusedDate"
            :cursor="date === cursor"
            :ranged="isRanged(date)"
            :color-token="colorToken"
            :label="label"
            @enter="emit('enter', $event)"
            @leave="emit('leave', $event)"
            @press="emit('press', $event)"
          />
          <span v-else class="empty"></span>
        </template>
      </template>
    </div>
  </section>
</template>

<style scoped>
.name {
  margin: 0 0 var(--space-1);
  font-size: 12px;
  line-height: 16px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-2);
}

.grid {
  display: grid;
  grid-template-columns: var(--cell-size) repeat(7, var(--cell-size));
  gap: var(--cell-gap);
}

.wd {
  font-size: 11px;
  line-height: 14px;
  font-weight: 500;
  color: var(--ink-3);
  text-align: center;
}

.wk {
  padding-right: var(--space-2);
  font-style: italic;
  line-height: var(--cell-size);
}

.empty {
  width: var(--cell-size);
  height: var(--cell-size);
}
</style>
