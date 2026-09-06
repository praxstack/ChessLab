## The platform comes first

The user changed the sequence: build a usable Chess.com-style web platform, starting with bot and coach play, then add ChessLab's conversational differentiation. Actual human multiplayer follows the first bot/coach stage. Billing is last. This build follows that direction; it does not claim complete Chess.com parity.

## What can be used

- Play White or Black against five Stockfish practice levels through a large blue board, using clicks, dragging or typed moves.
- Review individual moves with engine estimates, legal candidate lines, capture explanations and material consequences. Compare before the selected move to see its candidate arrows.
- Explore both sides of a separate line, nest another variation, save a question with its branch, and return to the original game.
- Save accounts, games, variations, lesson completions and puzzle completions on the same server. Import a legal PGN and export the actual game.
- Use six original introductory lessons and six puzzles. Change orientation, coordinates, legal markers, sounds, playback and bounded analysis preferences.

Open the [local application](http://127.0.0.1:8770) while its server is running. The HTML research archive itself does not run the game. The [application guide](../application.md) contains installation, startup and backup instructions; [ADR 0001](../adr/0001-server-chess-engine.md) explains server-side Stockfish. No engine binary or neural weights are downloaded to the browser.

## What remains

The broader platform is unfinished. There is no human matchmaking, rated ladder, tournament system, social platform, extensive lesson library, subscription checkout or public deployment. Bot levels are not calibrated human ratings. The coach is engine-backed evidence text, not unrestricted conversational AI; questions currently remain learner notes. Saved variations are stored in SQLite and are not included in PGN export.

The original branching conversation remains the intended differentiation. Reproducing familiar board and review interactions gives us a concrete foundation, but it does not establish educational quality or a business advantage.

## Current evidence

See the [application verification record](../application-verification.md). It separates automated tests, observed browser behavior, unexecuted checks and unresolved tooling drift. Research-site checks are not product tests.

The source repository is [ChessLab on GitHub](https://github.com/praxstack/ChessLab); access is private. Its creation, commit and push are separate delivery events recorded in the verification note.
