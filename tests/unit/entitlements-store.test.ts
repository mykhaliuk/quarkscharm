import { describe, expect, test } from 'bun:test';
import { createEntitlements } from '~/utils/entitlements-store';
import entitlements from '../fixtures/qs/entitlements.json';

const build = (over: Partial<Parameters<typeof createEntitlements>[0]> = {}) =>
  createEntitlements({
    getEntitlements: async () => entitlements,
    getTsaEntitlements: async () => [],
    employeeId: () => 9001,
    today: () => '2026-10-12',
    ...over,
  });

const undated = (
  id: number,
  periodId: number,
  natureId: number,
  balance: number,
) => ({
  ...entitlements[0]!,
  id,
  balance,
  period: { id: periodId, natureId, agreement: { id: 6, label: 'Fulll' } },
});

describe('entitlements store', () => {
  test('load keeps the current and the next period per nature, current first', async () => {
    const store = build();
    await store.load();
    expect(store.counters.value.map((c) => [c.natureId, c.id])).toEqual([
      [14, 388],
      [14, 389],
      [17, 656],
    ]);
    expect(store.status.value).toBe('ready');
  });

  test('a past period is dropped', async () => {
    const store = build({
      getEntitlements: async () => [
        ...entitlements,
        {
          ...entitlements[0]!,
          id: 300,
          period: {
            ...entitlements[0]!.period,
            id: 30,
            beginDate: '2025-06-01T00:00:00+02:00',
            endDate: '2026-05-31T23:00:00+02:00',
          },
        },
      ],
    });
    await store.load();
    expect(store.counters.value.map((c) => c.id)).not.toContain(300);
  });

  test('without period dates the latest period shows, older ones only with a balance', async () => {
    const store = build({
      getEntitlements: async () => [
        undated(224, 33, 14, 0),
        undated(388, 38, 14, 4.82),
        undated(300, 30, 14, 1.5),
        undated(656, 42, 17, 7.65),
      ],
    });
    await store.load();
    expect(store.counters.value.map((c) => c.id)).toEqual([388, 300, 656]);
  });

  test('tsa entitlements with the same shape join the counters', async () => {
    const store = build({
      getTsaEntitlements: async () => [
        {
          ...entitlements[2]!,
          id: 900,
          period: { ...entitlements[2]!.period, id: 90, natureId: 54 },
        },
      ],
    });
    await store.load();
    expect(store.counters.value.map((c) => c.natureId)).toContain(54);
  });

  test('a differently shaped tsa answer is logged and ignored', async () => {
    const logged: unknown[] = [];
    const store = build({
      getTsaEntitlements: async () => ({ unexpected: true }),
      log: (...args) => void logged.push(args),
    });
    await store.load();
    expect(store.counters.value).toHaveLength(3);
    expect(logged).toHaveLength(1);
  });

  test('after projects the balance minus the previewed durations of that nature', async () => {
    const store = build();
    await store.load();
    const durations = new Map([
      [14, 2],
      [17, 0.5],
    ]);
    expect(store.after(388, durations)).toBe(2.82);
    expect(store.after(656, durations)).toBe(5.5);
    expect(store.after(389, durations)).toBe(-2);
  });

  test('reload fetches again', async () => {
    let calls = 0;
    const store = build({
      getEntitlements: async () => {
        calls++;
        return entitlements;
      },
    });
    await store.load();
    await store.reload();
    expect(calls).toBe(2);
  });
});
