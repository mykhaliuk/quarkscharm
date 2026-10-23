## Why

When the tenant field on the Connect screen is empty, Connect still sends
the request to the token bridge extension. The extension refuses a tenant
that is not in the tenant format and answers `failed` at once. The screen
then shows "The extension did not give a token", and the user does not
know that the tenant is the problem.

## What Changes

- The Connect screen checks the tenant before it sends a request to the
  extension or to quarksUp. The tenant must be 2 to 32 lowercase letters,
  digits or hyphens, the same rule as in the extension.
- An empty tenant gives "Enter the tenant first.". A tenant in another
  format gives a message that tells the format.
- The automatic connect when the Connect screen opens does not change.

## Non-goals

- A change of the extension.
- Normalization of the typed tenant (lowercase, removal of
  `.quarksup.net`).

## Capabilities

### Modified Capabilities
- `token-session`: "Connect with tenant and token" — the screen refuses a
  missing or malformed tenant before any request.

## Impact

- App: `app/utils/tenant.ts` (new), `app/pages/connect.vue`.
- Tests: `tests/unit/tenant.test.ts`, two Playwright tests in
  `e2e/bridge.spec.ts`.
