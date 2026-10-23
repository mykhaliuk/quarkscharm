import { createBridge, pageOrigins, tenantOfHost } from './core.js';

const api = globalThis.browser ?? globalThis.chrome;

const ALLOWED_ORIGINS = pageOrigins(api.runtime.getManifest());

const keyOf = (tenant) => `token:${tenant}`;

const log = (...args) => console.info('[token-bridge]', ...args);

const tenantOfUrl = (url) => {
  try {
    return tenantOfHost(new URL(url).host);
  } catch {
    return null;
  }
};

const originOfUrl = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const bridge = createBridge({
  storage: {
    get: async (tenant) => {
      const key = keyOf(tenant);
      const found = await api.storage.session.get(key);
      return found[key] ?? null;
    },
    set: (tenant, entry) => api.storage.session.set({ [keyOf(tenant)]: entry }),
  },
  tabs: {
    findTenantTabs: async (tenant) => {
      const found = await api.tabs.query({
        url: `https://${tenant}.quarksup.net/*`,
      });
      return found.map((tab) => tab.id).filter((id) => id !== undefined);
    },
    askTab: async (tabId) => {
      try {
        const report = await api.tabs.sendMessage(tabId, { type: 'read' });
        return report?.token ?? null;
      } catch {
        // the tab has no content script yet (still loading or discarded)
        return null;
      }
    },
    open: async (url) => (await api.tabs.create({ url, active: false })).id,
    close: async (tabId) => {
      try {
        await api.tabs.remove(tabId);
      } catch {
        // the user closed the tab already
      }
    },
  },
  now: Date.now,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log,
});

const answerRequest = (tenant, respond) => {
  bridge.onRequest(tenant).then(respond, (error) => {
    console.error('[token-bridge] request failed', error);
    respond({ kind: 'failed' });
  });
  return true;
};

api.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== api.runtime.id) return false;
  if (message?.type === 'report') {
    const tenant = tenantOfUrl(sender.url ?? '');
    void bridge.onReport({ tenant, token: message.token });
    return false;
  }
  if (message?.type !== 'token') return false;
  if (!ALLOWED_ORIGINS.includes(originOfUrl(sender.url ?? ''))) return false;
  return answerRequest(message.tenant, respond);
});

api.runtime.onMessageExternal?.addListener((message, sender, respond) => {
  if (!ALLOWED_ORIGINS.includes(sender.origin)) return false;
  if (message?.type !== 'token') return false;
  return answerRequest(message.tenant, respond);
});

api.tabs.onUpdated.addListener((tabId, _change, tab) => {
  bridge.onTabUpdated(tabId, tab.url, tab.status);
});

api.tabs.onRemoved.addListener((tabId) => bridge.onTabRemoved(tabId));
