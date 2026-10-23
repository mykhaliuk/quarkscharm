## Why

The token bridge extension works in Chrome and Edge only. Colleagues who
use Firefox still copy the token from the DevTools of quarksUp and paste
it every hour.

## What Changes

- Firefox users connect to quarksCharm without a pasted token, and the
  session renews the token before it expires, as in Chrome.
- `bun run extension:firefox` builds the ignored folder
  `extension-firefox/` from `extension/`: a Firefox manifest and one more
  content script. `bun run extension:firefox:dev` builds a copy that also
  answers `localhost:3000`.
- Firefox has no `externally_connectable`. In Firefox, a content script
  on the quarksCharm page relays the requests of the page to the
  extension with `window.postMessage`.
- The app client finds the relay when `chrome.runtime` is absent.

## Non-goals

- A signed add-on on addons.mozilla.org. The user loads the folder as a
  temporary add-on; signing is a separate task.
- A change of the Chrome extension or of its channel.
- Safari.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `token-bridge`: a new requirement for Firefox.

## Impact

- Extension: `extension/page.js` (the relay, not used by Chrome),
  `extension/background.js` and `extension/content.js` use the
  `browser` namespace when it exists, `extension/core.js` gets the
  allowed page origins from the manifest.
- Tooling: `scripts/extension-firefox.js`, two `package.json` scripts,
  two ignored folders.
- App: `app/utils/token-bridge.ts` gets a second transport.
- Tests: unit tests for the Firefox manifest, the page origins and the
  relay transport; one Playwright test with a stub of the relay.
- README: install steps for Firefox.
