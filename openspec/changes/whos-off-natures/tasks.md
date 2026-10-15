## 1. Data

- [x] 1.1 `app/utils/qs/types.ts`: `RawPeriod` and an optional `periodId` on `RawSegment`. `app/utils/qs/api.ts`: `getPeriods` reads `org/organization/metadata/absencePeriod`. `app/utils/qs/map.ts`: `toColleague` takes a lookup from a segment to a nature. Check: unit tests for the mapper.
- [x] 1.2 `app/utils/whos-off-store.ts`: load the periods once, keep the raw planner employees per month, and apply the rule: period nature, else remote work for 3 days or less, else no nature. `OffEntry` gets `natureId` and `isRemote`; the store gives `remote` and `away`. Check: unit tests for a known period, an unknown period, a long absence, a late remote nature and failed periods.

## 2. Column

- [x] 2.1 `app/composables/useWhosOff.ts` gives the period call and the remote nature (reference `TT`). `app/components/WhosOff.vue` shows the two sections, the nature in "Off", a sticky column no higher than the window, and a scroll in each section. Check: Playwright test on the two sections.

## 3. Favorites

- [x] 3.1 `app/utils/qs/api.ts`: `getFavorites` reads `org/people/directories?pinned=true`. `app/utils/whos-off-store.ts`: load the favorites once, keep all employees of the planner, and list only the favorites. The status fails when the favorites fail. `app/components/WhosOff.vue`: a message when the user has no favorites. Check: unit tests for a hidden colleague, no favorites and failed favorites; Playwright tests for a favorite of another service and for no favorites.

## 4. Gate

- [ ] 4.1 `bun run check` and `bunx playwright test` green; the owner confirms on localhost.
