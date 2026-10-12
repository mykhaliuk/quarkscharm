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

describe('removeRun', () => {
  test('drops the days of one run and keeps the others', () => {
    const s = build();
    s.setBrush(75);
    s.paintRange('2026-10-12', '2026-10-13');
    s.setBrush(14);
    s.paintHalf('2026-10-15', 'pm');
    const first = s.runs.value[0]!;
    s.removeRun(first);
    expect([...s.paint.keys()]).toEqual(['2026-10-15']);
    expect(s.runs.value.map((run) => run.key)).toEqual(['14:2026-10-15:13']);
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

describe('days of existing requests', () => {
  const TAKEN: Record<string, { am: number | null; pm: number | null }> = {
    '2026-10-13': { am: 155, pm: 155 },
    '2026-10-14': { am: null, pm: 160 },
  };
  const buildTaken = () =>
    createSelection({
      isSelectable: (ymd) => !WEEKEND.has(ymd),
      occupant: (ymd, half) => TAKEN[ymd]?.[half] ?? null,
    });

  test('a click on a taken day paints nothing', () => {
    const selection = buildTaken();
    selection.setBrush(75);
    expect(selection.paintDay('2026-10-13')).toBe('not-selectable');
    expect(selection.paint.size).toBe(0);
  });

  test('a click on a half-taken day paints only the free half', () => {
    const selection = buildTaken();
    selection.setBrush(75);
    selection.paintDay('2026-10-14');
    expect(selection.paint.get('2026-10-14')).toEqual({
      am: { natureId: 75, requestId: null },
      pm: null,
    });
  });

  test('a drag skips the taken days', () => {
    const selection = buildTaken();
    selection.setBrush(75);
    selection.paintRange('2026-10-12', '2026-10-15');
    expect(Array.from(selection.paint.keys())).toEqual([
      '2026-10-12',
      '2026-10-14',
      '2026-10-15',
    ]);
    expect(selection.paint.get('2026-10-14')?.pm).toBeNull();
  });

  test('in change mode the days of the edited request stay paintable', () => {
    const selection = buildTaken();
    selection.loadRequest({
      id: 155,
      natureId: 75,
      beginDate: '2026-10-13',
      beginHour: 0,
      endDate: '2026-10-13',
      endHour: 23,
    });
    selection.paintDay('2026-10-13');
    expect(selection.paint.has('2026-10-13')).toBe(false);
    selection.paintRange('2026-10-13', '2026-10-14');
    expect(selection.paint.get('2026-10-13')?.am?.natureId).toBe(75);
    expect(selection.paint.get('2026-10-14')?.pm).toBeNull();
  });
});

describe('undo', () => {
  const EDIT = {
    id: 155,
    natureId: 75,
    beginDate: '2026-10-22',
    beginHour: 0,
    endDate: '2026-10-23',
    endHour: 23,
  };

  test('undo takes back a paint', () => {
    const s = build();
    s.setBrush(75);
    s.paintDay('2026-11-02');
    s.undo();
    expect(s.paint.size).toBe(0);
    expect(s.runs.value).toEqual([]);
  });

  test('a range paint, as at the end of a drag, is one step', () => {
    const s = build();
    s.setBrush(75);
    s.paintDay('2026-10-12');
    s.paintRange('2026-10-13', '2026-10-16');
    expect(s.paint.size).toBe(5);
    s.undo();
    expect([...s.paint.keys()]).toEqual(['2026-10-12']);
  });

  test('a removal of a run and a clear can be undone', () => {
    const s = build();
    s.setBrush(75);
    s.paintRange('2026-10-12', '2026-10-13');
    s.removeRun(s.runs.value[0]!);
    s.undo();
    expect(s.paint.size).toBe(2);
    s.clear();
    s.undo();
    expect(s.paint.size).toBe(2);
  });

  test('a paint refused for no brush or a weekend is not a step', () => {
    const s = build();
    s.paintDay('2026-10-12');
    s.setBrush(75);
    s.paintDay('2026-10-12');
    s.paintDay('2026-10-17');
    s.undo();
    expect(s.paint.size).toBe(0);
  });

  test('the history keeps the last 10 actions', () => {
    const s = build();
    s.setBrush(75);
    const days = [12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 26, 27];
    for (const day of days) s.paintDay(`2026-10-${day}`);
    for (let i = 0; i < 12; i++) s.undo();
    expect([...s.paint.keys()]).toEqual(['2026-10-12', '2026-10-13']);
  });

  test('reset, as on a year change, empties the history', () => {
    const s = build();
    s.setBrush(75);
    s.paintDay('2026-10-12');
    s.reset();
    s.undo();
    expect(s.paint.size).toBe(0);
  });

  test('loading a request and leaving change mode empty the history', () => {
    const s = build();
    s.setBrush(75);
    s.paintDay('2026-11-02');
    s.loadRequest(EDIT);
    s.undo();
    expect(s.editing.value).toBe(155);
    expect(s.paint.size).toBe(2);
    s.paintDay('2026-10-23');
    s.clear();
    s.undo();
    expect(s.editing.value).toBeNull();
    expect(s.paint.size).toBe(0);
  });

  test('undo in change mode restores the request days', () => {
    const s = build();
    s.loadRequest(EDIT);
    s.paintDay('2026-10-23');
    expect(s.paint.has('2026-10-23')).toBe(false);
    s.undo();
    expect(s.paint.has('2026-10-23')).toBe(true);
    expect(s.editing.value).toBe(155);
  });
});

describe('redo', () => {
  test('redo puts back what undo took, a new paint drops the redo steps', () => {
    const s = build();
    s.setBrush(75);
    s.paintDay('2026-10-12');
    s.paintDay('2026-10-13');
    s.undo();
    s.undo();
    s.redo();
    expect([...s.paint.keys()]).toEqual(['2026-10-12']);
    s.redo();
    expect([...s.paint.keys()]).toEqual(['2026-10-12', '2026-10-13']);
    s.undo();
    s.paintDay('2026-10-14');
    s.redo();
    expect([...s.paint.keys()]).toEqual(['2026-10-12', '2026-10-14']);
  });

  test('reset empties the redo steps too', () => {
    const s = build();
    s.setBrush(75);
    s.paintDay('2026-10-12');
    s.undo();
    s.reset();
    s.redo();
    expect(s.paint.size).toBe(0);
  });
});
