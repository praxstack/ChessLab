# Waitlist lists, a private manage link, and the market pulse

## Why

On 9 October 2026 the founder asked how people would unsubscribe later, and for the waitlist to grow into real subscriptions: a newsletter, leads, and a reading of market sentiment. `beta-waitlist-site` stored an address and a rating and promised an unsubscribe link in every email, with no mechanism behind the promise. Nothing has been sent yet, so this is the moment to put the mechanism in before the first email.

## What changes

- Every sign-up is on the **beta** list (what the consent box covers) and may opt in to two more: the monthly **letter** and **research** questions. Each list is on or off per person, with the time it was switched on.
- Each person has a **private manage link**, `/manage/?t=<32 hex>`, created with their row. It is never shown on the site; it travels only in email and in the admin export. The page it opens is rendered by a Pages Function from the built template with the person's current choices, so it works without JavaScript. From it a person can change lists, leave every list in one click, answer the market pulse, or delete the sign-up outright.
- **One-click unsubscribe** per RFC 8058: `POST /api/waitlist/unsubscribe?t=…` answers a bare 200 to a mail provider's `List-Unsubscribe=One-Click` post, with no Origin header required and no rate limit, and never a redirect.
- Leaving every list **clears** the rating, source, campaign tags, answers, dates and pulse code; the address, the choice and the manage code stay, so the address is not re-added by mistake and the link still works to come back or delete.
- A **repeat sign-up never changes an existing row**. A ticked box on a public form does not prove the submitter owns the address, so it cannot re-subscribe anyone; coming back is done from the person's own link.
- The sign-up answer is the **same shape for a new and an existing address**: `{ ok, pulse }` with a fresh pulse code. For a new row the code is stored and lets the page save the market pulse; for an existing row it is stored nowhere and the pulse is accepted and discarded, with the same reply. The honeypot gets the same shape.
- The **market pulse**: three multiple-choice questions (how they review games, what is hardest, what they would pay) and one free-text wish, defined once in config, rendered by the build and validated against the same list, versioned, offered after joining and on the manage page. Opt-ins on the pulse only ever turn a list on.
- **Admin stats**: `GET /api/waitlist/stats` returns list sizes, rating bands, sources, pulse counts for the current questionnaire version, the latest wishes and sign-ups per day, with no addresses. The CSV export gains `lists`, `answers` and `manage_url`.
- The manage page carries the site's security headers itself (Cloudflare does not apply `_headers` to Function responses) and `Referrer-Policy: no-referrer`.
- The privacy notice names the lists, the answers, the two codes, one-click unsubscribe, self-delete, and exactly what leaving every list clears and keeps. The landing page's "only for beta news" promise is qualified by the opt-ins.

## Non-goals

- Sending any email. The README names the headers every email must carry and three realistic providers; the choice is the founder's.
- Double opt-in by email, which needs a sender.
- Accounts, analytics, cookies or third-party scripts.
- Changing the coach app.

## Status

Implemented on branch `claude/subscriptions` (PR #27), reviewed by Codex, CodeRabbit and an independent reviewer, with their findings addressed. 94 automated tests against a fake D1 database; exercised end to end on `wrangler pages dev`. Deploy order: `npm run db:migrate:remote`, `npm run deploy`, then the one-line backfill in the README for any sign-up that landed in between.

## Open decisions

- Which email provider, and when the first letter goes out.
- Whether to keep `Good` answers on the pulse after the first hundred responses, or shorten it to the one question that moved.
