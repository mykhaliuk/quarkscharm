import { describe, expect, test } from 'bun:test';
import { createCursor } from '~/utils/cursor-store';

const build = (start = '2026-10-12') => {
  const shown = { year: Number(start.slice(0, 4)) };
  const switches: number[] = [];
  const store = createCursor({
    today: () => start,
    shownYear: () => shown.year,
    showYear: (year) => {
      switches.push(year);
      shown.year = year;
    },
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

  test('a motion past the year edge switches the shown year', () => {
    const { store, switches } = build('2026-12-31');
    store.byDays(1);
    expect(store.cursor.value).toBe('2027-01-01');
    expect(switches).toEqual([2027]);
    store.byDays(-1);
    expect(switches).toEqual([2027, 2026]);
  });

  test('today returns to today and its year', () => {
    const { store, switches } = build();
    store.byMonths(4);
    store.today();
    expect(store.cursor.value).toBe('2026-10-12');
    expect(switches).toEqual([2027, 2026]);
  });

  test('a year switched elsewhere takes the cursor to the same day of that year', () => {
    const { store, switches } = build('2028-02-29');
    store.followYear(2029);
    expect(store.cursor.value).toBe('2029-02-28');
    store.followYear(2029);
    expect(store.cursor.value).toBe('2029-02-28');
    expect(switches).toEqual([]);
  });
});
