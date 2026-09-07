## The platform comes first

The user changed the sequence: build a usable Chess.com-style web platform, starting with bot and coach play, then add ChessLab's conversational differentiation. Actual human multiplayer follows the first bot/coach stage. Billing is last. This build follows that direction; it does not claim complete Chess.com parity.

## What can be used

- Play White, Black or random against 17 bot profiles or installed engine configurations through a large blue board, using clicks, dragging or typed moves.
- Review individual moves with engine estimates, legal candidate lines, capture explanations and material consequences. Compare before the selected move to see its candidate arrows.
- Explore both sides of a separate line, nest another variation, save a question with its branch, and return to the original game.
- Save accounts, games, variations, lesson completions and puzzle completions on the same server. Import a legal PGN and export the actual game.
- Use six original introductory lessons and six puzzles. Change orientation, coordinates, legal markers, sounds, playback and bounded analysis preferences.

Open the [local application](http://127.0.0.1:8770) while its server is running. The HTML research archive itself does not run the game. The [application guide](../application.md) contains installation, startup and backup instructions; [ADR 0001](../adr/0001-server-chess-engine.md) explains server-side Stockfish. No engine binary or neural weights are downloaded to the browser.

## What remains

The broader platform is unfinished. There is no human matchmaking, rated ladder, tournament system, social platform, extensive lesson library, subscription checkout or public deployment. Bot levels are not calibrated human ratings. The coach is engine-backed evidence text, not unrestricted conversational AI; questions currently remain learner notes. Saved variations are stored in SQLite and are not included in PGN export.

The original branching conversation remains the intended differentiation. I would judge the next iteration by watching a learner finish a bot game, review one mistake and explain the missed idea without outside help. The current functional checks do not answer that question.

## Current evidence

See the [application verification record](../application-verification.md). It separates automated tests, observed browser behavior, unexecuted checks and unresolved tooling drift. Research-site checks are not product tests.

The source repository is [ChessLab on GitHub](https://github.com/praxstack/ChessLab); access is private. Its creation, commit and push are separate delivery events recorded in the verification note.

## Earlier correction: engines and piece assets

The user challenged the gap between a one-to-one bot clone and the smaller implementation. At that point, only Stockfish 19 was installed and all five levels were presets of it. The expansion below supersedes that inventory. The [application guide](../application.md#engine-inventory-and-difficulty) now gives the exact difficulty mapping and move flow, and lists the missing bot-platform behaviors.

The user also rejected the custom piece drawings. All twelve pieces now use the original images from Chess.com's standard analysis board, served from local files. The board retains its blue colors. This asset correction does not close the bot-personality or platform-parity gaps.

## Expanded bot platform

The current server has Stockfish 19/18/16, Lc0 with its network, Maia3 5M/23M/79M, and Maia2 rapid/blitz weights. Runtime choices are checked for actual readiness. The grouped roster uses 17 observed public bot portraits and ratings with locally implemented behavior. Games now save engine selection, target strength, assistance and clocks. Hints, safe takebacks, contextual scripted chat, adaptive material-based target changes, local crowns and rematches extend the original play/review flow.

The [current application guide](../application.md) explains these controls and the exact limits. Downloaded models stay on the server. The [installation receipt](../../references/engine-installation.json) records sources and hashes. This is product progress over the earlier five-preset baseline, not evidence of full vendor parity, human-rating calibration or learning effectiveness.
