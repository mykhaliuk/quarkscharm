import { describe, expect, test } from 'bun:test';
import {
  addDays,
  daysBetween,
  isYmd,
  monthDays,
  today,
  weekday,
  yearMonths,
} from '~~/shared/utils/ymd';

describe('isYmd', () => {
  test('accepts YYYY-MM-DD only', () => {
    expect(isYmd('2026-10-12')).toBe(true);
    expect(isYmd('2026-10-12T00:00:00Z')).toBe(false);
    expect(isYmd('12/10/2026')).toBe(false);
    expect(isYmd('2026-13-01')).toBe(false);
  });
});

describe('addDays', () => {
  test('crosses a year boundary', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2027-01-02', -3)).toBe('2026-12-30');
  });

  test('crosses the leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-28', 2)).toBe('2028-03-01');
  });
});

describe('daysBetween', () => {
  test('is the signed day count from a to b', () => {
    expect(daysBetween('2026-12-29', '2027-01-02')).toBe(4);
    expect(daysBetween('2027-01-02', '2026-12-29')).toBe(-4);
    expect(daysBetween('2026-10-12', '2026-10-12')).toBe(0);
  });
});

describe('weekday', () => {
  test('is 0 for Monday and 6 for Sunday', () => {
    expect(weekday('2026-10-12')).toBe(0);
    expect(weekday('2026-10-18')).toBe(6);
    expect(weekday('2026-11-01')).toBe(6);
  });
});

describe('monthDays', () => {
  test('lists 29 days for a leap February', () => {
    const days = monthDays(2028, 2);
    expect(days).toHaveLength(29);
    expect(days[0]).toBe('2028-02-01');
    expect(days[28]).toBe('2028-02-29');
  });

  test('lists 28 days for a common February', () => {
    expect(monthDays(2026, 2)).toHaveLength(28);
  });
});

describe('yearMonths', () => {
  test('returns 12 grids of 6 rows by 7 with null padding, Monday first', () => {
    const grids = yearMonths(2026);
    expect(grids).toHaveLength(12);
    for (const grid of grids) {
      expect(grid).toHaveLength(6);
      for (const row of grid) expect(row).toHaveLength(7);
    }
    const november = grids[10]!;
    expect(november[0]).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      '2026-11-01',
    ]);
    expect(november[1]![0]).toBe('2026-11-02');
  });

  test('pads a month that starts on Monday with no leading nulls', () => {
    const june = yearMonths(2026)[5]!;
    expect(june[0]![0]).toBe('2026-06-01');
    expect(june[5]).toEqual([null, null, null, null, null, null, null]);
  });
});

describe('today', () => {
  test('formats the current date in the given time zone', () => {
    const value = today('Europe/Paris');
    expect(isYmd(value)).toBe(true);
    const utc = new Date().toISOString().slice(0, 10);
    expect(Math.abs(daysBetween(utc, value))).toBeLessThanOrEqual(1);
  });
});
