# Hosting AskTheMove: prompts for Claude in Chrome

Paste one prompt at a time into the Claude extension in Chrome, and do them in order. Each prompt only covers clicking through dashboards. You type every password, OTP, card number and API key yourself.

**Where the beta goes:** Railway, Hobby plan, Singapore region, at `https://app.askthemove.online`.
**Cost:** $5 a month, which includes $5 of usage. Your free trial has already ended (11 Oct), so this starts on the paid Hobby plan. You also set a hard limit of $10 a month so it can never cost more.
**Cheaper routes:** see "Other hosts" at the end. Azure for Students is free for 12 months if you qualify.
**Before you start:** PR #29 must be merged into `main`. Railway deploys whatever is on `main`.

Rules shared by every prompt (already written into each one):
- Stop and hand over at any OTP, CAPTCHA, password, card or payment screen, and at any API key.
- Never delete anything, and never change settings the prompt doesn't name.

---

## Prompt 1: Hobby plan and spending limit

Sign in to Railway with GitHub first if you aren't already.

```
Help me upgrade my Railway workspace. Work only on railway.com. Do not delete anything or change settings I don't mention.

STOP and hand control back to me at any password, OTP, CAPTCHA, card or payment form. Wait for me to say "continue".

1. Open the workspace's billing or plans page and choose the Hobby plan ($5/month). STOP at the payment form. I'll enter my card myself. (Indian cards need international online payments switched on in the bank app first.)
2. After I say "continue", open the usage or billing settings and set a hard usage limit of $10 per month, plus an email alert at $5. If a setting like this isn't available, tell me what you see instead of guessing.
3. Tell me the plan shown and the limit that is now set.
```

## Prompt 2: Create the service from GitHub

```
Help me deploy my GitHub repository praxstack/ChessLab on Railway. Work only on railway.com and, if Railway sends me there, github.com. Do not delete anything or change settings I don't mention.

STOP and hand control back to me at any password, OTP, CAPTCHA, payment screen or GitHub permission screen. Tell me what's on screen and wait for me to say "continue".

1. On railway.com create a New Project and choose "Deploy from GitHub repo".
2. If Railway asks to install its GitHub app, STOP. I'll install it with access to the praxstack/ChessLab repository only (not all repositories).
3. Pick praxstack/ChessLab. Don't add any database or template.
4. Open the new service's Settings:
   - Source: branch "main". Leave the root directory empty.
   - Build: Dockerfile, which should be picked up from railway.toml. Don't change it.
   - Deploy / Regions: choose Southeast Asia (Singapore) and 1 replica.
   - Leave the health check path as /healthz.
5. Add a Volume to this service, mounted at /data. Use the smallest size offered.
6. Open the Variables tab and add these exactly (use the raw editor if there is one):
   APP_ORIGIN=https://app.askthemove.online
   TRUST_PROXY=1
   PORT=8770
   Then STOP and let me type BETA_INVITE_CODES myself. Do not make up invite codes.
7. Do NOT add ANTHROPIC_API_KEY or any other key.
8. Deploy (or apply the staged changes) and watch the build. When it finishes, tell me whether the deployment is "Active"/healthy. If it fails, copy the last 30 lines of the build or deploy log for me.
```

When it asks you for `BETA_INVITE_CODES`, type comma-separated codes of 8 or more characters, such as `chess-friends-7k2p,coach-trial-9m4x`. Don't leave a trailing comma, because the server refuses to start with one.

## Prompt 3: Point app.askthemove.online at it

```
Help me connect a custom domain to my Railway service. Work only on railway.com and dash.cloudflare.com. Do not delete or edit any existing DNS record, especially the MX, TXT, SPF, DKIM and DMARC email records and the records for askthemove.online and www. Only ADD the new records named below.

STOP and hand control back to me at any password, OTP, CAPTCHA or verification screen. Wait for me to say "continue".

1. On railway.com open my ChessLab project, then the service's Settings, then Networking. Under Custom Domain add: app.askthemove.online. If it asks for a port, use 8770.
2. Railway will show one or more DNS records to add (a CNAME for "app", maybe a TXT record too). Write them down exactly.
3. Go to https://dash.cloudflare.com, open the askthemove.online zone, then DNS > Records.
4. Add each record Railway showed, exactly as shown. For the CNAME set Proxy status to "DNS only" (grey cloud), NOT proxied.
5. Go back to Railway and wait until the domain shows as verified and the certificate is issued. Refresh every minute for up to 15 minutes.
6. Open https://app.askthemove.online/healthz in a new tab and tell me exactly what it shows. It should be {"status":"ok"}.
```

After this, tell Claude in the hosting thread that it's live. Claude runs the live check (health, HTTPS headers, invite gate, archives off).

## Prompt 4 (later): turn on "Explain why" for invited friends

Do this only after PR #28 is merged. It makes your Claude key pay only for accounts that signed up with a coach code, with a daily cap.

First, in https://console.anthropic.com create a workspace "AskTheMove beta" with a monthly spend limit (for example $20), and create an API key inside it. Keep the key in your password manager.

```
Help me add settings to my Railway service. Work only on railway.com. Do not delete anything or change settings I don't mention.

STOP whenever a secret value is needed. I will type it myself. Never read an API key aloud, copy it, or paste it anywhere.

1. Open my ChessLab project's service, then the Variables tab.
2. Add:
   ANTHROPIC_MODEL=claude-opus-5-5
   COACH_AI_EFFORT=low
   COACH_AI_MAX_PER_DAY=50
3. STOP and let me add ANTHROPIC_API_KEY and COACH_AI_INVITE_CODES myself.
4. After I say "continue", deploy the change and tell me when the deployment is Active.
```

---

## What Claude does without you

- PR #29: the image now works on Railway's root-owned volume. GitHub Actions checked it: health, server not running as root, Stockfish answering, sign-up refused without a code, and the account surviving a restart.
- After you say it's live, Claude runs the live check workflow against `https://app.askthemove.online`.
- Each merge to `main` that touches the app redeploys it automatically.

## Why Railway

| Host | Monthly cost | Notes |
| --- | --- | --- |
| **Railway Hobby, Singapore** | **$5 flat (includes $5 usage)** | Deploys from GitHub on every push, and every step can be done in the dashboard. Closest region to India. |
| Fly.io, Singapore | about $5 (256MB plus extra RAM plus a volume, by my calculation from their pricing page) | Similar cost, but each deploy needs a command-line token from GitHub Actions. |
| Render | $7 plus disk | A persistent disk needs a paid instance. |
| Oracle Cloud Always Free | $0 | Sign-ups from India often fail on card checks, and you'd run a server yourself. |
| Your Mac with a Cloudflare tunnel | $0 | The app goes down whenever the Mac sleeps. |

Claude can't deploy from its cloud session directly, because that session's network blocks Railway, Fly.io and Cloudflare. GitHub Actions can reach them, which is why the checks run there.

## Other hosts (11 Oct, after the Railway trial ended)

| Option | Cost | Runs the app as built? | Notes |
| --- | --- | --- | --- |
| **Railway Hobby** (above) | $5/month | Yes | Everything is ready. Prompts 1-3. |
| **Azure for Students** (GitHub Student Pack) | $0 for 12 months if you're an eligible student: $100 credit, no card, and a free small Linux VM (B1s) | Yes, on a VM | Central India region. Claude would add a GitHub Actions deploy to the VM; you'd create the VM and a deploy key. |
| Fly.io | about $5/month in Singapore | Yes | Pay as you go, card needed. Deploys need a token. |
| Heroku (Student Pack, $13/month credit) | $0 for 24 months | **No** | Its disk is wiped on every daily restart, so accounts would vanish. |
| Vercel / Render free | $0 | **No** | No lasting disk and no long-running server. |

The Student Pack no longer lists DigitalOcean.

---

# Route B: one free server (AWS Mumbai or Azure for Students)

Use this instead of Railway if you chose AWS or Azure in the credits thread. Claude has added the deploy to PR #29: a first-boot script (`deploy/vm/cloud-init.yaml`) and a GitHub workflow, "Deploy to server", that builds the app and installs it on your server. You never log in to the server yourself.

You'll need the text of `deploy/vm/cloud-init.yaml`. Open it at https://github.com/praxstack/ChessLab/blob/claude/host-beta-railway/deploy/vm/cloud-init.yaml (or on `main` once #29 merges) and keep the tab open.

## Prompt B1 (AWS): create the server in Mumbai

```
Help me create one small server on AWS. Work only on aws.amazon.com and console.aws.amazon.com. Do not delete anything, and do not change settings I don't mention.

STOP and hand control back to me at any password, MFA or OTP code, CAPTCHA, phone verification, card or payment form, and whenever a private key file is about to be downloaded. Wait for me to say "continue".

1. If I'm not signed in, STOP so I can sign in. If I have no account, help me sign up with a fresh email and choose the "Free" plan, NOT "Paid". At the payment step, STOP: I will choose UPI AutoPay or my debit card myself. Stop at every verification, PAN/KYC and phone step too.
2. Switch the region (top right) to "Asia Pacific (Mumbai) ap-south-1".
3. Open EC2 and choose Launch instance:
   - Name: askthemove-beta
   - Image: Ubuntu Server 24.04 LTS, 64-bit (x86). NOT Arm.
   - Instance type: t3.micro. If the page says it isn't free-plan eligible, tell me before continuing.
   - Key pair: Create new key pair, name askthemove-deploy, type ED25519, format .pem. STOP before the download so I can save the file somewhere safe myself.
   - Network settings: allow SSH, HTTPS and HTTP from the internet (0.0.0.0/0).
   - Storage: 20 GiB gp3.
   - Advanced details, User data: STOP and let me paste the cloud-init text myself.
4. Launch, then open Elastic IPs: Allocate an Elastic IP address and associate it with askthemove-beta.
5. Tell me the Elastic IP address. Do not show or copy the key file's contents.
```

## Prompt B1 (Azure, only if you're a student with Azure for Students)

```
Help me create one small Linux server on Azure. Work only on portal.azure.com and azure.microsoft.com. Do not delete anything, and do not change settings I don't mention.

STOP and hand control back to me at any password, MFA or OTP code, CAPTCHA, student verification, card or payment form, and whenever a private key file is about to be downloaded. Wait for me to say "continue".

1. If I'm not signed in, STOP so I can sign in. Use my "Azure for Students" subscription. If I don't have one, STOP and tell me.
2. Create a Virtual machine:
   - Resource group: new, askthemove
   - Name: askthemove-beta, Region: (Asia Pacific) Central India
   - Image: Ubuntu Server 24.04 LTS, x64 Gen2. NOT Arm64.
   - Size: Standard_B1s. If it isn't available in Central India, tell me before choosing another size or region.
   - Authentication: SSH public key, username azureuser, generate a new key pair named askthemove-deploy.
   - Inbound ports: SSH (22), HTTP (80), HTTPS (443).
   - Disks: Standard SSD.
   - Networking: public IP new, SKU Standard, assignment Static.
   - Advanced, Custom data: STOP and let me paste the cloud-init text myself.
3. Review + create. STOP before downloading the private key so I can save it myself.
4. Tell me the VM's public IP address. Do not show or copy the key file's contents.
```

## Prompt B2: DNS record

```
Help me add one DNS record on Cloudflare. Work only on dash.cloudflare.com. Do not delete or edit any existing record, especially the MX, TXT, SPF, DKIM and DMARC email records and the records for askthemove.online and www. Only ADD the record below.

STOP at any password, OTP or CAPTCHA and wait for me to say "continue".

1. Open the askthemove.online zone, then DNS > Records.
2. If a record named "app" already exists, STOP and tell me what it is.
3. Add: Type A, Name app, IPv4 address <SERVER IP>, Proxy status DNS only (grey cloud), TTL Auto.
4. Tell me the record as saved.
```

Replace `<SERVER IP>` with the IP from B1 before pasting.

## Prompt B3: GitHub settings for the deploy

```
Help me add deployment settings to my GitHub repository praxstack/ChessLab. Work only on github.com. Do not delete anything, and do not change settings I don't mention.

STOP at any password, 2FA code or sudo-mode confirmation, and STOP every time a secret value is needed. I will type or paste every secret myself. Never read a secret aloud, copy it, or put it anywhere else.

1. Open https://github.com/praxstack/ChessLab/settings/variables/actions.
2. On the Variables tab, add these repository variables:
   VM_HOST = <SERVER IP>
   VM_USER = ubuntu        (on Azure use azureuser)
   APP_ORIGIN = https://app.askthemove.online
3. On the Secrets tab, create repository secrets named VM_SSH_KEY and BETA_INVITE_CODES. For each one, open the form, type the name, then STOP and let me paste the value.
4. Do NOT add ANTHROPIC_API_KEY yet.
5. List the variable and secret names now saved, without values.
```

For `VM_SSH_KEY`, open the key file you saved in a text editor and paste all of it, including the BEGIN and END lines. For `BETA_INVITE_CODES`, use codes like `chess-friends-7k2p,coach-trial-9m4x` with no trailing comma.

After B3, tell Claude in the hosting thread. Claude runs "Deploy to server" and checks the live site. Later, "Explain why" (Prompt 4) becomes GitHub secrets `ANTHROPIC_API_KEY` and `COACH_AI_INVITE_CODES` plus a variable `COACH_AI_MAX_PER_DAY=50`, added after PR #28 merges.
