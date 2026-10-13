## Context

`app/utils/storage.ts` wraps `localStorage` with safe `readJson`,
`writeJson` and `remove`. The session store uses it for the tenant and the
token; the theme uses it for the preference.

## Decisions

### D1. One wrapper, two areas
The three functions take an optional area, `'local'` (default) or
`'session'`. The session store passes `'session'` for the token only.
- Rejected: a second wrapper module. It would copy the same error
  handling.

### D2. Remove the legacy token on restore
`restore()` removes `qc.token` from `localStorage` before it reads the
session one, so no token stays behind after the upgrade.

## Risks / Trade-offs

- [A colleague opens a second tab and must paste the token again] →
  accepted; it matches quarksUp.
