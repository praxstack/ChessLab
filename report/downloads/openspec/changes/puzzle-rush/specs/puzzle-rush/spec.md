## ADDED Requirements

### Requirement: Server-owned Rush runs
The application SHALL provide three-minute, five-minute and untimed Survival runs using legal, progressively harder local puzzles without repeats within a run. Each complete solution SHALL score one point. A first legal wrong move or skip SHALL fail that puzzle once and advance. Three failed puzzles SHALL end the run. Illegal input SHALL not consume a life. Rush SHALL not change rated puzzle scores or daily credit.

#### Scenario: Full solution and three failures
- **WHEN** the learner finishes a line and then fails three puzzles
- **THEN** the saved score is one, the run ends, and repeated or stale actions cannot score again

### Requirement: Persistent deadlines and isolated state
The server SHALL own a fixed deadline and reject scoring at or after it, including after reload or server restart. Survival SHALL have no deadline. One account SHALL have at most one active training attempt or Rush run. Run state, current position, results and revisions SHALL persist atomically. Other accounts SHALL not read or mutate them. Hints, solution reveal and post-run retry SHALL be unavailable during an active run.

#### Scenario: Deadline reached during disconnection
- **WHEN** the learner returns after a timed run's deadline
- **THEN** the server finalizes that run at its deadline and gives no credit for a late move

### Requirement: Local Rush experience and review
The application SHALL show mode selection, score, remaining time or Survival label, three lives, responsive legal board controls and saved personal bests per mode. Reload SHALL recover the run. Completed runs SHALL provide history and retry of each encountered puzzle through custom practice and native analysis without changing the original run.

#### Scenario: Retry a failed puzzle after a run
- **WHEN** the learner chooses a failed puzzle from a completed run
- **THEN** a separate custom attempt opens at its source position, the saved run remains unchanged, and the learner can reveal and analyze the legal solution
