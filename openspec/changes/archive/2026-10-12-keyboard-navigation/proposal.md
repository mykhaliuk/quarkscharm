## Why

The user can plan a whole year of absences without the mouse only if a
day can be reached, painted, changed and cancelled from the keyboard.
Today the grid is mouse-only (final review M-2), and the letter
shortcuts fail on a Russian layout because they read the typed
character, not the physical key.

## What Changes

- A visible **cursor day** on the year grid. Keys move it; a click on a
  day also moves it there. The who-is-off column always lists the
  cursor day.
- Vim-like motions: `h`/`l` one day, `j`/`k` one week, `H`/`L` one
  month, `J`/`K` four months (one row of the 4 × 3 grid). The arrow
  keys move the cursor like `h`/`j`/`k`/`l`. A motion past 31 December or
  before 1 January switches the year. `.` returns to today.
- **BREAKING**: the left and right arrow keys no longer switch the year;
  `[` and `]` do.
- Actions on the cursor day: `Space` paints or unpaints the day with the
  active brush, `a` / `p` paint only the morning / afternoon, `e`
  changes the request under the cursor, `x` asks to cancel it (the same
  Yes / No confirmation), `Enter` on a request day opens its card.
- `v` starts a range from the cursor; `Space` paints the whole range;
  `Escape` leaves the range.
- `u` undoes the last paint action in the selection, up to 10 steps;
  `U` redoes what `u` took back.
- `?` shows a sheet with every shortcut.
- Every shortcut reads the physical key (`event.code`), so it works on
  any keyboard layout; this also fixes `T`, `F`, `C` on a Russian
  layout.
- **BREAKING**: Alt-click is no longer needed to focus a day for the
  who-is-off column; a plain click moves the cursor.

## Non-goals

- `gg` / `G` and other jumps to the year edges.
- `Shift+A` / `Shift+P`: left free.
- Undo or redo of submitted, changed or cancelled requests: both cover
  the unsent selection only.
- Remappable keys, count prefixes (`3j`) and a command line (`:`).
- Screen-reader grid semantics beyond the cursor's accessible name.

## Capabilities

### New Capabilities
- `calendar-keyboard`: the cursor day, the motions, the actions on the
  cursor, the range mode, undo and redo, the shortcut sheet and the
  layout-independent key reading.

### Modified Capabilities
- `absence-calendar`: "Year grid" — the year switches with `[` / `]`
  and when the cursor crosses the year edge, not with the arrow keys.
- `absence-requests`: "Nature brush" — `T`, `F`, `C` read the physical
  key and the same key again drops the brush; "Keyboard submit" —
  `Enter` on a request day opens its card instead of submitting.
- `whos-off`: "Day focus" — the column follows the cursor day; a click
  moves the cursor; the modifier-click rule goes away.

## Impact

- Code: `app/utils/shortcuts.ts` and `app/composables/useShortcuts.ts`
  (key codes, Shift variants), a new cursor store, the selection store
  (undo history), `app/pages/index.vue` (bindings, press handler),
  `app/components/calendar/*` (cursor style), `AppHeader.vue` (year
  keys), the who-is-off store (focus source), a new shortcut sheet
  component.
- Design system: one new token for the cursor ring.
- Tests: unit tests for motions, undo and key reading; Playwright specs
  for keyboard paint, change, cancel and the year edge.
- No API, relay or dependency change.
