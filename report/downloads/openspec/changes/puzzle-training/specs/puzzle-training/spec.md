## ADDED Requirements

### Requirement: PT-001 Local full puzzle catalogue
The system SHALL retain the complete downloaded CC0 archive locally and reproducibly import a bounded-memory indexed catalogue with provenance. It SHALL expose source rating and theme filters without sending answers before an attempt. Each served puzzle SHALL replay legally, apply the source's first move before the learner starts, and retain its original FEN and move provenance.
#### Scenario: Theme and rating selection
- **WHEN** a learner requests a theme and rating range
- **THEN** a matching local puzzle is served with the correct side to move, or an explicit empty/unavailable state is shown.

### Requirement: PT-002 Persistent protected attempts
The server SHALL own each account's active puzzle history, revisions, mistakes, hints and result. It SHALL validate one submitted learner move at a time, return the next legal opponent reply only after a correct move, accept alternate immediate checkmates, reject stale/foreign requests and persist through reload. Hints, reveal and skipping SHALL not be counted as unassisted success.
#### Scenario: Mistake, continuation and reload
- **WHEN** a learner makes a legal wrong move, then a correct move and reloads
- **THEN** the wrong move increments mistakes without changing the accepted position, and the correct move and opponent reply remain saved for that account.

### Requirement: PT-003 Custom practice and review
The interface SHALL offer theme/rating filters, retrying failed puzzles, recent attempts, progress summaries, hint/reveal, next puzzle and a saved study of a finished solution. It SHALL support click, drag, typed moves, promotion and a narrow mobile viewport. Starter exercises SHALL remain accessible. The UI SHALL distinguish source puzzle ratings from user chess strength and custom practice from future rated, daily or rush modes.
#### Scenario: Finished solution review
- **WHEN** a learner finishes or reveals a puzzle and chooses Analyze solution
- **THEN** a separate saved study opens with the original puzzle FEN and legal source move sequence, without overwriting any existing game or attempt.
