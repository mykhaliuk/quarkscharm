import { describe, expect, test } from 'bun:test';
import {
  STATUS,
  VISIBLE_STATUS_IDS,
  isDrawn,
  isPending,
} from '~~/shared/utils/status';

describe('status', () => {
  test('STATUS maps the quarksUp ids', () => {
    expect(STATUS.new).toBe(1);
    expect(STATUS.validated).toBe(2);
    expect(STATUS.refused).toBe(3);
    expect(STATUS.cancelled).toBe(4);
    expect(STATUS.cancelOngoingManager).toBe(5);
    expect(STATUS.cancelOngoingRh).toBe(6);
  });

  test('isDrawn is true for 1, 2, 5, 6 only', () => {
    expect([1, 2, 3, 4, 5, 6].map(isDrawn)).toEqual([
      true,
      true,
      false,
      false,
      true,
      true,
    ]);
  });

  test('isPending is true for 1, 5, 6 only', () => {
    expect([1, 2, 3, 4, 5, 6].map(isPending)).toEqual([
      true,
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  test('VISIBLE_STATUS_IDS lists the drawn statuses', () => {
    expect(VISIBLE_STATUS_IDS).toEqual([1, 2, 5, 6]);
  });
});
