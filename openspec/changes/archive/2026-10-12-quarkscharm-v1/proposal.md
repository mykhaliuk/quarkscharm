## Why

Fulll moved its HR tooling from Factorial to quarksUp in 2026. The quarksUp UI
takes a wizard per absence (dates → period → split → submit) and shows one
month at a time, so planning a year of télétravail or a batch of congés is
dozens of clicks. The old personal helper (factorial-dayoff: year calendar,
batch add, counters, who is off) died with Factorial. quarksCharm brings that
workflow back on top of the quarksUp Times API, for the author and any
colleague with their own token.

## What Changes

- A desktop web app with two screens: Connect (tenant + bearer token) and the
  year calendar.
- Year calendar of the user's own absences with half-day resolution, public
  holidays, non-working days and request status.
- "Paint" creation: pick an absence nature, paint days or half days on the
  grid, review each range with quarksUp's own preview (duration, balance
  after, warnings, colleagues off), submit all ranges in one action.
- Change an existing request (dates or nature) and cancel it, cancel always
  behind an explicit confirmation.
- Balances in the header (congés payés, Fulll Off, time savings account when
  present) with the projected balance after the current selection.
- Who is off: the user's service for today or any clicked day.
- Keyboard shortcuts for year navigation, nature brush, clear and submit.
- A stateless Nitro proxy that forwards allow-listed quarksUp calls with the
  user's bearer, because quarksUp's CORS policy only allows its own origin.
- Own design system (Claude Design → exported manifest → token-only CSS,
  checked in CI).
- Repository plumbing: Nuxt 4 app, bun, oxlint/oxfmt, vue-tsc, bun test,
  Playwright, GitHub Actions, Vercel production deploys from `main`.

## Capabilities

### New Capabilities

- `token-session`: how a user connects (tenant + pasted token), what is
  stored where, token expiry display, re-authentication on 401.
- `qs-proxy`: the server-side relay to quarksUp: allow-list, header
  forwarding, no caching, no logging of credentials or bodies.
- `absence-calendar`: the year view of the user's own absences, holidays,
  non-working days, statuses and the request card.
- `absence-requests`: creating, changing and cancelling absence requests,
  including preview, partial-failure handling, confirmation and shortcuts.
- `balances`: entitlement counters and the projection after a selection.
- `whos-off`: colleagues of the user's service who are off on a given day or
  range.

### Modified Capabilities

None (first change in the repository).

## Non-goals

- Token refresh, OIDC login, multi-account: the user pastes a token and owns
  its one-hour lifetime.
- Any server-side state: no database, no sessions, no caching of quarksUp
  data.
- Manager features (team planner, validation), time savings account
  transfers, salary certificates, documents on requests.
- Showing *why* a colleague is off: quarksUp hides the nature of other
  people's absences from the Employee role; only "off" is shown.
- Mobile layout beyond "does not break"; the product is a desktop planner.
- Weekday patterns ("every Tuesday until December") and a colleagues
  timeline: planned as the next change.
- Staging environment or feature flags: `main` deploys to production.

## Impact

- New repository content: Nuxt app (`app/`, `server/`, `shared/`), design
  tokens (`assets/css/`), docs (`docs/quarksup-api.md`, design-system
  export), CI workflow, Vercel project.
- External dependency: quarksUp Times API v3 and organization API v2, used
  with the user's own credentials; the official OpenAPI document is vendored
  as reference.
- No impact on quarksUp data beyond what the user does by hand today: the
  same create/update/cancel workflows, same permissions.
