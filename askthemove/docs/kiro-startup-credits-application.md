# Kiro startup credits application

Oct 9, 2026

## Verdict

Apply. It costs no money, fits the advice to pause product spending, and takes about an hour of your time (my estimate). Know what it buys, though. Kiro is AWS's AI coding IDE. The program gives up to a year of Kiro Pro+ ($40 per user a month, 2,000 credits each) for up to 2 people on the Starter tier, worth up to $960. It pays for writing code. It does not pay for AskTheMove's own Claude calls or for hosting.

The bigger reason to apply now is the order. A startup already on AWS Activate cannot get Kiro credits, but one that gets Kiro first can still apply to Activate. Activate Founders gives $1,000 of AWS credits to self-funded startups. Since May 2026 those credits also cover third-party models on Amazon Bedrock, Anthropic's included. That could pay for the coach's explanations until Claude for Startups reopens.

I could not open the Reddit post itself, because Reddit is blocked from my side. Kiro's own X account and blog describe one open program for founders and solo developers, so I have assumed the post is about that. If it was about something else, such as Kiro's student offer, tell me.

## Eligibility

You meet every written rule except one you can fix in ten minutes: an AWS account under your business email. Two points are unclear, and the form will settle them.

| Rule | What Kiro says | You | Result |
| --- | --- | --- | --- |
| Stage | "Early stage to Series A startups" ([terms](https://kiro.dev/startups/terms/)) | Pre-launch, self-funded | Meets it |
| Team size | Starter tier is up to 2 users; Kiro's X post invites "a solo dev building something real" | 1 founder | Meets it |
| Application window | 7 April to 31 December 2026 | Applying in October | Meets it |
| Country | India is not on the excluded list | India | Meets it |
| Business email | Must match your startup website's domain | prax@askthemove.online on askthemove.online | Meets it |
| AWS account | The account's email must be that same business email | None yet | Create one first |
| AWS Activate | Startups with active Activate credits are excluded | Not on Activate | Meets it |
| Registered company | Kiro's terms never mention one; a third-party listing says "must be a registered company" | Not registered | Unclear |
| Funding | AWS's 2025 article said "VC-backed"; the 2026 terms and blog dropped it | Bootstrapped | Probably fine |

One more unknown: AWS accounts with an Indian address are run by AISPL, Amazon's Indian entity, and Kiro's pages say nothing about AISPL. If credits never arrive after approval, that is the first thing to ask Kiro about.

## Steps, in order

You do all of these yourself; I submit nothing. Do not apply to AWS Activate until Kiro has said yes.

- [ ] **Create an AWS account** at aws.amazon.com with **prax@askthemove.online** as the root email. AWS checks a card with a small refundable charge. If it asks you to pick a free or paid plan, start on the free plan; I could not confirm which one Kiro needs. Then set a $1 budget alert under Billing so any charge is visible at once.
- [ ] **Copy your 12-digit AWS Account ID** from the account menu at the top right of the AWS console.
- [ ] **Apply** at [aws.amazon.com/startups/credits/kiro](https://aws.amazon.com/startups/credits/kiro), signed in with the same email. Pick **Starter**. Paste the answers below.
- [ ] **Wait for the email.** Reviews are rolling, and there is no stated wait time.
- [ ] **After approval, set up sign-in** as [Kiro's guide](https://kiro.dev/startups/onboarding/) lists. Enable IAM Identity Center and note the region, because sign-in must use that region. Create a group and your user, then subscribe the user to **Pro+** in the AWS console. In Kiro, choose "Sign in with your organizational identity". Builder ID, Google and GitHub logins do not draw on the credits.
- [ ] **Then apply to AWS Activate Founders** ($1,000) at startups.aws. Before pointing the coach at Bedrock, check that the credits cover Claude in your region. Moving the coach to Bedrock would be a small code change, and I would do it as its own PR.

## Paste-ready answers

I cannot see the form, because AWS blocks automated readers, so these cover the usual startup-credit questions. Fill the bracketed parts, and claim nothing you cannot show.

| Field | Answer |
| --- | --- |
| Startup name | AskTheMove |
| Website | https://askthemove.online |
| Business email | prax@askthemove.online |
| AWS Account ID | \[12 digits from step 2\] |
| Your name and role | \[Your full name\], founder |
| Country | India |
| Founded | September 2026 |
| Legal entity | Not incorporated yet; sole founder |
| Funding stage | Pre-seed, self-funded, no outside investment |
| Revenue | None yet; pre-launch |
| Team size | 1 |
| Tier | Starter (up to 2 users) |
| Social | https://x.com/AskTheMove |

**One line.** AskTheMove explains your chess mistakes in plain words: a chess engine supplies the verified facts, Claude explains them, and the server checks every claim.

**What you are building.** AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts: legal moves, material and the best lines. Claude turns those facts into a short explanation. The server then withholds any answer that cites a move, number or mate the engine did not produce. The web app works end to end today, with bot games, full-game review and AI explanations. Next we want to test it with chess academy coaches in India, who review dozens of students' games every week.

**Traction.** Pre-launch. The waitlist at askthemove.online went live in October 2026 and has \[N\] sign-ups. We are on X as @AskTheMove.

**How you will use Kiro.** We already build spec-first. Each feature starts as a written proposal with numbered requirements and test scenarios, and over 150 automated tests guard the app. Kiro's specs and hooks match that way of working. We would use them for the next three pieces: the learning loop (guess the move, see why yours fell short, retry a similar position), a coach view for reviewing many students' games at once, and explanations in Hindi. Hooks would run the test suite on every change.

If you decide against the academy direction, cut "Next we want to test it with chess academy coaches in India…" and "a coach view…", and say "a private beta for friends and family" instead. Add one more line only if it is true for you: "We plan to evaluate Claude on Amazon Bedrock for the coach's explanations."

## Sources

- [Kiro for startups](https://kiro.dev/startups/): tiers, business email, AWS account, Activate rule, excluded countries
- [Startup program terms and conditions 2026](https://kiro.dev/startups/terms/), updated 24 July 2026: stage, window to 31 December 2026, expiry
- [We're bringing back the Kiro startup credits program](https://kiro.dev/blog/bringing-back-startup-credits/), 7 April 2026
- [Using startup credits](https://kiro.dev/startups/onboarding/): IAM Identity Center setup and Pro+ at 2,000 credits per user a month
- [Kiro pricing](https://kiro.dev/pricing/): Pro+ at $40 per user a month
- [Power your startup with 1 year's worth of Kiro Pro+](https://aws.amazon.com/aws-startups/learn/power-your-startup-with-1-year-of-kiro-pro-plus-now-available-through-aws-startups/), AWS, 17 November 2025: the older "VC-backed" wording
- [AWS Activate credits now accepted for third-party models on Amazon Bedrock](https://aws.amazon.com/aws-startups/learn/aws-activate-credits-now-accepted-for-third-party-models-on-amazon-bedrock/), AWS, 11 May 2026
- [AWS Activate Credits 2026](https://klymentiev.com/blog/aws-activate-credits), third-party: Founders at $1,000 and its form
- [Kiro for Startups listing](https://www.startupgrantsindia.com/perks/kiro-for-startups), third-party: the "registered company" claim
- Kiro's X post about solo developers came from search results only, because X blocks automated readers. The Reddit link was blocked too.
