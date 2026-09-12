## ADDED Requirements

### Requirement: Local runtime and retained data
ChessLab SHALL run its web app, API, persistent data and chess engines on the user's Mac without a hosted proxy or runtime third-party resource dependency. Existing hosted and development data SHALL be preserved. Local archives SHALL be available from the local server without serving account databases or secrets.

#### Scenario: Opening the local workspace
- **WHEN** the user starts the built app and opens its loopback address
- **THEN** play, review, learning and saved games use the same local API and local assets
- **AND** research and design archives are reachable locally

#### Scenario: Moving hosted data
- **WHEN** hosted data is copied for local use
- **THEN** a consistent SQLite snapshot preserves all source accounts and games without replacing another database

### Requirement: Readable responsive chess experience
The interface SHALL make the selected opponent, available actions, game state and move history legible on desktop and mobile. Bot search SHALL match names and categories while preserving selection, settings and real engine behavior. Nested study branches and saved games SHALL keep their existing semantics.

#### Scenario: Finding an opponent
- **WHEN** the user searches for a bot name
- **THEN** matching named profiles appear with visible ratings and an explicit selected state
- **AND** clearing the search restores the roster

### Requirement: Pstack governed proof and review
The delivery SHALL retain an explicit dependency graph and decision trail, use installed Pstack setup and routing, and provide reproducible app-control instructions and a feature map. The PR SHALL link real recorded video and test results from the changed build. Unavailable delegation or proprietary equivalence SHALL remain explicit evidence gaps.

#### Scenario: Reviewing the change
- **WHEN** a reviewer opens the PR
- **THEN** the reviewer can replay the documented verification command and inspect video showing real local user actions and outcomes
- **AND** partial platform parity is not reported as 100 percent completion
