## Context

See proposal.md for the motivation and specs/ for the behaviour.

Current state that shapes the approach:

- `app/utils/shortcuts.ts` dispatches on `event.key` (with a lower-case
  fallback), skips editable targets, lets `Enter` reach a focused button,
  and pauses while the token prompt is open. Bindings are registered per
  component through `useShortcuts` (the page: brushes, Escape, Enter; the
  header: arrows for the year).
- Two "focused day" notions exist: `useRequestCard().date` (the ring of
  the pinned card) and `useWhosOff().focusDate` (the column).
- The selection store (`app/utils/selection-store.ts`) mutates a reactive
  `Map<ymd, Slot>` through `paintDay`, `paintHalf`, `paintRange`,
  `removeRun`, `clear` and `loadRequest`. Drag paints through repeated
  `paintRange` calls during one gesture.
- The grid is 4 columns × 3 rows of months (`YearGrid.vue`).

## Goals / Non-Goals

**Goals:**
- One source of truth for the cursor day, read by the grid, the
  who-is-off column and the shortcuts.
- Pure, unit-testable motion and history logic; components stay thin.

**Non-Goals:**
- A focus-based (DOM `tabindex`) grid. The cursor is application state,
  not browser focus.

## Decisions

### D1. The cursor is app state, the who-is-off focus derives from it
A cursor store holds `cursor: ymd`. `useWhosOff` reads it instead of
owning `focusDate`; `focus(ymd)` becomes "move the cursor". The card's
ring keeps its own `date` only while a card is pinned.
- Rejected: DOM roving `tabindex` on 365 cells. It ties the cursor to
  browser focus, which buttons, the brush select and the prompt steal,
  and it needs a focus restore after every re-render.

### D2. Bind shortcuts by `event.code`, with an explicit Shift flag
A binding key is `KeyJ`, `Shift+KeyJ`, `Space`, `BracketRight`,
`Slash` with Shift for `?`, `Period`, `Enter`, `Escape`, `ArrowLeft`
and so on. The dispatcher builds the lookup key from `event.code` and
`event.shiftKey`.
- Rejected: `event.key`. It gives `о` for `j` on a Russian layout, and
  the Shift variants depend on the layout too.
- Trade-off: on AZERTY the physical key for `.` and `[` differs from the
  printed character. The sheet (`?`) shows the US key names; acceptable
  for the users we know (QWERTY / ЙЦУКЕН).

### D3. Motions are pure functions over `ymd`
`moveDay(ymd, n)`, `moveMonth(ymd, n)` (keep the day, clamp to the
month's last day) live in `shared/utils/ymd.ts` next to `addDays`. The
page maps keys to these functions; when the result is in another year,
it calls the year store's `load(year)` and keeps the cursor.

### D4. Undo is a snapshot stack in the selection store
Before every paint action the store pushes a copy of the paint map
(`Map<ymd, Slot>`, at most a few hundred entries) and the editing id;
the stack keeps 10 entries. A drag pushes once, at the press, not per
crossed cell. `undo()` pops and restores. `loadRequest`, a year change
and leaving change mode reset the stack.
- Rejected: an inverse-operation log. Each action (toggle, replace,
  range over taken halves) would need its own inverse; snapshots are
  simpler and cheap at this size.

### D5. Range mode lives in the page, not in the selection store
`v` stores an anchor; the grid outlines anchor..cursor with the existing
dashed selection style variant; `Space` calls the existing
`paintRange(anchor, cursor)`, which already skips non-selectable days
and taken halves.

### D6. Year keys move to the page bindings
The header keeps its buttons; `[` / `]` and the arrow motions are page
bindings, so one handler owns every grid key and the header no longer
registers arrow keys.

### D7. Cursor style token
A new design-system token `cell-cursor` (accent-strong ring, 2 px,
outside the today ring) keeps the cursor distinct from today (inner ring)
and the selection (dashed). Added to `docs/design/tokens.json`, synced by
`ds:sync`, checked by `ds:check`.

## Risks / Trade-offs

- [Space scrolls the page] → the dispatcher prevents the default for a
  bound `Space`, but only when the target is not a button or a field.
- [Key repeat on `j` floods year loads at the year edge] → the year
  store already discards stale loads by token; motions are synchronous.
- [Undo after submit restores days that are now real requests] → submit
  success and change-mode exit clear the stack (spec: undo never touches
  sent requests).
- [The cursor leaves the viewport on a small screen] → scroll the cursor
  cell into view (`block: 'nearest'`) after a key motion only.

## Migration Plan

Frontend only. Deploys with `main`; rollback is a revert. The removed
arrow-key year switch is announced in the shortcut sheet.
