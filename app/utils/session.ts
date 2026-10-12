import { reactive } from 'vue';
import { QsError } from './qs/error';
import type { RawMe } from './qs/types';
import { readJson, remove, writeJson } from './storage';
import { normalizeToken, tokenExpiry } from './token';

export const TENANT_KEY = 'qc.tenant';
export const TOKEN_KEY = 'qc.token';

export type MeRaw = RawMe;

export type Me = {
  employeeId: number;
  firstName: string;
  lastName: string;
  pictureUrl: string | null;
  timeZone: string;
};

export type SessionStatus = 'anonymous' | 'checking' | 'connected' | 'expired';

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

type Deps = {
  fetchMe: (tenant: string, token: string) => Promise<MeRaw>;
  now?: () => number;
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

export const createSession = ({ fetchMe, now = Date.now }: Deps) => {
  const state = reactive<SessionState>({
    tenant: '',
    token: null,
    expiresAt: null,
    me: null,
    status: 'anonymous',
  });
  let waiters: (() => void)[] = [];

  const setConnected = () => {
    state.status = 'connected';
    const resolved = waiters;
    waiters = [];
    for (const resolve of resolved) resolve();
  };

  const dropToken = () => {
    state.token = null;
    state.expiresAt = null;
    remove(TOKEN_KEY);
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
      writeJson(TOKEN_KEY, token);
      setConnected();
      return { ok: true };
    } catch (error) {
      const kind = error instanceof QsError ? error.kind : 'unavailable';
      if (kind === 'unavailable') {
        state.status = previous;
        return { ok: false, reason: 'unavailable' };
      }
      dropToken();
      state.me = null;
      state.status = 'anonymous';
      return { ok: false, reason: 'rejected' };
    }
  };

  const forget = () => {
    dropToken();
    state.me = null;
    state.status = 'anonymous';
  };

  const markExpired = () => {
    state.status = 'expired';
  };

  const whenConnected = (): Promise<void> => {
    if (state.status === 'connected') return Promise.resolve();
    return new Promise((resolve) => waiters.push(resolve));
  };

  const restore = async (): Promise<void> => {
    const tenant = readJson<string>(TENANT_KEY);
    if (typeof tenant === 'string') state.tenant = tenant;
    const token = readJson<string>(TOKEN_KEY);
    if (typeof token !== 'string' || typeof tenant !== 'string') return;
    const expiresAt = tokenExpiry(token);
    if (expiresAt === null || expiresAt <= now()) {
      remove(TOKEN_KEY);
      return;
    }
    await connect(tenant, token);
  };

  return { state, connect, forget, markExpired, whenConnected, restore };
};

export type Session = ReturnType<typeof createSession>;
