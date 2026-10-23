import { describe, expect, test } from 'bun:test';
import { isTenant } from '~/utils/tenant';

describe('isTenant', () => {
  test('accepts the part before .quarksup.net', () => {
    expect(isTenant('fulll')).toBe(true);
    expect(isTenant('my-company-2')).toBe(true);
  });

  test('refuses an empty value', () => {
    expect(isTenant('')).toBe(false);
  });

  test('refuses a full host, capitals and spaces', () => {
    expect(isTenant('fulll.quarksup.net')).toBe(false);
    expect(isTenant('Fulll')).toBe(false);
    expect(isTenant('ful ll')).toBe(false);
  });

  test('refuses a value shorter than 2 or longer than 32 characters', () => {
    expect(isTenant('f')).toBe(false);
    expect(isTenant('a'.repeat(33))).toBe(false);
  });
});
