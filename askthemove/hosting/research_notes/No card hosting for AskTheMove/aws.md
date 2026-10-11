# AWS for a no-credit-card individual in India (as of Oct 2026)

Scope: a solo individual in India with a debit card plus UPI and net banking, and no credit card. He wants one always-on ~1 GB RAM Docker host (Node 24, native x86-64 Stockfish, SQLite on a disk) on AWS with no surprise bills. Research date: 2026-10-11.

## Q1. Sign-up in India (AISPL): what payment methods are accepted, the ₹2 verification, debit-card problems, and whether a card is needed at all

### Takeaway
An account with an Indian address is billed by AISPL (Amazon Internet Services Pvt Ltd) in INR. Since Nov 20, 2025, AWS India says customers can **sign up with UPI AutoPay** instead of a card. Debit cards (Visa/Mastercard/RuPay/Amex) are accepted for payments. Card sign-up uses a refundable **₹2** verification. Official pages disagree on whether a payment method is needed at all for the Free plan. The likely path for this founder is UPI AutoPay at sign-up, or a Visa/Mastercard debit card with international/online use and e-mandate enabled.

### Cited Findings
- AWS announcement, Nov 20, 2025: "AWS India customers can now use UPI to sign-up and automate monthly payments." Customers can sign up with UPI AutoPay as the default payment method. Before this, only cards were accepted at sign-up. Automatic payments are capped at ₹15,000 per bill. — [AWS What's New, 2025-11](https://aws.amazon.com/about-aws/whats-new/2025/11/india-upi-sign-up-automate-monthly-payments/)
- AWS India (AISPL) payment methods: Visa, Mastercard, American Express and **RuPay credit and debit cards**, **net banking** (each payment needs bank authorization, so it can't be used for auto-payments), **UPI Scan & Pay** (one-time QR, approve within 10 minutes) and **UPI AutoPay** (recurring). — [AWS Billing docs: Managing your payments in India](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/edit-aispl-payment-method.html)
- The same doc says saving a card triggers a bank verification charge of **INR 2, refunded in 5–7 business days**. Card auto-charge works through an RBI e-mandate. The card must support e-mandates (check with the bank) and be the default method. The e-mandate only covers bills up to **₹15,000**. The bank sends a pre-debit notice 24 h before each charge. Saved cards follow RBI rules and are usable only for AWS India invoices. — [AWS Billing docs](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/edit-aispl-payment-method.html)
- AWS Registration FAQ (page metadata says last updated 2026-10-08): "We ask for a credit or debit card to verify the authenticity of your account". Card validation is $1 USD, or **INR 2 for AISPL**, refunded within 3–5 days. It lists AISPL cards as **Visa, MasterCard, or American Express** and does not list RuPay. — [AWS Free Tier Registration FAQs](https://aws.amazon.com/free/registration-faqs/)
- **Conflict:** the AWS Free Tier FAQ says "A payment method isn't required to sign up for most new customers," though AWS may ask for one to verify identity. — [AWS Free Tier FAQs](https://aws.amazon.com/free/faqs/). This contradicts the Registration FAQ above. Neither page addresses AISPL specifically on this point.
- re:Post question "Acceptable Credit Cards during Sign Up – AWS India" (asked about a year ago). The accepted answer cites the payments doc saying RuPay is supported. The asker pointed out that this covers invoice payment, not sign-up, and the point was never resolved. — [re:Post](https://repost.aws/questions/QUm_toGdhxRV2KuT0-bJNvMA/acceptable-credit-cards-during-sign-up-aws-india)
- Practitioner blog (Apr 7, 2026, not official and written by someone promoting their own platform):
  - Indian address leads to AISPL billing.
  - Visa/Mastercard debit works if **international transactions are enabled**.
  - Prepaid, zero-balance and some fintech virtual cards fail.
  - The ₹2 auth often needs the bank to whitelist "Amazon Internet Services Private Limited".
  - PAN must be active and Aadhaar-linked for KYC. Aadhaar alone isn't accepted as ID.
  - The email must not already be tied to an Amazon.in account.
  - VoIP numbers fail phone verification.
  - The author claims a card is required even for the free tier. That article does not mention the Nov 2025 UPI sign-up option.
  - [Medium – ajbuilds](https://ajbuilds.medium.com/creating-an-aws-account-in-india-everything-that-can-go-wrong-and-how-to-fix-it-7dc35b6d3809) (also [dev.to version](https://dev.to/ajbuilds/why-creating-an-aws-account-is-harder-than-it-should-be-especially-in-india-4e2e))

### Inferences
- A credit card is not required for AISPL. UPI AutoPay sign-up (Nov 2025) and debit cards both appear to be supported paths. UPI is the most "no-credit-card-friendly" option.
- Whether the sign-up form actually shows a "no payment method" route for Indian Free-plan sign-ups is unclear. Plan for having to give either UPI AutoPay or a debit card.
- Debit-card risk areas:
  - The card must have online/international/e-commerce use enabled.
  - The bank must support RBI e-mandates for auto-pay (otherwise you pay manually by net banking or UPI QR).
  - 3-D Secure/OTP redirects can fail.
  - RuPay at sign-up is not confirmed. The Registration FAQ lists only Visa/MC/Amex.

### Gaps
- No 2025–2026 Reddit (r/aws, r/developersIndia) threads were retrieved. Search returned nothing directly relevant, so first-hand reports of UPI-at-sign-up success or failure are **unverified**.
- It is not confirmed whether AISPL Free-plan sign-ups can skip payment entirely. The official pages conflict.
- No source says whether a UPI AutoPay mandate on a Free-plan account could be debited. See Q2: AWS says Free plan accounts aren't charged.

## Q2. AWS Free plan (launched July 15, 2025): exact terms, whether it can ever charge, what happens at expiry, eligible services, and AISPL availability

### Takeaway
New accounts get $100 at sign-up plus up to $100 earned. The Free plan lasts 6 months or until credits run out, whichever is first, and it **does not charge**. At the end the account is closed/suspended, data is kept 90 days, then deleted unless you upgrade to Paid. Eligible EC2 types are t3.micro/small, t4g.micro/small, c7i-flex.large and m7i-flex.large. No source states AISPL is excluded; only China and GovCloud regions are excluded.

### Cited Findings
- Launch date was **July 15, 2025** (blog last modified Sep 1, 2025). Accounts get **$100 on sign-up** on either plan, plus up to **$100 more**, at $20 each for five activities:
  - launch and terminate an EC2 instance
  - an RDS walkthrough
  - a Lambda function URL app
  - a Bedrock playground prompt
  - setting an AWS Budget
  - "The free account plan ensures you won't incur any charges until you upgrade to a paid plan."
  - It expires after 6 months or when credits run out.
  - Alerts are sent 15, 7 and 2 days before the end.
  - There are 90 days to upgrade and reopen.
  - Features are available in all regions except GovCloud and China.
  - [AWS News Blog](https://aws.amazon.com/blogs/aws/aws-free-tier-update-new-customers-can-get-started-and-explore-aws-with-up-to-200-in-credits); [What's New 2025-07](https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/)
- From the Billing docs:
  - "The Free account plan ensures you won't incur any charges." It "ends after six months or when your credits are fully used – whichever occurs first."
  - "After your free account plan expires, your account closes automatically, and you lose access to your resources and data." AWS retains content for 90 days, then permanently deletes it. You can upgrade within 90 days.
  - Free plans exclude services "that could possibly deplete your credits" (e.g. Savings Plans, RIs, some Marketplace). They are "Not eligible for other promotional credits and discounts."
  - An account auto-upgrades to Paid if it joins AWS Organizations, Control Tower, the Partner Network, etc.
  - [AWS Billing: Choosing a Free Tier plan](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html)
- From the Free Tier FAQ:
  - The Free plan cannot be extended past 6 months.
  - When it expires, the account is suspended. Data is kept 90 days, then erased.
  - Free plan accounts are **ineligible for promotional credits incl. AWS Activate** until upgraded.
  - Paid plan gets monthly spend limits from $20 with 50/75/90% alerts.
  - You cannot downgrade from Paid to Free.
  - Only China regions are excluded.
  - Credit-expiry wording conflicts: one place says 6 months, the Paid-plan section says 12 months.
  - [AWS Free Tier FAQs](https://aws.amazon.com/free/faqs/)
- Terms (current terms dated **July 9, 2025**):
  - Free Tier credits "expire twelve months from the date you opened your account".
  - A Free Plan account expires after six months or when credits are used up. If not upgraded within 90 days of notice, it is permanently closed and its content deleted.
  - If AWS determines you aren't eligible for an offer, you're charged standard rates.
  - Free Plan accounts are "for evaluation" and "should not be used for processing sensitive data."
  - [AWS Free Tier Terms](https://aws.amazon.com/free/terms/)
- EC2 Free Tier instance types for accounts created on/after July 15, 2025: **t3.micro, t3.small, t4g.micro, t4g.small, c7i-flex.large, m7i-flex.large**. Free-Tier EBS volume types: standard, st1, sc1, gp2, gp3. — [EC2 User Guide: Free Tier usage](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html)
- Public IPv4 costs **$0.005/IP-hour** (in-use or idle) since Feb 1, 2024. The legacy EC2 Free Tier gave 750 public-IPv4 hours/month for 12 months. — [AWS News Blog: public IPv4 charge](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights)

### Inferences
- On a Free-plan account, credits pay for everything, including EC2 hours, EBS GB-months and public IPv4 hours. No card or UPI is charged. When credits run out or 6 months pass, the server stops and the account closes. **That is not a viable always-on production host beyond 6 months** unless he upgrades to Paid, and Paid means pay-as-you-go billing to the debit card/UPI.
- The "can never be charged" promise has caveats in the Terms: eligibility clawback, and auto-upgrade triggers such as joining Organizations.
- **t4g.* are ARM (Graviton)**. A native **x86-64** Stockfish binary won't run on them without an ARM build. Use t3.micro/t3.small, or rebuild for arm64.
- **t3.micro has only 1 GiB RAM**, which is tight for a ~1 GB app plus OS and Docker. t3.small (2 GiB) is the safer choice.

### Gaps
- No official page explicitly confirms that the Free plan is offered to **AISPL (India) accounts**. AWS pages exclude only China and GovCloud and never mention AISPL. **Unverified but likely available.**
- No source says whether public IPv4 and EBS are specifically "covered" beyond the general rule that credits apply to eligible usage. Whether the 750 h free-IPv4 allowance applies to post-July-2025 accounts is **unverified**.

## Q3. Does Mumbai (ap-south-1) t3.micro + 20 GB gp3 + Elastic IP fit within the credits for 6 months?

### Takeaway
Yes. It costs about **$13.65/month, roughly $82 for 6 months**, which is under the $100 sign-up credit. A t3.small instead (better for 1 GB RAM needs) costs about $21.8/month, roughly **$131 for 6 months**. That needs most of the extra activity credits (up to $200 total).

### Cited Findings
- ap-south-1 Linux on-demand rates:
  - t3.micro **$0.0112/h**
  - t3.small **$0.0224/h**
  - t4g.micro $0.0056/h
  - t4g.small $0.0112/h
  - EBS **gp3 $0.0912/GB-month**, gp2 $0.114
  - [aws-pricing.com ap-south-1](https://aws-pricing.com/ap-south-1.html) (third-party mirror, undated). t3.micro is corroborated at $0.0112/h by [DoiT](https://www.doit.com/compute/spot/ap-south-1/t3.micro).
- Public IPv4/Elastic IP costs $0.005/h. — [AWS blog](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights)

### Inferences
Calculations use 730 h/month:

| Config | Instance | 20 GB gp3 | IPv4 | Monthly | 6 months |
|---|---|---|---|---|---|
| t3.micro | $8.18 | $1.82 | $3.65 | **≈ $13.65** | **≈ $82** |
| t3.small | $16.35 | $1.82 | $3.65 | **≈ $21.82** | **≈ $131** |

- Data transfer out, snapshots and CloudWatch extras are excluded. Mumbai prices are USD; AISPL bills INR plus GST, and **18% GST is likely applied on top on Paid plans (unverified here)**.
- After 6 months, a Paid-plan t3.small costs about $22/month (≈ ₹1,900 + GST), which is under the ₹15,000 e-mandate cap.

### Gaps
- I could not pull the official AWS pricing JSON (blocked by the egress proxy). Prices come from third-party mirrors; confirm in the AWS Pricing Calculator.
- Data-transfer-out pricing and free allowance for ap-south-1 were not verified.

## Q4. Lightsail as an alternative

### Takeaway
Lightsail's **old 3-month free trials are discontinued** for new customers. Lightsail usage now just draws down the general Free Tier credits. The smallest IPv4 Linux bundle is $5/month (0.5 GB). The 1 GB bundle is $7/month (2 vCPU, 40 GB SSD). Mumbai has the same prices but half the data-transfer allowance.

### Cited Findings
- Lightsail's free trials on select instance and other plans "have been replaced by the AWS Free Tier and are no longer available to new Lightsail customers". Existing trials continue to their end. New customers can get "up to $200 USD in free AWS credits." — [Lightsail FAQ: Billing](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html)
- Linux bundles with IPv4:
  - $5: 0.5 GB / 2 vCPU / 20 GB / 1 TB
  - **$7: 1 GB / 2 vCPU / 40 GB / 2 TB**
  - $12: 2 GB / 60 GB / 3 TB
  - IPv6-only bundles: $3.50 (512 MB), $5 (1 GB), $10 (2 GB).
  - Asia Pacific (Mumbai) plans "include half the data transfer allowances."
  - [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)

### Inferences
- The $7 bundle (1 GB, IPv4 included) or $12 bundle (2 GB) gives predictable flat pricing. Lightsail is x86, so native Stockfish works. On a Free-plan account, 6 months of the $12 bundle is $72 in credits.
- After the plan ends, Lightsail still needs a Paid account.

### Gaps
- Whether Lightsail is among the services available on a **Free-plan** account (vs Paid only) was not explicitly confirmed.

## Q5. AWS Activate Founders

### Takeaway
Activate Founders (self-funded) offers $1,000 (up to $5,000) in credits. It **requires a Paid Tier Plan account**, so Free-plan accounts are ineligible. That means upgrading, which requires a billable payment method. I could not verify the incorporation, website and LinkedIn requirements from official pages.

### Cited Findings
- Founders (self-funded) gives "Start with $1,000 USD in Activate Credits", with select participants getting up to $5,000. General eligibility:
  - pre-Series B
  - founded in the last 10 years
  - **an AWS account on a Paid Tier Plan**
  - new to Activate credits
  - Apply via AWS Builder ID with product, funding and company profile details. Response in 5–10 business days.
  - [AWS Startups credits](https://aws.amazon.com/startups/credits)
- Free plan accounts are ineligible for promotional credits "including AWS Activate credits" until upgraded. — [AWS Free Tier FAQs](https://aws.amazon.com/free/faqs/)

### Inferences
- To use Activate, the founder must upgrade to Paid. A Paid account charges any usage beyond the credits to the saved debit card/UPI AutoPay, though the $20+ spend-limit/budget alerts help.
- Activate credits typically have exclusions and expiry. Check before relying on them.

### Gaps
- Whether Founders requires a **registered company/incorporation**, a **company website** or a **LinkedIn profile** was **not verified**. The startups.aws.com FAQ page returned only question headings without answers. Older knowledge (unverified for 2026) says a company website/profile and LinkedIn are requested, but incorporation isn't strictly required.
- India-specific Activate requirements were not found.
