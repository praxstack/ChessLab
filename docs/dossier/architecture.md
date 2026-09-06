## Keep chess authority separate from explanation

An established rules library owns legal moves and state. Stockfish supplies search results with stated limits. Deterministic extraction supplies inspectable facts about captures, material and supported piece relationships. A language model can explain those facts; it must not invent missing board evidence.

{{ARCHITECTURE}}

## The simplest credible initial architecture

One browser application can hold the board, original game, variation tree, questions, local engine worker and local storage. The initial deterministic demonstration does not need an account service, queue, cloud database, model gateway, vector store or new model training.

The existing draft recommends TypeScript, a rules library such as chess.js, a suitable board component, a worker-based Stockfish integration and IndexedDB. No application dependencies or versions are installed or accepted yet. These are design recommendations, distinct from the Python/Pandoc tooling used to generate this report.

## State that cannot be hand-waved away

| Record | Necessary responsibility |
| --- | --- |
| Original game | Preserve imported moves, source and completion status |
| Snapshot | Preserve enough lineage to reconstruct the full rule state |
| Branch | Attach legal moves to the correct parent without modifying siblings |
| Selected node and anchor | Keep “where I am” separate from “where I want to return” |
| Analysis result | Record engine identity, limits, score perspective and the node/request it belongs to |
| Explanation | Attach text and visual commands to specific evidence and the correct question |
| Study export | Preserve branches and learning metadata, not only the mainline PGN |

FEN alone does not preserve repetition history. Two identical boards can belong to different histories or questions. Do not merge their study nodes simply because the board matches. Engine-result caching can be evaluated separately. [Stockfish position-history guidance](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html).

A late engine response must not annotate the position the learner selected after the request began. Save failures must be visible, with the current work retained in memory and export available. Invalid PGN or study imports must not replace the current valid study.

## What “explainable” can honestly mean

A replayed line proves that those moves can be executed and that the stated captures occurred. It does not prove that every alternative loses, that a move is forced, or that a strategic explanation is the best teaching explanation. Label engine scores as estimates at their search limits and distinguish an example continuation from a forced result.

The motivating report exposes this problem. Its knight is already on a3, yet parts of the report propose `Na3`. The screenshots support the placement of the bishop, rook, knight and defender. They do not establish the report's invented evaluation numbers or a complete engine-verified analysis. The HTML arithmetic illustration is expressly conditional, not a playable or verified puzzle.

## Adjustable opponents

Stockfish offers strength controls, but an engine's calibrated setting is not automatically an online human rating. Human-move models address a different question: what players at a level tend to choose. [Stockfish interface](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html).

A current research correction matters: the official Maia-2 repository now recommends Maia-3 for new projects. The supplied report's Maia-2 recommendation should therefore be revisited when sparring is implemented. Model weights, licenses, hardware needs and calibration still require direct evaluation; no Maia model was installed here. [Official Maia-2 repository](https://github.com/CSSLab/maia2).

## Boundaries before a public release

- Keep imported text and PGN comments as data. Render them safely and prevent them from changing agent instructions.
- Do not send provider secrets to browser code. If hosted model answers are introduced, put credentials behind an appropriate server boundary.
- Review licensing for the rules library, board, engine build, model weights and imported content. Maintain exact-source provenance for distributed components.
- Provide export, deletion and understandable retention rules before accumulating learner histories.
- Restrict platform integrations to permitted completed-game workflows. External assistance in ongoing human games conflicts with platform fair-play rules. [Chess.com](https://www.chess.com/legal/fair-play) · [Lichess](https://lichess.org/page/fair-play).

A raw PGN result marker is not a trustworthy universal detector of a live game. Avoid advertising an infallible “Fair Play Lock.” The first product should simply avoid live-board overlays and live-human-game integration.

## Roadmap with evidence at each step

| Stage | Build or learn | Evidence to move forward |
| --- | --- | --- |
| Current | Research, skill setup, draft OpenSpec and this dossier | Files and setup/report checks only |
| Interaction prototype | One legal completed-game exploration | Real learner can branch, compare and return |
| Teaching pilot | Supported explanations and related retries | Correct explanations and observed independent understanding |
| Repeat-use pilot | Reliable saves, imports and follow-up practice | Learners return after subsequent games |
| Commercial test | Concrete paid offer and measured support/serving costs | Transactions, cancellation reasons and contribution economics |
| Expansion | In-product AI games, broader Q&A, collaboration or sync | A demonstrated need, with scope and budget agreed |

The source's six-month roadmap, service diagram and broader feature inventory remain available in full in the library. They are not the minimum architecture or an approved delivery schedule.
