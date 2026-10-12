## 1. Key reading

- [x] 1.1 `app/utils/shortcuts.ts`: dispatch on `event.code` plus `event.shiftKey` (binding keys like `KeyJ`, `Shift+KeyJ`, `Space`, `Shift+Slash`), keep the editable-target skip, the paused state, and let `Enter` and `Space` reach a focused button or link; prevent the default only for a handled key. Move the existing bindings (`KeyT`, `KeyF`, `KeyC`, `Escape`, `Enter`) to codes. Check: unit tests in `tests/unit/shortcuts.test.ts` for a Russian-layout event (`key: 'о'`, `code: 'KeyJ'`), the Shift variant, Space on a button, and the paused state.

## 2. Cursor and motions

- [x] 2.1 `shared/utils/ymd.ts`: `moveMonth(ymd, n)` keeping the day and clamping to the month's last day. Check: unit tests for 31 Jan + 1, 31 Mar − 1, 10 Mar + 4, 15 Nov + 4 across the year.
- [x] 2.2 Cursor store `app/utils/cursor-store.ts` + `app/composables/useCursor.ts`: `cursor` starts on today, `moveTo(ymd)`, `byDays(n)`, `byMonths(n)`, `today()`; a result in another year calls the year switch dependency. `useWhosOff` reads the cursor instead of its own `focusDate`. Check: unit tests for the year-edge call and for the who-is-off store following the cursor.
- [x] 2.3 Design token `cell-cursor` in `docs/design/tokens.json`, `bun run ds:sync`, `DayCell.vue` prop `cursor` with the outer 2 px ring and an `aria-label` with date, nature and status; `MonthGrid`/`YearGrid` pass it. Check: `bun run ds:check` green; DayCell unit test for the class and the accessible name.
- [x] 2.4 Page bindings in `app/pages/index.vue`: `h j k l`, arrows, `Shift+H/J/K/L`, `.`, `[`, `]`; remove the arrow bindings from `AppHeader.vue`; a click on a day moves the cursor; scroll the cursor cell into view after a key motion. Check: Playwright `e2e/keyboard.spec.ts` — `j` from 28 Oct lands on 4 Nov, `l` on 31 Dec shows 2027, `]` switches the year, the who-is-off column follows the cursor; update `e2e/calendar.spec.ts` and `e2e/whos-off.spec.ts` for the removed arrow-year and Alt-click rules.

## 3. Paint and request keys

- [x] 3.1 `Space`, `a`, `p` paint at the cursor through `paintDay` / `paintHalf`; without a brush they highlight the chip row. Check: Playwright — Space paints a free day and the panel lists it, Space on a Saturday paints nothing, `p` paints the afternoon only.
- [x] 3.2 Range mode: `v` anchors, the grid outlines anchor..cursor, `Space` calls `paintRange` and closes, `Escape` / `v` close without paint. Check: Playwright — `v` on Mon 2 Nov, `4×l`, `Space` paints five days as one run.
- [x] 3.3 `e` starts the change, `x` opens the card with the cancel confirmation, `Enter` on a request day opens the card instead of submitting. Check: Playwright in `e2e/change.spec.ts` and `e2e/cancel.spec.ts` for `e` and `x`; `e2e/paint.spec.ts` for Enter on a request day.

## 4. Undo and redo

- [x] 4.1 Selection store: snapshot stack of 10 (paint map + editing id) pushed before `paintDay`, `paintHalf`, `paintRange`, `removeRun` and `clear` (a drag paints once, at the release); `undo()` restores; reset on `loadRequest`, year change, submit success and leaving change mode. Check: unit tests — undo a paint, undo a drag as one step, depth 10 after 12 actions, reset on year change.
- [x] 4.2 Bind `u`. Check: Playwright — paint a day, `u`, the panel is empty.
- [x] 4.3 Redo: a redo stack of 10 filled by `undo()`, emptied by a new paint action and by every history reset; bind `U`. Check: unit tests for redo and its reset; Playwright — paint, `u`, `U`, the panel lists the day again.

## 5. Shortcut sheet and specs

- [x] 5.1 `app/components/ShortcutSheet.vue`: `?` opens, `Escape` / `?` close, every other shortcut is paused while it is open; lists motions, paint keys, request keys, undo, redo and year keys. Check: Playwright — `?` shows the sheet, `j` does not move the cursor while it is open.
- [x] 5.2 Run the full gate: `bun run check`, `bunx playwright test`; smoke on the real tenant with the owner (Russian layout included). Check: all green and the owner confirms on localhost before the push.
