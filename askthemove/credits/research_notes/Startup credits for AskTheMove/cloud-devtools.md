# Cloud, hosting, database and developer-tool startup credits for AskTheMove (re-verified 10 Oct 2026)

Founder profile: solo founder in India, bootstrapped, no registered company, no investors. Email prax@askthemove.online. AskTheMove runs Node/Python, Stockfish, SQLite, Docker and the Claude API. The marketing site is on Cloudflare Pages + D1. The app is not hosted yet.

Verdict codes:
- **NOW**: allowed today with no company and no investor.
- **AFTER_INC**: needs a registered legal entity.
- **NEEDS_INVESTOR**: needs a VC, accelerator or partner referral.
- **NO**: no program, or not available.

Method:
- **[RE-VERIFIED 10 Oct]**: the official page was fetched today.
- **[CARRIED 9 Oct]**: verified on an official page on 9 Oct 2026 (source file: /mnt/project-files/askthemove/credits/cloud-credits.md) and not re-fetched today.
- **UNVERIFIED**: the official page could not be read on either day.

X was not accessible. No forms were submitted.

## 1. Hyperscalers: AWS Activate, Kiro, Google for Startups Cloud, Microsoft for Startups, Cloudflare

### Takeaway
You can claim these today with no company: **Kiro first, then AWS Activate Founders ($1K–$5K), Google Cloud Start ($2K), and Microsoft step 1 ($1K)**. Leave Microsoft step 1 for later because its verification clock starts when you redeem it. Cloudflare for Startups ($10K on Tier 3) is the most relevant program, but its eligibility text says "incorporated", so it is **AFTER_INC**.

### Cited Findings
- **AWS Activate Founders [RE-VERIFIED 10 Oct]**:
  - Amount: "Up to $5,000", starting at $1,000, with "select participants" qualifying for more.
  - Who it's for: self-funded or bootstrapped startups; you apply directly.
  - General Activate criteria: pre-Series B, founded in the last 10 years, an AWS account on a **Paid Tier Plan**, and new to Activate credits. Incorporation is not mentioned.
  - Review takes 5–10 business days.
  - The page metadata shows an update on 2026-10-09, with no change described.
  - Apply: https://aws.amazon.com/startups/join?destination=/credits/apply
  - Verdict: **NOW**. Relevance: high (ECS/Fargate, App Runner or Lightsail can run the Docker app).
  - Source: [AWS credits](https://aws.amazon.com/startups/credits)
- **AWS Activate Portfolio [RE-VERIFIED 10 Oct]**: up to $200,000. Pre-Series B, and needs an Org ID from an Activate Provider (accelerator, angel or VC). Verdict: **NEEDS_INVESTOR**. — [AWS credits](https://aws.amazon.com/startups/credits)
- **AWS Credits for AI Startups [RE-VERIFIED 10 Oct]**: $200,000+, invite-only after Portfolio, through an Account Manager. Verdict: **NO** for now. — [AWS credits](https://aws.amazon.com/startups/credits)
- **Ordering [RE-VERIFIED 10 Oct]**: AWS says "Start with Kiro Startup Credits, then grow into Activate Credits." Kiro is open to "startups without current Activate Credits." — [AWS credits](https://aws.amazon.com/startups/credits)
- **Kiro Startup Credits [RE-VERIFIED 10 Oct]**:
  - What you get: up to 1 year of free Kiro Pro+ on Starter (2 users), Growth (10) or Scale (30). Credits go to your AWS account and expire 1 year after issue.
  - Eligibility: early stage to Series A; a business email that matches the startup domain and is tied to the AWS account; no active Activate credits. You can apply to Activate after Kiro acceptance.
  - India is **not** on the excluded list (Argentina, Belarus, Brazil, China/GCR, Cuba, France, Germany, Iran, Italy, Mexico, North Korea, Poland, Russia, Spain, Syria, Crimea/DNR/LNR, UAE).
  - Timing: "for a limited time", rolling, with no end date.
  - Apply: https://aws.amazon.com/startups/credits/kiro
  - Verdict: **NOW (do this first)**. Relevance: medium (AI IDE, not hosting).
  - Source: [Kiro startups](https://kiro.dev/startups/)
- **Google for Startups Cloud, Start tier ($2,000) [RE-VERIFIED 10 Oct]**:
  - Who it's for: "digital-native technology startups with a working MVP, a clear business model, and plans to seek venture funding soon."
  - Eligibility: "Have been founded within the last 24 months." "Have not received Google Cloud credits beyond free trial."
  - Credits are valid for 12 months.
  - Extras: 12 months of free Workspace Business Plus (the domain must not be on a paid Workspace plan, now or within the 31 days before applying), $200 in Google Skills credits, and AI Studio free tier.
  - Model coverage: credits cover Google's own models only; third-party models are not covered.
  - Incorporation is not mentioned. Applying needs an 18-character billing account ID.
  - Source: [GCP pre-seed](https://cloud.google.com/startup/pre-seed)
- **Google Start tier, domain match [RE-VERIFIED 10 Oct]**: the email "must match your startup's public website domain", and must also match the domain on the billing account. — [GCP FAQ](https://cloud.google.com/startup/faq)
- **Google Start tier, exclusions [RE-VERIFIED 10 Oct]**: dev shops, consultancies, agencies, personal blogs or content, nonprofits, and "traditional small businesses." — [GCP pre-seed](https://cloud.google.com/startup/pre-seed); [GCP FAQ](https://cloud.google.com/startup/faq)
- **Google Start tier, verdict**: **NOW**, with two soft points: you must have a working MVP, and you must say you plan to seek VC. Relevance: high (Cloud Run suits the Docker app).
- **Google funded tiers [RE-VERIFIED 10 Oct]**:
  - The main page now labels the stages "Pre-funded / Early stage / Series B+" rather than Start/Scale.
  - Early stage gives "$200,000 in cloud credits (or up to $350,000 for AI-first startups)" for "Seed to Series A".
  - Scale tier requires VC funding. Angel, friends-and-family, crowdfunding, grant and prize funding "will not qualify a startup for scale."
  - Verdict: **NEEDS_INVESTOR**.
  - Sources: [GCP startup](https://cloud.google.com/startup); [GCP FAQ](https://cloud.google.com/startup/faq)
- **Microsoft for Startups (self-serve) [UNVERIFIED today]**:
  - Learn FAQ fetch failed today.
  - A Microsoft Q&A answer from 2026-05-18 describes the program like this: "$1,000 USD in Azure credits immediately, with the ability to unlock up to $5,000 USD in total credits after business verification." It says you need a "Registered legal business entity for the additional credits" and must "Complete business verification within 90 days of redeeming the initial $1,000."
  - That answer is labelled "AI-generated content may be incorrect", so it is a lead, not official policy.
  - The same thread has a user saying they were granted $5K.
  - Source: [MS Q&A](https://learn.microsoft.com/en-us/answers/a/12780061)
  - The 9 Oct research recorded the same $1K/90-day and $5K/180-day structure [CARRIED 9 Oct].
  - Verdict: step 1 **NOW**, step 2 **AFTER_INC**.
  - **Timing trap:** redeem step 1 within about 90 days of incorporating, or you may lose the $5K step.
  - Relevance: medium (Azure Container Apps).
- **Microsoft Investor Network [CARRIED 9 Oct]**: from $100K, needs an investor referral code. Verdict: **NEEDS_INVESTOR**.
- **Cloudflare for Startups [RE-VERIFIED 10 Oct; /lp/startups failed, /forstartups/ worked]**:
  - Tiers:
    - Tier 3: **$10K**, "Bootstrapped or self-funded", "Under $1M raised".
    - Tier 2: $100K, "Under $5M raised", "Funded by an affiliated partner".
    - Tier 1: $350K, "$5M+ raised", affiliated partner.
  - Criteria: "Your company was incorporated no more than 10 years ago"; "Funded within the last 12 months"; live website; public LinkedIn, X or GitHub presence; first-time applicant; "For-profit business with a business email matching your domain".
  - Duration: credits last 1 year, with no extensions.
  - Recent changes: Tier 3 went from $5K to $10K and Tier 1 from $250K to $350K (no date given). Existing members can request an upgrade review at startups@cloudflare.com.
  - Apply: https://www.cloudflare.com/lp/startups
  - Source: [Cloudflare for Startups](https://www.cloudflare.com/forstartups/)
  - Verdict: **AFTER_INC**. Relevance: **highest**, since you're already on Pages + D1; credits would also cover Workers/Containers hosting.

### Inferences
- The Cloudflare criteria contradict each other: Tier 3 is "bootstrapped", but all tiers say "Funded within the last 12 months". Read "incorporated" as a real requirement. An application with no entity may be rejected, and because the program takes first-time applicants only, a failed attempt may use up the one chance. Wait until you're incorporated.
- Google Start's "founded within 24 months" is easy to meet. The founding date of a project with no company is ambiguous; use the project or website launch date.

### Gaps
- The official Microsoft FAQ was unreachable today, so the $1K/$5K/90-day figures rest on a 9 Oct read and an AI-labelled Q&A answer.
- The dollar value of Kiro Pro+ credits is not stated.

## 2. Other hosting providers: DigitalOcean, Akamai/Linode, Vultr, OVHcloud, Scaleway, Alibaba, Oracle, IBM, Vercel, Netlify, Render, Railway, Fly.io, Koyeb, Northflank

### Takeaway
**DigitalOcean Hatch** is the best no-company hosting program (verdict NOW). **Koyeb's startup credits still appear on its live pricing page** (up to $30K, bootstrapped founders considered case by case). OVHcloud, Scaleway and Alibaba are discretionary NOW options. Akamai and IBM need a company. Vercel, Netlify, Render and Vultr need a partner or funding. Railway, Fly.io, Northflank and Oracle (outside LatAm) have no program.

### Cited Findings
- **DigitalOcean Hatch [RE-VERIFIED 10 Oct]**:
  - Eligibility: "Must have raised $10m or less"; a company website plus an email on that domain; a DO team account on a business email; new to DO credits. AI-native startups are prioritized; consultancies and agencies are excluded.
  - No incorporation requirement is stated. Founders without a VC select **"Other"** for affiliated partner.
  - Amount: varies by applicant, with a $10K/month cap.
  - Duration: 12 months of credits plus 15 months of Standard support, with no extensions.
  - Recent change: since 13 May 2026, credits cover most services but exclude GPU products, Serverless/Dedicated Inference, third-party hosted models (Anthropic/OpenAI) and Cloudways.
  - Apply: https://sammydigitalocean.typeform.com/hatch
  - Source: [DO Hatch](https://www.digitalocean.com/hatch)
  - Verdict: **NOW**. Relevance: high (a Droplet or App Platform runs Docker with persistent disk for SQLite). Credits cannot pay for Claude via DO.
- **Koyeb [PARTIAL RE-VERIFY 10 Oct]**:
  - The live pricing page has an "Early stage startup" section offering "up to $30k in credits".
  - The /startups page itself failed to load.
  - The pricing page lists no free compute instance (only free Serverless Postgres: 0.25 vCPU, 1 GB RAM, 1 GB storage, "Free 5h"). Pro is $29/mo and includes $10 of compute.
  - Source: [Koyeb pricing](https://www.koyeb.com/pricing)
  - 9 Oct notes [CARRIED]: bootstrapped startups are "encouraged to apply" case by case; apply at https://tally.so/r/w4kzad; Koyeb agreed to join Mistral AI (blog, 17 Feb 2026).
  - Verdict: **NOW (discretionary)**. Relevance: high (Docker-native).
- **Akamai Cloud (Linode) Rise [CARRIED 9 Oct]**:
  - Amount: $500 on acceptance, up to $120K in year 1, then 50% off in year 2 and 25% off in year 3.
  - Eligibility: the account must list a **corporate entity**; corporate email and website; at least one traction signal (non-friend users, revenue, staff or VC).
  - Apply: https://www.akamai.com/cloud/start-ups/rise
  - Verdict: **AFTER_INC** (and needs real users).
- **OVHcloud Startup Program [CARRIED 9 Oct]**: Start tier €10K plus 6 h of engineer time (12 months); Scale up to €100K; "selected pre-seed & seed startups". Apply: https://startup.ovhcloud.com/en/ (also surfaced in a 10 Oct search: [OVHcloud](https://startup.ovhcloud.com/)). Verdict: **NOW (discretionary)**. Has a Mumbai region.
- **Scaleway [CARRIED 9 Oct]**: Founders tier €1K, Early €9K, Growth €36K. Under 5 years old, under 50 staff, EU focus. Apply: https://www.scaleway.com/en/startup-program/. Verdict: **NOW (EU-leaning)**. Relevance: low.
- **Alibaba Cloud [CARRIED 9 Oct]**: up to $120K plus Model Studio tokens; discretionary and AI-focused. Apply: https://www.alibabacloud.com/startup. Verdict: **NOW (discretionary)**. Relevance: low.
- **Vultr [CARRIED 9 Oct, from an aggregator]**: up to $100K; Series A–E with 6 months of cloud invoices. Verdict: **NEEDS_INVESTOR**.
- **IBM [CARRIED 9 Oct, from an aggregator; UNVERIFIED]**: reportedly needs proof of incorporation. Verdict: **AFTER_INC**.
- **Oracle [CARRIED 9 Oct]**: Startup Growth Engine is LatAm only. Verdict: **NO** for India (use Always Free instead; see section 4).
- **Vercel [CARRIED 9 Oct]**: up to $30K for Series A or earlier with partner affiliation. Verdict: **NEEDS_INVESTOR**. **Netlify**: partner-only discount, **NEEDS_INVESTOR**. **Render**: all tiers need $25K+ seed or a partner, **NEEDS_INVESTOR**.
- **Railway, Fly.io, Northflank [CARRIED 9 Oct]**: no startup program found. Verdict: **NO**.

### Inferences
- If DigitalOcean or Koyeb approves you, the Docker app can likely run for free for a year without incorporating.

### Gaps
- The DO award amount is not published.
- Koyeb's eligibility text on its /startups page was not readable today.
- The OVHcloud FAQ criteria are unread.

## 3. Databases and developer tools

### Takeaway
You can claim these today with no company: Neon ($1K self-funded track), MongoDB (baseline), Sentry (up to $5K), Grafana (up to $100K), PostHog ($50K), Mixpanel, Amplitude, Algolia ($10K), Notion (1–3 months) and, discretionarily, Clerk. Needs an investor or partner: Turso, Auth0, Datadog, GitHub, Atlassian, Linear and probably Figma. JetBrains needs a company. No program: Supabase, PlanetScale.

### Cited Findings
- **Sentry [PARTIAL RE-VERIFY 10 Oct]**: "Get up to $5,000 in credits and priority support"; the criteria widget didn't render. — [Sentry startups](https://sentry.io/for/startups/). 9 Oct read [CARRIED]: founded within 2 years, under $5M VC, new to paid Sentry; apply at https://sentry.io/for/startups/apply/. Verdict: **NOW**. Relevance: high.
- **Carried from 9 Oct (official pages)**:

  | Program | Amount | Verdict |
  |---|---|---|
  | Neon | Up to $1K, self-funded under $1M raised | NOW |
  | MongoDB | Baseline credits | NOW |
  | Grafana | Up to $100K, must be a reference customer | NOW |
  | Algolia | $10K | NOW |
  | PostHog | $50K; company-domain email, under 2 yrs, under $5M raised, paid plan; not usable on PostHog AI from 14 Sep 2026 | NOW |
  | Mixpanel | Year 1 free; data must flow within 90 days | NOW at launch |
  | Amplitude | Growth plan free 12 mo; under $10M raised, under 20 staff | NOW |
  | Clerk | Discounted Pro; up to $5M VC; partner optional | NOW, discretionary |
  | Notion | 3 months with website + domain email; 6 months needs a partner VC | NOW |
  | Postmark | $75 for bootstrapped founders who are charging | NOW after launch |
  | Auth0 | Venture-backed, incorporated under 2 yrs | NEEDS_INVESTOR |
  | Datadog | Partner referral; vendor startup programs count | NEEDS_INVESTOR, or a partner route |
  | Turso | Venture-backed | NEEDS_INVESTOR |
  | GitHub for Startups | $10K; partner + equity funding | NEEDS_INVESTOR |
  | Atlassian | VC or partner accelerator | NEEDS_INVESTOR |
  | Linear | Partner link only | NEEDS_INVESTOR |
  | JetBrains | 50% off; "evidence" of establishment | AFTER_INC |
  | Supabase | /startups returns 404; only a $300 AWS Activate perk | NO direct program |
  | PlanetScale | No credits | NO |

  Sources: /mnt/project-files/askthemove/credits/cloud-credits.md and perks-india-grants.md section A.
- **UNVERIFIED (official pages unreadable on 9 Oct, not retried)**: Upstash (aggregator lists ~$1K), Redis Cloud (aggregator lists $10–25K), Figma (likely partner-only), Resend (no program confirmed; free tier exists).

### Inferences
- Only Sentry, plus PostHog or Mixpanel, give the current SQLite-based app real value. The database credits matter only if you move off SQLite.

### Gaps
- Most items in this section were not re-fetched today because of the tool-call budget. Treat them as accurate as of 9 Oct.

## 4. Free tiers (no application) that could host the Docker app at $0

### Takeaway
No option is truly "set and forget". **Oracle Always Free** (Arm VM, card required, idle accounts reclaimed) is the best $0 home for a long-running Docker app with persistent SQLite. **Google Cloud Run's free tier** suits a stateless request/response setup but makes SQLite persistence awkward. **Render Free** sleeps after 15 minutes and loses local files. **Cloudflare Containers needs Workers Paid ($5/mo)**, so it isn't free.

### Cited Findings
- **Oracle Always Free [RE-VERIFIED 10 Oct]**:
  - Always Free includes AMD compute, Arm Ampere A1 compute, block storage and object storage. The page gave no specs.
  - A card is required (no prepaid or virtual cards).
  - "Accounts idle for 30 days or more may be treated as abandoned" and may be suspended.
  - Source: [Oracle Free](https://www.oracle.com/cloud/free/)
- **Google Cloud Run free tier [RE-VERIFIED 10 Oct]**:
  - Request-based billing: 180,000 vCPU-seconds, 360,000 GiB-seconds and 2M requests per month, per billing account.
  - Instance-based billing: 240,000 vCPU-seconds and 450,000 GiB-seconds.
  - Valued at Tier 1 prices. Asia regions such as Singapore are Tier 2 and use up the free tier faster.
  - Source: [Cloud Run pricing](https://cloud.google.com/run/pricing)
- **Render Free [RE-VERIFIED 10 Oct]**: spins down after 15 minutes idle (about 1 minute to wake), 750 free hours per month per workspace, and "cannot" attach a persistent disk, so local files are lost on restart. — [Render free](https://render.com/docs/free)
- **Cloudflare Containers [RE-VERIFIED 10 Oct]**:
  - "N/A" on the Free plan; requires Workers Paid at $5/mo.
  - Included each month: 25 GiB-hours of memory, 375 vCPU-minutes, 200 GB-hours of disk, and 500 GB egress (India and other regions).
  - Instance sizes run from lite (1/16 vCPU, 256 MiB) to standard-4.
  - Source: [CF Containers pricing](https://developers.cloudflare.com/containers/pricing/)
- **Koyeb [RE-VERIFIED 10 Oct]**: no free compute instance is listed on the current pricing page. — [Koyeb pricing](https://www.koyeb.com/pricing)
- **Railway [CARRIED 9 Oct]**: only a $5 trial grant. **Fly.io**: no free program found.

### Inferences
- Stockfish analysis is CPU-heavy. Cloud Run's 180K vCPU-seconds is about 50 vCPU-hours a month, enough for a beta, not for heavy use.
- For SQLite on Cloud Run you'd need Cloud Storage FUSE or a move to D1 or another database (not verified here).
- A $5 Cloudflare Workers Paid plan plus Containers keeps everything on Cloudflare and is the cheapest non-zero route. Once incorporated, Cloudflare credits would then cover it.

### Gaps
- Exact Oracle A1 specs (historically 4 OCPU / 24 GB) weren't on the page today. UNVERIFIED.
- Docker support on Render Free wasn't stated on the page.

## 5. Changes in Sept–Oct 2026, and partner routes to higher tiers without a VC

### Takeaway
Confirmed recent changes:
- Cloudflare raised its tiers (Tier 3 to $10K, Tier 1 to $350K), with no date given.
- Google relabelled its pages to Pre-funded / Early stage / Series B+.
- DO Hatch excludes third-party AI models (since May 2026).
- PostHog credits exclude PostHog AI from 14 Sep 2026.
- Twilio Searchlight closed on 11 Sep 2026.

No brand-new cloud program for Sept–Oct 2026 was found. The main no-VC unlocks are Stripe Atlas (Cloudflare $100K, AWS $5K) and DPIIT (AWS Portfolio $5K Org ID).

### Cited Findings
- Cloudflare tier increases and the upgrade-review path for existing members. — [Cloudflare for Startups](https://www.cloudflare.com/forstartups/)
- Google's main page uses "Pre-funded / Early stage / Series B+" labels. — [GCP startup](https://cloud.google.com/startup)
- AWS credits page metadata was updated on 2026-10-09; no change is described. — [AWS credits](https://aws.amazon.com/startups/credits)
- DO credit scope change of 13 May 2026. — [DO Hatch](https://www.digitalocean.com/hatch)
- A 10 Oct search for new October 2026 programs returned only existing programs (OVHcloud, Cloudflare, an aggregator comparison). — [search lead: fin.ai](https://fin.ai/learn/startup-credit-programs) (aggregator, not used for facts)
- **Partner routes [CARRIED 9 Oct, official Stripe and Startup India pages]**:
  - **Stripe Atlas** (Delaware C-corp, about $500) perks: AWS Activate $5K, **Cloudflare $100K**, Microsoft $5K+, PostHog $50K, Clerk 50% off, Linear 6 months. — https://support.stripe.com/questions/stripe-atlas-perks-partners
  - **DPIIT recognition** (needs an Indian Pvt Ltd or LLP) gives an AWS Portfolio Org ID worth $5K and lists DigitalOcean as a partner. — https://www.startupindia.gov.in/content/sih/en/reources/resource-partners/cloud-services/aws_services.html
  - **Datadog** accepts referrals from hyperscaler startup programs.
  - **Accelerators and incubators**, including the Cloudflare Workers Launchpad and Indian incubators, unlock Cloudflare Tier 2, Render, Vercel and GitHub.

### Inferences
- Atlas is the largest unlock: Cloudflare $100K versus $10K directly. It carries US compliance costs and Indian FEMA/ODI obligations, so get a CA's advice first.
- An Indian Pvt Ltd unlocks Cloudflare Tier 3, the Microsoft $5K step, Akamai, JetBrains and DPIIT.

### Gaps
- Atlas perk values were not re-fetched today.
- X posts (the owner's links) could not be read from this machine.
