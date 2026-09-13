# Chess960 across local play and study

## Why
The bot options lack the observed Chess960 game type. Shuffling pieces alone would make castling, engine moves and saved studies incorrect.

## What changes
- Add Standard/Chess960 bot setup with a random or numbered starting position.
- Preserve the variant through bot play, clocks, undo, rematch, practice, review, nested variations and PGN/study exports.
- Use an established local rules dependency for Chess960 and require an engine that supports its UCI convention.
- Keep Standard games and all existing learning, puzzle, library and explorer flows working.

## Impact
Local React/Node application only. No hosted changes, account migration, multiplayer, billing or claim of proprietary bot equivalence. Full parity and the original conversational branching tutor remain unfinished.
