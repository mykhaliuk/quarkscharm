import { describe, expect, test } from 'bun:test';
import {
  createYearStore,
  pickStartMonth,
  type YearDeps,
} from '~/utils/year-store';
import { QsError } from '~/utils/qs/error';
import requests from '../fixtures/qs/requests.json';
import plannerMe from '../fixtures/qs/planner-me.json';
import holidays from '../fixtures/qs/holidays.json';
import natures from '../fixtures/qs/natures.json';
import periods from '../fixtures/qs/periods.json';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
};
const deferred = <T>(): Deferred<T> => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const deps = (over: Partial<YearDeps> = {}): YearDeps => ({
  getRequests: async () => requests,
  getPlannerMe: async () => plannerMe,
  getHolidays: async () => holidays,
  employeeId: () => 9001,
  startMonth: () => 6,
  ...over,
});

describe('load', () => {
  test('fills requests, non-working dates and holidays', async () => {
    const calls: string[] = [];
    const store = createYearStore(
      deps({
        getRequests: async (_e, b, e) => {
          calls.push(`requests ${b} ${e}`);
          return requests;
        },
        getPlannerMe: async (b, e) => {
          calls.push(`planner ${b} ${e}`);
          return plannerMe;
        },
        getHolidays: async (b, e, c) => {
          calls.push(`holidays ${b} ${e} ${c}`);
          return holidays;
        },
      }),
    );
    await store.load(2026);
    expect(calls).toEqual([
      'requests 2026-06-01 2027-05-31',
      'planner 2026-06-01 2026-11-30',
      'planner 2026-12-01 2027-05-31',
      'holidays 2026-06-01 2027-05-31 FR',
    ]);
    expect(store.state.year).toBe(2026);
    expect(store.state.requests.map((r) => r.id)).toEqual([155, 160, 170]);
    expect(store.state.nonWorkingDates.has('2026-10-03')).toBe(true);
    expect(store.state.holidays.get('2026-11-11')).toBe('Armistice 1918');
    expect(store.state.status).toEqual({
      requests: 'ready',
      planner: 'ready',
      holidays: 'ready',
    });
  });

  test('a failing part leaves the others rendered', async () => {
    const store = createYearStore(
      deps({
        getHolidays: async () => {
          throw new QsError('unavailable');
        },
      }),
    );
    await store.load(2026);
    expect(store.state.status.holidays).toBe('failed');
    expect(store.state.status.requests).toBe('ready');
    expect(store.state.requests).toHaveLength(3);
    expect(store.state.holidays.size).toBe(0);
  });

  test('retry reloads one part only', async () => {
    let holidayCalls = 0;
    let requestCalls = 0;
    const store = createYearStore(
      deps({
        getRequests: async () => {
          requestCalls++;
          return requests;
        },
        getHolidays: async () => {
          holidayCalls++;
          if (holidayCalls === 1) throw new QsError('unavailable');
          return holidays;
        },
      }),
    );
    await store.load(2026);
    await store.retry('holidays');
    expect(store.state.status.holidays).toBe('ready');
    expect(holidayCalls).toBe(2);
    expect(requestCalls).toBe(1);
  });

  test('answers for a year that is no longer current are discarded', async () => {
    const slow = deferred<typeof requests>();
    let call = 0;
    const store = createYearStore(
      deps({
        getRequests: () => {
          call++;
          return call === 1
            ? slow.promise
            : Promise.resolve({ '@odata.count': 0, value: [] });
        },
      }),
    );
    const first = store.load(2026);
    await store.load(2027);
    slow.resolve(requests);
    await first;
    expect(store.state.year).toBe(2027);
    expect(store.state.requests).toEqual([]);
    expect(store.state.status.requests).toBe('ready');
  });

  test('a planner answer without nonWorkingDates or with no absences yields empty sets', async () => {
    const store = createYearStore(
      deps({
        getPlannerMe: async () => ({
          id: 9001,
          firstName: 'A',
          lastName: 'B',
          absences: [],
        }),
      }),
    );
    await store.load(2026);
    expect(store.state.nonWorkingDates.size).toBe(0);
    expect(store.state.status.planner).toBe('ready');
  });

  test('slots and selectable follow the loaded data', async () => {
    const store = createYearStore(deps());
    await store.load(2026);
    expect(store.slots.value.get('2026-10-22')?.am).toEqual({
      natureId: 75,
      requestId: 155,
    });
    expect(store.slots.value.get('2026-10-14')?.pm).toEqual({
      natureId: 14,
      requestId: 160,
    });
    expect(store.isSelectable('2026-10-12')).toBe(true);
    expect(store.isSelectable('2026-10-17')).toBe(false);
    expect(store.isSelectable('2026-11-11')).toBe(false);
    expect(store.isSelectable('2026-10-03')).toBe(false);
  });

  test('a January start asks the calendar year', async () => {
    const calls: string[] = [];
    const store = createYearStore(
      deps({
        startMonth: () => 1,
        getRequests: async (_e, b, e) => {
          calls.push(`requests ${b} ${e}`);
          return requests;
        },
      }),
    );
    await store.load(2026);
    expect(calls).toEqual(['requests 2026-01-01 2026-12-31']);
  });

  test('keeps school holidays per area, both dates included', async () => {
    const store = createYearStore(deps());
    await store.load(2026);
    expect([...store.state.schoolTerms.keys()]).toEqual([
      'Zone A',
      'Zone B',
      'Zone C',
    ]);
    const zoneB = store.state.schoolTerms.get('Zone B')!;
    expect(zoneB.get('2027-02-20')).toBe("Vacances d'Hiver");
    expect(zoneB.get('2027-03-07')).toBe("Vacances d'Hiver");
    expect(zoneB.has('2027-03-08')).toBe(false);
    expect(zoneB.get('2026-12-19')).toBe('Vacances de Noël');
  });

  test('clips a school holiday to the leave year', async () => {
    const store = createYearStore(
      deps({
        getHolidays: async () => ({
          public: [],
          schoolTerm: [
            {
              area: 'Zone B',
              holidays: [
                {
                  beginDate: '2026-05-23T00:00:00.000Z',
                  endDate: '2026-06-02T00:00:00.000Z',
                  label: 'Pont',
                },
              ],
            },
          ],
        }),
      }),
    );
    await store.load(2026);
    const days = [...store.state.schoolTerms.get('Zone B')!.keys()];
    expect(days).toEqual(['2026-06-01', '2026-06-02']);
  });

  test('a school holiday weekday stays selectable', async () => {
    const store = createYearStore(deps());
    await store.load(2026);
    expect(store.state.schoolTerms.get('Zone B')!.has('2027-02-22')).toBe(true);
    expect(store.isSelectable('2027-02-22')).toBe(true);
  });
});

describe('pickStartMonth', () => {
  test('takes the month of the CP period that holds today', () => {
    expect(pickStartMonth(natures.items, periods.items, '2026-10-16')).toBe(6);
  });

  test('ignores the periods of other natures', () => {
    const others = periods.items.filter((p) => p.natureId !== 14);
    expect(pickStartMonth(natures.items, others, '2026-10-16')).toBe(6);
    const may = others.map((p) => ({
      ...p,
      dateBegin: '2026-05-01T00:00:00Z',
      dateEnd: '2027-04-30T00:00:00Z',
    }));
    expect(pickStartMonth(natures.items, may, '2026-10-16')).toBe(6);
  });

  test('follows a CP period that starts in another month', () => {
    const may = periods.items.map((p) =>
      p.natureId === 14
        ? {
            ...p,
            dateBegin: '2026-05-01T00:00:00Z',
            dateEnd: '2027-04-30T00:00:00Z',
          }
        : p,
    );
    expect(pickStartMonth(natures.items, may, '2026-10-16')).toBe(5);
  });

  test('falls back to June without a CP period for today', () => {
    expect(pickStartMonth(natures.items, periods.items, '2028-01-10')).toBe(6);
    expect(pickStartMonth([], periods.items, '2026-10-16')).toBe(6);
  });
});
