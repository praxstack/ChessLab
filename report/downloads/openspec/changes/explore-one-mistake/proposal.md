## Why

Players can recognize an engine's recommended move without understanding why their own idea fails. ChessLab should let them test an explanation by playing alternatives for either side and returning to their original game.

Status: draft recommendation captured during project setup, not approved for implementation. No application behavior or learning outcome is verified.

## What Changes

- Import a completed standard-chess PGN and preserve its original move sequence.
- Navigate to a snapshot, create alternatives inside alternatives, compare two lines, and return to the exact anchor or actual-game node.
- Attach a learner's question and prediction to a node. Show replayable evidence for a narrow set of capture/defense explanations with arrows and material changes.
- Preserve the study locally across reloads and allow export. Handle invalid data and failed saves without silently losing work.

## Capabilities

### New Capabilities

- `mistake-exploration`: completed-game import, nested legal branches, evidence-backed inspection, comparison, and durable return to the actual game.

### Modified Capabilities

None. No existing product specifications.

## Impact

A first browser prototype will need a board, an established rules library, local engine execution, and local persistence. Specific dependency versions and application licensing must be selected before implementation. No cloud account or API key is required for the first deterministic demonstration; model-assisted free-form answers can follow the same evidence boundary.

## Non-goals

This experiment excludes matchmaking, external live-game assistance, accounts, cloud sync, native clients, subscriptions, voice, human-model training and coach collaboration. Adjustable AI games remain part of the full vision, deferred from this first experiment. Fixed evidence explanations in the prototype must not be presented as unrestricted AI Q&A.

## Open decisions

Confirm the first implementation scope, choose the web dependencies and their licenses, and reconstruct educator-reviewed legal positions. Define a separate learner experiment before claiming improved learning or demand. The larger roadmap and TAM estimates are not delivery commitments.
