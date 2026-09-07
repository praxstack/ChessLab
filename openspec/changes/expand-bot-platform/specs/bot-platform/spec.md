## ADDED Requirements

### Requirement: BP-001 Installed engine selection
The system SHALL offer verified installed engines and use the selected engine for a legal opponent reply, preserving full move history and bounded resource use. Unavailable engines MUST show a concrete reason, remain disabled, and never silently fall back. Engine files MUST stay on the server.
#### Scenario: Selected engine or failure
- **WHEN** a user selects an available engine or its process fails
- **THEN** the recorded engine produces the legal reply or an explicit retryable error preserves saved moves.

### Requirement: BP-002 Bot setup and replay
The system SHALL provide grouped bot profiles, target rating, White/Black/random color, time controls and assistance options. Profile mapping MUST distinguish local implementation from proprietary behavior. Rematch MUST start a separate saved game.
#### Scenario: New bot game
- **WHEN** a user selects a bot, engine and options
- **THEN** the saved game and playing screen retain those selections and use them during play.

### Requirement: BP-003 Authoritative clocks
The system SHALL persist remaining time, apply increments, and resolve timeout using server time across reloads, concurrent tabs and delayed engine replies. Untimed games SHALL remain supported.
#### Scenario: Delayed reply
- **WHEN** a clock expires while an engine is thinking
- **THEN** the game ends by timeout and the late move cannot overwrite the result.

### Requirement: BP-004 Assistance and safe undo
The system SHALL provide legal hints, suggestion/threat arrows, evaluation, feedback and scripted contextual bot messages according to enabled options. Undo MUST restore a prior turn without deleting saved study history. Hints and undo MUST count toward assistance usage.
#### Scenario: Study-preserving undo
- **WHEN** an undo would remove the original prefix required by a saved branch
- **THEN** it is rejected with a reason and all game/study data remain intact.

### Requirement: BP-005 Adaptive play and local crowns
The system SHALL implement observable adaptive target updates and award account-scoped crowns for wins according to used assistance, preserving the best result across restarts. Rating targets MUST not be advertised as calibrated human equivalence.
#### Scenario: Saved win
- **WHEN** a bot game is won and subsequently reloaded
- **THEN** crowns reflect its assistance use and no duplicate or cross-account award is introduced.

### Requirement: BP-006 Verified delivery
The system SHALL retain old application behavior, provide runnable tests for engines/clocks/assistance/persistence, verify the integrated browser flow, and push source changes to the private repository. Download receipts alone MUST not count as playable integration or full vendor parity.
#### Scenario: Delivery audit
- **WHEN** changes are delivered
- **THEN** installed, playable, tested and unavailable engines are distinguished, with remaining platform gaps stated.
