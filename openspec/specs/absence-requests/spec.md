# absence-requests Specification

## Purpose
Lets the user create, change and cancel absence requests in batches from the
year grid, with quarksUp's own preview as the review step and an explicit
confirmation before any cancellation.

## Requirements

### Requirement: Nature brush
The system SHALL show a row of nature chips (default short-list:
télétravail, Fulll Off, congés payés, plus any nature returned by a preview
this session) and SHALL require one chip to be active before a day can be
painted. Keys `T`, `F`, `C` SHALL select the first three chips.

#### Scenario: No brush
- **WHEN** no chip is active and the user clicks a day
- **THEN** nothing is painted and the chip row is highlighted

### Requirement: Painting days and half days
Clicking a selectable day with an active brush SHALL paint both halves;
clicking one half SHALL paint only that half; dragging SHALL paint every
selectable day crossed; clicking a painted day with the same brush SHALL
unpaint it; another brush SHALL replace its nature. Escape SHALL clear the
whole selection. A half that belongs to an existing request SHALL NOT be
painted, except a half of the request being changed.

#### Scenario: Drag paint
- **WHEN** the user drags from Monday to Friday with the TT brush
- **THEN** the five weekdays are painted TT and the review panel lists one
  range of five days

#### Scenario: Half day
- **WHEN** the user clicks the afternoon half of a day
- **THEN** only that half is painted and the range shows "0.5 day"

#### Scenario: Drag across an existing request
- **WHEN** the user drags across a day that already has a request
- **THEN** that day stays as it is and only the free days are painted

### Requirement: Review with preview
The selection SHALL be grouped into maximal runs of consecutive days with
the same nature. For each run the system SHALL call quarksUp's preview and
SHALL display its duration, the balance after, its warnings and its
conflicts. The submit control SHALL be disabled
while any preview is pending or failed.

#### Scenario: Balance warning
- **WHEN** a run of congés payés exceeds the balance and the preview answers
  with a warning
- **THEN** the run shows the warning text and submit stays enabled only if
  quarksUp did not flag it as an error

#### Scenario: Preview error
- **WHEN** the preview for a run answers 4xx
- **THEN** the run shows the message from the response and submit is
  disabled until the run is edited or removed

### Requirement: Batch submit with partial failure
Submitting SHALL create one request per run, all in parallel, using the
previewed duration and entitlement. Runs that succeed SHALL leave the
selection and appear on the grid; runs that fail SHALL stay selected with
their error; submitting again SHALL send only the remaining runs.

#### Scenario: One of three fails
- **WHEN** three runs are submitted and the second answers 400
- **THEN** the first and third are drawn as pending requests, the second
  stays in the panel with the error, and the submit label reads "Submit 1"

### Requirement: Change a request
From the request card, "Change" SHALL load the request into the panel in
edit mode; the user MAY move its dates or nature; the system SHALL call the
request's own preview and update it in place.

#### Scenario: Shorten a request
- **WHEN** the user changes a 22–23 Oct request to 22 Oct only and
  confirms
- **THEN** the request is updated and the grid shows one day

### Requirement: Cancel with confirmation
"Cancel" on a request card SHALL turn into an inline confirmation naming the
request ("Cancel Télétravail 22–23 Oct? Yes / No") for five seconds. Only
"Yes" SHALL call the cancel workflow of that request, using the workflow
sequence the request itself exposes. A request without a cancel workflow
SHALL show no cancel control.

#### Scenario: Confirmed cancel
- **WHEN** the user clicks "Cancel" then "Yes"
- **THEN** the cancel workflow is called and the request disappears from
  the grid

#### Scenario: Timeout
- **WHEN** the user clicks "Cancel" and does nothing for five seconds
- **THEN** the control returns to "Cancel" and nothing is called

### Requirement: Keyboard submit
Enter SHALL submit the review panel when it is open and submit is enabled.

#### Scenario: Enter
- **WHEN** two runs are previewed without errors and the user presses Enter
- **THEN** both are submitted
