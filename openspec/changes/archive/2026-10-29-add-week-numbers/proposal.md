## Why

Colleagues plan absences and remote days by week ("I am off in week 44"),
and the quarksUp UI and team chats talk in ISO week numbers. The year grid
shows only days, so the user must count rows to find a week.

## What Changes

- Every row of every month grid shows its ISO 8601 week number in a narrow
  column on the left of Monday. The column is always visible; there is no
  toggle.
- A row that holds no date of the month (the trailing sixth row of a short
  month) shows no number.
- A week that crosses a month edge shows the same number in both months
  (for example week 53 at the end of December 2026 and at the start of
  January 2027).
- The week number is text only: it is not selectable, not paintable and
  not a stop for the keyboard cursor.
- Mechanism: a pure `isoWeek` helper in `shared/utils/ymd.ts`, used by
  `MonthGrid`.

## Non-goals

- No toggle and no stored preference for the column.
- No highlight of the current week; today's cell keeps its outline.
- No click on a week number to select or paint the whole week.
- No week numbers in the who-is-off column, the request card or the review
  panel.
- No locale-specific week rules (US Sunday-first weeks): the grid is Monday
  first and uses ISO 8601 only.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `absence-calendar`: a new requirement "Week numbers" for the month grids
  of the year grid.

## Impact

- `shared/utils/ymd.ts`: new `isoWeek(ymd)` export; unit tests in
  `tests/unit/shared/ymd.test.ts`.
- `app/components/calendar/MonthGrid.vue`: eighth grid column, a blank
  header cell above it, one week label per row.
- Layout: each month grows by one cell and one gap (22 px), the four-column
  year grid by 88 px.
- `e2e/calendar.spec.ts`: Playwright checks of the week labels.
- No API call, token, design-system token or stored preference changes.
