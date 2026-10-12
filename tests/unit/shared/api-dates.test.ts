import { describe, expect, test } from 'bun:test';
import {
  fromApiDate,
  segmentHalves,
  toApiDate,
} from '~~/shared/utils/api-dates';

describe('fromApiDate', () => {
  test('reads the date and the hour from a .000Z value', () => {
    expect(fromApiDate('2026-10-12T13:00:00.000Z')).toEqual({
      date: '2026-10-12',
      hour: 13,
    });
  });

  test('reads the date and the hour from a +02:00 value', () => {
    expect(fromApiDate('2026-10-12T23:00:00+02:00')).toEqual({
      date: '2026-10-12',
      hour: 23,
    });
  });
});

describe('toApiDate', () => {
  test('writes the wall-clock marker with a Z suffix', () => {
    expect(toApiDate('2026-10-22', 0)).toBe('2026-10-22T00:00:00Z');
    expect(toApiDate('2026-10-23', 23)).toBe('2026-10-23T23:00:00Z');
    expect(toApiDate('2026-10-14', 13)).toBe('2026-10-14T13:00:00Z');
  });
});

describe('segmentHalves', () => {
  test('a full day fills both halves', () => {
    const halves = segmentHalves({
      beginDate: '2026-10-12T00:00:00.000Z',
      endDate: '2026-10-12T23:00:00.000Z',
    });
    expect(halves).toEqual([{ date: '2026-10-12', am: true, pm: true }]);
  });

  test('a morning fills am only, an afternoon pm only', () => {
    expect(
      segmentHalves({
        beginDate: '2026-10-12T00:00:00+02:00',
        endDate: '2026-10-12T12:00:00+02:00',
      }),
    ).toEqual([{ date: '2026-10-12', am: true, pm: false }]);
    expect(
      segmentHalves({
        beginDate: '2026-10-12T13:00:00+02:00',
        endDate: '2026-10-12T23:00:00+02:00',
      }),
    ).toEqual([{ date: '2026-10-12', am: false, pm: true }]);
  });

  test('a run over New Year starting pm and ending am yields 5 entries', () => {
    const halves = segmentHalves({
      beginDate: '2026-12-29T13:00:00+01:00',
      endDate: '2027-01-02T12:00:00+01:00',
    });
    expect(halves).toHaveLength(5);
    expect(halves[0]).toEqual({ date: '2026-12-29', am: false, pm: true });
    expect(halves[1]).toEqual({ date: '2026-12-30', am: true, pm: true });
    expect(halves[3]).toEqual({ date: '2027-01-01', am: true, pm: true });
    expect(halves[4]).toEqual({ date: '2027-01-02', am: true, pm: false });
  });
});
