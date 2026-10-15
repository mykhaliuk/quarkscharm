import { createBridge, tenantOfHost } from './core.js';

const ALLOWED_ORIGINS = chrome.runtime
  .getManifest()
  .externally_connectable.matches.map((pattern) => new URL(pattern).origin);

const keyOf = (tenant) => `token:${tenant}`;

const log = (...args) => console.info('[token-bridge]', ...args);

const tenantOfUrl = (url) => {
  try {
    return tenantOfHost(new URL(url).host);
  } catch {
    return null;
  }
};

const bridge = createBridge({
  storage: {
    get: async (tenant) => {
      const key = keyOf(tenant);
      const found = await chrome.storage.session.get(key);
      return found[key] ?? null;
    },
    set: (tenant, entry) =>
      chrome.storage.session.set({ [keyOf(tenant)]: entry }),
  },
  tabs: {
    findTenantTabs: async (tenant) => {
      const found = await chrome.tabs.query({
        url: `https://${tenant}.quarksup.net/*`,
      });
      return found.map((tab) => tab.id).filter((id) => id !== undefined);
    },
    askTab: async (tabId) => {
      try {
        const report = await chrome.tabs.sendMessage(tabId, { type: 'read' });
        return report?.token ?? null;
      } catch {
        // the tab has no content script yet (still loading or discarded)
        return null;
      }
    },
    open: async (url) => (await chrome.tabs.create({ url, active: false })).id,
    close: async (tabId) => {
      try {
        await chrome.tabs.remove(tabId);
      } catch {
        // the user closed the tab already
      }
    },
  },
  now: Date.now,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log,
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'report') return;
  const tenant = tenantOfUrl(sender.url ?? '');
  void bridge.onReport({ tenant, token: message.token });
});

chrome.runtime.onMessageExternal.addListener((message, sender, respond) => {
  if (!ALLOWED_ORIGINS.includes(sender.origin)) return false;
  if (message?.type !== 'token') return false;
  bridge.onRequest(message.tenant).then(respond, (error) => {
    console.error('[token-bridge] request failed', error);
    respond({ kind: 'failed' });
  });
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, _change, tab) => {
  bridge.onTabUpdated(tabId, tab.url, tab.status);
});

chrome.tabs.onRemoved.addListener((tabId) => bridge.onTabRemoved(tabId));
