## 1. Site
- [x] 1.1 Build the landing page, privacy notice and terms from `site/pages/` into `site/public/`, with `--check` to catch stale output.
- [x] 1.2 WL-001 Waitlist form that works with and without JavaScript, including the no-JavaScript result notes.

## 2. Waitlist service
- [x] 2.1 WL-002 Store only the listed fields, never the raw IP.
- [x] 2.2 WL-003 Refuse sign-ups when `IP_HASH_SALT` is missing.
- [x] 2.3 WL-004 Same response for new and existing addresses.
- [x] 2.4 WL-005 Origin, size, honeypot and rate limits, with optional Turnstile.
- [x] 2.5 WL-006 Token-protected CSV export with formula neutralising.
- [x] 2.6 Run the site tests and the generated-page check from `just test`.

## 3. Launch (founder)
- [ ] 3.1 Create the D1 database and Pages project, set `ADMIN_TOKEN` and `IP_HASH_SALT`, deploy, and connect the domain.
- [ ] 3.2 Read the privacy notice and terms and remove their "not yet reviewed" banners.
