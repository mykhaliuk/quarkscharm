import { describe, expect, test } from 'bun:test';
import {
  createBridge,
  FETCH_TIMEOUT_MS,
  tenantOfHost,
  tokenExpiry,
} from '../../extension/core.js';

type Entry = { token: string; expiresAt: number; seenAt: number };

const START = Date.parse('2026-10-15T13:00:00Z');
const MINUTE = 60 * 1000;

const encode = (value: object) =>
  btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const ignoreTab = (_tabId: number) => {};

const jwt = (expMs: number): string => {
  return `${encode({ alg: 'RS256' })}.${encode({ exp: expMs / 1000 })}.sig`;
};

const build = () => {
  let clock = START;
  const entries = new Map<string, Entry>();
  const opened: string[] = [];
  const closed: number[] = [];
  const openTabs = new Map<number, string | null>();
  let onOpen: (tabId: number) => void = ignoreTab;
  const bridge = createBridge({
    storage: {
      get: async (tenant: string) => entries.get(tenant) ?? null,
      set: async (tenant: string, entry: Entry) => {
        entries.set(tenant, entry);
      },
    },
    tabs: {
      findTenantTabs: async () => [...openTabs.keys()],
      askTab: async (tabId: number) => openTabs.get(tabId) ?? null,
      open: async (url: string) => {
        opened.push(url);
        const tabId = 100 + opened.length;
        onOpen(tabId);
        return tabId;
      },
      close: async (tabId: number) => {
        closed.push(tabId);
      },
    },
    now: () => clock,
    sleep: async (ms: number) => {
      clock += ms;
    },
    log: () => {},
  });
  return {
    bridge,
    entries,
    opened,
    closed,
    openTabs,
    advance: (ms: number) => {
      clock += ms;
    },
    whenOpened: (fn: (tabId: number) => void) => {
      onOpen = fn;
    },
  };
};

describe('tenantOfHost', () => {
  test('keeps tenant hosts and drops the shared hosts', () => {
    expect(tenantOfHost('fulll.quarksup.net')).toBe('fulll');
    expect(tenantOfHost('login.quarksup.net')).toBeNull();
    expect(tenantOfHost('api.quarksup.net')).toBeNull();
    expect(tenantOfHost('service-fulll.quarksup.net')).toBeNull();
    expect(tenantOfHost('fulll.example.com')).toBeNull();
  });
});

describe('tokenExpiry', () => {
  test('reads exp from a JWT and refuses other values', () => {
    expect(tokenExpiry(jwt(START + 60 * MINUTE))).toBe(START + 60 * MINUTE);
    expect(tokenExpiry('not-a-token')).toBeNull();
    expect(tokenExpiry(null)).toBeNull();
  });
});

describe('bridge', () => {
  test('answers with a held token valid for two more minutes', async () => {
    const { bridge, opened } = build();
    const token = jwt(START + 30 * MINUTE);
    await bridge.onReport({ tenant: 'fulll', token });
    expect(await bridge.onRequest('fulll')).toEqual({
      kind: 'token',
      token,
      expiresAt: START + 30 * MINUTE,
    });
    expect(opened).toEqual([]);
  });

  test('ignores an expired or malformed report', async () => {
    const { bridge, entries } = build();
    await bridge.onReport({ tenant: 'fulll', token: jwt(START - MINUTE) });
    await bridge.onReport({ tenant: 'fulll', token: 'garbage' });
    await bridge.onReport({ tenant: null, token: jwt(START + MINUTE * 30) });
    expect(entries.size).toBe(0);
  });

  test('a token about to expire is not given; an open tab gives a fresh one', async () => {
    const { bridge, openTabs, opened } = build();
    await bridge.onReport({ tenant: 'fulll', token: jwt(START + MINUTE) });
    const fresh = jwt(START + 60 * MINUTE);
    openTabs.set(7, fresh);
    expect(await bridge.onRequest('fulll')).toMatchObject({
      kind: 'token',
      token: fresh,
    });
    expect(opened).toEqual([]);
  });

  test('opens an inactive tab, takes its token and closes it', async () => {
    const { bridge, opened, closed, whenOpened, advance } = build();
    const fresh = jwt(START + 60 * MINUTE);
    whenOpened(() => {
      void Promise.resolve().then(async () => {
        advance(2000);
        await bridge.onReport({ tenant: 'fulll', token: fresh });
      });
    });
    expect(await bridge.onRequest('fulll')).toMatchObject({
      kind: 'token',
      token: fresh,
    });
    expect(opened).toEqual(['https://fulll.quarksup.net/']);
    expect(closed).toEqual([101]);
  });

  test('a settled login page keeps the tab open and answers login', async () => {
    const { bridge, closed, whenOpened } = build();
    whenOpened((tabId) => {
      bridge.onTabUpdated(
        tabId,
        'https://login.quarksup.net/adfs/ls',
        'complete',
      );
    });
    expect(await bridge.onRequest('fulll')).toEqual({ kind: 'login' });
    expect(closed).toEqual([]);
  });

  test('a short pass through the login host is not a login', async () => {
    const { bridge, whenOpened, advance } = build();
    const fresh = jwt(START + 60 * MINUTE);
    whenOpened((tabId) => {
      bridge.onTabUpdated(
        tabId,
        'https://login.quarksup.net/adfs/oauth2',
        'complete',
      );
      void Promise.resolve().then(async () => {
        advance(1000);
        bridge.onTabUpdated(
          tabId,
          'https://fulll.quarksup.net/hello',
          'complete',
        );
        await bridge.onReport({ tenant: 'fulll', token: fresh });
      });
    });
    expect(await bridge.onRequest('fulll')).toMatchObject({ kind: 'token' });
  });

  test('no token in time closes the tab and answers timeout', async () => {
    const { bridge, closed } = build();
    expect(await bridge.onRequest('fulll')).toEqual({ kind: 'timeout' });
    expect(closed).toEqual([101]);
    expect(FETCH_TIMEOUT_MS).toBe(30_000);
  });

  test('a tab closed by the user ends the wait', async () => {
    const { bridge, closed, whenOpened } = build();
    whenOpened((tabId) => {
      void Promise.resolve().then(() => bridge.onTabRemoved(tabId));
    });
    expect(await bridge.onRequest('fulll')).toEqual({ kind: 'timeout' });
    expect(closed).toEqual([]);
  });

  test('a second request during a background fetch shares the same tab', async () => {
    const { bridge, opened, whenOpened, advance } = build();
    const fresh = jwt(START + 60 * MINUTE);
    whenOpened(() => {
      void Promise.resolve().then(async () => {
        advance(1000);
        await bridge.onReport({ tenant: 'fulll', token: fresh });
      });
    });
    const [first, second] = await Promise.all([
      bridge.onRequest('fulll'),
      bridge.onRequest('fulll'),
    ]);
    expect(first).toEqual(second);
    expect(opened).toHaveLength(1);
  });

  test('a bad tenant fails without any tab', async () => {
    const { bridge, opened } = build();
    expect(await bridge.onRequest('../evil')).toEqual({ kind: 'failed' });
    expect(opened).toEqual([]);
  });
});
