## ADDED Requirements

### Requirement: Run in Firefox
The extension SHALL also run in Firefox 128 or later, built from the same
source folder, with the same behavior as in Chrome. Because Firefox has
no messages from web pages to extensions, a content script on the
quarksCharm pages SHALL relay the requests of the page to the extension
and the answers back to that page only. The relay SHALL run only on the
origins that the extension answers.

#### Scenario: Connect in Firefox
- **WHEN** the Firefox build of the extension is installed and the user
  connects to quarksCharm with the tenant `fulll` and an empty token
- **THEN** quarksCharm gets the token of `fulll` from the extension and
  opens the calendar

#### Scenario: Relay on another site
- **WHEN** a page of another origin posts a token request
- **THEN** no relay runs on that page and nothing answers

#### Scenario: Firefox without the extension
- **WHEN** the extension is not installed in Firefox
- **THEN** quarksCharm asks for a pasted token as before
