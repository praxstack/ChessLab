# Before you buy the domains and mailboxes

Everything here is free and can be done today. Nothing has been bought, deployed or submitted for you.

On 2026-10-08 Prax bought `askthemove.online` on Cloudflare ($4.99 the first year, renews at $27.70 on 8 October 2027, auto-renew off). The plan is to move to `askthemove.com` only if AskTheMove takes off; it was still unregistered on 2026-10-08. `praxmodoro.com` was also still available then. Check again right before you pay.

## The order

| # | Step | Cost | Who | Where the steps are |
|---|------|------|-----|---------------------|
| 1 | Review and merge the website PRs: [AskTheMove #18](https://github.com/praxstack/ChessLab/pull/18) and [Praxmodoro #61](https://github.com/praxstack/Praxmodoro/pull/61) | free | you | the PRs |
| 2 | Read `/privacy/` and `/terms/` on each site, edit what doesn't fit, remove the "not yet reviewed" banner | free | you | `site/src/pages/privacy.html`, `terms.html` |
| 3 | Create one free Cloudflare account | free | you | dash.cloudflare.com/sign-up |
| 4 | Deploy each site to its free `*.pages.dev` address with a working waitlist | free | you | section 1 of each `site/README.md` |
| 5 | Join both waitlists with your own email, then download the CSV to prove it works | free | you | section 4 of each `site/README.md` |
| 6 | Create a Claude Console account (console.anthropic.com) | free | you | needed for the application |
| 7 | Done for AskTheMove: `askthemove.online` bought 2026-10-08. Verify the registrant email Cloudflare sends (ICANN puts unverified domains on hold) and check the Contact tab. Buy `praxmodoro.com` later | .online $4.99 first year; .com $10.46 a year ($11.17 from 1 Nov 2026) | you | Cloudflare dashboard, Domain Registration |
| 8 | Attach each domain to its Pages project, set `siteUrl`, redeploy | free | you | section 2 of each `site/README.md` |
| 9 | Zoho Mail Forever Free, one Zoho account per company, add the MX, SPF, DKIM and DMARC records | free | you | section 3 of each `site/README.md` |
| 10 | Send and receive a test email at `hello@askthemove.online` | free | you | |
| 11 | Apply to Claude for Startups with the site, the matching email and the description from the plan | free | you | plan artifact, Part 3 |

Steps 1 to 6 are what "before buying" means. After step 4, both sites are live and collecting sign-ups on `pages.dev` even without a domain.

## DNS records for Zoho (India data centre)

Use exactly what Zoho shows you. These are what Zoho normally shows for an India account.

| Type | Name | Value | Priority |
|------|------|-------|----------|
| TXT | `@` | the `zoho-verification=...` value Zoho gives | |
| MX | `@` | `mx.zoho.in` | 10 |
| MX | `@` | `mx2.zoho.in` | 20 |
| MX | `@` | `mx3.zoho.in` | 50 |
| TXT | `@` | `v=spf1 include:zoho.in ~all` | |
| TXT | `zmail._domainkey` (or the name Zoho gives) | the DKIM key Zoho gives | |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@<domain>` | |

Only one SPF record per domain. If one exists, edit it.

## Things only you can decide

- Which email you already have, and whether it should be the contact address instead of `hello@<domain>`. The address is set in one place per site (`site.config.json` or the site config file named in the README).
- Whether to apply for Praxmodoro now or after it has a Claude feature. The plan recommends AskTheMove first.
