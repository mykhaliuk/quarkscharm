## MODIFIED Requirements

### Requirement: Today list
The system SHALL show the colleagues of the user's service who are off
on the focused day, with avatar, name and entity, in a side column with
two sections: "On remote" and "Off". When the focused day is today, the
titles SHALL end with "today". The API withholds the nature of their
absence, so the system SHALL find it as follows:

- A segment with a period takes the nature of that period from the
  absence period metadata.
- A segment without a period and with a duration of 3 days or less
  counts as remote work.
- All other segments have no nature.

The "On remote" section SHALL list the colleagues on remote work. The
"Off" section SHALL list all other colleagues, each with the nature of
the absence, or "Absence" when the nature is not known. Half days SHALL be
marked "am" or "pm". The column SHALL NOT be higher than the window; each
section SHALL scroll on its own.

#### Scenario: Nobody off
- **WHEN** no colleague of the service has an absence today
- **THEN** the column reads "Everyone is in"

#### Scenario: Nature from a period
- **WHEN** a colleague is off today on a segment with period 38, and the
  metadata gives Congés Payés for period 38
- **THEN** the colleague is in "Off today" with Congés Payés and its
  colour

#### Scenario: Short absence without a period
- **WHEN** a colleague is off this afternoon on a segment without a
  period and with a duration of 0.5 day
- **THEN** the colleague is in "On remote today" with the mark "pm"

#### Scenario: Long absence without a period
- **WHEN** a colleague is off on a segment without a period and with a
  duration of 10 days
- **THEN** the colleague is in "Off today" as "Absence"

#### Scenario: Many colleagues off
- **WHEN** more colleagues are off than the window can show
- **THEN** the page does not scroll, and the section scrolls inside the
  column
