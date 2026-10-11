# AskTheMove product review and plan

Oct 9, 2026

## Update, 9 Oct: build first, then apply

**Yes, still apply, once testers are using the hosted app.** The $1,000 credits and the Team year are paused and every application is being re-reviewed, so a working product with real users makes the strongest case, and the Startup Stack and office hours are still worth having. Until then the job is to build: host the app, give the coach a safe Claude budget, and test it privately before the site links to it.

&#91;embedded content: where the key lives · 3 options\]

**Option 2 is my recommendation.** It is the smallest change. The server already builds the evidence, checks every move Claude cites and never logs prompts or keys, so a tester's key simply takes the place of yours for that one call. Option 3 keeps the key off your server, but the checker would have to move into the browser. In both, the key sits in the learner's browser, and Anthropic tells key holders that handing a key to a tool gives its developer access to their Console account, so testers have to trust AskTheMove.

**Who has a key?** Most chess players don't, and getting one means a Console account with prepaid credit. So bring-your-own-key fits testers and keen users. Everyone else uses your key under a daily cap, and later a paid plan (Phase 6).

### What runs today

| Piece | State | Who can use it |
| --- | --- | --- |
| askthemove.online | Live: landing page and waitlist | Anyone |
| The app | Runs from the repo on one computer | Whoever runs it |
| Hosted beta build | Docker image and `docs/deploy-beta.md` ready; tested in a sandbox on 8 Oct, never deployed | Nobody yet |
| The September copy on ChatGPT Sites | Owner-private; Stockfish ran on your Mac through a tunnel | Only you, while the Mac runs |
| Claude coach | Built and covered by tests; no live Claude call yet | Nobody until a key is set |

### Running it on a subscription

| Route | Allowed for hosted AskTheMove? | Source |
| --- | --- | --- |
| Your Claude Pro or Max login answering everyone | No. Anthropic does not let developers "route requests through Free, Pro, or Max plan credentials on behalf of their users". | [Claude Code legal page](https://code.claude.com/docs/en/legal-and-compliance) |
| The monthly API credits that come with Max or Team | Yes. Max 5x includes $100 a month and Max 20x $200, used through a Console API key "to build and run your own applications and agents". They expire each month; Pro has none. | [API credits for subscribers](https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers) |
| Your ChatGPT or Codex plan answering everyone | No. OpenAI prohibits "using one user's subscription to fulfill another user's requests". | [Sign in with ChatGPT terms](https://openai.com/policies/sign-in-with-chatgpt-terms/) |
| Each learner signing in with their own plan | No, for a hosted app. Anthropic offers no sign-in for other apps, and OpenAI requires requests to come from "the user's local runtime or a remote runtime only that user controls". | Both links above |
| Each learner's own Claude API key | Yes. It is billed to their own Console account. | [API key best practices](https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure) |
| Hosting on ChatGPT Sites again | Not for the beta. Sites is in public beta and built for apps that fit its own runtime (last time Stockfish needed your Mac and a tunnel), and OpenAI can unpublish a Site "at any time for any reason". | [ChatGPT Sites terms](https://openai.com/policies/chatgpt-sites-terms/) |

The Max credits link to one Console organization, and you can't change the link yourself, so link the AskTheMove one. At my estimate of 2 to 4 cents an explanation, $100 a month covers roughly 2,500 to 5,000 explanations.

### Dev testing on your Max 20x plan

Your Max 20x plan includes $200 a month of Claude API credits, which Anthropic says are for building "your own apps and agents". That is how your subscription can power AskTheMove while we build, with nothing to buy:

1. On claude.ai, open **Settings > Billing**, find **API credits** and choose **Link organization**.
2. Pick or create the AskTheMove Console organization and accept the credit terms. Anthropic advises signing in to the Console with the same email as your Claude account. Only support can change the link later, so link the organization you will build and apply with.
3. In the Console, create an API key (keys are free) and put it in the app's `.env` file as `ANTHROPIC_API_KEY`. Never paste it into a chat.

The credits expire each month and don't roll over. Unless you buy credits or turn on auto-reload, requests simply stop when they run out and your plan is never charged, so the worst case is the coach falling back to the engine summary. At my estimate of 2 to 4 cents an explanation, $200 covers about 5,000 to 10,000 explanations a month: enough for you and friends and family. Sources: [API credits for subscribers](https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers), [the help article](https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-and-team-plans).

To see the coach working on your Mac (Node 24 or newer), as the README describes, then open http://127.0.0.1:8770, sign up, analyse a move and press **Explain why**:

```sh
brew install stockfish
git clone https://github.com/praxstack/ChessLab && cd ChessLab
npm ci
cp .env.example .env   # then add your ANTHROPIC_API_KEY line to .env
npm run dev
```

### Sign in with ChatGPT

Since 29 September, a ChatGPT Plus or Pro user can let a participating app use their plan for its AI. It can't be on from day one for AskTheMove:

- **Approval first.** "If you're building a paid or remotely hosted app, join the waitlist to request access before offering it to users." OpenAI publishes no criteria or timeline, and its plan-usage partners so far are companies such as Notion, Vercel, Devin and Warp.
- **Where the token may live.** "Requests must originate from the user's local runtime or a remote runtime only that user controls," and the docs say "Keep tokens out of browser storage." That rules out both our server and our web page until OpenAI agrees a hosted setup.
- **Self-serve only works locally.** The self-serve sign-in needs a callback to `127.0.0.1` on the learner's own computer.
- **It runs GPT models, not Claude.** The coach would need a second provider, and the checker would need re-testing against GPT's answers.
- **No paywall on it.** "Users must be able to use their ChatGPT plan through SIWC without paying you," though you can charge for other features.

The interest form asks for a work email, your name, a company name, a website, which capability you want ("Sign in and ChatGPT plan use for AI requests") and a short product description. It asks for no proof of a registered company. Sources: [cookbook](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt), [terms](https://openai.com/policies/sign-in-with-chatgpt-terms/), [sessions guide](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions), [interest form](https://openai.com/form/sign-in-with-chatgpt-interest/).

### The September copy

On 7 September, ChessLab (before the rename) was published privately on ChatGPT Sites, OpenAI's tool for publishing small web apps, at a private chatgpt.site address. Only your ChatGPT account could open it. The page lived on OpenAI's servers, but the real server, Stockfish and the database ran on your Mac behind a protected tunnel, so it worked only while the Mac and the tunnel were running. It had no AI coach; that arrived on 8 October. The records are in `docs/application-verification.md`.

### Testing before the site links to it

1. **Automated tests with a stand-in for Claude**: a good key, a wrong key, an empty balance or a reached spend limit, an overloaded API, and no key, plus a check that the key never appears in logs or responses. They run on every change.
2. **Your machine with real keys**: your own key, plus a key from a separate Console workspace with its own small spend limit and a one-day expiry, standing in for a tester's key. When it expires, you see the "key refused" path for real.
3. **Private staging**: the same Docker image at app.askthemove.online behind invite codes, bring-your-own-key switched on, and no link from the site. A few invited testers use their own keys.
4. **Release**: the site's "Join the beta" points at the app only after staging passes the checklist in `docs/deploy-beta.md`.

### What changes in the plan

- **Phase 1, the waitlist**: the site is live. Posting on X and LinkedIn waits for Phase 3, so the launch shows something people can use. That's my default, since you'd rather build first.
- **Phase 2, a safe beta**: the Claude budget becomes your Max credits for you and a friends-and-family invite code, a daily cap per person, a bring-your-own-key switch for everyone else, and a provider switch so ChatGPT can slot in once OpenAI approves. Testing steps 1 and 2 happen here.
- **Phase 3, the hosted beta**: testing steps 3 and 4, then the Claude for Startups application.
- Phases 0, 4, 5 and 6 are unchanged.

## Where things stand

The waitlist site is live on askthemove.online, but the app itself isn't hosted anywhere yet and the coach hasn't made a live Claude call. PR #26, with the Phase 0 fixes, waits on your merge.

**The X account.** I couldn't open x.com from here, because this environment's network blocks it. Send me a screenshot of the profile and I'll check it properly. Until then, here is what a brand account needs:

| Field | What to put | Why |
| --- | --- | --- |
| Name | AskTheMove | Matches the handle and the domain |
| Photo | The site's logo mark (`site/public/icon-512.png`) | Same mark as the browser tab, so people recognise it |
| Header | A still of the board from the demo video | Shows the product in one look |
| Bio (147 of 160) | A chess coach that shows you why your move was a mistake. Stockfish finds the facts, Claude explains them in plain words. Free beta waitlist below. | Says what it does and who explains it |
| Website | `askthemove.online`, added only once the site is live | A dead link on day one costs trust |
| Contact | `hello@askthemove.online` | Keeps your own address private |
| Pinned post | Post 1 of the launch thread, with the demo video | The first thing a visitor sees |

The launch kit was written for your personal account. With a brand account, post the thread from @AskTheMove, then repost it from your own account, where your followers already are.

**Open PRs.** ChessLab has none. Yesterday #17, #19, #21 (landed via #22), #23 and #18 merged, and the September PRs #2 to #16 were closed. Praxmodoro has five:

| PR | State | What it is | Suggested next step |
| --- | --- | --- | --- |
| [#63](https://github.com/praxstack/Praxmodoro/pull/63) | Ready | Audit fixes: test-runner diagnostics and a wake chime. Includes #60's two commits | Review, then merge after #62 (one-line conflict expected) |
| [#62](https://github.com/praxstack/Praxmodoro/pull/62) | Draft | Fixes the launch hang on macOS 27. Includes #59's test fix | Waits, as you chose. Open the app once from Finder to confirm the window |
| [#61](https://github.com/praxstack/Praxmodoro/pull/61) | Draft | The Praxmodoro waitlist site | Waits for Praxmodoro's launch |
| [#60](https://github.com/praxstack/Praxmodoro/pull/60) | Draft | Test-pin and diagnostics fix (opened by a bot) | Close: superseded by #63 |
| [#59](https://github.com/praxstack/Praxmodoro/pull/59) | Draft | Relaunch-test fix (opened by a bot) | Close: superseded by #62 |

## Product at a glance

AskTheMove today is a broad, well-tested chess workspace that nobody can use yet, because nothing is deployed. Its breadth is close to a small Chess.com. Its difference, the tutor loop, is mostly unbuilt.

&#91;embedded content: AskTheMove today · built, partly built, not built\]

Follow the dots. The tutor-loop steps that are built are the analysis half: import, review and branch. Every step that turns analysis into learning sits in the right two columns.

Three things are true at once:

- **It works.** 147 automated tests, a careful coach pipeline that can't show an unchecked claim, and original art and bots.
- **It isn't live.** The app, the hosted beta and the waitlist site are all undeployed, and the coach has never made a real Claude call.
- **It isn't different yet.** My read: most of what a learner can do today, they can do on Lichess for free (analysis, studies, puzzles, explorer). What they can't get anywhere is a coach that makes them predict, explains why they were wrong, and checks a week later that it stuck. That part isn't built.

## Requirements, re-read

The requirements describe a tutor that makes you predict, explain and retry. What is built is a strong analysis board with an "Explain why" button. 21 of the 25 OpenSpec changes have shipped to main, but the one that holds the tutor loop, `explore-one-mistake`, has 0 of its 9 tasks done. Most of the work since went into Chess.com-style breadth: puzzles, Rush, openings, explorer, Chess960, vision and endgames.

### How to read them

There are three layers, and they don't carry the same weight.

| Layer | Where | What it holds | How to use it |
| --- | --- | --- | --- |
| Product intent | `CONTEXT.md` | Goal, persona hypothesis, non-goals, dated changes of direction | Governs. Read it first. |
| OpenSpec changes | `openspec/changes/` | 25 changes, 109 requirements, 199 tasks (177 done). `openspec/specs/` is empty, so there is no merged spec. | Governs, but only as 25 separate deltas, two of them superseded. |
| BRD | `docs/research/sources/supplied-master/chesslab-atlas/BRD.md` | 180 functional and 35 non-functional requirements across 18 domains, 6 personas | Reference only, by its own README. Read the tutor domain (FR-061 to FR-072, plus FR-099) as the spine. Treat the rest as a menu. |

The BRD is written for a full chess platform: live play, daily games, community, tournaments, events and memberships. AskTheMove is deliberately not that yet. Its north star (BRD section 3.1) is the part to hold on to: play, pick a confusing moment, **state a prediction before the answer**, branch, compare, return, then **a teach-back or delayed related retry**, so that "understood" means more than having read some prose.

### The tutor spine against the code

| BRD requirement | Status | Evidence |
| --- | --- | --- |
| FR-061 History-bearing node | Built | Each branch stores its full move history (`web/src/chess-state.js:26`) |
| FR-062 Nested branches | Built | Branches carry a `parentId`, so alternatives nest inside alternatives |
| FR-063 Stable return anchors | Built | "Return to game · ply N" (`web/src/main.jsx:350`) |
| FR-064 Node-attached questions | Partly | The question is saved as a note. The screen says the coach "does not answer free-form chat" (`main.jsx:350`) |
| FR-065 Why, what-if, compare | Partly | "Explain why" and "Why not \<move>?" exist. There is no side-by-side comparison of two lines |
| FR-066, FR-067 Evidence and board-text agreement | Partly | The server checks cited moves, numbers, material and mate claims against engine evidence, but not move order, squares or defenders (`docs/deploy-beta.md:122`) |
| FR-068 Misunderstanding model | Missing | Nothing captures a prediction before the reveal |
| FR-069 Teach-back | Missing |  |
| FR-070 Spaced related retry | Missing | `review-practice` retries the same moves straight away, not related positions later |
| FR-071 Share and fork a study | Partly | Study files export and import; there is no share link |
| FR-072 Creator workspace | Missing | A later (P2) item |
| FR-099 Mastery and retry policy | Missing |  |

Counted another way: of the seven steps in the intended loop (import, pick the move, predict, inspect, branch, return, retry later), five are built. The two that are missing, predict and retry later, are the two that turn analysis into learning.

### Five gaps a paying learner would hit

1. **No learning loop.** No prediction before the reveal, no teach-back, no retry on a related position later. This is the stated differentiator (`CONTEXT.md:7-9`).
2. **The coach is thin and unproven.** It answers two kinds of question, saves the rest as notes, and has never made a live Claude call (task 2.6 in `hosted-beta-readiness`).
3. **No account basics.** No password reset, email verification, account deletion or data export, and no privacy notice inside the app, even though positions are sent to Anthropic (`docs/deploy-beta.md:120`).
4. **Getting games in is manual, and nothing remembers you.** Only pasted PGN or a small file, with no Chess.com or Lichess username import and no record of the mistakes you keep making.
5. **Nothing to pay for yet.** Billing is off (`server/app.mjs:110`) and the AI limit is per hour, held in memory. The hosted image also ships only Stockfish 18, with no puzzles, explorer, tablebases or human-like Maia bots (`docs/deploy-beta.md:43-47`), so a beta tester gets far less than the README describes.

### Contradictions to clean up

- **Local or hosted?** `README.md:15` and `CONTEXT.md:63` say delivery targets the local server; `CONTEXT.md:13` and the hosted-beta proposal say the hosted beta supersedes that.
- **Chess.com parity.** Eight changes still describe a parity or "clone" goal with no note that `original-asset-pack` dropped it.
- **Stale counts and claims.** The README says "six lessons, six puzzles" while the local build has 12 lessons and 6.1 million puzzles. It promises ten engine configurations; the hosted image has one.
- **Coach status.** The proposal says "Implemented"; the landing page says "In development". The landing page is the accurate one.
- **Openings.** The landing page says AskTheMove "isn't built for memorising opening theory", yet two shipped changes build an opening library and explorer.
- **Repo visibility.** README says private; `original-asset-pack` talks about "the public repository", and the decision to make it private or purge its history is still open.

The full per-change table and all 16 contradictions are in the review notes, `askthemove/review/requirements.md` in the project files.

## Design system and UX review

The landing site has a real design system. The app doesn't, and the two look like different products. A few problems are ones a chess player will notice within seconds, starting with the board itself. I ran the app locally and took 41 screenshots; the two below are from that run.

### Fix before anyone sees it

&#91;image: The app's game review: a1 is drawn light, a queen blunder that missed mate in one gets a green exclamation mark, and the explanation is an engine printout\]

1. **Every board is drawn with its colours swapped.** a1 is light and h1 is dark, on every theme (`web/src/Board.jsx:23`). "Light on the right" is the first thing anyone learns about a chessboard. **The launch demo video shows it too** (for example at 0:51), so the video needs re-recording after the fix.
2. **A missed mate is coloured as good.** Above, Qg6 hangs the queen when Qxf7 was mate in one, and it gets a green "!" and a "Mate sequence" label.
3. **The explanation is an engine printout.** "Sample line: hxg6 → Nc3 → … Estimated loss: 946 centipawns for White." It never says that the h7 pawn attacks g6. When Claude is unavailable, the same paragraph appears a second time underneath.
4. **Dead ends with no reason.** Play is disabled with no message when no opponent engine is installed. The puzzle page says "A full local collection, ready when you are" right above a line saying the catalogue isn't installed.

### Two brands

&#91;image: The landing site on the left: light paper, serif type, blue ink and red pen. The app on the right: dark slate, system sans and teal\]

|  | Landing site | App |
| --- | --- | --- |
| Look | A coach's notebook: light paper, quad ruling, red margin | A dark slate "analysis room" |
| Type | Vollkorn, Courier Prime for engine numbers, Kalam for the coach's hand | System fonts, so it changes on Windows and Linux |
| Colour roles | Blue ink for the one action, red pen for mistakes | Teal for actions; red, orange and yellow for move grades |
| Board | Book diagram, correct colours | Flat, colours swapped |
| Logo | A blue "?" circled in red | A white knight wordmark, plus a different teal "?" favicon |

The app does several things `site/DESIGN.md` lists as do-not-ship, including the dark analysis room and Chess.com-style move-quality badges. Someone who joins from the site will land in what looks like a different product. My recommendation is that the app adopts the notebook: it matches the coaching promise and it's the stronger identity.

### The design system as code

- **Site:** real tokens for colour, type, spacing, radius and motion in `site/public/assets/app.css`, documented in `site/DESIGN.md`, with no stray hex values.
- **App:** one 103 KB stylesheet, dark only, with 10 variables against 500 hard-coded hex colours (382 different ones), 38 font sizes and 22 corner radii. Two variables, `--text` and `--text-muted`, are used but never defined. Board, arrow and mark colours are hard-coded in JavaScript.
- **`design/`:** an archive gallery with a third, blue look still labelled ChessLab. Nothing in it feeds the app.

The fix is one tokens file shared by both: base colours, then roles (surface, ink, action, mistake, coach, engine, focus), then component tokens (board squares, highlights, arrows by meaning). Both the site's and the app's CSS variables are generated from it, with about seven type sizes, a 4-point spacing scale and three radii.

### The loop on screen

- After a game, review opens on the bot's last move, not your worst one.
- The game report leads with centipawns, which is jargon for an 800 to 1600 player.
- Six practice and branch actions sit side by side, and none is presented as the next step.
- Tool pages open with marketing headlines before the board.
- Copy says "On this Mac" even on a server. The menu links to "Research" and "Design archive", which open pages titled ChessLab, and the file dialogs show `.chesslab.json`.

### Mobile and accessibility

- On a phone, the Play button is about 1,400 pixels down the first screen.
- In review you can't see the board and its explanation at the same time.
- The drawing tools say "Right-drag" on touch screens, and the seven-item tab bar wraps.
- The keyboard focus ring on dark squares measured 2.4:1 against the 3:1 minimum, the side panel uses 9 to 10 pixel text, and screen readers aren't told when the bot moves.

The full review and all 41 screenshots are in `askthemove/review/design-system.md` and `askthemove/review/screens/` in the project files.

## Architecture review

The shape is right for a small invited beta: one Node process, one SQLite file, a Stockfish process per search, Claude only for explanations, and a separate static waitlist site on Cloudflare. The risks before real users arrive are capacity, cost and operations, not the core design.

### How it fits together

- **Browser:** a React 19 single-page app built with Vite.
- **Server:** Node with Express 5, about 65 JSON routes, a login cookie and an invite gate.
- **Data:** one SQLite file. Most records are stored as JSON blobs, and there are no schema migrations.
- **Engine:** a fresh Stockfish process for every search, two at a time for the whole server, with up to eight waiting (`server/engine.mjs:64`).
- **Coach:** the Anthropic SDK. Claude sees only evidence the server builds; the learner's own words never reach it.
- **Hosting:** one Docker container with Stockfish 18, behind a TLS proxy. The host isn't chosen and nothing is deployed.
- **Waitlist site:** Cloudflare Pages with a D1 database, with no runtime link to the app.

### The coach pipeline

This is the part that makes AskTheMove trustworthy, and it is built carefully.

1. Stockfish analyses the position. The result is kept in memory for 30 minutes.
2. The server turns the engine lines into a structured evidence bundle and a list of what the answer is allowed to mention.
3. Claude gets a fixed, cached system prompt plus that evidence, with a 15-second timeout and a limit of 30 explanations per account per hour.
4. The answer is checked against the evidence: cited moves, numbers, material and mate claims.
5. If the answer fails the check, is too long or the call fails, the learner sees the engine's own plain summary instead.

The estimated cost is about one to three cents per explanation, but nobody has measured it: token usage isn't logged and no live call has been made yet.

### What is strong

- Security basics are better than usual at this stage: hashed session tokens, strict same-site cookies, origin checks, a strict content security policy, a non-root container and a checksum-pinned engine download.
- The coach can't show an unchecked claim, and every failure falls back to something true.
- 147 automated tests. On this machine 132 pass; the other 15 need Stockfish or other local tools that aren't installed here. The site's 66 tests all pass.

### Risks, ranked

| # | Risk | Evidence | Fix | Size |
| --- | --- | --- | --- | --- |
| 1 | One user can block the engine for everyone | Searches of up to 90 seconds on 8 threads are accepted while the whole server has two slots. The public status check also takes a slot (`server/engine.mjs:263`) | Cap time and threads in hosted mode, one job per user, cache the status | Small |
| 2 | No ceiling on Claude spend | Quotas are per account, and invite codes are shared, so anyone with a code can make more accounts (`server/security.mjs`) | Log tokens, set a daily and monthly budget, single-use invites, cache verified answers | Small |
| 3 | No continuous integration | There is no `.github` folder; tests run on one machine | Run tests with Stockfish, the site tests, a Docker build and OpenSpec validation on every PR | Small |
| 4 | Fragile operations | No migrations, limits held in memory, manual backups, no monitoring; `/healthz` checks only the database | Migrations, limits in SQLite, automated backups, error tracking, uptime checks | Medium |
| 5 | No account lifecycle or in-app privacy notice | No password reset, deletion or export; the site's privacy page covers only the waitlist and doesn't mention Anthropic | Admin reset and delete tools first, then self-service; a privacy notice in the app | Medium |

### Code health

- `web/src/main.jsx` is 71 KB with 56 `useState` hooks, and `server/app.mjs` is 34 KB. Split both before the tutor loop lands, because it will touch both.
- There are two engine drivers and three copies of the piece-value table.
- Internal names still say ChessLab: the cookie, environment variables, database file and study format. This needs one decision (task 3.2 in `rename-askthemove`).
- The old private-tunnel code (`server/sites-worker.mjs`, `server/hosting.mjs`) can go.

### What the architecture needs for the product to grow

- **The tutor loop needs real data.** Predictions, misconceptions and a retry schedule are per-learner records you'll query, so they need proper tables and migrations, not JSON blobs.
- **A conversational coach needs the learner's words to reach Claude.** That means guarding against prompt injection and off-topic use, and checking answers against evidence that the question itself may change.
- **A paid plan needs metering.** Token logging and per-plan limits come before any price.
- **Username import is straightforward.** Lichess and Chess.com both offer public game-export APIs, so "enter your username" can replace pasting PGN.

The full review, including the data model and the cost estimate, is in `askthemove/review/architecture.md` in the project files.

## What would make it a good product

My recommendation: narrow the promise to one loop and make that loop excellent. AskTheMove should be **the coach that remembers your mistakes and makes sure you understand them**. Explanations alone are not enough to stand on. Chess.com's Game Review already narrates moves with a coach, Aimchess builds training from your games, and Chessable sells spaced repetition, but on prepared courses rather than your own mistakes. I haven't found a product that ties all three together around what the learner believed at the board. That combination is the gap, and it is also what your own requirements already describe. (This is my read of the market from what I know, not fresh research.)

### The loop, as the product

&#91;embedded content: the tutor loop · 8 steps, coloured by status\]

The top row is one sitting with one game. The bottom row is what makes it a habit, and it is almost all unbuilt.

1. **Bring your game.** Type your Lichess or Chess.com username instead of pasting PGN. Both sites offer public game exports.
2. **AskTheMove picks the moment.** Full game review already finds the key moves, so the learner doesn't hunt for them. One to three moments per game, not twenty.
3. **Predict first.** Before anything is revealed, the learner commits: which move they feared, or what they expected after their own move. Make it a move on the board or a choice of ideas, not free text, so the server can still check everything the coach says.
4. **Explain the gap.** Claude explains why *their* expectation failed, using the engine evidence. This is where Claude adds something an engine can't: it talks to the learner's belief, not just the best move.
5. **Challenge it.** "What if they play this instead?" Branches inside branches, already built.
6. **Name the idea.** The learner picks or writes the idea in a few words (an overloaded defender, a back-rank weakness), which tags the moment with a theme.
7. **Prove it stuck.** Days later, a *related* position with the same theme comes back. The 6.1 million Lichess puzzles are already tagged with 73 themes, so the retry engine can be built from a catalogue you already have.
8. **Remember the pattern.** A short list of "mistakes you keep making", built from the tags, which drives the retry queue and becomes the reason to come back and, later, to pay.

### What changes because of it

- **Puzzles stop being a separate feature and become the retry engine.** Bots become "play this position again". Openings, Rush, Vision and Chess960 stay in the code but move out of the main path for the beta, so a new learner sees one clear thing to do.
- **The landing page can make a sharper promise** once steps 3 to 7 exist: understand your mistake, then prove it stuck.
- **Claude does real work**, explaining beliefs and checking teach-backs, which also gives the Claude for Startups application genuine, growing API usage to point to.

### How you'll know it's good

| Signal | Measure |
| --- | --- |
| Activation | Share of new testers who import a game and finish one full loop in their first session |
| Learning, the north star | Share of delayed related retries solved: "I can now calculate that trade", measured |
| Retention | Testers who come back in week two for their retry queue |
| Coach quality | Share of Claude answers that pass the evidence check, plus a thumbs up or down on each |
| Cost | Tokens and dollars per explained mistake |

### Risks to test, not assume

- **The persona is unvalidated.** The 800 to 1600 adult improver is a hypothesis in `CONTEXT.md`. The first 10 to 20 testers should be watched, not just counted.
- **Claude's quality is unknown.** No live call has been made. A 50-position test should come before any invite.
- **Prediction can feel like homework.** If committing first annoys people, they'll skip it. It needs to take one tap, and the beta should measure how often it is skipped.

## The plan

Seven phases, each ending at a gate you can check. No dates, because the order matters more than the speed and I can't see how much time you have each week.

&#91;embedded content: the plan · 7 phases, 6 gates\]

### Phase 0 is the urgent one

The board's colours are swapped in the app and in the launch video. Fixing it is a one-line change plus a test. I'd bundle it with three other small fixes chess players would notice: a missed mate graded as good, the repeated fallback paragraph, and the silent dead ends. Then the demo video gets re-recorded with the same footage plan. The site itself is fine, since its board is drawn correctly.

**Update:** the board fix is up as [draft PR #24](https://github.com/praxstack/ChessLab/pull/24), with a test that fails on the old code. I checked it in the running app: a1 and h8 are dark, h1 and a8 are light.

### What each phase needs from you

| Phase | Claude does | You do |
| --- | --- | --- |
| 0. Fix what players notice | The PR and the new recording | Merge it |
| 1. Launch the waitlist | Done: the site is live; the X kit waits for Phase 3 | Post on X and LinkedIn when Phase 3 opens |
| 2. Make the beta safe | Engine limits, a daily Claude cap, a bring-your-own-key switch, CI, privacy notice, admin reset | Create the Console API key and a test workspace; approve the test budget |
| 3. Open the hosted beta | Deployment scripts, backups and private staging for your chosen host | Pick and pay for the host; send invites; then apply to Claude for Startups |
| 4. Build the loop | A new OpenSpec change, then the code, PR by PR | Review each PR; watch testers |
| 5. Make it stick | Retry queue, weakness list, reminder | Decide how reminders are sent |
| 6. Something to pay for | Metering and plan limits | Choose the price and the payment provider |

### What I would stop doing

- **No more breadth until the loop exists.** Puzzles, Rush, Vision, openings and Chess960 are already more than a beta needs.
- **No Chess.com parity work.** `original-asset-pack` already dropped that goal. The eight changes that still mention it should say so.
- **No new screens in the old dark style.** Every screen built from Phase 4 on uses the shared tokens, so the app converges on one design instead of growing a third.

## Questions only you can answer

Each one takes a word. My recommendation is in bold.

1. **Make the tutor loop the beta's one job?** **Yes**, or no. Yes means the plan above; no means we deploy what exists and keep adding breadth.
2. **Where should the app run?** **A small x86 VPS with Docker and Caddy**, Fly.io, or Render. Stockfish is CPU-bound, a VPS gives the most dedicated CPU for the money, and option A in `docs/deploy-beta.md` is already written for it.
3. **The repository: private, or purge the old Chess.com art from its history?** **Private.** It is reversible and needs no history rewrite.
4. **Rename the internal ChessLab names (login cookie, study file format, database file) before the first deploy?** **Yes.** Nobody uses it yet, so nothing breaks; after launch it means logging everyone out.
5. **Move Rush, Vision, Chess960 and the opening tools out of the main menu for the beta?** **Yes.** They stay in the code and come back when the loop is solid.
6. **A budget for the 50-position coach test once your Console API key exists?** **Up to $5.** The estimate is one to three cents per explanation, so 50 positions should cost a dollar or two.
7. **Close Praxmodoro #59 and #60, which #62 and #63 replace?** **Close**, or keep.
8. **Should the app take the landing site's notebook look?** **Yes**, or keep the dark app and redraw the site instead. The notebook matches the coaching promise and is the stronger identity.

And one request: a screenshot of the @AskTheMove profile, since X doesn't load from here, so I can check the name, photo, bio and link against the launch kit.
