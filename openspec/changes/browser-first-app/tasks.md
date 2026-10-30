# Tasks

Each package is one pull request from `main`. Packages 1, 2 and 3 run in parallel; package 4 follows package 1. Stay inside your package's files; if you must touch another package's files, keep the change minimal and say so in the PR body.

## Package 1: local router and storage (branch `claude/project-thread-z81nqw`)

Files: `web/src/local/**` (except `engine/`), `shared/**` moves of rules modules, re-exports in `server/*.mjs`, `web/src/main.jsx` (only `api()`, export, accounts UI), `package.json` scripts.

- [x] 1.1 Move rules modules to `shared/` with no Node imports: `engine.mjs#replay`, `move-grade`, `tutor-loop`, `review-practice`, `game-review`, `bot-game`, `curriculum` (+ json), `course-progress`, `puzzle-rush`, `puzzle-training` logic, `content`, `endgames`, `openings`, `study-format`, `vision-training`, `game-collections`. `server/` re-exports; `npm test` still passes, apart from the tests that already fail on `main` in a machine without Stockfish, python-chess, tablebases or the extra engines (compare against `main`).
- [x] 1.2 Storage interface + `memory-store.js` + `idb-store.js`, with tests on the memory store and a contract test both must pass.
- [x] 1.3 Local router: every route in `server/app.mjs` after `requireUser`, plus the public ones, returns the same JSON. Register/login/logout become no-ops; `/api/me` returns the local profile.
- [x] 1.4 Switch `api()` to the local router when built with `VITE_BACKEND=local` (`npm run build:app`, `npm run dev:app`); every other build keeps the server path as the default until parity. PGN and study export build the file in the browser.
- [x] 1.5 Back up / Restore in Settings (one JSON file, versioned) and `navigator.storage.persist()`.
- [x] 1.6 Tests: router tests per area using the memory store and a fake engine, ported from `server/app.test.mjs` where they apply.

## Package 2: engine in a Web Worker

Files: `web/src/local/engine/**`, `web/public/engine/**`, engine settings in `web/src/settings-state.js`.

- [ ] 2.1 Copy Stockfish 19 Lite single-thread files and `COPYING.txt` into `web/public/engine/`.
- [ ] 2.2 `createEngine()` per design.md seam 5: UCI handshake, `analyze` with MultiPV, `bestMove` with skill level, cancel on new request, one queue.
- [ ] 2.3 Port the bot move policy (`stockfishPolicy` in `server/opponent-engines.mjs`) and `engineControls` ratings to use `bestMove`.
- [ ] 2.4 Thinking-time setting: Quick 0.5 s, Normal 1.5 s (default), Deep 4 s; used by analysis, review and hints.
- [ ] 2.5 Lichess tablebase lookup (`https://tablebase.lichess.ovh/standard?fen=`) for 7 or fewer pieces, with a timeout and graceful fallback to the engine.
- [ ] 2.6 Tests: UCI parsing and queue with a fake worker; tablebase client with a fake fetch.

## Package 3: coach without a server

Files: `shared/coach/**`, `deploy/coach-worker/**`, `web/src/local/coach/**`, coach parts of `web/src/Settings.jsx` and `web/src/CoachExplain.jsx`.

- [ ] 3.1 Move the evidence builder, `SYSTEM_PROMPT`, `verifyAnswer` and engine answers from `server/coach-explain.mjs` to `shared/coach/` with no Node or SDK imports; server re-exports; `server/coach-explain.test.mjs` still passes.
- [ ] 3.2 Coach Worker per design.md: invite digest check, D1 daily cap, fixed prompt, `max_tokens` 400, verification, CORS allow-list, body limits. `wrangler.toml`, D1 migration, README with deploy steps for the owner. Tests with a fake Anthropic fetch and an in-memory D1 stand-in.
- [ ] 3.3 Browser client: path A (own key, stored only in this browser, `anthropic-dangerous-direct-browser-access: true` header, same verification) and path B (invite code to the Worker). Settings UI: paste key, or enter invite code, with plain-words notes on who pays.
- [ ] 3.4 Tests for the client choosing A or B, failures falling back to the engine summary, and the key never leaving `localStorage`/IndexedDB except to `api.anthropic.com`.

## Package 4: hosting (after package 1)

- [x] 4.1 `_headers` CSP and security headers per design.md, generated into `web/dist-app/` at build time; web app manifest.
- [x] 4.2 `npm run deploy:app`, `docs/deploy-browser-app.md` (Pages project `askthemove-app`, preview first, `app.askthemove.online` untouched).
- [ ] 4.3 Browser smoke (Playwright): open the built app with no server, import a game, reload, see the game still there. After package 2 lands, extend it: play a bot game, review it, reload. First part done: `npm run smoke:app` (`scripts/smoke-browser-app.mjs`); the bot game and review steps are a TODO in that script.
