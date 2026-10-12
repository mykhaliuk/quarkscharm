<script setup lang="ts">
import { computed } from 'vue';
import type { Slot } from '~~/shared/utils/slots';
import type { CellPress } from '~/utils/calendar-events';
import { yearMonths } from '~~/shared/utils/ymd';

const props = defineProps<{
  year: number;
  slots: Map<string, Slot>;
  selection: Map<string, Slot>;
  isSelectable: (ymd: string) => boolean;
  holidays: Map<string, string>;
  today: string;
  pendingIds: Set<number>;
  colorToken: (natureId: number | null) => string;
}>();

const emit = defineEmits<{
  (e: 'enter', date: string): void;
  (e: 'leave', date: string): void;
  (e: 'press', press: CellPress): void;
}>();

const grids = computed(() => yearMonths(props.year));
</script>

<template>
  <div class="year" :data-year="year">
    <MonthGrid
      v-for="(grid, i) in grids"
      :key="i"
      :month="i + 1"
      :grid="grid"
      :slots="slots"
      :selection="selection"
      :is-selectable="isSelectable"
      :holidays="holidays"
      :today="today"
      :pending-ids="pendingIds"
      :color-token="colorToken"
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
