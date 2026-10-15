## Why

Today the user copies the bearer token from the DevTools of quarksUp and
pastes it into quarksCharm, and does it again every hour. quarksUp already
keeps a fresh token in the session storage of its own tab and refreshes
it while the tab is open (observed 2026-10-15: token stored 19 min ago,
valid 41 min more). A small browser extension can read that token and
give it to quarksCharm, so the user does not paste anything.

## What Changes

- quarksCharm connects without a pasted token when the extension is
  installed: the Connect screen and the expiry prompt get the token from
  the extension.
- Before the token expires, quarksCharm gets the next one from the
  extension and swaps it in place, so the user does not see the expiry
  prompt.
- When no quarksUp tab has a fresh token, the extension opens the tenant
  page of quarksUp in an inactive tab, takes the token that quarksUp gets
  through the ADFS single sign-on, and closes the tab. When quarksUp asks
  for a login, the tab stays open for the user.
- A new Chrome extension (Manifest V3) lives in `extension/` in this
  repository. The user loads it unpacked. It has a fixed extension id,
  so quarksCharm knows whom to ask.
- The pasted token stays as the fallback for users without the
  extension and for other browsers.

## Non-goals

- A publication in the Chrome Web Store.
- Firefox and Safari.
- A login of quarksCharm itself through ADFS (see docs/quarksup-api.md,
  §10).
- A change of the relay: the token still travels to the relay in the
  `Authorization` header as today.
- A token for another tenant than the one in the Connect screen.

## Capabilities

### New Capabilities
- `token-bridge`: the browser extension that reads the token of quarksUp
  and gives it only to quarksCharm.

### Modified Capabilities
- `token-session`: "Connect with tenant and token" uses the extension
  when it is present; "Re-authentication on 401 keeps state" asks the
  extension before it shows the prompt; a new requirement renews the
  token before it expires.

## Impact

- New: `extension/` (manifest, service worker, content script, a pure
  module with the logic of the service worker), unit tests for that
  module.
- App: `app/utils/session.ts` (token from the extension, renewal before
  expiry), a new client of the extension in `app/utils/`,
  `app/pages/connect.vue`, `app/components/TokenPrompt.vue`,
  `app/composables/useSession.ts`.
- Tests: unit tests for the client and the session; Playwright tests with
  a stub of the extension API on the page.
- Tooling: `extension/` in the lint and format scope;
  `scripts/vercel-ignore.js` skips the deploy when only `extension/`
  changes.
- README: install steps for the extension.
- No relay, design-system or dependency change.
