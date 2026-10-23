## MODIFIED Requirements

### Requirement: Connect with tenant and token
The system SHALL provide a Connect screen with a tenant field and a token
field, and SHALL explain where the token comes from (browser DevTools,
`authorization` header of any `api.quarksup.net` request) and that the
token lives one hour. When the token bridge extension is installed, the
Connect screen SHALL ask it for the token of the typed tenant, and SHALL
connect with that token without a paste. The token field SHALL stay as
the fallback. Before any request to the extension or to the
organization API, the Connect screen SHALL check that the tenant has 2 to
32 lowercase letters, digits or hyphens, and SHALL say what is wrong when
it has not.

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

#### Scenario: Missing tenant
- **WHEN** the user presses Connect with an empty tenant
- **THEN** the system sends no request to the extension or to quarksUp
  and says "Enter the tenant first."

#### Scenario: Malformed tenant
- **WHEN** the user presses Connect with a tenant such as
  `fulll.quarksup.net`
- **THEN** the system sends no request and says that the tenant is the
  part before `.quarksup.net`
