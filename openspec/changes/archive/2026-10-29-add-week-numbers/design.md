## Context

`MonthGrid.vue` draws a CSS grid of seven `var(--cell-size)` columns: one
row of weekday letters, then the six rows of `monthGrid(year, month)` from
`shared/utils/ymd.ts`. Each row is an array of seven `Ymd | null`; a short
month has an all-`null` sixth row. All date maths in `ymd.ts` is UTC-based
on `YYYY-MM-DD` strings, with `weekday()` already Monday = 0. No call to
quarksUp is involved (see proposal.md - Impact).

## Goals / Non-Goals

**Goals:**
- One pure, unit-tested ISO week function next to the other `Ymd` helpers.
- The week column aligns with the day rows without a second layout system.

**Non-Goals:**
- No change to `DayCell`, the cursor store, the selection store or the
  shortcuts.
- No new design-system token.

## Decisions

### `isoWeek(ymd)` in `shared/utils/ymd.ts`

Take the Thursday of the date's week (`addDays(ymd, 3 - weekday(ymd))`);
the week number is `floor(daysBetween(<Thursday's year>-01-01, Thursday) /
7) + 1`. It reuses `addDays`, `weekday` and `daysBetween`, so it stays in
UTC and has no time-zone trap.

Rejected: `Intl.DateTimeFormat` / `Intl.Locale#getWeekInfo`. `Intl` has no
ISO week number field, and `getWeekInfo` gives only the first day and the
minimal days, not the number. A date library (date-fns `getISOWeek`) adds
a dependency for five lines.

### Week of a row = week of its first non-null date

The component takes the first date of the row that is not `null`. An
all-`null` row gets no number. All dates of one row share the same ISO
week because the grid is Monday first, so any date of the row gives the
same answer.

### Eighth column in the same CSS grid

`grid-template-columns` becomes `var(--cell-size) repeat(7,
var(--cell-size))`: a blank header cell before the weekday letters, then
one `<span class="wk">` before each row of `DayCell`s. The label reuses
the `.wd` look (11 px, `var(--ink-3)`), with `title` and `aria-label`
"Week N" and a `data-week` attribute for Playwright. It has no mouse
handler, so the painting and selection code never sees it.

Rejected: a separate flex column next to the grid. It needs its own row
heights and gaps that must track `--cell-size` and `--cell-gap`; one grid
keeps the alignment free.

Rejected: a column narrower than a cell (new token). It would save about
6 px per month but needs a design-system export change for a cosmetic
gain.

## Risks / Trade-offs

- [The year grid grows by 88 px (4 × (cell + gap)) inside the `1fr` middle
  column of `.planner`] → check the layout at the owner's usual desktop
  width on localhost before merge; if it is too tight, the fallback is a
  narrower column with a new token (decision above), not a change of the
  four-month row.
- [A screen reader now reads one extra item per row] → the label carries
  "Week N", so the extra item is meaningful; the blank header cell is
  `aria-hidden`.
- [Week 53 shows up only in some years (2026 is one)] → the unit tests
  cover a 53-week year, the 1 January in week 53 and the 29–31 December in
  week 1.

## Migration Plan

Pure front-end; ships with the merge to `main`. Rollback is a revert of
the commit. No stored state.
