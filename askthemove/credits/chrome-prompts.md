# Claude in Chrome prompts for AskTheMove applications

Fill the profile values once (replace each `{{...}}`), or use the Apply pack page, which fills them into every prompt for you. Paste ONE block into Claude in Chrome: either the master prompt (does everything in order) or a single program prompt. Each block is self-contained.

Emergent Ventures is left out on purpose: they reject AI-written applications.

## Profile values to fill

- `{{FIRST_NAME}}`: First name
- `{{LAST_NAME}}`: Last name
- `{{BIRTHDAY}}`: Birthday (MM/DD/YYYY)
- `{{PHONE}}`: Phone with +91
- `{{CITY}}`: City, state
- `{{WORK}}`: Current school or work (where)
- `{{BACKGROUND}}`: 1–2 lines on your engineering background
- `{{PAST_WORK}}`: What you've built or shipped before, with links
- `{{LINKS}}`: LinkedIn / GitHub / personal links
- `{{ACHIEVEMENTS}}`: Achievements and prizes (or 'None yet')
- `{{WAITLIST_N}}`: Waitlist sign-ups (number)
- `{{AWS_ACCOUNT_ID}}`: AWS Account ID, 12 digits (blank if no AWS account yet)
- `{{NERDIEST}}`: Z Fellows: nerdiest thing about you (250 chars)
- `{{DRIVES}}`: Z Fellows: what drives you
- `{{GROWING_UP}}`: Z Fellows: non-traditional things you did growing up
- `{{RISK}}`: Z Fellows: a risk you took or challenge you faced (500)
- `{{COFOUNDER}}`: Z Fellows: who from your network you'd co-found with
- `{{HEARD}}`: How you heard about these programs (e.g. 'X')

## Master prompt (all programs)

```text
You are filling startup program applications in my browser on my behalf. I am Prax, solo founder of AskTheMove. I have read and approved every answer below and I want you to submit without asking me, except at the hand-over points.

RULES
1. Use only the facts in this prompt. Never invent personal facts, numbers, dates, users, revenue or links. If a REQUIRED field asks for something not given here, stop and ask me in this chat. Leave unknown OPTIONAL fields blank.
2. If any value still looks like {{SOMETHING}} (an unfilled placeholder), do not type it. Stop and ask me for it.
3. HAND OVER TO ME (stop, tell me exactly what to do, wait until I say "continue") for: typing any password or signing in; one-time codes from email, SMS or phone; CAPTCHAs or "I'm not a robot"; any payment or card form; creating a new account on any site; recording or uploading a video; any statement certifying a fact this prompt does not give.
4. Tick Terms of Service / privacy checkboxes that are required to submit. Leave marketing and newsletter opt-ins UNTICKED.
5. Respect character limits. If an answer is too long, shorten it keeping the meaning; never pad it.
6. Do not change account settings, do not open links from emails, do not pay for anything, do not apply to any program not named in this prompt.
7. Before submitting, scroll the whole form once and check every field against this prompt. Then submit.
8. After each submission, write one log line in this chat:  LOG | <program> | <date time IST> | <page URL> | <confirmation text or "no confirmation shown">
   If you stopped instead, write:  STOPPED | <program> | <what I need to do>

ABOUT ME (the founder)
- Name: {{FIRST_NAME}} {{LAST_NAME}}
- Email for everything: prax@askthemove.online   (never use a gmail address)
- Birthday: {{BIRTHDAY}}   Phone: {{PHONE}}   Based in: {{CITY}}, India
- Current school/work: {{WORK}}
- Background: {{BACKGROUND}}
- Past work: {{PAST_WORK}}
- Links: {{LINKS}}   X: https://x.com/AskTheMove
- Achievements: {{ACHIEVEMENTS}}
- Technical: Yes. Solo founder, no co-founder.
- How I heard: {{HEARD}}

ABOUT THE STARTUP
- Name: AskTheMove   Website: https://askthemove.online   Email: prax@askthemove.online   X: @AskTheMove
- One line (under 50 chars): Chess coach that explains your mistakes
- What it is: AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts (legal moves, material, best lines); Claude turns them into a short explanation; the server withholds any answer that cites a move, number or mate the engine did not produce.
- Status: working web app (bot games, full-game review, verified AI explanations). Waitlist live at askthemove.online since October 2026 with {{WAITLIST_N}} sign-ups. No public users yet; private beta next.
- Founded: September 2026. Not incorporated yet (sole founder). Self-funded/bootstrapped, no outside investment, no investors, no revenue. Based in India.
- Customers: improving club chess players, starting in India, who review their games but can't afford a coach.
- Competitors: Chess.com coach and Game Review, Duolingo Chess, Take Take Take. Insight: narration isn't teaching, and unchecked AI narration is wrong often enough to lose trust. We check every claim against the engine first, then teach in a loop: guess the move, see why yours fell short, retry a similar position.
- Engineering: built solo, spec-first, 150+ automated tests.
- Claude use: our server sends Claude the Stockfish evaluation, best line and material change for each critical moment; Claude explains it in a few plain sentences at the player's level; the server rejects any answer citing a move or number the engine didn't produce. Usage is capped per user per hour and per day.
- Help wanted: getting the first 100 real players; learning distribution as a solo founder, starting with chess communities and coaches in India.

TASK: Apply to each program below in this order, one browser tab at a time. Finish or log STOPPED for each, then move to the next. At the end, print all LOG and STOPPED lines together.
Order: 1 Meta notify, 2 Z Fellows, 3 Claude for Startups, 4 Kiro, 5 Y Combinator, 6 Entrepreneur First, 7 PayPal hackathon (register only), 8 a16z speedrun (only if I said yes), 9 Airwallex (only if I said yes), 10 AWS Activate (only after Kiro replies).
Skip Emergent Ventures entirely: they reject AI-written applications.
The per-program steps follow.

--- 1. Meta AI hackathon, notify me (today) ---
TASK: Meta Global AI Developer Hackathon, notify-me form.
1. Open https://dev.meta.ai/events/global-hackathon
2. Find the notify / register-interest form. Fill: First name = {{FIRST_NAME}}, Last name = {{LAST_NAME}}, Email = prax@askthemove.online. Leave the Meta marketing checkbox unticked.
3. Submit and log it. If the page already shows a full application form instead, fill it from the facts above and submit.

--- 2. Z Fellows (today, rolling) ---
TASK: Z Fellows application (Google Form, no account needed).
1. Open https://docs.google.com/forms/d/1z5HG9Pj0hIxS2oZL_wcJS5QqDZlcVbkhYGHp5Kp_IGM/viewform  (if it is moved, find "Apply" on https://zfellows.com). If Google asks me to sign in, skip it if a "continue without" option exists; otherwise hand over.
2. Fill:
- Email: prax@askthemove.online | First/Last name: {{FIRST_NAME}} / {{LAST_NAME}} | Company or project: AskTheMove
- Birthday: {{BIRTHDAY}} | Phone: {{PHONE}} | Technical: Yes | Applied before: No
- Where based: {{CITY}}, India | School or working: {{WORK}}
- Project and why (500): AskTheMove (askthemove.online) is a chess coach that explains your mistakes in plain words. Stockfish finds where the game turned and the better line, Claude explains it, and the server blocks any sentence citing a move or number the engine didn't produce. I'm building it because engines tell you what was best but never why, and most improving players can't afford a human coach.
- Problem (500): Players review games with an engine and learn little: they see "Nf5 was best, +2.3" and no reason. Human coaching is expensive and scarce. Chatbot coaches explain fluently but invent moves that aren't on the board. The missing piece is an explanation that is both readable and provably correct for that exact position.
- Expertise (500): {{BACKGROUND}} I built AskTheMove alone: bot play, full-game review, lessons, a Claude explanation layer with server-side fact checking, and over 150 automated tests.
- Competitors and insight (500): Chess.com, Duolingo Chess and Take Take Take all add AI narration to game review. My insight: narration isn't teaching, and unchecked narration is wrong often enough to lose trust. AskTheMove checks every claim against the engine first, then teaches in a loop: guess the move, see why yours fell short, retry a similar position.
- Past work (500): {{PAST_WORK}}
- Nerdiest thing (250): {{NERDIEST}} | What drives you: {{DRIVES}} | Growing up: {{GROWING_UP}} | Risk/challenge (500): {{RISK}}
- Website and links: https://askthemove.online, https://x.com/AskTheMove, {{LINKS}}
- Achievements: {{ACHIEVEMENTS}} | 1-minute video: leave blank (optional)
- Co-found with: {{COFOUNDER}} | How heard: {{HEARD}}
- One thing you need help with: Getting the first 100 real players. The product works; I need to learn distribution as a solo founder, starting with chess communities and coaches in India.
3. Submit and log it.

--- 3. Claude for Startups (today, rolling) ---
TASK: Anthropic Claude for Startups application.
1. Open https://platform.claude.com/offers/startups-application  (program page: https://claude.com/programs/startups). If I'm not signed in to the Claude Console, hand over so I can sign in.
2. Fill whatever fields appear, from these:
- Company name: AskTheMove | Website: https://askthemove.online | Company email: prax@askthemove.online
- Stage: Bootstrapped, pre-launch. Founded September 2026, not yet incorporated. | Funding: none | Partner VC / investor: None (leave blank if optional)
- How do you use Claude / what are you building: Claude writes AskTheMove's chess explanations. For each critical moment in a player's game, our server sends Claude the Stockfish evaluation, the best line and what changed in material. Claude explains the mistake in a few plain sentences pitched at the player's level. The server then rejects any answer that cites a move, number or mate the engine did not produce, so every explanation is checked before the player sees it. Usage is capped per user per hour and per day. Credits would let us run a private beta without charging testers.
- Team size: 1 | Country: India
3. Submit and log it. Note: their $1K credits are paused "over capacity"; applying still puts us in the queue.

--- 4. Kiro startup credits (before AWS Activate) ---
TASK: Kiro startup credits (Starter tier). This must be done BEFORE any AWS Activate application.
Needs: an AWS account whose root email is prax@askthemove.online. If {{AWS_ACCOUNT_ID}} is blank or unfilled, STOP and tell me: "Create the AWS account at aws.amazon.com with prax@askthemove.online on the Free plan, paying with UPI AutoPay (debit card as fallback), then give me the 12-digit Account ID." Do not create the account yourself.
1. Open https://aws.amazon.com/startups/credits/kiro  (info: https://kiro.dev/startups). Hand over for any sign-in.
2. Choose the Starter tier (up to 2 users). Fill:
- Startup name: AskTheMove | Website: https://askthemove.online | Business email: prax@askthemove.online
- AWS Account ID: {{AWS_ACCOUNT_ID}} | Country: India | Funding stage: Pre-seed, self-funded, no outside investment | Legal entity: Not incorporated yet; sole founder | Number of users: 1
- What you are building: AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts: legal moves, material and the best lines. Claude turns those facts into a short explanation. The server then withholds any answer that cites a move, number or mate the engine did not produce. The web app works end to end today, with bot games, full-game review and AI explanations; a private beta comes next.
- Traction: Pre-launch. The waitlist at askthemove.online went live in October 2026 and has {{WAITLIST_N}} sign-ups. We are on X as @AskTheMove.
- How you will use Kiro: We already build spec-first: each feature starts as a written proposal with numbered requirements and test scenarios, and over 150 automated tests guard the app. Kiro's specs and hooks match that way of working. We would use them for the next pieces: the learning loop (guess the move, see why yours fell short, retry a similar position) and explanations in Hindi. Hooks would run the test suite on every change.
3. Submit and log it.

--- 5. Y Combinator W27 (by 2 Nov (3 Nov 09:30 IST)) ---
TASK: Y Combinator W27 application. Deadline 2 Nov 2026 8pm PT = 3 Nov 09:30 IST.
1. Open https://www.ycombinator.com/apply. If I need a YC account or sign-in, hand over.
2. Fill the company and founder sections from the facts above. Key answers:
- Company name: AskTheMove | URL: https://askthemove.online | Location: {{CITY}}, India
- 50 characters or less: Chess coach that explains your mistakes
- What is your company going to make: AskTheMove is a chess coach that explains your mistakes in plain words. Stockfish finds the critical moments in a game, Claude explains them, and the server rejects any explanation that cites a move or number the engine didn't produce.
- Why this idea / what do you understand: Players review games with an engine but can't read its numbers, and coaches are expensive. Language models alone invent moves; pairing them with an engine and checking every claim is what makes the explanation trustworthy.
- How far along: Working web app (bot games, full-game review, verified AI explanations); waitlist live at askthemove.online with {{WAITLIST_N}} sign-ups. Private beta next.
- Users / revenue: No users yet; no revenue. | How long working on it: since September 2026, full time solo.
- Competitors: Chess.com's coach and Game Review, Duolingo Chess, Take Take Take. We focus on verified, plain-language explanations for improving club players in India.
- How will you make money: a paid tier for unlimited verified explanations and the training loop; later, tools for chess academies and coaches.
- Incorporated: No. Investment taken: None. Co-founders: none (solo).
- Founder profile: name, email, {{BACKGROUND}}, {{PAST_WORK}}, {{LINKS}}, {{ACHIEVEMENTS}}.
3. The 1-minute founder video: HAND OVER, I record and upload it myself.
4. Save the application. Submit only after the video is uploaded; otherwise log STOPPED with "upload the founder video".

--- 6. Entrepreneur First Bangalore (by 2 Nov) ---
TASK: Entrepreneur First (EF) application, Bangalore cohort. Round 2 closes 2 Nov 2026.
1. Open https://apply.joinef.com/  Choose Bangalore / India. Hand over for any sign-in.
2. Fill personal fields from ABOUT ME. Product answer: AskTheMove is a chess coach that explains your mistakes in plain words. Stockfish finds the critical moments in a game, Claude explains them, and the server rejects any explanation that cites a move or number the engine didn't produce. Built solo, with 150+ automated tests; waitlist at askthemove.online with {{WAITLIST_N}} sign-ups.
- Edge / most impressive thing built: {{BACKGROUND}} {{PAST_WORK}}
- Questions about my personal story or ambitions that ABOUT ME does not answer: stop and ask me; do not write them.
3. Submit and log it.

--- 7. PayPal AI Hackathon (register by 12 Nov) ---
TASK: PayPal AI Hackathon on Devpost (deadline 12 Nov 2026).
1. Go to https://devpost.com/hackathons and search "PayPal AI". Open the hackathon page.
2. Read the Rules / Eligibility section. If India or "residents of India" is excluded, STOP and log: STOPPED | PayPal | India not eligible. If unclear, quote the eligibility sentence to me and stop.
3. If eligible: click Join / Register. Hand over for Devpost sign-in or account creation. Fill registration fields from ABOUT ME. Project idea: AskTheMove, a chess coach that explains your mistakes in plain words (Stockfish facts, Claude explanations, every claim verified). For the hackathon we'd add a PayPal checkout for the coach's paid tier.
4. Only register now. Do not submit a project entry (that needs a demo video later). Log it.

--- 8. a16z speedrun SR008 (priority 12 Oct–1 Nov) ---
TASK: a16z speedrun SR008 application. Equity: $500K for 10%, 12 weeks in person in San Francisco. Only run this if I said yes to speedrun.
1. Open https://speedrun.a16z.com/apply  Enter prax@askthemove.online and Get started. Hand over for any email code.
2. Fill founder info from ABOUT ME and these answers:
- What are you building: AskTheMove: a chess coach that explains your mistakes in plain words. A chess engine supplies the facts, Claude explains them, and every claim is checked against the engine before the player sees it.
- Who is it for: Improving club players who review their games but can't afford a coach, starting in India.
- Why now: Language models can finally explain a chess position in plain words, but on their own they invent moves. Pairing them with an engine and verifying every claim makes the explanations trustworthy, at a cost of cents per game.
- Why you: {{BACKGROUND}} Built the whole product solo, with 150+ automated tests.
- What is working: A working web app with bot games, full-game review and verified AI explanations, and a live waitlist at askthemove.online with {{WAITLIST_N}} sign-ups. No public users yet; a private beta is next.
- Demo link (optional): https://askthemove.online | Deck: none
3. Submit and log it.

--- 9. Airwallex hackathon (optional) (by 23 Oct) ---
TASK: Airwallex Agentic Banking Hackathon, idea phase (closes 23 Oct 2026). Only run this if Prax said yes; it is a separate 3-week banking-agent build (Oct 25–Nov 13), not AskTheMove.
1. Open https://www.hackerearth.com/community/challenges/hackathon/agentic-banking-hackathon/?register=true  Hand over for HackerEarth sign-in or account creation.
2. Register solo. Track: Dispute Response Agent.
3. Idea text: Dispute Response Agent. When a customer opens a card dispute, the agent pulls the transaction, order and delivery records through Airwallex APIs, matches them to the dispute's reason code, and drafts the evidence response. It lists any evidence that's missing, links every statement in the draft to the record it came from, and waits for a human to approve before anything is submitted. The same rule I use in my chess coach applies here: the agent may only say what a source record proves.
4. Submit the idea and log it. Do not create the Airwallex sandbox account; tell me to do it (sandbox.airwallex.com with prax@askthemove.online).

--- 10. AWS Activate Founders (only after Kiro replies) ---
TASK: AWS Activate Founders ($1K credits). ONLY run this after Kiro has approved or declined. If I haven't told you Kiro replied, STOP and ask.
1. Open https://aws.amazon.com/startups/credits  Hand over for AWS Builder ID sign-in and account linking. The AWS account must be on the paid tier with a payment method (UPI AutoPay first, debit card as fallback); if it isn't, hand over so I upgrade it myself.
2. Choose Activate Founders. Fill:
- Product: AskTheMove, a web chess coach. Stockfish finds the critical moments in a player's game and Claude explains them in plain language; the server rejects any explanation that cites a move or number the engine didn't produce.
- Target market: Improving club chess players, starting in India, who review their games but can't afford a coach.
- Traction: Pre-launch. Working web app; waitlist at askthemove.online with {{WAITLIST_N}} sign-ups.
- Funding stage: Self-funded. No outside funding. Last funding date: none (leave blank or "N/A").
- Website: https://askthemove.online | Founded: September 2026 | Country: India | AWS Account ID: {{AWS_ACCOUNT_ID}}
3. This form can't be edited after submit: before submitting, show me a summary of every field and wait for "continue". Then submit and log it.

```

## 1. Meta AI hackathon, notify me (today)

```text
You are filling startup program applications in my browser on my behalf. I am Prax, solo founder of AskTheMove. I have read and approved every answer below and I want you to submit without asking me, except at the hand-over points.

RULES
1. Use only the facts in this prompt. Never invent personal facts, numbers, dates, users, revenue or links. If a REQUIRED field asks for something not given here, stop and ask me in this chat. Leave unknown OPTIONAL fields blank.
2. If any value still looks like {{SOMETHING}} (an unfilled placeholder), do not type it. Stop and ask me for it.
3. HAND OVER TO ME (stop, tell me exactly what to do, wait until I say "continue") for: typing any password or signing in; one-time codes from email, SMS or phone; CAPTCHAs or "I'm not a robot"; any payment or card form; creating a new account on any site; recording or uploading a video; any statement certifying a fact this prompt does not give.
4. Tick Terms of Service / privacy checkboxes that are required to submit. Leave marketing and newsletter opt-ins UNTICKED.
5. Respect character limits. If an answer is too long, shorten it keeping the meaning; never pad it.
6. Do not change account settings, do not open links from emails, do not pay for anything, do not apply to any program not named in this prompt.
7. Before submitting, scroll the whole form once and check every field against this prompt. Then submit.
8. After each submission, write one log line in this chat:  LOG | <program> | <date time IST> | <page URL> | <confirmation text or "no confirmation shown">
   If you stopped instead, write:  STOPPED | <program> | <what I need to do>

ABOUT ME (the founder)
- Name: {{FIRST_NAME}} {{LAST_NAME}}
- Email for everything: prax@askthemove.online   (never use a gmail address)
- Birthday: {{BIRTHDAY}}   Phone: {{PHONE}}   Based in: {{CITY}}, India
- Current school/work: {{WORK}}
- Background: {{BACKGROUND}}
- Past work: {{PAST_WORK}}
- Links: {{LINKS}}   X: https://x.com/AskTheMove
- Achievements: {{ACHIEVEMENTS}}
- Technical: Yes. Solo founder, no co-founder.
- How I heard: {{HEARD}}

ABOUT THE STARTUP
- Name: AskTheMove   Website: https://askthemove.online   Email: prax@askthemove.online   X: @AskTheMove
- One line (under 50 chars): Chess coach that explains your mistakes
- What it is: AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts (legal moves, material, best lines); Claude turns them into a short explanation; the server withholds any answer that cites a move, number or mate the engine did not produce.
- Status: working web app (bot games, full-game review, verified AI explanations). Waitlist live at askthemove.online since October 2026 with {{WAITLIST_N}} sign-ups. No public users yet; private beta next.
- Founded: September 2026. Not incorporated yet (sole founder). Self-funded/bootstrapped, no outside investment, no investors, no revenue. Based in India.
- Customers: improving club chess players, starting in India, who review their games but can't afford a coach.
- Competitors: Chess.com coach and Game Review, Duolingo Chess, Take Take Take. Insight: narration isn't teaching, and unchecked AI narration is wrong often enough to lose trust. We check every claim against the engine first, then teach in a loop: guess the move, see why yours fell short, retry a similar position.
- Engineering: built solo, spec-first, 150+ automated tests.
- Claude use: our server sends Claude the Stockfish evaluation, best line and material change for each critical moment; Claude explains it in a few plain sentences at the player's level; the server rejects any answer citing a move or number the engine didn't produce. Usage is capped per user per hour and per day.
- Help wanted: getting the first 100 real players; learning distribution as a solo founder, starting with chess communities and coaches in India.

TASK: Meta Global AI Developer Hackathon, notify-me form.
1. Open https://dev.meta.ai/events/global-hackathon
2. Find the notify / register-interest form. Fill: First name = {{FIRST_NAME}}, Last name = {{LAST_NAME}}, Email = prax@askthemove.online. Leave the Meta marketing checkbox unticked.
3. Submit and log it. If the page already shows a full application form instead, fill it from the facts above and submit.
```

## 2. Z Fellows (today, rolling)

```text
You are filling startup program applications in my browser on my behalf. I am Prax, solo founder of AskTheMove. I have read and approved every answer below and I want you to submit without asking me, except at the hand-over points.

RULES
1. Use only the facts in this prompt. Never invent personal facts, numbers, dates, users, revenue or links. If a REQUIRED field asks for something not given here, stop and ask me in this chat. Leave unknown OPTIONAL fields blank.
2. If any value still looks like {{SOMETHING}} (an unfilled placeholder), do not type it. Stop and ask me for it.
3. HAND OVER TO ME (stop, tell me exactly what to do, wait until I say "continue") for: typing any password or signing in; one-time codes from email, SMS or phone; CAPTCHAs or "I'm not a robot"; any payment or card form; creating a new account on any site; recording or uploading a video; any statement certifying a fact this prompt does not give.
4. Tick Terms of Service / privacy checkboxes that are required to submit. Leave marketing and newsletter opt-ins UNTICKED.
5. Respect character limits. If an answer is too long, shorten it keeping the meaning; never pad it.
6. Do not change account settings, do not open links from emails, do not pay for anything, do not apply to any program not named in this prompt.
7. Before submitting, scroll the whole form once and check every field against this prompt. Then submit.
8. After each submission, write one log line in this chat:  LOG | <program> | <date time IST> | <page URL> | <confirmation text or "no confirmation shown">
   If you stopped instead, write:  STOPPED | <program> | <what I need to do>

ABOUT ME (the founder)
- Name: {{FIRST_NAME}} {{LAST_NAME}}
- Email for everything: prax@askthemove.online   (never use a gmail address)
- Birthday: {{BIRTHDAY}}   Phone: {{PHONE}}   Based in: {{CITY}}, India
- Current school/work: {{WORK}}
- Background: {{BACKGROUND}}
- Past work: {{PAST_WORK}}
- Links: {{LINKS}}   X: https://x.com/AskTheMove
- Achievements: {{ACHIEVEMENTS}}
- Technical: Yes. Solo founder, no co-founder.
- How I heard: {{HEARD}}

ABOUT THE STARTUP
- Name: AskTheMove   Website: https://askthemove.online   Email: prax@askthemove.online   X: @AskTheMove
- One line (under 50 chars): Chess coach that explains your mistakes
- What it is: AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts (legal moves, material, best lines); Claude turns them into a short explanation; the server withholds any answer that cites a move, number or mate the engine did not produce.
- Status: working web app (bot games, full-game review, verified AI explanations). Waitlist live at askthemove.online since October 2026 with {{WAITLIST_N}} sign-ups. No public users yet; private beta next.
- Founded: September 2026. Not incorporated yet (sole founder). Self-funded/bootstrapped, no outside investment, no investors, no revenue. Based in India.
- Customers: improving club chess players, starting in India, who review their games but can't afford a coach.
- Competitors: Chess.com coach and Game Review, Duolingo Chess, Take Take Take. Insight: narration isn't teaching, and unchecked AI narration is wrong often enough to lose trust. We check every claim against the engine first, then teach in a loop: guess the move, see why yours fell short, retry a similar position.
- Engineering: built solo, spec-first, 150+ automated tests.
- Claude use: our server sends Claude the Stockfish evaluation, best line and material change for each critical moment; Claude explains it in a few plain sentences at the player's level; the server rejects any answer citing a move or number the engine didn't produce. Usage is capped per user per hour and per day.
- Help wanted: getting the first 100 real players; learning distribution as a solo founder, starting with chess communities and coaches in India.

TASK: Z Fellows application (Google Form, no account needed).
1. Open https://docs.google.com/forms/d/1z5HG9Pj0hIxS2oZL_wcJS5QqDZlcVbkhYGHp5Kp_IGM/viewform  (if it is moved, find "Apply" on https://zfellows.com). If Google asks me to sign in, skip it if a "continue without" option exists; otherwise hand over.
2. Fill:
- Email: prax@askthemove.online | First/Last name: {{FIRST_NAME}} / {{LAST_NAME}} | Company or project: AskTheMove
- Birthday: {{BIRTHDAY}} | Phone: {{PHONE}} | Technical: Yes | Applied before: No
- Where based: {{CITY}}, India | School or working: {{WORK}}
- Project and why (500): AskTheMove (askthemove.online) is a chess coach that explains your mistakes in plain words. Stockfish finds where the game turned and the better line, Claude explains it, and the server blocks any sentence citing a move or number the engine didn't produce. I'm building it because engines tell you what was best but never why, and most improving players can't afford a human coach.
- Problem (500): Players review games with an engine and learn little: they see "Nf5 was best, +2.3" and no reason. Human coaching is expensive and scarce. Chatbot coaches explain fluently but invent moves that aren't on the board. The missing piece is an explanation that is both readable and provably correct for that exact position.
- Expertise (500): {{BACKGROUND}} I built AskTheMove alone: bot play, full-game review, lessons, a Claude explanation layer with server-side fact checking, and over 150 automated tests.
- Competitors and insight (500): Chess.com, Duolingo Chess and Take Take Take all add AI narration to game review. My insight: narration isn't teaching, and unchecked narration is wrong often enough to lose trust. AskTheMove checks every claim against the engine first, then teaches in a loop: guess the move, see why yours fell short, retry a similar position.
- Past work (500): {{PAST_WORK}}
- Nerdiest thing (250): {{NERDIEST}} | What drives you: {{DRIVES}} | Growing up: {{GROWING_UP}} | Risk/challenge (500): {{RISK}}
- Website and links: https://askthemove.online, https://x.com/AskTheMove, {{LINKS}}
- Achievements: {{ACHIEVEMENTS}} | 1-minute video: leave blank (optional)
- Co-found with: {{COFOUNDER}} | How heard: {{HEARD}}
- One thing you need help with: Getting the first 100 real players. The product works; I need to learn distribution as a solo founder, starting with chess communities and coaches in India.
3. Submit and log it.
```

## 3. Claude for Startups (today, rolling)

```text
You are filling startup program applications in my browser on my behalf. I am Prax, solo founder of AskTheMove. I have read and approved every answer below and I want you to submit without asking me, except at the hand-over points.

RULES
1. Use only the facts in this prompt. Never invent personal facts, numbers, dates, users, revenue or links. If a REQUIRED field asks for something not given here, stop and ask me in this chat. Leave unknown OPTIONAL fields blank.
2. If any value still looks like {{SOMETHING}} (an unfilled placeholder), do not type it. Stop and ask me for it.
3. HAND OVER TO ME (stop, tell me exactly what to do, wait until I say "continue") for: typing any password or signing in; one-time codes from email, SMS or phone; CAPTCHAs or "I'm not a robot"; any payment or card form; creating a new account on any site; recording or uploading a video; any statement certifying a fact this prompt does not give.
4. Tick Terms of Service / privacy checkboxes that are required to submit. Leave marketing and newsletter opt-ins UNTICKED.
5. Respect character limits. If an answer is too long, shorten it keeping the meaning; never pad it.
6. Do not change account settings, do not open links from emails, do not pay for anything, do not apply to any program not named in this prompt.
7. Before submitting, scroll the whole form once and check every field against this prompt. Then submit.
8. After each submission, write one log line in this chat:  LOG | <program> | <date time IST> | <page URL> | <confirmation text or "no confirmation shown">
   If you stopped instead, write:  STOPPED | <program> | <what I need to do>

ABOUT ME (the founder)
- Name: {{FIRST_NAME}} {{LAST_NAME}}
- Email for everything: prax@askthemove.online   (never use a gmail address)
- Birthday: {{BIRTHDAY}}   Phone: {{PHONE}}   Based in: {{CITY}}, India
- Current school/work: {{WORK}}
- Background: {{BACKGROUND}}
- Past work: {{PAST_WORK}}
- Links: {{LINKS}}   X: https://x.com/AskTheMove
- Achievements: {{ACHIEVEMENTS}}
- Technical: Yes. Solo founder, no co-founder.
- How I heard: {{HEARD}}

ABOUT THE STARTUP
- Name: AskTheMove   Website: https://askthemove.online   Email: prax@askthemove.online   X: @AskTheMove
- One line (under 50 chars): Chess coach that explains your mistakes
- What it is: AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts (legal moves, material, best lines); Claude turns them into a short explanation; the server withholds any answer that cites a move, number or mate the engine did not produce.
- Status: working web app (bot games, full-game review, verified AI explanations). Waitlist live at askthemove.online since October 2026 with {{WAITLIST_N}} sign-ups. No public users yet; private beta next.
- Founded: September 2026. Not incorporated yet (sole founder). Self-funded/bootstrapped, no outside investment, no investors, no revenue. Based in India.
- Customers: improving club chess players, starting in India, who review their games but can't afford a coach.
- Competitors: Chess.com coach and Game Review, Duolingo Chess, Take Take Take. Insight: narration isn't teaching, and unchecked AI narration is wrong often enough to lose trust. We check every claim against the engine first, then teach in a loop: guess the move, see why yours fell short, retry a similar position.
- Engineering: built solo, spec-first, 150+ automated tests.
- Claude use: our server sends Claude the Stockfish evaluation, best line and material change for each critical moment; Claude explains it in a few plain sentences at the player's level; the server rejects any answer citing a move or number the engine didn't produce. Usage is capped per user per hour and per day.
- Help wanted: getting the first 100 real players; learning distribution as a solo founder, starting with chess communities and coaches in India.

TASK: Anthropic Claude for Startups application.
1. Open https://platform.claude.com/offers/startups-application  (program page: https://claude.com/programs/startups). If I'm not signed in to the Claude Console, hand over so I can sign in.
2. Fill whatever fields appear, from these:
- Company name: AskTheMove | Website: https://askthemove.online | Company email: prax@askthemove.online
- Stage: Bootstrapped, pre-launch. Founded September 2026, not yet incorporated. | Funding: none | Partner VC / investor: None (leave blank if optional)
- How do you use Claude / what are you building: Claude writes AskTheMove's chess explanations. For each critical moment in a player's game, our server sends Claude the Stockfish evaluation, the best line and what changed in material. Claude explains the mistake in a few plain sentences pitched at the player's level. The server then rejects any answer that cites a move, number or mate the engine did not produce, so every explanation is checked before the player sees it. Usage is capped per user per hour and per day. Credits would let us run a private beta without charging testers.
- Team size: 1 | Country: India
3. Submit and log it. Note: their $1K credits are paused "over capacity"; applying still puts us in the queue.
```

## 4. Kiro startup credits (before AWS Activate)

```text
You are filling startup program applications in my browser on my behalf. I am Prax, solo founder of AskTheMove. I have read and approved every answer below and I want you to submit without asking me, except at the hand-over points.

RULES
1. Use only the facts in this prompt. Never invent personal facts, numbers, dates, users, revenue or links. If a REQUIRED field asks for something not given here, stop and ask me in this chat. Leave unknown OPTIONAL fields blank.
2. If any value still looks like {{SOMETHING}} (an unfilled placeholder), do not type it. Stop and ask me for it.
3. HAND OVER TO ME (stop, tell me exactly what to do, wait until I say "continue") for: typing any password or signing in; one-time codes from email, SMS or phone; CAPTCHAs or "I'm not a robot"; any payment or card form; creating a new account on any site; recording or uploading a video; any statement certifying a fact this prompt does not give.
4. Tick Terms of Service / privacy checkboxes that are required to submit. Leave marketing and newsletter opt-ins UNTICKED.
5. Respect character limits. If an answer is too long, shorten it keeping the meaning; never pad it.
6. Do not change account settings, do not open links from emails, do not pay for anything, do not apply to any program not named in this prompt.
7. Before submitting, scroll the whole form once and check every field against this prompt. Then submit.
8. After each submission, write one log line in this chat:  LOG | <program> | <date time IST> | <page URL> | <confirmation text or "no confirmation shown">
   If you stopped instead, write:  STOPPED | <program> | <what I need to do>

ABOUT ME (the founder)
- Name: {{FIRST_NAME}} {{LAST_NAME}}
- Email for everything: prax@askthemove.online   (never use a gmail address)
- Birthday: {{BIRTHDAY}}   Phone: {{PHONE}}   Based in: {{CITY}}, India
- Current school/work: {{WORK}}
- Background: {{BACKGROUND}}
- Past work: {{PAST_WORK}}
- Links: {{LINKS}}   X: https://x.com/AskTheMove
- Achievements: {{ACHIEVEMENTS}}
- Technical: Yes. Solo founder, no co-founder.
- How I heard: {{HEARD}}

ABOUT THE STARTUP
- Name: AskTheMove   Website: https://askthemove.online   Email: prax@askthemove.online   X: @AskTheMove
- One line (under 50 chars): Chess coach that explains your mistakes
- What it is: AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts (legal moves, material, best lines); Claude turns them into a short explanation; the server withholds any answer that cites a move, number or mate the engine did not produce.
- Status: working web app (bot games, full-game review, verified AI explanations). Waitlist live at askthemove.online since October 2026 with {{WAITLIST_N}} sign-ups. No public users yet; private beta next.
- Founded: September 2026. Not incorporated yet (sole founder). Self-funded/bootstrapped, no outside investment, no investors, no revenue. Based in India.
- Customers: improving club chess players, starting in India, who review their games but can't afford a coach.
- Competitors: Chess.com coach and Game Review, Duolingo Chess, Take Take Take. Insight: narration isn't teaching, and unchecked AI narration is wrong often enough to lose trust. We check every claim against the engine first, then teach in a loop: guess the move, see why yours fell short, retry a similar position.
- Engineering: built solo, spec-first, 150+ automated tests.
- Claude use: our server sends Claude the Stockfish evaluation, best line and material change for each critical moment; Claude explains it in a few plain sentences at the player's level; the server rejects any answer citing a move or number the engine didn't produce. Usage is capped per user per hour and per day.
- Help wanted: getting the first 100 real players; learning distribution as a solo founder, starting with chess communities and coaches in India.

TASK: Kiro startup credits (Starter tier). This must be done BEFORE any AWS Activate application.
Needs: an AWS account whose root email is prax@askthemove.online. If {{AWS_ACCOUNT_ID}} is blank or unfilled, STOP and tell me: "Create the AWS account at aws.amazon.com with prax@askthemove.online on the Free plan, paying with UPI AutoPay (debit card as fallback), then give me the 12-digit Account ID." Do not create the account yourself.
1. Open https://aws.amazon.com/startups/credits/kiro  (info: https://kiro.dev/startups). Hand over for any sign-in.
2. Choose the Starter tier (up to 2 users). Fill:
- Startup name: AskTheMove | Website: https://askthemove.online | Business email: prax@askthemove.online
- AWS Account ID: {{AWS_ACCOUNT_ID}} | Country: India | Funding stage: Pre-seed, self-funded, no outside investment | Legal entity: Not incorporated yet; sole founder | Number of users: 1
- What you are building: AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts: legal moves, material and the best lines. Claude turns those facts into a short explanation. The server then withholds any answer that cites a move, number or mate the engine did not produce. The web app works end to end today, with bot games, full-game review and AI explanations; a private beta comes next.
- Traction: Pre-launch. The waitlist at askthemove.online went live in October 2026 and has {{WAITLIST_N}} sign-ups. We are on X as @AskTheMove.
- How you will use Kiro: We already build spec-first: each feature starts as a written proposal with numbered requirements and test scenarios, and over 150 automated tests guard the app. Kiro's specs and hooks match that way of working. We would use them for the next pieces: the learning loop (guess the move, see why yours fell short, retry a similar position) and explanations in Hindi. Hooks would run the test suite on every change.
3. Submit and log it.
```

## 5. Y Combinator W27 (by 2 Nov (3 Nov 09:30 IST))

```text
You are filling startup program applications in my browser on my behalf. I am Prax, solo founder of AskTheMove. I have read and approved every answer below and I want you to submit without asking me, except at the hand-over points.

RULES
1. Use only the facts in this prompt. Never invent personal facts, numbers, dates, users, revenue or links. If a REQUIRED field asks for something not given here, stop and ask me in this chat. Leave unknown OPTIONAL fields blank.
2. If any value still looks like {{SOMETHING}} (an unfilled placeholder), do not type it. Stop and ask me for it.
3. HAND OVER TO ME (stop, tell me exactly what to do, wait until I say "continue") for: typing any password or signing in; one-time codes from email, SMS or phone; CAPTCHAs or "I'm not a robot"; any payment or card form; creating a new account on any site; recording or uploading a video; any statement certifying a fact this prompt does not give.
4. Tick Terms of Service / privacy checkboxes that are required to submit. Leave marketing and newsletter opt-ins UNTICKED.
5. Respect character limits. If an answer is too long, shorten it keeping the meaning; never pad it.
6. Do not change account settings, do not open links from emails, do not pay for anything, do not apply to any program not named in this prompt.
7. Before submitting, scroll the whole form once and check every field against this prompt. Then submit.
8. After each submission, write one log line in this chat:  LOG | <program> | <date time IST> | <page URL> | <confirmation text or "no confirmation shown">
   If you stopped instead, write:  STOPPED | <program> | <what I need to do>

ABOUT ME (the founder)
- Name: {{FIRST_NAME}} {{LAST_NAME}}
- Email for everything: prax@askthemove.online   (never use a gmail address)
- Birthday: {{BIRTHDAY}}   Phone: {{PHONE}}   Based in: {{CITY}}, India
- Current school/work: {{WORK}}
- Background: {{BACKGROUND}}
- Past work: {{PAST_WORK}}
- Links: {{LINKS}}   X: https://x.com/AskTheMove
- Achievements: {{ACHIEVEMENTS}}
- Technical: Yes. Solo founder, no co-founder.
- How I heard: {{HEARD}}

ABOUT THE STARTUP
- Name: AskTheMove   Website: https://askthemove.online   Email: prax@askthemove.online   X: @AskTheMove
- One line (under 50 chars): Chess coach that explains your mistakes
- What it is: AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts (legal moves, material, best lines); Claude turns them into a short explanation; the server withholds any answer that cites a move, number or mate the engine did not produce.
- Status: working web app (bot games, full-game review, verified AI explanations). Waitlist live at askthemove.online since October 2026 with {{WAITLIST_N}} sign-ups. No public users yet; private beta next.
- Founded: September 2026. Not incorporated yet (sole founder). Self-funded/bootstrapped, no outside investment, no investors, no revenue. Based in India.
- Customers: improving club chess players, starting in India, who review their games but can't afford a coach.
- Competitors: Chess.com coach and Game Review, Duolingo Chess, Take Take Take. Insight: narration isn't teaching, and unchecked AI narration is wrong often enough to lose trust. We check every claim against the engine first, then teach in a loop: guess the move, see why yours fell short, retry a similar position.
- Engineering: built solo, spec-first, 150+ automated tests.
- Claude use: our server sends Claude the Stockfish evaluation, best line and material change for each critical moment; Claude explains it in a few plain sentences at the player's level; the server rejects any answer citing a move or number the engine didn't produce. Usage is capped per user per hour and per day.
- Help wanted: getting the first 100 real players; learning distribution as a solo founder, starting with chess communities and coaches in India.

TASK: Y Combinator W27 application. Deadline 2 Nov 2026 8pm PT = 3 Nov 09:30 IST.
1. Open https://www.ycombinator.com/apply. If I need a YC account or sign-in, hand over.
2. Fill the company and founder sections from the facts above. Key answers:
- Company name: AskTheMove | URL: https://askthemove.online | Location: {{CITY}}, India
- 50 characters or less: Chess coach that explains your mistakes
- What is your company going to make: AskTheMove is a chess coach that explains your mistakes in plain words. Stockfish finds the critical moments in a game, Claude explains them, and the server rejects any explanation that cites a move or number the engine didn't produce.
- Why this idea / what do you understand: Players review games with an engine but can't read its numbers, and coaches are expensive. Language models alone invent moves; pairing them with an engine and checking every claim is what makes the explanation trustworthy.
- How far along: Working web app (bot games, full-game review, verified AI explanations); waitlist live at askthemove.online with {{WAITLIST_N}} sign-ups. Private beta next.
- Users / revenue: No users yet; no revenue. | How long working on it: since September 2026, full time solo.
- Competitors: Chess.com's coach and Game Review, Duolingo Chess, Take Take Take. We focus on verified, plain-language explanations for improving club players in India.
- How will you make money: a paid tier for unlimited verified explanations and the training loop; later, tools for chess academies and coaches.
- Incorporated: No. Investment taken: None. Co-founders: none (solo).
- Founder profile: name, email, {{BACKGROUND}}, {{PAST_WORK}}, {{LINKS}}, {{ACHIEVEMENTS}}.
3. The 1-minute founder video: HAND OVER, I record and upload it myself.
4. Save the application. Submit only after the video is uploaded; otherwise log STOPPED with "upload the founder video".
```

## 6. Entrepreneur First Bangalore (by 2 Nov)

```text
You are filling startup program applications in my browser on my behalf. I am Prax, solo founder of AskTheMove. I have read and approved every answer below and I want you to submit without asking me, except at the hand-over points.

RULES
1. Use only the facts in this prompt. Never invent personal facts, numbers, dates, users, revenue or links. If a REQUIRED field asks for something not given here, stop and ask me in this chat. Leave unknown OPTIONAL fields blank.
2. If any value still looks like {{SOMETHING}} (an unfilled placeholder), do not type it. Stop and ask me for it.
3. HAND OVER TO ME (stop, tell me exactly what to do, wait until I say "continue") for: typing any password or signing in; one-time codes from email, SMS or phone; CAPTCHAs or "I'm not a robot"; any payment or card form; creating a new account on any site; recording or uploading a video; any statement certifying a fact this prompt does not give.
4. Tick Terms of Service / privacy checkboxes that are required to submit. Leave marketing and newsletter opt-ins UNTICKED.
5. Respect character limits. If an answer is too long, shorten it keeping the meaning; never pad it.
6. Do not change account settings, do not open links from emails, do not pay for anything, do not apply to any program not named in this prompt.
7. Before submitting, scroll the whole form once and check every field against this prompt. Then submit.
8. After each submission, write one log line in this chat:  LOG | <program> | <date time IST> | <page URL> | <confirmation text or "no confirmation shown">
   If you stopped instead, write:  STOPPED | <program> | <what I need to do>

ABOUT ME (the founder)
- Name: {{FIRST_NAME}} {{LAST_NAME}}
- Email for everything: prax@askthemove.online   (never use a gmail address)
- Birthday: {{BIRTHDAY}}   Phone: {{PHONE}}   Based in: {{CITY}}, India
- Current school/work: {{WORK}}
- Background: {{BACKGROUND}}
- Past work: {{PAST_WORK}}
- Links: {{LINKS}}   X: https://x.com/AskTheMove
- Achievements: {{ACHIEVEMENTS}}
- Technical: Yes. Solo founder, no co-founder.
- How I heard: {{HEARD}}

ABOUT THE STARTUP
- Name: AskTheMove   Website: https://askthemove.online   Email: prax@askthemove.online   X: @AskTheMove
- One line (under 50 chars): Chess coach that explains your mistakes
- What it is: AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts (legal moves, material, best lines); Claude turns them into a short explanation; the server withholds any answer that cites a move, number or mate the engine did not produce.
- Status: working web app (bot games, full-game review, verified AI explanations). Waitlist live at askthemove.online since October 2026 with {{WAITLIST_N}} sign-ups. No public users yet; private beta next.
- Founded: September 2026. Not incorporated yet (sole founder). Self-funded/bootstrapped, no outside investment, no investors, no revenue. Based in India.
- Customers: improving club chess players, starting in India, who review their games but can't afford a coach.
- Competitors: Chess.com coach and Game Review, Duolingo Chess, Take Take Take. Insight: narration isn't teaching, and unchecked AI narration is wrong often enough to lose trust. We check every claim against the engine first, then teach in a loop: guess the move, see why yours fell short, retry a similar position.
- Engineering: built solo, spec-first, 150+ automated tests.
- Claude use: our server sends Claude the Stockfish evaluation, best line and material change for each critical moment; Claude explains it in a few plain sentences at the player's level; the server rejects any answer citing a move or number the engine didn't produce. Usage is capped per user per hour and per day.
- Help wanted: getting the first 100 real players; learning distribution as a solo founder, starting with chess communities and coaches in India.

TASK: Entrepreneur First (EF) application, Bangalore cohort. Round 2 closes 2 Nov 2026.
1. Open https://apply.joinef.com/  Choose Bangalore / India. Hand over for any sign-in.
2. Fill personal fields from ABOUT ME. Product answer: AskTheMove is a chess coach that explains your mistakes in plain words. Stockfish finds the critical moments in a game, Claude explains them, and the server rejects any explanation that cites a move or number the engine didn't produce. Built solo, with 150+ automated tests; waitlist at askthemove.online with {{WAITLIST_N}} sign-ups.
- Edge / most impressive thing built: {{BACKGROUND}} {{PAST_WORK}}
- Questions about my personal story or ambitions that ABOUT ME does not answer: stop and ask me; do not write them.
3. Submit and log it.
```

## 7. PayPal AI Hackathon (register by 12 Nov)

```text
You are filling startup program applications in my browser on my behalf. I am Prax, solo founder of AskTheMove. I have read and approved every answer below and I want you to submit without asking me, except at the hand-over points.

RULES
1. Use only the facts in this prompt. Never invent personal facts, numbers, dates, users, revenue or links. If a REQUIRED field asks for something not given here, stop and ask me in this chat. Leave unknown OPTIONAL fields blank.
2. If any value still looks like {{SOMETHING}} (an unfilled placeholder), do not type it. Stop and ask me for it.
3. HAND OVER TO ME (stop, tell me exactly what to do, wait until I say "continue") for: typing any password or signing in; one-time codes from email, SMS or phone; CAPTCHAs or "I'm not a robot"; any payment or card form; creating a new account on any site; recording or uploading a video; any statement certifying a fact this prompt does not give.
4. Tick Terms of Service / privacy checkboxes that are required to submit. Leave marketing and newsletter opt-ins UNTICKED.
5. Respect character limits. If an answer is too long, shorten it keeping the meaning; never pad it.
6. Do not change account settings, do not open links from emails, do not pay for anything, do not apply to any program not named in this prompt.
7. Before submitting, scroll the whole form once and check every field against this prompt. Then submit.
8. After each submission, write one log line in this chat:  LOG | <program> | <date time IST> | <page URL> | <confirmation text or "no confirmation shown">
   If you stopped instead, write:  STOPPED | <program> | <what I need to do>

ABOUT ME (the founder)
- Name: {{FIRST_NAME}} {{LAST_NAME}}
- Email for everything: prax@askthemove.online   (never use a gmail address)
- Birthday: {{BIRTHDAY}}   Phone: {{PHONE}}   Based in: {{CITY}}, India
- Current school/work: {{WORK}}
- Background: {{BACKGROUND}}
- Past work: {{PAST_WORK}}
- Links: {{LINKS}}   X: https://x.com/AskTheMove
- Achievements: {{ACHIEVEMENTS}}
- Technical: Yes. Solo founder, no co-founder.
- How I heard: {{HEARD}}

ABOUT THE STARTUP
- Name: AskTheMove   Website: https://askthemove.online   Email: prax@askthemove.online   X: @AskTheMove
- One line (under 50 chars): Chess coach that explains your mistakes
- What it is: AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts (legal moves, material, best lines); Claude turns them into a short explanation; the server withholds any answer that cites a move, number or mate the engine did not produce.
- Status: working web app (bot games, full-game review, verified AI explanations). Waitlist live at askthemove.online since October 2026 with {{WAITLIST_N}} sign-ups. No public users yet; private beta next.
- Founded: September 2026. Not incorporated yet (sole founder). Self-funded/bootstrapped, no outside investment, no investors, no revenue. Based in India.
- Customers: improving club chess players, starting in India, who review their games but can't afford a coach.
- Competitors: Chess.com coach and Game Review, Duolingo Chess, Take Take Take. Insight: narration isn't teaching, and unchecked AI narration is wrong often enough to lose trust. We check every claim against the engine first, then teach in a loop: guess the move, see why yours fell short, retry a similar position.
- Engineering: built solo, spec-first, 150+ automated tests.
- Claude use: our server sends Claude the Stockfish evaluation, best line and material change for each critical moment; Claude explains it in a few plain sentences at the player's level; the server rejects any answer citing a move or number the engine didn't produce. Usage is capped per user per hour and per day.
- Help wanted: getting the first 100 real players; learning distribution as a solo founder, starting with chess communities and coaches in India.

TASK: PayPal AI Hackathon on Devpost (deadline 12 Nov 2026).
1. Go to https://devpost.com/hackathons and search "PayPal AI". Open the hackathon page.
2. Read the Rules / Eligibility section. If India or "residents of India" is excluded, STOP and log: STOPPED | PayPal | India not eligible. If unclear, quote the eligibility sentence to me and stop.
3. If eligible: click Join / Register. Hand over for Devpost sign-in or account creation. Fill registration fields from ABOUT ME. Project idea: AskTheMove, a chess coach that explains your mistakes in plain words (Stockfish facts, Claude explanations, every claim verified). For the hackathon we'd add a PayPal checkout for the coach's paid tier.
4. Only register now. Do not submit a project entry (that needs a demo video later). Log it.
```

## 8. a16z speedrun SR008 (priority 12 Oct–1 Nov)

```text
You are filling startup program applications in my browser on my behalf. I am Prax, solo founder of AskTheMove. I have read and approved every answer below and I want you to submit without asking me, except at the hand-over points.

RULES
1. Use only the facts in this prompt. Never invent personal facts, numbers, dates, users, revenue or links. If a REQUIRED field asks for something not given here, stop and ask me in this chat. Leave unknown OPTIONAL fields blank.
2. If any value still looks like {{SOMETHING}} (an unfilled placeholder), do not type it. Stop and ask me for it.
3. HAND OVER TO ME (stop, tell me exactly what to do, wait until I say "continue") for: typing any password or signing in; one-time codes from email, SMS or phone; CAPTCHAs or "I'm not a robot"; any payment or card form; creating a new account on any site; recording or uploading a video; any statement certifying a fact this prompt does not give.
4. Tick Terms of Service / privacy checkboxes that are required to submit. Leave marketing and newsletter opt-ins UNTICKED.
5. Respect character limits. If an answer is too long, shorten it keeping the meaning; never pad it.
6. Do not change account settings, do not open links from emails, do not pay for anything, do not apply to any program not named in this prompt.
7. Before submitting, scroll the whole form once and check every field against this prompt. Then submit.
8. After each submission, write one log line in this chat:  LOG | <program> | <date time IST> | <page URL> | <confirmation text or "no confirmation shown">
   If you stopped instead, write:  STOPPED | <program> | <what I need to do>

ABOUT ME (the founder)
- Name: {{FIRST_NAME}} {{LAST_NAME}}
- Email for everything: prax@askthemove.online   (never use a gmail address)
- Birthday: {{BIRTHDAY}}   Phone: {{PHONE}}   Based in: {{CITY}}, India
- Current school/work: {{WORK}}
- Background: {{BACKGROUND}}
- Past work: {{PAST_WORK}}
- Links: {{LINKS}}   X: https://x.com/AskTheMove
- Achievements: {{ACHIEVEMENTS}}
- Technical: Yes. Solo founder, no co-founder.
- How I heard: {{HEARD}}

ABOUT THE STARTUP
- Name: AskTheMove   Website: https://askthemove.online   Email: prax@askthemove.online   X: @AskTheMove
- One line (under 50 chars): Chess coach that explains your mistakes
- What it is: AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts (legal moves, material, best lines); Claude turns them into a short explanation; the server withholds any answer that cites a move, number or mate the engine did not produce.
- Status: working web app (bot games, full-game review, verified AI explanations). Waitlist live at askthemove.online since October 2026 with {{WAITLIST_N}} sign-ups. No public users yet; private beta next.
- Founded: September 2026. Not incorporated yet (sole founder). Self-funded/bootstrapped, no outside investment, no investors, no revenue. Based in India.
- Customers: improving club chess players, starting in India, who review their games but can't afford a coach.
- Competitors: Chess.com coach and Game Review, Duolingo Chess, Take Take Take. Insight: narration isn't teaching, and unchecked AI narration is wrong often enough to lose trust. We check every claim against the engine first, then teach in a loop: guess the move, see why yours fell short, retry a similar position.
- Engineering: built solo, spec-first, 150+ automated tests.
- Claude use: our server sends Claude the Stockfish evaluation, best line and material change for each critical moment; Claude explains it in a few plain sentences at the player's level; the server rejects any answer citing a move or number the engine didn't produce. Usage is capped per user per hour and per day.
- Help wanted: getting the first 100 real players; learning distribution as a solo founder, starting with chess communities and coaches in India.

TASK: a16z speedrun SR008 application. Equity: $500K for 10%, 12 weeks in person in San Francisco. Only run this if I said yes to speedrun.
1. Open https://speedrun.a16z.com/apply  Enter prax@askthemove.online and Get started. Hand over for any email code.
2. Fill founder info from ABOUT ME and these answers:
- What are you building: AskTheMove: a chess coach that explains your mistakes in plain words. A chess engine supplies the facts, Claude explains them, and every claim is checked against the engine before the player sees it.
- Who is it for: Improving club players who review their games but can't afford a coach, starting in India.
- Why now: Language models can finally explain a chess position in plain words, but on their own they invent moves. Pairing them with an engine and verifying every claim makes the explanations trustworthy, at a cost of cents per game.
- Why you: {{BACKGROUND}} Built the whole product solo, with 150+ automated tests.
- What is working: A working web app with bot games, full-game review and verified AI explanations, and a live waitlist at askthemove.online with {{WAITLIST_N}} sign-ups. No public users yet; a private beta is next.
- Demo link (optional): https://askthemove.online | Deck: none
3. Submit and log it.
```

## 9. Airwallex hackathon (optional) (by 23 Oct)

```text
You are filling startup program applications in my browser on my behalf. I am Prax, solo founder of AskTheMove. I have read and approved every answer below and I want you to submit without asking me, except at the hand-over points.

RULES
1. Use only the facts in this prompt. Never invent personal facts, numbers, dates, users, revenue or links. If a REQUIRED field asks for something not given here, stop and ask me in this chat. Leave unknown OPTIONAL fields blank.
2. If any value still looks like {{SOMETHING}} (an unfilled placeholder), do not type it. Stop and ask me for it.
3. HAND OVER TO ME (stop, tell me exactly what to do, wait until I say "continue") for: typing any password or signing in; one-time codes from email, SMS or phone; CAPTCHAs or "I'm not a robot"; any payment or card form; creating a new account on any site; recording or uploading a video; any statement certifying a fact this prompt does not give.
4. Tick Terms of Service / privacy checkboxes that are required to submit. Leave marketing and newsletter opt-ins UNTICKED.
5. Respect character limits. If an answer is too long, shorten it keeping the meaning; never pad it.
6. Do not change account settings, do not open links from emails, do not pay for anything, do not apply to any program not named in this prompt.
7. Before submitting, scroll the whole form once and check every field against this prompt. Then submit.
8. After each submission, write one log line in this chat:  LOG | <program> | <date time IST> | <page URL> | <confirmation text or "no confirmation shown">
   If you stopped instead, write:  STOPPED | <program> | <what I need to do>

ABOUT ME (the founder)
- Name: {{FIRST_NAME}} {{LAST_NAME}}
- Email for everything: prax@askthemove.online   (never use a gmail address)
- Birthday: {{BIRTHDAY}}   Phone: {{PHONE}}   Based in: {{CITY}}, India
- Current school/work: {{WORK}}
- Background: {{BACKGROUND}}
- Past work: {{PAST_WORK}}
- Links: {{LINKS}}   X: https://x.com/AskTheMove
- Achievements: {{ACHIEVEMENTS}}
- Technical: Yes. Solo founder, no co-founder.
- How I heard: {{HEARD}}

ABOUT THE STARTUP
- Name: AskTheMove   Website: https://askthemove.online   Email: prax@askthemove.online   X: @AskTheMove
- One line (under 50 chars): Chess coach that explains your mistakes
- What it is: AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts (legal moves, material, best lines); Claude turns them into a short explanation; the server withholds any answer that cites a move, number or mate the engine did not produce.
- Status: working web app (bot games, full-game review, verified AI explanations). Waitlist live at askthemove.online since October 2026 with {{WAITLIST_N}} sign-ups. No public users yet; private beta next.
- Founded: September 2026. Not incorporated yet (sole founder). Self-funded/bootstrapped, no outside investment, no investors, no revenue. Based in India.
- Customers: improving club chess players, starting in India, who review their games but can't afford a coach.
- Competitors: Chess.com coach and Game Review, Duolingo Chess, Take Take Take. Insight: narration isn't teaching, and unchecked AI narration is wrong often enough to lose trust. We check every claim against the engine first, then teach in a loop: guess the move, see why yours fell short, retry a similar position.
- Engineering: built solo, spec-first, 150+ automated tests.
- Claude use: our server sends Claude the Stockfish evaluation, best line and material change for each critical moment; Claude explains it in a few plain sentences at the player's level; the server rejects any answer citing a move or number the engine didn't produce. Usage is capped per user per hour and per day.
- Help wanted: getting the first 100 real players; learning distribution as a solo founder, starting with chess communities and coaches in India.

TASK: Airwallex Agentic Banking Hackathon, idea phase (closes 23 Oct 2026). Only run this if Prax said yes; it is a separate 3-week banking-agent build (Oct 25–Nov 13), not AskTheMove.
1. Open https://www.hackerearth.com/community/challenges/hackathon/agentic-banking-hackathon/?register=true  Hand over for HackerEarth sign-in or account creation.
2. Register solo. Track: Dispute Response Agent.
3. Idea text: Dispute Response Agent. When a customer opens a card dispute, the agent pulls the transaction, order and delivery records through Airwallex APIs, matches them to the dispute's reason code, and drafts the evidence response. It lists any evidence that's missing, links every statement in the draft to the record it came from, and waits for a human to approve before anything is submitted. The same rule I use in my chess coach applies here: the agent may only say what a source record proves.
4. Submit the idea and log it. Do not create the Airwallex sandbox account; tell me to do it (sandbox.airwallex.com with prax@askthemove.online).
```

## 10. AWS Activate Founders (only after Kiro replies)

```text
You are filling startup program applications in my browser on my behalf. I am Prax, solo founder of AskTheMove. I have read and approved every answer below and I want you to submit without asking me, except at the hand-over points.

RULES
1. Use only the facts in this prompt. Never invent personal facts, numbers, dates, users, revenue or links. If a REQUIRED field asks for something not given here, stop and ask me in this chat. Leave unknown OPTIONAL fields blank.
2. If any value still looks like {{SOMETHING}} (an unfilled placeholder), do not type it. Stop and ask me for it.
3. HAND OVER TO ME (stop, tell me exactly what to do, wait until I say "continue") for: typing any password or signing in; one-time codes from email, SMS or phone; CAPTCHAs or "I'm not a robot"; any payment or card form; creating a new account on any site; recording or uploading a video; any statement certifying a fact this prompt does not give.
4. Tick Terms of Service / privacy checkboxes that are required to submit. Leave marketing and newsletter opt-ins UNTICKED.
5. Respect character limits. If an answer is too long, shorten it keeping the meaning; never pad it.
6. Do not change account settings, do not open links from emails, do not pay for anything, do not apply to any program not named in this prompt.
7. Before submitting, scroll the whole form once and check every field against this prompt. Then submit.
8. After each submission, write one log line in this chat:  LOG | <program> | <date time IST> | <page URL> | <confirmation text or "no confirmation shown">
   If you stopped instead, write:  STOPPED | <program> | <what I need to do>

ABOUT ME (the founder)
- Name: {{FIRST_NAME}} {{LAST_NAME}}
- Email for everything: prax@askthemove.online   (never use a gmail address)
- Birthday: {{BIRTHDAY}}   Phone: {{PHONE}}   Based in: {{CITY}}, India
- Current school/work: {{WORK}}
- Background: {{BACKGROUND}}
- Past work: {{PAST_WORK}}
- Links: {{LINKS}}   X: https://x.com/AskTheMove
- Achievements: {{ACHIEVEMENTS}}
- Technical: Yes. Solo founder, no co-founder.
- How I heard: {{HEARD}}

ABOUT THE STARTUP
- Name: AskTheMove   Website: https://askthemove.online   Email: prax@askthemove.online   X: @AskTheMove
- One line (under 50 chars): Chess coach that explains your mistakes
- What it is: AskTheMove is a chess coach for improving players. After a game it finds the moment you went wrong and explains why in plain language. Stockfish produces the facts (legal moves, material, best lines); Claude turns them into a short explanation; the server withholds any answer that cites a move, number or mate the engine did not produce.
- Status: working web app (bot games, full-game review, verified AI explanations). Waitlist live at askthemove.online since October 2026 with {{WAITLIST_N}} sign-ups. No public users yet; private beta next.
- Founded: September 2026. Not incorporated yet (sole founder). Self-funded/bootstrapped, no outside investment, no investors, no revenue. Based in India.
- Customers: improving club chess players, starting in India, who review their games but can't afford a coach.
- Competitors: Chess.com coach and Game Review, Duolingo Chess, Take Take Take. Insight: narration isn't teaching, and unchecked AI narration is wrong often enough to lose trust. We check every claim against the engine first, then teach in a loop: guess the move, see why yours fell short, retry a similar position.
- Engineering: built solo, spec-first, 150+ automated tests.
- Claude use: our server sends Claude the Stockfish evaluation, best line and material change for each critical moment; Claude explains it in a few plain sentences at the player's level; the server rejects any answer citing a move or number the engine didn't produce. Usage is capped per user per hour and per day.
- Help wanted: getting the first 100 real players; learning distribution as a solo founder, starting with chess communities and coaches in India.

TASK: AWS Activate Founders ($1K credits). ONLY run this after Kiro has approved or declined. If I haven't told you Kiro replied, STOP and ask.
1. Open https://aws.amazon.com/startups/credits  Hand over for AWS Builder ID sign-in and account linking. The AWS account must be on the paid tier with a payment method (UPI AutoPay first, debit card as fallback); if it isn't, hand over so I upgrade it myself.
2. Choose Activate Founders. Fill:
- Product: AskTheMove, a web chess coach. Stockfish finds the critical moments in a player's game and Claude explains them in plain language; the server rejects any explanation that cites a move or number the engine didn't produce.
- Target market: Improving club chess players, starting in India, who review their games but can't afford a coach.
- Traction: Pre-launch. Working web app; waitlist at askthemove.online with {{WAITLIST_N}} sign-ups.
- Funding stage: Self-funded. No outside funding. Last funding date: none (leave blank or "N/A").
- Website: https://askthemove.online | Founded: September 2026 | Country: India | AWS Account ID: {{AWS_ACCOUNT_ID}}
3. This form can't be edited after submit: before submitting, show me a summary of every field and wait for "continue". Then submit and log it.
```