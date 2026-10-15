import { reactive } from 'vue';
import { QsError } from './qs/error';
import type { RawMe } from './qs/types';
import { readJson, remove, writeJson } from './storage';
import { normalizeToken, tokenExpiry } from './token';
import type { BridgeFailure, BridgeResult } from './token-bridge';

export const TENANT_KEY = 'qc.tenant';
export const TOKEN_KEY = 'qc.token';
export const RENEW_BEFORE_MS = 2 * 60 * 1000;

export type MeRaw = RawMe;

export type Me = {
  employeeId: number;
  firstName: string;
  lastName: string;
  pictureUrl: string | null;
  timeZone: string;
};

export type SessionStatus =
  | 'anonymous'
  | 'checking'
  | 'connected'
  | 'renewing'
  | 'expired';

export type SessionState = {
  tenant: string;
  token: string | null;
  expiresAt: number | null;
  me: Me | null;
  status: SessionStatus;
};

export type ConnectResult =
  | { ok: true }
  | { ok: false; reason: 'malformed' | 'rejected' | 'unavailable' };

export type BridgeConnectResult =
  | ConnectResult
  | { ok: false; reason: BridgeFailure };

type Deps = {
  fetchMe: (tenant: string, token: string) => Promise<MeRaw>;
  getBridgeToken?: (tenant: string) => Promise<BridgeResult>;
  now?: () => number;
  setTimer?: (run: () => void, delayMs: number) => () => void;
};

const NO_BRIDGE = async (): Promise<BridgeResult> => ({ kind: 'absent' });

const browserTimer = (run: () => void, delayMs: number) => {
  const id = setTimeout(run, delayMs);
  return () => clearTimeout(id);
};

const toMe = (raw: MeRaw): Me => ({
  employeeId: raw.employee.id,
  firstName: raw.employee.firstName,
  lastName: raw.employee.lastName,
  pictureUrl:
    raw.picture?.url ??
    raw.picture?.thumbnails?.medium ??
    raw.picture?.thumbnails?.small ??
    null,
  timeZone: raw.timeZone ?? 'Europe/Paris',
});

export const createSession = ({
  fetchMe,
  getBridgeToken = NO_BRIDGE,
  now = Date.now,
  setTimer = browserTimer,
}: Deps) => {
  const state = reactive<SessionState>({
    tenant: '',
    token: null,
    expiresAt: null,
    me: null,
    status: 'anonymous',
  });
  let waiters: (() => void)[] = [];
  let cancelRenewal: () => void = noop;

  const setConnected = () => {
    state.status = 'connected';
    const resolved = waiters;
    waiters = [];
    for (const resolve of resolved) resolve();
  };

  const dropToken = () => {
    cancelRenewal();
    state.token = null;
    state.expiresAt = null;
    remove(TOKEN_KEY, 'session');
  };

  const scheduleRenewal = () => {
    cancelRenewal();
    if (state.expiresAt === null) return;
    const delayMs = Math.max(0, state.expiresAt - RENEW_BEFORE_MS - now());
    cancelRenewal = setTimer(() => void renew(), delayMs);
  };

  const swapToken = (rawToken: string): boolean => {
    const token = normalizeToken(rawToken);
    const expiresAt = token === null ? null : tokenExpiry(token);
    if (token === null || expiresAt === null || expiresAt <= now()) {
      return false;
    }
    state.token = token;
    state.expiresAt = expiresAt;
    writeJson(TOKEN_KEY, token, 'session');
    scheduleRenewal();
    return true;
  };

  const renew = async (): Promise<void> => {
    if (state.status !== 'connected') return;
    const result = await getBridgeToken(state.tenant);
    if (state.status !== 'connected' || result.kind !== 'token') return;
    if (result.token !== state.token) swapToken(result.token);
  };

  const checkRenewal = (): Promise<void> => {
    const isDue =
      state.expiresAt !== null && state.expiresAt - now() <= RENEW_BEFORE_MS;
    return isDue ? renew() : Promise.resolve();
  };

  const connect = async (
    tenant: string,
    rawToken: string,
  ): Promise<ConnectResult> => {
    const token = normalizeToken(rawToken);
    const expiresAt = token === null ? null : tokenExpiry(token);
    if (token === null || expiresAt === null || expiresAt <= now()) {
      return { ok: false, reason: 'malformed' };
    }
    state.tenant = tenant;
    writeJson(TENANT_KEY, tenant);
    const previous = state.status;
    state.status = 'checking';
    try {
      const raw = await fetchMe(tenant, token);
      state.token = token;
      state.expiresAt = expiresAt;
      state.me = toMe(raw);
      writeJson(TOKEN_KEY, token, 'session');
      setConnected();
      scheduleRenewal();
      return { ok: true };
    } catch (error) {
      const kind = error instanceof QsError ? error.kind : 'unavailable';
      if (kind === 'unavailable') {
        state.status = previous;
        return { ok: false, reason: 'unavailable' };
      }
      dropToken();
      if (previous === 'expired' || previous === 'renewing') {
        state.status = 'expired';
        return { ok: false, reason: 'rejected' };
      }
      state.me = null;
      state.status = 'anonymous';
      return { ok: false, reason: 'rejected' };
    }
  };

  const forget = () => {
    cancelRenewal();
    dropToken();
    state.me = null;
    state.status = 'anonymous';
  };

  const connectWithBridge = async (
    tenant: string,
  ): Promise<BridgeConnectResult> => {
    const result = await getBridgeToken(tenant);
    if (result.kind !== 'token') return { ok: false, reason: result.kind };
    return connect(tenant, result.token);
  };

  const markExpired = async (): Promise<void> => {
    if (state.status === 'renewing' || state.status === 'expired') return;
    state.status = 'renewing';
    const result = await connectWithBridge(state.tenant);
    if (!result.ok) state.status = 'expired';
  };

  const whenConnected = (): Promise<void> => {
    if (state.status === 'connected') return Promise.resolve();
    return new Promise((resolve) => waiters.push(resolve));
  };

  const restore = async (): Promise<void> => {
    const tenant = readJson<string>(TENANT_KEY);
    if (typeof tenant === 'string') state.tenant = tenant;
    // older versions kept the token in localStorage
    remove(TOKEN_KEY);
    const token = readJson<string>(TOKEN_KEY, 'session');
    if (typeof token !== 'string' || typeof tenant !== 'string') return;
    const expiresAt = tokenExpiry(token);
    if (expiresAt === null || expiresAt <= now()) {
      remove(TOKEN_KEY, 'session');
      return;
    }
    await connect(tenant, token);
  };

  return {
    state,
    connect,
    connectWithBridge,
    checkRenewal,
    forget,
    markExpired,
    whenConnected,
    restore,
  };
};

export type Session = ReturnType<typeof createSession>;

function noop(): void {}
