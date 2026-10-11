# Chrome prompts for Prax's to-dos

Written 10 Oct 2026. Each block below is a complete prompt for the Claude extension in Chrome. Open Chrome, sign in to the site yourself if it asks, open the extension, and paste one block.

Each prompt ends with a "Stop and hand over" rule. The extension stops at codes, CAPTCHAs, payments, secret keys and anything that can't be undone, and tells you what's left. No prompt contains a password, key or token, and none should ever be pasted in.

**Not in this file, because other threads own them:** credit and startup applications ("Startup credit programs hunt"), hosting the app ("Host the AskTheMove app"), and the open GitHub PRs #26 and #28 ("Startup repo, domain and Claude program").

**Already done, per the launch checklist** (26 of 43 ticked): domain bought and registrant verified, Zoho mailbox, DNS, hello@ alias, Zoho 2FA, Zoho app, site deployed and live on askthemove.online, the @AskTheMove handle. Prompt 3 double-checks the email ones in two minutes.

## Order

| # | Task | When | Unblocks |
|---|------|------|----------|
| 1 | Claude Console: auto-reload off, "AskTheMove dev" workspace with a spend limit | Now | The coach running on your $200 Max credit; the hosting thread needs a key |
| 2 | Count real waitlist sign-ups in Cloudflare | Now | The [N] in four credit applications |
| 3 | Check the email setup still works | Now | Nothing new; confirms Phase 2 |
| 4 | @AskTheMove and your own X profile | Now (the site loads) | Profile ready before launch day |
| 5 | Claim the GitHub organization "askthemove" | Now | Moving the repo under the company later |
| 6 | Two-step sign-in on Cloudflare, GitHub, X and the Console | Now | Protects the accounts that hold the company |
| 7 | X launch thread | **Later**: after the app is hosted and the demo video is re-recorded | Launch |
| 8 | LinkedIn headline and post | **Later**: same day as 7 | Launch |
| 9 | Share in chess communities | **Later**: the days after 7 | Sign-ups |

---

## 1. Claude Console: spend safety and the dev workspace

**Why first:** your Max 20x plan gives $200 of API credit a month in the Console. This makes sure it can never charge your card and gives the app its own capped workspace. The hosting thread and local testing both need the key from this workspace.

```
Task: set up spending safety in my Claude Console. I'm already signed in; if you see a sign-in page, stop and tell me.

1. Open https://platform.claude.com and make sure the organization selected at the top is "Prax's Individual Org" (the one linked to my Max plan). If you can't find it, stop and tell me which organizations you see.
2. Open Settings, then Billing. Read me: the credit balance, whether the $200 monthly Max credit shows, and whether auto-reload is on or off.
3. If auto-reload is ON, switch it OFF and save. Do not add a card, buy credits or change any payment method.
4. Open Settings, then Workspaces. If a workspace named "AskTheMove dev" already exists, open it. Otherwise create it with exactly that name.
5. In that workspace's limits, set a monthly spend limit of 50 US dollars and save. If there is also a rate-limit setting, leave it as it is.
6. Go to the API keys page and select the "AskTheMove dev" workspace, but DO NOT create a key. Stop there.

Done looks like: auto-reload is off, "AskTheMove dev" exists with a $50 monthly limit, and the API keys page is open on that workspace.

Stop and hand over: at any sign-in, verification code or CAPTCHA; before anything that costs money or touches payment details; and before creating an API key. A key is shown only once and must go straight into my password manager, never into chat. When you stop, tell me in one or two lines what you did and what's left for me.
```

**After it hands over:** click Create key yourself, name it "askthemove-local", save it in your password manager, and put it in the app's `.env` as `ANTHROPIC_API_KEY`. Never paste it in the project chat.

---

## 2. Count real waitlist sign-ups

**Why:** four credit applications have a blank "[N] sign-ups". This reads the count straight from the live database, with no terminal and no admin token. It only reads.

```
Task: read how many people have joined my AskTheMove waitlist. This is read-only.

1. Open https://dash.cloudflare.com (I'm signed in; if not, stop and tell me).
2. Go to Storage & Databases, then D1 SQL Database, and open the database named "askthemove-waitlist".
3. Open its Console tab (the SQL query box).
4. Run exactly this one query and nothing else:
   SELECT COUNT(*) AS total, SUM(CASE WHEN email LIKE 'prax%' OR email LIKE '%@askthemove.online' THEN 1 ELSE 0 END) AS mine, MIN(created_at) AS first_signup, MAX(created_at) AS last_signup FROM waitlist;
5. Tell me the four values. "Real sign-ups" = total minus mine.

Rules: run only that SELECT query. Never run INSERT, UPDATE, DELETE, DROP, or anything that changes data, and don't open the Settings or Delete options of the database. Don't copy or show me any other person's email address.

Done looks like: you've told me total, mine, real sign-ups, and the first and last sign-up dates.

Stop and hand over: at any sign-in, verification code or CAPTCHA, or if the database or the Console tab isn't where described. Tell me what you see instead.
```

**After:** post the real number in the "Startup credit programs hunt" thread so it fills in the applications.

---

## 3. Check the email setup still works

All of these are ticked on the checklist. This is a two-minute check, not new work.

```
Task: check my AskTheMove email and domain setup. Look only; change nothing unless a step says so.

1. Open https://mail.zoho.in (I'm signed in as prax@askthemove.online; if not, stop and tell me). Open the Admin Console, then Users, then my user, then Email Alias. Tell me which aliases exist. I expect hello@, beta@ and info@askthemove.online.
2. Open https://dash.cloudflare.com, then Domain Registration, then Manage Domains, then askthemove.online. Tell me: whether any "verify your email" or registrant warning shows, the expiry date, and whether auto-renew is on or off. Don't change auto-renew.
3. Open the Contacts tab for the domain and tell me whether the name, email and country look filled in. Don't edit them; just report anything blank or obviously wrong.

Done looks like: a short report of aliases, warnings, expiry, auto-renew and contacts.

Stop and hand over: at any sign-in, verification code or CAPTCHA, before any payment or renewal screen, and before editing anything.
```

**After:** if hello@ is missing, add it in the same Email Alias screen. Then send a mail from Gmail to hello@askthemove.online and check it lands in Zoho.

---

## 4. X profiles: @AskTheMove and your own

The site loads now, so the profiles can be finished before launch day. The launch thread itself is prompt 7, later.

```
Task: finish two X profiles. Change only the fields named here.

Part A: the brand account.
1. Open https://x.com and check the account switcher. Switch to @AskTheMove (if you can't, stop and tell me).
2. Open the profile, then Edit profile.
3. Set Name to: AskTheMove
4. Set Bio to exactly:
   A chess coach that shows you why your move was a mistake. Stockfish finds the facts, Claude explains them in plain words. Free beta waitlist below.
5. Set Website to: askthemove.online
6. Save. Leave the profile photo and header for me; tell me when you reach that point.

Part B: my own account.
7. Switch to my personal account (@0xPraxLannister).
8. Edit profile. Change ONLY the Bio and the Website. Do NOT touch the display name, the username or the profile photo: changing those makes X remove my blue check for a re-review.
9. Set Bio to exactly:
   Building @AskTheMove ♟️: a chess coach that shows you why a move was a mistake. Built systems at Amazon scale. Logging agentic AI, system design, LLM inference.
   If X says it is over 160 characters, use this instead:
   Building @AskTheMove ♟️, a chess coach that explains why your move was a mistake. Stockfish finds it, Claude explains it. Built systems at Amazon scale.
10. Set Website to: askthemove.online
11. Location must stay "Shahjahanpur, India". Save.

Done looks like: both profiles show askthemove.online, @AskTheMove has its name and bio, and my bio mentions @AskTheMove.

Stop and hand over: at any sign-in, verification code or CAPTCHA; at any file-upload dialog (photo or header); and if X warns that a change will affect verification. Don't post, follow, like or send messages.
```

**After:** upload the logo as @AskTheMove's photo yourself (`site/public/icon-512.png` in the ChessLab repo).

---

## 5. Claim the GitHub organization "askthemove"

Free. It reserves the name; moving the ChessLab repo into it is a separate later decision, not part of this.

```
Task: create a free GitHub organization named "askthemove", if the name is available.

1. Open https://github.com/askthemove. If a page exists, stop and tell me who owns it (it may already be mine).
2. If it's a 404, open https://github.com/account/organizations/new?plan=free
3. Choose the Free plan. Organization name: askthemove. Contact email: prax@askthemove.online. "This organization belongs to": My personal account.
4. Fill in what's needed, then stop BEFORE the final create button and show me the summary.

Done looks like: the form is filled with the Free plan and I'm looking at the final create button.

Stop and hand over: at any sign-in, verification code, CAPTCHA or puzzle; at any paid plan, trial or payment screen (choose Free only); and before the final create click. Don't transfer or move any repository and don't invite anyone.
```

---

## 6. Two-step sign-in on the company's accounts

Zoho already has it. These four hold the domain, the code, the brand account and the API money. The extension can only open the right page; you scan the QR code and type the codes.

```
Task: for each account below, open its two-step sign-in (2FA) settings page and tell me whether 2FA is already on. Do not turn anything on or off yourself.

1. Cloudflare: https://dash.cloudflare.com/profile/authentication
2. GitHub: https://github.com/settings/security
3. X (@AskTheMove, then my own account): https://x.com/settings/account/login_verification
4. Claude Console: https://platform.claude.com, then my account or profile settings, then security.

For each one, report "on" or "off". For any that are off, leave that page open in its own tab so I can set it up.

Done looks like: a list of the four accounts with on or off, and one open tab per account that's off.

Stop and hand over: at any sign-in, password prompt, verification code, QR code, security key prompt or CAPTCHA. Never read out, copy or screenshot recovery codes or QR codes.
```

**After:** set up each one with an authenticator app (or a passkey), and save the recovery codes in your password manager.

---

## Later: launch day

Use these only when all three are true:
- the app is hosted (the "Host the AskTheMove app" thread says so),
- the demo video has been re-recorded with the fixed board colours (the current one shows mirrored boards),
- you're free for the first hour after posting to reply to people.

Copy the new demo video to your Mac first. X and LinkedIn need you to pick the file yourself in the upload dialog.

### 7. X launch thread (later)

```
Task: post a 5-post thread from @AskTheMove, then repost it from my own account.

1. Open https://x.com and switch to @AskTheMove (stop if you can't).
2. Start a new post. Paste post 1 exactly:

I'm building AskTheMove ♟️

A chess coach that shows you why your move was a mistake, in plain words and arrows on the board. Not just "Nf5 was best, +2.3".

Stockfish finds the facts. Claude explains them.

Here's a one-minute look 👇

3. Click the media button and STOP: I'll attach the demo video myself. Wait until I say it's attached.
4. Add posts to the thread with the "+" button, pasting each exactly:

Post 2:
Engines are brilliant and silent. They name the best move but never say what you missed, so the same mistake comes back next game.

AskTheMove is for adult improvers, roughly 800 to 1600, who want the why.

Post 3:
How it stays honest: the coach only sees verified engine evidence (lines, mate distance, material, threats).

Before you see an explanation, the server checks every move and "mate in N" it cites against that evidence. If anything doesn't match, you get the plain engine summary.

Post 4:
Working today: import your games, full Stockfish review, variations and study notes, and 43 original bots on a 22-level strength ladder.

The Claude coach is being tested now. The waitlist decides who gets in first.

Post 5:
The beta is free. Join the waitlist: askthemove.online

Questions or ideas: hello@askthemove.online, or just reply here. I read everything.

5. STOP before "Post all" and show me the full thread. Posting is public and can't be quietly undone; I'll click it.
6. After I've posted: open post 1 on @AskTheMove's profile, use its "..." menu and choose "Pin to your profile".
7. Switch to my own account (@0xPraxLannister), find post 1 and repost it. Don't add a quote unless I ask.

Done looks like: the thread is live, post 1 is pinned on @AskTheMove, and it's reposted from my account.

Stop and hand over: at any sign-in, verification code or CAPTCHA, at every file-upload dialog, and before every Post or Post all click.
```

Before posting, check post 4 against the app on the day: if the coach is live for testers by then, "is being tested now" can become "is in private testing".

### 8. LinkedIn headline and post (later, same day)

```
Task: update my LinkedIn headline and draft a launch post with the demo video.

1. Open https://www.linkedin.com/in/me (I'm signed in; stop if not).
2. Click the pencil to edit my intro. Add this to the FRONT of my current headline, followed by " | ":
   Founder, AskTheMove (a chess coach built on Stockfish and Claude)
   Keep the rest of the headline. If it goes over the limit, stop and show me. Save.
3. Go to the feed and click "Start a post". Click the video button and STOP: I'll pick the video file myself. Wait until I say it's attached.
4. Paste this text exactly:

I'm building AskTheMove ♟️

Chess engines are brilliant and silent. They tell you "Nf5 was best, +2.3", but not what you missed, so the same mistake comes back next game.

AskTheMove is a chess coach for adult improvers, roughly 800 to 1600, that shows you why a move was a mistake, in plain words and arrows on the board.

How it works:
• Stockfish and a chess rules library produce verified evidence: engine lines, mate distance, material and threats.
• Claude turns that evidence into a few plain sentences.
• Before you see an explanation, the server checks every move and every "mate in N" it cites against that evidence. If anything doesn't match, you get the plain engine summary instead.

Working today: game import, full Stockfish review, variations and study notes, and 43 original bots on a 22-level strength ladder. The Claude coach is being tested now.

The beta is free. Join the waitlist at askthemove.online, and if you know someone learning chess, I'd love it if you passed this on.

Questions or ideas: hello@askthemove.online

#chess #buildinpublic #AI

5. STOP before Post and show me the draft. I'll click Post.

Done looks like: the headline is saved and the post draft is ready with the video attached and the text pasted.

Stop and hand over: at any sign-in, verification code or CAPTCHA, at the file-upload dialog, at any Premium or payment offer (decline), and before Post.
```

### 9. Share in chess communities (later, the days after)

```
Task: help me share AskTheMove in chess communities without breaking their rules. Read rules first; draft only.

1. Open https://www.reddit.com/r/chessbeginners/ and read its rules and any self-promotion policy (sidebar and wiki). Then open https://lichess.org/forum and find the forum and rules where sharing a tool you built is allowed.
2. For each place, tell me in one or two lines: is a post about my own tool allowed, and under what conditions (flair, day of week, ratio of posts, must be free, etc.)?
3. For each place that allows it, open a new-post form and draft a short, honest post that follows its rules: I built a free chess coach that explains why a move was a mistake, Stockfish plus Claude, waitlist at askthemove.online. Mention I'm the builder.
4. STOP before submitting anything.

Done looks like: a rules summary per place and an unsent draft open in each place that allows it.

Stop and hand over: at any sign-in, verification code or CAPTCHA, and before every Submit or Post. Don't post, comment, vote, join, or message anyone.
```

---

## Not browser tasks (for completeness)

- **Read the privacy notice and terms** (askthemove.online/privacy and /terms, still marked "not yet reviewed"). Only you know what's true about how you handle data; tell a thread what doesn't match and Claude fixes it.
- **Praxmodoro:** open the app once on your Mac after checking out PR #62, and buy praxmodoro.com only when Praxmodoro's launch comes up. Both wait by your choice.
