## Context

Archive baseline: commit 993a24e. User explicitly changed the product sequence on 7 September 2026, then clarified bot/coach before human multiplayer and billing last. This version records that instruction before implementation. Prior research, evaluator assumptions and draft remain preserved. The user requested implementation and private GitHub delivery in this session; planning-only skill wording does not remove that authorization.

## Goals / Non-Goals

Build a functional recorded-layout web baseline: large board left, coach/review right, navigation rail, settings modal and move history. Preserve the future conversational tutor objective. No human matchmaking or billing in this first stage. No claim of full Chess.com platform/content parity. Stockfish is the available engine; unavailable proprietary engines are not fake selectable options.

## Decisions

Use one Node 24+ Express server, React/Vite interface, chess.js legality and Node's built-in SQLite. Native Stockfish is a server subprocess; no WASM/model weights in web assets. SQLite stores users, sessions, games and progress. Passwords use salted scrypt, opaque hashed sessions use HttpOnly same-site cookies, mutations reject cross-origin requests, and every game lookup checks ownership. The server binds loopback by default. Internet deployment, TLS and operational hardening remain a distinct release task.

The server owns actual bot games and validates every move and expected revision. The browser owns temporary variation trees attached to a saved game, saved through a validated study endpoint. It never overwrites the actual mainline when exploring. Review evaluates each selected position with full replay history and a bounded engine search; stale responses cannot overwrite the newly selected position. Deterministic evidence wording explains checks, captures, material and alternatives without pretending to be unrestricted LLM chat.

Original lessons and puzzle solutions are authored and replay-validated. A small initial collection is labeled as such, not a copied full curriculum. Anonymous users can browse the interface; a local-server account saves games and progress. No email or external account provider is required.

Visual direction: recorded Chess.com structural layout with ChessLab identity; midnight #101b2d rail, slate #1d2b42 surfaces, paper #e8eef8 text, blue #5d91ef action, board #dae5f2/#7996bb, amber #edba68 highlights. System body text, Georgia for restrained lesson headings, monospace move/evaluation numbers. The distinctive element is the large uninterrupted board aligned with a coach panel, not a marketing landing page. Click, drag, keyboard move entry, coordinates, arrows, promotion choice, sound toggle and reduced-motion support.

## API contract

All endpoints are same-origin JSON, errors `{error:string}`, game arrays use UCI moves. IDs are opaque strings. Auth responses `{user:{id,username}|null,progress:{lessons:string[],puzzles:string[]}}`.

- GET /api/status → `{engine:{available,name},billingEnabled:false}`.
- GET /api/me; POST /api/register and /api/login `{username,password}`; POST /api/logout.
- GET /api/games → `{games:Game[]}`; POST /api/games `{color:'w'|'b',level:1..5,title?}` → `{game}`.
- GET /api/games/:id → `{game}`; POST /api/games/:id/move `{move:UCI,revision}` → `{game}`; POST /api/games/:id/bot `{revision}` → `{game}`; POST /api/games/:id/resign `{revision}` → `{game}`.
- POST /api/import `{pgn}` → `{game}`. GET /api/games/:id/pgn returns PGN text. POST /api/games/:id/study `{study,studyRevision}` saves validated bounded JSON with legal history-bearing branches, without altering actual moves.
- Game `{id,title,color,level,moves:string[],initialFen:string|null,result:string|null,revision:number,createdAt:string,updatedAt:string,study:object|null,studyRevision:number,source:'bot'|'import'}`. Result is '1-0','0-1','1/2-1/2', or null. Imported games are review-only.
- POST /api/analyze `{moves:string[],initialFen?:string|null,movetime?:number,lines?:number,skill?:number,playedMove?:string}` → Analysis. `playedMove` is optional legal UCI at supplied position for a before/after review.
- Analysis `{engine,fen,turn:'w'|'b',bestmove:string|null,lines:[{move:string,moves:string[],san:string[],score:{type:'cp'|'mate',value:number},depth:number}],limits:{movetime,lines},facts:{inCheck,material:{white,black},legalMoves:number},explanation:string,played?:{move,san,classification,lossCp:number|null,explanation,afterScore:{type,value}|null}}`. Scores use White's perspective, not side-to-move. Terminal positions return no bestmove and empty lines.
- GET /api/learn → `{lessons:[{id,title,description,category,body:string[],fen,question,choices:string[]}],puzzles:[{id,title,theme,fen,side,hint}]}`. Do not disclose correct puzzle solutions in the catalog.
- POST /api/lessons/:id/answer `{choice:number}` → `{correct,explanation,progress}`. POST /api/puzzles/:id/answer `{moves:string[]}` → `{correct,complete,reply:string|null,explanation,progress}`. Validates sequence, supplies only next opponent reply after correct move. Wrong moves do not award completion.

## Risks / Trade-offs

One local server and bounded engine concurrency are a first platform baseline, not scalable public hosting. Account backup, abuse monitoring, password recovery, hosted multiplayer and billing are deferred explicitly. Engine evaluation is approximate and ratings are uncalibrated. Original learning content must be labeled introductory. Root archive 993a24e is the rollback pointer; application data lives in ignored data/ and is not deleted by code rollback.
