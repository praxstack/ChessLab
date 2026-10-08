## ADDED Requirements

### Requirement: Guided review retries
A completed game review SHALL offer practice of its inaccuracies, mistakes and blunders for White, Black or both. Each question SHALL use the full history before its original move, pin the saved native-engine recommendation and preserve the original game/study. Incomplete reviews and unfinished bot games SHALL not start a practice run. Empty selections SHALL report that no mistakes were found without fabricating questions.

#### Scenario: Retry a reviewed mistake
- **WHEN** the learner starts practice for one side
- **THEN** the board shows the position before that side's first eligible mistake with its answer hidden

### Requirement: Evidence-bound attempts and hints
Legal board, drag, typed and promotion input SHALL be supported. A saved recommended move SHALL solve the question. Other legal attempts SHALL be checked by the native engine at the saved review settings capped at two seconds per position for interactive feedback. A fresh Best, Checkmate or numerically Good result under the existing 50-centipawn boundary SHALL count as a strong alternative; uncertain mate lines SHALL not be falsely called incorrect. Failed searches SHALL preserve progress and allow retry. A rejected attempt SHALL show its own resulting position and feedback, then allow returning to the question. The two hint levels SHALL reveal the recommended piece and then the arrow. Reveal and skip SHALL not earn unassisted credit.

#### Scenario: Preserve a strong alternative
- **WHEN** a legal alternative receives a fresh Good result with finite loss below 50 centipawns
- **THEN** practice accepts it with its engine evidence and identifies it as an alternative, not the saved recommendation

### Requirement: Saved private practice progress
Practice SHALL persist question order, side, index, attempts, hints and outcomes separately from the source game. Reload SHALL resume the exact question and feedback state. Ownership and optimistic revisions SHALL protect every action, including delayed engine results. A source-history change SHALL reject stale practice. Completion SHALL distinguish first-try unassisted solves, assisted or repeated solves, revealed answers and skipped questions. Starting again SHALL be explicit. Answers SHALL stay out of active question responses until the relevant hint or outcome permits them.

#### Scenario: Resume after a hint
- **WHEN** the learner reloads after receiving a piece hint
- **THEN** the same question and hint return without an unassisted completion award

### Requirement: Verified local installation
Existing and new desktop/mobile flows SHALL pass against the production app with synthetic accounts, native-engine evidence and video proof. The private PR and installed build SHALL share verified hashes. The database SHALL be backed up and preserved, including unrelated working changes. This increment SHALL not establish completion of the full parity objective.

#### Scenario: Concurrent attempt
- **WHEN** another request updates the practice while an engine result is pending
- **THEN** the delayed result is rejected and cannot overwrite newer progress
