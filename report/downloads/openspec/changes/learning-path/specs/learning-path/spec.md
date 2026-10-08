## ADDED Requirements

### Requirement: Guided courses and lesson library
The application SHALL provide a course path grouped by four skill levels, with lesson/course completion and a next unfinished lesson. A library SHALL support text, topic and level filtering. Twelve new instructional lessons with two board challenges each SHALL be locally present, along with the six preserved introductory lessons. All lessons SHALL remain accessible for deliberate practice without changing saved completion.

#### Scenario: Pick up the next lesson
- **WHEN** a learner completes a lesson and returns to Learn
- **THEN** the course shows that completion and the next unfinished lesson is available

### Requirement: Board-grounded instruction
Each new lesson SHALL present original explanatory text and legally replayable board challenges. Correct learner moves SHALL advance the verified line with legal opponent replies. Illegal or incorrect moves SHALL not advance the accepted position. Promotion, orientation, typing, clicks and drag controls SHALL use the existing board rules. Source examples SHALL retain attribution and distinguish a demonstrated line from all possible defenses.

#### Scenario: Calculate a multi-move example
- **WHEN** a learner plays the first correct move of a multi-move challenge
- **THEN** the reply is played, the learner continues from the resulting position, and incomplete work earns no lesson completion

### Requirement: Persistent isolated lesson progress
The server SHALL persist each account's current lesson, challenge, accepted moves and revision. Reload and restart SHALL restore them. Completion SHALL be recorded once only after all required challenges are solved. Stale actions and cross-account access SHALL be rejected. Repeating a completed lesson SHALL preserve previous completion and use a fresh attempt identity.

#### Scenario: Resume the second challenge
- **WHEN** the learner solves the first challenge, continues to the second and reloads
- **THEN** the same challenge and accepted moves return, while other accounts see their own progress

### Requirement: Verified local delivery
The path, library, interactive challenges, persistence and mobile layout SHALL be exercised through the production app and recorded, preserving previous protected flows. The reviewed PR SHALL include video evidence and the installed local build SHALL match the verified files.

#### Scenario: Delivery remains partial platform progress
- **WHEN** this learning workflow is verified
- **THEN** it is reported as delivered local curriculum functionality while full platform parity and tutor requirements remain active
