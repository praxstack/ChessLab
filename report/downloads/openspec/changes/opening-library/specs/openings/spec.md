## ADDED Requirements

### Requirement: Complete local named-line catalogue
The app SHALL browse and search every line in the pinned local CC0 source dataset, filter by ECO code, and page bounded results. Each line SHALL replay legally to its displayed position. Names, license and source revision SHALL remain attributable; runtime browsing SHALL not require an external request.

#### Scenario: Find and inspect an opening
- **WHEN** a learner searches a name or ECO code and selects a result
- **THEN** the opening name, code, move sequence and matching board are displayed with position navigation

### Requirement: History-preserving opening practice
The learner SHALL save an opening as an owned independent study and practice from any selected nonterminal point against a chosen local bot. The saved study SHALL contain the full catalogue move history; practice SHALL copy only the selected historical prefix, keeping the source intact.

#### Scenario: Practice part of a named line
- **WHEN** the learner selects an earlier move and starts practice
- **THEN** the new bot game starts with that exact prefix and the source study retains the complete opening line

### Requirement: Honest opening recognition
Review SHALL identify the latest named position reached by the selected history, preserving side, castling and legal en-passant state. Recognition by exact move sequence SHALL be distinguished from position matching through transposition or a custom FEN. Recognition in an unfinished bot game SHALL record review assistance. Recognition SHALL never alter saved histories or imply game statistics, guaranteed best moves or proprietary classification equivalence.

#### Scenario: Recognize a transposition
- **WHEN** a reviewed line reaches a named position by another legal move order
- **THEN** the matching opening is shown as a position match and the actual move sequence stays unchanged
