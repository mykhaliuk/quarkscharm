## 1. Data

- [ ] 1.1 `app/utils/qs/types.ts`: optional `periodId` on `RawSegment`. `app/utils/qs/map.ts`: `toColleague` takes a lookup from period to nature and uses it when `natureId` is null. Check: unit tests for a known period, an unknown period and a missing period.
- [ ] 1.2 `app/utils/whos-off-store.ts`: keep the raw planner employees per month and map them with the lookup, so the natures appear when the entitlements load after the planner. `OffEntry` gets `natureId`. Check: unit test that loads the entitlements after the planner.

## 2. Column

- [ ] 2.1 `app/composables/useWhosOff.ts` gives the lookup from the entitlements store. `app/components/WhosOff.vue` shows a swatch and the nature label for an entry with a nature. Check: Playwright test on the column.

## 3. Gate

- [ ] 3.1 `bun run check` and `bunx playwright test` green; the owner confirms on localhost.
