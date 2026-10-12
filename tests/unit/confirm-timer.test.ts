import { describe, expect, test } from 'bun:test';
import { createConfirmTimer } from '~/utils/confirm-timer';

const fakeTimers = () => {
  const pending: { id: number; fn: () => void }[] = [];
  let next = 1;
  return {
    pending,
    setTimer: (fn: () => void) => {
      const id = next++;
      pending.push({ id, fn });
      return id;
    },
    clearTimer: (id: number) => {
      const index = pending.findIndex((p) => p.id === id);
      if (index >= 0) pending.splice(index, 1);
    },
    fire: () => {
      const first = pending.shift();
      first?.fn();
    },
  };
};

describe('confirm timer', () => {
  test('ask opens the confirmation and the timeout closes it', () => {
    const timers = fakeTimers();
    const confirm = createConfirmTimer({ timeoutMs: 5000, ...timers });
    expect(confirm.confirming.value).toBe(false);
    confirm.ask();
    expect(confirm.confirming.value).toBe(true);
    timers.fire();
    expect(confirm.confirming.value).toBe(false);
  });

  test('asking again resets the timer', () => {
    const timers = fakeTimers();
    const confirm = createConfirmTimer({ timeoutMs: 5000, ...timers });
    confirm.ask();
    confirm.ask();
    expect(timers.pending).toHaveLength(1);
  });

  test('decline closes and clears the timer', () => {
    const timers = fakeTimers();
    const confirm = createConfirmTimer({ timeoutMs: 5000, ...timers });
    confirm.ask();
    confirm.decline();
    expect(confirm.confirming.value).toBe(false);
    expect(timers.pending).toHaveLength(0);
  });

  test('accept runs the action once and closes', async () => {
    const timers = fakeTimers();
    const confirm = createConfirmTimer({ timeoutMs: 5000, ...timers });
    let runs = 0;
    confirm.ask();
    await confirm.accept(async () => void runs++);
    expect(runs).toBe(1);
    expect(confirm.confirming.value).toBe(false);
    expect(timers.pending).toHaveLength(0);
    await confirm.accept(async () => void runs++);
    expect(runs).toBe(1);
  });
});
