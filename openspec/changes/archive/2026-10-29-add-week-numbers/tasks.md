## 1. ISO week

- [x] 1.1 `shared/utils/ymd.ts`: export `isoWeek(ymd)` (Thursday rule, built on `addDays`, `weekday`, `daysBetween`). Check: unit tests in `tests/unit/shared/ymd.test.ts` for 2026-10-12 → 42, 2026-01-01 → 1, 2025-12-29 → 1, 2026-12-31 → 53, 2027-01-01 → 53, 2027-01-04 → 1, 2021-01-03 → 53 and a Sunday that ends a week (2026-10-18 → 42).

## 2. Month grid

- [x] 2.1 `app/components/calendar/MonthGrid.vue`: eighth leading grid column of `var(--cell-size)`, a blank `aria-hidden` header cell, one week label per row from the first non-null date (`title` and `aria-label` "Week N", `data-week`), no label for an all-`null` row, no mouse handler; style from `.wd` tokens only. Check: `bun run ds:check` and `bun run typecheck`.
- [x] 2.2 Playwright spec in `e2e/calendar.spec.ts`: with today fixed to 2026-10-12, October 2026 shows 40–44 and an empty sixth row; December 2026 ends with 53, January 2027 starts with 53 then 1; the label of the 2026-10-12 row has the title "Week 42"; a click on a week label adds no day to the selection. Check: `bunx playwright test e2e/calendar.spec.ts`.

## 3. Gate

- [x] 3.1 Existing unit and e2e tests (keyboard, paint, school) stay green with the extra column; `bun run check` and `bunx playwright test` green; the owner confirms the layout on localhost:3000 at their desktop width.
