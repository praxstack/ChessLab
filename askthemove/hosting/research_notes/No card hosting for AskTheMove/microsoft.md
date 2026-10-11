# Microsoft / Azure credits without a credit card: solo founder in India (as of Oct 2026)

Bottom line for the report writer: **I found no Microsoft route that fits this founder (individual, India, no card, no company, not a student) and runs Azure compute without card details.** Every startup and free-trial path documented by Microsoft requires card details at Azure sign-up. The only no-card Azure offer, Azure for Students, requires a full-time enrolled student. All research done 2026-10-11.

## 1. Microsoft for Startups (formerly Founders Hub) in 2025-2026: tiers, eligibility, delivery, card requirement

### Takeaway
On July 1, 2025 Microsoft replaced the old Founders Hub tiers (up to $150K) with two tracks. The self-service track gives $1K immediately, plus $4K more after business verification. The investor-network track starts around $100K and needs a referral code. Credits arrive in an **Azure Sponsorship subscription**. Microsoft's docs say plainly that **a credit card is required to redeem**, so this path is closed to a founder with no card. The extra $4K also requires a registered legal entity.

### Cited Findings
- Microsoft announced the changes on June 27, 2025 and phased out the old program on July 1, 2025. The new self-service track gives early-stage, unfunded teams "up to $5,000" in Azure credits. The Investor Network track starts at $100,000 and requires an affiliated investor. Credits already activated stay valid until they expire. — [The Register, 2025-07-01](https://www.theregister.com/2025/07/01/microsoft_azure_startup/)
- Microsoft's Learn page "startup programs" describes the steps:
  - **Step 1: $1,000.** Requires a new Azure customer with no prior Azure account or subscription, a personal Microsoft Account (MSA, not a work or school account), and a country where the offer is available. Valid 90 days.
  - **Step 2: up to $5,000 total.** Requires business verification within 90 days of redeeming Step 1, a **registered legal business entity**, and an owned software product. Personal blogs, consultancies, agencies and dev shops are excluded. Valid 180 days from approval.
  - Business verification takes up to 7 business days and can be submitted only once. If verification fails, you keep the $1K. — [Microsoft Learn: Azure startup programs](https://learn.microsoft.com/en-us/azure/signups/startup-programs) (no date shown on the page; retrieved 2026-10-11)
- **Card requirement, quoted from the same page:** "Your credit card is required to:" (1) verify your identity, (2) pay for services not covered by your startup credits, and (3) ensure a seamless transition to pay-as-you-go. — [Microsoft Learn: Azure startup programs](https://learn.microsoft.com/en-us/azure/signups/startup-programs)
- **Delivery and what happens after credits:** "Redeemed credits are applied automatically to a new Azure Sponsorship subscription." The page also says: "Your subscription automatically converts to pay-as-you-go once your startup credit is fully used, or 90 days have passed, whichever comes first." Step 2 has the same rule at 180 days. — [Microsoft Learn: Azure startup programs](https://learn.microsoft.com/en-us/azure/signups/startup-programs)
- Microsoft Learn's "Microsoft for Startups application" page (ms.date 2026-10-08, updated 2026-10-09) gives a different and newer-looking description:
  - Eligible startups are pre-seed through Series B, B2B software, AI or tech, privately held, and working toward an MVP.
  - "Starter credits": **$200** when you create the Azure account. Expanded credits come after approval, typically within 3 business days. Investor-network startups get up to $150,000. Growth credits up to $150K depend on business verification, usage and so on.
  - Applicants **without an investor code verify with LinkedIn** and then create the Azure account.
  - **Payment information is required to finish Azure account setup:** cardholder name, card number, expiry, CVV and billing address.
  - The account must be a personal Microsoft account with a personal consumer email. Company-domain email is not accepted. You accept the Microsoft Customer Agreement and the *Supplemental Individual User Terms*.
  - A "registered startup name" must match your legal documents.
  - Sponsorship converts to pay-as-you-go when credits run out or expire.
  - Source: [Microsoft Learn: Microsoft for Startups application](https://learn.microsoft.com/en-us/microsoft-for-startups/application)
- A third-party blog (dated 2026-01-09) gives the same $1K (90 days) plus $4K (180 days) structure. It says individuals without a company can get the $1K but not the $4K, because verification needs a registered legal entity, and that credits go to an Azure Sponsorship subscription. It does not address card requirements. — [yu-wenhao.com, 2026-01-09](https://yu-wenhao.com/en/blog/free-azure-startup-credits/)
- A third-party blog (published 2026-04-30, updated 2026-09-11) describes the same two offers: no investor gets $1K plus $4K after verification, and a referral code gets about $100K growing to $150K. It says the earlier Basic/Enhanced/Growth/Scale tiers ($1K/$5K/$25K/$150K) have been superseded. — [klymentiev.com](https://klymentiev.com/blog/microsoft-for-startups)

### Inferences
- **Credit card:** Both official Microsoft Learn pages require card details to activate. The no-card founder is blocked at the first step, whichever version of the program is current.
- **Business email:** The application page requires a *personal consumer* email for the MSA, so the business email at askthemove.online cannot be the sign-in.
- **Individual founder:** An individual could at most get the first tranche ($1K, or $200 under the newer page). The verified tranche needs a registered legal entity, so even with a card the founder would not get the full $5K.
- **No 90-days-from-incorporation rule:** I found no rule tied to company age or date of incorporation. The 90-day limits that do exist are (a) the life of the $1K credit and (b) the window to complete business verification after redeeming.
- **Cost:** A B1s-class VM is cheap, so $1K for 90 days would easily cover one small always-on instance. Card details are the only blocker.

### Gaps
- **Conflict between the two Learn pages.** "startup-programs" gives $1K, then $5K; "application" (Oct 2026) gives $200 starter credits plus expanded and growth credits after approval. I could not tell which reflects the October 2026 offer. The "startup-programs" page shows no date, and curl to learn.microsoft.com was blocked here, so I could not read its metadata. Both agree a card is required.
- **India availability:** I could not confirm whether the Microsoft for Startups self-service offer is available in India. Neither page lists countries.
- **Founder reports:** I found no 2025-2026 Reddit or blog reports from Indian founders activating sponsorship without a card. The search returned only marketing and aggregator pages.
- **Spending limit:** I could not confirm whether an Azure Sponsorship subscription has a spending limit like the free account's. The spending-limit doc does not list Sponsorship. The startup page's "converts to pay-as-you-go" wording suggests no hard stop.

## 2. Azure free account in India: card rules, verification charge, auto-charging

### Takeaway
The Azure free account (USD 200 for 30 days, plus 12 months of some free services) **requires a non-prepaid credit or debit card**. Debit cards are accepted in India (Visa and Mastercard are documented). Microsoft promises it never charges unless you upgrade to pay-as-you-go. There is no option without a card.

### Cited Findings
- Sign-up requires a phone number, "a non-prepaid credit or debit card", and a Microsoft or GitHub account. Credit card only applies in Hong Kong and Brazil, not India. Sign-up places a temporary hold of one dollar or the local equivalent, released after verification. — [Azure free account page (en-in)](https://azure.microsoft.com/en-in/pricing/purchase-options/azure-account)
- The same page says: "We'll never charge you unless you decide to move to pay-as-you-go pricing." After 30 days or once the $200 is used, you choose whether to upgrade. If you don't, the account and services are disabled. — [Azure free account page (en-in)](https://azure.microsoft.com/en-in/pricing/purchase-options/azure-account)
- When free-account credit runs out, "Azure virtual machines are stopped and de-allocated" and storage data becomes read-only. A spending limit is on by default for free accounts. — [Microsoft Learn: Azure spending limit](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/spending-limit)
- Virtual and prepaid cards are not accepted. The sign-up flow includes an "Identity verification by card" step, and the verification hold is removed within 3-5 days. — [Microsoft Learn: Troubleshoot Azure sign-up](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/troubleshoot-azure-sign-up)
- India billing (from Microsoft's pay-bill doc):
  - Debit and credit cards on Visa and Mastercard are supported. RuPay is not mentioned.
  - RBI e-mandate rules (Oct 2021) limit recurring card charges, at ₹15,000 since June 2022. Microsoft stopped storing Indian card details in Sept 2022.
  - UPI and NetBanking are supported, but **only as one-time payments on an existing billing account**, not as sign-up verification.
  - Wire transfer is also available.
  - Source: [Microsoft Learn: Pay your bill](https://learn.microsoft.com/en-us/azure/cost-management-billing/understand/pay-bill)

### Inferences
- An Indian **debit card** from a normal bank account (Visa or Mastercard, enabled for international/online transactions) should satisfy sign-up. "No credit card" is therefore not automatically a blocker, but "no card at all" is.
- **Auto-charging:** The free account cannot charge you unless you upgrade. Sponsorship and startup subscriptions auto-convert to pay-as-you-go, which is the real risk. RBI rules mean Indian card charges usually need manual or e-mandate approval, which limits surprise charges in practice. Unpaid invoices would still accrue.

### Gaps
- **RuPay:** No Microsoft source confirms or denies RuPay acceptance.
- **₹2 verification:** I could not confirm the exact ₹2 amount. Microsoft says only "one dollar (or equivalent)" or "a small temporary hold".
- **UPI for sign-up:** No source confirms whether UPI-only sign-up is possible. Docs describe UPI only for paying bills.

## 3. Azure for Students: enrollment required, no card

### Takeaway
Confirmed: Azure for Students needs no card, but requires full-time enrollment at a university, verified with a school email. The founder is not a student and does not qualify.

### Cited Findings
- USD 100 credit for 12 months, plus free services. "Students must be enrolled full-time" at a university. Sign up with a school email, renew yearly, one account per person. **No credit card required.** At the end you choose pay-as-you-go, or the subscription is disabled. — [Azure for Students](https://azure.microsoft.com/en-in/free/students)

### Inferences
- Signing up with a school email when you are not enrolled would breach the offer terms. It is not a legitimate route.

### Gaps
- None material.

## 4. Can sponsorship credits run a B1s VM or App Service in Central India, and what happens when credits end?

### Takeaway
Startup credits cover "eligible Azure products". Standard VMs and App Service are mainstream first-party services, and nothing excludes them, but I did not find a page that names B1s or Central India. When credits run out or expire, the Sponsorship subscription **converts to pay-as-you-go and keeps billing the card on file**. The free account behaves differently: it stops and deallocates resources.

### Cited Findings
- Credits apply to "eligible Azure products". Exclusions are support plans, third-party branded products, Marketplace products and products sold separately. Crypto mining is prohibited. — [Microsoft Learn: Azure startup programs](https://learn.microsoft.com/en-us/azure/signups/startup-programs)
- On exhaustion or expiry, the subscription "automatically converts to pay-as-you-go". There is no upfront commitment and you can cancel at any time. — [Microsoft Learn: Azure startup programs](https://learn.microsoft.com/en-us/azure/signups/startup-programs); [Microsoft Learn: application](https://learn.microsoft.com/en-us/microsoft-for-startups/application)
- The spending limit (which deallocates resources when reached) is on by default for free accounts and multi-month credit subscriptions. It is "not available" for pay-as-you-go. — [Microsoft Learn: Azure spending limit](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/spending-limit)

### Inferences
- **Running the app:** A B1s VM (1 GiB RAM, a tight fit for Node plus Stockfish) or a B2-class VM, with a managed disk for SQLite, should be billable to sponsorship credits. App Service Linux B1 with Azure Files storage likely is too. Neither is confirmed by a document naming them.
- **When credits end:** Spending does *not* stop by itself. The subscription becomes pay-as-you-go and charges the card. You must delete resources or cancel before expiry to avoid charges.

### Gaps
- No source confirms B1s or Central India for sponsorship subscriptions, or regional or SKU quota limits on new sponsorship subscriptions.
- No source confirms whether a Sponsorship subscription has a spending-limit toggle.

## 5. Any other Microsoft no-card route?

### Takeaway
I found none for this founder's profile. Every Azure offer I checked needs a card except Azure for Students, which needs a student.

### Cited Findings
- Free account: card required — [Azure free account](https://azure.microsoft.com/en-in/pricing/purchase-options/azure-account)
- Startups: card required — [Microsoft Learn: Azure startup programs](https://learn.microsoft.com/en-us/azure/signups/startup-programs); [Microsoft Learn: application](https://learn.microsoft.com/en-us/microsoft-for-startups/application)
- Students: no card, but enrollment required — [Azure for Students](https://azure.microsoft.com/en-in/free/students)
- Pay-as-you-go accounts can pay invoices in India by UPI, NetBanking or wire. These are one-time payments on an already-created billing account. — [Microsoft Learn: Pay your bill](https://learn.microsoft.com/en-us/azure/cost-management-billing/understand/pay-bill)

### Inferences
- **Card-free paths:** The only ones left are things the founder doesn't fit: someone else's subscription (an employer, or a Visual Studio subscription through work, *not verified*) or an invoiced enterprise or CSP reseller arrangement, which usually needs a business entity (*not verified*).
- **Practical way in:** A Visa or Mastercard **debit card** from the founder's bank satisfies the "non-prepaid credit or debit card" rule. That unlocks the free account, and likely the Startups $1K/$200 starter tier if available in India. The founder would have to manage the auto-convert-to-pay-as-you-go risk on sponsorship.

### Gaps
- I did not look at Visual Studio subscriber credits, Imagine Cup or the Pegasus program (invite-only per The Register), or Microsoft CSP partners in India that bill by invoice. None looked plausible for an unincorporated individual, but none are verified.
