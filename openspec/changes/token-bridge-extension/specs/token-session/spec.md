## MODIFIED Requirements

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
  user's name and avatar, and opens the calendar

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

## ADDED Requirements

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
