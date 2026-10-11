# ChessLab — UNDERSTANDING (audit 2026-10-02)

Repo: GitHub `praxstack/ChessLab` ( default branch `main`, HEAD `9955411`, 45 commits, single author, 2026-09-07 → 2026-09-14).
This checkout is a fresh clone made 2026-10-02 (`git reflog`: `clone: from https://github.com/praxstack/ChessLab.git`). When I read it (21:44-21:54 local) it had **no `data/` directory**, so none of the ignored local assets (accounts DB, 9 extra engines, puzzle/explorer catalogues, tablebases) existed. Sibling audit agents began installing ignored assets afterwards (`data/engines`, `data/explorer`, `data/tablebases` appeared from 21:47 onward), so the "observed today" results in section 9 describe the clean-clone state, which is what a new contributor or CI runner would see. No tracked file is affected.

Everything below was verified against the working tree at HEAD unless marked otherwise. Evidence is `file:line` or a command that was actually run during this audit.

---

## 1. What it is

A local-first chess training web app ("play a bot, review a decision, try another line, return to the actual game").

- **Intended product** (`CONTEXT.md`): a branching *conversational tutor* that explains mistakes, lets the learner challenge replies and nest alternatives, with an LLM that only explains engine/rules evidence.
- **What is built**: a Chess.com-style non-multiplayer clone — bot play against real UCI engines, engine review, nested saved variations, PGN/study import-export, puzzles (starter + Lichess catalogue), Rush, rated/daily puzzles, guided lessons, opening library + explorer, position editor, Chess960, Vision training, endgame drills, collections, board drawings.
- **Not built**: any LLM/conversational coach (no LLM client anywhere in `server/`, `shared/`, `web/src/`; coach text is deterministic string templates in `server/engine.mjs:205-260`), human multiplayer, billing (`/api/status` hard-codes `billingEnabled:false`, `server/app.mjs:98`), Torch/Komodo engines (shown as disabled "not connected" options in `web/src/Settings.jsx`).

Maturity: feature-rich single-developer prototype, built almost entirely in one agent-driven burst (33 of 45 commits on 2026-09-13). No CI, no licence, no linter/formatter/type-checker. Code is written in an extremely dense style (lines up to 2,097 characters in `web/src/main.jsx`).

## 2. Stack

| Layer | Tech |
| --- | --- |
| Runtime | Node >= 24 (ESM), `node:sqlite` `DatabaseSync`, `node:test` |
| Server | Express 5.2 (`server/app.mjs`, one factory `createApp`) |
| Client | React 19.2 SPA, Vite 8 (`vite.config.mjs`, root `web/`), no router, no state library |
| Rules | chess.js 1.4.0 (Standard), chessops 0.15.1 (Chess960, GPL-3.0-or-later) behind `shared/chess.js` |
| Engines | Native UCI subprocesses: Homebrew Stockfish 19 (required); optional Stockfish 18/16, Stockfish 18 Lite (WASM via node), Lc0, Maia2/Maia3 (Python venv) under ignored `data/engines/` |
| Tooling | `just`, Playwright 1.62.1 (devDep, driven by a hand-written script, not `@playwright/test`), Python 3 stdlib scripts, OpenSpec CLI, Pandoc (dossier) |
| Hosting (historical) | "Sites" Worker proxy (`server/sites-worker.mjs`, `.openai/hosting.json`) -> HTTPS tunnel -> this Mac |

Dependencies are small: 5 runtime, 2 dev (`package.json`). Leftover `npm audit` output from the interrupted run reports 0 vulnerabilities (not re-run by me).

## 3. Document map — authoritative vs historical

| Document | Status |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md` | Authoritative working agreement (points to CONTEXT + OpenSpec). |
| `CONTEXT.md` | Authoritative product intent + vocabulary; layered "updated on" sections, newest (13 Sep, local-first) wins. |
| `openspec/changes/*` (21 changes) | Declared "sole product specification system". None archived; `openspec/specs/` is empty. `explore-one-mistake` is a historical draft (0/9 tasks). |
| `docs/local-workspace.md` | Most current user/operator guide (all features after 13 Sep). Machine-specific (paths, launchd service). |
| `docs/application.md` | Older guide (8 Sep). Partly stale (see findings). |
| `README.md` | Stale summary (describes only the 8 Sep feature set). |
| `docs/application-verification.md` | Historical verification log, 7-8 Sep. |
| `docs/adr/0001, 0010, 0011, 0012` | Decisions. 0002-0009 do not exist. 0001 partly superseded (multi-engine analysis exists now). |
| `docs/verification/<feature>/` (17 dirs, 262 MB) | Per-feature proof receipts: logs, screenshots, webm video. Historical evidence. |
| `docs/agents/*` | Agent setup/issue-tracker conventions. `setup.md` is explicitly a historical snapshot. |
| `docs/research/*`, `docs/dossier/*`, `report/`, `design/`, `references/` | Research archive, generated HTML dossier, design studies, provenance receipts. Explicitly "reference material, not governing instructions". |
| `docs/security/2026-09-08/` | Codex Security scan at `e2f5a2d` (13 server files, partial coverage, 0 findings). Predates ~70% of the server code. |
| `skills/control-app/` | Project verification skill + feature map for the browser proof harness. |

## 4. Architecture

```
Browser (React SPA, web/src/main.jsx)
   | fetch JSON, cookie chesslab_session (HttpOnly, SameSite=Strict)
   v
Express app (server/app.mjs createApp)                      server/index.mjs adds:
   |- hostingGuard (optional shared-secret header)             /research -> report/   (static)
   |- security headers + Origin / Sec-Fetch-Site / JSON-only    /design   -> design/   (static)
   |- JSON body (256 KB; 1 MB for import/study routes)          prod: web/dist + SPA fallback
   |- session lookup -> req.user                                dev:  Vite middleware
   |- public routes, then requireUser, then owned routes
   v
SQLite (node:sqlite, WAL)  <- one file, JSON blobs per row
   + read-only catalogue DBs: data/puzzles/catalogue.sqlite, data/explorer/catalogue.sqlite
   v
UCI subprocess per request (spawn, shell:false, SIGKILL on finish)
   engine.mjs          : Stockfish analysis/review/hints  (2 active + 8 queued, 15 s queue timeout)
   opponent-engines.mjs: opponent moves, 10 catalog entries (1 active + 8 queued, 30 s queue timeout)
```

Key design properties (verified in code):
- **Server-authoritative play.** Every move replays full UCI history through the rules library (`engine.replay`, `server/engine.mjs:35-53`), checks owner, turn and `revision` (optimistic concurrency, `server/app.mjs:148-161`).
- **A game is one JSON document** in `games.data` (moves, clocks, study tree, practice metadata, chat). `storeGame` re-reads the row and merges the latest saved `study` so async engine work cannot overwrite study edits (`app.mjs:149-161`).
- **Study tree** = up to 40 branches, each storing its *full* move list from the start plus `anchorPly`/`parentId` (`server/study-format.mjs:11-52`). Annotations (comment, NAGs, board marks) key on `(branchId, ply)`.
- **Fresh engine process per search**; no pooling (marked `ponytail:` deferred-work comments, 7 in total).
- **Shared rules adapter** `shared/chess.js`: `createChess(fen, variant)` returns chess.js for Standard or a hand-written `Chess960` class wrapping chessops with a chess.js-like surface. Used by both server and browser bundle.

## 5. Module map

### Server (`server/`, ~2.9k dense lines + JSON data)
| File | Role |
| --- | --- |
| `index.mjs` | Process entry: `createApp()`, static mounts, Vite dev middleware or `web/dist`, listen on `HOST`/`PORT` (default `127.0.0.1:8770`), SIGTERM/SIGINT shutdown. |
| `app.mjs` (380 lines) | Everything HTTP: schema bootstrap, CSRF/origin middleware, in-memory rate limiter, auth (scrypt, 7-day sessions), games CRUD, move/bot/resign/undo/hint/assist, practice, positions, import/export, whole-game review, analyze, starter lessons/puzzles, wiring of sub-modules. |
| `engine.mjs` | Stockfish UCI client, slot queue, `replay`, `analyze` (MultiPV, played-move classification 50/150/300 cp, evidence text), `engineStatus`, tablebase path. |
| `opponent-engines.mjs` | 10-entry engine catalog, availability handshake cache (5 min / 30 s), `chooseOpponentMove`, novice random-move policy below 1100, Lc0 node budget, Maia rating conditioning. |
| `bot-game.mjs` | Pure game helpers: `setupOptions` validation, clocks, crowns, adaptive rating, scripted chat, undo, threat arrows, `practiceSnapshot`. |
| `game-review.mjs` | Whole-game report accumulation (`beginReview`/`appendReview`), position/limits signatures. |
| `review-practice.mjs` | "Practice key moves" state machine + routes; table `review_practice`. |
| `study-format.mjs` | `validateStudy`, annotated PGN read/write (uses chess.js internal `chess.js/src/pgn.js` parser), portable `.chesslab.json`. |
| `puzzle-training.mjs` | Lichess catalogue trainer: custom/rated/daily modes, local Elo (K=32, start 1500), attempts table, study export. |
| `puzzle-rush.mjs` | Rush 3 min / 5 min / Survival runs, 3 lives. |
| `course-progress.mjs`, `curriculum.mjs`, `curriculum.json` | 4 courses / 12 lessons / 24 board challenges, revisioned sessions. |
| `content.mjs` | 6 starter multiple-choice lessons + 6 starter puzzles. |
| `openings.mjs`, `openings.json` | 3,810 CC0 named lines, search, position recognition. |
| `opening-explorer.mjs` | Move statistics from read-only corpus DB + per-user index of own completed games (LRU of 8 users). |
| `game-collections.mjs` | Collections CRUD (100/account), revisioned. |
| `vision-training.mjs` | 30-second coordinate/move recognition rounds, server-owned deadline. |
| `endgames.mjs`, `endgames.json` | 24 endgame drills (with stored WDL/DTZ labels). |
| `bot-profiles.json` | 166 bot profiles in 12 categories (verified count). |
| `hosting.mjs`, `sites-worker.mjs` | Historical hosted path: backend shared-secret guard and edge Worker proxy. |
| `*.test.mjs` (20 files) | `node:test` suites; several require real engines / data assets. |

### Shared (`shared/`)
`chess.js` (variant adapter + Chess960 class + `chess960Fen`), `position.js` (FEN validation for editor/import), `board-marks.js` (drawing validation, `[%cal]`/`[%csl]` PGN round-trip).

### Client (`web/src/`)
| File | Role |
| --- | --- |
| `main.jsx` (70 KB, one `App` component, ~60 `useState`) | All navigation, auth, live game loop, review/analysis, study editing, import/export, modals, starter lessons/puzzles. The single biggest risk surface on the client. |
| `Board.jsx` | Board rendering, click/drag/touch, arrows, drawings, classification badge. |
| `BotSetup.jsx` | Bot roster, engine/rating/clock/assistance/variant picker. |
| `GameReview.jsx`, `ReviewPractice.jsx` | Whole-game report (graph, key moves) and key-move practice. |
| `PuzzleTraining.jsx`, `PuzzleRush.jsx` | Catalogue puzzles, rated/daily/custom, Rush. |
| `LearningPath.jsx`, `OpeningLibrary.jsx`, `OpeningExplorer.jsx`, `EndgamePractice.jsx`, `VisionTraining.jsx`, `GameLibrary.jsx`, `PositionEditor.jsx`, `PositionNotes.jsx`, `BoardDrawingTools.jsx`, `Settings.jsx` | Feature panels. |
| `chess-state.js` | Pure helpers (replay, move rows, branches, clock text, rematch options). |
| `chess-state.test.js`, `auth-continuation.test.js` | The only client tests. The second one slices function text out of `main.jsx` and evaluates it with `new Function` (source-coupled). |
| `web/public/` | 166 bot portraits, 12 Chess.com piece PNGs, icons, chessops licence + source tarball. |

### Scripts (`scripts/`)
`check_app_browser.cjs` (823 lines, the e2e/proof harness), `check_local_server.mjs` (entrypoint doctor), `check_engine_games.mjs`, `install_engines.py` (downloads/builds engines into `data/engines`, also acts as the Maia2 UCI shim), `import_puzzles.py`, `import_explorer.py`, `download_tablebases.py`, `check_endgame_tables.py`, `chess960_oracle.py`, `build_openings.mjs`, `local_snapshot.py`, `build_report.py` + `report_assets/`, `build_chrome_capture_atlas.py`, `build_sites.mjs`, `setup_skills.py`, plus four `*_test.py`.

## 6. Entry points and main flows

- `npm run dev` -> `node --env-file-if-exists=.env server/index.mjs` (Vite middleware, HMR on 127.0.0.1).
- `npm start` -> same with `NODE_ENV=production`, serves `web/dist` (must `npm run build` first).
- `npm test` -> `node --test --test-concurrency=1 server/*.test.mjs web/src/*.test.js`.
- `just <recipe>`: `setup`, `check`, `test`, `app`, `app-check`, `e2e`, `proof`, `local-check`, `report`, `report-check`, `report-test`, `report-zip`.
- Documented installed service (not in this repo): a launchd job running a separate local-web copy on `127.0.0.1:8772` (`docs/local-workspace.md:3`). Nothing was listening on 8770/8772 during this audit.

HTTP API (all under `/api`, JSON only, GET or POST):
- Public: `status`, `bots`, `me`, `register`, `login`, `logout`, `training/catalog`, `learn`, `endgames`, `curriculum`, `openings`, `openings/:id`, `explorer`, `explorer/games/:id`.
- Authenticated (after `app.use('/api',requireUser)`, `app.mjs:136`): `collections*`, `vision*`, `endgame-attempts`, `endgames/:id/study`, `games` (list/create), `games/:id` (+ `move`, `bot`, `resign`, `undo`, `hint`, `assist`, `practice`, `study`, `pgn`, `study-file`, `review`, `practice-review*`), `lesson-progress`, `course-lessons/:id/{start,action}`, `rush*`, `training*`, `openings/recognize`, `openings/:id/study`, `positions`, `import`, `import-study`, `analyze`, `lessons/:id/answer`, `puzzles/:id/answer`.

Flow — live bot game: `POST /api/games` (options validated by `setupOptions`, engine availability checked) -> client `botReply` if engine to move -> `POST /games/:id/move` (revision + legality + clock) -> `POST /games/:id/bot` (engine subprocess, re-read row, clock settle, store) -> repeat; timed games are polled every second (`main.jsx:128-135`).

Flow — review: move selection triggers debounced `POST /api/analyze` (220 ms) unless a saved whole-game report supplies a cached entry; "Review whole game" loops `POST /games/:id/review` one ply per request with an `after` cursor, stored in `game_reviews`.

Flow — study: all edits are client drafts (`dirty`), saved via `POST /games/:id/study` with a separate `studyRevision`; most navigation actions call `persistStudy()` first.

## 7. Data and state

SQLite file `CHESSLAB_DB` (default `./data/chesslab.sqlite`, created on boot; WAL, `foreign_keys=ON`, `busy_timeout=5000`). No migration framework: every module runs `CREATE TABLE IF NOT EXISTS` at startup; schema evolution is "add optional JSON fields".

15 tables: `users`, `sessions`, `games`, `game_reviews`, `progress`, `bot_results`, `puzzle_attempts`, `puzzle_profiles`, `daily_puzzles`, `puzzle_runs`, `lesson_sessions`, `game_collections`, `collection_games`, `vision_runs`, `review_practice`. Most carry a single `data TEXT` JSON blob with `json_extract` expression indexes.

Other state:
- Read-only catalogue DBs (ignored): `data/puzzles/catalogue.sqlite` (`CHESSLAB_PUZZLES`), `data/explorer/catalogue.sqlite` (`CHESSLAB_EXPLORER`); feature degrades to "not installed" when absent.
- `data/engines/` (`CHESSLAB_ENGINES_DIR`), `data/tablebases/standard` (`CHESSLAB_TABLEBASES`).
- Browser `localStorage`: `chesslab-settings`, `chesslab-game` (last opened game id).
- In-memory only: rate-limit buckets, `pendingBot`/`pendingReview` sets, engine availability cache, explorer personal-game cache. Lost on restart; single-process assumption.
- Auth: scrypt(64) with per-user salt, session token = 32 random bytes, SHA-256 stored, 7-day expiry, cookie `Secure` only when `COOKIE_SECURE=1`.

Env vars: `STOCKFISH_PATH`, `HOST`, `PORT`, `CHESSLAB_DB`, `COOKIE_SECURE`, `PUBLIC_ORIGIN`, `CHESSLAB_BACKEND_SECRET`, `CHESSLAB_ENGINES_DIR`, `CHESSLAB_TABLEBASES`, `CHESSLAB_PUZZLES`, `CHESSLAB_EXPLORER`, `CHESSLAB_ORACLE_PYTHON`, `CHESSLAB_PLAYWRIGHT_ROOT`, `CHESSLAB_EVIDENCE_DIR`, `CHESSLAB_BASELINE_ONLY`, Worker-side `CHESSLAB_BACKEND_URL`. `.env` in this checkout is byte-identical to `.env.example` (no secrets).

## 8. External services

Runtime: none (fully local; loopback only). Install-time downloads only: GitHub releases (Stockfish 18/16, stockfish.js), Homebrew (stockfish, lc0), storage.lczero.org (Lc0 net), GitHub + Hugging Face (Maia2/Maia3), database.lichess.org (puzzles), database.nikonoel.fr (Lichess Elite games), tablebase.lichess.ovh (Syzygy 3-5). Historical: ChatGPT "Sites" hosting (`.openai/hosting.json`).

## 9. Build / run / test — documented vs observed today

| Command | Documented | Observed 2026-10-02 (fresh clone, no `data/`) |
| --- | --- | --- |
| `npm ci` | required | `node_modules` present from the earlier run. |
| `npm run build` | passes | Passes: 46 modules, JS 451 KB / CSS 93 KB (`logs/build.log`, sibling agent run). |
| `npm test` | "105 passed" (`docs/verification/endgame-practice/README.md`) | **105 tests: 92 pass, 4 fail, 9 skipped** (`logs/npm-test.log`). All 4 failures are missing local assets: python oracle venv, Stockfish 18/16/Lite, tablebases. Earlier interrupted run also showed one timing assertion failing under load (`engine.test.mjs:154`, `<1500 ms`). |
| `just e2e` | passes ("110 browser flows") | **Fails deterministically** at `scripts/check_app_browser.cjs:239` (`/Checkmate/` vs `'Inaccuracy'`), 3 of 3 leftover runs plus my own isolated repro. Root cause below. |
| `just check` | documented as failing on `unslop` hash drift | Fails earlier: `Missing installed skill: ~/.agents/skills/diagnosing-bugs/SKILL.md` (`python3 scripts/setup_skills.py --check`). OpenSpec strict validation: 21/21 pass. `git diff --check`: clean. |
| `just test` extras | pass | `setup_skills.py --self-test`, `local_snapshot_test.py`, `import_puzzles_test.py` all pass. |
| `just report-check` | verifies dossier | **Exit 1**: `Changed source; rebuild: .gitignore` — generated dossier is stale (last rebuilt 2026-09-08). |
| `python3 design/check.py` (README) | checks design archive | **Crashes**: `FileNotFoundError design/imagine-refinements.txt` — HEAD commit deleted the file but `design/manifest.json` still lists it. |
| Engine catalog | "ten installed engine configurations" | Clean clone: only `stockfish19` available; other 9 report "not installed" (verified via `listOpponentEngines()` before sibling installs). |

Root cause of the e2e failure (reproduced with a throwaway Playwright script against an isolated temp DB): after clicking a key move, the board and heading render the new ply in the same commit, but `analysis` state is replaced one render later inside a passive effect (`web/src/main.jsx:116-126`). For about 5 ms the UI shows "2… Qh4#" with the previous move's badge ("Inaccuracy"); it then corrects to "Checkmate". The harness reads `.classification` immediately. `just proof` launches Chromium with `slowMo:120` when `CHESSLAB_EVIDENCE_DIR` is set (`check_app_browser.cjs:29`), which hides the race; plain `just e2e` does not.

## 10. CI and GitHub

- **No `.github/` directory, no workflows**; `gh run list` is empty; Actions workflow count 0. All verification is manual/local.
- Issues: 0 open (project uses local Markdown tickets under ignored `.scratch/`).
- PRs: 16 total. #1 merged 2026-09-14. **#2-#16 are OPEN**, stacked on each other (each bases on the previous feature branch), yet every head commit is already in `main` (`git rev-list --count origin/main..<branch>` = 0 for all 17 remote branches). `prax/endgame-practice` has no PR (matches unchecked task in `openspec/changes/add-endgame-practice/tasks.md`); `prax/vision-training` was advanced to the `main` tip so PR #16 now also contains the endgame commit.
- 17 stale remote feature branches, all fully merged.

## 11. Roadmap vs reality

Declared sequence (`openspec/changes/local-web-first/tasks.md` graph): local parity features -> remaining curriculum/platform parity -> **full branching conversational tutor** -> human multiplayer -> billing.

| Item | Declared | Reality |
| --- | --- | --- |
| 19 feature changes (coach platform ... chess960, vision) | all tasks `[x]` | Code present for each (spot checks below). None archived to `openspec/changes/archive/`; `openspec/specs/` empty, so there is no accepted main spec. |
| `add-endgame-practice` | 5/8 | Code + tests merged; PR, local install, and cleanup tasks unchecked. |
| `match-nonmultiplayer-platform` | 8/10 | Open: verify signed-in coach/settings vs reference; "finish all remaining non-multiplayer feature/curriculum mappings". |
| `explore-one-mistake` | 0/9 | Historical draft; most engineering items were delivered under later changes, but 1.1, 1.2 (educator-reviewed corpus) and 3.2 (learner study) were never done. Checklist never reconciled. |
| Conversational tutor | "longer-term objective" | Not started. No LLM dependency or code. |
| Multiplayer, billing | deferred | Not started. |
| Hosted delivery | superseded 13 Sep | Worker/guard code + tests remain in tree. |

Spot-checked "done" claims (all against code/data at HEAD):
1. 166 bot profiles in 12 categories — true (`server/bot-profiles.json`).
2. 3,810 CC0 openings, pinned commit — true (`server/openings.json`).
3. 24 endgame drills — true (`server/endgames.json`).
4. 4 levels / 12 lessons / 24 challenges — true (`server/curriculum.json`).
5. Classification thresholds 50/150/300 cp — true (`server/engine.mjs:296`).
6. Crowns 3/2/1 rule — true (`server/bot-game.mjs` `crownsFor`).
7. Adaptive rating +/-350 — true (`adaptiveRating`).
8. Local puzzle Elo K=32 from 1500 — true (`puzzle-training.mjs` `ratingUpdate`, `profile`).
9. Rush: 3 min / 5 min / Survival, three misses end the run — true (`puzzle-rush.mjs`).
10. Study limits 40 branches / 5,000 moves / 1,000 annotations / 700 KB; import 900 KB — true (`study-format.mjs`).
11. Vision 3 s countdown + 30 s round, server-owned — true (`vision-training.mjs`).
12. Engine queues 2+8 (analysis), 1+8 (opponents); availability cache 5 min — true.
13. "105 application tests pass" — only with the full local asset set; 92/105 here.
14. "All 110 browser flows pass" — not reproducible via `just e2e` today.
15. "ten installed engine configurations" — machine state, not repo state; 1 of 10 here.
16. "PGN export does not include variations" (`docs/application.md:51`) — stale; variations and comments are exported (`writeAnnotatedPgn`).
17. "file up to 50 KB" (`docs/application.md:51`) — stale; limit is 900 KB.

## 12. Risk areas (where bugs most likely live)

1. **`web/src/main.jsx`** — one 70 KB component, ~60 state hooks, sequence counters and refs guarding async races (`viewSequence`, `accountSequence`, `exerciseSequence`, `busyRef`). State derived in effects one render late (proven by the e2e race). Functions like `openTrainingStudy` have no error handling or busy guard.
2. **Engine subprocess lifecycle** (`engine.mjs`, `opponent-engines.mjs`) — fresh process per search, hard-coded deadlines (`movetime + 4 s`, 25 s), queue timeouts, MultiPV iteration selection, documented host-load sensitivity; opponent queue has no abort path.
3. **Hard pin on engine identity** — `stockfish19` must report `^Stockfish 19\b` (`opponent-engines.mjs:175,207`); a Homebrew upgrade of Stockfish makes the only always-available opponent "unavailable".
4. **Clocks and concurrency in `app.mjs`** — re-read/settle/store sequences around awaits in `/bot`, `/hint`, `/assist`; `pendingBot` in-memory lock; `studyRevision` vs `revision` dual versioning; study save writes without a SQL-level revision predicate.
5. **Chess960 adapter** (`shared/chess.js`) — hand-written chess.js-compatible wrapper over chessops (castling encoding, FEN counters, repetition, threats). Its differential oracle test cannot run without the python venv.
6. **PGN/study import-export** (`study-format.mjs`) — relies on chess.js internal `src/pgn.js`; branch re-parenting for `ChessLabOriginalPly`; lossy normalisations.
7. **Puzzle/Rush/daily state machines** — JSON-blob rows, uniqueness enforced by partial expression indexes, local-time "day" logic and streaks.
8. **Whole-list endpoints** — `GET /api/games` returns every full game document (up to 500 x 700 KB studies); `endgame-attempts` parses all games.
9. **Verification infrastructure itself** — tests and checks depend on ~3 GB of unversioned local assets and on machine-specific skill installs; no CI; proof artefacts (262 MB) duplicated per feature in git.

## 13. Notes on audit hygiene

- No ChessLab processes or listeners were left from the interrupted run when I started (checked `ps`, `lsof`; nothing on 8770/8772). Processes seen later (a Stockfish probe, the tablebase downloader) belong to sibling audit agents working in parallel, not to me.
- I started one isolated headless-browser repro (temp DB in the OS temp dir, loopback port 0) and two short engine probes; all were closed. `git status` in the repo is clean.
- I did not run `just setup` (it creates skill symlinks) and did not touch the separate local-web copy beyond a read-only `ls`/`readlink` to check the documented data symlink claim (it is a real directory there, not a symlink into this repo).

_Security and repository-visibility notes from this audit are kept privately by the owner._
