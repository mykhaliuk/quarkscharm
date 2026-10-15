import { describe, expect, test } from 'bun:test';
import { nextTick, ref } from 'vue';
import { createWhosOff } from '~/utils/whos-off-store';
import favoritesFixture from '../fixtures/qs/favorites.json';
import periodsFixture from '../fixtures/qs/periods.json';
import plannerService from '../fixtures/qs/planner-service.json';
import type { RawPlannerService } from '~/utils/qs/types';

const build = (over: Partial<Parameters<typeof createWhosOff>[0]> = {}) => {
  const calls: string[] = [];
  const cursor = ref('2026-10-12');
  const remote = ref<number | null>(75);
  const logs: unknown[] = [];
  const store = createWhosOff({
    getPlannerService: async (begin, end) => {
      calls.push(`${begin}..${end}`);
      return plannerService;
    },
    employeeId: () => 9001,
    focusDate: () => cursor.value,
    getPeriods: async () => periodsFixture.items,
    getFavorites: async () => favoritesFixture,
    remoteNatureId: () => remote.value,
    log: (...args) => logs.push(args),
    ...over,
  });
  return { store, calls, cursor, remote, logs };
};

describe('whos-off store', () => {
  test('focusDate is the cursor day and loads the focused month once', async () => {
    const { store, calls } = build();
    expect(store.focusDate.value).toBe('2026-10-12');
    await store.load();
    await store.load();
    expect(calls).toEqual(['2026-10-01..2026-10-31']);
  });

  test('offOn lists the favorites of all services with am/pm marks', async () => {
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
        isRemote: false,
        am: true,
        pm: true,
      },
      {
        employeeId: 9003,
        name: 'Cyr Demo',
        entity: 'TECH',
        job: 'QA',
        avatarUrl: null,
        natureId: 75,
        isRemote: true,
        am: false,
        pm: true,
      },
      {
        employeeId: 9005,
        name: 'Eve Product',
        entity: 'PRODUIT',
        job: 'Product owner',
        avatarUrl: null,
        natureId: 17,
        isRemote: false,
        am: true,
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
    expect(store.offOn('2026-10-12')).toHaveLength(3);
  });

  test('remote and away split the focused day', async () => {
    const { store } = build();
    await store.load();
    expect(store.remote.value.map((e) => e.name)).toEqual(['Cyr Demo']);
    expect(store.away.value.map((e) => e.name)).toEqual([
      'Bea Sample',
      'Eve Product',
    ]);
  });

  test('a long absence without a period is away with no nature', async () => {
    const { store } = build({
      getPlannerService: async () => withSegment({ duration: 10 }),
      getFavorites: async () => [{ id: 9004, pinned: true }],
    });
    await store.load();
    expect(store.offOn('2026-10-12')).toMatchObject([
      { natureId: null, isRemote: false },
    ]);
  });

  test('a period missing from the metadata gives no nature', async () => {
    const { store } = build({
      getPlannerService: async () => withSegment({ periodId: 99 }),
      getFavorites: async () => [{ id: 9004, pinned: true }],
    });
    await store.load();
    expect(store.offOn('2026-10-12')).toMatchObject([
      { natureId: null, isRemote: false },
    ]);
  });

  test('remote shows up once the natures give the remote nature', async () => {
    const { store, remote } = build();
    remote.value = null;
    await store.load();
    expect(store.remote.value).toEqual([]);
    remote.value = 75;
    expect(store.remote.value.map((e) => e.name)).toEqual(['Cyr Demo']);
  });

  test('a colleague who is not a favorite is not listed', async () => {
    const { store } = build();
    await store.load();
    const names = store.offOn('2026-10-12').map((e) => e.name);
    expect(names).not.toContain('Finn Other');
  });

  test('without favorites the store says so and lists nobody', async () => {
    const { store } = build({ getFavorites: async () => [] });
    await store.load();
    expect(store.hasFavorites.value).toBe(false);
    expect(store.focused.value).toEqual([]);
  });

  test('failed favorites fail the column and load again', async () => {
    let attempt = 0;
    const { store, logs } = build({
      getFavorites: async () => {
        attempt++;
        if (attempt === 1) throw new Error('down');
        return favoritesFixture;
      },
    });
    await store.load();
    expect(store.status.value).toBe('failed');
    expect(logs).toHaveLength(1);
    await store.load();
    expect(store.status.value).toBe('ready');
    expect(store.hasFavorites.value).toBe(true);
  });

  test('failed periods are logged and loaded again on the next load', async () => {
    let attempt = 0;
    const { store, logs } = build({
      getPeriods: async () => {
        attempt++;
        if (attempt === 1) throw new Error('down');
        return periodsFixture.items;
      },
    });
    await store.load();
    expect(logs).toHaveLength(1);
    expect(store.offOn('2026-10-12')[0]?.natureId).toBeNull();
    await store.load();
    expect(store.offOn('2026-10-12')[0]?.natureId).toBe(14);
  });
});

function withSegment(over: {
  duration?: number;
  periodId?: number;
}): RawPlannerService[] {
  return [
    {
      id: 42,
      label: 'TECH',
      employees: [
        { id: 9001, firstName: 'Alex', lastName: 'Example', absences: [] },
        {
          id: 9004,
          firstName: 'Dan',
          lastName: 'Long',
          absences: [
            {
              id: 7003,
              segments: [
                {
                  beginDate: '2026-10-05T00:00:00.000Z',
                  endDate: '2026-10-16T23:00:00.000Z',
                  duration: over.duration ?? 1,
                  periodId: over.periodId ?? null,
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}
