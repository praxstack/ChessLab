## ADDED Requirements

### Requirement: Endgame curriculum and practice
The platform SHALL offer original endgame positions grouped by material, searchable by theme, with a board preview, side to move, objective and teaching notes. The learner SHALL be able to study a position or practice either color against a chosen available opponent and strength. Each attempt SHALL be a separate saved game with a preserved source and complete legal history. Restart SHALL preserve the original drill position and other attempts. Existing studies SHALL survive navigation and authentication continuation.

#### Scenario: A learner practices the weaker side
- **WHEN** the learner selects an endgame and Black in the practice setup
- **THEN** the saved game uses that drill's starting position and selected color
- **AND** the native opponent replies when it is its turn

### Requirement: Local solved-position evidence
All standard three-, four- and five-piece WDL and DTZ tables SHALL be locally present and match the source's published SHA-256 checksums before installation is certified. Catalogue positions SHALL be legal and checked against local tablebases. Native engines advertising SyzygyPath SHALL receive the configured local table directory. Unsupported engines SHALL remain usable without an unsupported option. DTZ SHALL not be presented as distance to mate, and zero-counter outcomes SHALL not be generalized over fifty-move or repetition state.

#### Scenario: A promotion changes the material
- **WHEN** a catalogue pawn promotes or a piece is captured within five-piece coverage
- **THEN** the local set includes the dependent material tables
- **AND** runtime engine play does not require an external service

### Requirement: Owned attempt history and usable controls
The catalogue SHALL show owned attempts and recorded game results, with resume/review actions and assistance counts. Progress SHALL derive from saved server games, not browser declarations or vendor ratings. Guest browsing SHALL expose no private results. The interface SHALL support labeled keyboard and touch controls and mobile layout. Existing game, study, engine, clock, review, puzzle, lesson and Vision behavior SHALL be preserved.

#### Scenario: A learner returns after a restart
- **WHEN** the server restarts and the learner signs in locally
- **THEN** prior endgame attempts remain available under that account
- **AND** another account cannot access them
