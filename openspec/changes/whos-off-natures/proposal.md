## Why

The service planner gives no `natureId` for the absences of other people.
But a segment of a paid leave has a `periodId`, and the metadata
`absencePeriod` gives the nature of every period of the tenant. Thus the
app can show the nature of most leave of colleagues. The owner asked for
it on 2026-10-15, and asked to show the colleagues on remote work apart
from the colleagues on leave.

Observed on 2026-10-15 for October 2026 in TECH: 62 of 566 segments of
colleagues had a `periodId`. A segment without a period is remote work,
sick leave, unpaid leave or a long leave. Most of them are short.

## What Changes

- The app loads `org/organization/metadata/absencePeriod` once, and finds
  the nature of a segment from its period.
- A segment without a period and with a duration of 3 days or less counts
  as remote work. The owner accepted that a short sick leave shows as
  remote work.
- The who-is-off column has two sections: "On remote today" and
  "Off today". The second section shows the nature of each absence, or
  "Absence" when the app does not know it.
- The column is never higher than the window. Each section scrolls on its
  own.

## Non-goals

- A call to `/times/v3/periods`. It returns 403 for the Employee role.
- A nature in the preview overlaps of the review panel.

## Capabilities

### Modified Capabilities
- `whos-off`: "Today list" has two sections and shows the nature.

## Impact

- Code: `app/utils/qs/types.ts` (`RawPeriod`, `periodId` on a segment),
  `app/utils/qs/api.ts` (`getPeriods`), `app/utils/qs/map.ts`
  (`toColleague` takes a nature lookup), `app/utils/whos-off-store.ts`,
  `app/composables/useWhosOff.ts`, `app/components/WhosOff.vue`.
- Tests: unit tests for the mapper and the store; a Playwright check on
  the two sections.
- The relay allow-list already permits `org/organization/metadata/...`. No
  design-system or dependency change.
