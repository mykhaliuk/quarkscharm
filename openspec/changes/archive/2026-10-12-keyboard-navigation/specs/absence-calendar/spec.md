## MODIFIED Requirements

### Requirement: Year grid
The system SHALL render twelve month grids for the selected year, Monday
first, and SHALL let the user move to the previous or next year with
buttons, with the `[` and `]` keys, and by moving the cursor day past the
first or the last day of the year.

#### Scenario: Default year
- **WHEN** the calendar opens
- **THEN** the current year is shown and today's cell is outlined

#### Scenario: Year change
- **WHEN** the user presses `]`
- **THEN** the next year is shown and its data is fetched

#### Scenario: Arrow keys keep the year
- **WHEN** the user presses the right arrow key
- **THEN** the cursor moves one day and the year stays the same unless
  the cursor crossed 31 December
