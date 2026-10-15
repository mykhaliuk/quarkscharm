## 1. Extension

- [ ] 1.1 `extension/manifest.json`: MV3, `key` with a new public key, `permissions: ["storage"]`, `host_permissions: ["https://*.quarksup.net/*"]`, content script on `https://*.quarksup.net/*` minus `login`, `api`, `service-*`, module service worker, `externally_connectable` for production only. Check: `chrome://extensions` loads the folder without errors, and the id matches the constant computed from the key.
- [x] 1.2 `extension/core.js`: token check (three base64url parts, `exp` from the JWT), the two-minute rule, the request flow of D5/D6 with injected `storage`, `tabs`, `now`, `sleep`. Check: `bun test tests/unit/extension-core.test.ts` covers a held token, a token about to expire, a token from an open tab, a background tab that gives a token, a login page, a timeout and a second request during a background fetch.
- [ ] 1.3 `extension/background.js` wires the core to `chrome.storage.session`, `chrome.tabs` and `chrome.runtime.onMessageExternal` with the origin check; `extension/content.js` reads the session storage at load, every 30 s and on demand. Check: manual run on the owner's browser, the service worker console shows the tenant and the expiry, never the token.
- [x] 1.4 `extension/` in the lint scope; `scripts/vercel-ignore.js` treats `extension/` like `docs/`. Check: `bun run lint` and the `vercel-ignore` unit test.
- [x] 1.5 `bun run extension:dev` builds the ignored `extension-dev/` with `http://localhost:3000/*` added; the service worker reads its allowed origins from its own manifest. Check: `tests/unit/extension-dev.test.ts` (shipped manifest is production only, the dev copy adds localhost and keeps the key).

## 2. App client and session

- [ ] 2.1 `app/utils/token-bridge.ts`: `requestBridgeToken(tenant)` with the results of D7 and a 35 s limit; the extension id constant. Check: unit tests with a fake `chrome.runtime` for each result kind.
- [ ] 2.2 `app/utils/session.ts`: dependency `getBridgeToken`, `connectWithBridge()`, the status `renewing` on 401, the renewal timer two minutes before expiry and the check on `visibilitychange`. `app/composables/useSession.ts` wires the client. Check: unit tests for a 401 solved by the bridge, a 401 that ends in the prompt, a silent renewal and a failed renewal (fake timers).

## 3. Screens

- [ ] 3.1 `app/pages/connect.vue`: try the extension on mount when a tenant is stored, and on Connect with an empty token field; messages for `login` and `timeout`. `app/components/TokenPrompt.vue`: closed while `renewing`. Check: Playwright with a stub of `chrome.runtime` added by `addInitScript`: connect without a paste, a 401 without a prompt, and the paste flow without the stub.
- [ ] 3.2 README: install steps for the extension and what it reads. Check: the steps load the extension on a clean Chrome profile.

## 4. Gate

- [ ] 4.1 `bun run check` and `bunx playwright test` green; the owner connects on localhost with the extension, without a paste, and sees a silent renewal.
