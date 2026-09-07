# ChessLab Atlas QA Report

**QA date:** 7 September 2026  
**Browser:** Chromium 144, headless  
**Desktop viewport:** 1440 × 1000  
**Mobile viewport:** 390 × 844

## Automated browser checks

- Ten SPA routes rendered without JavaScript page errors or console errors.
- Capability map, play workspace, branch tutor, learning, community, BRD, screen atlas, architecture and research views were opened and captured.
- Piece interaction moved the demo pawn from e2 to e4.
- Mode control switched to Bot and reflected active state.
- A node-bound branch-tutor question was submitted and rendered in the conversation.
- BRD search for `fair play` reduced the table from 215 requirements to one matching row.
- Mobile document width remained 390 px with no horizontal overflow.
- `research/one-to-one-traceability.csv` returned HTTP 200 through the local static server.

## Data integrity checks

- 180 unique capability IDs.
- 180 unique one-to-one mapping IDs and 180 unique functional acceptance contracts.
- 209 unique screen/state IDs.
- 215 unique requirement IDs.
- 38 unique source IDs.
- Every capability and requirement source ID resolves in the source ledger.
- Every traceability requirement ID and representative screen ID resolves.

## PDF checks

- `ChessLab_Atlas_BRD.pdf`: 74 A4 pages, tagged, no PDF structural suspects reported.
- `ChessLab_Atlas_Screenshot_Book.pdf`: 13 A4 landscape pages, tagged, no PDF structural suspects reported.
- BRD visual review sampled the cover, executive decision, capability table, risk register, early/middle/late functional appendices, source ledger and closing release gate.
- Screenshot-book visual review sampled the cover, desktop product views and final mobile comparison.

## Important boundary

The browser checks establish rendering, route wiring, specified demo interactions and responsive overflow behavior. They do not establish legal chess move validation, multiplayer correctness, production security, performance, scalability, model grounding, fair-play detection efficacy, full accessibility conformance or learning efficacy.
