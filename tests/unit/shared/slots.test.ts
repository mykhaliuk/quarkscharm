import { describe, expect, test } from 'bun:test';
import { segmentsToSlots, slotsToRuns, type Slot } from '~~/shared/utils/slots';

const paint = (natureId: number) => ({ natureId, requestId: null });
const full = (natureId: number): Slot => ({
  am: paint(natureId),
  pm: paint(natureId),
});

describe('segmentsToSlots', () => {
  test('maps request segments to half-day slots keyed by date', () => {
    const slots = segmentsToSlots([
      {
        id: 155,
        segments: [
          {
            natureId: 75,
            beginDate: '2026-10-22T00:00:00+02:00',
            endDate: '2026-10-23T23:00:00+02:00',
          },
        ],
      },
      {
        id: 160,
        segments: [
          {
            natureId: 14,
            beginDate: '2026-10-14T13:00:00+02:00',
            endDate: '2026-10-14T23:00:00+02:00',
          },
        ],
      },
    ]);
    expect(slots.size).toBe(3);
    expect(slots.get('2026-10-22')).toEqual({
      am: { natureId: 75, requestId: 155 },
      pm: { natureId: 75, requestId: 155 },
    });
    expect(slots.get('2026-10-14')).toEqual({
      am: null,
      pm: { natureId: 14, requestId: 160 },
    });
  });

  test('keeps a null nature for a colleague segment', () => {
    const slots = segmentsToSlots([
      {
        id: 7,
        segments: [
          {
            natureId: null,
            beginDate: '2026-10-12T00:00:00.000Z',
            endDate: '2026-10-12T12:00:00.000Z',
          },
        ],
      },
    ]);
    expect(slots.get('2026-10-12')).toEqual({
      am: { natureId: null, requestId: 7 },
      pm: null,
    });
  });
});

const selectable = () => true;
const skipWeekend = (ymd: string) =>
  !['2026-10-17', '2026-10-18'].includes(ymd);

describe('slotsToRuns', () => {
  test('one five-day run', () => {
    const selection = new Map<string, Slot>();
    for (const day of ['12', '13', '14', '15', '16']) {
      selection.set(`2026-10-${day}`, full(75));
    }
    const runs = slotsToRuns(selection, selectable);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      natureId: 75,
      beginDate: '2026-10-12',
      beginHour: 0,
      endDate: '2026-10-16',
      endHour: 23,
    });
    expect(runs[0]!.days).toHaveLength(5);
  });

  test('two runs split by a different nature', () => {
    const selection = new Map<string, Slot>([
      ['2026-10-12', full(75)],
      ['2026-10-13', full(75)],
      ['2026-10-14', full(14)],
    ]);
    const runs = slotsToRuns(selection, selectable);
    expect(
      runs.map((run) => [run.natureId, run.beginDate, run.endDate]),
    ).toEqual([
      [75, '2026-10-12', '2026-10-13'],
      [14, '2026-10-14', '2026-10-14'],
    ]);
  });

  test('a run that is a single pm half', () => {
    const selection = new Map<string, Slot>([
      ['2026-10-14', { am: null, pm: paint(14) }],
    ]);
    expect(slotsToRuns(selection, selectable)).toEqual([
      {
        natureId: 14,
        beginDate: '2026-10-14',
        beginHour: 13,
        endDate: '2026-10-14',
        endHour: 23,
        days: [{ date: '2026-10-14', am: false, pm: true }],
      },
    ]);
  });

  test('a middle day with only am ends the run and starts nothing', () => {
    const selection = new Map<string, Slot>([
      ['2026-10-12', full(75)],
      ['2026-10-13', { am: paint(75), pm: null }],
      ['2026-10-14', full(75)],
    ]);
    const runs = slotsToRuns(selection, selectable);
    expect(
      runs.map((run) => [
        run.beginDate,
        run.beginHour,
        run.endDate,
        run.endHour,
      ]),
    ).toEqual([
      ['2026-10-12', 0, '2026-10-13', 12],
      ['2026-10-14', 0, '2026-10-14', 23],
    ]);
  });

  test('a run continues across non-selectable days', () => {
    const selection = new Map<string, Slot>([
      ['2026-10-16', full(75)],
      ['2026-10-19', full(75)],
    ]);
    const isSelectable = (ymd: string) =>
      !['2026-10-17', '2026-10-18'].includes(ymd);
    const runs = slotsToRuns(selection, isSelectable);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      beginDate: '2026-10-16',
      endDate: '2026-10-19',
    });
    expect(runs[0]!.days.map((d) => d.date)).toEqual([
      '2026-10-16',
      '2026-10-19',
    ]);
  });

  test('ignores halves that belong to an existing request', () => {
    const selection = new Map<string, Slot>([
      [
        '2026-10-12',
        {
          am: { natureId: 75, requestId: 155 },
          pm: { natureId: 75, requestId: 155 },
        },
      ],
    ]);
    expect(slotsToRuns(selection, selectable)).toEqual([]);
  });
});
