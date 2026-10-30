# Browser app

## ADDED Requirements

### Requirement: The app works with no server

The learner SHALL be able to play, review, practise and study with only static files and the browser.

#### Scenario: Offline after first load
- **WHEN** the app has loaded once and the network is then cut
- **THEN** bot games, review with the engine, lessons and saved games still work, and only the coach and endgame tablebase report that they need a connection

#### Scenario: Data stays after reload
- **WHEN** the learner finishes a game and reloads the page
- **THEN** the game is still in My games with its moves, result and review

### Requirement: Back up and restore

The learner SHALL be able to save all local data to one file and load it back.

#### Scenario: Restore on another browser
- **WHEN** the learner restores a backup file in a fresh browser
- **THEN** their games, lesson progress and settings appear as they were, and the file never contains a Claude key

### Requirement: The owner's key stays off the learner's device

The owner's Claude key SHALL exist only as a Cloudflare Worker secret.

#### Scenario: Invite-code explanation
- **WHEN** a learner with a valid invite code asks "Explain why"
- **THEN** the browser sends chess evidence and the code to the coach Worker, never a prompt, and the Worker counts it against that code's daily cap

#### Scenario: Worker refuses free text
- **WHEN** a request to the Worker carries fields other than the evidence schema
- **THEN** the Worker refuses it without calling Claude

### Requirement: Learner's own key

A learner MAY paste their own Claude key, which SHALL be stored only in that browser and sent only to `api.anthropic.com`.

#### Scenario: Own key answer is verified
- **WHEN** Claude's answer through the learner's key names a move not in the evidence
- **THEN** the app shows the engine summary instead, as the server does today
