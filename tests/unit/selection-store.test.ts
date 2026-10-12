import { describe, expect, test } from 'bun:test';
import { createSelection } from '~/utils/selection-store';

const WEEKEND = new Set(['2026-10-17', '2026-10-18']);
const build = () =>
  createSelection({ isSelectable: (ymd) => !WEEKEND.has(ymd) });

describe('painting', () => {
  test('paintDay with a brush paints both halves', () => {
    const s = build();
    s.setBrush(75);
    s.paintDay('2026-10-12');
    expect(s.paint.get('2026-10-12')).toEqual({
      am: { natureId: 75, requestId: null },
      pm: { natureId: 75, requestId: null },
    });
  });

  test('paintDay without a brush paints nothing and asks for one', () => {
    const s = build();
    const result = s.paintDay('2026-10-12');
    expect(result).toBe('no-brush');
    expect(s.paint.size).toBe(0);
  });

  test('a non-selectable day is ignored', () => {
    const s = build();
    s.setBrush(75);
    s.paintDay('2026-10-17');
    expect(s.paint.size).toBe(0);
  });

  test('paintHalf paints one half only', () => {
    const s = build();
    s.setBrush(14);
    s.paintHalf('2026-10-14', 'pm');
    expect(s.paint.get('2026-10-14')).toEqual({
      am: null,
      pm: { natureId: 14, requestId: null },
    });
  });

  test('the same brush on a painted day unpaints it', () => {
    const s = build();
    s.setBrush(75);
    s.paintDay('2026-10-12');
    s.paintDay('2026-10-12');
    expect(s.paint.has('2026-10-12')).toBe(false);
  });

  test('the same brush on a painted half unpaints that half', () => {
    const s = build();
    s.setBrush(75);
    s.paintDay('2026-10-12');
    s.paintHalf('2026-10-12', 'am');
    expect(s.paint.get('2026-10-12')).toEqual({
      am: null,
      pm: { natureId: 75, requestId: null },
    });
  });

  test('another brush replaces the nature', () => {
    const s = build();
    s.setBrush(75);
    s.paintDay('2026-10-12');
    s.setBrush(14);
    s.paintDay('2026-10-12');
    expect(s.paint.get('2026-10-12')?.am).toEqual({
      natureId: 14,
      requestId: null,
    });
  });

  test('paintRange paints every selectable day crossed and skips the weekend', () => {
    const s = build();
    s.setBrush(75);
    s.paintRange('2026-10-16', '2026-10-20');
    expect([...s.paint.keys()].toSorted()).toEqual([
      '2026-10-16',
      '2026-10-19',
      '2026-10-20',
    ]);
  });

  test('paintRange works backwards too', () => {
    const s = build();
    s.setBrush(75);
    s.paintRange('2026-10-14', '2026-10-12');
    expect([...s.paint.keys()].toSorted()).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
    ]);
  });

  test('clear drops everything', () => {
    const s = build();
    s.setBrush(75);
    s.paintRange('2026-10-12', '2026-10-14');
    s.clear();
    expect(s.paint.size).toBe(0);
    expect(s.runs.value).toEqual([]);
  });
});

describe('runs', () => {
  test('runs follow slotsToRuns and carry a stable key', () => {
    const s = build();
    s.setBrush(75);
    s.paintRange('2026-10-12', '2026-10-16');
    s.setBrush(14);
    s.paintHalf('2026-10-19', 'pm');
    expect(s.runs.value.map((run) => run.key)).toEqual([
      '75:2026-10-12:0',
      '14:2026-10-19:13',
    ]);
    expect(s.runs.value[0]!.days).toHaveLength(5);
  });
});

describe('edit mode', () => {
  test('loadRequest paints the request as one run with its id', () => {
    const s = build();
    s.loadRequest({
      id: 155,
      natureId: 75,
      beginDate: '2026-10-22',
      beginHour: 0,
      endDate: '2026-10-23',
      endHour: 23,
    });
    expect(s.editing.value).toBe(155);
    expect(s.brush.value).toBe(75);
    expect(s.runs.value).toHaveLength(1);
    expect(s.runs.value[0]).toMatchObject({
      beginDate: '2026-10-22',
      endDate: '2026-10-23',
    });
    s.clear();
    expect(s.editing.value).toBeNull();
  });
});
