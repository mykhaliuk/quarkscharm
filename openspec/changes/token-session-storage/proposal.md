## Why

The token is a bearer credential for one hour. Today it stays in
`localStorage` after the tab closes, so a person who later uses the same
browser profile can read it. quarksUp itself keeps its tokens in
`sessionStorage`, which the browser drops when the tab closes.

## What Changes

- The token moves from `localStorage` to `sessionStorage`. The tenant and
  the UI preferences stay in `localStorage`.
- On load, the app removes a token that an older version left in
  `localStorage`.
- **BREAKING**: a new tab or a reopened browser asks for the token again.
  A reload of the same tab keeps it.

## Non-goals

- A login through ADFS or a refresh of the token.
- A Content Security Policy. It is a separate hardening step.

## Capabilities

### Modified Capabilities
- `token-session`: "Browser-only storage" — the token lives in the tab
  session only.

## Impact

- Code: `app/utils/storage.ts` (a storage area argument),
  `app/utils/session.ts`.
- Tests: unit tests for the storage area and the session; the forget-token
  Playwright test reads both storages.
- No API, relay, design-system or dependency change.
