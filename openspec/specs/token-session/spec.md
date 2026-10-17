# token-session Specification

## Purpose
Lets a user connect quarksCharm to their own quarksUp tenant with a pasted
bearer token, and keeps the app usable across token expiry.

## Requirements

### Requirement: Connect with tenant and token
The system SHALL provide a Connect screen with a tenant field and a token
field, and SHALL explain where the token comes from (browser DevTools,
`authorization` header of any `api.quarksup.net` request) and that the
token lives one hour. When the token bridge extension is installed, the
Connect screen SHALL ask it for the token of the typed tenant, and SHALL
connect with that token without a paste. The token field SHALL stay as
the fallback.

#### Scenario: Valid token
- **WHEN** the user submits a tenant and a token and the organization API
  answers the current-user call successfully
- **THEN** the system stores tenant and token in the browser, shows the
  user's avatar, and opens the calendar

#### Scenario: Rejected token
- **WHEN** the current-user call answers 401
- **THEN** the system stays on Connect, keeps the typed tenant, clears the
  token field and shows "token rejected"

#### Scenario: Malformed token
- **WHEN** the pasted value is not three base64url parts or its `exp` claim
  is in the past
- **THEN** the system refuses it before any network call and says why

#### Scenario: Connect with the extension
- **WHEN** the extension is installed, the tenant `fulll` is known and the
  user opens the Connect screen
- **THEN** the system gets the token from the extension, connects and
  opens the calendar without a paste

#### Scenario: Extension cannot give a token
- **WHEN** the extension answers "login needed" or "timeout"
- **THEN** the Connect screen says so and keeps the token field for a
  paste

#### Scenario: No extension
- **WHEN** the extension is not installed
- **THEN** the Connect screen works as before, with the token field only

### Requirement: Token expiry is visible
The system SHALL display the token's expiry time (from its `exp` claim,
decoded without signature verification) in the header while connected.

#### Scenario: Expiry shown
- **WHEN** the user is connected
- **THEN** the header shows "token until HH:MM" in the user's local time

### Requirement: Re-authentication on 401 keeps state
The system SHALL treat any 401 from the proxy as an expired token. It
SHALL first ask the token bridge extension for a fresh token; if the
extension gives one that the current-user call accepts, it SHALL retry
the failed call without a prompt. Otherwise it SHALL show a token prompt
over the current screen and, once a new token is accepted, retry the
failed call. In both cases the selection and the displayed year SHALL
stay.

#### Scenario: Expiry during painting
- **WHEN** the user has painted days, the extension is not installed and
  a preview call answers 401
- **THEN** the token prompt appears, the painted days remain, and after a
  new token the preview is retried

#### Scenario: Expiry with the extension
- **WHEN** a call answers 401 and the extension gives a fresh token
- **THEN** no prompt appears and the call is retried with the new token

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

### Requirement: Renewal before expiry
When the token bridge extension is installed, the system SHALL ask it for
a new token two minutes before the current token expires, and SHALL swap
the new token in without a prompt and without a reload of the data. If
the extension gives no token, the system SHALL keep the current token
until a call answers 401.

#### Scenario: Silent renewal
- **WHEN** the token expires at 14:00 and the extension gives a token
  that expires at 15:00
- **THEN** at 13:58 the system uses the new token and the header shows
  "token until 15:00"

#### Scenario: Renewal fails
- **WHEN** the extension answers "login needed" at 13:58
- **THEN** the system keeps the current token and shows the prompt only
  after a call answers 401
