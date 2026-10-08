## ADDED Requirements

### Requirement: Account-private local collections
The application SHALL create named collections with optional descriptions, edit their details, and delete a collection only after an explicit UI confirmation. Games SHALL belong to multiple collections. Removing membership or deleting a collection SHALL preserve every original game, branch and review. Account ownership SHALL be enforced for collections and every member game. Stale revisions and invalid input SHALL be rejected without partial changes.

#### Scenario: Keep a game in two collections
- **WHEN** a learner adds a saved game to two collections and removes it from one
- **THEN** the other membership and the original game and variations remain unchanged after restart

### Requirement: Searchable saved-game library
The library SHALL offer all games, named collections, text search, source filtering and sorting. The learner SHALL select one or more visible games to add to a collection or remove from the current collection. Collection lists SHALL support alphabetical or recent ordering. Empty, loading, error and signed-out states SHALL be actionable and accessible on desktop and mobile.

#### Scenario: Revisit a saved study
- **WHEN** the learner searches a collection and opens a matching study
- **THEN** the existing saved game and branches open with their original provenance

### Requirement: Verified local delivery
The production app SHALL exercise collection creation, editing, membership, search, reload recovery and safe deletion in recorded browser flows while preserving the previous protected tests and flows. Source/build/proof hashes SHALL bind the PR and installed local build. Full parity SHALL remain active after this increment.

#### Scenario: Evidence-backed delivery
- **WHEN** the collection workflow is installed locally
- **THEN** its private PR contains synthetic-account video proof and the original user database has a verified backup
