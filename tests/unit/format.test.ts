import { describe, expect, test } from 'bun:test';
import { formatDayRange, formatTime } from '~/utils/format';

describe('formatTime', () => {
  test('formats a timestamp as HH:MM in the time zone', () => {
    expect(formatTime(Date.UTC(2026, 9, 12, 14, 42), 'Europe/Paris')).toBe(
      '16:42',
    );
    expect(formatTime(Date.UTC(2026, 9, 12, 14, 5), 'UTC')).toBe('14:05');
  });
});

describe('formatDayRange', () => {
  test('one day', () => {
    expect(formatDayRange('2026-10-22', '2026-10-22')).toBe('22 Oct 2026');
  });

  test('same month', () => {
    expect(formatDayRange('2026-10-22', '2026-10-23')).toBe('22–23 Oct 2026');
  });

  test('across months and years', () => {
    expect(formatDayRange('2026-10-30', '2026-11-02')).toBe(
      '30 Oct – 2 Nov 2026',
    );
    expect(formatDayRange('2026-12-29', '2027-01-02')).toBe(
      '29 Dec 2026 – 2 Jan 2027',
    );
  });
});
