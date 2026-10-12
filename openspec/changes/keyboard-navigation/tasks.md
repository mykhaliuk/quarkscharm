## 1. Key reading

- [ ] 1.1 `app/utils/shortcuts.ts`: dispatch on `event.code` plus `event.shiftKey` (binding keys like `KeyJ`, `Shift+KeyJ`, `Space`, `Shift+Slash`), keep the editable-target skip, the paused state, and let `Enter` and `Space` reach a focused button or link; prevent the default only for a handled key. Move the existing bindings (`KeyT`, `KeyF`, `KeyC`, `Escape`, `Enter`) to codes. Check: unit tests in `tests/unit/shortcuts.test.ts` for a Russian-layout event (`key: 'о'`, `code: 'KeyJ'`), the Shift variant, Space on a button, and the paused state.

## 2. Cursor and motions

- [ ] 2.1 `shared/utils/ymd.ts`: `moveMonth(ymd, n)` keeping the day and clamping to the month's last day. Check: unit tests for 31 Jan + 1, 31 Mar − 1, 10 Mar + 4, 15 Nov + 4 across the year.
- [ ] 2.2 Cursor store `app/utils/cursor-store.ts` + `app/composables/useCursor.ts`: `cursor` starts on today, `moveTo(ymd)`, `byDays(n)`, `byMonths(n)`, `today()`; a result in another year calls the year switch dependency. `useWhosOff` reads the cursor instead of its own `focusDate`. Check: unit tests for the year-edge call and for the who-is-off store following the cursor.
- [ ] 2.3 Design token `cell-cursor` in `docs/design/tokens.json`, `bun run ds:sync`, `DayCell.vue` prop `cursor` with the outer 2 px ring and an `aria-label` with date, nature and status; `MonthGrid`/`YearGrid` pass it. Check: `bun run ds:check` green; DayCell unit test for the class and the accessible name.
- [ ] 2.4 Page bindings in `app/pages/index.vue`: `h j k l`, arrows, `Shift+H/J/K/L`, `.`, `[`, `]`; remove the arrow bindings from `AppHeader.vue`; a click on a day moves the cursor; scroll the cursor cell into view after a key motion. Check: Playwright `e2e/keyboard.spec.ts` — `j` from 28 Oct lands on 4 Nov, `l` on 31 Dec shows 2027, `]` switches the year, the who-is-off column follows the cursor; update `e2e/calendar.spec.ts` and `e2e/whos-off.spec.ts` for the removed arrow-year and Alt-click rules.

## 3. Paint and request keys

- [ ] 3.1 `Space`, `a`, `p` paint at the cursor through `paintDay` / `paintHalf`; without a brush they highlight the chip row. Check: Playwright — Space paints a free day and the panel lists it, Space on a Saturday paints nothing, `p` paints the afternoon only.
- [ ] 3.2 Range mode: `v` anchors, the grid outlines anchor..cursor, `Space` calls `paintRange` and closes, `Escape` / `v` close without paint. Check: Playwright — `v` on Mon 2 Nov, `4×l`, `Space` paints five days as one run.
- [ ] 3.3 `E` starts the change, `x` opens the card with the cancel confirmation, `Enter` on a request day opens the card instead of submitting. Check: Playwright in `e2e/change.spec.ts` and `e2e/cancel.spec.ts` for `E` and `x`; `e2e/paint.spec.ts` for Enter on a request day.

## 4. Undo

- [ ] 4.1 Selection store: snapshot stack of 10 (paint map + editing id) pushed before `paintDay`, `paintHalf`, `removeRun`, `clear` and once per drag gesture (a `begin()` call at the press); `undo()` restores; reset on `loadRequest`, year change, submit success and leaving change mode. Check: unit tests — undo a paint, undo a drag as one step, depth 10 after 12 actions, reset on year change.
- [ ] 4.2 Bind `u` and wire `begin()` into the drag press handler. Check: Playwright — paint a day, `u`, the panel is empty.

## 5. Shortcut sheet and specs

- [ ] 5.1 `app/components/ShortcutSheet.vue`: `?` opens, `Escape` / `?` close, every other shortcut is paused while it is open; lists motions, paint keys, request keys, undo and year keys. Check: Playwright — `?` shows the sheet, `j` does not move the cursor while it is open.
- [ ] 5.2 Run the full gate: `bun run check`, `bunx playwright test`; smoke on the real tenant with the owner (Russian layout included). Check: all green and the owner confirms on localhost before the push.
