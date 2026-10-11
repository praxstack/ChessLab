# Claude for Startups Playbook

Oct 9, 2026

## Update, 9 Oct: Team year and $1,000 credits are paused

Anthropic paused the free Claude Team year and the $1,000 API credit for anyone who has not claimed them yet; Startup Stack, Applied AI office hours and events continue, and every unclaimed application is being re-reviewed with stricter checks that it is a real startup. Confirmed on the [program page FAQ](https://claude.com/programs/startups) ("we're currently over capacity on the Claude Team and $1,000 API credit offers") and in Claude's own X post as [reported here](https://www.chaincatcher.com/en/article/2295116).

| Benefit | Now | What it means for AskTheMove |
| --- | --- | --- |
| Claude Team, 1 year free | Paused | Nothing lost: you have not applied yet |
| $1,000 API credits | Paused | The coach's API bill is yours until credits return |
| Startup Stack partner deals (up to $45,000) | Still offered | Still a reason to apply |
| Applied AI office hours and events | Still offered | Still a reason to apply |
| Review | Unclaimed applications re-reviewed, stricter startup check | Apply only when a reviewer can verify everything |

Your rule stands and matters more now: apply only after the site is live on askthemove.online, launched on X and LinkedIn, with real waitlist sign-ups. Applying early gains nothing (there is nothing to claim) and a thin application risks failing the stricter check, with no published reapply rule. The new criteria are not published; if they turn out to require a registered company, we look at the lightest option then. Set a Console spend limit before the coach's first live call (Phase 4), and check the program page before applying in case the credits are back.

## At a glance

&#91;embedded content: application path · 6 phases, 2 review gates\]

Everything a reviewer can check must already be true when you press Apply. Review times come from the program page; what the automatic check looks at is my inference.

## Honest odds

Nobody can promise 99.99%: the terms say eligibility "is determined in Anthropic's sole discretion". What you can do is make every row below that you control true and checkable before you press Apply.

| What Anthropic weighs | Where it is stated | AskTheMove today | After this playbook |
| --- | --- | --- | --- |
| Founded in the last 5 years, or funded in the last 2 | Program page | Yes: the repo started in Sept 2026 | Yes |
| Company email that matches the website's domain | Program page | Done: prax@askthemove.online sends and receives (tested 8 Oct) | prax@askthemove.online on askthemove.online |
| Claude Console account | Program page | Not created with a company email | Created with that email, org named AskTheMove |
| Short description of what you're building | Program page | Drafted below | Ready to paste |
| Supportability policies | Program page | Chess coaching, no issue | Same |
| Business traction | Terms, section 4 | 0 users, waitlist not live | Waitlist live, real sign-up count |
| Investment and funding | Terms, section 4 | Bootstrapped | Bootstrapped, said plainly (allowed) |
| Claude integration and usage | Terms, section 4 | Coach built in PR #17, never called live | Merged, real calls on the company Console org |

Most applications are decided within minutes and the rest take 2 to 3 business days of manual review. My reading, not stated by Anthropic: the fast path can only check what a machine can see (domain, email, Console account, a complete form), so those rows must be exact; the last three rows are what a human reviewer weighs.

The four mistakes most likely to sink it: applying before the site loads on the domain, signing up with Gmail, a Console org with zero Claude usage, and any invented number.

## Questions only you can answer

You answered the key ones on 8 Oct: no registered business, bootstrapped with no investors, and start phase 1 now. The drafts below use those answers and the defaults in the last column for the rest; reply with any that are wrong.

| Question | Why it matters | Default used in the drafts |
| --- | --- | --- |
| Do you have a registered business (Udyam, GST, LLP or Pvt Ltd)? | The terms treat the applicant as "the Company"; the form may ask for company details | No registration claimed; company name "AskTheMove", sole founder |
| Your full name and job title | Form fields | Your legal name; title "Founder" |
| Any investors? | Funding is a stated factor; bootstrapped is allowed | Bootstrapped, no investors |
| A card that works for international payments? | Domain ($4.99 the first year, about ₹480) and a small Claude API top-up | Yes |
| Any real users or testers yet? | Traction is a stated factor | None yet; the answer says "pre-launch" |
| Which email do you already have? | The form needs an email on the website's domain | A new prax@askthemove.online on Zoho |
| Apply for Praxmodoro now too? | It has no Claude feature yet | Later, after AskTheMove's decision (last section) |

## Step by step

Do phases 1 to 4 in order, run phase 5 alongside, and apply in phase 6 once the waitlist has been public for a few days. Total cash: about ₹480 ($4.99, already paid) plus GST for the domain plus a small Claude API top-up.

### Phase 1: product ready (mostly me, you approve)

- [x] Merge [PR #17](https://github.com/praxstack/ChessLab/pull/17) first: the Claude coach ("Explain why", "Why not this move?"). Merged on 8 October 2026.
- [ ] Then merge [PR #19](https://github.com/praxstack/ChessLab/pull/19): original pieces, icons and bot portraits replace the Chess.com art.
- [ ] Rename the app's on-screen name from ChessLab to AskTheMove. It is PR #21, on top of #19; merge it third.
- [ ] Merge [PR #18](https://github.com/praxstack/ChessLab/pull/18): the landing page and waitlist.

### Phase 2: domain and email (you, about 30 minutes)

- [x] Bought askthemove.online on Cloudflare Registrar on 8 October 2026: $4.99 for the first year, then $27.70 a year from 8 October 2027 (auto-renew is off). Click the registrant verification email Cloudflare sends, or ICANN puts the domain on hold, and check the Contact tab is accurate. Move to askthemove.com only if AskTheMove takes off, and decide before the renewal.
- [x] Zoho Mail Forever Free: done on 8 October 2026. The domain is verified, and the MX, SPF, DKIM and DMARC records are in Cloudflare DNS (India data centre: mx.zoho.in). Add hello@, beta@ and info@ as aliases on your mailbox: Admin Console, Users, your name, Mailbox Settings, Email Alias.
- [x] Created prax@askthemove.online and tested it both ways on 8 October 2026: a mail from Gmail arrived in Zoho, and a reply from Zoho arrived in Gmail. Turn on two-step sign-in in Zoho, since Anthropic's decision will land in this inbox.
- [ ] Install the Zoho Mail app on your phone and turn on notifications. The free plan has no IMAP, POP or ActiveSync, so it won't show up in Gmail or Apple Mail, and Anthropic's decision and your Console sign-in codes land only here. Mail Lite (₹59 a month) adds those only if you ever need them.

### Phase 3: website live on the domain (you, about 20 minutes, free)

- [ ] Put the site live, in Terminal on your Mac (about 20 minutes):
  1. Check Node: `node -v` must print 22 or higher.
  2. Get the site code: `git clone https://github.com/praxstack/ChessLab.git`, then `cd ChessLab`, `git checkout claude/beta-waitlist-site`, `cd site` and `npm install`. If you already have the repo, run `git fetch` before the checkout.
  3. Sign in to Cloudflare: `npx wrangler login`, then press Allow in the browser.
  4. Create the database: `npx wrangler d1 create askthemove-waitlist`. Copy the `database_id` it prints into `wrangler.toml`, replacing the zeros.
  5. Create its tables: `npm run db:migrate:remote`, and answer y.
  6. Create the Pages project: `npx wrangler pages project create askthemove --production-branch main`. If the name is taken, use `askthemove-beta`, change `name` in `wrangler.toml` to match, and use that name below.
  7. Make two secrets. Run `openssl rand -hex 32` twice. Run `npx wrangler pages secret put ADMIN_TOKEN --project-name askthemove` and paste the first, then `npx wrangler pages secret put IP_HASH_SALT --project-name askthemove` and paste the second. Keep ADMIN\_TOKEN in your password manager: it unlocks the waitlist download.
  8. Deploy: `npm run deploy`. Open https://askthemove.pages.dev and join with your Gmail.
  9. Connect the domain: in the Cloudflare dashboard open Compute, then Workers & Pages, then askthemove, then Custom domains. Choose Set up a custom domain, enter `askthemove.online` and activate it. Do the same for `www.askthemove.online`.
  10. Point the links at the domain: in `site.config.json` set `"siteUrl": "https://askthemove.online"`, then run `npm run build` and `npm run deploy`. Send Claude the database\_id so PR #18 matches what is live.
- [ ] Open https://askthemove.online on your phone: it must load over HTTPS.
- [ ] Join your own waitlist once and download the CSV to prove it works (site/README.md, step 4).
- [ ] Read the privacy notice and terms, then remove their "not yet reviewed" banners.

### Phase 4: Claude Console with real usage (you, with my help)

- [ ] Sign up at [platform.claude.com](https://platform.claude.com) with prax@askthemove.online. Name the organization AskTheMove.
- [ ] Add a small prepaid credit (about $10), create an API key, and set a monthly spend limit of $10 under Settings > Billing > Spend limits. With credits paused, you pay for every explanation: about 2 to 4 cents each on Claude Opus 5.5 at low effort (my estimate from the prompt size; the Console's Usage page shows the real figure after the first calls).
- [ ] Run the app with `ANTHROPIC_API_KEY` set and use "Explain why" on 10 to 20 real positions from your own games.
- [ ] Copy the Organization ID from the Console's organization settings; the form may ask for it.
- [ ] Re-record the review clip with the coach on. I'll recut the demo video so it shows a real Claude explanation.

### Phase 5: first traction (you, alongside phases 3 and 4)

- [ ] Post the demo video and waitlist link where adult improvers are: r/chessbeginners, the Lichess forum, chess Discords, your LinkedIn and X. Check each place's self-promotion rules first.
- [ ] Optional: host the invite-only beta (a small server, a few dollars a month) and invite 5 to 10 testers.
- [ ] Before applying, count real sign-ups from the CSV. Use the real number, even if it is small.

### Phase 6: apply (you, about 15 minutes)

- [ ] Sign in to the Console as prax@askthemove.online with the AskTheMove org selected.
- [ ] Open [claude.com/programs/startups](https://claude.com/programs/startups) and press Apply now.
- [ ] Paste the answers from the next section. Never round up a number.
- [ ] Read the [program terms](https://www.anthropic.com/startup-program-official-terms), submit, and keep the confirmation email.
- [ ] Do not apply again from another account while it is pending.

## Application answers for AskTheMove

The live form can only be seen after signing in, so this covers the fields the program page names plus those a September 2026 write-up listed for the earlier form. Fill in the bracketed parts, and skip any field the form doesn't show.

| Field | Paste this | Note |
| --- | --- | --- |
| Your name | \[your full legal name\] | Must match your ID if they ask you to sign the affidavit |
| Job title | Founder |  |
| Business email | prax@askthemove.online | Same address as your Console login |
| Company name | AskTheMove | Use the registered name instead if you register one |
| Company website | https://askthemove.online | Must load before you submit |
| Country | India | On Anthropic's supported list |
| Date of birth | \[yours\] | Asked by the earlier form |
| Organization ID | \[from Console organization settings\] | Credits land on this org |
| Founded | September 2026 | The ChessLab repo was created on 6 Sept 2026 |
| Funding stage | Bootstrapped | Leave lead investors blank |
| Team size | 1 (solo founder) |  |
| Current total LLM spend | \[your real Console spend, e.g. "under $20 so far, pre-launch"\] | Read it off the Console; don't estimate |

### What are you building? (short description)

AskTheMove is a chess coach for adult improvers, rated about 800 to 1600, that explains why a move was a mistake instead of only naming the engine's best move. Stockfish and a chess rules library produce verified evidence (engine lines, mate distance, material, threats), and the Claude API turns that evidence into a few plain sentences. Game import, Stockfish game review, variations, study notes and rated bot opponents already work; the Claude coach is in private testing.

### How do you use Claude?

The "Explain why" and "Why not this move?" features call the Claude API with structured engine evidence only, never account data or free text. Before an answer is shown, the server checks that every move and every "mate in N" it cites appears in that evidence; if not, the app shows the plain engine summary instead. Each account is limited to 30 explanations an hour. If the API credits return, they would run the private beta and let us measure which model and effort level stays correct at the lowest cost per explanation.

### Where do you want support from Anthropic?

Office hours on keeping explanations faithful to engine evidence: how to evaluate explanation quality at scale, and how to keep cost per explanation low as the beta grows.

### Traction (only if asked)

Pre-launch. The waitlist opened on \[date\] and has \[N\] sign-ups. Demo video: \[link\].

The description says the coach is "in private testing"; that is true only once phase 4 is done. Applying earlier, change it to "the Claude coach is built and being tested".

## After the decision

If approved, claim everything from the acceptance email's link into the Claude Startups page in the Console, then set two reminders.

- [ ] Claim the Team year if the offer is back (paused since 9 Oct). Before confirming, check the seat type, the number of seats, the billing period and the amount due; extra seats or taxes can still be charged.
- [ ] Claim the $1,000 API credit if the offer is back (paused since 9 Oct), and confirm it shows in the AskTheMove org your app uses. Keep the spend limit on.
- [ ] If Anthropic asks for the affidavit and publicity release, return them within 14 days or the benefits can be forfeited.
- [ ] Register for the Applied AI office hours from the email or the Startups portal.
- [ ] Reminder: credit expiry, 6 months after it is granted.
- [ ] Reminder: Team renewal, a few weeks before the 12 months end.

If not approved: Anthropic publishes no reasons and no reapply rule. Don't open a second account to try again. Grow the weak rows from the odds table (sign-ups, real Claude usage), then ask Console support from the same account whether you can reapply. That last step is my suggestion, not a documented path.

## Praxmodoro: apply later, not now

Wait until AskTheMove has a decision and Praxmodoro ships a Claude feature. Today Praxmodoro makes no Claude calls at all, and "Claude integration and usage" is one of the three factors the terms name. Benefits also attach to "the account of the company identified in your application", so Praxmodoro needs its own domain, email, website and Console org. My inference, not stated by Anthropic: two applications from one founder at the same moment, one with no Claude use, could weaken both.

- [ ] Ship an opt-in Claude feature: turn a vague, stuck task into one concrete first step. Nothing leaves the Mac unless the person turns it on.
- [ ] Merge [PR #62](https://github.com/praxstack/Praxmodoro/pull/62) (the macOS 27 launch fix) and [PR #61](https://github.com/praxstack/Praxmodoro/pull/61) (the site).
- [ ] Repeat phases 2 to 6 with praxmodoro.com, a separate Zoho account, hello@praxmodoro.com and a separate Console org.
- [ ] Keep every claim non-clinical: "made for people who find it hard to start", never "treats ADHD".

Description to use once the feature ships:

Praxmodoro is a calm macOS focus timer for people who find it hard to start a task, including many adults with ADHD. It runs one gentle loop (name one small step, focus with a slowly breathing companion, check in, take a break that keeps your place, review) and keeps data on the Mac. An opt-in Claude API feature turns a vague, stuck task into one concrete first step and suggests the next one after each check-in.

## Sources

All opened on 8 Oct 2026.

- [Claude for Startups program page](https://claude.com/programs/startups): eligibility, benefits, review time, FAQ.
- [Startup Program official terms](https://www.anthropic.com/startup-program-official-terms) (updated 22 May 2025): evaluation factors, sole discretion, 14-day affidavit, publicity.
- [Supported countries](https://www.anthropic.com/supported-countries): India is listed for the API.
- [ReconScribe guide](https://reconscribe.com/claude-for-startups/) (7 Oct 2026): what to prepare, review timing.
- [Klymentiev write-up](https://klymentiev.com/blog/claude-free-credits) (updated 25 Sept 2026): field list of the earlier form.
- [ChessLab PR #17](https://github.com/praxstack/ChessLab/pull/17): how the Claude coach works.
