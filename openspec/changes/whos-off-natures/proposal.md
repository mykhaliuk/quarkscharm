## Why

The service planner gives `natureId: null` for the absences of other
people. But each of their segments has a `periodId`, and an entitlement
period belongs to exactly one nature. The user's own entitlements give
the nature of each period of the user's agreement. Thus the app can show
the nature of most paid leave of colleagues on the same agreement. The
owner asked for it on 2026-10-15.

Observed on 2026-10-15 for October and November 2026: 205 of 1573
segments of colleagues had a `periodId`. 185 of them had a period of the
user's own entitlements.

## What Changes

- The who-is-off column shows the nature of a colleague's absence when
  the period of the segment is one of the user's entitlement periods.
- Other absences stay without a nature, as before. Télétravail and sick
  leave have no period, so the app cannot know them.

## Non-goals

- A guess from a period that the user's entitlements do not contain.
- A call to `/times/v3/periods`. It returns 403 for the Employee role.
- A nature in the preview overlaps of the review panel.

## Capabilities

### Modified Capabilities
- `whos-off`: "Today list" shows the nature when the period gives it.

## Impact

- Code: `app/utils/qs/types.ts` (`periodId` on a segment),
  `app/utils/qs/map.ts` (`toColleague` takes a period lookup),
  `app/utils/whos-off-store.ts`, `app/composables/useWhosOff.ts`,
  `app/components/WhosOff.vue`.
- Tests: unit tests for the mapper and the store; a Playwright check on
  the column.
- No relay, design-system or dependency change.
