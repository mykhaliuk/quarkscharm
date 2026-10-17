## 1. Leave year

- [x] 1.1 `shared/utils/ymd.ts`: `leaveYearOf`, `leaveYearWindow`, `leaveYearMonths`; `app/utils/format.ts`: `formatLeaveYear` ("2026–27"). Check: unit tests for a June start (Oct, Mar, 31 May, 1 June), a January start (calendar year) and the label.
- [x] 1.2 `app/utils/year-store.ts`: a `startMonth` dependency; requests and holidays over the window, planner in two six-month halves. Check: unit tests on the call dates for a June start.
- [x] 1.3 Start month from the `CP` period: a shared periods loader used by `useYear` and the who-is-off store; a pure picker (natures + periods + today → month, June fallback); `useYear` reloads only when the month differs. Check: unit tests for the picker (found, missing, failed) and the who-is-off store tests stay green.
- [x] 1.4 `app/utils/cursor-store.ts`: leave year of a day via the dependency; `followYear` keeps working. Check: unit tests for 31 May → 1 June, 1 June → 31 May and 31 Dec → 1 Jan inside the year.
- [x] 1.5 `YearGrid`/`MonthGrid` render the twelve months of the leave year with the right month names; `AppHeader` shows the label. Check: Playwright test on the first and last month and on the label after `]`.

## 2. School holidays

- [x] 2.1 `app/utils/year-store.ts`: `schoolTerms` per area, both dates included, clipped to the window; `isSelectable` ignores them. Check: unit tests for a term across the window edge and for a selectable school day.
- [x] 2.2 `useSchoolHolidays` composable: `{ shown, area }` under `qc.school`, default `{ false, 'Zone B' }`, fallback to the first area of the answer. Check: unit tests for default, restore and missing area.
- [x] 2.3 Tokens: `cell-school` in `docs/design/tokens.json`, `theme-light.css`, `theme-dark.css`. Check: `bun run ds:check`.
- [x] 2.4 `DayCell` `school` prop with the top-right dot and the label in the accessible name; grids pass the map; the page tooltip joins public and school labels. Check: component unit test on the dot and the accessible name.
- [x] 2.5 `SchoolToggle` in the header (toggle with `aria-pressed`, zone select); `s` key; shortcut sheet row. Check: Playwright test for default off, toggle on with Zone B, zone change, `s`, reload keeps the choice and the tooltip.

## 3. Header

- [x] 3.1 `AppHeader`: no name text; `title` and accessible name on the avatar or initials. Check: Playwright test in `e2e/connect.spec.ts` or `calendar.spec.ts` updated.

## 4. Gate

- [x] 4.1 Existing unit and e2e tests updated for the leave year; `bun run check` and `bunx playwright test` green; the owner confirms on localhost.
