# quarksUp API notes

Captured 2026-10-12 from a tenant session with the Employee role. Raw
response bodies are kept out of the repository (they carry personal data);
the official OpenAPI document is vendored as `docs/openapi-times.json`.

## 1. Hosts and auth

| Thing                              | Value                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------ |
| Tenant SPA                         | `https://<tenant>.quarksup.net/` (Angular, modules `/hello/`, `/times/`) |
| Times API (absences)               | `https://api.quarksup.net/times/v3/...`                                  |
| Organization API (metadata, users) | `https://service-<tenant>.quarksup.net/api/v2/...`                       |
| People API                         | `https://api.quarksup.net/people/v3/...` (not captured)                  |
| IdP                                | `https://login.quarksup.net/adfs/oauth2/...` (ADFS, OAuth2 + OIDC)       |
| Backend                            | .NET on Azure France Central (App Insights, SignalR), OData v4           |

Auth: every API call carries `Authorization: Bearer <JWT>`. The JWT is issued
by ADFS (`iss=login.quarksup.net/adfs/services/trust`, `aud=https://service-<tenant>.quarksup.net/`,
`scp=openid`, lifetime 1 h, claims: userId GUID, username, tenant `fulll`,
env `production`). The SPA keeps it in sessionStorage, not in a cookie: a
replayed `fetch` with `credentials: 'include'` returns 401. The SPA refreshes
it through `POST login.quarksup.net/adfs/oauth2/token/` (public client; grant type not captured).

Consequence for the port: the helper needs the bearer token instead of the
Factorial cookie. Two options:

1. Paste the token (1 h) like the Factorial cookie was pasted; refresh via the
   ADFS token endpoint if the SPA uses a refresh_token (to confirm in the
   token request body).
2. Run the OIDC authorization-code flow (PKCE) against ADFS from the helper
   with the same public `client_id`; the redirect URI must match the SPA's.

Common headers: `accept: application/json`, `locale=fr-FR` query param on
every call (optional), `accept: application/json; odata.metadata=none` for the
OData endpoint.

## 2. Official documentation

Every Times response carries a `link` header:

- Postman: `https://documenter.getpostman.com/view/7443498/2s93JwPNZD` (JS
  rendered, fetch with a browser).
- OpenAPI 3.0.3, no auth needed:
  `https://api.quarksup.net/docs/openapi/times/c6dd0437e3fd.json`
  (saved as `openapi-times.json`, 46 operations, French descriptions with
  permission names and query params; schemas are loosely typed, all strings).

## 3. Identity of the current user

`GET service-<tenant>.quarksup.net/api/v2/organization/users/me?expand=profiles,portals,metrics`
→ `{ login, employee: { id: <employeeId>, firstName, lastName }, role: { type: 'Employee' }, timeZone: 'Europe/Paris', locale, picture: { url, thumbnails: { small, medium, large } } }`

`employee.id` (<employeeId>) is the `employeeId` for every Times call. Replaces
Factorial's `x-api-user-id`.

## 4. Endpoint mapping (Factorial → quarksUp)

| Helper need                      | Factorial                             | quarksUp                                                                                                                                                                                       |
| -------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| my leaves                        | `GET /leaves?employee_id&from&to`     | `GET /times/v3/odata/requests?employeeId=<employeeId>&beginDate&endDate&$top=500&$count=true` (max 24 months)                                                                                  |
| my calendar + non-working days   | —                                     | `GET /times/v3/planners/me?beginDate&endDate` (max 12 months)                                                                                                                                  |
| create leave                     | `POST /leaves`                        | `POST /times/v3/requests?workflowSequenceId=11281` (see §6)                                                                                                                                    |
| preview / validate before create | —                                     | `GET /times/v3/requests/preview?employeeId&beginDate&endDate&isSocialSecurity=false&details=Segments,Natures,Warnings`                                                                         |
| cancel leave                     | `DELETE /leaves/:id`                  | `PUT /times/v3/requests/{id}/workflows/{seq}` with body `{ fields: { comment: null } }`; `seq` comes from `_workflows.CancelRequest.sequenceId` of the request (11283 for status New). See §6c |
| update leave                     | — (not in old app)                    | `GET /requests/{id}/preview` then `PUT /requests/{id}` with the create body. See §6b                                                                                                           |
| counters                         | `GET /allowance_stats/...`            | `GET /times/v3/entitlements?employeeId=<employeeId>`                                                                                                                                           |
| public holidays                  | `GET /company_holidays`               | `GET /times/v3/planners/holidays?beginDate&endDate&countryCode=FR` (max 18 months; also school holidays by zone)                                                                               |
| who is off (team)                | `GET /calendar_events`                | `GET /times/v3/planners/service?beginDate&endDate&top=500` (max 2 months, all services, 300 employees, 414 KB)                                                                                 |
| leave types                      | hard-coded ids                        | `GET service-<tenant>.../api/v2/organization/metadata/absenceNature?includeInactive=true`                                                                                                      |
| statuses                         | `approved` boolean                    | `GET .../metadata/absenceStatus`                                                                                                                                                               |
| people / avatars                 | `/accesses`, `/employees`, `/rails/*` | employees embedded in planners/service with `picture.url` (presigned); `thumbnails=small` param                                                                                                |

## 5. Response shapes (observed)

### odata/requests

```json
{ "@odata.count": 2, "value": [ {
  "id": 34, "statusId": 1, "date": "2026-10-12T00:00:00+02:00",
  "beginDate": "2026-10-12T00:00:00+02:00", "endDate": "2026-10-12T23:00:00+02:00",
  "duration": 1.0, "_isReadOnly": false,
  "employee": { "id": <employeeId>, "firstName": "…", "lastName": "…", "reference": "<reference>",
    "picture": { "url": "…" }, "position": { "job": { "label": "…" } },
    "absenceAgreement": { "id": 6, "label": "Fulll (CP + fulll off)" } },
  "segments": [ { "beginDate": "…", "endDate": "…", "duration": 1.0, "natureId": 75 } ],
  "_workflows": { "CancelRequest": { "label": "Annuler la demande",
    "href": "https://api.quarksup.net/times/v3/requests/34/workflows/11283",
    "sequenceId": 11283, "nextStatus": "Absence_Cancelled", "fields": [] } },
  "_audit": { "createdDate": "…", "createdBy": "…" }
} ] }
```

### planners/me

```json
{ "id": <employeeId>, "firstName": "…", "lastName": "…", "job": { "id": 243, "label": "…" },
  "duration": 0.0, "nonWorkingDates": [ "2026-10-03T00:00:00.000Z", "…" ],
  "absences": [ { "id": 34, "segments": [ { "id": 34, "beginDate": "2026-10-12T00:00:00.000Z",
     "endDate": "2026-10-12T23:00:00.000Z", "duration": 1.0, "natureId": 75, "validated": false } ],
     "_links": { "self": "…/times/v3/requests/34" } } ],
  "engagements": [], "picture": { "url": "…" } }
```

### planners/service

Array of `{ id, label, employees: [ <same shape as planners/me> ] }`, one item
per service (TECH 42, PRODUIT 39, FINANCE 37, RH 41, RELATION CLIENT 40,
MARKETING 38, COMMERCE 36, plus one unlabelled). Segments in this view have
`natureId: null` for other people (privacy), `validated` boolean.

### entitlements

Array of

```json
{ "id": 388, "earned": 8.32, "used": 3.5, "balance": 4.82, "pending": 0, "saved": 0,
  "external": 3.5, "usedWorkableRestDays": 0, "externalWorkableRestDays": 0,
  "period": { "id": 38, "natureId": 14, "agreement": { "id": 6, "label": "Fulll (CP + fulll off)" } },
  "employee": { "id": <employeeId>, "…": "…", "position": { "serviceId": 42, "entity": { "label": "TECH" }, "…": "…" } },
  "lineManager": { "id": 1051, "firstName": "…", "lastName": "…" } }
```

Header `x-total-count`. Default returns periods n-1, n, n+1.

### holidays

`{ public: [ { label, date } ], schoolTerm: [ { area, holidays: [ { beginDate, endDate, label } ] } ] }`

### workflows/me

`{ TakeLeave: { label: 'Ajouter une absence', href: '…/times/v3/requests?workflowSequenceId=11281', sequenceId: 11281, nextStatus: 'Absence_New', fields: [] } }`

## 6. Creating a request (captured from the SPA wizard, 2026-10-12)

Step 1, after the dates are picked:

```
GET /times/v3/requests/preview?employeeId=<employeeId>&locale=fr-FR
    &beginDate=2026-10-22T00:00:00Z&endDate=2026-10-23T23:00:00Z
    &thumbnails=small&overlapScope=Service&details=default,Conflicts,Overlaps
    &isSocialSecurity=false
```

Extra request header the SPA sends on preview and create: `absence-beta: true`.

Preview response (9.5 KB) gives everything the form needs:

- `calendarType: 'DayWorked'`
- `natures[]`: the natures allowed for this employee and dates, each with
  `threshold` (= balance) and `entitlement { id, periodId, balance, earned,
  used, pending, roundingPolicy }` for accruable natures (17 FOFF → 656,
  14 CP → 388), `null` for TT (75) and the others. Flags
  `enforceWholeDayAbsence`, `enforceEntitlementThreshold`, `requiresDocument`.
- `segments[]`: proposed split, here one segment 2026-10-22..23, `duration 2.0`,
  `expectedDuration 2.0`, default `natureId 17`.
- `overlappingRequests[]`: colleagues of the same service off on those dates
  (`employee { id, firstName, lastName, picture }`, `beginDate`, `endDate`,
  `statusId`). This is the "who is off" data for the chosen range.
- `conflictingEvents[]`, `warnings`.

Step 2, submit:

```
POST /times/v3/requests?workflowSequenceId=11281&locale=fr-FR
content-type: application/json
prefer: return=representation
absence-beta: true

{"duration":2,"beginDate":"2026-10-22T00:00:00Z","endDate":"2026-10-23T23:00:00Z",
 "employeeId":<employeeId>,
 "segments":[{"entitlementId":null,"duration":2,"natureId":75,"id":null,
              "beginDate":null,"endDate":null,"document":null}],
 "comment":null}
```

→ `201` with a bulk-style envelope (because of `prefer: return=representation`):

```json
{ "result": [ { "identifier": 155,
                "request": { "employeeId": <employeeId>, "beginDate": "…", "endDate": "…",
                             "segments": [ { "duration": 2.0, "natureId": 75 } ] },
                "result": { "id": 155, "statusId": 1, "employee": { … },
                            "date": "…", "beginDate": "…", "endDate": "…",
                            "segments": [ … ], "_workflows": { … }, "_links": { … } } } ] }
```

`result[0].result` has the same shape as `GET /requests/{id}`.

Notes:

- Dates are sent as `YYYY-MM-DDT00:00:00Z` / `T23:00:00Z` (UTC-suffixed,
  but they are local wall-clock markers: the server stores them as
  `+02:00`). Half days: `T00:00:00Z..T12:00:00Z` and `T13:00:00Z..T23:00:00Z`.
- `entitlementId` is `null` for TT; for CP/FOFF the SPA takes it from
  `preview.natures[].entitlement.id` (388 / 656).
- `duration` is the working-day count, both at the root and in the segment.
- `workflowSequenceId` comes from `GET /requests/workflows/me` (`TakeLeave`).
- Several natures in one request are possible (`segments[]`), preview
  computes the split.

Request id 155 (TT, 22–23 Oct 2026) created during the capture is a real
absence the user wanted; it stays.

## 6b. Updating a request (captured, request 165)

Preview for an update is the same call with the request id in the path:

```
GET /times/v3/requests/165/preview?employeeId=<employeeId>&beginDate=…&endDate=…
    &thumbnails=small&overlapScope=Service&details=default,Conflicts,Overlaps
    &isSocialSecurity=false
```

Then:

```
PUT /times/v3/requests/165?locale=fr-FR
prefer: return=representation
absence-beta: true

{"duration":1,"beginDate":"2026-10-20T00:00:00Z","endDate":"2026-10-20T23:00:00Z",
 "employeeId":<employeeId>,
 "segments":[{"entitlementId":null,"duration":1,"natureId":75,"id":null,
              "beginDate":null,"endDate":null,"document":null}],
 "comment":null}
```

Same body as create (segments are replaced, `segment.id` null → new ids).
→ `200` with the request object directly (no `result[]` envelope this time),
`statusId 1`, new segment ids.

## 6c. Cancelling a request (captured, request 165)

```
PUT /times/v3/requests/165/workflows/11283?locale=fr-FR
content-type: application/json

{"fields":{"comment":null}}
```

→ `200` `{"type":"Success"}`. The sequence id comes from
`request._workflows.CancelRequest.sequenceId` (11283 for a request in status
New; other statuses may expose a different sequence, read it from the
object, do not hard-code). The quarksUp UI runs this with no confirmation
dialog: one click cancels. Product requirement for the new helper: cancel
only after an explicit confirmation step.

A validated request (status 2) has no `CancelRequest`. It has
`_workflows.CancellationRequest` instead (observed 2026-10-15):
`label 'Demander l'annulation'`, `sequenceId 11282`,
`nextStatus 'Absence_CancelOngoingManager'`, `fields []`. The call is the same
`PUT .../workflows/{seq}`; the request then waits in status 5 for the
manager.

## 7. Day / half-day encoding

From planners data (ISO with `.000Z` in planners, `+02:00` in OData):

| Case      | beginDate      | endDate        | duration           |
| --------- | -------------- | -------------- | ------------------ |
| full day  | `D T00:00:00`  | `D T23:00:00`  | 1.0                |
| morning   | `D T00:00:00`  | `D T12:00:00`  | 0.5                |
| afternoon | `D T13:00:00`  | `D T23:00:00`  | 0.5                |
| multi-day | `D1 T00:00:00` | `D2 T23:00:00` | working days count |

Replaces Factorial's `half_day: 'beggining_of_day' | 'end_of_day'`.
`duration` counts working days only (non-working dates come from
`planners/me.nonWorkingDates`).

## 8. Fulll reference data

Absence natures (`metadata/absenceNature`, active ones relevant to the helper):

| natureId | reference | label               | Factorial equivalent         |
| -------- | --------- | ------------------- | ---------------------------- |
| 75       | TT        | Télétravail         | Fulll@Home (1089430)         |
| 17       | FOFF      | Fulll Off           | Fulll Off (1089438)          |
| 14       | CP        | Congés Payés        | Congés Payés (1001195)       |
| 54       | CETCP     | CET jours CP        | CET - Congés Payés (1739148) |
| 56       | CETFOFF   | CET jours Fulll off | CET - Fulll Off (1365298)    |
| 55       | RTT       | RTT                 | —                            |
| 53       | RFJ       | Repos forfait jours | —                            |
| 16       | CONSSOL   | Congés sans solde   | —                            |
| 32       | MA        | Arrêt maladie       | —                            |

Flags per nature: `paidLeave`, `entitlementAccruable`, `timeSavingAccount`,
`plannerCode`, `color` (signed int ARGB). The full list comes from `metadata/absenceNature` at runtime.

Statuses: 1 New, 2 Validated, 3 Refused, 4 Cancelled, 5 CancelOngoingManager,
6 CancelOngoingRH.

Periods: CP (nature 14) runs June→May (`2026-2027` = 2026-06-01..2027-05-31,
several period ids per agreement); FOFF (17), RFJ (53), RTT (55) run on the
calendar year.

## 9. Permissions seen in the spec

`absence-requests:read|write`, `absence-requests.planners.me:read`,
`absence-requests.planners.service:read`, `absence-requests.planners.manager:read`
(team planner needs a manager role; the service planner works for an Employee).

## 10. Open points

1. Token refresh: deliberately out of scope (decision 2026-10-12). The user
   pastes the bearer token by hand, as the cookie was pasted in the Factorial
   helper, and owns its 1 h lifetime. Candidate for a later change: the ADFS
   token endpoint `POST login.quarksup.net/adfs/oauth2/token/` answers
   `{ access_token, token_type: 'bearer', expires_in: 3600, resource,
   refresh_token, refresh_token_expires_in: 299, scope: 'openid', id_token }`.
   The refresh token lives about five minutes, so rotation means a
   continuous refresh loop, and the Connect screen would have to accept the
   whole token response, not only the bearer.
2. OIDC login: most likely not possible (owner, 2026-10-12). ADFS gives
   tokens only to a registered client with registered redirect URIs, and
   the quarksCharm domain is not one of them.
3. Multi-account: never (owner, 2026-10-12). The app keeps one tenant and
   one token.
4. People API spec: fetch any `people/v3` response and read its `link` header
   for the openapi URL, if avatars/directory beyond the planner are needed.
5. (closed) Cancel and update captured live, see §6b/§6c.
