## ADDED Requirements

### Requirement: Coordinate and notation rounds
The platform SHALL offer Coordinates, Moves and a mix of both, White/Black/random orientation, and optional coordinate labels. A round SHALL begin after a three-second countdown and last 30 seconds. Coordinates require selecting a square. Moves require moving the lone piece to the destination in its notation prompt. Prompts SHALL follow valid piece movement. This exercise board SHALL remain distinct from a legal full game.

#### Scenario: A learner reads a move
- **WHEN** a move prompt is active
- **THEN** moving its piece by clicks, dragging, touch or keyboard to the correct square scores once and advances
- **AND** an incorrect answer does not move the piece or advance the prompt

### Requirement: Authoritative local round state
The server SHALL own round identity, settings, prompt, revision, score and deadlines. It SHALL reject stale, foreign, malformed, pre-countdown and late answers without granting credit. Reloads and server restart SHALL preserve the deadline and accepted answers. Only one unfinished round per account SHALL be resumed instead of silently replaced. Quitting SHALL record an incomplete result excluded from best scores.

#### Scenario: Two tabs answer the same prompt
- **WHEN** an answer was already accepted at that revision
- **THEN** a duplicate or stale answer cannot score or overwrite the later prompt

### Requirement: Private results and usable local controls
The interface SHALL show score, mistakes, remaining time, feedback, results and recent owned rounds. Best scores SHALL compare only matching mode, color choice and coordinate-label setting. It SHALL offer labeled controls, touch and keyboard input, reduced-motion behavior, mobile layout and recoverable request failures. Account changes SHALL clear previous private state. Existing studies SHALL survive navigation to Vision.

#### Scenario: A learner returns later
- **WHEN** their round has ended or the server restarted
- **THEN** their result remains available on that local account
- **AND** another account cannot read or modify it
