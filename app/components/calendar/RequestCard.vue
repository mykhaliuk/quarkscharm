<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { createConfirmTimer } from '~/utils/confirm-timer';
import { formatDayRange, formatDays } from '~/utils/format';
import type { AbsenceRequest } from '~/utils/qs/map';
import type { CardAnchor } from '~/composables/useRequestCard';
import { isPending } from '~~/shared/utils/status';

const CONFIRM_MS = 5000;

const props = defineProps<{
  request: AbsenceRequest;
  anchor: CardAnchor;
  pinned: boolean;
  error: string | null;
  label: (natureId: number | null) => string;
  colorToken: (natureId: number | null) => string;
}>();

const emit = defineEmits<{
  (e: 'change', request: AbsenceRequest): void;
  (e: 'cancel', request: AbsenceRequest): void;
}>();

const confirm = createConfirmTimer({ timeoutMs: CONFIRM_MS });
onBeforeUnmount(confirm.decline);

const natureId = computed(() => props.request.segments[0]?.natureId ?? null);
const status = computed(() =>
  isPending(props.request.statusId) ? 'pending' : 'validated',
);
const dates = computed(() =>
  formatDayRange(props.request.beginDate, props.request.endDate),
);
const style = computed(() => ({
  top: `${props.anchor.top}px`,
  left: `${props.anchor.left}px`,
}));
const cancelVerb = computed(() =>
  props.request.cancelNeedsApproval ? 'Ask to cancel' : 'Cancel',
);
const accept = () => confirm.accept(async () => emit('cancel', props.request));

const noButton = ref<HTMLButtonElement | null>(null);
const askCancel = async () => {
  if (props.request.cancelSequenceId === null) return;
  confirm.ask();
  await nextTick();
  noButton.value?.focus();
};
defineExpose({ askCancel });
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
      {{ dates }} · {{ formatDays(request.duration) }}
    </div>
    <p v-if="error" class="error caption" role="alert">{{ error }}</p>
    <div
      v-if="confirm.confirming.value"
      class="acts confirm"
      role="alertdialog"
    >
      <span class="caption"
        >{{ cancelVerb }} {{ label(natureId) }} {{ dates }}?</span
      >
      <button type="button" class="btn danger label" @click="accept">
        Yes
      </button>
      <button
        ref="noButton"
        type="button"
        class="btn label"
        @click="confirm.decline"
      >
        No
      </button>
    </div>
    <div v-else class="acts">
      <button type="button" class="btn label" @click="emit('change', request)">
        Change
      </button>
      <button
        v-if="request.cancelSequenceId !== null"
        type="button"
        class="btn label"
        @click="confirm.ask"
      >
        {{ cancelVerb }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.error {
  margin: var(--space-2) 0 0;
  padding: 4px var(--space-2);
  border-radius: 6px;
  background: var(--error-soft);
}

.card {
  position: fixed;
  z-index: 5;
  width: 280px;
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
  box-shadow: inset 0 0 0 1px var(--hairline-2);
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
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.confirm {
  flex-wrap: wrap;
}

.confirm .caption {
  flex-basis: 100%;
}

.btn {
  white-space: nowrap;
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

.danger {
  border-color: var(--error);
  color: var(--error);
}
</style>
