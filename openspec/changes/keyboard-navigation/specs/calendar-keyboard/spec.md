## Purpose

Lets the user reach, paint, change and cancel any day of the year grid
from the keyboard alone, with vim-like keys that work on any layout.

## ADDED Requirements

### Requirement: Cursor day
The year grid SHALL show exactly one cursor day with an outline that
differs from the today outline and from the selection outline. The
cursor SHALL start on today. A click on a day SHALL move the cursor to
that day. The cursor's accessible name SHALL give the date and, when
present, the nature and the status of the day.

#### Scenario: Start on today
- **WHEN** the calendar opens on 2026-10-12
- **THEN** the cursor is on 2026-10-12

#### Scenario: Click moves the cursor
- **WHEN** the user clicks 2026-11-05
- **THEN** the cursor is on 2026-11-05

### Requirement: Motions
The keys SHALL move the cursor as follows: `h` and the left arrow one day
back, `l` and the right arrow one day forward, `k` and the up arrow seven
days back, `j` and the down arrow seven days forward, `H` one month back,
`L` one month forward, `K` four months back, `J` four months forward, `.`
to today. A month motion SHALL keep the day of the month, or take the
last day of the target month when that month is shorter. A motion that
leaves the shown year SHALL show the year of the new cursor day.

#### Scenario: Week down
- **WHEN** the cursor is on 2026-10-28 and the user presses `j`
- **THEN** the cursor is on 2026-11-04

#### Scenario: Month on a short month
- **WHEN** the cursor is on 2026-01-31 and the user presses `L`
- **THEN** the cursor is on 2026-02-28

#### Scenario: Grid row
- **WHEN** the cursor is on 2026-03-10 and the user presses `J`
- **THEN** the cursor is on 2026-07-10

#### Scenario: Year edge
- **WHEN** the cursor is on 2026-12-31 and the user presses `l`
- **THEN** the year 2027 is shown and the cursor is on 2027-01-01

### Requirement: Paint at the cursor
`Space` SHALL paint the cursor day with the active brush, or unpaint it
when it is already painted with that brush, with the same rules as a
click. `a` SHALL paint only the morning and `p` only the afternoon, with
the same rules as a click on a half. Without a brush the keys SHALL
paint nothing and SHALL highlight the chip row. On a non-selectable day
or a half of an existing request the keys SHALL paint nothing.

#### Scenario: Space paints
- **WHEN** the TT brush is active, the cursor is on a free working day
  and the user presses `Space`
- **THEN** the day is painted TT and the review panel lists it

#### Scenario: Weekend
- **WHEN** the cursor is on a Saturday and the user presses `Space`
- **THEN** nothing is painted

### Requirement: Range mode
`v` SHALL anchor a range at the cursor day. While the range is open, the
grid SHALL outline every day from the anchor to the cursor. `Space`
SHALL paint every selectable free day of the range with the active brush
and close the range. `Escape` or `v` again SHALL close the range without
painting.

#### Scenario: Range paint
- **WHEN** the FOFF brush is active, the user presses `v` on Monday
  2026-11-02, moves to Friday 2026-11-06 and presses `Space`
- **THEN** the five weekdays are painted FOFF and the review panel lists
  one run

### Requirement: Actions on a request day
When the cursor day belongs to an existing request, `E` SHALL start the
change of that request as the card's "Change" does, `x` SHALL open the
card with the cancel confirmation asked, and `Enter` SHALL open the card.
On a day without a request these keys SHALL do nothing, except `Enter`,
which submits as before.

#### Scenario: Change from the keyboard
- **WHEN** the cursor is on 2026-10-22, a day of a two-day request, and
  the user presses `E`
- **THEN** change mode starts for that request

#### Scenario: Cancel from the keyboard
- **WHEN** the cursor is on a day of a cancellable request and the user
  presses `x`
- **THEN** the card shows "Cancel <nature> <dates>? Yes / No"

### Requirement: Undo
`u` SHALL undo the last paint action in the selection: a click, a drag, a
key paint, a range paint, a removal of a run or a clear. The system SHALL
keep the last 10 actions; older ones are dropped. Undo SHALL NOT affect
requests that were submitted, changed or cancelled. Leaving change mode
or switching the year SHALL empty the history.

#### Scenario: Undo a paint
- **WHEN** the user paints 2026-11-02 and then presses `u`
- **THEN** 2026-11-02 is not painted and the review panel is empty

#### Scenario: Depth
- **WHEN** the user makes 12 paint actions and presses `u` 12 times
- **THEN** the first two actions stay painted

### Requirement: Shortcut sheet
`?` SHALL open a sheet that lists every shortcut with its action;
`Escape` or `?` SHALL close it. While the sheet or the token prompt is
open, no other shortcut SHALL act.

#### Scenario: Open the sheet
- **WHEN** the user presses `?`
- **THEN** a sheet lists the motions, the paint keys, the request keys,
  undo and the year keys

### Requirement: Layout-independent keys
Every shortcut SHALL be bound to the physical key, so it acts the same
on any keyboard layout. Shortcuts SHALL NOT act while a text field, a
select or the token prompt has the focus, and `Enter` or `Space` on a
focused button SHALL activate that button.

#### Scenario: Russian layout motion
- **WHEN** the layout is Russian and the user presses the physical `J`
  key without Shift
- **THEN** the cursor moves seven days forward

#### Scenario: Focused button
- **WHEN** the "Clear" button has the focus and the user presses `Space`
- **THEN** the selection is cleared and the cursor day is not painted
