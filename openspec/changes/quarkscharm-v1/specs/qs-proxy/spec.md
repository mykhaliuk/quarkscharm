## Purpose

Relays the browser's quarksUp calls through our origin, because quarksUp's
CORS policy only admits its own, without becoming an open relay or a
credential store.

## ADDED Requirements

### Requirement: Allow-listed forwarding
The proxy SHALL forward only requests whose target matches an allow-list of
quarksUp hosts and path prefixes (Times API v3 and People v3 on
`api.quarksup.net`; organization and people on
`service-<tenant>.quarksup.net/api/v2`, tenant matching `[a-z0-9-]{2,32}`)
and SHALL answer 403 to anything else before contacting any network.

#### Scenario: Allowed path
- **WHEN** the client calls the proxy for `times/v3/planners/me` with a
  query string
- **THEN** the proxy issues the same method, query and JSON body to
  `https://api.quarksup.net/times/v3/planners/me` and returns the upstream
  status and body unchanged

#### Scenario: Disallowed host
- **WHEN** the client calls the proxy for a host outside quarksUp or a path
  outside the prefixes
- **THEN** the proxy answers 403 with a short JSON error and makes no
  upstream call

### Requirement: Credentials pass through, never stored
The proxy SHALL copy the client's `Authorization` header to the upstream
request, SHALL add no credentials of its own, and SHALL neither persist
nor log the header or any request or response body.

#### Scenario: Missing authorization
- **WHEN** the client calls the proxy without an `Authorization` header
- **THEN** the proxy answers 401 without contacting quarksUp

#### Scenario: Upstream 401
- **WHEN** quarksUp answers 401
- **THEN** the proxy returns 401 to the client unchanged

### Requirement: No caching
The proxy SHALL set `cache-control: no-store` on every response and SHALL
not cache upstream responses in any layer it controls.

#### Scenario: Repeated call
- **WHEN** the same call is made twice
- **THEN** both reach quarksUp

### Requirement: Required upstream headers
The proxy SHALL pass through `accept`, `content-type`, `prefer` and
`absence-beta` headers from the client so the Times API behaves as it does
for the quarksUp SPA.

#### Scenario: Create request
- **WHEN** the client posts a request creation with `prefer:
  return=representation` and `absence-beta: true`
- **THEN** quarksUp receives both headers and the client receives the 201
  body
