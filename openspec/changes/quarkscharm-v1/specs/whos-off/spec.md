## Purpose

Answers "who in my service is off today, or on the day I am looking at"
without opening quarksUp.

## ADDED Requirements

### Requirement: Today list
The system SHALL show the colleagues of the user's service who are off
today, with avatar, name and entity, in a side column. The nature of their
absence SHALL NOT be shown or implied (the API withholds it); half days
SHALL be marked "am" or "pm".

#### Scenario: Nobody off
- **WHEN** no colleague of the service has an absence today
- **THEN** the column reads "Everyone is in"

### Requirement: Day focus
Clicking a day on the grid without a brush, or with a modifier key, SHALL
switch the column to that day; "Today" SHALL return it.

#### Scenario: Future day
- **WHEN** the user focuses 2026-12-24
- **THEN** the column lists colleagues off on that day

### Requirement: Data scope and freshness
The column SHALL be fed by the service planner for the focused month only,
fetched after the user's own data, and SHALL not be stored in the browser
beyond the page lifetime.

#### Scenario: Month change
- **WHEN** the focused day moves to another month
- **THEN** that month's planner is fetched once and kept in memory for the
  session

### Requirement: Overlaps in review
While a run is being reviewed, the run SHALL list the colleagues quarksUp's
preview reports as off on those dates.

#### Scenario: Two colleagues off
- **WHEN** a run of 22–23 Oct is previewed and two colleagues overlap
- **THEN** the run shows their two avatars and names
