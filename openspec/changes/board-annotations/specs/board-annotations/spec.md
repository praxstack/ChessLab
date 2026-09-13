## ADDED Requirements

### Requirement: Position-bound board drawings
Saved-game Review/Analysis SHALL allow red, green, yellow and blue arrows and square highlights at an exact branch/ply. Marks SHALL survive save/reload, orientation changes and local study export/import. Editing comments or glyphs SHALL preserve marks. Selecting another node SHALL show only that node's marks. Clear marks SHALL affect only the current node and preserve its comment/glyphs and all game moves.

#### Scenario: Return to a drawn position
- **WHEN** the learner draws on a nested variation, leaves it and returns after reload
- **THEN** the same squares and arrows return in either board orientation without changing moves

### Requirement: Mouse and accessible drawing controls
Right-drag SHALL draw an arrow and right-click SHALL highlight a square, with the reference color modifiers. Explicit Arrow, Highlight and Move controls plus a color selector SHALL support keyboard and touch. Repeating an identical mark SHALL toggle it off; changing its color SHALL replace that geometry. Drawing SHALL not move pieces. Cancelled/outside gestures and a gesture completed after its node changes SHALL not write a mark.

#### Scenario: Draw using a phone
- **WHEN** Arrow is selected and the learner taps two squares
- **THEN** an arrow connects them while the chess position remains unchanged

### Requirement: Validated portable drawings
The server SHALL validate coordinates, four supported colors, uniqueness and at most 64 marks per annotated node. Annotated PGN SHALL preserve standard cal/csl mark directives alongside comments/glyphs; malformed drawing directives SHALL fail before creating a game. Exact study files SHALL preserve all drawings. Existing ownership and revision protection SHALL apply.

#### Scenario: Preserve marks while editing text
- **WHEN** a marked note receives a new comment and is exported and re-imported
- **THEN** its drawings and text both remain attached to the intended node

### Requirement: Verified local delivery
Original and new mouse/keyboard/mobile flows SHALL run against the production app with synthetic accounts and video proof. The private PR and installed build SHALL share verified source/build/proof hashes; the user's database SHALL be backed up and preserved. Full platform parity SHALL remain active after this increment.

#### Scenario: Reject a malformed mark
- **WHEN** imported data contains an invalid square, color or excessive mark list
- **THEN** the request fails and the active game and saved studies remain unchanged
