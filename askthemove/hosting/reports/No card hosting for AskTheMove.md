# Host AskTheMove free without a credit card

**Short answer.** Yes, you can host the private beta for ₹0 without a credit card. The best first home is an **AWS Free plan account in Mumbai, opened with UPI AutoPay or a Visa/Mastercard debit card**. It runs your existing image and "Deploy to server" workflow unchanged, and AWS says in writing that the plan cannot charge you. The catch is that it ends after six months, so your Mac with Cloudflare Tunnel is the free home after that. Google Cloud also works with a debit card, but only for a 90-day trial. Microsoft's startup credits ask for card details, so they are not a no-card route.

## Every route at a glance

"Runs as built" means your current Docker image (Node 24, x86-64 Stockfish with the AVX2 build, SQLite on `/data`) runs without code changes. Payment labels: **No card at all**; **Debit card or UPI** (works with what you have); **Credit card needed** (or card details that Microsoft's wording calls a credit card); **Unclear** where the official pages do not say.

| Route | Payment needed | Monthly cost to you | How long it stays free | Runs the app as built? | Main catch |
|---|---|---|---|---|---|
| **AWS Free plan, EC2 t3.small or t3.micro (Mumbai)** | Debit card or UPI (UPI AutoPay at sign-up since Nov 2025) | ₹0 (paid from $100–$200 credits) | Up to 6 months, or until credits run out | **Yes.** Fits `deploy-vm.yml` | Account closes at month 6; data deleted 90 days later unless you upgrade |
| **Your Mac + Cloudflare Tunnel** | No card at all | ₹0 (electricity, home internet) | As long as you like | Intel Mac: yes. Apple Silicon: needs an arm64 Stockfish or emulation | Mac must stay on and awake; power and internet cuts take the site down |
| **Render Free + Litestream backup** | No card at all | ₹0 | Ongoing | **Needs changes** (backup/restore of SQLite to Tigris or B2) | Sleeps after 15 min idle, ~1 min wake-up, 512 MB RAM, "not for production" |
| **Northflank Sandbox** | Unclear | ₹0 | Ongoing | Probably needs changes (no free disk stated) | Card rule and RAM not published; worth a 10-minute try |
| **Google Cloud free trial ($300)** | Debit card or UPI (Visa/MC debit; UPI officially "for qualified organizations") | ₹0 | 90 days | Yes (a VM) | India ID check within 30 days; some individuals hit a business-documents screen |
| **Google Cloud Always Free e2-micro** | Debit card or UPI, on a **Paid** account | ₹0 if you stay inside limits | Ongoing | Tight: 1 GB RAM total, US regions only | Anything over the limits is billed automatically |
| **AWS Lightsail ($7 1 GB / $12 2 GB)** | Debit card or UPI | ₹0 while Free plan credits last | Up to 6 months | Yes | Not confirmed that Free-plan accounts can use it |
| **Azure free account ($200)** | Debit card or UPI (non-prepaid Visa/MC debit; UPI only for paying bills later) | ₹0 | 30 days | Yes (VM, workflow ready) | Very short |
| **Microsoft for Startups** | Credit card needed (Microsoft's wording) | ₹0 while credits last | 90–180 days | Yes | Auto-converts to pay-as-you-go and keeps billing; $4K tier needs a registered company |
| **Azure for Students** | No card at all | ₹0 | 12 months | Yes | Only for full-time enrolled students, so not for you |
| **Railway (repo has `railway.toml`)** | Unclear | ₹0 for the trial, then $1/month credit | 30-day $5 trial | Yes | $1/month does not keep 1 GB running all month |
| **Oracle Always Free** | Credit card needed in practice (rejects PIN-debit, virtual, prepaid) | ₹0 | Ongoing | Free large VMs are ARM, so needs arm64 Stockfish | Card check often fails for Indian debit cards (unverified) |
| **Koyeb free** | Credit card needed ($29 hold) | ₹0 | Ongoing | Needs changes | Sleeps after 1 h; no volumes; Frankfurt/Washington only |
| **Hugging Face Docker Spaces** | Paid since July 2026 | — | — | — | No longer free for Docker |
| **Back4App Containers** | No card at all | ₹0 | Ongoing | No | 256 MB RAM is too small |

Sources for the table are cited in the sections below.

## What to do, in order

**1. Start on the AWS Free plan in Mumbai (months 0–6).** This is the only route that is free, runs your tested image unchanged, plugs into your ready "Deploy to server" workflow, and is backed by a written promise of no charges. AWS India customers "can now use UPI to sign-up and automate monthly payments" ([AWS What's New, Nov 2025](https://aws.amazon.com/about-aws/whats-new/2025/11/india-upi-sign-up-automate-monthly-payments/)), and Visa, Mastercard, Amex and RuPay debit cards are accepted for payment ([AWS Billing docs](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/edit-aispl-payment-method.html)). New accounts get **$100 at sign-up plus up to $100 more**, at $20 for each of five starter tasks: launching and ending an EC2 instance, an RDS walkthrough, a Lambda app, a Bedrock prompt, and setting an AWS Budget ([AWS News Blog](https://aws.amazon.com/blogs/aws/aws-free-tier-update-new-customers-can-get-started-and-explore-aws-with-up-to-200-in-credits)).

Pick an **x86 instance**. The t4g types are ARM (Graviton), and your image pulls the x86-64 Stockfish build. The Free plan offers t3.micro (1 GiB) and t3.small (2 GiB) ([EC2 User Guide](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html)). A t3.micro with a 20 GB gp3 disk and a public IP costs about **$13.65/month, about $82 for six months**. A t3.small costs about **$21.82/month, about $131 for six months** (from Mumbai prices at [aws-pricing.com](https://aws-pricing.com/ap-south-1.html), plus the $0.005/hour public IPv4 charge in [AWS's IPv4 announcement](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights)). That timing matters because **the plan ends when credits run out**, even before month 6. Start on t3.micro with a swap file and a small Stockfish hash. Move to t3.small only after you have earned the extra activity credits.

**2. Keep your Mac with Cloudflare Tunnel as the fallback and as your month-6 home.** It needs no card at all. A tunnel is a small program on the Mac that connects outward to Cloudflare, so the site is reachable at app.askthemove.online without opening ports on your router. Cloudflare allows 1,000 tunnels per account with no bandwidth limit listed ([Cloudflare account limits](https://developers.cloudflare.com/cloudflare-one/account-limits/)). You already have the account and the domain.

The one technical point is the chip. Your `Dockerfile` targets `linux/amd64` and downloads `stockfish-ubuntu-x86-64-avx2`. On an **Apple Silicon Mac** (M1–M4), Docker Desktop can run that image under emulation, but it will be slower. Whether AVX2 instructions work under emulation is unverified, so the `--build-arg STOCKFISH_BUILD=sse41-popcnt` option already in your Dockerfile is the safer choice there. A native arm64 build (an arm64 Stockfish binary in an arm64 image) is the better long-term fix. An Intel Mac runs the image as built. Turn off sleep, and accept that a home power or internet cut takes the beta down.

**3. If the Mac is not practical, use Render Free plus Litestream.** Render needs no card. Its free services "spin down" after 15 minutes without traffic and take about a minute to wake. They cannot attach a disk, and Render says "Do not use them for production applications" ([Render Free docs](https://render.com/docs/free)). RAM is 512 MB ([Render pricing](https://render.com/pricing)). Litestream is a small tool that streams SQLite changes to object storage and restores them on start-up. Tigris ("No card to start", 5 GB) is a good no-card place to keep the copy ([Tigris pricing](https://www.tigrisdata.com/pricing/)). This needs code and image changes, so treat it as plan C. Northflank's Sandbox advertises "Always-on-compute – no sleeping" and free custom domains ([Northflank pricing](https://northflank.com/pricing)), but it does not state the card rule or RAM. Simply try signing up.

**4. Use Google's 90-day trial or Azure's 30-day account only as short bridges**, for example if AWS sign-up fails. Skip Microsoft for Startups, Google for Startups, AWS Activate, Koyeb, Oracle and Hugging Face for now. Each needs a card, a company or a paid account, or no longer offers free Docker hosting.

## AWS: the "never charged" promise, word for word

AWS states the promise plainly in three places. The launch blog says: **"The free account plan ensures you won't incur any charges until you upgrade to a paid plan."** ([AWS News Blog](https://aws.amazon.com/blogs/aws/aws-free-tier-update-new-customers-can-get-started-and-explore-aws-with-up-to-200-in-credits)). The Billing guide says: **"The Free account plan ensures you won't incur any charges."** It adds that the plan "ends after six months or when your credits are fully used – whichever occurs first" and that "After your free account plan expires, your account closes automatically, and you lose access to your resources and data." ([AWS Billing: Choosing a Free Tier plan](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html)). So when the money runs out, your server stops. It does not start billing you.

The promise is strong but **not unconditional**. These are the caveats in AWS's own documents:

| Caveat | What it says | What it means for you |
|---|---|---|
| Upgrading is the only normal way to be charged | The Free plan "cannot be extended" past 6 months, and you cannot move back from Paid to Free ([Free Tier FAQs](https://aws.amazon.com/free/faqs/)) | Never click "Upgrade" until you have decided to pay |
| Some actions upgrade you automatically | Joining AWS Organizations, Control Tower or the Partner Network moves the account to Paid ([Billing guide](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html)) | Avoid those services on this account |
| Some services are blocked | The plan excludes services "that could possibly deplete your credits", such as Savings Plans, Reserved Instances and some Marketplace items ([Billing guide](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html)) | This protects you; plain EC2 is allowed |
| Eligibility clause | The Terms say that if AWS decides you are not eligible for an offer, you are charged standard rates ([AWS Free Tier Terms](https://aws.amazon.com/free/terms/)) | Use one honest account with your own PAN and card; never open a second account to restart the free period |
| "Evaluation" wording | Free Plan accounts are "for evaluation" and "should not be used for processing sensitive data" ([Terms](https://aws.amazon.com/free/terms/)) | A small invite-only beta is a grey area; keep personal data minimal |
| Dates conflict | The Terms say credits "expire twelve months from the date you opened your account," while the plan itself lasts six months ([Terms](https://aws.amazon.com/free/terms/); [FAQs](https://aws.amazon.com/free/faqs/)) | Plan around six months |
| India is not named | Pages exclude only China and GovCloud regions and never mention AISPL, AWS's Indian billing company ([AWS News Blog](https://aws.amazon.com/blogs/aws/aws-free-tier-update-new-customers-can-get-started-and-explore-aws-with-up-to-200-in-credits)) | Confirm "Free plan" is shown at sign-up before you continue |

There is also a backstop in Indian banking rules. A card or UPI mandate only auto-pays bills up to ₹15,000, and your bank sends a pre-debit notice 24 hours before each charge ([AWS Billing docs](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/edit-aispl-payment-method.html)).

**Verified:** the written no-charge promise, automatic closure, the 90-day data window, and UPI AutoPay sign-up for India. **Unverified:** that every Indian sign-up is actually offered the Free plan, and whether the form lets you skip payment entirely. One FAQ says "A payment method isn't required to sign up for most new customers" ([Free Tier FAQs](https://aws.amazon.com/free/faqs/)), while the registration FAQ says "We ask for a credit or debit card to verify the authenticity of your account" and lists only Visa, Mastercard and Amex for India ([Registration FAQs](https://aws.amazon.com/free/registration-faqs/)). In short, it is as certain as a written company promise can be, and the realistic ways to be charged are all things you would do yourself.

## Google Cloud: yes without a credit card, but not without any payment method

Google does not need a *credit* card, but it does need *some* payment method. The trial requires "a credit card or other payment method that is valid for the period of the Free Trial" ([Google Cloud free features](https://docs.cloud.google.com/free/docs/free-cloud-features)). Two methods could work for you:

1. **A Visa or Mastercard debit card.** Secondary sources report that these are accepted in India, while RuPay, prepaid cards and some cards that need two-factor authentication are not ([Unico Connect, Sep 2026](https://unicoconnect.com/blogs/google-cloud-free-tier-credits-india)).
2. **UPI.** Google officially supports UPI "for qualified organizations in India." It needs a prepayment, "typically 500 to 1000 INR," before first use ([Google UPI docs](https://docs.cloud.google.com/billing/docs/resources/upi-payment-india)). Whether an individual counts as a "qualified organization", and whether UPI works for starting the trial, is **unverified**.

The trial itself is safe. Google says it gives "$300 Welcome credit valid for 90 days" and that "you won't be charged unless you manually upgrade to a paid account" ([Free Trial FAQs](https://cloud.google.com/signup-faqs?hl=en)).

The India-specific hurdle is identity. You "must complete the identity verification process within 30 days," or the account may be suspended, using proof of identity and address ([Create a billing account](https://docs.cloud.google.com/billing/docs/how-to/create-billing-account)). One individual reported in Nov 2024 that the screen asked only for company documents such as an incorporation certificate or GST, with no fix posted ([Google Developer forums](https://discuss.google.dev/t/being-an-indian-individual-how-can-i-setup-and-verify-billing-gcp-account/173113)).

After day 90, staying free means using the **Always Free e2-micro**: one VM, US regions only, 30 GB standard disk and 1 GB of outbound data a month ([Google Cloud free features](https://docs.cloud.google.com/free/docs/free-cloud-features)). This requires a Paid account, so anything beyond those limits is charged automatically to your card. The 1 GB of RAM is your app's whole budget, and the servers are on the far side of the world from your users. Cloud Run is not a fit either. Its storage mount "does not provide concurrency control" for SQLite ([Cloud Run volume docs](https://docs.cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts)), and by my calculation from [Cloud Run pricing](https://cloud.google.com/run/pricing) an always-on 1 GiB instance costs roughly $47 a month.

**Verdict:** Google is usable for 90 free days with a debit card, if the ID check accepts you as an individual. It is a weaker long-term free home than AWS's six months.

## Microsoft: startup credits ask for card details and then keep billing

Microsoft for Startups cannot be activated without card details, according to Microsoft's own pages. The program page says **"Your credit card is required to:"** verify your identity, pay for services the credits do not cover, and "ensure a seamless transition to pay-as-you-go" ([Microsoft Learn: Azure startup programs](https://learn.microsoft.com/en-us/azure/signups/startup-programs)). The newer application page (updated Oct 2026) also lists cardholder name, card number, expiry, CVV and billing address as required to finish setup. It also requires LinkedIn verification, a personal (not company) email, and a "registered startup name" that matches your legal documents ([Microsoft Learn: application](https://learn.microsoft.com/en-us/microsoft-for-startups/application)).

The two pages disagree on the amount: $1,000 then up to $5,000 on one, and $200 starter credits on the other. The higher tier needs a **registered legal business entity** ([startup programs](https://learn.microsoft.com/en-us/azure/signups/startup-programs)).

The bigger problem for a $0 rule is what happens at the end. The credits sit in a Sponsorship subscription that "automatically converts to pay-as-you-go" when credits are used up or expire. Azure's protective spending limit is "not available" on pay-as-you-go ([Azure spending limit](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/spending-limit)). That is the reverse of AWS's design: Microsoft keeps billing unless you delete things in time.

Whether an Indian Visa or Mastercard debit card passes the startup card check is **unverified**, and so is the offer's availability in India. The plain **Azure free account** does accept "a non-prepaid credit or debit card" and promises "We'll never charge you unless you decide to move to pay-as-you-go pricing" ([Azure free account](https://azure.microsoft.com/en-in/pricing/purchase-options/azure-account)). It only lasts 30 days. UPI and net banking work only for paying bills on an existing account, not for sign-up ([Pay your bill](https://learn.microsoft.com/en-us/azure/cost-management-billing/understand/pay-bill)). The only truly card-free Azure offer is Azure for Students, which requires full-time enrollment ([Azure for Students](https://azure.microsoft.com/en-in/free/students)). Signing up for it as a non-student would break its terms.

## What to have ready, and what happens at month 6

Most failed Indian sign-ups come down to small banking settings, so prepare these before you start. The PAN, phone, email and bank-whitelisting tips come from one practitioner's account, not official AWS pages ([ajbuilds on Medium, Apr 2026](https://ajbuilds.medium.com/creating-an-aws-account-in-india-everything-that-can-go-wrong-and-how-to-fix-it-7dc35b6d3809)).

| Have ready | Why |
|---|---|
| **PAN (active, linked to Aadhaar) and Aadhaar** | KYC (identity check) for AWS India; Aadhaar alone is reportedly not accepted. Google asks for ID and address proof within 30 days |
| **UPI app that supports AutoPay** (most bank and payment apps do) | AWS India sign-up with a UPI mandate, capped at ₹15,000 per bill |
| **Visa or Mastercard debit card with online and international use turned on, and e-mandate support confirmed with your bank** | Backup for AWS; required for Google and Azure. Keep a little balance for the refundable ₹2 AWS check |
| **Ask your bank to allow "Amazon Internet Services Private Limited"** | The ₹2 check is often blocked otherwise |
| **A fresh email not linked to an Amazon.in shopping account, and a real mobile number (not VoIP)** | Both are common sign-up failures |
| **GitHub repository settings** | Set `VM_HOST`, `VM_USER=ubuntu` and `APP_ORIGIN=https://app.askthemove.online`, and the `VM_SSH_KEY` and `BETA_INVITE_CODES` secrets, so the workflow deploys |

Do these in order on day one:

1. Sign up for AWS. Confirm the screen says **Free plan**, choose Mumbai (ap-south-1), and earn the $20 Budget credit by setting a budget alert.
2. Launch a t3 instance with the repo's cloud-init file, then point the Cloudflare DNS record for `app` at its IP.
3. Run the workflow.
4. Set up a nightly copy of the SQLite file to your Mac (or to Tigris). Having the data outside AWS is what makes month 6 calm.

**Month 6.** AWS emails you **15, 7 and 2 days** before the plan ends ([AWS News Blog](https://aws.amazon.com/blogs/aws/aws-free-tier-update-new-customers-can-get-started-and-explore-aws-with-up-to-200-in-credits)). The account then closes, the server stops, and AWS keeps the data for 90 days before deleting it ([Billing guide](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html)). You have three honest choices:

1. **Move to the Mac**: no card, ₹0. Restore the latest SQLite copy and switch the tunnel on.
2. **Upgrade to Paid** and pay about $22 a month for a t3.small (a little under ₹2,000 before tax; 18% GST is likely but unverified) by UPI AutoPay. The Paid plan offers monthly spend limits from $20 with alerts at 50, 75 and 90% ([Free Tier FAQs](https://aws.amazon.com/free/faqs/)). Lightsail's 1 GB bundle at $7 a month is cheaper and has a flat price ([Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)).
3. **Upgrade and apply for AWS Activate Founders**, which starts at $1,000 in credits. It requires "an AWS account on a Paid Tier Plan" ([AWS Startups credits](https://aws.amazon.com/startups/credits)). Whether it needs a registered company is unverified.

Only options 2 and 3 break the $0 rule, and only if you choose them.

## Conclusion

The question changed shape during the research. The hard part is not finding a provider that accepts Indian debit cards or UPI; AWS, Google and Azure all do. The hard part is finding one whose *default at the end of the free period is to stop rather than bill*. AWS's Free plan and Google's trial both stop by design. Microsoft's startup credits are built to roll into billing. That is why AWS is the best fit for a strict ₹0 rule, even though Microsoft's headline credit is larger.

The real long-term free host is the one you already own. Six months on AWS buys a professional-looking, always-on beta with no new engineering. The Mac and Cloudflare Tunnel cost nothing indefinitely once Stockfish runs natively on it. The most useful engineering task this month is therefore not cloud setup: it is a nightly SQLite backup plus an arm64 Stockfish build. With those two in place, moving between AWS, the Mac or a paid plan takes an afternoon, whatever you decide at month 6.
