## 1. Connect screen

- [x] 1.1 `app/utils/tenant.ts`: `isTenant` with the tenant rule of the extension. Check: `tests/unit/tenant.test.ts`.
- [x] 1.2 `app/pages/connect.vue`: Connect checks the tenant before the extension request and before the token connect, and shows the tenant message. The automatic connect on mount does not change. Check: Playwright tests for an empty tenant and for a full host, with no extension request.

## 2. Gate

- [ ] 2.1 `bun run check` and `bunx playwright test` green; the owner presses Connect with an empty tenant and sees "Enter the tenant first.".
