## MODIFIED Requirements

### Requirement: Nature brush
The system SHALL show a row of nature chips (default short-list:
télétravail, Fulll Off, congés payés, plus any nature returned by a preview
this session) and SHALL require one chip to be active before a day can be
painted. The physical keys `T`, `F`, `C` SHALL select the first three
chips on any keyboard layout; pressing the key of the active chip again
SHALL drop the brush.

#### Scenario: No brush
- **WHEN** no chip is active and the user clicks a day
- **THEN** nothing is painted and the chip row is highlighted

#### Scenario: Russian layout
- **WHEN** the keyboard layout is Russian and the user presses the
  physical `F` key
- **THEN** the second chip becomes active

### Requirement: Keyboard submit
Enter SHALL submit the review panel when it is open and submit is enabled,
unless the cursor day belongs to an existing request; then Enter SHALL
open that request's card.

#### Scenario: Enter
- **WHEN** two runs are previewed without errors, the cursor is on a day
  without a request, and the user presses Enter
- **THEN** both are submitted

#### Scenario: Enter on a request day
- **WHEN** the cursor is on a day of an existing request and the user
  presses Enter
- **THEN** the request card opens and nothing is submitted
