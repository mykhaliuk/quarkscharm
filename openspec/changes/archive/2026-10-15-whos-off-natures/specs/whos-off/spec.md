## MODIFIED Requirements

### Requirement: Today list
The system SHALL show only the user's favorites, the people pinned in the
quarksUp directory, from all services. Other colleagues SHALL NOT be
shown. The column SHALL list the favorites who are off on the focused
day, with avatar, name and entity, in two sections: "On remote" and
"Off". When the focused day is today, the titles SHALL end with "today".
The API withholds the nature of their absence, so the system SHALL find
it as follows:

- A segment with a period takes the nature of that period from the
  absence period metadata.
- A segment without a period and with a duration of 3 days or less
  counts as remote work.
- All other segments have no nature.

The "On remote" section SHALL list the favorites on remote work. The
"Off" section SHALL list all other favorites, each with the nature of the
absence, or "Absence" when the nature is not known. Half days SHALL be
marked "am" or "pm". The column SHALL NOT be higher than the window; each
section SHALL scroll on its own.

#### Scenario: Nobody off
- **WHEN** no favorite has an absence today
- **THEN** the column reads "All your favorites are in"

#### Scenario: No favorites
- **WHEN** the user has pinned nobody in the quarksUp directory
- **THEN** the column asks the user to pin people in the directory

#### Scenario: Not a favorite
- **WHEN** a colleague of the user's service who is not a favorite is off
  today
- **THEN** the column does not show that colleague

#### Scenario: Favorite in another service
- **WHEN** a favorite of another service is off today
- **THEN** the column shows that favorite

#### Scenario: Nature from a period
- **WHEN** a favorite is off today on a segment with period 38, and the
  metadata gives Congés Payés for period 38
- **THEN** the favorite is in "Off today" with Congés Payés and its
  colour

#### Scenario: Short absence without a period
- **WHEN** a favorite is off this afternoon on a segment without a
  period and with a duration of 0.5 day
- **THEN** the favorite is in "On remote today" with the mark "pm"

#### Scenario: Long absence without a period
- **WHEN** a favorite is off on a segment without a period and with a
  duration of 10 days
- **THEN** the favorite is in "Off today" as "Absence"

#### Scenario: Many colleagues off
- **WHEN** more favorites are off than the window can show
- **THEN** the page does not scroll, and the section scrolls inside the
  column
