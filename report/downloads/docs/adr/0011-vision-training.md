# Vision rounds on the local server

## Grounding
This is timed recognition, not engine analysis. main.jsx owns navigation/auth. Board.jsx maps flipped squares and click/drag/touch with existing assets and accessible square names. Its editing flag permits an exercise board without claiming full-game legality. app.mjs authenticates and rejects cross-origin writes before protected routes; its SQLite connection and injected nowMs support persistent exercises. course-progress.mjs uses revisioned JSON sessions. Reuse these boundaries; preserve actual game state.

## Usage and shape
installVision(app, db, nowMs) mounts owned list/restore, start/resume, and revisioned answer/quit routes. The view consumes round, history, bests and serverNow. A round owns id, mode, color, coordinates, orientation, startsAt, endsAt, revision, prompt, score, mistakes and state. Answers identify round, revision, square and moved-piece origin. One indexed table stores rounds. chess.js supplies lone-piece movement, separate from game replay. A monotonic display clock projects the server deadline and resynchronizes after responses.

## Synthesis
Pstack how/architect/arena applied sequentially by root: the installed team runtime gate prevents delegation; no independent design or review claimed. Candidate A: server rounds, one JSON table, component owns only selection/display. Scores 5/5 on timing, ownership, restart, reuse and small interface. Candidate B: browser reducer generates prompts and uploads final event log. Scores 2/5: validating client timestamps requires a second server authority, duplicates timing knowledge and exposes log internals. Choose A; graft B's monotonic display clock. Reject client timestamps and final-only uploads. Both screened for shallow modules, leakage, temporal decomposition and pass-through layers. Three routes hide transitions rather than expose a storage/replay pipeline.

## Limits
One loopback request per answer is accepted for authoritative scoring. A local account is required for saved practice. Bests are private scores, not ratings. Five non-pawn piece types have ordinary movement prompts; pawn/promotion distribution and vendor weighting remain unverified. No engine/model installation is needed.

## Protected baseline and stop rule
Baseline/current accepted version: f11e5fc0b3503e33503f9e15edcbf82773aa0fe4. Preserve all 100 tests and 96 browser flows, account data, other features, policies and verification gates. This run changes the candidate, not existing acceptance thresholds. Only feature paths and necessary shared fixes are mutable. Existing evidence is immutable. Keep failed proof separate. Stop after two no-gain candidates; never weaken checks. Rollback: baseline checkout and consistent pre-install SQLite snapshot. Receipts remain outside their attested content set.

## Next step
Build the server transition boundary, then the board view and additive browser flows. Revisit the design only if actual friction invalidates it.
