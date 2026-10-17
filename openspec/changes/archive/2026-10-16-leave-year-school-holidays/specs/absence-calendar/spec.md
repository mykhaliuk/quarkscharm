## MODIFIED Requirements

### Requirement: Year grid
The system SHALL render twelve month grids for the selected leave year,
Monday first. A leave year SHALL start on the 1st of the start month and
SHALL end on the last day of the month before it, one year later. The
start month SHALL be the month of the begin date of the absence period of
the nature with the reference `CP` that contains today; when the system
cannot find that period, the start month SHALL be June. The header SHALL
name the leave year by its first calendar year, an en dash and the last
two digits of the next year, for example "2026–27". The system SHALL let
the user move to the previous or next leave year with buttons, with the
`[` and `]` keys, and by moving the cursor day past the first or the last
day of the leave year. The requests, planner and holidays calls SHALL
cover the window of the shown leave year.

#### Scenario: Default year
- **WHEN** the calendar opens on 2026-10-16 and the `CP` period runs from
  2026-06-01 to 2027-05-31
- **THEN** the header reads "2026–27", the grids run from June 2026 to
  May 2027, and today's cell is outlined

#### Scenario: Before the start month
- **WHEN** the calendar opens on 2027-03-10 with a June start month
- **THEN** the header reads "2026–27"

#### Scenario: Year change
- **WHEN** the user presses `]` while "2026–27" is shown
- **THEN** "2027–28" is shown and its data is fetched from 2027-06-01 to
  2028-05-31

#### Scenario: Arrow keys keep the year
- **WHEN** the user presses the right arrow key
- **THEN** the cursor moves one day and the leave year stays the same
  unless the cursor crossed the last day of the leave year

#### Scenario: Periods unavailable
- **WHEN** the absence period call fails
- **THEN** the leave year starts in June

## ADDED Requirements

### Requirement: School holidays
The system SHALL offer a toggle that shows the school holidays of one
zone and, next to it, a select that picks the zone. The zones of the
select SHALL come from the holidays call. The toggle SHALL be off by
default and the zone SHALL be "Zone B" by default, or the first zone of
the answer when "Zone B" is absent. The browser SHALL keep the toggle and
the zone across visits. While the toggle is on, every day of a school
holiday of the zone SHALL show a dot in the top right corner of its
cell, both days included. A school holiday day SHALL stay selectable
unless another rule makes it non-selectable. Its hover tooltip and its
accessible name SHALL give the holiday label and the zone.

#### Scenario: Default off
- **WHEN** the user opens the calendar for the first time
- **THEN** the toggle is off, the select shows "Zone B" and no day shows
  the school dot

#### Scenario: Show zone B
- **WHEN** "2025–26" is shown, the holidays call gives "Vacances
  d'Hiver" for Zone B from 2026-02-14 to 2026-03-01, and the user
  switches the toggle on with "Zone B" selected
- **THEN** every day from 2026-02-14 to 2026-03-01 shows the school dot
  and 2026-03-02 does not

#### Scenario: Change the zone
- **WHEN** the toggle is on and the user selects "Zone C"
- **THEN** the dots follow the holidays of Zone C

#### Scenario: Paint a school holiday day
- **WHEN** the toggle is on and the user paints a free weekday inside a
  school holiday
- **THEN** the day is painted and keeps its dot

#### Scenario: School holiday hover
- **WHEN** the toggle is on and the user hovers a day of "Vacances
  d'Hiver" of Zone B
- **THEN** the tooltip reads "Vacances d'Hiver (Zone B)"

#### Scenario: Remembered choice
- **WHEN** the user switched the toggle on, selected "Zone A" and reloads
  the page
- **THEN** the toggle is on and "Zone A" is selected

### Requirement: Header identity
The header SHALL show the avatar of the user, or the initials when the
user has no picture, without the name next to it. The full name SHALL be
the accessible name and the hover title of the avatar.

#### Scenario: Avatar only
- **WHEN** the user is connected
- **THEN** the header shows the avatar, no name text, and hovering the
  avatar shows the full name
