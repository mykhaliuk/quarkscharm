# balances Specification

## Purpose
Keeps the user's entitlement balances in view and shows what a selection
would do to them before anything is submitted.

## Requirements

### Requirement: Counters in the header
The system SHALL show one counter per entitlement of the current and next
period for accruable natures (congés payés, Fulll Off, and time savings
account entitlements when present): balance as the number, earned and used
as a thin progress bar, pending and period label on hover.

#### Scenario: Two periods
- **WHEN** the entitlements call returns congés payés for the period ending
  this May and the next one
- **THEN** both counters are shown, the current period first

### Requirement: Projected balance
While a selection is previewed, each counter affected SHALL show the
balance after submission ("4.82 → 2.82"), using the durations quarksUp
previewed.

#### Scenario: Selection of two CP days
- **WHEN** two congés payés days are painted and previewed
- **THEN** the congés payés counter reads "4.82 → 2.82"

### Requirement: Refresh after changes
Counters SHALL be refetched after a successful create, change or cancel.

#### Scenario: After cancel
- **WHEN** a congés payés request is cancelled
- **THEN** the counter shows the new balance from quarksUp, not a local
  computation
