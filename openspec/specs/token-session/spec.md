# token-session Specification

## Purpose
Lets a user connect quarksCharm to their own quarksUp tenant with a pasted
bearer token, and keeps the app usable across token expiry.

## Requirements

### Requirement: Connect with tenant and token
The system SHALL provide a Connect screen with a tenant field and a token
field, and SHALL explain where the token comes from (browser DevTools,
`authorization` header of any `api.quarksup.net` request) and that the
token lives one hour.

#### Scenario: Valid token
- **WHEN** the user submits a tenant and a token and the organization API
  answers the current-user call successfully
- **THEN** the system stores tenant and token in the browser, shows the
  user's name and avatar, and opens the calendar

#### Scenario: Rejected token
- **WHEN** the current-user call answers 401
- **THEN** the system stays on Connect, keeps the typed tenant, clears the
  token field and shows "token rejected"

#### Scenario: Malformed token
- **WHEN** the pasted value is not three base64url parts or its `exp` claim
  is in the past
- **THEN** the system refuses it before any network call and says why

### Requirement: Token expiry is visible
The system SHALL display the token's expiry time (from its `exp` claim,
decoded without signature verification) in the header while connected.

#### Scenario: Expiry shown
- **WHEN** the user is connected
- **THEN** the header shows "token until HH:MM" in the user's local time

### Requirement: Re-authentication on 401 keeps state
The system SHALL treat any 401 from the proxy as an expired token: it SHALL
show a token prompt over the current screen and, once a new token is
accepted, retry the failed call without losing the selection or the
displayed year.

#### Scenario: Expiry during painting
- **WHEN** the user has painted days and a preview call answers 401
- **THEN** the token prompt appears, the painted days remain, and after a
  new token the preview is retried

### Requirement: Browser-only storage
The system SHALL persist only tenant, token and UI preferences, in the
browser, and SHALL keep every value fetched from quarksUp in memory only.

#### Scenario: Forget token
- **WHEN** the user clicks "Forget token"
- **THEN** the token is removed from browser storage, in-memory data is
  dropped and the Connect screen opens with the tenant prefilled

#### Scenario: Storage unavailable
- **WHEN** browser storage throws (private mode, blocked)
- **THEN** the app still runs, asking for the token on every load
