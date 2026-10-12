import { describe, expect, test } from 'bun:test';
import { previewCallFor } from '~/utils/preview-call';

const run = {
  key: '75:2026-10-22:0',
  natureId: 75,
  beginDate: '2026-10-22',
  beginHour: 0 as const,
  endDate: '2026-10-22',
  endHour: 23 as const,
  days: [],
};

describe('previewCallFor', () => {
  test('a plain selection previews a new request', () => {
    expect(previewCallFor(run, null, 9001)).toEqual({
      kind: 'create',
      requestId: null,
      employeeId: 9001,
      begin: '2026-10-22T00:00:00Z',
      end: '2026-10-22T23:00:00Z',
    });
  });

  test('edit mode previews the request itself', () => {
    expect(previewCallFor(run, 155, 9001)).toEqual({
      kind: 'update',
      requestId: 155,
      employeeId: 9001,
      begin: '2026-10-22T00:00:00Z',
      end: '2026-10-22T23:00:00Z',
    });
  });
});
