# token-bridge Specification

## Purpose
A browser extension that reads the bearer token quarksUp keeps in its own
tab and gives it to quarksCharm only, so the user does not paste a token.

## Requirements

### Requirement: Read the token of quarksUp
The extension SHALL read the access token and its expiry from the session
storage of every open tab of a quarksUp tenant page
(`https://<tenant>.quarksup.net/`), with the tenant taken from the host
name. It SHALL read the value again at least every minute while the tab
is open, so that it follows the renewals of quarksUp. It SHALL keep the
latest token per tenant in memory only, never on disk.

#### Scenario: quarksUp tab open
- **WHEN** a tab of `fulll.quarksup.net` is open and quarksUp has a token
  that expires in 40 minutes
- **THEN** the extension holds that token for the tenant `fulll`

#### Scenario: quarksUp renews its token
- **WHEN** quarksUp replaces its token in the open tab
- **THEN** the extension holds the new token within one minute

#### Scenario: Browser restart
- **WHEN** the browser restarts
- **THEN** the extension holds no token until a quarksUp tab gives one

### Requirement: Answer quarksCharm only
The extension SHALL answer a token request only from the production pages
of quarksCharm. Only a development copy, built on purpose and not
shipped, SHALL also answer the local development server. It SHALL give a
token
only for the tenant named in the request, and only when the token is
valid for at least two more minutes. Pages of other origins SHALL get no
answer.

#### Scenario: Request from quarksCharm
- **WHEN** quarksCharm asks for the token of `fulll` and the extension
  holds one valid for 30 minutes
- **THEN** the extension answers with that token and its expiry

#### Scenario: Request from another site
- **WHEN** a page of another origin sends a message to the extension
- **THEN** the extension does not answer it

#### Scenario: Token about to expire
- **WHEN** the token held for `fulll` is valid for one more minute only
- **THEN** the extension does not give it and gets a fresh one first

### Requirement: Fetch a fresh token in the background
When the extension holds no valid token for the requested tenant, it
SHALL first ask the open quarksUp tabs of that tenant. If none gives a
valid token, it SHALL open the tenant page in an inactive tab, wait at
most 30 seconds for a valid token, close that tab and answer. If the tab
shows the login page of quarksUp instead, the extension SHALL leave the
tab open and answer that a login is needed. It SHALL never type or send
credentials.

#### Scenario: Single sign-on still valid
- **WHEN** no quarksUp tab is open and the ADFS session of the browser is
  still valid
- **THEN** the extension opens `fulll.quarksup.net` in an inactive tab,
  answers with the new token and closes the tab

#### Scenario: Login needed
- **WHEN** the inactive tab ends on the login page of quarksUp
- **THEN** the tab stays open and quarksCharm gets the answer "login
  needed"

#### Scenario: No answer in time
- **WHEN** no valid token arrives within 30 seconds
- **THEN** the extension closes the tab it opened and answers "timeout"
