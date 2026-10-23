## 1. Extension

- [x] 1.1 `extension/core.js`: `pageOrigins(manifest)` gives the origins of `externally_connectable.matches`, else of the content script `page.js`. Check: `tests/unit/extension-core.test.ts`.
- [ ] 1.2 `extension/page.js`: the relay of F2. `background.js`: a `token` message from its own relay on an allowed origin goes to `onRequest`. `background.js` and `content.js` use `browser ?? chrome`. Check: `bun run lint`, and a manual run in Chrome that still connects.
- [x] 1.3 `scripts/extension-firefox.js` with `firefoxManifest`, `--dev`; `extension:firefox` and `extension:firefox:dev` scripts; both folders ignored. Check: `tests/unit/extension-dev.test.ts` and `bunx web-ext lint` on the built folder.

## 2. App client

- [x] 2.1 `app/utils/token-bridge.ts`: `relayRuntime(window)` and the pick order of F3. Check: unit tests with a fake window (answer, request id match, other sources ignored), and a Playwright test with a stub of the relay.

## 3. Docs and gate

- [x] 3.1 README: Firefox steps (build, `about:debugging`, temporary add-on). Check: the steps load the add-on in Firefox.
- [ ] 3.2 `bun run check` and `bunx playwright test` green; the owner connects in Firefox without a paste.
