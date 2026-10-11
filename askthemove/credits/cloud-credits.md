# Cloud / infra / DB / dev-tool startup credits: research for AskTheMove (as of 2026-10-09)

**Founder profile:** solo founder in India, bootstrapped, **no registered company**, no investors. Has a live site (askthemove.online, Cloudflare Pages + D1) and a domain email (prax@askthemove.online). The app is a Docker container (Node/Python, Stockfish, SQLite, Claude API) and is not hosted yet.

**Legend for "Apply now?"**
- **YES**: the official criteria don't require incorporation or VC backing.
- **YES\***: allowed, but a stated criterion is borderline for Prax (see notes).
- **AFTER INC**: needs a registered legal entity.
- **VC/PARTNER**: needs an investor, accelerator or partner referral.
- **N/A**: no program, discontinued, or not for India.

"Verified" means the terms were read on the official page with WebFetch on 2026-10-09 unless the row says otherwise.

## Order of operations (important)
1. **Apply to Kiro startup credits first.** It is open only to startups "without current Activate Credits" (confirmed on aws.amazon.com/startups/credits).
2. **Then AWS Activate Founders.**
3. Apply to the other bootstrapped-friendly programs in parallel. Many credits expire 12 months after approval, so don't apply to a host until you're about to deploy there.

## Main table

| Program | Amount | Key eligibility (official) | Apply now? | Status | Apply URL | Relevance to AskTheMove |
|---|---|---|---|---|---|---|
| **AWS Activate Founders** | $1,000; "select participants" can get up to $5,000 | Bootstrapped/self-funded, pre-Series B, founded within 10 yrs, AWS account on a **Paid Tier Plan**, new to Activate credits. Incorporation is not stated. | **YES** (after Kiro) | Active | https://aws.amazon.com/startups/join?destination=/credits/apply | High. Can run the Docker app on ECS/Fargate, App Runner or Lightsail. |
| AWS Activate Portfolio | Up to **$200,000** (page now says $200K, not $100K) | Needs an Org ID from an Activate Provider (VC, accelerator or angel). Startup India (DPIIT) is a Provider with a **$5,000** Org ID (needs DPIIT recognition, which needs a Pvt Ltd, LLP or partnership). | VC/PARTNER, or AFTER INC via DPIIT | Active | same | High |
| AWS Credits for AI Startups | $200K+ | Invite-only, after Portfolio | N/A | Invite-only | — | — |
| **Google for Startups Cloud: Start tier** | **$2,000** (12 mo), plus 12 mo of free Workspace Business Plus and $200 in Skills credits | Digital-native tech startup with a working MVP and a clear business model. Must "plan to seek venture funding soon" and be **founded within the last 24 months**. No prior GCP credits beyond the free trial. Application email **must match the website domain**. Incorporation is not stated. | **YES\*** (the "plans to seek VC" line is soft) | Active | https://cloud.google.com/startup/apply (needs a GCP billing account ID) | High. Cloud Run is a good fit for the Docker app. |
| Google Cloud: Scale tier | $200K, or up to **$350K** for AI-first | VC-funded (institutional equity or SAFE). Angel, friends-and-family, crowdfunding and grants don't qualify. | VC/PARTNER | Active | same | High |
| **Microsoft for Startups (formerly Founders Hub), self-serve** | Step 1: **$1,000** Azure credits (90 days), no application. Step 2: **up to $5,000** after business verification (180 days). | Step 1: new Azure customer with a personal MSA and a card. Step 2: must be a **registered legal business entity** and verify within 90 days of redeeming step 1. | Step 1 **YES**; step 2 AFTER INC | Active. The old $150K open program was retired mid-2025 (The Register, 2025-07-01). | https://www.microsoft.com/startups | Medium. Azure Container Apps can run the Docker app. **Timing trap:** the 90-day verification clock starts at step 1, so redeem the $1K only within ~90 days of incorporating. |
| Microsoft Investor Network track | Starts at $100K | Needs a referral code from an affiliated investor | VC/PARTNER | Active | — | — |
| **Cloudflare for Startups** | Tier 3 **$10K** (bootstrapped, < $1M raised). Tier 2 $100K (< $5M raised, affiliated partner). Tier 1 up to **$350K** ($5M+ raised, affiliated partner). Credits last 1 yr. | "Incorporated no more than 10 years ago". Live verifiable website. **Domain-matching email**. Public LinkedIn, X or GitHub presence. For-profit tech product. First-time applicant. Note: the page also says "funded within last 12 months", which conflicts with Tier 3's "no minimum funding". | **AFTER INC** (the incorporation wording is explicit; applying now risks rejection) | Active (moved from $5K to $10K for bootstrapped since the 2025 blog post) | https://www.cloudflare.com/lp/startups | **Highest.** Already on Pages + D1. Credits cover Workers, D1, R2, Workers AI, Queues and more. Could also host the app via Workers or Containers. |
| **DigitalOcean Hatch** | Varies; set by partner or reviewer. 12 months, with a $10K/mo cap. | Total funding ≤ $10M. Company website. **Company-domain email**. DO team account with a business email and a card. No prior DO credits. AI-native is prioritized. Non-affiliated founders select **"Other"** on the form. Incorporation is not stated. | **YES** | Active | https://www.digitalocean.com/hatch | High. Droplet or App Platform runs Docker simply and cheaply. Startup India also lists DO as a resource partner (after DPIIT). |
| **Akamai Cloud (Linode) Rise** | $500 on acceptance; up to **$120K** in year 1; then 50% off in year 2 and 25% off in year 3 | For-profit, < 7 yrs old. The account must list a **corporate entity**. Corporate email on the company domain plus a working website. Card. At least **one traction signal** (users who aren't friends, family or investors; revenue; employees beyond founders; or VC). Akamai must be a primary provider. New customers only. | **AFTER INC** (and needs real users) | Active | https://www.akamai.com/cloud/start-ups/rise | High. Linode VMs and LKE run Docker. |
| **Neon (Databricks Startup Program)** | Self-funded: **up to $1,000** Neon credits. VC-backed: up to $200K. Credits last 12 mo. | Self-funded track: < $1M raised, building an MVP | **YES** | Active | https://neon.com/startups | Medium. Only useful if you move from SQLite to Postgres. |
| **MongoDB for Startups** | Bootstrapped tier gets "baseline" credits (amount not published). Plus Voyage AI tokens. | < 7 yrs, Series A or earlier, single software product, active **website + LinkedIn**. Direct application is allowed without a VC. Incorporation is not stated. | **YES** | Active | https://www.mongodb.com/solutions/startups | Low to medium. Only if you adopt Atlas. |
| **Sentry for Startups** | Up to **$5,000** credits (12 mo) plus priority support | Founded within the last 2 yrs, < $5M VC raised, new to paying for Sentry. Needs a free Sentry org. The form asks for the founding date. | **YES** | Active | https://sentry.io/for/startups/apply/ | High. Error monitoring for the Node/Python app. |
| **Grafana Cloud Startup Program** | Up to **$100K** (12 mo or until the next round) plus a 20% discount after | "Ideally" < $10M raised and < 25 employees. New customers, including Free-tier users. Must agree to be a reference customer. | **YES** | Active (announced 2024-09) | https://grafana-labs.typeform.com/to/cSI7ohks/ | Medium. Observability. |
| **Algolia Startup Program** | **$10K** (12 mo) | < 7 yrs, < $15M raised, new customer | **YES** | Active | https://www.algolia.com/industries/startups/ | Low |
| **OVHcloud Startup Program (Start)** | **€10,000** plus 6 h of engineer time (12 mo). Scale: up to €100K. | "Selected pre-seed & seed startups". Detailed criteria are in the FAQ, which wasn't readable. | **YES\*** (unclear; try) | Active | https://startup.ovhcloud.com/en/ | Medium. VPS or Public Cloud, with an India (Mumbai) region. |
| **Scaleway Startup Program** | Founders **€1,000** (1 yr); Early Stage €9K; Growth €36K | < 5 yrs, < 50 staff, not an existing Scaleway customer. Prefers EU-market startups. Incorporation and country are not stated. | **YES\*** (EU-focused) | Active | https://www.scaleway.com/en/startup-program/ | Low (EU regions only) |
| **Alibaba Cloud Startup Program** | Up to **$120K** credits plus up to 2B Model Studio tokens | No formal criteria published. AI-focused (video/image generation, model aggregators, moderation). Review takes 4–5 days. | **YES\*** (discretionary) | Active | https://www.alibabacloud.com/startup | Low to medium |
| **Koyeb for Startups** | Up to **$30K** compute credits | Partner accelerator or $1–5M VC raised, **but** "bootstrapped startups… encouraged to apply" (case by case) | **YES\*** | **Uncertain.** Koyeb agreed to join **Mistral AI** (blog, 2026-02-17); the program page is from 2024. | https://tally.so/r/w4kzad | High if it's still running (Docker-native PaaS) |
| **Clerk startups** | Free tier of 50K MRU / 100 orgs, plus discounted Pro for eligible startups | Apply within 1 yr of launch, raised **up to** $5M VC. Partner is optional ("None/Other"). | **YES\*** (the bootstrapped case isn't explicit) | Active | https://clerk.com/startups | Medium (auth). The free tier probably covers you anyway. |
| IBM (Startup with IBM) | Not published (reported $12K–$120K) | Reported to require **proof of incorporation** and a website. Source is an aggregator (grantcompass.ca); IBM's page failed to load. | AFTER INC | Active (per aggregator) | https://orders.cloud.ibm.com/IBMGEP-application/ | Low |
| Auth0 for Startups | 1 yr free of B2B Professional (100K MAU) | **Venture-backed**, < $5M raised, ARR < $1M, incorporated < 2 yrs | VC/PARTNER | Active | https://auth0.com/startups | Low |
| Datadog for Startups | Up to **$100K** / 1 yr | Series A or earlier, new to Datadog, **must be referred by an official partner** (VCs, accelerators, or hyperscaler/vendor startup programs) | VC/PARTNER (may work via AWS/Google programs) | Active | https://www.datadoghq.com/partner/datadog-for-startups/ | Low to medium |
| Vercel for Startups | Up to **$30K** plus Enterprise-tier access | Series A or earlier, within 12 mo of the round, **approved partner affiliation** (from betterstack; the official page only says "eligible teams") | VC/PARTNER | Active | https://vercel.com/startups | Low (you're on Cloudflare) |
| Netlify for Startups | Discount (not credits) | **Only via approved VC/incubator/accelerator partners** | VC/PARTNER | Active | https://www.netlify.com/partners/startups | Low |
| Render for Startups | Prototype $500 (needs ≥ **$25K seed**); Build $2.5–5K (via partner); Scale $10–25K; AI $100K | All tiers need funding or a partner. Series A or earlier, < $50M raised. | VC/PARTNER | Active | https://render.com/startups | High as a host, but not eligible |
| Turso Startup Program | "Generous credits" | Venture-backed, at least one verifiable round | VC/PARTNER | Active | https://turso.tech/startups | Medium (SQLite-compatible), but not eligible |
| Vultr Startup Program | Up to $100K plus up to 35% discount | Series A–E, 6 months of cloud invoices, sales-led (betterstack; the official page didn't render). Vultr also has a MeitY Startup Hub page whose terms didn't render. | VC/PARTNER | Active | https://discover.vultr.com/startup-program | — |
| Databricks for Startups | Up to $200K (shared with Neon) | Early-stage; VC route preferred | Via the Neon self-funded track only | Active | https://www.databricks.com/product/startups | None |
| Snowflake for Startups | Free usage on the first contract | Data-centric startups; register interest | N/A in practice | Active | https://www.snowflake.com/en/why-snowflake/startup-program/ | None |
| Twilio AI Startup Searchlight 2026 | $5K–$10K Twilio credits plus OpenAI credits | Working Twilio demo | **Closed** (deadline 2026-09-11) | Closed | — | None |
| Oracle | Startup Growth Engine: OCI credits, **LatAm only**. The global "Oracle for Startups" credits page no longer exists; oracle.com/startup now shows only the Free Tier ($300 / 30 days plus Always Free). | — | N/A for India (use the Always Free tier) | LatAm only | https://www.oracle.com/cloud/free/ | Always Free Ampere VMs could host Docker for $0 |
| Supabase | No program. supabase.com/startups returned 404 (aggregator, Sep 2026). A $300 Supabase offer exists via the AWS Activate offers marketplace. | — | N/A (via Activate perks only) | Discontinued | https://aws.amazon.com/startups/offers/supabase | Low |
| Railway | **No startup program.** Staff answer: only the $5 trial grant and Free/Hobby/Pro plans. | — | N/A | — | — | Medium as a host, but no credits |
| Fly.io | **No startup program** (community thread unanswered by staff, last asked 2024) | — | N/A | — | — | — |
| Hetzner | No official startup program. One aggregator says its perk isn't set up for India-incorporated companies. | — | N/A | — | — | Cheapest VPS option even without credits |
| PlanetScale | No credits program on the official startups page (single-node DBs from $5/mo) | — | N/A | — | — | — |
| Heroku | No credits or application on the official startups page | — | N/A | — | — | — |
| Northflank | No program found (search only) | — | N/A | — | — | — |
| Upstash | Unverified. An aggregator lists ~$1K; the official page failed to load. | ? | Unverified | ? | https://upstash.com | Low |
| Redis Cloud | Unverified. Aggregators list $10K–$25K for pre-seed/seed; redis.io/startups doesn't load. | ? | Unverified | ? | https://redis.io/startups/ | Low |

## Partner and referral routes to higher tiers without VC

- **Stripe Atlas** (US Delaware C-corp, about $500). The official Stripe support page lists these Atlas perks:
  - **AWS Activate $5,000** (new users)
  - **Cloudflare $100,000** (Startup Program)
  - **Microsoft for Startups $5,000+** Azure credits
  - **PostHog $50,000**
  - **Clerk 50% off for 1 yr**
  - Linear 6 months free
  - Replit and Lovable discounts

  This is the single largest no-VC unlock, notably Cloudflare at $100K versus $10K. Atlas also counts as "incorporation" for the AFTER INC programs. Trade-off: US entity compliance (franchise tax, Form 5472, ~$500+/yr) for an Indian resident. Source: https://support.stripe.com/questions/stripe-atlas-perks-partners
- **Startup India / DPIIT recognition** (needs an Indian Pvt Ltd, LLP or registered partnership; sole proprietorship isn't listed). It gives an **AWS Activate Portfolio Org ID worth $5,000** (needs a website, founded < 10 yrs, self-funded or pre-Series B), and DigitalOcean is listed as a cloud resource partner. Google, Microsoft and Oracle aren't listed. Source: https://www.startupindia.gov.in/content/sih/en/reources/resource-partners/cloud-services/aws_services.html
- **Datadog** accepts referrals from "hyperscaler/vendor startup programs", so membership in AWS or Google startup programs may serve as the referral.
- **Accelerators** (YC, Techstars, a16z speedrun, Cloudflare Workers Launchpad, MeitY Startup Hub, and others) unlock: Cloudflare Tier 1/2, Render Build, Netlify, Vercel, Turso, Koyeb, Neon VC tier, Activate Portfolio, and Google Scale.
- **Perk platforms** (Founderpass, GetProven/BuiltFirst portals, Mercury/Brex perks): not verified on official pages. Mercury and Brex require a US entity.

## Recommended sequence for Prax

**Now (no entity needed):**
1. Kiro startup credits.
2. AWS Activate Founders ($1K–5K).
3. Google Cloud Start ($2K).
4. DigitalOcean Hatch (select "Other").
5. Sentry ($5K), when the app is deployed.
6. Grafana (when you need observability).
7. Optional: Neon $1K (only if moving to Postgres), MongoDB, OVHcloud €10K, Koyeb (check it still runs), Alibaba.

Hold the Microsoft $1K step until about 90 days before you plan to incorporate.

**After incorporating** (Indian Pvt Ltd or LLP, or Stripe Atlas):
- Cloudflare Tier 3 ($10K; **$100K via Atlas**)
- Microsoft $5K verification
- Akamai Rise (up to $120K, once you have real users)
- IBM
- DPIIT → AWS Portfolio $5K Org ID (only if you haven't already taken Activate credits of equal value)

**Needs VC or an accelerator:** Google Scale, AWS Portfolio (full), Microsoft Investor Network, Cloudflare Tier 1/2, Vercel, Netlify, Render, Turso, Datadog, Auth0, Vultr.
