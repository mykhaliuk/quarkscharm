import { describe, expect, test } from 'bun:test';
import { nextTick, ref } from 'vue';
import { createWhosOff } from '~/utils/whos-off-store';
import plannerService from '../fixtures/qs/planner-service.json';

const build = (over: Partial<Parameters<typeof createWhosOff>[0]> = {}) => {
  const calls: string[] = [];
  const cursor = ref('2026-10-12');
  const periods = ref(new Map<number, number>([[38, 14]]));
  const store = createWhosOff({
    getPlannerService: async (begin, end) => {
      calls.push(`${begin}..${end}`);
      return plannerService;
    },
    employeeId: () => 9001,
    focusDate: () => cursor.value,
    natureOfPeriod: (periodId) => periods.value.get(periodId) ?? null,
    ...over,
  });
  return { store, calls, cursor, periods };
};

describe('whos-off store', () => {
  test('focusDate is the cursor day and loads the focused month once', async () => {
    const { store, calls } = build();
    expect(store.focusDate.value).toBe('2026-10-12');
    await store.load();
    await store.load();
    expect(calls).toEqual(['2026-10-01..2026-10-31']);
  });

  test('offOn lists the colleagues of the user service without the user, with am/pm marks', async () => {
    const { store } = build();
    await store.load();
    expect(store.offOn('2026-10-12')).toEqual([
      {
        employeeId: 9002,
        name: 'Bea Sample',
        entity: 'TECH',
        job: 'Backend developer',
        avatarUrl: 'https://cdn.example.test/p/9002.png',
        natureId: 14,
        am: true,
        pm: true,
      },
      {
        employeeId: 9003,
        name: 'Cyr Demo',
        entity: 'TECH',
        job: 'QA',
        avatarUrl: null,
        natureId: null,
        am: false,
        pm: true,
      },
    ]);
    expect(store.offOn('2026-10-13')).toEqual([]);
  });

  test('the store follows the cursor and fetches each month once', async () => {
    const { store, calls, cursor } = build();
    await store.load();
    cursor.value = '2026-12-24';
    await nextTick();
    expect(store.focusDate.value).toBe('2026-12-24');
    cursor.value = '2026-12-25';
    await nextTick();
    cursor.value = '2026-10-05';
    await nextTick();
    await store.load();
    expect(calls).toEqual(['2026-10-01..2026-10-31', '2026-12-01..2026-12-31']);
    expect(store.focusDate.value).toBe('2026-10-05');
    expect(store.focused.value).toEqual([]);
  });

  test('a failed month marks the status failed and can be loaded again', async () => {
    let attempt = 0;
    const { store } = build({
      getPlannerService: async () => {
        attempt++;
        if (attempt === 1) throw new Error('down');
        return plannerService;
      },
    });
    await store.load();
    expect(store.status.value).toBe('failed');
    await store.load();
    expect(store.status.value).toBe('ready');
    expect(store.offOn('2026-10-12')).toHaveLength(2);
  });

  test('natures appear when the periods load after the planner', async () => {
    const { store, periods } = build();
    periods.value = new Map();
    await store.load();
    expect(store.offOn('2026-10-12')[0]?.natureId).toBeNull();
    periods.value = new Map([[38, 14]]);
    expect(store.offOn('2026-10-12')[0]?.natureId).toBe(14);
  });
});
