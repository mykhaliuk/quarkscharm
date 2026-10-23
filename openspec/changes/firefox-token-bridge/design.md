## Context

See proposal.md. The Chrome extension is described in the archived
change `2026-10-15-token-bridge-extension` (D1–D9). Firefox (128 ESR and
later) supports Manifest V3, `storage.session` and the `browser`
namespace with promises, but:

- it has no `externally_connectable`, so a web page cannot send a
  message to an extension;
- it does not accept a `service_worker` background, only
  `background.scripts` (an event page);
- it ignores the manifest `key` and takes the id from
  `browser_specific_settings.gecko.id`;
- it installs an unsigned add-on only as a temporary add-on, which goes
  away when Firefox restarts.

## Goals / Non-Goals

**Goals:**
- One source folder and one `core.js` for both browsers.
- The Chrome extension stays as it is.

**Non-Goals:**
- A build step for Chrome.
- Signing for Firefox (later task, needs the AMO keys of the owner).

## Decisions

### F1. Generate the Firefox folder from `extension/`
`scripts/extension-firefox.js` copies `extension/` to
`extension-firefox/` and writes a Firefox manifest made by the pure
function `firefoxManifest(manifest)`:

- drops `key` and `externally_connectable`;
- sets `background.scripts` instead of `background.service_worker`;
- sets `browser_specific_settings.gecko.id` and
  `strict_min_version: 128.0`;
- adds a content script `page.js` on the origins that
  `externally_connectable.matches` listed.

`--dev` applies `devManifest` first, so the dev copy also relays
`localhost:3000`, as in Chrome.

Rejected: one manifest for both browsers. Chrome and Firefox each warn on
the keys of the other, and the relay content script would also run in
Chrome for nothing. Rejected: a second committed folder with a copy of
`core.js` — two copies drift.

### F2. A relay content script on the quarksCharm page
`extension/page.js` runs at `document_start` on the quarksCharm origins
only, so its listener is there before the scripts of the page run. It
listens for `message` events where `event.source === window`, the origin
is the page origin and the data is `{ source: 'quarkscharm', type:
'token', id, tenant }`. It posts `{ source: 'quarkscharm-bridge', id,
type: 'received' }` at once, sends `{ type: 'token', tenant }` to the
background with `runtime.sendMessage`, and posts `{ source:
'quarkscharm-bridge', id, type: 'answer', answer }` back. Both posts go to
the page origin only.

The background accepts a `token` message only from its own content
script on a page whose origin the manifest lists for `page.js`.

The Chrome design rejected `postMessage` (D2) because any script on the
page could read the answer. In Firefox there is no other channel. The
exposure is the same as in Chrome: any script on the quarksCharm origin
can also call `chrome.runtime.sendMessage` there, and the app keeps the
token in the session storage of that origin. `postMessage` to the page
origin keeps frames of other origins out.

Rejected: a mark on `<html>` set by the relay, so that the app knows the
relay is there. At `document_start` the `<html>` element can be absent
(Playwright init scripts showed it), so the mark is not reliable.
Rejected: `exportFunction` into the page. It is Firefox only and passing
promises across compartments needs more code than the relay.

### F3. The app client keeps one result type
`app/utils/token-bridge.ts` keeps `createBridgeClient({ runtime })`.
A new adapter `relayRuntime(window)` gives the same `BridgeRuntime`
shape over `postMessage`, with a random request id per call. When no
`received` comes within 500 ms, it sets `lastError` as Chrome does for
an unknown extension, so the client answers `absent`.
`browserRuntime()` picks `chrome.runtime` first, else the relay.

### F4. `browser` before `chrome` in the extension
`background.js`, `content.js` and `page.js` use
`globalThis.browser ?? globalThis.chrome`. In Firefox the `browser`
namespace returns promises; Chrome keeps `chrome`. The background takes
the sender origin from `sender.url`, because Firefox does not set
`sender.origin` in all versions.

## Risks / Trade-offs

- [A temporary add-on goes away when Firefox restarts] → README says so;
  AMO signing is the follow-up.
- [The relay listener stays when the extension never answers] → The
  client gives up after 35 s; one listener per lost request, only while
  the page is open.
- [Without any extension, Connect waits 500 ms more before it asks for
  a paste] → Accepted; the relay answers `received` at once when it is
  there.

## Migration Plan

- Release: merge to `main`. Chrome users change nothing. Firefox users
  run `bun run extension:firefox` and load
  `extension-firefox/manifest.json` in `about:debugging`.
- Rollback: revert the merge commit.
