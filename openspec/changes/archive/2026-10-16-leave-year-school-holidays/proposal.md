## Why

The organization counts paid leave from 1 June to 31 May, but the
calendar shows a calendar year. The user must switch years to see one
leave period. quarksUp also shows the school holidays of a zone, and the
holidays call of quarksCharm already returns them, but the app drops
them. The name next to the avatar in the header tells the user nothing
new. The owner asked for these three changes on 2026-10-16.

## What Changes

- The calendar shows a leave year: twelve months from the start of the
  paid-leave period (June for Fulll) to the month before it. The header
  reads "2026–27". `[`, `]` and a cursor motion past the edge go to the
  previous or next leave year. The requests, planner and holidays calls
  use the window of the leave year.
- The app finds the start month in the `absencePeriod` metadata: the
  period of the nature with the reference `CP` that contains today. If
  the app cannot find it, the start month is June.
- A toggle shows the school holidays of one zone. A select next to it
  picks the zone; the options come from the holidays call. The toggle is
  off by default; the zone is "Zone B" by default. `s` switches the
  toggle. The browser keeps both values.
- A school holiday day shows a dot in the top right corner. The day
  stays selectable. Its hover tooltip and its accessible name give the
  holiday label and the zone.
- The header shows only the avatar. The full name moves to the avatar's
  `alt` and `title`.

## Non-goals

- The school holidays of more than one zone at a time.
- A country other than France.
- A zone found from the address of the user or of the establishment.
- A leave year that starts on a day other than the 1st of a month.
- A change of the counters: they already follow the periods of the API.

## Capabilities

### Modified Capabilities
- `absence-calendar`: "Year grid" shows a leave year; new requirement
  "School holidays"; new requirement "Header identity".
- `calendar-keyboard`: "Motions" crosses the leave-year edge; new
  requirement "School holidays key"; "Shortcut sheet" lists `s`.
- `token-session`: "Connect with tenant and token" shows the avatar
  without the name.

## Impact

- Code: `shared/utils/ymd.ts` (leave-year window and months),
  `app/utils/year-store.ts` (windows, school terms),
  `app/composables/useYear.ts` (start month from periods and natures),
  `app/utils/cursor-store.ts` (leave year of a day),
  `app/components/AppHeader.vue`, `app/components/calendar/*`, a new
  school-holidays toggle component and composable, `app/pages/index.vue`
  (tooltip, `s` key), `app/components/ShortcutSheet.vue`.
- Design system: new tokens for the school-holiday dot in
  `docs/design/tokens.json` and the theme CSS, checked by `ds:check`.
- API: no new endpoint. `planners/holidays` and `metadata/absencePeriod`
  are already called.
- Tests: unit tests for the leave-year helpers, the year store, the
  cursor store and the preference; Playwright checks for the grid, the
  toggle, the `s` key and the header.
