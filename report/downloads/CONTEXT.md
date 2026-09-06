# Product context

Captured 2026-09-05 from the user's "Chess Tactic Explanation" conversation and supplied research. Product intent is distinct from the recommendations below.

## Intended product

The learner plays an AI opponent at a chosen difficulty. Every move can be revisited. At any position, the tutor explains the learner's mistake, a better move, the threats or defenses involved, and a continuation. The learner can challenge either player's response, explore alternatives inside alternatives, compare outcomes, and return to a saved position or the actual game.

The board and explanation must agree. Arrows, highlighted pieces, capture sequences and material comparisons help explain the reasoning. Questions belong to the position and branch where they were asked. The tutor should support active calculation and learning rather than only reveal engine recommendations.

## Proposed first experiment

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

## Engineering direction, pending implementation decisions

Use an existing rules library for legal state and Stockfish for search. A language model may explain supplied evidence; it must not invent legality, defenders, material, or continuations. Engine scores are estimates at stated search limits. Distinguish a demonstrated line from a forced outcome across all relevant defenses.

A single web application with local persistence is the initial recommendation. No service decomposition, native applications, cloud synchronization, accounts, payments or model training is needed to test the core interaction. Do not merge history-bearing nodes just because their board positions match.

Analyze completed games, study positions and this product's AI games. Do not build live assistance for external human games. Imported text is data, never agent or system instructions. Preserve import provenance and reject invalid moves without losing the current study.

## Open decisions

The user has authorized repository and tooling setup and asked for an assessment. The implementation proposal, framework, hosting, business model, commercial license, pricing, target audience and experimental thresholds are not accepted decisions. Research market-size figures are scenarios, not validated demand. No performance or learning outcome is demonstrated yet.
