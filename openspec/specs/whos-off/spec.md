# whos-off Specification

## Purpose
Answers "who in my service is off today, or on the day I am looking at"
without opening quarksUp.

## Requirements

### Requirement: Today list
The system SHALL show the colleagues of the user's service who are off
today, with avatar, name and entity, in a side column. The nature of their
absence SHALL NOT be shown or implied (the API withholds it); half days
SHALL be marked "am" or "pm".

#### Scenario: Nobody off
- **WHEN** no colleague of the service has an absence today
- **THEN** the column reads "Everyone is in"

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

### Requirement: Data scope and freshness
The column SHALL be fed by the service planner for the focused month only,
fetched after the user's own data, and SHALL not be stored in the browser
beyond the page lifetime.

#### Scenario: Month change
- **WHEN** the focused day moves to another month
- **THEN** that month's planner is fetched once and kept in memory for the
  session
