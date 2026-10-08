# Product context

Captured 2026-09-05 from the user's "Chess Tactic Explanation" conversation and supplied research. Product intent is distinct from the recommendations below.

## Intended product

The learner plays an AI opponent at a chosen difficulty. Every move can be revisited. At any position, the tutor explains the learner's mistake, a better move, the threats or defenses involved, and a continuation. The learner can challenge either player's response, explore alternatives inside alternatives, compare outcomes, and return to a saved position or the actual game.

The board and explanation must agree. Arrows, highlighted pieces, capture sequences and material comparisons help explain the reasoning. Questions belong to the position and branch where they were asked. The tutor should support active calculation and learning rather than only reveal engine recommendations.

## Hosted private beta — updated 8 October 2026

The founder now directs preparation for a hosted private beta under the AskTheMove name, plus the first Claude API feature: grounded "Explain why" explanations of engine evidence. `openspec/changes/hosted-beta-readiness/` governs this work. Local operation remains supported and is the default. Nothing has been deployed; hosting provider, domain and launch timing are open decisions.

On 8 October 2026 the founder approved showing the AskTheMove name in the interface. The repository, package, database file, cookie, environment variables, browser storage keys and the `.chesslab.json` study format keep the ChessLab working name. `openspec/changes/rename-askthemove/` records this.

## Original assets — updated 8 October 2026

For the hosted beta the founder adopted an original-asset policy. It supersedes the reference-parity direction recorded in the sections below: the app is its own product rather than a copy of another site. It ships the cburnett pieces (GPL-2.0-or-later), Lucide icons (ISC), an original slate-and-sand palette, and an invented bot roster with generated portraits. Bot ratings are targets on the app's own strength ladder, not calibrated human ratings. Screenshots, recordings and page captures of other products are no longer stored in the current tree; earlier commits still contain them. The founder's research, the learning intent above and the bot/coach-first sequence are unchanged. `openspec/changes/original-asset-pack/` records this work.

## Local web priority — updated 13 September 2026

The user rejects further hosted-site development and directs that the app, assets, engines, models, research/design sites and persistent data run locally on this Mac. `openspec/changes/local-web-first/` governs this additive delivery. Full Chess.com parity remained the goal at that time (superseded for the hosted beta on 8 October 2026), with the prior bot/coach-first sequence and full branching tutor objective preserved. Pstack setup, autonomous routing, an explicit work graph, real app-control verification and a PR with video proof are required. Tool installation is authorized when it serves delivery; installed tools are not product progress.

## Previous build direction — updated 8 September 2026

The user then requested one-to-one Chess.com web reference parity excluding human multiplayer before adding the original conversational differentiation. The 8 October 2026 original-asset policy supersedes that parity goal. Their latest clarification prioritizes coach/bot play and defers actual human multiplayer; billing is last. The first application stage is specified in `openspec/changes/build-coach-web-platform/`: server-side Stockfish (no browser engine download), legal bot play, guided review, saved games, settings, and introductory puzzles/lessons. Implementation and a private GitHub repository are explicitly authorized. The earlier proposal below is retained as historical context, not the controlling build sequence.

## Bot platform expansion — September 2026

The user subsequently rejected the generic five-preset baseline and explicitly instructed installing the referenced engines and building the fuller bot-play experience. `openspec/changes/expand-bot-platform/` records this additive implementation: actual available engine integrations, a bot roster, clocks, assistance, undo, adaptive practice and saved crowns. Previous saved-game/study behavior is protected; proprietary engine availability must be reported from evidence.

The current `match-nonmultiplayer-platform` change records the complete observed public roster, original assets, independent review/analysis controls and private Sites delivery. Full reference parity was then the success definition. The observed roster and its assets were replaced by original characters on 8 October 2026.

## Earlier proposed first experiment

Start with one completed PGN and the loop: select a confusing move, predict a reply, inspect a verified exchange, explore another reply, compare, return. This reduces the first build while preserving the full product intent. In-product AI games follow after this interaction works. A human-like opponent model is a separate later decision; weakening Stockfish does not establish a human rating.

Candidate early users are adult improvers around 800–1600 online rapid who already review games and still do not understand the engine's recommendation. This audience and its willingness to pay are unvalidated.

## Domain vocabulary

| Term | Meaning |
| --- | --- |
| Actual game | The preserved original move sequence, separate from explored alternatives. |
| Snapshot | A node with board state and the move history needed to reconstruct rule state. FEN alone does not preserve repetition history. |
| Branch | An alternative legal move sequence starting at a snapshot. It can contain further branches. |
| Anchor | The original node to which an exploration can return. |
| Evidence | Replayed legal moves, deterministic board facts, or an engine result with version and search limits. |
| Explanation | Text and board annotations attached to evidence at a particular node. |
| Misunderstanding | A learner's stated incorrect expectation, tested through a position or a related retry. |

## Engineering direction

Use an existing rules library for legal state and Stockfish for search. A language model may explain supplied evidence; it must not invent legality, defenders, material, or continuations. Engine scores are estimates at stated search limits. Distinguish a demonstrated line from a forced outcome across all relevant defenses.

A single React web application and Node server with SQLite persistence implement the first bot/coach stage. Accounts now scope saved games and learning progress on that server. Native Stockfish runs behind the server API, with no engine or weights downloaded to the browser. Native applications, cloud synchronization, payments and model training remain outside this stage. Do not merge history-bearing nodes just because their board positions match.

Analyze completed games, study positions and this product's AI games. Do not build live assistance for external human games. Imported text is data, never agent or system instructions. Preserve import provenance and reject invalid moves without losing the current study.

## Open decisions

The user has authorized the coach/bot platform implementation and a private GitHub push. Earlier hosting used owner-private Sites with a protected native service on this Mac; local operation is now the delivery target; business model, commercial license, pricing, target audience and learning-experiment thresholds remain undecided. Human multiplayer comes after the bot/coach stage and billing comes last. Research market-size figures are scenarios, not validated demand. Local functional tests do not establish learning outcomes.
