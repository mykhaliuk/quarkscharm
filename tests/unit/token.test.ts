import { describe, expect, test } from 'bun:test';
import { normalizeToken, tokenExpiry } from '~/utils/token';

const b64url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (payload: object) =>
  `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url(payload)}.c2lnbmF0dXJl`;

describe('normalizeToken', () => {
  test('returns a clean three-part token as is', () => {
    const token = jwt({ exp: 1 });
    expect(normalizeToken(token)).toBe(token);
  });

  test('trims surrounding whitespace and newlines', () => {
    const token = jwt({ exp: 1 });
    expect(normalizeToken(`  ${token}\n`)).toBe(token);
  });

  test('strips a leading Bearer prefix case-insensitively', () => {
    const token = jwt({ exp: 1 });
    expect(normalizeToken(`Bearer ${token}`)).toBe(token);
    expect(normalizeToken(`bearer   ${token}`)).toBe(token);
    expect(normalizeToken(`BEARER ${token}`)).toBe(token);
  });

  test('rejects a value that is not three base64url parts', () => {
    expect(normalizeToken('abc.def')).toBeNull();
    expect(normalizeToken('a.b.c.d')).toBeNull();
    expect(normalizeToken('not a token')).toBeNull();
    expect(normalizeToken('')).toBeNull();
    expect(normalizeToken('a+b/c.def.ghi')).toBeNull();
  });
});

describe('tokenExpiry', () => {
  test('decodes exp from the payload as milliseconds', () => {
    expect(tokenExpiry(jwt({ exp: 1_791_900_000 }))).toBe(1_791_900_000_000);
  });

  test('handles a payload whose base64url needs padding', () => {
    const token = jwt({ exp: 1_791_900_000, sub: 'x' });
    expect(tokenExpiry(token)).toBe(1_791_900_000_000);
  });

  test('returns null without exp or with a broken payload', () => {
    expect(tokenExpiry(jwt({ sub: 'x' }))).toBeNull();
    expect(tokenExpiry('aaa.!!!.ccc')).toBeNull();
  });
});
