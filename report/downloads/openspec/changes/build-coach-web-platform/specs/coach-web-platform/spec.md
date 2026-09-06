## Purpose

Provide a usable browser chess platform centered on coach and bot play, grounded review, saved studies and introductory learning without downloading an engine to the browser.

## ADDED Requirements

### Requirement: CP-001 Legal bot games
The system SHALL let a user start as either color against five labeled bot levels, submit legal moves including promotion/castling/en-passant, receive a legal server-engine reply, resign and recognize terminal results. It MUST reject illegal, out-of-turn and stale game updates without altering history.
#### Scenario: Bot game and stale move
- **WHEN** a signed-in user plays a legal move then resubmits the old revision
- **THEN** one move is preserved and the stale request is rejected; the opponent reply respects side to move.

### Requirement: CP-002 Server analysis and evidence
The system SHALL run a real server engine with bounded time, concurrency and candidate count, retain move history and report identity/search limits. It SHALL explain verified checks/captures/material and distinguish estimates from forced outcomes. It MUST not download engine binaries or model weights to the browser or advertise unavailable engines as working.
#### Scenario: Analysis and engine failure
- **WHEN** a position is analyzed or the engine is unavailable
- **THEN** legal continuations and perspective-consistent scores are returned, or an explicit recoverable error is shown without fabricated results.

### Requirement: CP-003 Review and variations
The system SHALL support PGN import/export, selecting each actual move, next/previous/start/end, autoplay, candidate arrows, explanations, temporary nested legal variations and return to the original review node. Mainline and stored branch questions MUST remain distinct. Invalid imports MUST preserve existing games.
#### Scenario: Alternative round trip
- **WHEN** a learner explores an alternative, continues it, saves, reloads and returns
- **THEN** the original game and branch history remain intact and the selected position agrees with its explanation.

### Requirement: CP-004 Accounts and persistence
The system SHALL persist accounts, isolated saved games and learning progress; hash passwords and session secrets; reject unauthorized game access and cross-origin mutations; bound input sizes; and return actionable save errors.
#### Scenario: Isolation and reload
- **WHEN** a second account attempts to read or update another user's game
- **THEN** access is rejected, while the owner can reload their saved moves and studies.

### Requirement: CP-005 Usable recorded-layout interface
The system SHALL present a large interactive board, contextual coach/review panel, move list, navigation and functional settings. It SHALL provide click/drag and typed move entry, visible focus, text feedback, legal markers, promotion choice, board orientation, coordinates and reduced motion. Unsupported settings MUST be identified rather than presented as functional.
#### Scenario: Keyboard and settings
- **WHEN** a learner enters a legal move without dragging and changes board/analysis preferences
- **THEN** the move and supported settings take effect, survive reload and remain usable at a narrow viewport.

### Requirement: CP-006 Introductory lessons and puzzles
The system SHALL provide original labeled introductory lessons and legal puzzles, validate answers server-side and save completion only after a correct answer. A small initial catalog MUST not be described as Chess.com's full content library.
#### Scenario: Wrong then correct answer
- **WHEN** a user submits an incorrect puzzle move and then its correct solution
- **THEN** incorrect work earns no completion and correct work updates that user's progress.

### Requirement: CP-007 Private repository delivery and honest status
The system SHALL include setup/run instructions and runnable application checks, commit the implementation and push to a verified private GitHub repository. It MUST distinguish local functionality, unimplemented broader platform features, model limitations and deployment status. Billing and actual human multiplayer SHALL remain deferred in this first bot/coach stage per the user.
#### Scenario: Delivery verification
- **WHEN** the first build is delivered
- **THEN** repository privacy and pushed commit are verified and the user can run the documented application; no public deployment is implied.
