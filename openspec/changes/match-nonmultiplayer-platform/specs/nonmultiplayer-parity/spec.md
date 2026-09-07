## ADDED Requirements

### Requirement: Evidence-based non-multiplayer mapping
The platform SHALL preserve the requested one-to-one non-multiplayer objective and distinguish observed UI, implemented behavior and verified behavior. Human multiplayer is excluded. Missing proprietary behavior, curriculum and unobserved settings SHALL remain explicit gaps, rather than being marked complete from mockups or matching labels.

#### Scenario: A copied screen lacks runtime evidence
- **WHEN** an item has only a reference screenshot or research description
- **THEN** it remains unverified until its local behavior is exercised

### Requirement: Original roster assets and playable profiles
The bot catalog SHALL preserve original observed names, reference ratings, groups, greetings and portraits. A selected profile SHALL persist its selected opponent engine, independent analysis settings, side, timer and assistance. Engine substitutions SHALL not be described as vendor-identical behavior.

#### Scenario: Selecting a named bot
- **WHEN** the user selects an observed bot and starts a game
- **THEN** the server stores its identity and opponent configuration and returns legal engine moves under that configuration

### Requirement: Review and analysis configuration
The application SHALL separate opponent difficulty from review and analysis engines. Available selected engines, time, lines and threads SHALL affect real server-side UCI invocations. Unconnected engines SHALL not return fabricated moves or silently run another engine.

#### Scenario: Stockfish Lite analysis
- **WHEN** the user selects installed Stockfish 18 Lite, five lines and two threads
- **THEN** the server invokes that engine with MultiPV five and Threads two and reports its actual identity

### Requirement: Private hosted native engine access
The Sites frontend SHALL use a protected HTTPS backend while keeping engine files off the browser. Hosted mode SHALL reject incomplete security configuration and require a backend secret for every origin request. The proxy SHALL forward only the application session cookie and reject cross-origin writes.

#### Scenario: Direct origin access
- **WHEN** a caller accesses the engine origin without the configured secret
- **THEN** it returns 403 before application routes execute
