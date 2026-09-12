## ADDED Requirements

### Requirement: Editable board setup
The learner SHALL place, move and remove pieces with click or drag controls; clear, reset and flip the board; choose side to move and castling rights; and load FEN. En-passant target and move counters SHALL remain explicit. Invalid drafts SHALL remain editable and SHALL not start an engine search.

#### Scenario: Create a custom study
- **WHEN** the learner builds a valid board and saves it
- **THEN** an owned independent study opens for native analysis and branch exploration without changing prior games

### Requirement: Validated position state
The server SHALL reject invalid FEN fields, missing or adjacent kings, an attacked king of the side that just moved, impossible castling rights, and inconsistent en-passant state. Legal positions with the side to move in check and terminal positions SHALL remain valid studies. FEN creation SHALL begin a new history, explicitly distinct from copying a saved history prefix. The same structural validation SHALL protect custom FEN supplied through PGN import.

#### Scenario: Reject invalid setup
- **WHEN** an invalid position is submitted
- **THEN** no study is created and the draft and prior saved games remain available

### Requirement: Analysis and practice continuity
Saved custom positions SHALL survive reload and export with their initial FEN, side and counters. Legal variation moves and practice SHALL use that position. Timed practice SHALL charge and display the correct active side even when the initial position starts with Black.

#### Scenario: Practice a Black-first setup
- **WHEN** a Black-to-move study starts timed practice
- **THEN** Black moves first and the Black clock runs, and source history remains separate
