<script setup lang="ts">
import { computed } from 'vue';
import type { Slot } from '~~/shared/utils/slots';
import type { CellPress } from '~/utils/calendar-events';
import { leaveYearMonths } from '~~/shared/utils/ymd';

const props = defineProps<{
  year: number;
  startMonth: number;
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

const months = computed(() => leaveYearMonths(props.year, props.startMonth));
</script>

<template>
  <div class="year" :data-year="year">
    <MonthGrid
      v-for="item in months"
      :key="`${item.year}-${item.month}`"
      :month="item.month"
      :grid="item.grid"
      :slots="slots"
      :selection="selection"
      :is-selectable="isSelectable"
      :holidays="holidays"
      :school="school"
      :today="today"
      :pending-ids="pendingIds"
      :focused-date="focusedDate"
      :cursor="cursor"
      :range="range"
      :color-token="colorToken"
      :label="label"
      @enter="emit('enter', $event)"
      @leave="emit('leave', $event)"
      @press="emit('press', $event)"
    />
  </div>
</template>

<style scoped>
.year {
  display: grid;
  grid-template-columns: repeat(4, max-content);
  gap: var(--space-4) var(--space-6);
}
</style>
