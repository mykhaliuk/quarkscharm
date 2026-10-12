import { describe, expect, test } from 'bun:test';
import {
  buildBody,
  createSubmit,
  ONE_RANGE_MESSAGE,
} from '~/utils/submit-store';
import { QsError } from '~/utils/qs/error';
import type { KeyedRun } from '~/utils/selection-store';
import type { Preview } from '~/utils/qs/map';
import created from '../fixtures/qs/create.json';

const run = (
  key: string,
  beginDate: string,
  endDate: string,
  natureId = 17,
): KeyedRun => ({
  key,
  natureId,
  beginDate,
  beginHour: 0,
  endDate,
  endHour: 23,
  days: [],
});

const preview = (
  natureId: number,
  durations: number[],
  entitlementId: number | null,
): Preview => ({
  segments: durations.map((duration, i) => ({
    beginDate: `2026-11-0${i + 2}`,
    endDate: `2026-11-0${i + 2}`,
    duration,
    natureId,
    entitlementId,
  })),
  natures: [{ id: natureId, balance: 6, entitlementId }],
  warnings: [],
  conflicts: [],
  overlaps: [],
});

describe('buildBody', () => {
  test('sums the previewed durations and takes the entitlement of the nature', () => {
    const body = buildBody(
      run('k', '2026-11-02', '2026-11-04'),
      preview(17, [1, 1, 1], 656),
      9001,
    );
    expect(body).toEqual({
      duration: 3,
      beginDate: '2026-11-02T00:00:00Z',
      endDate: '2026-11-04T23:00:00Z',
      employeeId: 9001,
      segments: [
        {
          entitlementId: 656,
          duration: 3,
          natureId: 17,
          id: null,
          beginDate: null,
          endDate: null,
          document: null,
        },
      ],
      comment: null,
    });
  });

  test('a nature without entitlement sends null', () => {
    const body = buildBody(
      run('k', '2026-11-02', '2026-11-02', 75),
      preview(75, [1], null),
      9001,
    );
    expect(body.segments[0]!.entitlementId).toBeNull();
  });
});

describe('createSubmit', () => {
  const runs = [
    run('a', '2026-11-02', '2026-11-02'),
    run('b', '2026-11-04', '2026-11-04'),
    run('c', '2026-11-06', '2026-11-06'),
  ];
  const previews = new Map(runs.map((r) => [r.key, preview(17, [1], 656)]));

  test('three runs, the second fails: successes leave, the failure keeps its message', async () => {
    const sent: string[] = [];
    const removed: string[] = [];
    let reloaded = 0;
    const submit = createSubmit({
      createRequest: async (sequenceId, body) => {
        sent.push(`${sequenceId}:${body.beginDate}`);
        if (body.beginDate.startsWith('2026-11-04')) {
          throw new QsError('rejected', 400, ['Chevauchement']);
        }
        return created.result[0]!.result;
      },
      updateRequest: async () => created.result[0]!.result,
      workflowSequenceId: async () => 11281,
      employeeId: () => 9001,
      removeRun: (key) => void removed.push(key),
      afterChange: async () => void reloaded++,
    });
    const result = await submit.submitAll(runs, previews, null);
    expect(sent).toEqual([
      '11281:2026-11-02T00:00:00Z',
      '11281:2026-11-04T00:00:00Z',
      '11281:2026-11-06T00:00:00Z',
    ]);
    expect(removed).toEqual(['a', 'c']);
    expect(result.failed).toBe(1);
    expect(submit.errors.get('b')).toBe('Chevauchement');
    expect(submit.errors.has('a')).toBe(false);
    expect(reloaded).toBe(1);
  });

  test('edit mode updates the request instead of creating one', async () => {
    const updates: number[] = [];
    const submit = createSubmit({
      createRequest: async () => {
        throw new Error('must not create');
      },
      updateRequest: async (id) => {
        updates.push(id);
        return created.result[0]!.result;
      },
      workflowSequenceId: async () => 11281,
      employeeId: () => 9001,
      removeRun: () => {},
      afterChange: async () => {},
    });
    const result = await submit.submitAll([runs[0]!], previews, 155);
    expect(updates).toEqual([155]);
    expect(result.failed).toBe(0);
  });

  test('edit mode with two runs sends nothing and explains why', async () => {
    const updates: number[] = [];
    const submit = createSubmit({
      createRequest: async () => {
        throw new Error('must not create');
      },
      updateRequest: async (id) => {
        updates.push(id);
        return created.result[0]!.result;
      },
      workflowSequenceId: async () => 11281,
      employeeId: () => 9001,
      removeRun: () => {},
      afterChange: async () => {},
    });
    const result = await submit.submitAll(runs, previews, 155);
    expect(updates).toEqual([]);
    expect(result).toEqual({ submitted: 0, failed: runs.length });
    expect(submit.errors.get(runs[0]!.key)).toBe(ONE_RANGE_MESSAGE);
  });

  test('the workflow sequence is fetched once', async () => {
    let fetches = 0;
    const submit = createSubmit({
      createRequest: async () => created.result[0]!.result,
      updateRequest: async () => created.result[0]!.result,
      workflowSequenceId: async () => {
        fetches++;
        return 11281;
      },
      employeeId: () => 9001,
      removeRun: () => {},
      afterChange: async () => {},
    });
    await submit.submitAll(runs, previews, null);
    await submit.submitAll(runs, previews, null);
    expect(fetches).toBe(1);
  });
});
