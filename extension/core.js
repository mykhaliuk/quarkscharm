export const MIN_VALID_MS = 2 * 60 * 1000;
export const FETCH_TIMEOUT_MS = 30 * 1000;
export const LOGIN_SETTLE_MS = 3 * 1000;
export const POLL_MS = 500;
export const LOGIN_HOST = 'login.quarksup.net';

const TENANT_RE = /^[a-z0-9-]{2,32}$/;
const PART_RE = /^[A-Za-z0-9_-]+$/;
const NOT_TENANTS = ['login', 'api', 'www'];

export const tenantOfHost = (host) => {
  const match = /^([a-z0-9-]+)\.quarksup\.net$/.exec(host);
  if (match === null) return null;
  const tenant = match[1];
  if (NOT_TENANTS.includes(tenant) || tenant.startsWith('service-')) {
    return null;
  }
  return TENANT_RE.test(tenant) ? tenant : null;
};

export const tokenExpiry = (token) => {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || !parts.every((part) => PART_RE.test(part))) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const answer = (entry) => ({
  kind: 'token',
  token: entry.token,
  expiresAt: entry.expiresAt,
});

export const createBridge = ({ storage, tabs, now, sleep, log }) => {
  const running = new Map();
  const tabStates = new Map();

  const stateOf = (tabId) => {
    let state = tabStates.get(tabId);
    if (state === undefined) {
      state = { loginSince: null, removed: false };
      tabStates.set(tabId, state);
    }
    return state;
  };

  const freshEntry = (entry) =>
    entry !== null && entry.expiresAt - now() >= MIN_VALID_MS ? entry : null;

  const held = async (tenant) => freshEntry(await storage.get(tenant));

  const onReport = async ({ tenant, token }) => {
    if (tenant === null || !TENANT_RE.test(tenant)) return;
    const expiresAt = tokenExpiry(token);
    if (expiresAt === null || expiresAt <= now()) return;
    const previous = await storage.get(tenant);
    if (previous !== null && previous.token === token) return;
    await storage.set(tenant, { token, expiresAt, seenAt: now() });
    log('token', tenant, new Date(expiresAt).toISOString());
  };

  const askOpenTabs = async (tenant) => {
    for (const tabId of await tabs.findTenantTabs(tenant)) {
      const token = await tabs.askTab(tabId);
      if (token !== null) await onReport({ tenant, token });
      const entry = await held(tenant);
      if (entry !== null) return entry;
    }
    return null;
  };

  const isOnLogin = (state) =>
    state.loginSince !== null && now() - state.loginSince >= LOGIN_SETTLE_MS;

  const fetchInBackground = async (tenant) => {
    const tabId = await tabs.open(`https://${tenant}.quarksup.net/`);
    const state = stateOf(tabId);
    const deadline = now() + FETCH_TIMEOUT_MS;
    try {
      while (now() < deadline) {
        const entry = await held(tenant);
        if (entry !== null) {
          await tabs.close(tabId);
          return answer(entry);
        }
        if (state.removed) return { kind: 'timeout' };
        if (isOnLogin(state)) {
          log('login needed', tenant);
          return { kind: 'login' };
        }
        await sleep(POLL_MS);
      }
      await tabs.close(tabId);
      log('no token in time', tenant);
      return { kind: 'timeout' };
    } finally {
      tabStates.delete(tabId);
    }
  };

  const onRequest = async (tenant) => {
    if (typeof tenant !== 'string' || !TENANT_RE.test(tenant)) {
      return { kind: 'failed' };
    }
    const stored = await held(tenant);
    if (stored !== null) return answer(stored);
    const fromTab = await askOpenTabs(tenant);
    if (fromTab !== null) return answer(fromTab);
    const pending = running.get(tenant);
    if (pending !== undefined) return pending;
    const job = fetchInBackground(tenant).finally(() => running.delete(tenant));
    running.set(tenant, job);
    return job;
  };

  const onTabUpdated = (tabId, url, status) => {
    if (typeof url !== 'string') return;
    const state = stateOf(tabId);
    const onLogin = new URL(url).host === LOGIN_HOST && status === 'complete';
    if (!onLogin) state.loginSince = null;
    else if (state.loginSince === null) state.loginSince = now();
  };

  const onTabRemoved = (tabId) => {
    stateOf(tabId).removed = true;
  };

  return { onReport, onRequest, onTabUpdated, onTabRemoved };
};
