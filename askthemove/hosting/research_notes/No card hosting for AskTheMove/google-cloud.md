# Google Cloud for a card-less solo founder in India (as of Oct 2026)

Scope: Can an individual in India with no credit card (only a debit card plus UPI or net banking) host AskTheMove for free on Google Cloud? The app is a Docker image (Node 24, native x86-64 Stockfish, SQLite on a disk volume), needs about 1 GB RAM, runs always-on as one instance.
Research date: 2026-10-11. Official docs I fetched show "Last updated" dates of 2026-10-07 to 2026-10-09.
Method note: the old cloud.google.com/billing/... and /free/docs/... URLs now return 404. The docs have moved to docs.cloud.google.com.

## 1. Billing account sign-up from India: payment methods, account type, trial terms, auto-charge, prepayment, RBI

### Takeaway
An individual (non-business) account in India appears possible, but you must pass government-mandated identity verification (proof of identity and address) within 30 days. Sign-up needs a payment method. A Visa or Mastercard debit card is reported to work. RuPay is reported not to work. UPI is officially supported, but the docs say it is for "qualified organizations" and needs a ₹500–1000 prepayment first. The free trial does not auto-charge: when it ends, the account closes unless you manually upgrade.

### Cited Findings
- **Free trial terms.** "$300 Welcome credit valid for 90 days", a "90-day program … without any financial commitment". You "must provide a credit card or other payment method that is valid for the period of the Free Trial". "Depending on your country, you might also need to verify your bank account." — [Free Google Cloud features (docs, updated 2026-10-09)](https://docs.cloud.google.com/free/docs/free-cloud-features)
- **Trial eligibility.** You must never have been a paying user of Google Cloud, Maps Platform or Firebase, and must not have used the trial before. — [same](https://docs.cloud.google.com/free/docs/free-cloud-features)
- **No auto-charge after the trial (confirmed).** "your Free Trial billing account auto-closes if you spend the $300 credit or 90 days pass from signup, and you won't be charged unless you manually upgrade to a paid account." — [Free Trial FAQs](https://cloud.google.com/signup-faqs?hl=en). The docs say the same: if you don't upgrade, "your Free Trial billing account will be closed and all of its associated projects and resources will be stopped". — [free-cloud-features](https://docs.cloud.google.com/free/docs/free-cloud-features)
- **Grace period.** A 30-day grace period before deletion after the trial closes. — [Unico Connect blog, updated 2026-09-25 (secondary, a GCP reseller)](https://unicoconnect.com/blogs/google-cloud-free-tier-credits-india)
- **Verification hold.** "During identity verification, you may see a pending payment authorization. This is an authorization request, not a charge … may stay 1-14 business days". — [Free Trial FAQs](https://cloud.google.com/signup-faqs?hl=en). The billing docs say a temporary pre-authorization "is not an actual charge" and to "allow up to 7 business days" for it to clear. — [Create a self-serve Cloud Billing account](https://docs.cloud.google.com/billing/docs/how-to/create-billing-account). The secondary source says the hold is up to $1. — [Unico Connect](https://unicoconnect.com/blogs/google-cloud-free-tier-credits-india)
- **Account type.** Individual accounts are "designed for personal use". Business accounts are "designed for multi-user, managed environments, such as companies". The choice is permanent. — [Create billing account docs](https://docs.cloud.google.com/billing/docs/how-to/create-billing-account). These docs do not say India requires the Business type. This conflicts with older folklore (see Gaps).
- **India identity-verification mandate.** "Google is required to comply with applicable cybersecurity regulations in India". You "must complete the identity verification process within 30 days" or "your Cloud Billing account and access to Google Cloud might be suspended". Individuals provide proof of identity and address. Organizations provide a mobile number, executive names and possibly registration documents. — [Create billing account docs](https://docs.cloud.google.com/billing/docs/how-to/create-billing-account)
- **User report: an individual stuck at verification (Nov 2024).** The verification page said "Your business information could not be verified" and listed only organizational documents (incorporation certificate, GST, and so on). No resolution was posted beyond "contact support". — [Google Developer forums thread](https://discuss.google.dev/t/being-an-indian-individual-how-can-i-setup-and-verify-billing-gcp-account/173113)
- **Cards.** Accepted: Amex, Mastercard and Visa credit cards, and Visa or Mastercard debit cards. Prepaid cards and "debit cards that need two-factor authentication" are not accepted. "RuPay is not on the list". — [Unico Connect, Sep 2026 (secondary)](https://unicoconnect.com/blogs/google-cloud-free-tier-credits-india). A vendor blog also says "only Visa and Mastercard work in India", and that net banking works for one-time manual payments only, not auto-pay. — [Fighty AI, 2026-03-21 (a vendor selling prepaid cloud accounts; low reliability)](https://fightyai.com/blog/how-to-pay-for-google-cloud-without-credit-card.html)
- **UPI (official).** UPI is available "for qualified organizations in India" to "make a manual payment or set up monthly recurring payments". It needs an Indian billing address, an Indian bank account and INR currency. Automatic payments need a mandate approved in your UPI app. "Before you can use UPI as a payment method, you need to make a prepayment, typically 500 to 1000 INR." The page does not say whether the prepayment is refundable or whether UPI works at sign-up or for the trial. — [Use UPI for Google Cloud payments (updated 2026-10-07)](https://docs.cloud.google.com/billing/docs/resources/upi-payment-india)
- **RBI recurring limit.** "your bank might decline automatic card charges >15,000 INR for recurring payments". Google recommends a manual payment if this happens. — [Add/update payment method docs (updated 2026-10-09)](https://docs.cloud.google.com/billing/docs/how-to/payment-methods). The Fighty AI blog claims the cap is ₹5,000 and mentions error OR_BACR2_44. This conflicts with Google's ₹15,000 figure. The RBI raised the e-mandate threshold to ₹15,000 in 2023, so the vendor figure looks stale.
- **UPI self-serve (conflict).** The Fighty AI blog claims UPI is "not available for self-serve billing", only as a QR code on invoices. This is contradicted by Google's own UPI page, which describes manual payments and mandates. Trust the official page.

### Inferences
- A card-less signup has two plausible routes: (a) a Visa or Mastercard debit card that the bank enables for international/online/recurring use, or (b) UPI, if Google's "qualified organizations" wording lets an Individual account through. Route (b) is unverified for individuals.
- The trial cannot surprise-bill you. The risk starts only after you manually upgrade to a paid account.
- RuPay-only users are likely blocked at sign-up.
- The Business-documents verification screen is a real risk for a sole founder with no GST or incorporation.

### Gaps
- No official Google page lists the India payment methods allowed at sign-up (debit, RuPay, net banking). The card-type list comes from secondary sources only.
- Unverified whether India still forces the "Business" account type in the sign-up UI. Older reports (2019–2022) said India sign-ups showed only "Business". The current docs describe Individual verification for India, which implies Individual is allowed. I found no 2025–2026 first-hand Reddit report confirming either way. (Reddit search returned nothing usable.)
- Unverified whether UPI can be used to start the free trial, as opposed to paying invoices later, and whether "qualified organizations" excludes Individual accounts.
- Not found: whether the ₹500–1000 UPI prepayment is refundable. It is probably credited against usage, but that is unconfirmed.

## 2. Always Free e2-micro VM: still offered? Will it run the app?

### Takeaway
Yes, it is still offered as of Oct 2026: one e2-micro per month, US regions only (us-west1, us-central1, us-east1), 30 GB standard persistent disk, and 1 GB of egress per month. But it requires an active billing account. After the 90-day trial that means a Paid account, with an auto-pay method on file. The app's 1 GB RAM need equals the whole VM, so it is marginal.

### Cited Findings
- "1 non-preemptible e2-micro VM instance per month in one of the following US regions": Oregon us-west1, Iowa us-central1, South Carolina us-east1. Also "30 GB-months standard persistent disk", "1 GB of outbound data transfer from North America to all region destinations (excluding China and Australia) per month", and the limit "is by time, not by instance … combined across the supported regions". — [free-cloud-features, updated 2026-10-09](https://docs.cloud.google.com/free/docs/free-cloud-features)
- "A Google Cloud billing account is required to access the Google Cloud Free Tier". The account (Paid or Free Trial) must be "active and in good standing". — [same](https://docs.cloud.google.com/free/docs/free-cloud-features)
- No Always Free compute exists in Indian regions. The trial credit works in Mumbai (asia-south1) and Delhi (asia-south2). — [Unico Connect](https://unicoconnect.com/blogs/google-cloud-free-tier-credits-india); [free-cloud-features](https://docs.cloud.google.com/free/docs/free-cloud-features)

### Inferences
- To keep e2-micro free after day 90, you must upgrade to Paid, which means a payment method that can auto-charge. Any overage (for example egress beyond 1 GB, a balanced or SSD disk, or a snapshot) is billed automatically. That is the "surprise bill" risk. Budgets only alert; they do not cap spending.
- e2-micro specs are not quoted on the fetched page. From general knowledge: 2 shared vCPUs at a 25% sustained baseline (0.25 vCPU) with bursting, and 1 GB RAM. Node 24 plus Stockfish plus the OS in 1 GB would need swap and a small Stockfish hash. Sustained Stockfish analysis would be throttled to about 0.25 vCPU. Feasible only for light traffic.
- Latency from India to US regions is roughly 200–300 ms RTT. This is an estimate and was not measured.
- The 1 GB/month egress allowance is small for a public web app. Each extra GB is billed. Egress to India is outside North America, but it is still covered by the "all region destinations" wording.
- Possible extra cost: a VM's in-use external IPv4 has been charged since 2024. Whether the free tier waives it was not confirmed on the fetched page.

### Gaps
- e2-micro vCPU and RAM specs, the external IPv4 charge for free-tier VMs, and the price per GB of egress to India were not verified from sources in this session.

## 3. Cloud Run free tier with SQLite

### Takeaway
Cloud Run's free tier cannot host this app always-on for free. SQLite on a GCS FUSE volume is unsafe, there is no persistent local disk, and an always-on instance with 1 GiB costs roughly $45–50/month after the free allowance.

### Cited Findings
- **Request-based free tier.** 2M requests per month, 360,000 GB-seconds and 180,000 vCPU-seconds per month, and 1 GB egress from North America. — [free-cloud-features](https://docs.cloud.google.com/free/docs/free-cloud-features)
- **Instance-based free tier.** First 240,000 vCPU-seconds and 450,000 GiB-seconds per month.
- **Tier 1 prices (includes asia-south1).**
  - Instance-based: $0.000018 per vCPU-second and $0.000002 per GiB-second.
  - Idle min-instances (request-based): $0.0000025 per vCPU-second and $0.0000025 per GiB-second.
  - Source: [Cloud Run pricing](https://cloud.google.com/run/pricing)
- **GCS FUSE volume limits.** "Cloud Storage FUSE does not provide concurrency control for multiple writes (file locking) to the same file … the last write wins". It is "not a fully POSIX-compliant file system". NFS volume mounts exist as a separate option. — [Cloud Storage volume mounts (updated 2026-10-07)](https://docs.cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts)

### Inferences
- **Always-on cost** (about 2.63M seconds per month), from my own arithmetic on the cited prices:
  - At 1 vCPU and 1 GiB, instance-based: CPU (2.63M − 0.24M) × $0.000018 ≈ $43, plus memory (2.63M − 0.45M) × $0.000002 ≈ $4.4, so about **$47/month**.
  - Idle min-instance pricing would be about (2.63M − 0.18M) × $0.0000025 × 2 ≈ $12/month idle, before active time.
  - My recollection is that Cloud Run needs at least 1 vCPU for more than 512 MiB of memory. This is unverified.
- SQLite needs reliable file locking, so it is unsuitable on GCS FUSE. The in-memory /tmp filesystem is lost on restart. An NFS volume needs Filestore, which is expensive (minimum not verified).
- Scale-to-zero with SQLite stored in GCS between requests (Litestream-style replication) is the only "free-ish" pattern. It breaks "always-on" and adds cold-start latency.

### Gaps
- Filestore minimum cost was not fetched. I did not verify whether Cloud Run requires 1 vCPU for 1 GiB.

## 4. Google for Startups Cloud Program (Start tier)

### Takeaway
Start tier gives up to $2,000 in credits for one year, to "digital-native startups" founded within 24 months. It effectively requires a company website plus a matching-domain email and billing account. It still requires an existing Cloud Billing account, so it does not remove the payment-method hurdle. It is a poor fit for an unincorporated individual.

### Cited Findings
- **Eligibility and credits.** "Up to $2,000 USD in Google Cloud credits, valid for one year". It targets startups with "a working MVP, a clear business model, and plans to seek venture funding soon", "Founded within the last 24 months", that have "Not yet received Google Cloud credits (beyond the free trial)". Credits "can be applied towards Google Cloud Platform Services and Select Google Cloud offerings". Acceptance is discretionary, "Offer subject to change". — [Startups program benefits](https://cloud.google.com/startup/benefits)
- **Exclusions.** "personal blogs or content, dev shops, consultancies, agencies…" are excluded. — [Startup FAQ](https://cloud.google.com/startup/faq)
- **Billing account needed.** "Have your 18-character Google Cloud billing account ID". "your company website domain must match your email domain and the email domain associated with your billing account." — [Startup FAQ](https://cloud.google.com/startup/faq)
- **Credit scope.** Credits "can be used for Google Cloud services such as BigQuery and Gemini". They are not usable on Marketplace or third-party services. — [Startup FAQ](https://cloud.google.com/startup/faq)
- **Gemini note.** The "Gemini and Gemma" note appears only under the Scale and AI tiers. — [benefits](https://cloud.google.com/startup/benefits)
- **Funding.** Angel, friends-and-family and crowdfunding don't qualify for Scale, but "may be evaluated for the Start tier". — [Startup FAQ](https://cloud.google.com/startup/faq)

### Inferences
- **Not Gemini-only.** No official text says Start credits are Gemini-only. The wording "Google Cloud Platform Services" and "services such as BigQuery and Gemini" implies they are usable for Compute Engine and Cloud Run. The premise of the question seems false, but it is not explicitly confirmed.
- **Billing setup still needed.** Credits attach to a billing account you must have already created, which means you've already passed the payment-method and India verification step. Credits only offset charges, and the payment method stays on file.
- **Incorporation.** It is not explicitly required on the fetched pages. In practice, the domain-matched email, the "startup" framing and India's Business-verification documents make an unincorporated applicant unlikely to be approved. $2,000 would cover a small VM in Mumbai for the full year.

### Gaps
- No official statement on whether unincorporated individuals or sole proprietors are eligible, or on India-specific rules. No 2025–2026 user reports were found.

## 5. Any Google "no card" route?

### Takeaway
I found no fully card-free, payment-method-free route to Google Cloud compute. A payment method (or, possibly, a UPI mandate) is required even for the free trial and the Always Free tier.

### Cited Findings
- The free trial requires "a credit card or other payment method". — [free-cloud-features](https://docs.cloud.google.com/free/docs/free-cloud-features)
- A billing account is required for the Free Tier. — [same](https://docs.cloud.google.com/free/docs/free-cloud-features)
- UPI with a ₹500–1000 prepayment plus a mandate is the only official non-card method found for India. It is scoped to "qualified organizations". — [UPI docs](https://docs.cloud.google.com/billing/docs/resources/upi-payment-india)
- Wire transfer or invoiced billing reportedly needs a business registered for at least 1 year and $40K+ annual spend. — [Fighty AI (vendor, low reliability)](https://fightyai.com/blog/how-to-pay-for-google-cloud-without-credit-card.html)
- Third-party resellers (Unico Connect, INR or GST billing) exist, but they bill you commercially. — [Unico Connect](https://unicoconnect.com/blogs/google-cloud-free-tier-credits-india)

### Inferences
- **Best realistic card-less path:** an Individual account with a Visa or Mastercard debit card that has e-mandate support, or UPI, then the 90-day $300 trial (which never auto-charges), then a decision.
- **Staying free long-term** needs a manual upgrade to Paid for the e2-micro Always Free tier. The device then auto-charges any overage (RBI e-mandate; charges under ₹15,000 can go through without per-transaction OTP). Surprise bills are possible but would likely be small if the setup sticks strictly to e2-micro, a standard 30 GB disk and low egress.
- **Not "Google Cloud" proper:** Firebase or App Engine free quotas could not run native Stockfish with SQLite on a disk. This was not researched in depth.

### Gaps
- No 2025–2026 first-hand r/developersIndia or r/googlecloud reports were retrievable in this session confirming debit-card or UPI sign-up success or failure for Indian individuals.
