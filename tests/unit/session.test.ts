import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createSession, RENEW_BEFORE_MS, type MeRaw } from '~/utils/session';
import type { BridgeResult } from '~/utils/token-bridge';
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

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

type Timer = { run: () => void; delayMs: number; cancelled: boolean };

const build = (
  fetchMe = async () => me,
  bridge: (tenant: string) => Promise<BridgeResult> = async () => ({
    kind: 'absent',
  }),
) => {
  const calls: { tenant: string; token: string }[] = [];
  const bridgeCalls: string[] = [];
  const timers: Timer[] = [];
  let clock = NOW;
  const session = createSession({
    fetchMe: async (tenant, token) => {
      calls.push({ tenant, token });
      return fetchMe();
    },
    getBridgeToken: async (tenant) => {
      bridgeCalls.push(tenant);
      return bridge(tenant);
    },
    now: () => clock,
    setTimer: (run, delayMs) => {
      const timer = { run, delayMs, cancelled: false };
      timers.push(timer);
      return () => {
        timer.cancelled = true;
      };
    },
  });
  const pendingTimer = () => timers.filter((t) => !t.cancelled).at(-1);
  const setClock = (value: number) => {
    clock = value;
  };
  return { session, calls, bridgeCalls, pendingTimer, setClock };
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
    await session.markExpired();
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

  test('markExpired without the extension sets expired and a new token resumes waiters', async () => {
    const { session, bridgeCalls } = build();
    await session.connect('fulll', future);
    await session.markExpired();
    expect(bridgeCalls).toEqual(['fulll']);
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

describe('token bridge', () => {
  const later = jwt(NOW / 1000 + 7200);

  test('connectWithBridge connects with the token of the extension', async () => {
    const { session, calls } = build(undefined, async () => ({
      kind: 'token',
      token: later,
      expiresAt: (NOW / 1000 + 7200) * 1000,
    }));
    expect(await session.connectWithBridge('fulll')).toEqual({ ok: true });
    expect(calls).toEqual([{ tenant: 'fulll', token: later }]);
    expect(session.state.status).toBe('connected');
  });

  test('connectWithBridge passes the failure of the extension', async () => {
    const { session, calls } = build(undefined, async () => ({
      kind: 'login',
    }));
    expect(await session.connectWithBridge('fulll')).toEqual({
      ok: false,
      reason: 'login',
    });
    expect(calls).toEqual([]);
    expect(session.state.status).toBe('anonymous');
  });

  test('a 401 solved by the extension resumes the waiters without the prompt', async () => {
    let bridgeToken: string | null = null;
    const { session } = build(undefined, async () =>
      bridgeToken === null
        ? { kind: 'absent' }
        : { kind: 'token', token: bridgeToken, expiresAt: 0 },
    );
    await session.connect('fulll', future);
    bridgeToken = later;
    const statuses: string[] = [];
    const expiring = session.markExpired();
    statuses.push(session.state.status);
    const waiter = session.whenConnected();
    await expiring;
    await waiter;
    expect(statuses).toEqual(['renewing']);
    expect(session.state.status).toBe('connected');
    expect(session.state.token).toBe(later);
  });

  test('a second 401 while renewing does not ask the extension again', async () => {
    const { session, bridgeCalls } = build();
    await session.connect('fulll', future);
    const first = session.markExpired();
    await session.markExpired();
    await first;
    expect(bridgeCalls).toEqual(['fulll']);
  });

  test('renews two minutes before expiry without a call to quarksUp', async () => {
    const { session, calls, pendingTimer, setClock } = build(
      undefined,
      async () => ({ kind: 'token', token: later, expiresAt: 0 }),
    );
    await session.connect('fulll', future);
    const timer = pendingTimer();
    expect(timer?.delayMs).toBe(3_600_000 - RENEW_BEFORE_MS);
    setClock(NOW + 3_600_000 - RENEW_BEFORE_MS);
    timer?.run();
    await flush();
    expect(session.state.token).toBe(later);
    expect(session.state.expiresAt).toBe(NOW + 7_200_000);
    expect(session.state.status).toBe('connected');
    expect(tab.get('qc.token')).toBe(JSON.stringify(later));
    expect(calls).toHaveLength(1);
    expect(pendingTimer()?.delayMs).toBe(3_600_000);
  });

  test('a failed renewal keeps the current token', async () => {
    const { session, pendingTimer } = build(undefined, async () => ({
      kind: 'timeout',
    }));
    await session.connect('fulll', future);
    pendingTimer()?.run();
    await flush();
    expect(session.state.token).toBe(future);
    expect(session.state.status).toBe('connected');
  });

  test('checkRenewal renews only when the token is due', async () => {
    const { session, bridgeCalls, setClock } = build();
    await session.connect('fulll', future);
    await session.checkRenewal();
    expect(bridgeCalls).toEqual([]);
    setClock(NOW + 3_600_000 - 60_000);
    await session.checkRenewal();
    expect(bridgeCalls).toEqual(['fulll']);
  });

  test('forget cancels the renewal', async () => {
    const { session, pendingTimer } = build();
    await session.connect('fulll', future);
    session.forget();
    expect(pendingTimer()).toBeUndefined();
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
