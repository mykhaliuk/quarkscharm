# absence-calendar Specification

## Purpose
Shows a whole year of the user's own absences at half-day resolution with
holidays, non-working days and request status, so planning is a glance,
not a wizard.

## Requirements

### Requirement: Year grid
The system SHALL render twelve month grids for the selected year, Monday
first, and SHALL let the user move to the previous or next year with
buttons and with the left and right arrow keys.

#### Scenario: Default year
- **WHEN** the calendar opens
- **THEN** the current year is shown and today's cell is outlined

#### Scenario: Year change
- **WHEN** the user presses the right arrow key
- **THEN** the next year is shown and its data is fetched

### Requirement: Half-day cells
Each day cell SHALL show two halves (morning, afternoon). A segment covering
`00:00–23:00` fills both, `00:00–12:00` the morning only, `13:00–23:00` the
afternoon only. The fill colour SHALL come from the absence nature's
design-system colour.

#### Scenario: Afternoon only
- **WHEN** a request has a segment from 13:00 to 23:00 on a day
- **THEN** only the afternoon half of that cell is filled

### Requirement: Non-selectable days
Weekends, public holidays and the user's non-working dates SHALL be
rendered muted and SHALL not accept painting. Public holidays SHALL show
their label on hover.

#### Scenario: Holiday hover
- **WHEN** the user hovers 2026-11-11
- **THEN** a tooltip shows "Armistice 1918" (from the holidays call)

### Requirement: Request status
A cell belonging to a request in status New or cancellation pending SHALL
carry a pending marker; refused and cancelled requests SHALL not be drawn.

#### Scenario: Pending marker
- **WHEN** a request has status 1 (New)
- **THEN** its cells show the pending marker

### Requirement: Request card
Hovering a painted cell that belongs to an existing request SHALL show a
card with nature label, dates, duration, status and the actions "Change"
and "Cancel"; clicking pins the card until Escape or an outside click.

#### Scenario: Card content
- **WHEN** the user hovers a cell of request 155 (TT, 22–23 Oct, 2 days,
  New)
- **THEN** the card reads "Télétravail · 22–23 Oct 2026 · 2 days · pending"
  with "Change" and "Cancel"

### Requirement: Partial rendering on failure
If the holidays or planner calls fail, the system SHALL still render the
grid with whatever loaded and SHALL offer "retry" for the missing part.

#### Scenario: Holidays unavailable
- **WHEN** the holidays call fails and the requests call succeeds
- **THEN** absences are drawn, no day is marked holiday, and a retry
  control is shown
