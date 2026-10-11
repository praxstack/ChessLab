# AskTheMove architecture review

Repository: praxstack/ChessLab, `main` at `01e030e` (merge of PR #18, 8 October 2026). Reviewed read-only on 9 October 2026. Line numbers refer to that commit.

## Summary

AskTheMove is a single Node.js process that serves a React single-page app, keeps everything in one SQLite file, runs Stockfish as a fresh child process for each search, and optionally asks Claude to explain the engine's lines. A separate static landing page with a waitlist runs on Cloudflare Pages with a D1 database. The design is simple and fits a small invited beta. Security basics are better than usual for this stage: hashed session tokens, SameSite=Strict cookies, Origin checks, a strict CSP, invite gating, a non-root container and a checksum-pinned engine download. The coach pipeline is grounded carefully. Claude only ever sees server-built evidence, and every answer is checked before the learner sees it.

The launch risks are capacity and cost controls, not the core design:

1. **Engine capacity can be exhausted by one user, or by anonymous traffic.** The whole server runs two Stockfish searches at a time. The UI offers searches of up to 90 seconds on 8 threads. An unauthenticated status endpoint starts a Stockfish process on every call.
2. **AI spend has no global cap in code.** Quotas apply per account, invite codes can be reused, and the Claude call has never been run against the live API (OpenSpec task 2.6 is still open).
3. **There is no CI, linter or formatter.** Tests run only on the founder's machine.
4. **Operational state is fragile.** There are no schema migrations, rate limits and quotas live in memory, backups are manual, and nothing monitors the service.
5. **The beta lacks a privacy and account lifecycle.** There is no password reset, account deletion or in-app privacy notice.

Five recommendations at the end address these, ordered by impact for effort.

---

## 1. System map

### 1.1 Diagram

```
                         ┌──────────────────────────── Cloudflare ─────────────────────────────┐
 Visitor ──HTTPS──▶ askthemove.pages.dev / askthemove.online (site/public, static, CSP headers)  │
                         │   POST /api/waitlist ─▶ Pages Function ─▶ D1 "askthemove-waitlist"   │
                         │   GET  /api/waitlist/export (Bearer ADMIN_TOKEN) ─▶ CSV             │
                         │   (optional) Turnstile siteverify                                   │
                         └──────────────────────────────────────────────────────────────────────┘
                                  (no runtime link to the app; invites are handed out manually)

 Learner ──HTTPS──▶ TLS proxy (Caddy / Fly / Render, not chosen yet) ──▶ one container, port 8770
                                                                        │
   React SPA (web/dist) ◀── express.static ──┐                          │
   fetch /api/* JSON + cookie chesslab_session                          │
                                              ▼                          │
                         Node 24 + Express 5: server/index.mjs → server/app.mjs (≈65 routes)
                           │            │                │                     │
                           │ sync       │ spawn per      │ spawn per bot move  │ HTTPS
                           ▼ SQL        ▼ search (UCI)   ▼ (UCI), 1 slot        ▼
                  /data/chesslab.sqlite  Stockfish 18   Stockfish 18 (image);   Anthropic Messages API
                  (node:sqlite, WAL)     2 slots,       Maia/lc0/SF16/Lite      (claude-opus-5-5 default)
                  + optional read-only   queue 8        only if installed
                  explorer/puzzle DBs
                  In-process memory: rate limits, AI quotas, evidence store (lost on restart)
```

### 1.2 Parts

Sizes are from `wc`. The code is written densely, so line counts understate it: `web/src/main.jsx` has 371 lines but 71 KB, with lines up to 2,097 characters.

| Part | What it does | Key files | Size | Main dependencies |
| --- | --- | --- | --- | --- |
| **web/** (client) | React 19 SPA covering play, review, studies, puzzles, lessons, explorer, settings and the "Ask the coach" panel. Built by Vite into `web/dist`. | `web/src/main.jsx` (the `App` component, 56 `useState` hooks), `CoachExplain.jsx`, `Board.jsx`, `GameReview.jsx`, `Settings.jsx`, `styles.css` | 20 source files, 1,094 lines, 216 KB of JS/JSX; 100 KB CSS; 5 test files, 212 lines | react ^19.2.8, react-dom, vite ^8.2.2 (dev) |
| **server/** | Express 5 API: accounts, games and moves, bot turns, analysis, whole-game review, coach, puzzles, lessons, collections, vision and endgame drills. It also serves the built SPA in production. | `server/index.mjs` (boot, static, shutdown), `server/app.mjs` (schema, auth, most routes), `engine.mjs`, `opponent-engines.mjs`, `coach-explain.mjs`, `security.mjs`, `study-format.mjs`, `puzzle-training.mjs` | 22 modules, 2,303 lines, 181 KB; 1.2 MB of JSON content (`openings.json` 1.1 MB); 21 test files, 1,921 lines | express ^5.2.1, chess.js 1.4.0, @anthropic-ai/sdk 0.131.0, `node:sqlite`, `node:child_process` |
| **shared/** | Rules wrapper used by both client and server: chess.js for Standard, chessops for Chess960; position validation; strength ladder; board marks. | `shared/chess.js`, `position.js`, `strength-ladder.js`, `board-marks.js` | 4 files, 181 lines, 13 KB | chess.js 1.4.0, chessops 0.15.1 |
| **Stockfish process** | Native UCI engine started as a child process for each search. Analysis uses 2 global slots with a queue of 8. Bot moves on other engines use 1 slot. | `server/engine.mjs:62-203`, `server/opponent-engines.mjs:41-162`, `Dockerfile:17-38` | 535 lines across the two drivers | Stockfish 18 official Linux binary, SHA-256 pinned (GPL-3.0) |
| **Claude coach** | Builds structured evidence from replayed engine lines, calls Claude, verifies the answer, and falls back to the deterministic engine summary. | `server/coach-explain.mjs`, `server/app.mjs:361-402`, `web/src/CoachExplain.jsx` | 404 lines, 28 KB; 338-line test file | @anthropic-ai/sdk 0.131.0 |
| **Database / storage** | One SQLite file holds accounts, sessions, games (JSON blobs) and progress. Optional read-only catalogue SQLite files serve the opening explorer and puzzles. Browser `localStorage` holds settings and the open game. | `server/app.mjs:44-53`, `game-collections.mjs:5-11`, `puzzle-training.mjs:39-41`, `puzzle-rush.mjs:5-7`, `vision-training.mjs:21`, `course-progress.mjs:6`, `review-practice.mjs:62` | 13 tables, no migration layer | `node:sqlite` (`DatabaseSync`, synchronous) |
| **Auth / accounts** | Username and password with scrypt hashing, a 7-day random session token (stored hashed), an httpOnly SameSite=Strict cookie, invite-code gating and in-memory throttles. | `server/app.mjs:93-140`, `server/security.mjs:24-39` | about 50 lines | `node:crypto` |
| **Deployment** | Three-stage Dockerfile (Vite build, Stockfish fetch, runtime) running as non-root with a `/data` volume and a `/healthz` check. One instance behind a TLS proxy. Not yet deployed. | `Dockerfile`, `.dockerignore`, `docs/deploy-beta.md`, `.env.example` | 64-line Dockerfile | node:24.21.0-bookworm-slim |
| **site/** (landing) | Static marketing page, privacy and terms pages, and the waitlist. Cloudflare Pages Functions plus D1. Pages are built from `site/pages` templates into `site/public`. | `site/functions/api/*.js`, `site/src/lib/waitlist.js`, `ratelimit.js`, `site/scripts/build.mjs`, `site/wrangler.toml`, `site/migrations/0001_waitlist.sql` | 553 lines of backend; 469 lines of build script; 1,510 lines of client JS; 2,659 lines of CSS; 8 test files, 932 lines | wrangler 4.136.3 (dev), chess.js (dev, demo board); no runtime deps |
| **Legacy "private Sites" tunnel** | A Worker that proxied `/api` to a private backend using `X-ChessLab-Backend-Key`, plus a server-side guard. It is inactive unless `CHESSLAB_BACKEND_SECRET`/`PUBLIC_ORIGIN` are set. | `server/sites-worker.mjs`, `server/hosting.mjs`, `scripts/build_sites.mjs`, `.openai/hosting.json` | 56 lines | none |
| **scripts/** | Engine installer (Maia, lc0), catalogue importers, report builder, a 137 KB Playwright smoke test, snapshot backup. | `scripts/check_app_browser.cjs`, `install_engines.py`, `local_snapshot.py`, `build_report.py` | 21 files, 2,363 lines, 224 KB | playwright 1.62.1 (dev), Python 3 |
| **Non-product material** | Research dossier, design captures, references, generated report site. | `report/` (8.1 MB, 429 files), `design/` (3.0 MB), `docs/` (5.7 MB), `ChessLab-dossier.zip` (1.9 MB), root PNGs | about 19 MB | none |

### 1.3 What calls what

| From | To | Boundary | Notes |
| --- | --- | --- | --- |
| Browser SPA | `server/app.mjs` | HTTPS JSON, `fetch` helper `web/src/main.jsx:25-30` | POST requires JSON and a matching `Origin` (`app.mjs:73-87`). The session cookie is `chesslab_session`. |
| Browser SPA | Express static | `server/index.mjs:16-20` | Production serves `web/dist` with an SPA fallback. Dev mounts Vite middleware (`index.mjs:22-24`). |
| `app.mjs` | SQLite | In-process, synchronous | Every query blocks the event loop, which is fine at beta scale. |
| `app.mjs` (`/api/analyze`, hint, assist, review, coach) | `engine.analyze` → `runUci` | `spawn()` per search, UCI over stdin/stdout (`engine.mjs:106`) | A `playedMove` triggers a second process (`engine.mjs:292`). Slots: `active >= 2` queues up to 8 waiters for at most 15 s (`engine.mjs:65-78`). |
| `app.mjs` `/api/status` | `engine.engineStatus` | spawn | **Unauthenticated, not rate-limited, uncached.** Every call starts a Stockfish process and takes a slot (`app.mjs:110`, `engine.mjs:262-265`). |
| `app.mjs` `/api/bots` | `listOpponentEngines` | spawn per engine probe | Cached 5 min, but only 30 s when any engine is missing (`opponent-engines.mjs:181`). That is always the case in the Docker image, since Maia, lc0 and SF16 are absent. |
| `app.mjs` `/api/games/:id/bot` | `chooseOpponentMove` | spawn, 1 slot, queue 8, 30 s queue timeout (`opponent-engines.mjs:41-63`) | `stockfish19` routes through the analysis slots instead (`opponent-engines.mjs:205-209`). |
| `app.mjs` `/api/coach/explain` | `coach.explain` → Anthropic API | HTTPS via SDK, 15 s deadline | See section 2. |
| Landing page form | `site/functions/api/waitlist.js` → D1 | Cloudflare Pages Function | Hashed-IP rate limit in D1 (5 per 10 min) and a honeypot; optional Turnstile. |
| Founder | `/api/waitlist/export` | Bearer `ADMIN_TOKEN`, constant-time compare | Gives a CSV. Invites are then issued by hand as shared `BETA_INVITE_CODES`. |
| Legacy Worker | `server/app.mjs` | HTTPS + `X-ChessLab-Backend-Key` | Only when the legacy env vars are set. The deploy guide says not to set them. |

**Route inventory.** About 65 Express routes across `app.mjs` and five installer modules. Roughly 15 are public: `/healthz`, `status`, `bots`, `me`, `register`, `login`, `logout`, the catalogue reads (`learn`, `curriculum`, `endgames`, `openings`, `training/catalog`) and `explorer`. Everything after `app.mjs:151` requires a session.

---

## 2. Coach pipeline end to end

### 2.1 Flow

1. **Engine evidence first.** The review panel calls `POST /api/analyze` with the game history, the played move and the user's analysis settings. The client defaults are 3,000 ms, 3 lines and 2 threads (`web/src/settings-state.js:5`, `main.jsx:128`). The server replays the full history with the rules library, runs Stockfish, and builds a deterministic text summary (`engine.mjs:267-307`). If Claude is configured, the analysis is kept in memory under a random `evidenceId` for 30 minutes, capped at 1,000 entries server-wide (`coach-explain.mjs:311-317`, `app.mjs:369`).
2. **Explain request.** `POST /api/coach/explain` (`app.mjs:381-402`) applies the per-user analysis limit (100/min), replays the position, and parses an optional "why not X?" into a legal move. The free text of the question is never forwarded; only the move's SAN reaches the prompt (`coach-explain.mjs:215-228, 335`). The server then picks evidence in this order:
   - the panel's remembered analysis (`coach.recall`); a stale or foreign id returns HTTP 409 "analysis expired" (`app.mjs:396`);
   - a saved whole-game review step for the same position (`app.mjs:375-380`);
   - a fresh search at `COACH_ENGINE_MOVETIME_MS` (default 800 ms, range 100–2000) with 3 lines (`app.mjs:398`, `coach-explain.mjs:242`).

   A played move that does not match the evidence returns 503 (`app.mjs:399`).
3. **Evidence bundle.** `buildEvidence` (`coach-explain.mjs:97-135`) replays each engine line, up to 8 plies, on a copy of the board. It records SAN, side, captures, checks, mates and material, and adds the played or asked move, the engine name and search limits, and the deterministic summary. From the same data it builds the "allowed vocabulary": legal SANs, mate sides and distances, every number present, and the piece types captured.
4. **Prompt.** A fixed system prompt (`coach-explain.mjs:16-36`, 3,332 characters) sets the audience (800–1600 improvers) and six rules. Moves must be cited as `[[SAN]]`. No unsupported claims about defenders, threats or material. Lines are never called "forced". Mate is mentioned only with evidence. No numbers that are not in the evidence. At most 110 words in two paragraphs. The user message is `<evidence>{JSON}</evidence>` plus a one-line task (`coach-explain.mjs:288, 335-337`). The system block is marked `cache_control: ephemeral` (`:287`).
5. **Model call** (`coach-explain.mjs:274-306`): `client.beta.messages.create`, configured as shown below.
6. **Checks before the learner sees anything** (`coach-explain.mjs:290-299`):
   - stop reason `refusal` or `max_tokens` is treated as a failure;
   - an empty answer, or one over 1,600 characters, 110 words or 2 paragraphs, is withheld;
   - `verifyAnswer` (`:200-212`) runs. Every `[[move]]` must be in the allowed set, with matching check and mate markers. SAN-like text outside brackets must also be allowed. Bracket syntax must balance. Each mention of mate must match a side, and a distance when one is stated, that the evidence shows (`:176-188`). Every numeral must appear in the evidence or the prompt (`:192-198`). A claim that a piece type is won, lost, captured or traded must name a type that some evidence move captures.

   The verifier does not check move order, which side gains material, or claims about squares and defenders. `docs/deploy-beta.md` "Known gaps" says so.
7. **Response.** The response contains either `{source:'claude', model, text, citedMoves}` or `{source:'engine', text: deterministic summary, fallbackReason}`. The UI labels Claude output as AI-generated and names the model, engine, time and depth (`CoachExplain.jsx`).

### 2.2 Model, limits and controls

| Control | Value | Where |
| --- | --- | --- |
| Model | `claude-opus-5-5` by default; override with `ANTHROPIC_MODEL` | `coach-explain.mjs:8, 238` |
| Max tokens | 8,000, which covers adaptive thinking plus a reply of about 150 tokens | `:283-284` |
| Effort | `low` by default; `COACH_AI_EFFORT` accepts low, medium or high | `:239, 285` |
| Thinking | Not set. Opus 5.5 runs adaptive thinking by default. | `:281-289` |
| Refusal fallback | `server-side-fallback-2026-07-01` beta with `fallbacks:'default'`, for Opus 5.5, Opus 5, Fable 5.1 and Sonnet 5.5 | `:9, 286` |
| Timeout | 15 s by default (2–60 s), with its own AbortController, and SDK `maxRetries: 1` | `:240, 256, 274-289` |
| Concurrency | At most 4 Claude calls in flight per process; beyond that the request falls back as `busy` | `:255, 333` |
| Quota | 30 explanations per account per rolling hour (1–1000), in memory | `:241, 260-270, 334` |
| Prompt caching | System prompt only, 5-minute ephemeral cache. The prompt is about 800 tokens, which is above Opus 5.5's 512-token minimum, so it should cache. Never confirmed live (task 2.6). | `:287` |
| Evidence cache | In memory, 30-minute TTL, 1,000 entries global FIFO. Saved review steps are reused from SQLite. | `:311-321`, `app.mjs:375-380` |
| Answer cache | **None.** The same position asked twice calls Claude twice. | n/a |
| Logging | The fallback reason, HTTP status and the count of unverified claims. Never prompts, answers or keys. **Token usage is not logged.** | `:342-345` |
| Global spend cap | **None in code.** The deploy guide relies on an Anthropic Console spending limit. | `docs/deploy-beta.md` "Before inviting testers" |

### 2.3 Failure fallbacks

Every failure path returns HTTP 200 with the deterministic engine summary and a `fallbackReason`. The UI maps each reason to a sentence (`CoachExplain.jsx:5-15`).

| Reason | Trigger |
| --- | --- |
| `not_configured` | No `ANTHROPIC_API_KEY`. The UI also hides the button. |
| `no_evidence` | No best move and no played move |
| `busy` | 4 calls already in flight. Checked before the quota, so it costs the learner nothing. |
| `rate_limited` | Hourly quota used up |
| `timeout`, `canceled`, `upstream_busy`, `not_authorized`, `unreachable`, `api_error` | SDK error classes (`:246-253`) |
| `refusal`, `incomplete`, `empty`, `too_long`, `unverified_claims` | Response checks |

Errors before the model call are real HTTP errors: an illegal "why not" move (400), expired evidence (409), an engine mismatch (503), or the engine queue being full (503).

**Note:** the quota is taken *before* the call (`:334`), so withheld answers (`unverified_claims`, `too_long`) and timeouts still count against the learner and still cost money.

### 2.4 Cost per explanation (estimate)

The code states the model (`claude-opus-5-5`) and `max_tokens` (8,000), so an estimate is possible. It uses Opus 5.5 list prices: $4 per million input tokens, $20 per million output tokens, $0.20 per million for cache reads, and 1.25× input for 5-minute cache writes. Token counts are estimated from characters, since no live call was made.

- **Input:** about 800 tokens of system prompt, plus 700–900 tokens of evidence JSON (a sample bundle with 3 lines and a played move came to 2,165 characters), plus about 40 tokens of task. That is roughly 1,700 tokens, or **$0.004–$0.007** depending on whether the system prompt is cached.
- **Output:** the visible answer is at most 110 words, about 150–200 tokens ($0.003–$0.004). Thinking tokens at `low` effort are unknown; 0–1,000 tokens would add $0–$0.02.
- **Typical: about $0.01–$0.03 per explanation.** The hard ceiling set by `max_tokens` is about **$0.17**. In practice the 15 s timeout cuts long generations off first, though tokens generated before an abort are likely still billed. A retry on 429 or 5xx can repeat the input cost once. A refusal fallback to Opus 5 or 4.8 bills at $5/$25 per million.
- **Per account at the 30/hour quota:** typically about $0.30–$0.90 an hour, with a ceiling of about $5 an hour.
- **Server-wide:** the only throttle is the 4-call concurrency cap. Accounts are cheap to create: a leaked reusable invite code allows 15 sign-ups per minute per IP (`app.mjs:114`). Many accounts can therefore keep all 4 slots busy around the clock. At typical cost that is very roughly $1 a minute.

These figures are unmeasured. Log `response.usage` (input, output, cache-read and cache-write tokens) per call before trusting them.

---

## 3. Data model

### 3.1 Main SQLite database (`CHESSLAB_DB`, `/data/chesslab.sqlite` in the image)

The database uses WAL mode, foreign keys and `busy_timeout=5000` (`app.mjs:46`). Tables are created with `CREATE TABLE IF NOT EXISTS` at startup. **There is no schema version and no migration runner.** Most domain state is a JSON blob in a `data` column.

| Table | Stores | Defined at |
| --- | --- | --- |
| `users` | id (UUID), username (unique, case-insensitive), salt, scrypt hash (64 bytes), created_at | `app.mjs:47` |
| `sessions` | SHA-256 of the 32-byte token, user_id, expires_at (7 days). Expired rows are pruned on each login. | `app.mjs:48, 104-109` |
| `games` | id, user_id, revision (optimistic concurrency), and `data` holding the whole game: moves, clocks, bot settings, study tree with branches and notes, flags. Capped at 500 per account. | `app.mjs:49, 164-181` |
| `game_reviews` | One JSON report per game, the whole-game review appended move by move | `app.mjs:51, 356` |
| `progress` | (user, kind lesson/puzzle, item) completion | `app.mjs:52` |
| `bot_results` | Best crowns (1–3) per user per bot | `app.mjs:53` |
| `game_collections`, `collection_games` | Named folders of games | `game-collections.mjs:5-11` |
| `puzzle_attempts` | Training attempts (JSON) | `puzzle-training.mjs:41` |
| `puzzle_runs` | Puzzle Rush runs; one active per user (partial unique index) | `puzzle-rush.mjs:5-7` |
| `vision_runs` | Board-vision drill rounds | `vision-training.mjs:21` |
| `lesson_sessions` | Curriculum lesson state | `course-progress.mjs:6` |
| `review_practice` | Mistake-retry state per game | `review-practice.mjs:62` |

**Other stores:**

- **Read-only catalogues.** `CHESSLAB_EXPLORER` and `CHESSLAB_PUZZLES` point at SQLite files opened read-only (`opening-explorer.mjs:24`, `puzzle-training.mjs:39`). They are not in the image; without them those features report "unavailable". Syzygy tablebases at `CHESSLAB_TABLEBASES` are also optional.
- **Static content loaded at boot:** `openings.json` (1.1 MB), `curriculum.json`, `endgames.json` and `bot-profiles.json`.
- **Process memory, lost on restart:**
  - rate-limit windows (`app.mjs:63-71`);
  - AI quotas and the evidence store (`coach-explain.mjs:257`);
  - the in-flight guards for bot turns and reviews (`app.mjs:63`).
- **Browser:** `localStorage` keys `chesslab-settings` and `chesslab-game` (`main.jsx:24, 89, 109`).
- **Landing page (Cloudflare D1 `askthemove-waitlist`):**
  - `waitlist`: email (unique), product, optional rating band, form source, UTM fields, consent and created timestamps;
  - `rate_limits`: salted hash of the IP per one-minute bucket, pruned after 24 h (`site/migrations/0001_waitlist.sql`).

  Deletion is done by `npm run delete-signup`. `wrangler.toml` still has the placeholder `database_id`.

### 3.2 Accounts and sessions

- **Passwords:** 10–128 characters, hashed with scrypt using Node's default cost parameters, with a per-user salt. Login takes the same time whether or not the user exists (`app.mjs:132-133`).
- **Sessions:** a 64-hex token stored only as SHA-256. The cookie is `httpOnly`, `SameSite=Strict`, `Secure` when `APP_ORIGIN` is HTTPS, with a 7-day absolute expiry. Logout deletes the server row.
- **Invites:** `BETA_INVITE_CODES` holds shared, reusable codes, compared in constant time (`security.mjs:24-39`). There is no per-code usage count, expiry or single use.
- **Throttles:** 15 auth requests per minute per IP, and 10 logins per 15 minutes per username. The second lets anyone who knows a username lock its owner out. The deploy guide documents this.
- **Missing:** password reset, password change, email, account deletion, full-account data export (only per-game PGN and study downloads), admin tooling and session revocation.

### 3.3 Backups

- **App:** `docs/deploy-beta.md` "Backups" gives a manual online `VACUUM INTO`, `docker cp` and cron recipe with restore steps. It asks for daily runs and off-box encrypted copies. Nothing in the repo automates this, and there is no restore test in CI. `scripts/local_snapshot.py` makes consistent local copies (its test passes) but is not in the image. Restore has never been rehearsed on a host (task 3.8 is open).
- **Waitlist:** no backup steps in `site/README.md`. D1's platform point-in-time restore is the obvious option and should be confirmed for the account's plan.

---

## 4. Quality signals

### 4.1 Tests

| Suite | Location | Count | Result in this review |
| --- | --- | --- | --- |
| Server and client unit/integration (`npm test`) | `server/*.test.mjs` (21 files), `web/src/*.test.js` (5 files) | 147 tests | **132 pass, 6 fail, 9 skipped.** Run in a scratch copy with `npm ci` (3 s) on Node 22.22. The package asks for Node ≥24, so npm printed an EBADENGINE warning. |
| Landing page (`npm --prefix site test`) | `site/test/*.test.js` (7 files) | 66 tests | **66 pass.** `build:check` passes ("public/ is up to date"). |
| Python script tests | `scripts/*_test.py` (4 files) | 4 scripts | `local_snapshot_test` passes. The puzzle and explorer importers need `zstd` and `python-chess`, which are absent here. |
| Browser smoke (`just e2e`) | `scripts/check_app_browser.cjs` (824 lines, 137 KB) | n/a | Not run; needs Playwright browsers and Stockfish. |

Details:

- **All 6 failures depend on the environment:**
  - no Stockfish binary (tests 40 and 84);
  - no Stockfish 18 Lite (test 66);
  - no Python venv with python-chess (test 37);
  - no tablebases (test 62).
- **The 9 skips** are the opponent engines that are not installed.
- **The coach tests** (`coach-explain.test.mjs`, 338 lines) use a fake client. They cover success, invented moves, a missing key, timeout, quota, API errors, refusal and truncation. They pass. No test has ever hit the real API.
- **Normalised failure:** CONTEXT and the OpenSpec tasks record runs such as "114 pass, 6 environment failures". A suite that is never fully green on any machine stops catching regressions.

### 4.2 CI, lint, format, specs

- **CI: none.** There is no `.github/` directory, and none in any of the 76 commits. Nothing runs on push or PR.
- **Lint and format: none.** No ESLint, Prettier, Biome, `tsconfig` or `.editorconfig`. Plain JavaScript, no types. Dense one-line style throughout `server/` and `web/src/`.
- **OpenSpec:** `just check` runs `openspec validate --all --strict`. It was not run here because the `openspec` CLI is not installed and is not a project dependency. 25 change folders. `hosted-beta-readiness` has 3 open tasks: the live Claude call (2.6), checking proxy hops on the real host (3.7), and deploying with a backup rehearsal (3.8).
- **Portability of `just check`:** it also runs `scripts/setup_skills.py --check`, which checks agent-skill symlinks on one machine. `docs/agents/setup.md` notes that a skill hash has drifted, so this check already fails. It cannot be used in CI as written.

### 4.3 justfile targets

| Target | Does |
| --- | --- |
| `setup` | Links agent skills (machine-local) |
| `check` | Skill-link check, strict OpenSpec validation, `git diff --check` |
| `test` | Skill helper self-test, `npm test`, 2 Python tests, site `npm ci`, site tests and build check |
| `app` / `app-check` | `npm run dev` / `npm test` plus `npm run build` |
| `e2e` / `proof` | Build, then the Playwright smoke (`proof` also saves evidence under `data/`) |
| `report`, `report-check`, `report-test`, `report-zip` | Build and check the research dossier site |
| `local-check` | Build, then `scripts/check_local_server.mjs` |

---

## 5. Risks and tech debt, ranked by impact on a hosted beta

| # | Area | Risk | Evidence | Impact on beta |
| --- | --- | --- | --- | --- |
| 1 | **Security and scalability** | **Engine starvation and DoS.** The server allows 2 analysis searches at once, with 8 queued and a 15 s queue timeout. Clients may request `movetime` up to 90,000 ms and `threads` up to 8 whenever they name an `engineId`. The Settings UI offers exactly that ("Maximum (~1 min 30 sec)", 8 threads). A played move doubles the work. One reviewer on "Maximum" holds a slot for about 3 minutes per ply. Two such users block analysis, hints and coach evidence for everyone. Separately, `GET /api/status` is anonymous, unthrottled and uncached, and starts a Stockfish process per call. Bot turns have no rate limit beyond one pending per game. | `engine.mjs:65-78, 275-277, 292`; `app.mjs:110, 231-252, 339-341`; `web/src/Settings.jsx:28-32` | High. "Engine is busy" errors with only a handful of testers. CPU oversubscription on a 2–4 vCPU VPS (2 × 8 threads). An anonymous flood degrades the app. |
| 2 | **Cost** | **No global AI spend control.** Quotas are per account and in memory, so they reset on restart. Invite codes are shared and reusable, with no usage cap. The quota is charged even when the answer is withheld. No token usage is recorded. The live call is unproven (task 2.6), so the verifier's rejection rate on real answers is unknown: it may withhold a large share and burn cost for nothing. | `coach-explain.mjs:260-270, 334, 342-345`; `security.mjs:24-39`; `openspec/changes/hosted-beta-readiness/tasks.md` 2.6 | High. Typical spend is small (section 2.4), but the bill is unbounded in code, and value per dollar is unknown. |
| 3 | **Reliability and maintainability** | **No CI, lint or format.** Tests run on one machine, with environment failures accepted as normal. There is no gate on PRs, even though agents author many of them. | No `.github/`; no lint config; `docs/agents/setup.md` | High. Regressions reach `main` unnoticed, and the coach verifier and security headers can silently break. |
| 4 | **Reliability** | **Fragile operational state.** One process and one SQLite file, by design. No schema migrations; JSON blobs change shape in code. Rate limits, quotas and the 1,000-entry evidence store are in memory and reset on deploy. Under modest use the evidence store evicts entries within minutes and causes spurious 409 "analysis expired" errors. Backups are manual. No monitoring, error tracking or alerting; logs are `console` only. `/healthz` checks the database, not Stockfish. The image is pinned by tag, not digest. The default AVX2 Stockfish build crashes on hosts without AVX2. | `app.mjs:46-53, 58-61, 421-426`; `coach-explain.mjs:315`; `docs/deploy-beta.md` "Backups", "Known gaps" | Medium-high. The first schema change or host incident risks data loss or a silent outage. |
| 5 | **Privacy and compliance** | **No account lifecycle or privacy notice in the app.** No password reset, deletion or full export. The landing page privacy policy covers only the waitlist and does not mention app accounts, saved games or Anthropic as a processor. Usernames can be enumerated through the 409 on register, and accounts can be locked out through the per-username login limit. | `docs/deploy-beta.md` "Known gaps"; `site/pages/privacy.html`; `app.mjs:118, 130` | Medium-high once real (especially EU) users join. Support load: every forgotten password needs a manual database edit. |
| 6 | **Maintainability** | **Very large files and duplicated logic.** `web/src/main.jsx` is 71 KB, and one `App` component holds 56 `useState` hooks. `styles.css` is 103 KB. `server/app.mjs` is 34 KB with schema, auth and about 50 routes inline. Two UCI drivers with separate slot pools (`engine.mjs` and `opponent-engines.mjs`). Three copies of the material table (`engine.mjs:19`, `coach-explain.mjs:14`, `bot-game.mjs:84`). The session-cookie regex is parsed in three places. Engine-id labels can mislead: review always records `engineId:'stockfish19'` even though the image runs Stockfish 18 (`app.mjs:341`, `main.jsx:128`); the receipt shows the real engine name. | File sizes in section 1.2 | Medium. Slows every change and makes review by humans or agents error-prone. |
| 7 | **Security (minor)** | Login lockout, as above. Scrypt uses Node's default cost (N=16384), below current OWASP guidance for scrypt. CSP allows `style-src 'unsafe-inline'`. The legacy tunnel code (`hosting.mjs` guard is mounted at `app.mjs:62`) remains a configuration trap: setting `PUBLIC_ORIGIN` or `CHESSLAB_BACKEND_SECRET` changes auth for every route. | `app.mjs:30, 119`; `security.mjs:58`; `hosting.mjs` | Low-medium |
| 8 | **Brand and naming** | **The working name ChessLab is still everywhere internally:** npm package `chesslab`, Docker tag `chesslab:beta`, `/data/chesslab.sqlite`, cookie `chesslab_session`, header `X-ChessLab-Backend-Key`, all `CHESSLAB_*` env vars, `localStorage` keys, the `.chesslab.json` study format and `chesslab-study` id, the PGN header `ChessLabOriginalPly`, server log lines "ChessLab ready", the repo name, and `ChessLab-dossier.zip`. This is deliberate and recorded (`openspec/changes/rename-askthemove/tasks.md` 3.2 awaits a founder decision). Visible UI text is clean, and a test enforces it (`web/src/product-name.test.js`). Renaming the cookie, storage keys or format later needs a migration. | `grep` counts | Low for users; grows with every stored artifact. |
| 9 | **Brand and legal (repo content)** | **Chess.com language stays in the repo, not in shipped code.** Shipped app code has none. Two test files mention it only to assert its absence. `site/DESIGN.md:136` lists Chess.com's look as something to avoid. But "one-to-one Chess.com parity" wording and research captures remain in: `docs/` (62 files, including `docs/application.md` and every `docs/verification/*/README.md`), `report/` (151 files), `openspec/` (26), `design/` (10), `docs/research/sources/supplied-master/chesscom-product-atlas/`, `CONTEXT.md`, and the root zip. Git history still holds earlier screenshots (CONTEXT.md, "Original assets"). The `/research` and `/design` archives are served whenever `APP_ORIGIN` is unset or `SERVE_ARCHIVES=1` (`index.mjs:10-13`, `security.mjs:54`). | `grep -ril chess.com` | Low while the repo is private and `APP_ORIGIN` is set. Real if the repo is opened, shared with investors, or the archive flag is flipped. |
| 10 | **License** | Stockfish (GPL-3.0) ships in the image, and the cburnett pieces (GPL-2.0-or-later) ship to browsers. Licence texts are included. There is no `LICENSE` for the project's own code, and ADR 0001 leaves it open. Publishing the image means offering the Stockfish source, as `docs/deploy-beta.md` notes. | `web/public/licenses/`, `Dockerfile:34-36` | Low for a private beta; decide before any public distribution. (Not legal advice.) |

**Strengths to keep:**

- **The coach is built around grounding.** The rules library decides legality, and the engine supplies bounded evidence. Claude explains only server-built evidence, and learner free text never reaches the prompt. Every answer is verified, with a deterministic fallback on every path.
- **Cross-site protections are layered:** the `Origin` check, a JSON-only POST requirement, `Sec-Fetch-Site` and SameSite=Strict cookies (`app.mjs:73-87`).
- **The CSP is strict:** `script-src 'self'`, `frame-ancestors 'none'`.
- **Settings fail closed:** bad `TRUST_PROXY`, invite codes or origins stop the server (`security.mjs`).
- **Concurrency is guarded:** games and reviews use optimistic revision checks.
- **The supply chain is pinned:** the Stockfish download is checked against its SHA-256 and identity-tested.
- **The container is non-root,** with a read-only app tree.
- **The deploy guide is honest,** with its known gaps listed.
- **The waitlist backend is well built:** salted IP hashes, no fallback salt, a constant-time admin token check, a honeypot, and identical replies for new and existing emails.

---

## 6. Recommendations

### R1. Put an engine capacity governor in front of Stockfish (effort S, then M)

**Problem.** Stockfish is the bottleneck and the main DoS surface (risk 1). Clients choose search time and threads up to 90 s and 8 threads. Slot counts are hard-coded and do not match the host's CPUs. An anonymous endpoint starts processes.

**Change.**

- **S:**
  - In hosted mode (`APP_ORIGIN` set), clamp limits on the server regardless of the request: analysis ≤3 s, review ≤5 s per move, `threads=1`, `lines ≤3`. Remove the 20 s and 90 s options from Settings when hosted.
  - Set the engine slot count from an env var such as `ENGINE_SLOTS`, defaulting to vCPU − 1. Share one pool between analysis and opponent engines.
  - Allow at most one in-flight engine job per user, and rate-limit `/api/games/:id/bot`.
  - Cache `engineStatus()` for 60 s and take it out of `/api/status`, or rate-limit that route by IP.
- **M:**
  - Cache analysis results in SQLite, keyed by (full move history, variant, limits, engine), so repeat review steps and coach evidence reuse them. This also replaces the 1,000-entry in-memory evidence map.
  - Keep a small warm pool of Stockfish processes (one per slot, `ucinewgame` between searches) instead of spawning per search.
- Load-test with 10–20 simulated reviewers before inviting anyone.

### R2. Add AI spend and quality guardrails, then prove the live call (effort S)

**Problem.** There is no global cap, invite codes are reusable, cost and verifier pass rate are unmeasured, and the live call has never run (risk 2).

**Change.**

- Record `response.usage` and the verdict reason for every call in a small SQLite table, `coach_calls(user, ts, model, in, out, cache_read, cache_write, outcome)`.
- Enforce a daily and monthly global budget from that table, falling back to the engine summary when it is reached. Also set the Anthropic Console limit.
- Cache verified answers, keyed by a hash of the evidence JSON, so repeat asks cost nothing.
- Give invite codes per-code usage limits and expiry (a table, not an env string), or switch to single-use codes generated from the waitlist export.
- Run task 2.6:
  - one live call to confirm `fallbacks:'default'`, `output_config.effort` and caching are accepted by SDK 0.131.0;
  - then about 50 real positions as a mini evaluation, to measure the share of answers that are withheld and the token use at `low` effort.

  If the withheld share is high, tune the prompt or verifier before launch rather than after.

### R3. Add CI with real quality gates (effort S)

**Problem.** Nothing checks PRs (risk 3), and the suite is never fully green.

**Change.**

- Add a GitHub Actions workflow that, on every PR and push to `main`:
  - runs `npm ci && npm test && npm run build` on Node 24, with Stockfish 18 installed (reuse the Dockerfile's pinned download or apt) so the engine tests run instead of failing;
  - runs `npm --prefix site ci && npm --prefix site test && npm --prefix site run build:check`;
  - runs `docker build`;
  - runs `npx @fission-ai/openspec validate --all --strict`, or whichever pinned CLI the project uses.
- Mark tests that need Maia, Leela or tablebases as skipped when those are absent, instead of failing, so green means green.
- Add Prettier or Biome with a pre-commit or CI check. Format new or touched files first so the history is not churned at once.
- Keep `setup_skills.py` out of CI.

### R4. Make operations durable before real data arrives (effort M)

**Problem.** There are no migrations, state lives in memory, backups are manual, nothing is monitored, and accounts have no lifecycle (risks 4 and 5).

**Change.**

- **Schema:**
  - add a `PRAGMA user_version` migration runner (an ordered list of SQL and JS steps run at boot inside a transaction);
  - move rate limits, AI quotas and coach evidence to SQLite tables with TTL cleanup.
- **Backups:** automate them. Either run Litestream to S3 or R2 alongside the app, or add a cron'd `VACUUM INTO` script to the repo with encryption and a monthly restore drill.
- **Monitoring:**
  - JSON request logs with request ids and durations;
  - error tracking (for example Sentry, free tier);
  - an external uptime check on `/healthz`, extended to report engine availability from the cached status.
- **Accounts:**
  - an admin CLI for password reset, account deletion and full-account export (JSON of all games and progress), as a stopgap for self-service flows;
  - an in-app privacy notice and terms that name Anthropic as a processor and state data retention;
  - add the app to the site's privacy page.

### R5. Pay down structural debt that slows every change (effort M to L, staged)

**Problem.** Very large monolithic files, duplicated engine and limit logic, legacy tunnel code, about 19 MB of research artifacts in the product repo, and an unresolved rename (risks 6, 8 and 9).

**Change.**

- **(M)** Split `web/src/main.jsx` into feature modules with custom hooks: `useGame`, `useAnalysis`, `useReview`, `useAccount`, with screens per tab.
- **(M)** Split `server/app.mjs` into `express.Router` modules: `auth`, `games`, `analysis`, `coach`, `content`.
- **(M)** Merge `engine.mjs` and `opponent-engines.mjs` into one UCI driver plus pool. Move the material and piece tables into `shared/`.
- **(S)** Delete `sites-worker.mjs`, `hosting.mjs` and `build:sites` once the host is chosen.
- **(S)** Move `report/`, `design/`, `docs/research/sources/`, `references/` and the root zip and PNGs to a private archive repo, so the product repo carries no Chess.com parity material.
- **(L)** Decide the rename (task 3.2): repo, package, image, env vars and log lines are cheap; the cookie, storage keys and study format need dual-read migrations. Do it before the cohort grows, since each stored artifact raises the cost.

### Suggested order before inviting testers

1. R1 (S part)
2. R2
3. R3
4. The backup automation and admin-reset parts of R4
5. Then deploy (tasks 3.7 and 3.8)

R5 can run alongside the beta.

---

## Appendix: method and limits

- Read every server module that touches routing, auth, the engine and the coach. Also read the Dockerfile, the deploy guide, the OpenSpec hosted-beta and rename tasks, the landing-page backend, and its configuration. Other modules were sampled by `grep` for tables, routes and limits.
- `npm ci` and `npm test` ran in a scratch copy, since deleted. The landing-page tests and build check ran with the root `node_modules`, without installing wrangler. No Stockfish, Python chess libraries, Playwright browsers or OpenSpec CLI were available, so engine-dependent tests, the browser smoke test and `openspec validate` were not exercised.
- The token sizes are character-based estimates; no Anthropic API call was made. Prices are Anthropic's first-party list prices for Claude Opus 5.5 as of October 2026.
- Nothing has been deployed (per `docs/deploy-beta.md`), so no runtime, latency or capacity figure here is measured.
