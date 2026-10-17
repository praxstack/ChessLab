## Purpose

Turn a flagged move from a reviewed game into a short lesson the learner works through, and bring its idea back in later sessions until the learner solves it unaided.

## ADDED Requirements

### Requirement: TL-001 Attempt steps
An attempt SHALL move through try, say why, an optional typed reason, and done. A right move on the first try with no hint SHALL be unaided. A right move after a hint or a miss SHALL be hinted. Each miss SHALL show the next hint, the piece's square and then the move, without repeating a hint already shown. The second miss SHALL end the try step as taught. Show answer SHALL end it as answer-now. Skip SHALL end the attempt with no recall credit. No try SHALL be accepted after the try step ends.

#### Scenario: Two misses
- **WHEN** the learner plays two wrong moves on a flagged position
- **THEN** the app teaches the move, records the attempt as taught, and asks the learner why the move works

### Requirement: TL-002 Say why
After the try step, the learner SHALL pick one of three answers once. The learner MAY then type a reason, which Claude grades as clear, partial or missed against the same engine facts. A right move with a wrong pick SHALL be credited as hinted. Claude's grade SHALL NOT change recall credit.

#### Scenario: Right move, wrong reason
- **WHEN** the learner finds the move unaided but picks a wrong reason
- **THEN** the attempt is credited as hinted and the tag comes back next session

### Requirement: TL-003 Session-counted recall
A visit SHALL open a new session when at least four hours have passed since the last one. Each mistake tag SHALL be one recall topic. An unaided solve SHALL schedule the tag 1, then 3, then 6 sessions later, advancing only on a due recall in a later session. A hinted solve SHALL schedule it for the next session. A taught or answer-now outcome SHALL reset the interval to the next session. A same-sitting puzzle or a repeat of a seen position SHALL be logged without moving the schedule, except that a repeated recall when the puzzle pool is empty SHALL move the next due session without advancing the interval.

#### Scenario: Missed week
- **WHEN** a tag was due and the learner does not visit for a week
- **THEN** on the next visit the tag is due once, with no extra backlog

### Requirement: TL-004 Learned rule
A tag SHALL count as learned only after an unaided solve of a fresh recall puzzle in a session later than the learner's first exposure to that tag. Recall SHALL pick a puzzle the learner has never answered, and when all have been seen, the one seen longest ago.

#### Scenario: Same-session solve
- **WHEN** the learner solves a recall puzzle unaided in the same session as the flagged move
- **THEN** the tag is not learned

### Requirement: TL-005 Progress survives reloads
Help SHALL be recorded as it is used, so a reload mid-attempt cannot turn a helped attempt into an unaided one. Only the finished outcome of the same attempt SHALL replace that record. Saved progress that is malformed SHALL be repaired by keeping valid rows and dropping the rest.

#### Scenario: Reload after a hint
- **WHEN** the learner reloads after a hint and then solves the position unaided
- **THEN** the original attempt stays hinted and the second solve is logged as a repeat
