## ADDED Requirements

### Requirement: Variant-aware bot games
The application SHALL support Standard and Chess960 bot games, using legal rules for the selected variant and preserving the chosen initial position and variant in every saved game.

#### Scenario: Start a numbered Chess960 game
- **WHEN** the player chooses a valid position number from 0 through 959 and starts Chess960
- **THEN** the board uses that Scharnagl position, the engine uses Chess960 rules, and the game can be resumed after reload

#### Scenario: Unsupported input
- **WHEN** a request supplies an unknown variant, invalid number, malformed position or incompatible engine
- **THEN** the server rejects it without creating or changing a game

### Requirement: Chess960 castling and history
The application SHALL handle Chess960 castling, repetition, en passant, promotion and terminal results consistently in both browser and server. Stored Chess960 castling moves SHALL use king-to-rook UCI notation.

#### Scenario: Castling without moving both pieces
- **WHEN** castling is legal with a king or rook already on its final square, or with the pieces exchanging squares
- **THEN** the board places the king on c/g and rook on d/f, consumes both rights for that side and preserves legal history

#### Scenario: Preserve study behavior
- **WHEN** a Chess960 game is analyzed, branched, practiced, exported or imported
- **THEN** its variant and legal move history remain attached to the position and the original game is preserved

### Requirement: Protected local delivery
The application SHALL retain Standard behavior and existing account data while providing app-control screenshots and video for the new user flows.

#### Scenario: Install a verified candidate
- **WHEN** the candidate passes the protected application checks and new variant checks
- **THEN** it is installed locally with a database snapshot, source/build receipts and a private PR containing video proof
