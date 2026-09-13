## ADDED Requirements

### Requirement: PM-001 Adaptive local rated puzzles
The system SHALL select unseen rated puzzles near the account's local puzzle rating with Standard, Hard and Extra Hard difficulty bands. It SHALL persist rating, best rating, rated count and one score receipt per rated attempt. Clean completion SHALL win; the first legal wrong move, hint, reveal or skip SHALL lose. Later moves, retries, stale requests, custom practice and daily puzzles MUST NOT rescore the rated attempt. The profile and score receipt SHALL be committed atomically. Source ratings and local ratings MUST be clearly distinguished from proprietary or calibrated chess ratings.
#### Scenario: Hint then recovery
- **WHEN** a rated learner asks for a hint, finishes the puzzle and reloads
- **THEN** exactly one loss remains persisted, with before/after/delta, and completion does not restore or multiply rating credit.

### Requirement: PM-002 Shared local daily puzzle
The system SHALL pin one legal daily puzzle snapshot per server-local calendar date, share it across local accounts, and preserve one daily attempt per account/date. Repeat starts SHALL return that attempt. An attempt spanning midnight SHALL retain its original puzzle/date. Daily completion history and consecutive-day streaks SHALL persist without changing rated scores. Replays of a daily solution SHALL use custom practice and not duplicate daily credit.
#### Scenario: Same day and rollover
- **WHEN** two accounts open the daily puzzle, one finishes, and the local day changes
- **THEN** both first see the same pinned puzzle, completion is counted once, and the next day has its own pinned daily entry while prior history remains intact.

### Requirement: PM-003 Mode and progress interface
The interface SHALL offer Rated, Daily and Custom practice, visible rating changes, difficulty, daily date/status/streak and recent mode-labelled attempts. Existing attempt controls, hidden solutions, reload recovery, mobile layout and native study analysis SHALL remain available. Changing modes MUST NOT discard an active attempt.
#### Scenario: Mobile mode round trip
- **WHEN** a learner finishes rated practice, opens Daily, reloads and returns to Puzzles
- **THEN** the saved mode, position and progress are visible on mobile and the account's rating remains unchanged by daily play.
