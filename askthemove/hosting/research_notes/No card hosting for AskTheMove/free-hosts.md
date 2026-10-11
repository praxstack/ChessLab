# No-card free hosting for AskTheMove (Docker: Node 24 + Express + x86-64 Stockfish child process + SQLite), checked 2026-10-11

Notes on method: pages were fetched on 2026-10-11 unless a date is given. "UNVERIFIED" means I could not confirm it on an official page in this session; it comes from training knowledge or a third-party source. App needs: ~300-500 MB RAM, one long-running container, a native x86-64 binary, and a SQLite file that survives restarts, either on a persistent disk or through Litestream to an S3-compatible bucket.

## Q1. Which free PaaS/container hosts need no card and can run this Docker app?

### Takeaway
As of October 2026 only a few hosts need no card and can still run a long-running Docker container: Render Free (sleeps after 15 min, no persistent disk), Northflank Sandbox (always on, but the card requirement is unclear), Back4App Containers (256 MB RAM, too small) and Zeabur Free (sleeps; it is unclear what compute it includes). Hugging Face Docker Spaces, which used to be the best no-card option, became paid in July 2026. Koyeb, Fly.io, Oracle Always Free, Railway after its trial and Clever Cloud after its credits all need a card or have no lasting free tier. No candidate gives a free persistent disk without a card, so a SQLite plus Litestream setup (or Turso) is needed on any of them.

### Comparison table

| Platform | Card at sign-up? | Docker? | Free RAM/CPU | Sleeps when idle / cold start | Free persistent disk? | Commercial use | Custom domain (free) | Region near India | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **Hugging Face Spaces (Docker SDK)** | No for the account, but **Docker Spaces now need PRO or billing** | Yes | CPU Basic: 2 vCPU / 16 GB / 50 GB of non-persistent disk | Yes, sleeps "after a period of time if unused". The period is not stated in the docs (UNVERIFIED: 48 h) | No. Disk is ephemeral; Storage Buckets can be mounted as volumes, but no free allowance is stated | Not checked | Public or protected Spaces: yes. Private: no | Not stated | **Not free any more for Docker** (since about 8 July 2026) |
| **Render Free** | No (a card is only needed to avoid suspension when limits are exceeded) | Yes (UNVERIFIED on the free page; Render supports Dockerfile deploys) | 512 MB RAM; CPU not stated (third-party source: 0.1 vCPU) | Spins down after 15 min without traffic; about 1 min to spin up | **No**: "Free web services cannot" attach a disk; the filesystem is lost on spin-down or restart | Docs say "Do not use them for production applications" | Yes | Singapore region (UNVERIFIED this session) | **Best fit with no card.** Needs Litestream or Turso. 750 instance-hours a month cover one always-on service |
| **Northflank Sandbox** | **Unclear.** The official page does not say; freetier.co contradicts itself (verified 2026-08-18) | Yes | Not stated (plans start at 0.1 vCPU / 256 MB) | "Always-on-compute – no sleeping" | Not stated; volumes priced at $0.15/GB/month | Not checked | "Free SSL and custom domains" on all plans | Not stated for the Sandbox | Worth trying. If no card is requested it is the best always-on option |
| **Koyeb free instance** | **Yes.** FAQ: "We require a credit card to prevent fraud and abuse", with a $29 pre-authorization hold. A 2023 blog said a card was asked only when bot checks fail, so the FAQ is newer | Yes | 512 MB / 0.1 vCPU / 2 GB SSD; one per organization | Scales to zero after 1 h without traffic. Third-party freetier.co says it "never spins down", which contradicts the official docs | No ("can't be used with Volumes") | "should not be used for production" | Not stated for the free tier | Frankfurt or Washington DC only | Out (card) |
| **Back4App Containers** | No ("no credit card required") | Yes | 256 MB RAM / 0.25 shared CPU / 100 GB transfer | Not stated | Not stated | Aimed at "personal projects" | Not stated | Not stated | Out on RAM (256 MB is less than the 300-500 MB needed) |
| **Zeabur Free** | No ("No credit card required") | Yes (platform) | Not stated; "Shared Cluster (Deprecated)" appears in the docs | "Services auto-sleep after inactivity" | Not stated | Not checked | The pricing table shows 0 domains for Free | Not checked | Unclear. Probably not usable for compute; may only manage a server you bring yourself |
| **Clever Cloud** | No card for the trial credits | Yes | Trial credits only | Stops when the credits run out (freetier.co, Aug 2026) | n/a | n/a | n/a | EU-centred | Out (no lasting free tier) |
| **Railway** | Trial: $5 for 30 days; card not stated. Accounts verified through GitHub; "Limited Trial" restricts outbound network | Yes | Free plan after the trial: **$1/month credit**, 0.5 GB RAM, 1 vCPU, 0.5 GB volume, 1 replica | Stops when the credit is used up | 0.5 GB volume on Free; trial volumes deleted 30 days after the credits expire | Not checked | Not stated | Singapore (UNVERIFIED) | $1/month does not pay for 300-500 MB around the clock. Out |
| **Fly.io** | Not for the trial (2 h of machine runtime or 7 days); **card required afterwards** | Yes | No free tier | n/a | n/a | n/a | n/a | Mumbai bom (UNVERIFIED) | Out |
| **Oracle Cloud Always Free** | **Yes**, credit or debit card; no prepaid, virtual or PIN-debit cards | VMs (run Docker yourself) | Two compute instances (official FAQ); specs not on the FAQ (UNVERIFIED: up to 4 OCPU / 24 GB Ampere A1, which is ARM, plus AMD micro) | Accounts idle for 30+ days can be suspended | Block storage included | Allowed | Yes | Mumbai/Hyderabad (UNVERIFIED) | Out (card). Note that A1 is ARM, so it would need an arm64 Stockfish build |
| **Replit** | Not stated | Not Docker | Starter: one free published app (Autoscale or static); "will automatically go down after 30 days"; Reserved VM not listed for Starter | Autoscale | No | Shows a "Made with Replit" badge | Not stated | Not stated | Out (30-day expiry, no Docker) |
| **Cloudflare Containers** | Needs Workers Paid, $5/month (pricing table shows "N/A" for Free) | Yes | lite type is 256 MiB; basic is 1 GiB | Scales on demand | Disk persistence not stated | — | — | — | Out (paid) |
| **Alwaysdata Free** | Not stated | No Docker | 256 MB RAM, 1/4 CPU, 1 GB SSD | — | 1 GB | "For **personal** needs" | Site on alwaysdata.net | Not stated (EU) | Out (RAM, no Docker, personal use only) |
| **Glitch** | — | — | — | — | — | — | — | — | **Dead.** App hosting ended on 8 July 2025 |
| Deno Deploy, Vercel, Netlify, Appwrite Sites, Kinsta (free static), PythonAnywhere free, Cloudflare Workers | — | No long-running container | — | — | — | — | — | — | **Dropped.** All are serverless, edge or static (Workers: 10 ms CPU per invocation on Free). PythonAnywhere free does not run Node web apps (UNVERIFIED this session). None can keep a Stockfish child process alive with a local SQLite file |
| **Adaptable.io** | — | — | — | — | — | — | — | — | No current official page found. Probably defunct (UNVERIFIED) |

### Cited Findings
- HF: "Each Spaces environment is limited to 16GB RAM, 2 CPU cores and 50GB of (not persistent) disk space"; "creating a Space that runs on compute (Gradio or Docker) requires a paid plan to create, while Static Spaces are free for everyone"; "Free personal accounts in good standing can still host up to 2 Gradio Spaces running on ZeroGPU" (this does not cover Docker); "On free hardware, your Space will 'go to sleep'... if unused"; custom domain: Private = No — [HF Spaces overview](https://huggingface.co/docs/hub/spaces-overview)
- HF: users first reported the Docker SDK marked "Paid" on 2026-07-08. CLI message: "hosting Gradio and Docker Spaces on free cpu-basic requires a PRO subscription". UI message: "Add billing to your account (credits or subscribe to PRO) to unlock Docker Spaces". No staff reply in the thread. Users disagree on whether existing free Docker Spaces can still be redeployed — [HF forum thread](https://discuss.huggingface.co/t/docker-sdk-now-marked-as-paid-when-creating-a-new-space/177580)
- HF: "This disk space is ephemeral, meaning its content will be lost if your Space restarts or is stopped"; Storage Buckets are "the recommended way to persist data"; datasets mount read-only — [HF Spaces storage](https://huggingface.co/docs/hub/spaces-storage)
- Render: spins down after 15 min without inbound traffic; spin-up "takes about one minute"; "750 Free instance hours" per workspace per month; "Free web services cannot" attach persistent disks; filesystem changes are lost on redeploy, restart or spin-down; "Do not use them for production applications"; may restart at any time; outbound SMTP ports 25/465/587 blocked; without a payment method, going over the limits suspends Free services for the rest of the month; custom domains supported — [Render Free docs](https://render.com/docs/free). Free = 512 MB RAM — [Render pricing](https://render.com/pricing)
- Northflank: Sandbox has 2 free services, 1 free database and 2 free cron jobs, "Always-on-compute – no sleeping :)", "Free SSL and custom domains" on all plans; FAQ: "when you enter a card we only verify the card" — [Northflank pricing](https://northflank.com/pricing). A third-party page (verified 2026-08-18) lists the card requirement as "Not stated" but says elsewhere that a card is needed, so it contradicts itself — [freetier.co Northflank](https://freetier.co/directory/products/northflank). Another third-party roundup says no card — [freetier.co best free hosting 2026](https://freetier.co/articles/best-free-cloud-hosting-2026)
- Koyeb: "Each Free Instance provides 512MB of RAM, 0.1 vCPU, and 2GB of SSD"; Frankfurt or Washington DC only; scales to zero after 1 h without traffic; no Volumes; one per organization — [Koyeb instances](https://www.koyeb.com/docs/reference/instances). "We require a credit card to prevent fraud and abuse", with a "$29 pre-authorization hold" — [Koyeb pricing FAQ](https://www.koyeb.com/docs/faqs/pricing). The older policy (2023-10-27) asked for a card only if human verification failed — [Koyeb blog](https://www.koyeb.com/blog/sustaining-free-compute-in-a-hostile-environment). A third-party source says it "never spins down", which contradicts the official docs — [freetier.co](https://freetier.co/articles/best-free-cloud-hosting-2026)
- Back4App Containers free: 0.25 shared CPU, 256 MB RAM, 100 GB transfer, "no credit card required", aimed at "personal projects" — [Back4App CaaS pricing](https://www.back4app.com/pricing/container-as-a-service)
- Zeabur: Free plan "No credit card required", "Services auto-sleep after inactivity", no SLA — [Zeabur free plan](https://zeabur.com/docs/en-US/pricing/free-plan). The pricing table shows Domains = 0 on Free; Free can manage 1 server you bring yourself — [Zeabur pricing](https://zeabur.com/pricing). The docs sidebar lists "Shared Cluster (Deprecated)" — [Zeabur billing docs](https://zeabur.com/docs/en-US/billing/pricing)
- Clever Cloud: "free credits to give Clever Cloud a try with no payment card required" — [Clever Cloud pricing](https://www.clever.cloud/pricing). It is a "block of free usage credit, not a sustained free tier" — [freetier.co](https://freetier.co/articles/best-free-cloud-hosting-2026)
- Railway: one-time $5 trial for 30 days, then the Free plan with "$1 of free credit per month"; Limited Trial (unverified accounts) has "restricted outbound network access"; verification goes through GitHub; trial volumes deleted 30 days after the credits expire — [Railway free trial](https://docs.railway.com/reference/pricing/free-trial). Free plan limits: 0.5 GB RAM, 1 vCPU, 1 GB ephemeral storage, 0.5 GB volume, 1 replica — [Railway plans](https://docs.railway.com/reference/pricing/plans)
- Fly.io: no free tier; the trial is "up to 2 hours of Machine runtime or 7 days"; "You don't need a credit card to start the trial"; a card is needed afterwards — [Fly pricing](https://docs.fly.io/about/pricing)
- Oracle: "We use your contact information and credit/debit card information for account setup and identity verification"; does not accept "debit cards with a PIN or virtual, single-use, or prepaid cards"; accounts idle for 30+ days may be suspended — [Oracle Free Tier FAQ](https://www.oracle.com/cloud/free/faq/)
- Replit Starter: "1 free published app", Autoscale or static; "will automatically go down after 30 days"; "Made with Replit" badge — [Replit Starter plan](https://docs.replit.com/billing/plans/starter-plan), [Replit deployment pricing](https://docs.replit.com/billing/deployment-pricing)
- Cloudflare Containers: the Free column shows N/A; usage is billed under the "$5 USD per month Workers Paid plan"; the lite type is 1/16 vCPU / 256 MiB — [CF Containers pricing](https://developers.cloudflare.com/containers/pricing/)
- Cloudflare Workers Free: 100,000 requests a day, 10 ms CPU per invocation — [freetier.co](https://freetier.co/articles/best-free-cloud-hosting-2026)
- Alwaysdata free: 1 GB SSD, 256 MB RAM, 1/4 CPU, "For **personal** needs" — [Alwaysdata pricing](https://www.alwaysdata.com/en/pricing/)
- Glitch ended app hosting on 2025-07-08 — [Glitch blog](https://blog.glitch.com/post/changes-are-coming-to-glitch/), [BleepingComputer](https://www.bleepingcomputer.com/news/security/glitch-to-end-app-hosting-and-user-profiles-on-july-8/amp/)

### Inferences
- Render Free is the safest no-card host that is known to work. Expect a cold start of about 1 min after 15 min idle, and treat local SQLite as disposable: Litestream should restore it on boot and replicate it continuously. One service running all month uses about 720-744 of the 750 hours. Uptime pingers to stop sleeping are common but go against the spirit of the free tier (not covered by the docs above).
- Northflank Sandbox is the only always-on, no-sleep option that might need no card. Its RAM is unknown and it may be under 512 MB. The founder should simply try signing up.
- A RAM budget of 512 MB (Render, Koyeb) is tight for Node plus Stockfish. Stockfish's hash table size (`Hash` option) and thread count should be kept small.

### Gaps
- Northflank Sandbox's card requirement and its RAM/CPU per service could not be confirmed on an official page.
- HF Spaces sleep timeout and whether existing free Docker Spaces keep running: no official statement found.
- Render's region list (Singapore) and CPU share were not confirmed on an official page this session.
- Commercial-use terms were not checked in each platform's ToS.
- Adaptable.io's status: no official page found.

## Q2. No-card storage to keep SQLite alive on an ephemeral host

### Takeaway
Turso (5 GB, "no credit card required") and Tigris (5 GB, "No card to start") are confirmed no-card on official pages. Backblaze B2 (10 GB) needs no card according to a third-party guide. R2's card requirement could not be confirmed officially, and widespread reports say it needs a payment method. Litestream to Tigris or B2 keeps the existing SQLite code unchanged. Turso would mean switching to the libSQL client.

### Cited Findings
- Tigris free: 5 GB of storage a month, 10,000 PUT/COPY/POST/LIST and 100,000 GET requests a month; "No card to start" — [Tigris pricing](https://www.tigrisdata.com/pricing/)
- Turso free: up to 100 databases, 5 GB storage, 500M rows read and 10M rows written a month, 3 GB syncs; "Start free, no credit card required" — [Turso pricing](https://turso.tech/pricing)
- Backblaze B2: "First 10GB storage is always free"; payment card not mentioned — [B2 pricing](https://www.backblaze.com/cloud-storage/pricing). "no payment method is required to sign up" (third-party guide, undated) — [cleberg.net](https://cleberg.net/blog/backblaze-b2/)
- Cloudflare R2 free: 10 GB-month, 1M Class A and 10M Class B operations, free egress; the page does not say whether a card is required — [R2 pricing](https://developers.cloudflare.com/r2/pricing/). A third-party page only says "usually no" — [costbench](https://costbench.com/software/cloud-infrastructure/cloudflare-r2/free-plan/). UNVERIFIED (training knowledge): the R2 dashboard asks for a payment method before R2 can be enabled, even on the Free plan.
- Supabase Storage (1 GB on the free plan, no card) and Neon free (Postgres, no card): UNVERIFIED this session. Neon is Postgres, so it would mean a database migration and is not a Litestream target.

### Inferences
- Recommended pairing: Render Free (or Northflank) plus Litestream to Tigris or B2. Restore on container start, replicate continuously, and accept loss of up to about a second of writes on spin-down. Litestream can also replicate to any S3-compatible endpoint (B2, Tigris).
- Each spin-down and restore cycle uses Class A/B requests. At 10-30 users, Tigris's 10k PUT a month could be tight if Litestream syncs every second. Raising the sync interval would help (not verified against Litestream defaults).

### Gaps
- Whether R2 needs a card, and whether B2 does (no official statement found).
- Litestream's request volume under the Tigris free quota was not measured.

## Q3. Self-hosting: Mac with Cloudflare Tunnel, Android (Termux), Raspberry Pi

### Takeaway
Cloudflare Tunnel is free with generous limits (1,000 tunnels per account) and needs no card. A named tunnel needs a domain on Cloudflare; a quick tunnel (`trycloudflare.com`) does not, but it is meant for testing and its URL is random. Free proxying caps uploads at 100 MB, which does not matter for this app. Main risks: the Mac must stay awake, the home uplink and power cuts, and ARM. Apple Silicon, the Pi and Android are all ARM, so the x86-64 Stockfish binary needs an arm64 build or emulation.

### Cited Findings
- Tunnel limits: 1,000 tunnels per account, 25 replicas per tunnel, 1,000 routes; no bandwidth limit listed — [CF Zero Trust account limits](https://developers.cloudflare.com/cloudflare-one/account-limits/)
- Cloudflare Free and Pro plans "are limited to a maximum upload size of 100mb" — [GridPane KB](https://gridpane.com/kb/cloudflares-cdn-and-upload-limitations/)
- ToS: the CDN on Free/Pro/Business may be limited if used "to serve video" or other large files without paid services. No Tunnel-specific clause appears in the application-services terms — [CF service-specific terms](https://www.cloudflare.com/service-specific-terms-application-services/). A chess web app serving HTML/JSON fits within this.

### Inferences
- Mac plus a named Cloudflare Tunnel is the most capable no-card option: real persistent disk, plenty of RAM, always on. It needs a domain, which costs money unless a free subdomain service is used; quick tunnels need no domain but change URL on every restart (UNVERIFIED on official docs this session). Docker Desktop on Apple Silicon can run amd64 images under emulation; a native arm64 Stockfish is better.
- Raspberry Pi 4/5 (arm64) can run Docker plus an arm64 Stockfish build; SQLite on an SD card risks corruption, so use USB SSD plus Litestream. Android with Termux can run Node and a native aarch64 Stockfish but not Docker in practice. Android may kill background processes. All UNVERIFIED this session.

### Gaps
- Official Cloudflare docs on quick-tunnel limits and the domain requirement for named tunnels were not fetched (the page I fetched covers private networking only).
- Termux and Pi feasibility details were not verified against sources.
