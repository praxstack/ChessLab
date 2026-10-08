## Purpose

Ship only original or openly licensed artwork, bots and wording, so the app can be shown to outside testers and the repository distributes no other product's assets or captures.

## ADDED Requirements

### Requirement: OA-001 Openly licensed piece set
The board SHALL render one piece set, cburnett, from unmodified files whose source, licence and SHA-256 hashes are recorded beside them. The licence text and attribution SHALL be served with the app, and Settings SHALL credit the author and licence with a link. A stored setting naming any other piece set MUST load cburnett.

#### Scenario: Stored setting from an earlier build
- **WHEN** a browser's saved settings name the previous piece set
- **THEN** the board renders the cburnett pieces and the other saved settings are kept

#### Scenario: Credits
- **WHEN** a learner opens Settings
- **THEN** Credits names the cburnett pieces, Lucide icons and chessops with their licences and links to the licence files

### Requirement: OA-002 Licensed navigation icons
Navigation icons SHALL come from a pinned `lucide-static` release whose integrity hash and file hashes are recorded, with the ISC licence served beside them. No icon file from another chess site MAY remain.

#### Scenario: Icon audit
- **WHEN** the icon folder is compared with its provenance record
- **THEN** every icon matches a recorded Lucide file and hash

### Requirement: OA-003 Original palette with readable contrast
The interface and default board SHALL use the project's own palette. Body text, muted text, primary-button text and board coordinates SHALL each have a contrast ratio of at least 4.5:1 against their backgrounds. Stored board theme ids from earlier builds MUST map to a current theme, and unknown ids MUST fall back to the default.

#### Scenario: Legacy board theme
- **WHEN** saved settings name the green or brown theme
- **THEN** the board loads Slate & sand or Walnut & ivory respectively

### Requirement: OA-004 Original bot roster
Every bot SHALL have an invented name, an original description and a category of the app's own. The roster MUST NOT name real people, link to other sites or carry country flags. Each portrait SHALL be produced by a committed generator that gives the same file for the same bot id, and a check mode SHALL fail when a committed portrait differs or is unused.

#### Scenario: Roster audit
- **WHEN** the automated roster test reads the catalog
- **THEN** ids are unique, no entry contains another site's name, a URL or a country field, and every avatar equals the generator's output

### Requirement: OA-005 Engine-defined strength ladder
Bot ratings and raw engine levels SHALL be levels of one ladder defined by the engine controls the server applies: below 1100 a share of moves is sampled from the legal moves, and higher levels add Stockfish skill and thinking time. Each level SHALL map to distinct controls. The interface MUST NOT describe ladder ratings as calibrated human ratings. Wins SHALL earn gold, silver or bronze medals under the existing assistance rule.

#### Scenario: Distinct levels
- **WHEN** the controls for every ladder level are computed
- **THEN** no two levels have identical skill, think time and sampled share

#### Scenario: Medal after a win
- **WHEN** a learner beats a bot after one hint
- **THEN** the game result and the bot card show a silver medal

### Requirement: OA-006 Games that name retired bots
A saved game or account result that names a bot id no longer in the roster SHALL open without error and show its stored bot name. A rematch or new game requested with a well-formed retired id SHALL play the current non-adaptive bot nearest the requested rating, using first-moves bots below 250. A malformed id MUST be refused with 400.

#### Scenario: Rematch against a retired bot
- **WHEN** a learner requests a rematch of a saved game against a bot id from the earlier roster at 250
- **THEN** the new game is created against the current 250 bot

#### Scenario: Malformed bot id
- **WHEN** a request names a bot id containing a path or a non-string value
- **THEN** the server responds 400 and creates no game

### Requirement: OA-007 No captures of other products in the tree
The current tree SHALL NOT store screenshots, recordings, audio or page captures of another product, except the founder's supplied research sources. The design check SHALL fail if capture media appear in the design archive, and the dossier generator SHALL NOT copy captures or the supplied lesson screenshots. Git history SHALL NOT be rewritten.

#### Scenario: Design archive check
- **WHEN** `python3 design/check.py` runs
- **THEN** it passes only if the archive holds no video or image files outside the generated mockups

### Requirement: OA-008 Neutral product wording
Interface strings SHALL NOT name another chess site or its engines. Project documents SHALL describe the app as its own product and SHALL record that the earlier reference-parity direction was superseded on 8 October 2026, without deleting that history.

#### Scenario: Interface copy audit
- **WHEN** the web source, server source and shared modules are searched for another chess site's name
- **THEN** the only matches are tests that assert its absence or migrate old stored values
