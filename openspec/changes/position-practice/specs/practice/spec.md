## ADDED Requirements

### Requirement: History-preserving position practice
The learner SHALL start an independent bot game from a selected position in an owned saved game or saved variation. The server SHALL use the stored starting FEN and full legal prefix, validate the selected position and reject stale or foreign sources. The chosen opponent, side, assistance and time controls SHALL drive the actual local game.

#### Scenario: Practice a nested branch
- **WHEN** a learner selects a position in a saved nested variation and starts practice
- **THEN** the new game preserves the exact source prefix and starting FEN, the source game and study remain intact, and the correct side can move

### Requirement: Practice boundaries
Practice clocks SHALL begin at the chosen position. Takeback SHALL never cross the practice starting point, and inherited moves SHALL not be graded as new learner feedback. Practice outcomes SHALL not award bot-roster crowns. Accessing practice from an unfinished bot game SHALL record review assistance on the source game.

#### Scenario: Undo after a practice turn
- **WHEN** the learner takes back a completed practice turn
- **THEN** both new moves and their clock increments are removed without losing inherited history

### Requirement: Restart and return
The learner SHALL restart practice from its retained starting snapshot and return to the source study. Saving, reloading and exporting SHALL retain source provenance and history. Missing or changed source branches SHALL not destroy the practice copy.

#### Scenario: Return from practice
- **WHEN** the learner returns to an unchanged source study
- **THEN** the source board and branch are restored at the selected starting ply
