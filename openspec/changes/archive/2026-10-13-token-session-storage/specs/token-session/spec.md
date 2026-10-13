## MODIFIED Requirements

### Requirement: Browser-only storage
The system SHALL persist only tenant, token and UI preferences, in the
browser, and SHALL keep every value fetched from quarksUp in memory only.
The token SHALL live in the storage of the current tab session only, so
that it is gone when the tab closes; the tenant and the UI preferences
SHALL stay across sessions.

#### Scenario: Forget token
- **WHEN** the user clicks "Forget token"
- **THEN** the token is removed from browser storage, in-memory data is
  dropped and the Connect screen opens with the tenant prefilled

#### Scenario: Storage unavailable
- **WHEN** browser storage throws (private mode, blocked)
- **THEN** the app still runs, asking for the token on every load

#### Scenario: Reload keeps the token
- **WHEN** the user reloads the tab before the token expires
- **THEN** the session is restored without a new token

#### Scenario: New tab asks for the token
- **WHEN** the user opens the app in a new tab or after the browser was
  closed
- **THEN** the Connect screen opens with the tenant prefilled

#### Scenario: Legacy token
- **WHEN** an older version left a token in persistent storage
- **THEN** the app removes it on load and does not use it
