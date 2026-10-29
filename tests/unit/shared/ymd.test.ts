import { describe, expect, test } from 'bun:test';
import {
  addDays,
  daysBetween,
  isoWeek,
  isYmd,
  leaveYearMonths,
  leaveYearOf,
  leaveYearWindow,
  monthDays,
  monthGrid,
  moveMonth,
  today,
  weekday,
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

describe('isoWeek', () => {
  test('numbers weeks by the Thursday rule', () => {
    expect(isoWeek('2026-10-12')).toBe(42);
    expect(isoWeek('2026-10-18')).toBe(42);
    expect(isoWeek('2026-01-01')).toBe(1);
    expect(isoWeek('2025-12-29')).toBe(1);
    expect(isoWeek('2026-12-31')).toBe(53);
    expect(isoWeek('2027-01-01')).toBe(53);
    expect(isoWeek('2027-01-04')).toBe(1);
    expect(isoWeek('2021-01-03')).toBe(53);
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

describe('monthGrid', () => {
  test('returns 6 rows by 7 with null padding, Monday first', () => {
    const november = monthGrid(2026, 11);
    expect(november).toHaveLength(6);
    for (const row of november) expect(row).toHaveLength(7);
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
    const june = monthGrid(2026, 6);
    expect(june[0]![0]).toBe('2026-06-01');
    expect(june[5]).toEqual([null, null, null, null, null, null, null]);
  });
});

describe('leave year', () => {
  test('a June start puts June to May in one year', () => {
    expect(leaveYearOf('2026-10-16', 6)).toBe(2026);
    expect(leaveYearOf('2027-03-10', 6)).toBe(2026);
    expect(leaveYearOf('2027-05-31', 6)).toBe(2026);
    expect(leaveYearOf('2027-06-01', 6)).toBe(2027);
    expect(leaveYearWindow(2026, 6)).toEqual({
      from: '2026-06-01',
      to: '2027-05-31',
    });
  });

  test('a January start is the calendar year', () => {
    expect(leaveYearOf('2026-01-01', 1)).toBe(2026);
    expect(leaveYearOf('2026-12-31', 1)).toBe(2026);
    expect(leaveYearWindow(2026, 1)).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });

  test('lists the twelve months from the start month', () => {
    const months = leaveYearMonths(2026, 6);
    expect(months).toHaveLength(12);
    expect(months.map((m) => `${m.year}-${m.month}`)).toEqual([
      '2026-6',
      '2026-7',
      '2026-8',
      '2026-9',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-1',
      '2027-2',
      '2027-3',
      '2027-4',
      '2027-5',
    ]);
    expect(months[0]!.grid[0]![0]).toBe('2026-06-01');
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

describe('moveMonth', () => {
  test('keeps the day or clamps it to the last day of a shorter month', () => {
    expect(moveMonth('2026-01-31', 1)).toBe('2026-02-28');
    expect(moveMonth('2028-01-31', 1)).toBe('2028-02-29');
    expect(moveMonth('2026-03-31', -1)).toBe('2026-02-28');
    expect(moveMonth('2026-03-10', 4)).toBe('2026-07-10');
  });

  test('crosses the year in both directions', () => {
    expect(moveMonth('2026-11-15', 4)).toBe('2027-03-15');
    expect(moveMonth('2026-02-15', -4)).toBe('2025-10-15');
    expect(moveMonth('2026-12-31', 1)).toBe('2027-01-31');
  });
});
