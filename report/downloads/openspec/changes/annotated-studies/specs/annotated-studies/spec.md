## ADDED Requirements

### Requirement: Position-bound annotations
A study SHALL preserve a comment and numeric move annotations at an exact branch identity and ply, including the original game. Same-FEN nodes SHALL not merge. Existing learner branch questions SHALL remain unchanged. Saving SHALL retain study revision checks, validation and failed-save draft protection.

#### Scenario: Annotate a nested alternative
- **WHEN** a learner comments on a nested branch move and revisits it after reload
- **THEN** the comment and glyph return at that branch and ply while the original game remains unchanged

### Requirement: Annotated PGN interoperability
PGN import SHALL legally replay all mainline and alternative moves, preserve comments and numeric annotations, and reject invalid alternatives or excessive structures without creating a partial game. PGN export SHALL include the saved alternatives and comments, with correct starting FEN, move numbers and results. Unsaved study edits SHALL be saved successfully before export proceeds.

#### Scenario: Reject an invalid alternative
- **WHEN** a valid mainline contains an illegal nested variation
- **THEN** import fails without altering the active game or any saved study

### Requirement: Exact local study file
The application SHALL export and import a versioned local study file containing title, initial position, original moves, result, player headers and the complete study tree, questions, annotations and selected branch/return anchor. Import SHALL validate every move and branch and create a separate owned study. Credentials, account identifiers, running clocks and engine caches SHALL not be transplanted. Arbitrary note text SHALL round trip exactly in this format.

#### Scenario: Restore portable analysis
- **WHEN** the learner imports an exported local study file
- **THEN** a separate saved study restores the tree and notes with the original file's game untouched

### Requirement: Verified local delivery
Protected behavior plus annotated import/export, reload and mobile controls SHALL be recorded using isolated accounts. The PR SHALL contain video proof and installation SHALL preserve the user's database and match the verified build. Full parity SHALL remain active.

#### Scenario: Export does not lose a draft
- **WHEN** saving the current annotations fails
- **THEN** export is stopped and the learner's draft stays visible
