## Context

See proposal.md for motivation. Constraints that shape the design:

- quarksUp answers `access-control-allow-origin: https://<tenant>.quarksup.net`
  only, so a browser on our origin cannot call it directly. Some server-side
  relay is unavoidable.
- Authentication is an ADFS-issued bearer JWT (1 h) that the quarksUp SPA
  keeps in `sessionStorage`; there is no cookie we could piggy-back on. The
  user copies the token from DevTools.
- The API is documented (OpenAPI 3.0.3, French descriptions, loosely typed)
  and every call the product needs was captured live from the Fulll tenant:
  `docs/quarksup-api.md` holds the endpoint mapping, request/response shapes,
  the half-day encoding and the reference data.
- Deployment target is Vercel serverless functions (10 s limit on the hobby
  tier); the service planner response is 400 KB per month.
- The repository is public: no tenant, employee or absence data in code, no
  captured responses committed.

## Goals / Non-Goals

**Goals:**

- Every piece of quarksUp knowledge lives in one typed client module plus
  pure domain functions, both unit-tested without network.
- The server is dumb, small and auditable: it cannot be used as an open
  relay and never persists or logs a credential.
- The UI survives token expiry and partial failures without losing the
  user's selection.
- Quality gates (lint, format, typecheck, unit, DS parity, e2e, spec) run on
  every push to `main` and on PRs.

**Non-Goals:**

- Abstracting over a second HR backend. The domain layer is shaped by
  quarksUp's model (requests, segments, natures, entitlements) on purpose.
- Offline mode or a PWA: the app is useless without the live API.

## Decisions

### Thin allow-listed proxy, domain in the browser

One Nitro route, `server/api/qs/[...path]`, forwards method, query, JSON
body and the `Authorization` header to quarksUp and streams the response
back with `cache-control: no-store`. The allow-list is a small table of
`{ host pattern, path prefix }`: `api.quarksup.net/times/v3/`,
`api.quarksup.net/people/v3/`, `service-<tenant>.quarksup.net/api/v2/organization/`,
`service-<tenant>.quarksup.net/api/v2/people/` with `<tenant>` matching
`^[a-z0-9-]{2,32}$`. Anything else is 403 before any network call.

All composition happens in the browser: a `qs` client module (one function
per endpoint, typed from the captured shapes) and pure functions in
`shared/` (segment ↔ day-slot conversion, range building, status mapping).
Composables hold screen state.

Rejected: a per-use-case server layer (`/api/year`, `/api/absences`). It
would double the code, move testable logic behind a network boundary, and
gain nothing without a database. The quarksUp SPA itself fans out 10+
parallel requests from the browser; we mirror that.

### The proxy forwards the token, never reads it

The client sends `Authorization: Bearer …` exactly as the user pasted it.
The server validates nothing about the token (no signature check, no claim
parsing) and attaches no identity of its own. A bad token yields quarksUp's
401, which the client turns into the re-authentication state.

Rejected: storing the token server-side keyed by a session cookie. It would
require state, make the public Vercel URL a credential store, and buy
nothing: the token lives one hour either way.

### Browser storage split

`localStorage`: tenant, token, UI preferences (year, theme, nature
short-list order). In memory only: everything fetched from quarksUp,
including colleagues' names and avatars. A page reload refetches. Reads and
writes to `localStorage` are wrapped (private mode, blocked storage) and
the app runs with an empty store.

### Dates are wall-clock strings, never `Date` arithmetic

quarksUp returns the same instant as `2026-10-12T00:00:00.000Z` on one
endpoint and `2026-10-12T00:00:00+02:00` on another; both mean "that day
in Europe/Paris". The domain keeps `YYYY-MM-DD` plus `am`/`pm` flags, reads
API dates by their first 10 characters and the hour (`00`, `12`, `13`,
`23`), and writes API dates as `${date}T${hh}:00:00Z`. Calendar maths
(month grids, weekday of a date, range expansion) runs on a tiny set of
pure helpers over `YYYY-MM-DD` with `Date.UTC`, so no DST surprise and no
date library.

### Segments and day slots

A request's segment covers whole days (`T00→T23`), a morning (`T00→T12`) or
an afternoon (`T13→T23`). `segmentsToSlots` expands segments to a
`Map<YYYY-MM-DD, { am, pm }>`; `slotsToRanges` groups a selection into
maximal runs of consecutive calendar days with the same nature, where a run
may start with a `pm`-only day and end with an `am`-only day, and inner
days are full. One run → one quarksUp request (`beginDate`/`endDate` with
the matching hours, `duration` from preview). Weekends, holidays and
non-working dates inside a run are allowed (quarksUp skips them in
`duration`); the UI prevents selecting them to avoid confusion.

### Preview is the source of truth for a range

Before submission every range is sent to `GET /requests/preview`. Its
`segments[].duration`, `natures[].entitlement.id`, `warnings`,
`conflictingEvents` and `overlappingRequests` feed the review panel. The
POST body reuses the previewed `duration` and `entitlementId`; the app does
not compute working days itself.

### Nature brush before selection

The user picks a nature (chip row: short-list from `absenceNature`
filtered to the natures `preview.natures` returned at least once this
session, defaulting to TT / Fulll Off / CP) and then paints days. Painting
with another brush over a painted day replaces its nature. This replaces
the old "select days, then choose a type" flow and makes the grid show the
outcome immediately.

### Confirmation for cancel, inline

The request card's "Cancel" turns into "Cancel TT 22–23 Oct? [Yes] [No]"
for five seconds; only "Yes" calls the workflow. No modal, no undo: the
server has no undo and faking one would lie.

### Design system pipeline

Authored in Claude Design as a dedicated design system (no overlap with any
other project). The exported `_ds_manifest.json` is committed under
`docs/design/`; `assets/css/tokens.css`, `theme-light.css`,
`theme-dark.css` hold the only raw literals; `scripts/ds-check.js` enforces
token parity and "no raw hex in `.vue`". One prototype screen (year grid +
review panel) is authored alongside for reference only; it is not checked
in CI. Nature colours are a categorical palette in the manifest keyed by
nature `reference` (`TT`, `FOFF`, `CP`, `CETCP`, `CETFOFF`, `OTHER`), with
light and dark variants that keep AA contrast on the day cell.

### Tests and CI

- `bun test` for `shared/` and the `qs` client mapping, with fixture files
  that mirror captured shapes but carry synthetic values.
- Playwright against the built app with `page.route('**/api/qs/**')`
  returning fixtures: connect, paint and review, submit with one failing
  range, cancel confirmation, token-expiry modal. No real quarksUp in CI.
- GitHub Actions on push and PR: `lint`, `fmt:check`, `typecheck`
  (vue-tsc), `test:unit`, `ds:check`, `spec:check`, `build`, `test:e2e`.
- Vercel Git integration: `main` → production. PR preview deployments are
  Vercel's default and cost nothing; they are not a staging environment and
  carry no separate configuration.

## Risks / Trade-offs

- [Token in `localStorage` on a shared machine] → the Connect screen states
  it plainly and offers "Forget token"; the token expires in one hour
  anyway.
- [quarksUp changes an internal endpoint] → all knowledge is in one client
  module and one fixture set; `absence-beta: true` is sent as the SPA does,
  and the vendored OpenAPI pins what we relied on.
- [400 KB planner through a serverless function] → one month at a time,
  fetched after the user's own data, with `thumbnails=small`; measured
  before adding any prefetch.
- [Open proxy abuse] → allow-list by host and path prefix, tenant pattern,
  no credentials of our own, so an attacker gains nothing they could not
  get by calling quarksUp directly with their own token.
- [User paints a range the API splits differently] → the review panel shows
  quarksUp's own split and duration before submit; the grid re-renders from
  the server state after.
- [Partial failure on batch submit] → each range is its own request;
  successes leave the selection, failures stay with their message, resubmit
  sends only what is left.

## Migration Plan

Greenfield. First deploy happens when the Connect screen and the proxy
work; every later task ships to production on merge. Rollback is
`git revert` plus Vercel's instant rollback to the previous deployment.

## Open Questions

- Whether `entitlements/tsa` returns the time savings account balance in the
  same shape as `entitlements` (the capture returned an empty list for the
  author). The counter is rendered from the same projection; if the shape
  differs it is a one-function fix behind a fixture.
