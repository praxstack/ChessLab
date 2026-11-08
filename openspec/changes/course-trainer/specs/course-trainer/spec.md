## Purpose

Let a learner hold courses of lines, drill them from their side, answer idea quizzes, and have lines come back on a schedule, the way Chessly's Drills and Quizzes and Chessable's MoveTrainer work, inside the browser-only app.

## ADDED Requirements

### Requirement: CT-001 Course shape
A course SHALL be chapters of lines and quizzes with a title, level, colour, stage and a source (kind, author, licence, link). A line SHALL name the learner's side, start from the standard position or a FEN, and replay legally through the rules library; it SHALL give the learner at least one move. Notes and drawings SHALL be bound to a ply inside the line. Ids SHALL be unique within a course. A course SHALL be refused, with the reason named, when any limit is passed (60 chapters, 600 lines, 120 moves per line, 20,000 moves) or any line is illegal. The learner view SHALL hide quiz answers until answered.

#### Scenario: Illegal line
- **WHEN** a course is saved with a line whose fourth move is not legal
- **THEN** the whole course is refused and the message names the problem

### Requirement: CT-002 Schedule
Each line SHALL have one card. A new card SHALL be due at once. In ladder mode the steps SHALL be 4 hours, 1 day, 3 days, 1 week, 2 weeks, 1 month, 3 months, 6 months; a pass SHALL climb one step, a hinted pass SHALL hold, a miss SHALL drop one step, and two misses in a row SHALL return to the first step. In adaptive mode each card SHALL keep a stability and a difficulty; passes on easy lines SHALL stretch the interval faster than on hard lines, and a miss SHALL cut stability. No interval SHALL be shorter than 4 hours or longer than a year. The review queue SHALL list due cards most overdue first, then new cards.

#### Scenario: One miss
- **WHEN** a line at step 5 (2 weeks) is missed
- **THEN** it drops to step 4 (1 week), not to 4 hours

### Requirement: CT-003 Drill
A drill SHALL start at the learner's first move, playing any earlier book moves for the opponent. A right move SHALL play the book reply up to the learner's next move. A wrong legal move SHALL count a miss and show the next hint (the piece's square, then the move); an illegal move SHALL be refused without counting. After two misses the move SHALL be shown and required. When the line ends the drill SHALL be done with result pass (no miss, no hint), hinted (a hint, no miss) or miss, and the card SHALL be reviewed with that result. A finished drill SHALL refuse further moves. Starting a drill on a line with an open drill SHALL resume it unless a restart is asked for.

#### Scenario: Black line
- **WHEN** a drill starts on a line for Black
- **THEN** White's first book move is already on the board and it is Black to move

### Requirement: CT-004 Import and export
A PGN SHALL become a course with one chapter per game and one line per leaf of its variation tree, the main line first; comments SHALL become notes and `[%cal]`/`[%csl]` directives SHALL become drawings. Only Standard chess SHALL be accepted. A Lichess study link or id SHALL map to the study's public PGN export, which is fetched and imported the same way, keeping the link and author as the source. A course SHALL export as PGN, one game per line, that imports back to the same moves.

#### Scenario: Variation
- **WHEN** a PGN has `3. Nc3 Qa5 (3... Qd8)` 
- **THEN** the chapter has two lines, the main line with Qa5 first and a second line ending in Qd8

### Requirement: CT-005 Storage
Courses, cards and drill sessions SHALL be stored in the browser and SHALL be in the backup file. Backup version 2 SHALL restore a version 1 file with empty course collections. Deleting a course SHALL delete its cards and drill sessions. Nothing in existing collections SHALL change.

#### Scenario: Old backup
- **WHEN** a version 1 backup made before this change is restored
- **THEN** every old collection restores and the course collections are empty
