import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createSession, type MeRaw } from '~/utils/session';
import { QsError } from '~/utils/qs/error';

const local = new Map<string, string>();
const tab = new Map<string, string>();
const install = (name: string, memory: Map<string, string>) =>
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
      removeItem: (key: string) => void memory.delete(key),
    },
  });
beforeEach(() => {
  install('localStorage', local);
  install('sessionStorage', tab);
});
afterEach(() => {
  local.clear();
  tab.clear();
});

const b64url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (exp: number) =>
  `${b64url({ alg: 'RS256' })}.${b64url({ exp })}.c2ln`;
const NOW = 1_791_900_000_000;
const future = jwt(NOW / 1000 + 3600);
const past = jwt(NOW / 1000 - 60);

const me: MeRaw = {
  login: 'v.m',
  employee: { id: 1234, firstName: 'Volodymyr', lastName: 'M' },
  timeZone: 'Europe/Paris',
  picture: { url: 'u', thumbnails: { small: 's', medium: 'm', large: 'l' } },
};

const build = (fetchMe = async () => me) => {
  const calls: { tenant: string; token: string }[] = [];
  const session = createSession({
    fetchMe: async (tenant, token) => {
      calls.push({ tenant, token });
      return fetchMe();
    },
    now: () => NOW,
  });
  return { session, calls };
};

describe('connect', () => {
  test('refuses a malformed token before any call', async () => {
    const { session, calls } = build();
    const result = await session.connect('fulll', 'not a token');
    expect(result).toEqual({ ok: false, reason: 'malformed' });
    expect(calls).toHaveLength(0);
    expect(session.state.status).toBe('anonymous');
  });

  test('refuses a token whose exp is in the past', async () => {
    const { session, calls } = build();
    const result = await session.connect('fulll', past);
    expect(result).toEqual({ ok: false, reason: 'malformed' });
    expect(calls).toHaveLength(0);
  });

  test('stores tenant and token, fills me and connects', async () => {
    const { session, calls } = build();
    const result = await session.connect('fulll', `Bearer ${future}`);
    expect(result).toEqual({ ok: true });
    expect(calls).toEqual([{ tenant: 'fulll', token: future }]);
    expect(session.state.status).toBe('connected');
    expect(session.state.tenant).toBe('fulll');
    expect(session.state.token).toBe(future);
    expect(session.state.expiresAt).toBe(NOW + 3_600_000);
    expect(session.state.me).toEqual({
      employeeId: 1234,
      firstName: 'Volodymyr',
      lastName: 'M',
      pictureUrl: 'u',
      timeZone: 'Europe/Paris',
    });
    expect(local.get('qc.tenant')).toBe('"fulll"');
    expect(tab.get('qc.token')).toBe(JSON.stringify(future));
    expect(local.has('qc.token')).toBe(false);
  });

  test('a rejected token clears the token, keeps the tenant', async () => {
    const { session } = build(async () => {
      throw new QsError('expired', 401);
    });
    const result = await session.connect('fulll', future);
    expect(result).toEqual({ ok: false, reason: 'rejected' });
    expect(session.state.status).toBe('anonymous');
    expect(session.state.tenant).toBe('fulll');
    expect(session.state.token).toBeNull();
    expect(tab.has('qc.token')).toBe(false);
    expect(local.get('qc.tenant')).toBe('"fulll"');
  });

  test('a rejected token in the expired prompt keeps the session expired', async () => {
    const { session } = build(async () => {
      throw new QsError('rejected', 403);
    });
    session.markExpired();
    const result = await session.connect('fulll', future);
    expect(result).toEqual({ ok: false, reason: 'rejected' });
    expect(session.state.status).toBe('expired');
  });

  test('an unavailable backend reports unavailable', async () => {
    const { session } = build(async () => {
      throw new QsError('unavailable');
    });
    expect(await session.connect('fulll', future)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });
});

describe('forget and expiry', () => {
  test('forget removes token and me, keeps the tenant', async () => {
    const { session } = build();
    await session.connect('fulll', future);
    session.forget();
    expect(session.state.status).toBe('anonymous');
    expect(session.state.token).toBeNull();
    expect(session.state.me).toBeNull();
    expect(session.state.tenant).toBe('fulll');
    expect(tab.has('qc.token')).toBe(false);
  });

  test('markExpired sets expired and a new token resumes waiters', async () => {
    const { session } = build();
    await session.connect('fulll', future);
    session.markExpired();
    expect(session.state.status).toBe('expired');
    let resumed = false;
    const waiter = session.whenConnected().then(() => {
      resumed = true;
    });
    await Promise.resolve();
    expect(resumed).toBe(false);
    await session.connect('fulll', future);
    await waiter;
    expect(resumed).toBe(true);
    expect(session.state.status).toBe('connected');
  });
});

describe('restore', () => {
  test('reconnects silently from storage', async () => {
    local.set('qc.tenant', '"fulll"');
    tab.set('qc.token', JSON.stringify(future));
    const { session, calls } = build();
    await session.restore();
    expect(calls).toHaveLength(1);
    expect(session.state.status).toBe('connected');
  });

  test('drops an expired stored token and keeps the tenant', async () => {
    local.set('qc.tenant', '"fulll"');
    tab.set('qc.token', JSON.stringify(past));
    const { session, calls } = build();
    await session.restore();
    expect(calls).toHaveLength(0);
    expect(session.state.status).toBe('anonymous');
    expect(session.state.tenant).toBe('fulll');
    expect(tab.has('qc.token')).toBe(false);
  });

  test('drops a token that an older version kept in localStorage', async () => {
    local.set('qc.tenant', '"fulll"');
    local.set('qc.token', JSON.stringify(future));
    const { session, calls } = build();
    await session.restore();
    expect(calls).toHaveLength(0);
    expect(session.state.status).toBe('anonymous');
    expect(local.has('qc.token')).toBe(false);
  });

  test('stays anonymous with an empty store', async () => {
    const { session } = build();
    await session.restore();
    expect(session.state.status).toBe('anonymous');
    expect(session.state.tenant).toBe('');
  });
});
