## Purpose

Let visitors join the AskTheMove beta waitlist from a public page, keeping only what the founder needs to send invites.

## ADDED Requirements

### Requirement: WL-001 Sign-up with and without JavaScript
The waitlist form SHALL post to `/api/waitlist` and work without JavaScript. A JSON caller SHALL receive `{ ok: true }` on success or `{ ok: false, error }` with a sentence the page can show. A plain form post SHALL be redirected back to the page with a fragment that names a result note the page shows without JavaScript.

#### Scenario: Plain form post
- **WHEN** a visitor without JavaScript submits a valid email with consent ticked
- **THEN** the address is stored and the page they return to says they are on the list

#### Scenario: Plain form post with a mistake
- **WHEN** a visitor without JavaScript submits an incomplete email address
- **THEN** nothing is stored and the page they return to says the sign-up failed and what to check

### Requirement: WL-002 Consent and minimal data
A sign-up SHALL require an explicit consent tick. The service SHALL store only the normalised email, the consent time, an optional rating band, the form name and campaign tags. It SHALL never store the raw IP address.

#### Scenario: Missing consent
- **WHEN** a sign-up arrives without consent
- **THEN** it is refused with 400 and nothing is stored

### Requirement: WL-003 Salted IP hashes fail closed
The service SHALL hash the client address with the `IP_HASH_SALT` secret for rate limiting. When the secret is missing it SHALL refuse sign-ups with 503 and store nothing, because a known salt would let anyone reverse the hash.

#### Scenario: Secret not configured
- **WHEN** a sign-up arrives and `IP_HASH_SALT` is unset
- **THEN** the response is 503 and neither the waitlist nor the rate-limit table changes

### Requirement: WL-004 No membership disclosure
A new address and one already on the list SHALL receive the same response, so the form cannot reveal who has signed up.

#### Scenario: Duplicate address
- **WHEN** an address already on the list is submitted again, in any letter case
- **THEN** the response matches a first sign-up and no row is added

### Requirement: WL-005 Abuse limits
The service SHALL refuse requests from other origins, bodies over 16 KB and unreadable bodies, and SHALL allow at most five submissions per hashed address in ten minutes. A filled honeypot SHALL get a success response and store nothing.

#### Scenario: Too many attempts
- **WHEN** one connection submits a sixth time within ten minutes
- **THEN** it receives 429 with a Retry-After header

### Requirement: WL-006 Admin export
`GET /api/waitlist/export` SHALL return the list as CSV only to a request bearing `ADMIN_TOKEN`, compared in constant time. Cells that a spreadsheet would run as a formula SHALL be neutralised.

#### Scenario: No token
- **WHEN** the export is requested without a valid token
- **THEN** the response is 401 and contains no addresses
