## Purpose

Show testers one product name, AskTheMove, without breaking the data and files that existing users already have.

## ADDED Requirements

### Requirement: PN-001 Visible product name
The interface SHALL show AskTheMove as the product name in the browser page title, the sidebar wordmark and its accessible label, the footer and the lesson attribution. No text in the app interface MAY show ChessLab. The research and design archives, which a local install links from the sidebar and a hosted install does not serve, are separate documents outside this requirement. Where the interface names the study file format it SHALL use the `.chesslab.json` extension rather than a product name.

#### Scenario: Opening the app
- **WHEN** a visitor opens the app on any page
- **THEN** the page title, the sidebar wordmark and the footer read AskTheMove, and no visible text reads ChessLab

#### Scenario: Import dialog
- **WHEN** a learner opens Import
- **THEN** the dialog offers PGN or a study file identified by its `.chesslab.json` extension

### Requirement: PN-002 Exported files carry the new name
New PGN and study downloads SHALL be named `askthemove-<id>`, and the study download SHALL keep the `.chesslab.json` extension. An exported PGN without a stored Event tag SHALL use "AskTheMove study", and a bot side without a stored bot name SHALL use "AskTheMove bot". The `ChessLabOriginalPly` tag and the `chesslab-study` format id MUST NOT change.

#### Scenario: Exporting a bot game without an Event tag
- **WHEN** a learner exports a bot game that has no stored Event tag or bot name
- **THEN** the PGN names the event "AskTheMove study" and the bot "AskTheMove bot", and it still records the original-game boundary in `ChessLabOriginalPly`

### Requirement: PN-003 Existing data keeps working
Saved settings, the open game, signed-in sessions, database files and study files from earlier builds MUST keep working after the rename. Browser storage keys, cookie names, database file names, environment variables, API paths and the study format id SHALL keep their earlier values. An unsupported study file SHALL be refused with 400 and a message that names the `.chesslab.json` extension.

#### Scenario: Importing a study file exported before the rename
- **WHEN** a learner imports a `.chesslab.json` file whose headers name "ChessLab study" and "ChessLab bot"
- **THEN** the game imports with its moves and its stored headers unchanged

#### Scenario: Returning browser
- **WHEN** a browser that saved settings and an open game before the rename loads the app
- **THEN** it reads the same storage keys and restores those settings and that game

#### Scenario: Unsupported study file
- **WHEN** a learner imports JSON whose format id is not `chesslab-study`
- **THEN** the server responds 400 with a message naming `.chesslab.json` and creates no game
