## ADDED Requirements

### Requirement: Week numbers
Each row of each month grid SHALL show the ISO 8601 week number of its
dates in a column on the left of Monday. ISO 8601 week 1 is the week that
holds the first Thursday of the year, so the last days of December can be
in week 1 and the first days of January can be in week 52 or 53. A row
that holds no date of the month SHALL show no number. A week that crosses
the edge of a month SHALL show the same number in both months. The column
SHALL always be visible. The number SHALL not accept painting, SHALL not
select days and SHALL not be a position of the keyboard cursor. Its
hover title and its accessible name SHALL read "Week" and the number, for
example "Week 42".

#### Scenario: Weeks of a month
- **WHEN** "2026–27" is shown
- **THEN** the rows of October 2026 show 40, 41, 42, 43 and 44, and its
  sixth row shows no number

#### Scenario: Week across the year edge
- **WHEN** "2026–27" is shown
- **THEN** the last row of December 2026 (28 Dec to 31 Dec) and the first
  row of January 2027 (1 Jan to 3 Jan) both show 53, and the next row of
  January 2027 shows 1

#### Scenario: Week number title
- **WHEN** the user hovers the number of the row of 2026-10-12
- **THEN** the title reads "Week 42"

#### Scenario: Number is not a day
- **WHEN** the user clicks a week number
- **THEN** no day of that row is added to the selection
