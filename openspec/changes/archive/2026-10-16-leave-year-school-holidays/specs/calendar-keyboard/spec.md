## MODIFIED Requirements

### Requirement: Motions
The keys SHALL move the cursor as follows: `h` and the left arrow one day
back, `l` and the right arrow one day forward, `k` and the up arrow seven
days back, `j` and the down arrow seven days forward, `H` one month back,
`L` one month forward, `K` four months back, `J` four months forward, `.`
to today. A month motion SHALL keep the day of the month, or take the
last day of the target month when that month is shorter. A motion that
leaves the shown leave year SHALL show the leave year of the new cursor
day.

#### Scenario: Week down
- **WHEN** the cursor is on 2026-10-28 and the user presses `j`
- **THEN** the cursor is on 2026-11-04

#### Scenario: Month on a short month
- **WHEN** the cursor is on 2027-01-31 and the user presses `L`
- **THEN** the cursor is on 2027-02-28

#### Scenario: Grid row
- **WHEN** the cursor is on 2026-07-10 and the user presses `J`
- **THEN** the cursor is on 2026-11-10

#### Scenario: Year edge
- **WHEN** the leave year starts in June, the cursor is on 2027-05-31
  and the user presses `l`
- **THEN** "2027–28" is shown and the cursor is on 2027-06-01

#### Scenario: Year edge back
- **WHEN** the leave year starts in June, the cursor is on 2026-06-01
  and the user presses `h`
- **THEN** "2025–26" is shown and the cursor is on 2026-05-31

#### Scenario: December is inside the year
- **WHEN** the leave year starts in June, the cursor is on 2026-12-31
  and the user presses `l`
- **THEN** "2026–27" stays shown and the cursor is on 2027-01-01

### Requirement: Shortcut sheet
`?` SHALL open a sheet that lists every shortcut with its action;
`Escape` or `?` SHALL close it. While the sheet or the token prompt is
open, no other shortcut SHALL act.

#### Scenario: Open the sheet
- **WHEN** the user presses `?`
- **THEN** a sheet lists the motions, the paint keys, the request keys,
  undo, redo, the year keys and the school holidays key

## ADDED Requirements

### Requirement: School holidays key
`s` SHALL switch the school holidays toggle on or off, with the same
effect as a click on the toggle.

#### Scenario: Switch on from the keyboard
- **WHEN** the toggle is off and the user presses `s`
- **THEN** the toggle is on and the days of the selected zone show the
  school dot

#### Scenario: Switch off from the keyboard
- **WHEN** the toggle is on and the user presses `s`
- **THEN** the toggle is off and no day shows the school dot
