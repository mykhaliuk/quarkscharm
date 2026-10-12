## MODIFIED Requirements

### Requirement: Day focus
The column SHALL list the colleagues off on the cursor day of the year
grid. Moving the cursor with a key or a click SHALL switch the column to
that day; "Today" SHALL return the cursor and the column to today.

#### Scenario: Future day
- **WHEN** the user moves the cursor to 2026-12-24
- **THEN** the column lists colleagues off on that day

#### Scenario: Click with a brush
- **WHEN** a brush is active and the user clicks 2026-11-02
- **THEN** the day is painted and the column lists colleagues off on
  2026-11-02
