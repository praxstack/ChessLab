## Purpose

Let a person on the waitlist choose which emails they get, leave in one click, answer four optional questions, or delete themselves, each without JavaScript and without the site ever revealing who is on the list.

## MODIFIED Requirements

### Requirement: WL-002 Consent and minimal data
A sign-up SHALL require an explicit consent tick. The service SHALL store only the normalised email, the consent time, an optional rating band, the form name, campaign tags, the fixed product name, the lists the person has chosen with the time each was turned on, a private manage code, a pulse code, and the person's optional market-pulse answers. It SHALL never store the raw IP address.

#### Scenario: Missing consent
- **WHEN** a sign-up arrives without consent
- **THEN** it is refused with 400 and nothing is stored

#### Scenario: What a new row holds
- **WHEN** a valid sign-up is stored
- **THEN** the row is on the beta list since its consent time, off the letter and research lists, and carries a manage code and a pulse code that differ

### Requirement: WL-004 No membership disclosure
A new address and one already on the list SHALL receive the same response shape, `{ ok: true, pulse }`, so the form cannot reveal who has signed up. The manage code SHALL never be returned by the sign-up. The pulse endpoint SHALL answer a request made with a pulse code identically whether or not the code matched a row, including on invalid input. A repeat sign-up SHALL NOT change the existing row.

#### Scenario: Duplicate address
- **WHEN** an address already on the list is submitted again, in any letter case
- **THEN** the response has the same keys as a first sign-up, no row is added, and the existing row is unchanged, even if it had left every list

#### Scenario: Pulse with a code that matches nothing
- **WHEN** the pulse is posted with a well-formed code that is stored nowhere
- **THEN** the reply is the same as for a stored code, including on bad input and on a storage failure, and nothing is written

#### Scenario: Retry after a lost answer
- **WHEN** the page retries a sign-up with the same per-visit key after the first answer was lost
- **THEN** it receives the same pulse code, which still saves the pulse for that row

#### Scenario: A key reused for another address
- **WHEN** a sign-up for a different address carries a key already used for one
- **THEN** the reply is a normal sign-up reply whether or not that address was on the list, and the code matches nothing

## ADDED Requirements

### Requirement: WL-007 Lists
Each person SHALL be on or off each of three lists, beta, letter and research, with the time each was turned on. The letter and research lists SHALL only ever be turned on by the person: on the pulse after joining, or on their manage page.

#### Scenario: Pulse opt-in
- **WHEN** the pulse is saved with the letter box ticked
- **THEN** the letter list is on from that moment, and an unticked box on a later pulse leaves it on

### Requirement: WL-008 The manage link
Each row SHALL carry a 128-bit random manage code. `GET /manage/?t=<code>` SHALL render the person's current lists and answers into the page without JavaScript, with the site's security headers and `Referrer-Policy: no-referrer`, and SHALL NOT count against any rate limit. An unknown code SHALL get a "link not valid" page with no detail; a rate limit or a server problem SHALL get a "try again later" page, never "link not valid".

#### Scenario: Valid link
- **WHEN** a manage link with a stored code is opened
- **THEN** the page shows the address, the current lists ticked, the saved answers, and the code in every form

#### Scenario: Service problem
- **WHEN** the manage page is opened while the salt is missing
- **THEN** the response is 503 with the "try again later" state

### Requirement: WL-009 Changing lists and leaving
`POST /api/waitlist/preferences` with the manage code SHALL set each list to ticked or not, keeping the original time for a list that stays on, and SHALL apply only if the lists have not changed since the page was rendered; otherwise it SHALL report the change and the current state instead of overwriting it. `POST /api/waitlist/unsubscribe` with the code SHALL turn every list off and SHALL work without the rate-limit salt when it is not counted. When every list is off, the service SHALL clear the rating, source, campaign tags, answers, dates and pulse code, and keep the address, the choice and the manage code. A mail provider's `List-Unsubscribe=One-Click` post SHALL be accepted with no Origin header, SHALL NOT count against the rate limit, and SHALL be answered with a bare status, 200 on success, never a redirect.

#### Scenario: One-click unsubscribe
- **WHEN** a provider posts `List-Unsubscribe=One-Click` with the code in the query and no Origin
- **THEN** the response is 200 plain text and every list is off

#### Scenario: Leaving clears the rest
- **WHEN** a person leaves every list
- **THEN** their row keeps only the address, the lists all off, the time of that choice and the manage code

### Requirement: WL-010 Self-delete
`POST /api/waitlist/delete` with the manage code and the confirmation tick SHALL remove the row at once. Without the tick the service SHALL refuse with 400 and delete nothing, whatever the client. The code SHALL then open the "link not valid" page.

#### Scenario: Delete
- **WHEN** a person posts the delete form with the confirmation ticked
- **THEN** the row is gone and the link no longer works

#### Scenario: No confirmation
- **WHEN** the delete endpoint is posted with a valid code and no confirmation
- **THEN** the response is 400 and the row stays

### Requirement: WL-011 The market pulse
The pulse SHALL be three multiple-choice questions and one free-text wish, defined once in config; the build SHALL render them from that config and the API SHALL validate against it. Answers SHALL be stored with the questionnaire version. A later save SHALL merge over answers of the same version and replace answers of an older one. A wish sent empty SHALL clear the stored wish.

#### Scenario: Unknown option
- **WHEN** an answer is not one of the configured options
- **THEN** the post is refused with 400 and nothing changes

### Requirement: WL-012 Admin stats
`GET /api/waitlist/stats` SHALL return, to a bearer of `ADMIN_TOKEN` only, the total, list sizes, rating bands, form names, campaign sources, pulse counts for the current questionnaire version, how many hold answers to an older one (whatever questions existed then), the twenty latest wishes, and sign-ups per day for thirty days, with no addresses, summed over every row. Sign-ups per day SHALL come from an anonymous tally kept at sign-up time, so leaving every list or deleting a row never changes the history. Visitor-supplied labels SHALL be counted as labels, never as object properties.

#### Scenario: Stats without a token
- **WHEN** the stats are requested without a valid token
- **THEN** the response is 401

### Requirement: WL-013 Honest promises
The privacy notice and the landing page SHALL describe exactly what is collected, which emails are sent only on opt-in, that the free-text wish is read as written, what leaving every list clears and keeps, and that the manage link arrives by email.

#### Scenario: Notice matches code
- **WHEN** a person leaves every list
- **THEN** what the notice says is kept is exactly what the row still holds
