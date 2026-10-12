import type { AbsenceRequest } from '~/utils/qs/map';

const HOVER_DELAY_MS = 150;

export type CardAnchor = { top: number; left: number };

const anchorOf = (date: string): CardAnchor => {
  const cell = document.querySelector<HTMLElement>(`[data-date="${date}"]`);
  if (!cell) return { top: 0, left: 0 };
  const rect = cell.getBoundingClientRect();
  return { top: rect.bottom + 6, left: rect.left };
};

export const useRequestCard = (
  requests: () => AbsenceRequest[],
  requestIdOf: (date: string) => number | null,
) => {
  const request = ref<AbsenceRequest | null>(null);
  const anchor = ref<CardAnchor>({ top: 0, left: 0 });
  const pinned = ref(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const show = (date: string) => {
    const id = requestIdOf(date);
    const found =
      id === null ? null : (requests().find((r) => r.id === id) ?? null);
    if (!found) return;
    request.value = found;
    anchor.value = anchorOf(date);
  };

  const hide = () => {
    clearTimer();
    pinned.value = false;
    request.value = null;
  };

  const enter = (date: string) => {
    if (pinned.value) return;
    clearTimer();
    if (requestIdOf(date) === null) return;
    timer = setTimeout(() => show(date), HOVER_DELAY_MS);
  };

  const leave = () => {
    if (pinned.value) return;
    clearTimer();
    request.value = null;
  };

  const pin = (date: string) => {
    if (requestIdOf(date) === null) return;
    clearTimer();
    show(date);
    pinned.value = true;
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') hide();
  };
  const onPointer = (event: MouseEvent) => {
    if (!pinned.value) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-testid="request-card"]')) return;
    if (target?.closest('[data-request-id]')) return;
    hide();
  };
  onMounted(() => {
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('mousedown', onPointer);
    clearTimer();
  });

  return { request, anchor, pinned, enter, leave, pin, hide };
};
