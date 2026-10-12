import { describe, expect, test } from 'bun:test';
import { createWhosOff } from '~/utils/whos-off-store';
import plannerService from '../fixtures/qs/planner-service.json';

const build = (over: Partial<Parameters<typeof createWhosOff>[0]> = {}) => {
  const calls: string[] = [];
  const store = createWhosOff({
    getPlannerService: async (begin, end) => {
      calls.push(`${begin}..${end}`);
      return plannerService;
    },
    employeeId: () => 9001,
    today: () => '2026-10-12',
    ...over,
  });
  return { store, calls };
};

describe('whos-off store', () => {
  test('focusDate defaults to today and loads the focused month once', async () => {
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
        am: true,
        pm: true,
      },
      {
        employeeId: 9003,
        name: 'Cyr Demo',
        entity: 'TECH',
        job: 'QA',
        avatarUrl: null,
        am: false,
        pm: true,
      },
    ]);
    expect(store.offOn('2026-10-13')).toEqual([]);
  });

  test('a focus change to another month fetches that month once and keeps the first', async () => {
    const { store, calls } = build();
    await store.load();
    await store.focus('2026-12-24');
    await store.focus('2026-12-25');
    await store.focus('2026-10-05');
    expect(calls).toEqual(['2026-10-01..2026-10-31', '2026-12-01..2026-12-31']);
    expect(store.focusDate.value).toBe('2026-10-05');
  });

  test('today returns the focus to today', async () => {
    const { store } = build();
    await store.focus('2026-12-24');
    store.today();
    expect(store.focusDate.value).toBe('2026-10-12');
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
});
