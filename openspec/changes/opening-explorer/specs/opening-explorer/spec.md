## ADDED Requirements

### Requirement: Local position statistics
The explorer SHALL show legal next moves, game counts and White/draw/Black result counts for the current position, independent of move order. Position identity SHALL include board, side, castling and legally available en passant, excluding clocks. Each corpus game SHALL contribute only its first encounter with a position, avoiding repetition inflation. The corpus SHALL index the first 60 half-moves and retain full validated game moves for replay. The UI SHALL state the archive date, selection, game count and indexing ceiling; no counts or ratings SHALL be invented.

#### Scenario: Transposition
- **WHEN** two legal histories reach the same position
- **THEN** the explorer returns the same corpus statistics

### Requirement: Safe reproducible import
Import SHALL retain the original local archive and its SHA-256, pin its parser version, reject malformed/illegal/unfinished/nonstandard games and record counts. Import SHALL stream bounded archive members, validate the entire accepted main line, preserve source headers and publish a complete integrity-checked SQLite database atomically without overwriting existing data. Failed imports SHALL not expose a partial corpus. Repeated positions SHALL not inflate totals.

#### Scenario: Illegal later move
- **WHEN** a game's later main-line move is invalid
- **THEN** none of that game's opening positions enter the database

### Requirement: Interactive exploration and example games
The opening library SHALL retain its existing named-line flow and add an explorer. Board clicks, dragging, typed moves, promotions, move-list selection, back/start and flip SHALL update the position and its statistics. Results SHALL include replayable example games with source metadata and full moves. Opening an example for study SHALL create a new owned copy through existing persistence, preserving current drafts. A private My Games source SHALL include only the signed-in user's completed standard games and never another account's data. Guests SHALL be able to explore the public corpus; missing data SHALL show an actionable empty state.

#### Scenario: Study an example
- **WHEN** a signed-in learner chooses an example game for study
- **THEN** a new saved study opens and the corpus game remains unchanged

### Requirement: Verified local delivery
Protected checks and new importer/API/UI flows SHALL pass. Production desktop and touch proof SHALL include video. The PR and installed local app SHALL share verified hashes and existing user data SHALL be backed up and preserved. This increment SHALL not establish full platform parity.

#### Scenario: Private source
- **WHEN** an unauthenticated request asks for My Games
- **THEN** the request is rejected without game data
