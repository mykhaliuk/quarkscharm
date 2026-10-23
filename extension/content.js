const read = () => {
  const token = sessionStorage.getItem('access_token');
  return token === null ? null : { type: 'report', token };
};

(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const PUSH_MS = 30 * 1000;
  const host = location.hostname;
  const tenant = host.split('.')[0];
  const isTenantPage =
    host === `${tenant}.quarksup.net` &&
    !['login', 'api', 'www'].includes(tenant) &&
    !tenant.startsWith('service-');
  if (!isTenantPage) return;

  let warned = false;

  const push = () => {
    const report = read();
    if (report === null) {
      if (!warned) console.warn('[token-bridge] no access_token in this tab');
      warned = true;
      return;
    }
    api.runtime.sendMessage(report).catch(() => {
      // the extension was reloaded; this page keeps an orphan script
    });
  };

  api.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === 'read') respond(read());
  });

  push();
  setInterval(push, PUSH_MS);
})();
