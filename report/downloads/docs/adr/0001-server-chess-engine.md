# ADR 0001: run Stockfish on the server

Status: accepted for the bot and coach platform build on 7 September 2026.

## Decision

Use native Stockfish as a server subprocess through UCI. The user explicitly requested the web platform with bot and coach play first, without a browser engine or model download. The available development engine is Stockfish 19. The application reports the engine identity it actually starts rather than assuming every installation has that version.

chess.js validates and replays full move histories. The server checks actual-game ownership, turns and revisions. Analysis receives the history from the initial position so repetition and other history-dependent rules are not reduced to a bare FEN. Search time and candidate count are bounded. Engine work has bounded concurrency and timeout handling.

The browser receives legal moves, candidate continuations, scores and evidence. It renders the board and keeps temporary exploration separate from the saved actual game. Stockfish is the only supported analysis engine in this build. Unavailable proprietary engines are not presented as choices.

## Why this fits the current build

One Node server and an installed native engine are enough to support local bot play and position review. This avoids transferring an engine binary or neural weights to every browser. It also keeps actual-game validation and analysis on the same server.

The earlier `explore-one-mistake` draft considered a browser worker and a PGN-first experiment. The new `build-coach-web-platform` change records the user's later direction. This decision does not remove the full branching tutor objective.

## Consequences

The server must have a working Stockfish executable. Missing engines and failed searches are visible errors. Bot settings are uncalibrated practice levels, not human ratings. Scores and classifications are estimates at stated limits. The coach explains deterministic evidence; it does not claim conversational language-model reasoning.

A single native engine service is a local baseline. Public hosting, capacity, monitoring and recovery are separate work. The browser does not provide offline engine play when the server is unavailable.

## Distribution and license

Stockfish is an external prerequisite and is not bundled in the repository or browser assets. Install it through the official project or a package manager such as Homebrew. Stockfish is distributed under GPLv3. Its license and source obligations need review before distributing an engine binary or a package that includes it. Installing an external executable does not choose a license for ChessLab's own code or the preserved research archive.

References: [Stockfish project](https://stockfishchess.org/), [official source and license](https://github.com/official-stockfish/Stockfish), [GNU GPL version 3](https://www.gnu.org/licenses/gpl-3.0.html).
