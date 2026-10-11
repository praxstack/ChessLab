# AskTheMove requirements inventory: what we said we'd build vs. what is built

Review date: 2026-10-09. Source: read-only checkout of `praxstack/ChessLab` main at `/home/claude/chesslab-review`. All paths below are relative to the repo root. Line numbers are `file:line`.

Method: I read every requirement source listed in section 1, counted requirements and tasks in all 25 OpenSpec changes, and checked the main feature of each change against `server/`, `web/`, `shared/` and `site/`. I did not run the test suite because `node_modules` is not installed and package installation was out of scope. "Shipped" means the feature's code is on main and wired into the UI or API. It does not mean the feature is deployed, which nothing is.

---

## 0. Summary

| Metric | Value |
| --- | --- |
| OpenSpec changes | 25 active, 0 archived (`openspec/changes/archive/` is empty, `openspec/specs/` is empty) |
| Requirements (`### Requirement`) | 109, with 135 scenarios |
| Tasks | 177 done / 199 total (22 open) |
| Status counts | **Shipped 21 · Mostly shipped 2 · Partial 0 · Not started 0 · Superseded 2** |
| Deployed anywhere | No. The app, the hosted beta and the waitlist site are all undeployed (`docs/deploy-beta.md:3`, `site/README.md:5`) |

The main finding is that the work order and the product goal point in different directions. The core tutor loop, *predict → explain → challenge → return → check learning later* (`CONTEXT.md:7-9`), is the only OpenSpec change with **0 tasks done** (`explore-one-mistake`, 0/9). Most later changes added Chess.com-style breadth: puzzles, Rush, openings, explorer, Chess960, Vision, endgames and collections.

---

## 1. Requirement sources found

| Source | Kind | Authority |
| --- | --- | --- |
| `CONTEXT.md` | Product intent, persona hypothesis, dated direction changes, domain vocabulary, non-goals | Governing (`AGENTS.md:3`) |
| `openspec/changes/*/` (25 changes) | Proposals, 3 design docs (`explore-one-mistake`, `build-coach-web-platform`, `expand-bot-platform`), specs, tasks | Governing; "OpenSpec is the sole product specification system" (`AGENTS.md:13`, `docs/agents/issue-tracker.md:5`) |
| `openspec/config.yaml` | Project context and spec rules | Governing |
| `README.md` | Product summary, scope, deferred items | Descriptive |
| `AGENTS.md`, `CLAUDE.md` | Working agreement; "preserve the user's full branching-tutor objective" (`AGENTS.md:3`) | Process |
| `docs/application.md` | Behaviour reference and current limits | Descriptive |
| `docs/deploy-beta.md` | Hosted-beta operations and known gaps | Descriptive |
| `docs/local-workspace.md` | Local install and feature-by-feature behaviour | Descriptive |
| `docs/adr/0001, 0010, 0011, 0012` | Engine, Chess960, Vision and endgame decisions (0002–0009 do not exist) | Decided |
| `docs/research/assessment.md` | Persona hypothesis, first journey, validation experiment | "Not an approved product specification" (`assessment.md:3`) |
| `docs/research/nonmultiplayer-parity.md` | Chess.com parity ledger | Historical; superseded (`:5`) |
| `docs/dossier/*.md` (overview, product, market, pricing, investor, architecture, delivery, discussion, application, library) | Product brief, persona, pricing tests, investor diligence | Mostly historical, with "Update" banners |
| `docs/research/sources/original-conversation.md` | Founder's original request in his own words | Primary intent evidence |
| `docs/research/sources/startup-research.md` | Supplied startup report (TAM, pricing, roadmap) | Untrusted reference (`AGENTS.md:5`) |
| `docs/research/sources/learning-products.md` | Competitor learning products and prices | Untrusted reference |
| `docs/research/sources/supplied-master/chesslab-atlas/BRD.md` | **Full BRD**: 180 FRs (FR-001–FR-180), 35 NFRs, 6 personas, phases A–E, risk register | Untrusted reference; "not authority to change the accepted OpenSpec requirements" (`supplied-master/README.md:7`) |
| `docs/research/sources/supplied-master/chesslab-atlas/research/requirements.csv` | 215 requirement rows | Untrusted reference |
| `docs/research/sources/supplied-master/chesscom-product-atlas/{brd,prd,prfaq,spec}.html.txt` | Chess.com-parity BRD/PRD/PR-FAQ/spec prototypes | Untrusted reference; parity goal superseded |
| `site/pages/index.html`, `site/pages/terms.html` | Public positioning, persona, "works today" claims, price promise | Public-facing commitments (not deployed) |
| `server/coach-explain.mjs:16` | System prompt names the persona | Implemented assumption |
| `references/` | Engine, hosting and dataset receipts | Evidence, not requirements |

---

## 2. Per-change inventory

Status key: **Shipped**: the feature's code is on main and wired. **Mostly shipped**: code exists, but a requirement-level verification or deployment step is still open. **Superseded**: a later decision replaced it.

| # | Change | One-line purpose | Reqs (ID prefix) | Tasks done/total | Status | Code evidence (spot-checked) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `explore-one-mistake` | First experiment: import a PGN, nested branches, prediction + question at a node, compare two lines, return, export | 6 (CL-) | 0/9 | **Superseded** (core never built) | Partly realised elsewhere: nested branches/return in `web/src/chess-state.js` (`addBranch`, `rootAnchor`); study file `server/study-format.mjs`. **Not built:** structured prediction-before-reveal, compare-two-lines (only "Compare before move", `web/src/main.jsx:346`), educator corpus, learner study | `build-coach-web-platform/proposal.md:24` declares it historical. Still sits in `changes/`, not archived. Its learner-loop requirements (CL-003 compare, CL-004 prediction) have no successor |
| 2 | `build-coach-web-platform` | First real app: accounts, legal bot play, server Stockfish review, variations, PGN, 6 lessons + 6 puzzles | 7 (CP-) | 7/7 | **Shipped** (visual/parity parts superseded) | `server/app.mjs` (routes `:113` register, `:207` games, `:361` analyze), `server/engine.mjs`, `server/content.mjs` | README `:37` still calls it "the current OpenSpec change" |
| 3 | `expand-bot-platform` | Multi-engine bots (SF19/18/Lite/16, Lc0, Maia2/3), roster, clocks, hints, undo, adaptive, crowns | 6 (BP-) | 7/7 | **Shipped** (roster/crowns replaced by OA) | `server/opponent-engines.mjs`, `server/bot-game.mjs`, `web/src/BotSetup.jsx`, `/api/games/:id/hint\|undo\|assist` (`server/app.mjs:258-275`) | Hosted Docker image has only Stockfish 18 (`docs/deploy-beta.md:43-46`) |
| 4 | `match-nonmultiplayer-platform` | One-to-one Chess.com non-multiplayer parity, observed 166-bot roster, private Sites hosting | 4 (none) | 8/10 | **Superseded** | Remnants: `server/sites-worker.mjs`, `server/hosting.mjs:3` (PUBLIC_ORIGIN tunnel guard); analysis engine/lines/threads settings in `server/engine.mjs` | `original-asset-pack/proposal.md:20` supersedes 2 of 4 requirements; Sites tunnel replaced by Docker beta |
| 5 | `local-web-first` | Move app + archives to the founder's Mac, polish bot picker, Pstack-governed proof + PR | 3 (none) | 15/15 | **Shipped** (direction superseded in part) | `server/index.mjs:9-11` (serves `/research`, `/design`), `scripts/local_snapshot.py`, `scripts/check_local_server.mjs` | Parity goal superseded by OA. Hosting direction superseded by `hosted-beta-readiness` (`proposal.md:5`). `tasks.md:35` still says "full goal remains active until the original parity objective is verified" |
| 6 | `full-game-review` | Whole-game report: advantage graph, per-colour classification, key moves, pause/resume | 3 (none) | 7/7 | **Shipped** | `server/game-review.mjs`, `web/src/GameReview.jsx`, `POST /api/games/:id/review` (`server/app.mjs:335`) | Centipawn summary, not an accuracy metric |
| 7 | `position-practice` | Play a bot from any reviewed position or branch, keeping history; return to source | 3 (none) | 7/7 | **Shipped** | `POST /api/games/:id/practice` (`server/app.mjs:211`) | |
| 8 | `position-editor` | Set up a position / load FEN → separate study, analysis, practice | 3 (none) | 5/5 | **Shipped** | `web/src/PositionEditor.jsx`, `shared/position.js`, `POST /api/positions` (`server/app.mjs:306`) | |
| 9 | `opening-library` | 3,810 named CC0 lines, search/ECO, playback, practice, recognition in review | 3 (none) | 6/6 | **Shipped** | `server/openings.mjs`, `server/openings.json` (3,810 entries), `web/src/OpeningLibrary.jsx`, `/api/openings/recognize` | |
| 10 | `puzzle-training` | Full local Lichess CC0 catalogue (6.1M puzzles, 73 themes), custom training, attempts | 3 (PT-) | 6/6 | **Shipped** (local only) | `server/puzzle-training.mjs`, `web/src/PuzzleTraining.jsx`, `scripts/import_puzzles.py` | Catalogue not in the Docker image (`docs/deploy-beta.md:47`) |
| 11 | `rated-daily-puzzles` | Local Elo puzzle rating (1500, K=32), Standard/Hard/Extra Hard, shared daily puzzle + streaks | 3 (PM-) | 6/6 | **Shipped** | `server/puzzle-training.mjs:44-55` (`puzzle_profiles`, `daily_puzzles` tables) | |
| 12 | `puzzle-rush` | 3-min / 5-min / Survival rush with server-owned clock and bests | 3 (none) | 6/6 | **Shipped** | `server/puzzle-rush.mjs`, `web/src/PuzzleRush.jsx`, `/api/rush/*` (`server/app.mjs:291-295`) | |
| 13 | `learning-path` | 4 levels, 12 original lessons, 24 board challenges, lesson library | 4 (none) | 6/6 | **Shipped** | `server/curriculum.json` (4 courses, 12 lessons), `server/course-progress.mjs`, `web/src/LearningPath.jsx` | |
| 14 | `game-collections` | Account-private named collections; search/filter/sort My games | 3 (none) | 5/5 | **Shipped** | `server/game-collections.mjs:32-55`, `web/src/GameLibrary.jsx` | |
| 15 | `annotated-studies` | Comments + NAGs per node; PGN with variations; exact `.chesslab.json` study file | 4 (none) | 5/5 | **Shipped** | `server/study-format.mjs`, `web/src/PositionNotes.jsx`, `POST /api/import-study` (`server/app.mjs:312`) | |
| 16 | `board-annotations` | Persistent per-node arrows/highlights, keyboard/touch tools, PGN `%cal/%csl` | 4 (none) | 5/5 | **Shipped** | `shared/board-marks.js`, `web/src/BoardDrawingTools.jsx` | |
| 17 | `review-practice` | Retry the key mistakes from a completed review, with hints and private progress | 4 (none) | 5/5 | **Shipped** | `server/review-practice.mjs:65-70`, `web/src/ReviewPractice.jsx` | Immediate retry of the same positions, not delayed/related transfer |
| 18 | `opening-explorer` | Move statistics from Lichess Elite Nov-2025 corpus + "My games" | 4 (none) | 5/5 | **Shipped** (local only) | `server/opening-explorer.mjs`, `web/src/OpeningExplorer.jsx`, `/api/explorer` (`server/app.mjs:149`) | Corpus not in Docker image |
| 19 | `add-chess960` | Chess960 bot play, castling, PGN/study, editor, practice | 3 (none) | 7/7 | **Shipped** | `chessops@0.15.1` in `package.json:19`; `shared/chess.js`, `web/src/BotSetup.jsx`; `server/chess960.test.mjs` | |
| 20 | `add-vision-training` | 30-second coordinate/move vision rounds with server-owned clock | 3 (none) | 11/11 | **Shipped** | `server/vision-training.mjs:31-39`, `web/src/VisionTraining.jsx` | |
| 21 | `add-endgame-practice` | 24 original endgame drills + full 3–5-piece Syzygy tablebases | 3 (none) | 5/8 | **Shipped** (tasks.md stale) | `server/endgames.json` (24), `server/endgames.mjs`, `web/src/EndgamePractice.jsx`, `/api/endgames` (`server/app.mjs:144`) | 3 open tasks are PR/install/cleanup, but the code is on main. Tablebases not in Docker image |
| 22 | `hosted-beta-readiness` | HTTPS/proxy hardening, invite gate, `/healthz`, Docker image; grounded Claude "Explain why" + "Why not …?" | 13 (HB-, AI-) | 15/18 | **Mostly shipped** | `server/coach-explain.mjs` (verifier, `SYSTEM_PROMPT` `:16`), `web/src/CoachExplain.jsx`, `POST /api/coach/explain` (`server/app.mjs:381`), `server/security.mjs`, `Dockerfile` | Open: **no live Claude call ever made** (task 2.6), proxy hop check (3.7), deploy + restore rehearsal (3.8) |
| 23 | `beta-waitlist-site` | Static landing page + D1 waitlist with abuse limits, salted IP hash, CSV export | 6 (WL-) | 8/10 | **Mostly shipped** | `site/functions/api/waitlist.js`, `site/functions/api/waitlist/export.js`, `site/migrations/0001_waitlist.sql`, `site/pages/index.html` | Not deployed. Privacy/terms carry a "not yet reviewed" banner (task 3.2) |
| 24 | `original-asset-pack` | Replace Chess.com art/roster with cburnett pieces, Lucide icons, own palette, 43 invented bots, own strength ladder | 8 (OA-) | 13/15 | **Shipped** | `server/bot-profiles.json` (43 bots), `shared/strength-ladder.js`, `scripts/generate_bot_avatars.mjs`, `web/public/pieces/cburnett/`, `web/public/licenses/` | Open: cburnett CC BY-SA check (2.4); repo history/visibility decision (4.4) |
| 25 | `rename-askthemove` | Show AskTheMove in UI and downloads; keep ChessLab internal identifiers | 3 (PN-) | 7/8 | **Shipped** | `web/index.html` title "AskTheMove · Your local chess club"; `web/src/main.jsx` wordmark; `web/src/product-name.test.js` | Open: founder decision on repo/internal rename (3.2) |
| | **Total** | | **109** | **177/199** | | | |

Requirement ID prefixes are used by only 9 of 25 changes: CL, CP, BP, OA, AI, HB, WL, PN and PT/PM. The other 16 have unnamed requirements, even though `openspec/config.yaml` (rules → specs) asks for "stable requirement IDs".

---

## 3. Product-level goals, users, core loop and non-goals

### 3.1 Product goal and differentiator
- Founder's original request: play an AI at a chosen difficulty, review every move, ask "what if" for either side, branch inside branches, return to a snapshot or the actual game (`docs/research/sources/original-conversation.md:58`, `:68-70`, `:84-89`, `:116-118`).
- Intended product: the tutor explains the mistake, a better move, the threats and a continuation. The learner challenges replies, explores nested alternatives, compares and returns. "The tutor should support active calculation and learning rather than only reveal engine recommendations" (`CONTEXT.md:7-9`). Repeated in `openspec/config.yaml` (context) and `AGENTS.md:3` ("preserve the user's full branching-tutor objective").
- Differentiator: a branch-native conversational tutor that keeps every question, explanation, prediction and return point attached to the exact position (BRD `docs/research/sources/supplied-master/chesslab-atlas/BRD.md:10`, `:21-31`). Same claim in `docs/dossier/application.md:21`: "The original branching conversation remains the intended differentiation."
- Success outcome: "a learner saying, and demonstrating, 'I can now calculate that trade'" (`docs/dossier/overview.md:19`). Branch counts and conversation length measure activity, not understanding (`docs/research/assessment.md:9`).
- Public promise: "AskTheMove is a chess coach that shows you why a move was a mistake, in plain words and arrows on the board" (`site/pages/index.html`, hero). Price promise: "Free during the beta" (`site/pages/index.html:69`). Pricing after the beta is undecided (`:264`, `site/pages/terms.html:34`).

### 3.2 Target users / personas
- **Primary (hypothesis):** adult online-rapid improvers rated about 800–1600 who already review completed games and still don't understand the engine's recommendation (`CONTEXT.md:39`; `docs/research/assessment.md:7`; `docs/dossier/product.md:25`). Their job: "Help me understand the mistake I just made, so I recognize the same idea in my next game" (`docs/dossier/product.md:27`). This is labelled "unvalidated" (`CONTEXT.md:39`, `docs/dossier/product.md:25`). The landing page (`site/pages/index.html:223-231`) and the Claude system prompt (`server/coach-explain.mjs:16`) nonetheless treat it as settled.
- **Secondary:** coaches and clubs, as recruiting partners and reviewers, not a separate product (`docs/dossier/product.md:29`; `docs/dossier/market.md:48`).
- **Less-focused audiences:** absolute beginners and advanced tournament players (`docs/dossier/product.md:29`).
- **BRD (untrusted, broader):** new learner, adult improver, competitive player, coach/creator, community organiser, parent/protected learner (`BRD.md:45-52`).
- Landing-page anti-persona: "Help during a live game" and "Memorising opening theory" (`site/pages/index.html:233-236`).

### 3.3 Core user loop
- Assessment/dossier loop (learning-first): import completed PGN → choose the confusing move → **predict** → inspect the full exchange → challenge with a different move for either side → go deeper → return to the anchor or actual game → **check learning on a related position later** (`docs/dossier/product.md:33-42`; `docs/research/assessment.md:9`; `CONTEXT.md:37`).
- Current platform loop (founder direction 7 Sep): play a bot → review → try a variation → return to the game (`README.md:3`; `CONTEXT.md:27`).
- Landing page loop: Evidence → Explanation → Branch → Return (`site/pages/index.html:121-205`).
- BRD north star adds teach-back and a delayed related retry (`BRD.md:25-31`).
- **What's built:** play, review, branch, note, return, retry key moves, and AI "Explain why" / "Why not X?". **Not built:** prediction before reveal, two-line comparison, teach-back, delayed or spaced related retry.

### 3.4 Non-goals / deferred
| Item | Status | Citation |
| --- | --- | --- |
| Human multiplayer (matchmaking, rated ladder, tournaments, Puzzle Battle) | Deferred until after the bot/coach stage | `README.md:9`; `CONTEXT.md:27`, `:63`; `docs/application.md:126`; `puzzle-rush/proposal.md:7` |
| Billing / payments / subscriptions | Last priority; `billingEnabled:false` | `CONTEXT.md:27`, `:57`, `:63`; `docs/dossier/pricing.md:3`; `server/app.mjs:110` |
| Free-form conversational AI | Not provided; questions are saved notes | `README.md:5`; `docs/application.md:126`; `hosted-beta-readiness/proposal.md:20` |
| Live assistance in external human games | Permanent non-goal | `CONTEXT.md:59`; `site/pages/index.html:235` |
| Native apps, cloud sync, model training | Outside this stage | `CONTEXT.md:57`; `explore-one-mistake/proposal.md:30` |
| Password reset, email, account deletion, multi-instance scaling | Explicit non-goals of the beta | `hosted-beta-readiness/proposal.md:21`; `docs/deploy-beta.md:120` |
| Calibrated human ratings for bots | Not claimed | `docs/application.md:70`; `original-asset-pack/proposal.md:30` |
| Deployment, domain, hosting accounts | Founder's task; not done | `hosted-beta-readiness/proposal.md:19`; `beta-waitlist-site/proposal.md:18` |
| Social feed, opening marketplace, voice, school admin | Deferred | `docs/dossier/product.md:60` |
| Business model, licence, pricing, audience, learning thresholds | Open decisions | `CONTEXT.md:63` |

---

## 4. Contradictions and stale statements

| # | Topic | Statement A | Statement B | Note |
| --- | --- | --- | --- | --- |
| 1 | **Local-first vs hosted beta** | "Development and delivery now target the local server. The prior hosted build remains historical." (`README.md:15`); "local operation is now the delivery target" (`CONTEXT.md:63`); "ChessLab is a local web application" (`docs/application.md:3`); "Remote hosting updates are outside this change" (`local-web-first/proposal.md:7`) | Hosted private beta governs current work (`CONTEXT.md:13`; `README.md:13`); it "supersedes the 13 September local-only direction for hosting" (`hosted-beta-readiness/proposal.md:5`) | README and CONTEXT contradict themselves. The `CONTEXT.md:21-23` section has no hosting-supersession note, only one for parity |
| 2 | **Stale Sites hosting** | "The current build is published privately through Sites… the Mac and tunnel must stay running" (`docs/dossier/application.md:15`) | The tunnel's settings must not be set for the beta (`docs/deploy-beta.md:31`); `.env.example` still documents `PUBLIC_ORIGIN`/`CHESSLAB_BACKEND_SECRET` | The dossier chapter is presented as current |
| 3 | **Chess.com parity language** | 8 changes still state a live parity/clone objective with no supersession note: `add-chess960/proposal.md:13`, `add-vision-training/proposal.md:3`, `annotated-studies/tasks.md:7`, `board-annotations/proposal.md:3` ("full local clone/tutor objective remains unchanged"), `learning-path/proposal.md:3`, `opening-explorer/proposal.md:3`, `puzzle-training/tasks.md:8`, `review-practice/proposal.md:3`; also `local-web-first/tasks.md:35` | "It supersedes the reference-parity goal" (`original-asset-pack/proposal.md:7`; `CONTEXT.md:19`) | 9 changes carry a proposal banner and 3 more (`opening-library`, `position-editor`, `position-practice`) a tasks note; these 8 have neither |
| 4 | **Product name** | "AskTheMove" (`README.md:1`; `web/index.html`; `CONTEXT.md:13`) | "# Running ChessLab… ChessLab is a local web application" (`docs/application.md:1-3`); "# Run ChessLab locally" (`docs/local-workspace.md:1`); "# ChessLab working agreement" (`AGENTS.md:1`); "ChessLab is an explainable chess tutor" (`openspec/config.yaml`) | Deliberate: docs keep the working name (`rename-askthemove/proposal.md:18`). Renaming was also a listed non-goal in `hosted-beta-readiness/proposal.md:22` and `original-asset-pack/proposal.md:28`, then done the same day |
| 5 | **Content inventory** | "Six original introductory lessons and six puzzles provide a small practice collection" (`README.md:5`); same in `docs/application.md:100` and `docs/dossier/application.md:11`; "no… extensive lesson library" (`docs/dossier/application.md:19`) | 6,100,952 puzzles/73 themes (`docs/local-workspace.md:61`); 12 lessons/24 challenges (`:83`); 3,810 openings (`:55`); 24 endgames | README undersells the local build. It also oversells the hosted image, which ships none of the catalogues (#11) |
| 6 | **PGN export** | "PGN export does not include them [variations, questions]" (`docs/application.md:54`; `docs/dossier/application.md:19`) | "PGN now imports and exports legally checked alternatives, comments and numeric annotation glyphs" (`docs/local-workspace.md:95`) | Stale after `annotated-studies` |
| 7 | **Chess960** | "this build implements Standard only" (`docs/dossier/application.md:43`; `docs/research/nonmultiplayer-parity.md:30`) | Chess960 shipped (`docs/local-workspace.md:122-130`; `add-chess960`) | Parity ledger is flagged historical, but the dossier chapter is not |
| 8 | **Puzzle modes, same file** | "Rated adaptation, daily puzzles and rush remain subsequent work" (`docs/local-workspace.md:69`); "Full rated calibration, rush, battle… remain work" (`:75`); also `puzzle-training/tasks.md:8` | Rated/Daily (`:73-75`) and Rush (`:77-79`) documented as working | Internal contradiction in one document |
| 9 | **Repository visibility** | "private ChessLab repository" (`README.md:67`); "Private GitHub repository" (`docs/dossier/overview.md:28`) | "the public repository must stop distributing Chess.com material" (`original-asset-pack/proposal.md:5`); task 4.4 "make the repository private or purge" still open | Also matters because earlier commits still contain copied assets (`README.md:65`) |
| 10 | **Claude tutor status** | "Implemented and covered by automated tests" (`hosted-beta-readiness/proposal.md:27`); README describes "Explain why" as available (`README.md:13`) | Landing page: "The Claude tutor… In development" (`site/pages/index.html:163`, `:251`); no live Claude request made (`hosted-beta-readiness/tasks.md` 2.6 open) | The landing page is the more accurate of the two |
| 11 | **Engines and catalogues: local vs hosted** | "ten installed engine configurations" (`README.md:5`); "Review and assistance use Stockfish 19" (`docs/application.md:72`) | The hosted image ships Stockfish 18 only. No SF19/16/Lite/Maia/Lc0, no puzzle or explorer catalogue, no tablebases (`docs/deploy-beta.md:43-47`; `Dockerfile:17-49`) | Beta testers would get a much thinner product than the README describes |
| 12 | **Learning-first vs platform-first** | Recommendation: test the narrow import → predict → branch → compare → return loop first (`docs/research/assessment.md:9`; `docs/dossier/overview.md:17-21`; `docs/dossier/architecture.md:59-66`) | Founder direction: platform/bot first (`CONTEXT.md:27`). The work graph puts "full branching conversational tutor" after "remaining curriculum and platform parity" (`local-web-first/tasks.md:29-30`) | A deliberate override, but the tutor loop (the stated differentiator) is still 0/9 |
| 13 | **Persona settled vs unvalidated** | "This audience and its willingness to pay are unvalidated" (`CONTEXT.md:39`; `docs/dossier/product.md:25`) | Landing page headline targets "Adults rated about 800 to 1600" (`site/pages/index.html:223`); hard-coded in the coach prompt (`server/coach-explain.mjs:16`) | |
| 14 | **Positioning vs build** | "It isn't built for… Memorising opening theory. Other tools do that well." (`site/pages/index.html:236`) | Two shipped changes invest in openings: 3,810-line library + recognition, and a game explorer (`opening-library`, `opening-explorer`) | Mild contradiction between positioning and roadmap |
| 15 | **"Current" spec pointer** | "Start with… the current OpenSpec change (`build-coach-web-platform`)" (`README.md:37`); "See build-coach-web-platform for the current implementation scope" (`openspec/config.yaml`) | 24 other changes followed; none archived; `openspec/specs/` empty | No canonical spec exists. The product spec is the union of 25 unmerged deltas, two of them superseded |
| 16 | **Privacy for AI** | Open decision: "Privacy notice and terms for testers, given that position evidence is sent to Anthropic" (`hosted-beta-readiness/proposal.md:35`) | The app (`web/`) has no privacy notice or terms. Only the waitlist site does, and it is marked "not yet reviewed" (`beta-waitlist-site/tasks.md` 3.2) | A beta-launch blocker |

---

## 5. Functional requirements that matter most to a paying chess learner and are missing or weak

Ranked by impact on a paying 800–1600 improver (the stated persona).

| Rank | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| 1 | **The learning loop itself: predict before reveal, then teach-back, then a delayed or spaced retry on a *related* position.** This is the stated outcome and the differentiator | **Missing.** The branch question box is a free-text note with placeholder "What did I expect to happen here?" (`web/src/main.jsx:350`), with no reveal gating. There is no teach-back, no spaced/related retry and no misunderstanding model. `review-practice` only retries the same key moves straight away | `CONTEXT.md:7-9`, `:37`; `docs/dossier/product.md:37-42`; `explore-one-mistake` CL-004 (0/9 tasks); BRD FR-068–FR-070, FR-099. No `predict`/`teach`/`spaced` logic in `server/` or `web/src/` |
| 2 | **Answering the learner's own questions (the conversational tutor), and AI explanations that are proven live** | **Weak.** Questions are stored notes only (`README.md:5`; `docs/application.md:126`). AI is limited to "Explain why" and "Why not <one legal move>?" (AI-003). It has never made a live Claude call (task 2.6), and the verifier does not check move order, squares or defenders (`docs/deploy-beta.md:122`) | `hosted-beta-readiness/proposal.md:12,20,27`; `site/pages/index.html:251` |
| 3 | **Account lifecycle and data rights:** password reset, email verification, account deletion, account data export, privacy notice/terms in the app | **Missing.** "No password reset, email verification or account deletion flow. Testers who forget a password need a manual reset" | `docs/deploy-beta.md:120`; `docs/application.md:46`; `hosted-beta-readiness/proposal.md:21`, `:35`; BRD NFR-012, FR-180; `docs/dossier/architecture.md:52` |
| 4 | **Getting the learner's real games in, and a memory of their weaknesses across games.** Persona "already review[s] completed games" on other platforms | **Weak.** Only a pasted PGN or a file (50 KB game / 900 KB study). No Chess.com/Lichess username import, no recurring-mistake or weakness profile, no progress/insights dashboard, no "learner graph" | `docs/application.md:54`; `docs/local-workspace.md:97`; `docs/dossier/product.md:50`; `startup-research.md:91`; BRD FR-101–FR-104. No `weakness`/`insight` code in `server/` or `web/src/` |
| 5 | **Something to pay for:** plans, entitlements, checkout, usage metering for AI cost | **Missing (deliberately last).** `billingEnabled:false` (`server/app.mjs:110`). The AI quota is per account, per hour, in memory, reset on restart (`docs/deploy-beta.md:11`, `:121`). No plan or price is decided (`site/pages/index.html:264`). `docs/dossier/pricing.md:70` advises charging only for "a clearly demonstrated improvement in tutoring", which depends on #1 and #2 | `CONTEXT.md:27`, `:63`; `docs/dossier/pricing.md:3`, `:47-49` |
| 6 | Hosted product = local product: the puzzles, explorer, endgame tablebases and the human-like engines (Maia) that make "play at my level" meaningful | **Weak in hosted.** None are in the Docker image | `docs/deploy-beta.md:43-47` |
| 7 | Trustworthy difficulty and rating: bots that play like a human at the learner's level, plus a rating they can track | **Weak.** Ladder ratings are "targets…not calibrated human ratings" (`shared/strength-ladder.js:5`). The puzzle Elo is local only (`docs/local-workspace.md:73`) | `docs/application.md:70`, `:126` |
| 8 | Reliability for paying users: multi-instance, backups automated, load-tested | **Weak.** One instance only. SQLite plus in-memory limits. Not load-tested. Backup is a manual cron recipe | `docs/deploy-beta.md:11`, `:96`, `:123` |
| 9 | Compare two lines side by side from the same position (CL-003) | **Missing.** Only "Compare before move" candidate arrows exist | `explore-one-mistake/specs/mistake-exploration/spec.md:35-47`; `web/src/main.jsx:346` |
| 10 | Educator-reviewed content and a learning-efficacy test | **Missing.** No educator review and no learner study. "No learning effectiveness… has been established" | `docs/application.md:130`; `docs/research/assessment.md:25`; `explore-one-mistake/tasks.md` 1.2, 3.2 |

---

## 6. Housekeeping recommendations (for whoever owns the specs)

1. Archive or formally close `explore-one-mistake` and `match-nonmultiplayer-platform`, and create a new change for the tutor loop (#1 and #2 above) so the differentiator has a live spec.
2. Merge the accepted requirements into `openspec/specs/` so a canonical spec exists; today there is none.
3. Add the 8 missing supersession notes (section 4, #3), and fix README `:5`, `:15`, `:37` and `docs/application.md:54`, `:100`.
4. Decide one statement of the hosting direction and put it in both `README.md` and `CONTEXT.md`.
5. Add requirement IDs to the 16 changes that lack them (`openspec/config.yaml` rule).
6. Before inviting testers: add an in-app privacy notice and terms, a password-reset path, one live Claude verification, and a decision on which catalogues and engines the hosted image carries.
