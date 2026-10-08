# AskTheMove landing page and beta waitlist

## Why

On 8 October 2026 the founder directed a public landing page and beta waitlist for AskTheMove, to collect interest before the hosted private beta and to support an application to Anthropic's startup program. `hosted-beta-readiness` already supersedes the 13 September local-only direction for hosting. This change covers the one public piece that stores visitor data: the waitlist. The coach app itself stays local by default and is unaffected.

## What changes

- A static site in `site/`, built from `site/pages/` into `site/public/` by `site/scripts/build.mjs`, deployed to Cloudflare Pages. It holds the landing page, a privacy notice and terms, all on the site's own origin with a strict content security policy.
- `POST /api/waitlist` (a Pages Function) stores an email, consent time, an optional rating band, the form it came from and campaign tags in a Cloudflare D1 database. It accepts JSON from the page script and plain form posts without JavaScript.
- Abuse limits: a honeypot field, an allowed-origin check, a body size limit, five submissions per connection every ten minutes, and optional Cloudflare Turnstile.
- Privacy: the raw IP is never stored, only a hash salted with a secret. The service refuses sign-ups when that secret is missing. A new and an existing address get the same answer.
- `GET /api/waitlist/export` returns the list as CSV to a bearer of `ADMIN_TOKEN`.
- `just test` runs the site's tests and its generated-page check.

## Non-goals

- Deploying, buying a domain or creating Cloudflare accounts. The founder does these.
- Sending any email. Invites are sent by hand from the export.
- Accounts, analytics, cookies or third-party scripts beyond optional Turnstile.
- Changing the coach app, its hosting or its data.

## Status

Implemented with automated tests against a fake D1 database. Run locally with `wrangler pages dev`. Not deployed. The privacy notice and terms carry a "not yet reviewed" banner until the founder has read them.
