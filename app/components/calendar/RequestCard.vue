<script setup lang="ts">
import { computed } from 'vue';
import { formatDayRange, formatDays } from '~/utils/format';
import type { AbsenceRequest } from '~/utils/qs/map';
import type { CardAnchor } from '~/composables/useRequestCard';
import { isPending } from '~~/shared/utils/status';

const props = defineProps<{
  request: AbsenceRequest;
  anchor: CardAnchor;
  pinned: boolean;
  label: (natureId: number | null) => string;
  colorToken: (natureId: number | null) => string;
}>();

const emit = defineEmits<{
  (e: 'change', request: AbsenceRequest): void;
  (e: 'cancel', request: AbsenceRequest): void;
}>();

const natureId = computed(() => props.request.segments[0]?.natureId ?? null);
const status = computed(() =>
  isPending(props.request.statusId) ? 'pending' : 'validated',
);
const style = computed(() => ({
  top: `${props.anchor.top}px`,
  left: `${props.anchor.left}px`,
}));
</script>

<template>
  <div
    class="card"
    :class="{ pinned }"
    :style="style"
    data-testid="request-card"
  >
    <div class="head">
      <span
        class="sw"
        :style="`background: var(${colorToken(natureId)})`"
      ></span>
      <span class="label">{{ label(natureId) }}</span>
      <span class="status caption">{{ status }}</span>
    </div>
    <div class="dates caption">
      {{ formatDayRange(request.beginDate, request.endDate) }} ·
      {{ formatDays(request.duration) }}
    </div>
    <div class="acts">
      <button type="button" class="btn label" @click="emit('change', request)">
        Change
      </button>
      <button
        v-if="request.cancelSequenceId !== null"
        type="button"
        class="btn label"
        @click="emit('cancel', request)"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<style scoped>
.card {
  position: fixed;
  z-index: 5;
  width: 260px;
  padding: var(--space-3) var(--space-4);
  background: var(--surface);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-pop);
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
}

.status {
  margin-left: auto;
  padding: 0 6px;
  border-radius: var(--radius-pill);
  background: var(--surface-sunk);
  color: var(--ink-2);
}

.dates {
  margin-top: 2px;
  color: var(--ink-2);
}

.acts {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.btn {
  padding: 4px var(--space-3);
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
</style>
