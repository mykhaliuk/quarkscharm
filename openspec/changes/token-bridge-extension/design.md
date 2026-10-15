## Context

See proposal.md for the motivation. Current state:

- `app/utils/session.ts` owns the token: `connect(tenant, token)` checks
  it with the current-user call, `markExpired()` is the hook that
  `qsFetch` calls on a 401, and `whenConnected()` holds the failed calls
  until a new token is accepted (`app/utils/qs/retry.ts`).
  `TokenPrompt.vue` opens when the status is `expired`.
- quarksUp keeps `access_token`, `expires_at` (epoch ms, as a string) and
  more OIDC keys in the `sessionStorage` of `https://<tenant>.quarksup.net`,
  and renews the token itself while the tab is open (refresh token of
  about 5 minutes, see docs/quarksup-api.md §1 and §10).
- The login page of quarksUp is on `login.quarksup.net`; the APIs are on
  `api.quarksup.net` and `service-<tenant>.quarksup.net`.
- Vercel deploys `main`; `scripts/vercel-ignore.js` skips a build when
  only `openspec/` or `docs/` changed.

## Goals / Non-Goals

**Goals:**
- No pasted token while the extension is installed and the ADFS session
  of the browser is valid.
- The extension is small enough to read in a few minutes: a manifest, a
  thin service worker, a thin content script, one pure module.

**Non-Goals:**
- A build step for the extension (no bundler, no TypeScript).
- Sharing code between the app and the extension: the extension folder
  must load on its own.

## Decisions

### D1. Read the token from the session storage with a content script
The content script runs on `https://*.quarksup.net/*`, but skips the
hosts `login`, `api` and `service-*`. It reads `access_token`, takes the
expiry from the `exp` claim of the JWT (not from `expires_at`, so the app
and the extension use the same rule), and sends both with the tenant to
the service worker: once at load, then every 30 seconds, and on demand
when the service worker asks.

Rejected: `chrome.webRequest` on `api.quarksup.net`. It does not depend on
the storage of the SPA, but it needs the `webRequest` permission, and
Chrome then warns that the extension can read all the data of the site.
The owner chose the content script (2026-10-15).

### D2. Talk to quarksCharm through `externally_connectable`
The manifest lists `https://quarkscharm.vercel.app/*` and
`http://localhost:3000/*` in `externally_connectable.matches`. The page
calls `chrome.runtime.sendMessage(EXTENSION_ID, { type: 'token',
tenant })`. Chrome delivers messages from these origins only; the service
worker also checks `sender.origin` against the same list.

Rejected: `window.postMessage` with a second content script on the
quarksCharm page. Any script on the page could listen to the answer, and
the extension would have to check origins itself.

### D3. A fixed extension id through the manifest `key`
An unpacked extension gets an id from its folder path, so each user would
get another id. The manifest carries a `key` (the public RSA key, base64),
which fixes the id for everybody. The private key is not needed for an
unpacked install and is not kept. The app has the id as a constant.

Rejected: an id that the user types into quarksCharm. One more manual
step, for no gain.

### D4. Tokens in `chrome.storage.session`
Chrome stops an idle MV3 service worker after about 30 seconds, so its
globals are lost. `chrome.storage.session` stays while the browser runs,
is kept in memory only and is cleared on restart. One entry per tenant:
`{ token, expiresAt, seenAt }`.

### D5. Pure core with injected browser APIs
`extension/core.js` holds the logic: validate a token, pick a token valid
for at least two more minutes, decide what to do on a request (answer,
ask the open tabs, open a background tab, wait, give up). It takes
`storage`, `tabs`, `now` and `sleep` as arguments. `background.js` wires
it to the `chrome.*` APIs. Unit tests run the core with fakes in
`bun test`.

### D6. Background tab and login detection
`chrome.tabs.create({ url: 'https://<tenant>.quarksup.net/', active:
false })`. The service worker waits for a valid token from the content
script of that tab, for at most 30 seconds. It watches
`chrome.tabs.onUpdated`: when the tab URL is on `login.quarksup.net` and
no token came, it answers `login` and leaves the tab open. The host
permission `https://*.quarksup.net/*` gives access to the tab URL, so the
`tabs` permission is not needed. Only one background tab per tenant at a
time: a second request waits for the first.

### D7. The app client returns a closed set of results
`app/utils/token-bridge.ts` exports `requestBridgeToken(tenant)`, which
gives `{ kind: 'token', token, expiresAt }` or `{ kind: 'absent' |
'login' | 'timeout' | 'failed' }`. `absent` covers "no `chrome.runtime`"
and "no extension with this id" (Chrome sets `runtime.lastError`). The
client gives up after 35 seconds, a bit more than the extension wait.

### D8. The session orchestrates; the prompt opens last
`createSession` gets a new dependency `getBridgeToken(tenant)`.

- `connectWithBridge()` asks the bridge and calls `connect` with the
  answer.
- On 401, `markExpired` sets the status `renewing` (a new status that
  does not open the prompt and keeps the waiters), asks the bridge, and
  sets `expired` only when the bridge gives nothing usable.
- After every successful connect, a timer fires two minutes before
  `expiresAt` and calls `connectWithBridge()`; on failure the current
  token stays. Browsers slow down timers of hidden tabs, so the session
  also checks the expiry on `visibilitychange`.

The swap does not reload the data: only the token in the state changes.

### D9. The Connect screen tries the extension first
On mount, when a tenant is stored, the Connect screen calls
`connectWithBridge()` and shows "Getting the token from the extension…".
With a typed tenant and an empty token field, Connect also uses the
extension. The token field is not required when the extension is
present.

## Risks / Trade-offs

- [quarksUp renames its storage keys] → The bridge gives nothing, the
  app falls back to the paste. The content script logs one warning per
  page.
- [A local app on port 3000 can ask the extension for the token] →
  Accepted for development; the token is the user's own and lives one
  hour. The service worker checks the origin on each message.
- [The background tab shows up in the tab strip for a few seconds] →
  Accepted; it is inactive and closes itself.
- [The extension id is public] → Not a secret; Chrome still accepts
  messages from the listed origins only.

## Migration Plan

- Release: merge to `main`. The app works without the extension as
  before. The user loads `extension/` with "Load unpacked" in
  `chrome://extensions` (README steps).
- Rollback: remove the extension; the app goes back to the paste. The
  app part reverts with the merge commit.
