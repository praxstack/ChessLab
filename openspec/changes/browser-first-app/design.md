# Design: browser-first app

## Shape

```
Browser (one tab)
  React UI (web/src/*.jsx)           unchanged screens, api() now local
  local router (web/src/local/)      same paths and JSON as /api/* today
    rules modules (shared/)          moved from server/, used by both
    storage (IndexedDB | memory)     games, progress, training, settings
    engine (Web Worker)              Stockfish 19 Lite, UCI
  outside calls, only when needed:
    tablebase.lichess.ovh            endgames <= 7 pieces
    api.anthropic.com                coach, learner's own key (path A)
    coach Worker                     coach, invite code (path B)
```

## Seams

1. `api(path, body, signal)` in `web/src/main.jsx` is the only data door (plus one `fetch` for PGN and study export). It becomes `localApi(path, body, signal)`, which returns the same JSON and throws the same `{message, status}` errors. The network path stays the default until the browser app reaches parity: `npm run build`, `npm run dev`, `just app`, Docker and the Mac host script build the server app, and only `VITE_BACKEND=local` (`npm run build:app` into `web/dist-app/`, `npm run dev:app`) uses the local router.
2. Route handlers live in `web/src/local/routes/*.js`, one file per area (games, review, training, rush, lessons, endgames, openings, positions, coach, status). Each takes `{store, engine, coach, now}` so tests inject fakes.
3. Rules modules move from `server/` to `shared/` with no Node imports: `node:crypto` becomes `globalThis.crypto` (`randomUUID`, `crypto.subtle.digest` for hashes, made async where needed). `server/*.mjs` re-export from `shared/` so server tests keep passing.
4. Storage interface: `get(collection, id)`, `put(collection, value)`, `list(collection, {index, value})`, `delete(collection, id)`, `exportAll()`, `importAll(json)`. Two implementations: `idb-store.js` (IndexedDB, one database `askthemove`, version 1) and `memory-store.js` (tests). Collections replace today's SQLite tables one to one (`games`, `game_reviews`, `bot_results`, `progress`, `lesson_sessions`, `puzzle_attempts`, `puzzle_profiles`, `puzzle_runs`, `daily_puzzles`, `review_practice`, `vision_runs`, `game_collections`, `collection_games`). `users`, `sessions` and `coach_daily` are not needed in the browser.
5. Engine interface (`web/src/local/engine/`): `createEngine({workerUrl})` returns `{status(), analyze({fen, moves, movetime, lines}), bestMove({fen, moves, movetime, skill}), stop()}`. `analyze` returns the same object shape as `server/engine.mjs` `analyze` (`engine`, `fen`, `turn`, `bestmove`, `lines[{moves, score}]`, `limits`). One worker, one queue; a new request for the same board cancels the old one. Until the engine package lands, the router uses a stub that reports the engine as unavailable.
6. Coach interface (`shared/coach/`): `buildEvidence(...)`, `SYSTEM_PROMPT`, `verifyAnswer(...)`, `engineAnswer(...)` moved unchanged from `server/coach-explain.mjs`. The browser client picks path A (own key in settings) or B (invite code) and posts evidence only.

## Coach Worker (`deploy/coach-worker/`)

- `POST /explain` with `{inviteCode, evidence, asked}`. Rejects bodies over 32 KB, unknown fields, or an invite code whose SHA-256 is not in the `COACH_INVITE_DIGESTS` secret.
- D1 table `coach_daily(budget TEXT, day TEXT, count INTEGER, PRIMARY KEY(budget, day))`; budget = invite digest; cap from `COACH_MAX_PER_DAY` (default 50). Over the cap returns the engine answer with reason `daily_limit`, like today.
- Calls `https://api.anthropic.com/v1/messages` with the fixed `SYSTEM_PROMPT`, model from `ANTHROPIC_MODEL` (default `claude-opus-5-5`, same as the server), effort `low` and `max_tokens` 1024, then `verifyAnswer`; a failed check returns the engine answer with reason `unverified`.
- `max_tokens` was planned as 400. Claude Opus 5.5 always thinks and its thinking counts toward `max_tokens`, so 400 risked cutting most answers off (`incomplete`); 1024 at low effort still caps each call at about 2 US cents of output.
- The Worker does no chess work: the free plan allows 10 ms of CPU per request, and replaying engine lines took 5 to 40 ms. The browser builds the evidence with the rules library and sends it without its text fields (`shared/coach/payload.js`). The Worker checks every field against a closed schema (SAN tokens, fixed words, bounded numbers), uses a fixed engine label and writes the summary from the checked fields, so no client text reaches the prompt. A dishonest client can only mislead its own explanation, and every answer still passes `verifyAnswer` and the 110-word cap.
- CORS allows only the app origins in `APP_ORIGINS`. Secrets set with `wrangler secret put`; never committed.

## Hosting

- `npm run build:app` (`VITE_BACKEND=local`) outputs `web/dist-app`; plain `vite build` stays the server app until parity. `scripts/browser-app-hosting.mjs` (a Vite plugin, active only for `build:app`) writes `web/dist-app/_headers`, the web app manifest and icons, so the server build stays unchanged. `_headers` sets a CSP: `connect-src 'self' https://tablebase.lichess.ovh https://lichess.org https://api.anthropic.com <coach worker origin from VITE_COACH_URL>`, `script-src 'self' 'wasm-unsafe-eval'`, `worker-src 'self'`, `style-src 'self'`, plus the security headers the site uses.
- Engine files are copied from `site/public/assets/engine/` into `web/public/engine/` with `COPYING.txt` (GPL v3), cached by the browser.
- `npm run deploy:app` runs `wrangler pages deploy web/dist-app --project-name askthemove-app --branch main`. Documented in `docs/deploy-browser-app.md`.

## Risks

- Safari may clear IndexedDB after 7 days without a visit for sites not added to the home screen. Mitigation: `navigator.storage.persist()`, an "Add to home screen" hint, Back up / Restore.
- Phones analyse slower than a desktop; the thinking-time setting and a visible "thinking" state cover it.
- Some routes may lean on SQLite queries; port them to plain array filters over the collection.
