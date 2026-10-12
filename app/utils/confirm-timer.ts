import { ref } from 'vue';

type Deps = {
  timeoutMs: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (id: unknown) => void;
};

export const createConfirmTimer = ({
  timeoutMs,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
}: Deps) => {
  const confirming = ref(false);
  let timer: unknown = null;

  const stop = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  const decline = () => {
    stop();
    confirming.value = false;
  };

  const ask = () => {
    stop();
    confirming.value = true;
    timer = setTimer(decline, timeoutMs);
  };

  const accept = async (action: () => Promise<void>) => {
    if (!confirming.value) return;
    decline();
    await action();
  };

  return { confirming, ask, decline, accept };
};

export type ConfirmTimer = ReturnType<typeof createConfirmTimer>;
