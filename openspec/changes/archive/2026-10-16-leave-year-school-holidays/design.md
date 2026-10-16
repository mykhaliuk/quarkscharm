## Context

See proposal.md for the motivation. Today one number, the calendar year,
drives the grid (`yearMonths`), the three data calls of the year store,
the cursor (`yearOf` in the cursor store) and the header label. The
holidays call (`planners/holidays`, see docs/quarksup-api.md §4) already
returns `schoolTerm: [{ area, holidays: [{ beginDate, endDate, label }] }]`
for every zone; the store keeps only `public`. The absence period
metadata (`metadata/absencePeriod`, already loaded by the who-is-off
store) gives `natureId`, `dateBegin` and `dateEnd` per period; for Fulll
the `CP` periods run from 1 June to 31 May and other natures use the
calendar year.

## Goals / Non-Goals

**Goals:**
- One place that answers "which leave year holds this day" and "which
  window and months make this leave year", used by the store, the cursor,
  the grid and the header.
- The grid shows at once, without waiting for the period metadata.

**Non-Goals:**
- A user setting for the start month.
- A change of the who-is-off column or of the counters.

## Decisions

### A leave year is the number of its first calendar year plus a start month
`year = 2026` with `startMonth = 6` means 2026-06-01 to 2027-05-31. Pure
helpers in `shared/utils/ymd.ts`: `leaveYearOf(ymd, startMonth)`,
`leaveYearWindow(year, startMonth)` and `leaveYearMonths(year,
startMonth)` (twelve `{ year, month, grid }` items). The label "2026–27"
is a formatter in `app/utils/format.ts`. With `startMonth = 1` the helpers
give the calendar year, so the old behavior is one value of the new one.

Rejected: a `{ from, to }` range object as the year key. A number keeps
`[`/`]`, `followYear` and the `data-year` attribute simple.

### The start month comes from the `CP` period, with June as the fallback
The app takes the natures (`reference === 'CP'`, as the brushes find
their natures by reference) and the periods, picks the `CP` period whose
`dateBegin`..`dateEnd` contains today and uses the month of `dateBegin`.
`useYear` starts with June, loads periods and natures, and reloads the
year only if the found month differs. For Fulll it never reloads.

Rejected: a constant 1 June. The project rule is to take tenant facts
from the API at runtime; another tenant can start its period in May or
in January. Rejected: "the period that is not a calendar year". It guesses
and breaks for a tenant with a calendar-year `CP` period.

The periods call moves from the who-is-off store to a shared loader so
both callers share one request.

### Planner windows split the leave year in two halves of six months
`planners/me` accepts at most 12 months; the store already asks two
halves. The halves become `[start, start + 6 months - 1 day]` and
`[start + 6 months, end]`. Requests (max 24 months) and holidays (max 18
months) take the whole window.

### School holidays are a separate map, not part of the muted days
The store keeps `schoolTerms: Map<area, Map<ymd, label>>`, built from the
answer and clipped to the window, both dates included (the API ends
"Vacances de Noël" on Sunday 2026-01-04). `isSelectable` does not read
it. The page passes `Map<ymd, label>` for the selected zone, or an empty
map when the toggle is off.

Rejected: put school days into `holidays`. That map makes a day muted and
non-selectable, and the school holidays are working days.

### Toggle and zone live in one preference
A composable `useSchoolHolidays` keeps `{ shown: boolean, area: string }`
under `qc.school` in localStorage, with `{ shown: false, area: 'Zone B' }`
as default, read and written through `app/utils/storage.ts` like the
theme. A component `SchoolToggle` (a toggle button with `aria-pressed`
and a `<select>` of the areas of the answer) sits in the header before
the theme toggle. `s` (`KeyS`) calls the same `toggle()`.

Rejected: one button that cycles Off → A → B → C. The owner asked for a
toggle with its own shortcut and a separate zone select.

### The school mark is a dot in the top right corner
`DayCell` gets a `school: string | null` prop and draws a 5px dot in a
child element at the top right; `::before` and `::after` are taken by the
today, focus, pending and selection marks. New token `cell-school`
(`{ink}` in both themes) with a `{surface}` 1px ring, the inverse of the
pending dot, so it reads on every nature fill and differs from the pending
dot by place and by colour. The token goes into `docs/design/tokens.json`
and the theme CSS; `ds:check` proves the parity.

Rejected: a cell background or border. The background carries the nature
fill and the holiday tint; a border clashes with today, cursor and
selection outlines.

### The header keeps the avatar only
The name `<span>` goes away; the avatar (or the initials) gets `title`
and `alt`/`aria-label` with the full name.

## Risks / Trade-offs

- [The `CP` period is missing or the call fails] → June fallback; the
  grid still works.
- [The start month changes after the first load] → one extra reload on a
  tenant that is not June-based; the user sees the grid redraw once.
- [The "Zone B" label changes in the API] → the select falls back to the
  first zone of the answer and keeps the stored value only if it exists.
- [The new token is added in the repo, not in Claude Design first] → the
  owner adds `cell-school` to the Claude Design artifact at the next
  export, or the next export drops it and `ds:check` fails.
- [Existing e2e and unit tests assume a calendar year] → update them in
  the same change; the fixtures already carry 2026 dates.

## Migration Plan

No stored data changes shape. `qc.school` is new. Rollback is a revert of
the merge.
