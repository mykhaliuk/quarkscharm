## MODIFIED Requirements

### Requirement: Today list
The system SHALL show the colleagues of the user's service who are off
today, with avatar, name and entity, in a side column. The API withholds
the nature of their absence. When a segment has a period that is one of
the user's own entitlement periods, the system SHALL show the nature of
that period. In all other cases the system SHALL NOT show or imply a
nature. Half days SHALL be marked "am" or "pm".

#### Scenario: Nobody off
- **WHEN** no colleague of the service has an absence today
- **THEN** the column reads "Everyone is in"

#### Scenario: Nature from a known period
- **WHEN** a colleague is off today on a segment with period 38, and the
  user's entitlement for period 38 is Congés Payés
- **THEN** the column shows Congés Payés with its colour for that
  colleague

#### Scenario: Unknown period
- **WHEN** a colleague is off today on a segment without a period, or
  with a period that the user's entitlements do not contain
- **THEN** the column shows that colleague without a nature
