## ADDED Requirements

### Requirement: Complete local game report
The app SHALL review every recorded move of a completed bot game or imported study with the existing native analysis engine. It SHALL retain legal history and report the engine identity, search limits, per-move evaluation and classification. Local centipawn summaries SHALL not be represented as proprietary CAPS2 accuracy.

#### Scenario: Review a finished game
- **WHEN** an account requests a full review of its saved finished game
- **THEN** every recorded move is analyzed, both colors receive classification counts and average centipawn loss where measurable, and the advantage graph links to actual game positions

### Requirement: Resumable and isolated review
Each completed review step SHALL be saved locally and scoped to the owning account, exact move history, starting FEN and analysis limits. Pausing, disconnecting or restarting SHALL retain completed steps. Stale or concurrent requests SHALL not corrupt a report or overwrite moves and studies.

#### Scenario: Resume after reload
- **WHEN** the learner pauses a review and reloads the same game
- **THEN** the saved progress returns and review continues at the next unanalyzed move

#### Scenario: A game changes during analysis
- **WHEN** a review step completes against a changed game or report
- **THEN** the stale result is rejected and the existing report and game are preserved

### Requirement: Key move navigation
The learner SHALL navigate the evaluation graph and classified key moves, filter key moves by color and open the existing evidence explanation and variation controls at that move. Viewing a saved report SHALL not rerun the engine automatically.

#### Scenario: Inspect a mistake
- **WHEN** the learner selects a classified mistake in the report
- **THEN** the board shows that move and its cached evidence, and a new variation can still preserve the original game
