import { describe, expect, test } from 'bun:test';
import { createCursor } from '~/utils/cursor-store';
import { leaveYearOf } from '~~/shared/utils/ymd';

const yearOf = (ymd: string) => leaveYearOf(ymd, 6);

const build = (start = '2026-10-12') => {
  const shown = { year: yearOf(start) };
  const switches: number[] = [];
  const store = createCursor({
    today: () => start,
    shownYear: () => shown.year,
    showYear: (year) => {
      switches.push(year);
      shown.year = year;
    },
    yearOf,
  });
  return { store, switches };
};

describe('cursor store', () => {
  test('starts on today and moves by days and months', () => {
    const { store, switches } = build();
    expect(store.cursor.value).toBe('2026-10-12');
    store.byDays(7);
    expect(store.cursor.value).toBe('2026-10-19');
    store.byMonths(-4);
    expect(store.cursor.value).toBe('2026-06-19');
    store.moveTo('2026-11-05');
    expect(store.cursor.value).toBe('2026-11-05');
    expect(switches).toEqual([]);
  });

  test('a motion past 31 May switches to the next leave year', () => {
    const { store, switches } = build('2027-05-31');
    store.byDays(1);
    expect(store.cursor.value).toBe('2027-06-01');
    expect(switches).toEqual([2027]);
    store.byDays(-1);
    expect(store.cursor.value).toBe('2027-05-31');
    expect(switches).toEqual([2027, 2026]);
  });

  test('31 December to 1 January stays in the leave year', () => {
    const { store, switches } = build('2026-12-31');
    store.byDays(1);
    expect(store.cursor.value).toBe('2027-01-01');
    expect(switches).toEqual([]);
  });

  test('today returns to today and its year', () => {
    const { store, switches } = build();
    store.byMonths(8);
    store.today();
    expect(store.cursor.value).toBe('2026-10-12');
    expect(switches).toEqual([2027, 2026]);
  });

  test('a year switched elsewhere takes the cursor to the same day of that year', () => {
    const { store, switches } = build('2028-02-29');
    store.followYear(2028);
    expect(store.cursor.value).toBe('2029-02-28');
    store.followYear(2028);
    expect(store.cursor.value).toBe('2029-02-28');
    expect(switches).toEqual([]);
  });
});
