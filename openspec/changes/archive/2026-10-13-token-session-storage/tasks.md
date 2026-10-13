## 1. Storage

- [x] 1.1 `app/utils/storage.ts`: an optional area argument (`'local'` default, `'session'`) on `readJson`, `writeJson`, `remove`. Check: unit test that the session area uses `sessionStorage` only.
- [x] 1.2 `app/utils/session.ts`: the token reads, writes and removals use the session area; `restore()` removes a legacy `localStorage` token. Check: unit tests for connect, forget, restore and the legacy token; Playwright forget-token test reads both storages.

## 2. Gate

- [x] 2.1 `bun run check` and `bunx playwright test` green; the owner confirms on localhost (reload keeps the token, a new tab asks for it).
