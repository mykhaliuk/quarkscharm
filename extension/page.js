(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const origin = location.origin;

  const isRequest = (event) =>
    event.source === window &&
    event.origin === origin &&
    event.data?.source === 'quarkscharm' &&
    event.data.type === 'token';

  const post = (id, type, answer) =>
    window.postMessage(
      { source: 'quarkscharm-bridge', id, type, answer },
      origin,
    );

  window.addEventListener('message', (event) => {
    if (!isRequest(event)) return;
    const { id, tenant } = event.data;
    post(id, 'received', null);
    api.runtime.sendMessage({ type: 'token', tenant }).then(
      (answer) => post(id, 'answer', answer),
      (error) => {
        console.error('[token-bridge] relay failed', error);
        post(id, 'answer', { kind: 'failed' });
      },
    );
  });
})();
