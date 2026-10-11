# Graph Report - ChessLab  (2026-10-03)

## Corpus Check
- 221 files · ~102,722 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 116 file(s) not represented in the graph (top: .log 95, .tsv 9, (none) 5)

## Summary
- 1381 nodes · 2460 edges · 154 communities (98 shown, 56 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `99554116`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- study-format.mjs
- App
- check_app_browser.cjs
- app.mjs
- ref_node_fs
- createTrainer
- opponent-engines.mjs
- build_report.py
- pathlib
- main.jsx
- engine.mjs
- import_explorer.py
- Chess960
- ADDED Requirements
- replay
- Board
- chess-state.js
- json
- install_engines.py
- Run ChessLab locally
- build_chrome_capture_atlas.py
- local-workspace.md
- ADDED Requirements
- Security Review: ChessLab
- ADDED Requirements
- README.md
- Application verification, 7 September 2026
- vision-training.test.mjs
- A closer look at the whole session
- Running ChessLab
- dossier/application.md
- PuzzleTraining
- Product context
- Chess960 rules boundary
- architecture.md
- pricing.md
- product.md
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- auth-continuation.test.js
- LearningPath
- PuzzleRush
- What the recording changes
- delivery.md
- investor.md
- explore-one-mistake/proposal.md
- ADDED Requirements
- ADDED Requirements
- site.js
- features/README.md
- VisionTraining
- Vision rounds on the local server
- discussion.md
- overview.md
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- ADDED Requirements
- Review and studies
- Control ChessLab
- Agent skills
- market.md
- Chess.com non-multiplayer mapping — 8 September 2026
- build-coach-web-platform/proposal.md
- expand-bot-platform/proposal.md
- Openings
- Puzzle training
- Workspace
- GameReview
- What the frames add to our design
- Settings, transcribed from the frames
- ADR 0001: run Stockfish on the server
- build-coach-web-platform/design.md
- expand-bot-platform/design.md
- explore-one-mistake/design.md
- Learning
- Bot play
- GameLibrary
- PositionEditor
- Local Chess960 delivery
- Local chess workspace design
- Local Vision delivery
- Chess960 across local play and study
- expand-bot-platform/tasks.md
- Match the observed non-multiplayer platform
- Settings.jsx
- Page
- Local endgame practice
- build-coach-web-platform/tasks.md
- explore-one-mistake/tasks.md
- ChessLab
- Endgame practice through saved source studies
- library.md
- add-vision-training/tasks.md
- local-web-first/tasks.md
- fetch
- CLAUDE.md
- gallery.js
- design/README.md
- domain.md
- issue-tracker.md
- triage-labels.md
- annotated-studies/README.md
- board-annotations/README.md
- game-collections/README.md
- opening-explorer/README.md
- position-editor/README.md
- review-practice/README.md
- add-chess960/tasks.md
- add-endgame-practice/proposal.md
- add-endgame-practice/tasks.md
- add-vision-training/proposal.md
- annotated-studies/proposal.md
- board-annotations/proposal.md
- full-game-review/proposal.md
- full-game-review/tasks.md
- game-collections/proposal.md
- learning-path/proposal.md
- local-web-first/proposal.md
- match-nonmultiplayer-platform/tasks.md
- opening-explorer/proposal.md
- opening-library/proposal.md
- opening-library/tasks.md
- position-editor/proposal.md
- position-editor/tasks.md
- position-practice/proposal.md
- position-practice/tasks.md
- puzzle-rush/proposal.md
- rated-daily-puzzles/proposal.md
- review-practice/proposal.md
- explorer/README.md
- puzzles/README.md

## God Nodes (most connected - your core abstractions)
1. `App()` - 85 edges
2. `createApp()` - 51 edges
3. `replay()` - 38 edges
4. `Board()` - 25 edges
5. `Chess960` - 23 edges
6. `chess.js` - 22 edges
7. `parseMove()` - 22 edges
8. `api()` - 21 edges
9. `analyze()` - 20 edges
10. `replay()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `page()` --calls--> `esc()`  [INFERRED]
  design/build.py → scripts/build_chrome_capture_atlas.py
- `chooseSquare()` --indirect_call--> `positionKey()`  [INFERRED]
  web/src/Board.jsx → server/game-review.mjs
- `startDrawing()` --indirect_call--> `positionKey()`  [INFERRED]
  web/src/Board.jsx → server/game-review.mjs
- `rematch()` --indirect_call--> `game()`  [INFERRED]
  web/src/main.jsx → server/opening-explorer.mjs
- `retryBot()` --indirect_call--> `game()`  [INFERRED]
  web/src/main.jsx → server/opening-explorer.mjs

## Import Cycles
- None detected.

## Communities (154 total, 56 thin omitted)

### Community 0 - "study-format.mjs"
Cohesion: 0.09
Nodes (48): chess.js, entries, output, provenance, seen, source, children, createExplorer() (+40 more)

### Community 1 - "App"
Cohesion: 0.12
Nodes (51): emptyStudy(), rematchOptions(), rootAnchor(), api(), App(), adopt(), answerLesson(), authenticate() (+43 more)

### Community 2 - "check_app_browser.cjs"
Cohesion: 0.05
Nodes (43): dependencies, chess.js, chessops, express, react, react-dom, devDependencies, playwright (+35 more)

### Community 3 - "app.mjs"
Cohesion: 0.10
Nodes (33): createApp(), limit(), derive, fail(), gameResult(), moveOn(), now(), profiles (+25 more)

### Community 4 - "ref_node_fs"
Cohesion: 0.12
Nodes (12): folder, server, state, child, env, exited, assert, { chromium } (+4 more)

### Community 5 - "createTrainer"
Cohesion: 0.14
Nodes (27): createCourseProgress(), act(), start(), fail(), courseLessons, courses, curriculumCatalog(), fixture() (+19 more)

### Community 6 - "opponent-engines.mjs"
Cohesion: 0.13
Nodes (24): closeEngine(), localTablebasePath(), { app, close }, port, server, shutdown(), catalog, children (+16 more)

### Community 7 - "build_report.py"
Cohesion: 0.12
Nodes (13): board(), build(), capture_files(), category(), check(), components(), digest(), doc_name() (+5 more)

### Community 8 - "pathlib"
Cohesion: 0.13
Nodes (4): download(), link(), main(), self_test()

### Community 9 - "main.jsx"
Cohesion: 0.18
Nodes (14): react, markColorNames, names, Piece(), BoardDrawingTools(), assistanceDefaults, BotAvatar(), BotSetup() (+6 more)

### Community 10 - "engine.mjs"
Cohesion: 0.18
Nodes (23): analysisCommands, analyze(), bounded(), canceled(), engineDirectory, enginePath(), engineStatus(), facts() (+15 more)

### Community 11 - "import_explorer.py"
Cohesion: 0.15
Nodes (5): add_game(), import_archive(), MainLine, StrictPgn, ImportTest

### Community 13 - "ADDED Requirements"
Cohesion: 0.10
Nodes (19): ADDED Requirements, Purpose, Requirement: CL-001 Preserve imported game state, Requirement: CL-002 Explore nested legal alternatives, Requirement: CL-003 Return and compare, Requirement: CL-004 Attach explanations to inspectable evidence, Requirement: CL-005 Preserve and export the study, Requirement: CL-006 Support accessible learning controls (+11 more)

### Community 14 - "replay"
Cohesion: 0.23
Nodes (16): replay(), appendReview(), beginReview(), positionKey(), reviewSignature(), advancePractice(), beginPractice(), fail() (+8 more)

### Community 15 - "Board"
Cohesion: 0.19
Nodes (12): Board(), moveRows(), replay(), EndgamePractice(), OpeningExplorer(), boardMove(), square(), submit() (+4 more)

### Community 16 - "chess-state.js"
Cohesion: 0.19
Nodes (17): addBranch(), branchDepth(), clockText(), mergePolledGame(), parseMove(), scoreText(), studyLimitError(), uci() (+9 more)

### Community 18 - "install_engines.py"
Cohesion: 0.21
Nodes (12): cache_maia(), download(), extract(), lc0(), maia(), maia2_uci(), record(), run() (+4 more)

### Community 19 - "Run ChessLab locally"
Cohesion: 0.11
Nodes (18): Annotated study files, Chess960, Continue the program, Custom position setup, Custom puzzle training, Endgame tablebases, Guided learning, Local game explorer (+10 more)

### Community 20 - "build_chrome_capture_atlas.py"
Cohesion: 0.27
Nodes (14): audio_html(), build(), card_html(), esc(), explicit_browser_url(), group_for(), human_title(), load_audio() (+6 more)

### Community 21 - "local-workspace.md"
Cohesion: 0.12
Nodes (8): Whole-game review evidence, Guided learning evidence, Local web delivery evidence, Local opening library evidence, Position practice evidence, Local Puzzle Rush evidence, Local custom puzzle training evidence, Rated and daily puzzle evidence

### Community 22 - "ADDED Requirements"
Cohesion: 0.12
Nodes (16): ADDED Requirements, Purpose, Requirement: CP-001 Legal bot games, Requirement: CP-002 Server analysis and evidence, Requirement: CP-003 Review and variations, Requirement: CP-004 Accounts and persistence, Requirement: CP-005 Usable recorded-layout interface, Requirement: CP-006 Introductory lessons and puzzles (+8 more)

### Community 23 - "Security Review: ChessLab"
Cohesion: 0.14
Nodes (13): Assets, Assumptions, Attacker Capabilities, Findings, No findings, Open Questions And Follow Up, Reviewed Surfaces, Scan Summary (+5 more)

### Community 24 - "ADDED Requirements"
Cohesion: 0.14
Nodes (13): ADDED Requirements, Requirement: BP-001 Installed engine selection, Requirement: BP-002 Bot setup and replay, Requirement: BP-003 Authoritative clocks, Requirement: BP-004 Assistance and safe undo, Requirement: BP-005 Adaptive play and local crowns, Requirement: BP-006 Verified delivery, Scenario: Delayed reply (+5 more)

### Community 25 - "README.md"
Cohesion: 0.17
Nodes (8): Commands and boundaries, Historical verification recorded on 2026-09-05, Project setup, Evidence and limits, Research and design archive, Verification before committing, Where everything lives, ChessLab research assessment

### Community 26 - "Application verification, 7 September 2026"
Cohesion: 0.17
Nodes (12): 8 September 2026 — reference recording and authentication continuation, Application verification, 7 September 2026, Automated results, Bot-platform expansion — current build, Bugs corrected during integration, Checks not claimed, Delivery boundary, Non-multiplayer reference mapping — 8 September 2026 (+4 more)

### Community 27 - "vision-training.test.mjs"
Cohesion: 0.29
Nodes (9): fail(), installVision(), latest(), settle(), pick(), squares, roles, visionBoard() (+1 more)

### Community 28 - "A closer look at the whole session"
Cohesion: 0.18
Nodes (10): 1. Playing: a stable board and a reactive coach, 2. Coach selection happens without discarding the board, 3. A finished game leads into review, 4. Settings contain several separate products, 5. Review is a workspace, not only a scorecard, 6. Alternatives and a return action already exist, 7. Skills are integrated into review, A closer look at the whole session (+2 more)

### Community 29 - "Running ChessLab"
Cohesion: 0.18
Nodes (11): Back up your data, Bot setup, clocks and assistance, Checks and troubleshooting, Current limits, Difference from Chess.com's platform, Engine inventory and difficulty, Install and start, Piece artwork correction (+3 more)

### Community 30 - "dossier/application.md"
Cohesion: 0.18
Nodes (8): Current evidence, Earlier correction: engines and piece assets, Expanded bot platform, September8 reference mapping, The platform comes first, What can be used, What remains, Engine availability — 7 September 2026

### Community 31 - "PuzzleTraining"
Cohesion: 0.33
Nodes (10): label(), PuzzleTraining(), act(), boardMove(), openPast(), refresh(), run(), square() (+2 more)

### Community 32 - "Product context"
Cohesion: 0.20
Nodes (9): Current expansion, Domain vocabulary, Earlier proposed first experiment, Engineering direction, Intended product, Local web priority — updated 13 September 2026, Open decisions, Previous build direction — updated 8 September 2026 (+1 more)

### Community 33 - "Chess960 rules boundary"
Cohesion: 0.20
Nodes (9): Candidate A: Shared local rules adapter, Candidate B: Server-authoritative Python board service, Chess960 rules boundary, Frozen acceptance and rollback, Grounding, Implementation findings, Synthesis, Tradeoffs and dependency (+1 more)

### Community 34 - "architecture.md"
Cohesion: 0.20
Nodes (9): Adjustable opponents, Boundaries before a public release, Historical record, Keep chess authority separate from explanation, Roadmap with evidence at each step, State that cannot be hand-waved away, The simplest credible initial architecture, Update: 7 September 2026 (+1 more)

### Community 35 - "pricing.md"
Cohesion: 0.20
Nodes (9): Competitor prices checked for this dossier, Costs the research understates if read too quickly, Explore the economics, Historical prices from the supplied learning report, Historical record, My pricing opinion, Price the resolved confusion, Update: 7 September 2026 (+1 more)

### Community 36 - "product.md"
Cohesion: 0.20
Nodes (9): First target customer, From prototype to a complete first release, Historical record, How learning should be measured, The experience we are trying to build, The first useful build, Update: 7 September 2026, What I would defer (+1 more)

### Community 37 - "ADDED Requirements"
Cohesion: 0.20
Nodes (9): ADDED Requirements, Requirement: Chess960 castling and history, Requirement: Protected local delivery, Requirement: Variant-aware bot games, Scenario: Castling without moving both pieces, Scenario: Install a verified candidate, Scenario: Preserve study behavior, Scenario: Start a numbered Chess960 game (+1 more)

### Community 38 - "ADDED Requirements"
Cohesion: 0.20
Nodes (9): ADDED Requirements, Requirement: Annotated PGN interoperability, Requirement: Exact local study file, Requirement: Position-bound annotations, Requirement: Verified local delivery, Scenario: Annotate a nested alternative, Scenario: Export does not lose a draft, Scenario: Reject an invalid alternative (+1 more)

### Community 39 - "ADDED Requirements"
Cohesion: 0.20
Nodes (9): ADDED Requirements, Requirement: Mouse and accessible drawing controls, Requirement: Position-bound board drawings, Requirement: Validated portable drawings, Requirement: Verified local delivery, Scenario: Draw using a phone, Scenario: Preserve marks while editing text, Scenario: Reject a malformed mark (+1 more)

### Community 40 - "ADDED Requirements"
Cohesion: 0.20
Nodes (9): ADDED Requirements, Requirement: Board-grounded instruction, Requirement: Guided courses and lesson library, Requirement: Persistent isolated lesson progress, Requirement: Verified local delivery, Scenario: Calculate a multi-move example, Scenario: Delivery remains partial platform progress, Scenario: Pick up the next lesson (+1 more)

### Community 41 - "ADDED Requirements"
Cohesion: 0.20
Nodes (9): ADDED Requirements, Requirement: Evidence-based non-multiplayer mapping, Requirement: Original roster assets and playable profiles, Requirement: Private hosted native engine access, Requirement: Review and analysis configuration, Scenario: A copied screen lacks runtime evidence, Scenario: Direct origin access, Scenario: Selecting a named bot (+1 more)

### Community 42 - "ADDED Requirements"
Cohesion: 0.20
Nodes (9): ADDED Requirements, Requirement: Interactive exploration and example games, Requirement: Local position statistics, Requirement: Safe reproducible import, Requirement: Verified local delivery, Scenario: Illegal later move, Scenario: Private source, Scenario: Study an example (+1 more)

### Community 43 - "ADDED Requirements"
Cohesion: 0.20
Nodes (9): ADDED Requirements, Requirement: Evidence-bound attempts and hints, Requirement: Guided review retries, Requirement: Saved private practice progress, Requirement: Verified local installation, Scenario: Concurrent attempt, Scenario: Preserve a strong alternative, Scenario: Resume after a hint (+1 more)

### Community 44 - "auth-continuation.test.js"
Cohesion: 0.22
Nodes (7): auth, file, harness(), lesson, line(), puzzle, source

### Community 45 - "LearningPath"
Cohesion: 0.40
Nodes (9): LearningPath(), accept(), act(), boardMove(), openLesson(), perform(), restart(), square() (+1 more)

### Community 46 - "PuzzleRush"
Cohesion: 0.42
Nodes (10): PuzzleRush(), accept(), act(), boardMove(), openRun(), perform(), retry(), square() (+2 more)

### Community 47 - "What the recording changes"
Cohesion: 0.22
Nodes (8): About the post you shared, Delivery checks, Follow-up: direct frame study, Honest design review, The full design scope, The important moments, What the recording changes, What was actually processed

### Community 48 - "delivery.md"
Cohesion: 0.22
Nodes (8): Earlier setup run: what was actually done, Git and release truth, Historical record, The short status, The skill packs, explained, This HTML report run, Update: 7 September 2026, What remains to build or decide

### Community 49 - "investor.md"
Cohesion: 0.22
Nodes (8): Completion comes in stages, Open source or a startup?, The case in favor, The first diligence experiment I would propose, The funding conversation I would avoid, What an angel would want to see completed, Would I invest today?, YC and the larger story

### Community 50 - "explore-one-mistake/proposal.md"
Cohesion: 0.22
Nodes (8): Capabilities, Impact, Modified Capabilities, New Capabilities, Non-goals, Open decisions, What Changes, Why

### Community 51 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Requirement: Complete local game report, Requirement: Key move navigation, Requirement: Resumable and isolated review, Scenario: A game changes during analysis, Scenario: Inspect a mistake, Scenario: Resume after reload, Scenario: Review a finished game

### Community 52 - "ADDED Requirements"
Cohesion: 0.22
Nodes (8): ADDED Requirements, Requirement: Local runtime and retained data, Requirement: Pstack governed proof and review, Requirement: Readable responsive chess experience, Scenario: Finding an opponent, Scenario: Moving hosted data, Scenario: Opening the local workspace, Scenario: Reviewing the change

### Community 53 - "site.js"
Cohesion: 0.22
Nodes (6): calculator, category, conceptText, exchangeText, menu, query

### Community 54 - "features/README.md"
Cohesion: 0.22
Nodes (4): Chess960, Endgame practice, ChessLab feature map, Vision training

### Community 55 - "VisionTraining"
Cohesion: 0.33
Nodes (8): colors, modes, VisionTraining(), accept(), answer(), choose(), enter(), send()

### Community 57 - "Vision rounds on the local server"
Cohesion: 0.25
Nodes (7): Grounding, Limits, Next step, Protected baseline and stop rule, Synthesis, Usage and shape, Vision rounds on the local server

### Community 58 - "discussion.md"
Cohesion: 0.25
Nodes (7): The original product request, in the user's words, The present HTML request, The research request, The setup request in this project, What is available, and what is not, What the first assessment said, Where the idea began

### Community 59 - "overview.md"
Cohesion: 0.25
Nodes (7): Historical record, How to read the evidence labels, My honest verdict, The project in one sentence, Three ways to read this dossier, Update: 7 September 2026, What exists today

### Community 60 - "ADDED Requirements"
Cohesion: 0.25
Nodes (7): ADDED Requirements, Requirement: Endgame curriculum and practice, Requirement: Local solved-position evidence, Requirement: Owned attempt history and usable controls, Scenario: A learner practices the weaker side, Scenario: A learner returns after a restart, Scenario: A promotion changes the material

### Community 61 - "ADDED Requirements"
Cohesion: 0.25
Nodes (7): ADDED Requirements, Requirement: Authoritative local round state, Requirement: Coordinate and notation rounds, Requirement: Private results and usable local controls, Scenario: A learner reads a move, Scenario: A learner returns later, Scenario: Two tabs answer the same prompt

### Community 62 - "ADDED Requirements"
Cohesion: 0.25
Nodes (7): ADDED Requirements, Requirement: Account-private local collections, Requirement: Searchable saved-game library, Requirement: Verified local delivery, Scenario: Evidence-backed delivery, Scenario: Keep a game in two collections, Scenario: Revisit a saved study

### Community 63 - "ADDED Requirements"
Cohesion: 0.25
Nodes (7): ADDED Requirements, Requirement: Complete local named-line catalogue, Requirement: History-preserving opening practice, Requirement: Honest opening recognition, Scenario: Find and inspect an opening, Scenario: Practice part of a named line, Scenario: Recognize a transposition

### Community 64 - "ADDED Requirements"
Cohesion: 0.25
Nodes (7): ADDED Requirements, Requirement: Analysis and practice continuity, Requirement: Editable board setup, Requirement: Validated position state, Scenario: Create a custom study, Scenario: Practice a Black-first setup, Scenario: Reject invalid setup

### Community 65 - "ADDED Requirements"
Cohesion: 0.25
Nodes (7): ADDED Requirements, Requirement: History-preserving position practice, Requirement: Practice boundaries, Requirement: Restart and return, Scenario: Practice a nested branch, Scenario: Return from practice, Scenario: Undo after a practice turn

### Community 66 - "ADDED Requirements"
Cohesion: 0.25
Nodes (7): ADDED Requirements, Requirement: Local Rush experience and review, Requirement: Persistent deadlines and isolated state, Requirement: Server-owned Rush runs, Scenario: Deadline reached during disconnection, Scenario: Full solution and three failures, Scenario: Retry a failed puzzle after a run

### Community 67 - "ADDED Requirements"
Cohesion: 0.25
Nodes (7): ADDED Requirements, Requirement: PT-001 Local full puzzle catalogue, Requirement: PT-002 Persistent protected attempts, Requirement: PT-003 Custom practice and review, Scenario: Finished solution review, Scenario: Mistake, continuation and reload, Scenario: Theme and rating selection

### Community 68 - "ADDED Requirements"
Cohesion: 0.25
Nodes (7): ADDED Requirements, Requirement: PM-001 Adaptive local rated puzzles, Requirement: PM-002 Shared local daily puzzle, Requirement: PM-003 Mode and progress interface, Scenario: Hint then recovery, Scenario: Mobile mode round trip, Scenario: Same day and rollover

### Community 69 - "Review and studies"
Cohesion: 0.25
Nodes (8): Annotated studies, Board drawings, Driving it with Playwright, Gotchas, Guided practice, How to get to it (user POV), Review and studies, Sub-features

### Community 70 - "Control ChessLab"
Cohesion: 0.25
Nodes (7): Cleanup, Control ChessLab, Doctor, Drive, Evidence, Helpers, Launch

### Community 71 - "Agent skills"
Cohesion: 0.29
Nodes (6): Agent skills, ChessLab working agreement, Domain docs, Issue tracker, Skill routing, Triage labels

### Community 72 - "market.md"
Cohesion: 0.29
Nodes (6): A practical route to the first users, Market-size arithmetic, with the assumptions exposed, The market is real; the opportunity is narrower, The strongest competitive overlaps, The wider field in the supplied research, What would actually differentiate it

### Community 73 - "Chess.com non-multiplayer mapping — 8 September 2026"
Cohesion: 0.29
Nodes (6): Chess.com non-multiplayer mapping — 8 September 2026, Engine scope ledger, Product and delivery evidence, Research stopping rule, Security and verification, Supplied master: what it adds

### Community 74 - "build-coach-web-platform/proposal.md"
Cohesion: 0.29
Nodes (6): Capabilities, Impact, Modified Capabilities, New Capabilities, What Changes, Why

### Community 75 - "expand-bot-platform/proposal.md"
Cohesion: 0.29
Nodes (6): Capabilities, Impact, Modified Capabilities, New Capabilities, What Changes, Why

### Community 76 - "Openings"
Cohesion: 0.29
Nodes (6): Driving it with Playwright, Game explorer, Gotchas, How to get to it (user POV), Openings, Sub-features

### Community 77 - "Puzzle training"
Cohesion: 0.29
Nodes (6): Driving it with Playwright, Gotchas, How to get to it (user POV), Puzzle Rush, Puzzle training, Sub-features

### Community 78 - "Workspace"
Cohesion: 0.29
Nodes (6): Collections, Driving it with Playwright, Gotchas, How to get to it (user POV), Sub-features, Workspace

### Community 79 - "GameReview"
Cohesion: 0.48
Nodes (6): classificationClass(), evaluationText(), GameReview(), install(), run(), graphValue()

### Community 80 - "What the frames add to our design"
Cohesion: 0.33
Nodes (5): One workspace, several focused states, The smallest useful next prototype, Three corrections to the product story, Unanswered by this recording, What the frames add to our design

### Community 81 - "Settings, transcribed from the frames"
Cohesion: 0.33
Nodes (5): Board, Engine: three distinct scopes, Interface → Review, Prioritize by the learner's question, Settings, transcribed from the frames

### Community 82 - "ADR 0001: run Stockfish on the server"
Cohesion: 0.33
Nodes (5): ADR 0001: run Stockfish on the server, Consequences, Decision, Distribution and license, Why this fits the current build

### Community 83 - "build-coach-web-platform/design.md"
Cohesion: 0.33
Nodes (5): API contract, Context, Decisions, Goals / Non-Goals, Risks / Trade-offs

### Community 84 - "expand-bot-platform/design.md"
Cohesion: 0.33
Nodes (5): API additions, Context, Decisions, Goals / Non-Goals, Risks / Trade-offs

### Community 85 - "explore-one-mistake/design.md"
Cohesion: 0.33
Nodes (5): Context, Decisions, Goals / Non-Goals, Migration plan, Risks / Trade-offs

### Community 86 - "Learning"
Cohesion: 0.33
Nodes (5): Driving it with Playwright, Gotchas, How to get to it (user POV), Learning, Sub-features

### Community 87 - "Bot play"
Cohesion: 0.33
Nodes (5): Bot play, Driving it with Playwright, Gotchas, How to get to it (user POV), Sub-features

### Community 88 - "GameLibrary"
Cohesion: 0.60
Nodes (6): GameLibrary(), change(), choose(), membership(), refresh(), save()

### Community 89 - "PositionEditor"
Cohesion: 0.60
Nodes (6): PositionEditor(), field(), load(), place(), reset(), square()

### Community 90 - "Local Chess960 delivery"
Cohesion: 0.40
Nodes (4): Boundaries, Evidence, Installed readback, Local Chess960 delivery

### Community 91 - "Local chess workspace design"
Cohesion: 0.40
Nodes (4): Grounding and caller usage, Local chess workspace design, Synthesis, Two candidate shapes

### Community 92 - "Local Vision delivery"
Cohesion: 0.40
Nodes (4): Boundaries, Installed readback, Local Vision delivery, Verification

### Community 93 - "Chess960 across local play and study"
Cohesion: 0.40
Nodes (4): Chess960 across local play and study, Impact, What changes, Why

### Community 94 - "expand-bot-platform/tasks.md"
Cohesion: 0.40
Nodes (4): 1. Engines, 2. Bot platform, 3. Delivery, Verification limit

### Community 95 - "Match the observed non-multiplayer platform"
Cohesion: 0.40
Nodes (4): Evidence rules, Match the observed non-multiplayer platform, Research plan, Work

### Community 97 - "Settings.jsx"
Cohesion: 0.60
Nodes (4): settingDefaults, Settings(), SettingSelect(), SettingToggle()

### Community 99 - "Local endgame practice"
Cohesion: 0.50
Nodes (3): Boundaries, Evidence status, Local endgame practice

### Community 100 - "build-coach-web-platform/tasks.md"
Cohesion: 0.50
Nodes (3): 1. Runtime and legal engine, 2. Working coach platform, 3. Delivery

### Community 101 - "explore-one-mistake/tasks.md"
Cohesion: 0.50
Nodes (3): 1. Prepare the first implementation, 2. Build the exploration, 3. Validate the integrated prototype

### Community 102 - "ChessLab"
Cohesion: 0.50
Nodes (4): ChessLab, Research and design archive, Run the application, Verify changes

## Knowledge Gaps
- **519 isolated node(s):** `search`, `name`, `version`, `private`, `type` (+514 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 683 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `chess.js` connect `study-format.mjs` to `check_app_browser.cjs`, `app.mjs`, `ref_node_fs`, `createTrainer`, `main.jsx`, `replay`, `Board`, `VisionTraining`, `vision-training.test.mjs`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `App()` connect `App` to `study-format.mjs`, `Settings.jsx`, `main.jsx`, `LearningPath`, `Board`, `chess-state.js`, `GameReview`, `VisionTraining`, `GameLibrary`, `PositionEditor`, `PuzzleTraining`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `createChess()` connect `study-format.mjs` to `app.mjs`, `opponent-engines.mjs`, `engine.mjs`, `Chess960`, `replay`, `Board`, `chess-state.js`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `App()` (e.g. with `startGame()` and `loadSettings()`) actually correct?**
  _`App()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `search`, `name`, `version` to the rest of the system?**
  _519 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `study-format.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.08766803039158387 - nodes in this community are weakly interconnected._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.11779448621553884 - nodes in this community are weakly interconnected._