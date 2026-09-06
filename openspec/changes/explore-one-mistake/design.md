## Context

Draft design for the proposed first experiment. See `proposal.md` for motivation and scope. The repository has research and development tooling but no application. These choices are recommendations for review.

## Goals / Non-Goals

Goals: keep legal state, navigation and explanations consistent in one browser application. Preserve user work through branching, reload and failed saves.

Non-goals: a distributed backend, an independent rules engine, or an unrestricted chatbot in the first deterministic prototype.

## Decisions

1. Use a small TypeScript web app, with an established rules library such as chess.js and a board component chosen after license review. Keep move replay authoritative. Reimplementing chess rules would add risk without advancing the learning interaction.
2. Represent the study as a tree of history-bearing nodes with parent IDs, move sequences, an immutable original-mainline designation, and a separate selected node and anchor. FEN is useful cached state but not full identity. Avoid transposition merging in the study tree because identical boards can have different draw histories and questions.
3. Run Stockfish in a worker with bounded search and cancellation. Bind results to node ID and request ID so a late result cannot annotate a newly selected position. Preserve engine identity, search limits and score perspective. Treat search output as evidence, not a universal proof.
4. Begin with deterministic capture/defense explanations and learner-authored questions. Derive arrows and material deltas from replayed moves. Unsupported questions remain attached to their node and allow manual exploration. Add model-generated wording only after the evidence contract is tested, with a server-held API key if a hosted model is chosen.
5. Use IndexedDB transactions for local studies and a versioned JSON export for full fidelity. PGN alone does not encode all learning metadata. Validate exported/imported study structure before replacing active state. No cloud database is needed for this experiment.
6. Keep the primary layout to a board, current-position explanation and collapsible move tree. Provide explicit return controls and text alternatives for the visual evidence. A second permanently visible board is unnecessary; comparison can replay two chosen lines in the same board.

## Risks / Trade-offs

- Tree navigation may overwhelm learners. Test nested exploration and return with real users before adding more panels.
- Legal move sequences do not establish that an explanation teaches well. Have a chess educator review examples and separately test learner transfer.
- Limited search may miss a defense. Show limits and avoid calling a line forced without adequate evidence.
- Browser storage can be cleared or unavailable. Show save status and keep export available.
- The original research's `Na3` example is inconsistent. Reconstruct the source position and validate all demonstration moves before use.
- Shipping a Stockfish binary or WASM build requires a reviewed licensing and source-distribution plan. A process or worker boundary alone is not a licensing conclusion.

## Migration plan

There is no existing application or user database to migrate. Keep the first study format versioned; retain exports when changing it. Release and hosting require a separate implementation decision. Reverting code must not delete user study data.
