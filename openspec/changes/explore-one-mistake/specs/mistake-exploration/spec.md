## Purpose

Help learners inspect a confusing move through legal alternatives and board evidence while preserving the original game and their exploration history.

## ADDED Requirements

### Requirement: CL-001 Preserve imported game state

The system SHALL import a completed standard-chess PGN, preserve its original mainline, and reconstruct each position with its move history. It SHALL reject invalid input without replacing the existing study. Imported comments SHALL be treated as display data, not executable instructions.

#### Scenario: Import and revisit

- **WHEN** a learner imports a valid completed game and selects an earlier move
- **THEN** the board, side to move, castling rights, en-passant state and draw-relevant history match replay of the original game to that move

#### Scenario: Invalid or ongoing import

- **WHEN** a learner submits malformed PGN, an illegal move sequence, or a game marked ongoing
- **THEN** the system explains the rejection and preserves the current study unchanged

### Requirement: CL-002 Explore nested legal alternatives

The system SHALL permit legal alternatives for either side at any selected node, including nodes inside an existing branch. Alternatives SHALL leave the original mainline and sibling branches unchanged.

#### Scenario: Alternative inside an alternative

- **WHEN** a learner branches at a snapshot, plays a reply, and creates a second alternative inside that branch
- **THEN** both branches remain navigable with their correct parent positions and the original game remains intact

#### Scenario: Illegal move

- **WHEN** a proposed move is illegal in the selected position
- **THEN** no node is created, the board remains unchanged, and the learner receives a reason or legal-move guidance

### Requirement: CL-003 Return and compare

The system SHALL distinguish the selected branch from the actual game, return to the exploration anchor or a selected actual-game node, and compare two lines from their common position without changing either line.

#### Scenario: Return from a nested branch

- **WHEN** the learner requests return to the anchor after exploring nested alternatives
- **THEN** the exact anchor position, history, and associated question are restored and all explored branches remain available

#### Scenario: Compare outcomes

- **WHEN** the learner selects two continuations from the same position
- **THEN** each line can be replayed and its material changes are labeled from the same player's perspective; engine estimates show their search limits

### Requirement: CL-004 Attach explanations to inspectable evidence

The system SHALL attach a question, learner prediction and explanation to the selected node. Every displayed move, capture, defender and material claim SHALL agree with replayed state. The first prototype SHALL disclose its supported explanation scope and distinguish an illustrative continuation from a forced result.

#### Scenario: Inspect a trade

- **WHEN** the learner requests the supported capture-sequence explanation
- **THEN** the board replays the full stated sequence, highlights the relevant pieces, and displays the material change after captures and recaptures

#### Scenario: Unsupported answer or failed analysis

- **WHEN** no validated evidence supports a requested claim or analysis fails
- **THEN** the system identifies the limitation, offers manual exploration, preserves the question, and does not invent a continuation or tactical verdict

### Requirement: CL-005 Preserve and export the study

The system SHALL save the actual game, branches, anchors and node questions locally, restore them after reload, and offer a portable study export. It SHALL disclose persistence failures before representing the work as saved.

#### Scenario: Reload and export

- **WHEN** a saved study is reloaded or its export is imported into a fresh session
- **THEN** the same actual-game moves, branch relationships and questions can be navigated and replayed

#### Scenario: Storage failure

- **WHEN** local storage rejects a save
- **THEN** the current study remains usable in memory, the unsaved state is visible, and the learner can export it

### Requirement: CL-006 Support accessible learning controls

The system SHALL provide keyboard operation for board moves and branch navigation, visible focus, descriptive labels and a text equivalent for tactical overlays. Meaning SHALL not depend on color alone.

#### Scenario: Explore without dragging

- **WHEN** a learner operates the board and return controls using only a keyboard
- **THEN** they can select a legal move, explore a branch and return, with the selected position and control state available as text
