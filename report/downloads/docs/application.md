# Running ChessLab

ChessLab is a local web application for bot play and review. The browser uses React and chess.js. One Node server validates games, runs native Stockfish, and stores accounts, games and learning progress in SQLite.

## Install and start

Requirements are Node.js 24 or newer, npm, and a native Stockfish executable. Node's built-in SQLite is used; no separate database service is needed.

```sh
brew install stockfish
npm ci
cp .env.example .env
command -v stockfish
```

Set `STOCKFISH_PATH` in `.env` to the executable found by the last command. The example uses `/opt/homebrew/bin/stockfish`, the usual Apple Silicon Homebrew location. On another platform, install Stockfish from its official distribution or your package manager and set the actual path.

```sh
npm run dev
```

Open <http://127.0.0.1:8770>. Development mode serves the interface through Vite and uses the same server for API requests. `npm run dev` and `npm start` load `.env` when it exists. Environment variables supplied by the shell take precedence.

```sh
npm run build
npm start
```

Production mode serves `web/dist`. This is a local run command, not a public deployment. Stop the server with Ctrl-C before switching between development and production on the same port.

| Setting | Default in `.env.example` | Purpose |
| --- | --- | --- |
| `STOCKFISH_PATH` | `/opt/homebrew/bin/stockfish` | Native engine executable on the server |
| `HOST` | `127.0.0.1` | Listen on loopback |
| `PORT` | `8770` | HTTP port |
| `CHESSLAB_DB` | `./data/chesslab.sqlite` | SQLite file, resolved from the working directory |
| `COOKIE_SECURE` | `0` | Local HTTP cookie setting; HTTPS deployment needs `1` |

Run commands from the repository root. Keep `.env` and `data/` out of Git. The repository ignores both.

## Play and review

Choose White or Black and one of five practice levels, then select **Play coach**. An account is required to save a game. Usernames use 3 to 32 letters, digits, underscores or hyphens; passwords use 10 to 128 characters. Accounts work on this server only. There is no email provider, password recovery or cloud sync.

Click a piece and destination, drag a piece, or enter SAN such as `Nf3` or UCI such as `g1f3` below the board. Promotion opens a piece choice. The server validates moves and rejects stale revisions. If the engine fails, your saved move remains available and the interface offers a retry when it is the coach's turn.

Open **Review** or select a move in the history. The transport controls and left/right arrow keys step through positions. Review evaluates the position before the selected move and the played move. **Compare before move** shows the candidate arrows on their starting position. Scores use White's perspective. Search time, depth and engine identity accompany results.

**Try a variation** starts a separate legal line. Play either side, branch again, and write a question attached to that branch. Candidate continuations can also become variations. **Save study** saves the full histories and questions. **Return to game** restores the selected branch's original game anchor. The actual game moves remain separate. Save conflicts preserve the local draft and report that another tab changed the study.

Use **Import** to paste a completed PGN or choose a file up to 50 KB. Invalid imports leave the current game intact. Imported games are review-only. **Export PGN** exports the actual game. Saved variations and questions remain in the study database; PGN export does not include them.

**My games** opens saved games and studies. Starting a new game or opening another game first saves pending study edits. Browser board and review preferences persist in local storage. Supported controls include orientation, coordinates, legal markers, last-move highlights, move sounds, arrows, playback pace, analysis time and candidate count.

## Engine inventory and difficulty

Exactly one engine was installed for this application: Stockfish 19, at `/opt/homebrew/bin/stockfish`. Its native executable includes its evaluation network. No other chess engine or separate model weights were installed or integrated. chess.js is a legal-move library, not another opponent engine.

The recorded Chess.com settings mention Stockfish 16/18/Lite, Torch Human/4/Lite and Komodo Dragon. Research also discusses Maia versions, ChessCoach and AlphaZero work, plus products such as Fritz. Those references are not download receipts or working integrations.

The five available levels are settings of the same Stockfish engine:

| Bot difficulty | Stockfish skill | Search time per reply |
| --- | ---: | ---: |
| 1 · First steps | 0 | 80 ms |
| 2 · Easygoing | 4 | 150 ms |
| 3 · Club practice | 8 | 250 ms |
| 4 · Challenging | 14 | 400 ms |
| 5 · Full strength | 20 | 700 ms |

These values have not been calibrated to human Elo. Full strength means skill 20 with a 700 ms search, not unlimited analysis. Lower Stockfish skill can select a weaker move, as described in its [official UCI documentation](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html#skill-level).

To play, choose **New game**, White or Black, and **Bot difficulty**, then **Start game**. On the initial screen the start button is **Play coach**. Create or sign into a local account when prompted. Click a piece and destination, drag, or type a move. Difficulty is chosen for a new game; the analysis settings do not change an existing opponent.

For each turn, the browser submits your move. The server checks ownership, revision, turn and legality, then saves it. It starts native Stockfish, supplies the complete move history and the selected skill/time limit, validates the returned move and saves the reply. The browser shows the updated position. No language model chooses moves or generates free-form coaching here.

## Difference from Chess.com's bot platform

This is not a complete one-to-one bot-play clone. The current app has five generic fixed presets. It does not reproduce Chess.com's bot roster, personality behavior, adaptive strength, rating slider, time controls, bot chat, crowns or complete in-game assistance workflow. Reproducing those behaviors requires further implementation and testing; adding engine names to a selector would not do it.

Chess.com's [current bot documentation](https://support.chess.com/en/articles/8614091-how-can-i-play-against-the-chess-com-bots) describes over 100 personalities powered by Komodo. Multiple named bots therefore do not imply a separately downloaded engine for each bot. This documentation is a provider claim, not access to its implementation or permission to use proprietary engine code.

## Piece artwork correction

At the user's request, the custom SVG pieces were replaced with the twelve original PNG images used by Chess.com's standard analysis board, theme ID `ejgfv`: pawn, knight, bishop, rook, queen and king, in both colors. Their URLs were read from the rendered [Chess.com analysis board](https://www.chess.com/analysis), then the files were downloaded without alteration. They are served locally from `web/public/pieces/chesscom/` and total 93,344 bytes. This is one complete piece set, not every Chess.com theme.

`references/chesscom-piece-assets.json` records the source URLs, retrieval time, dimensions and SHA-256 hashes. These remain third-party Chess.com assets; no open-source redistribution license is asserted. The blue board remains. The difficulty label changed from “Choose your pace” to “Bot difficulty.”

## Practice collection

The current catalog contains six original introductory lessons and six puzzles. It is a starter collection, not Chess.com's curriculum. Lesson answers and puzzle move sequences are checked on the server. Incorrect answers earn no completion. A puzzle reveals only the next opponent reply after a correct move, and completion is stored with the account.

## Back up your data

Accounts, sessions, games, studies and learning progress live in the SQLite database. The default is `data/chesslab.sqlite`. SQLite can also create `chesslab.sqlite-wal` and `chesslab.sqlite-shm` beside it. Copying only the main file while the server is running can miss recent writes.

For a simple complete backup, stop every ChessLab process using that database, then copy the entire `data/` directory to a private backup location. Preserve any companion files that remain. If `CHESSLAB_DB` points elsewhere, back up that database and its companion files instead. Restore while the server is stopped, using the same path or an updated `CHESSLAB_DB`. The backup contains account data and should not be published.

Deleting `data/` discards accounts and saved work. Code rollback does not require deleting the database. The pre-application archive commit is `993a24e`; it is a source rollback reference, not a data backup.

## Checks and troubleshooting

```sh
just test
just app-check
just e2e
```

`just test` includes the setup helper, server tests and frontend state tests. `just app-check` runs application checks and builds the browser assets. `just e2e` tests the built app with an isolated temporary database and browser. It uses an existing Playwright package, configurable through `CHESSLAB_PLAYWRIGHT_ROOT`; it does not install a browser for you. These checks are separate from the research site's `just report-test`.

If the engine is unavailable, verify `STOCKFISH_PATH` and run the executable directly. A missing or failing engine produces an error; the application does not substitute a fabricated move or explanation. If port 8770 is already in use, stop the other server or set a different `PORT` and open that address. If production mode reports a missing build, run `npm run build`.

`just check` also checks agent skill hashes. The known `gstack-cso` source drift is a setup verification failure. Do not silently regenerate its stored hash to make the check pass. Review the changed installed entrypoint before updating the manifest.

## Current limits

Human multiplayer, billing and public hosting remain deferred. Five bot levels are uncalibrated Stockfish settings, not human Elo ratings. The coach uses deterministic evidence wording and engine estimates. It does not provide unrestricted language-model conversation. Questions are saved learner notes.

A candidate continuation demonstrates a legal line at a bounded search. It does not prove that every reply is forced, and additional search can change a score or move classification. The app does not copy Chess.com's classification algorithm or claim its accuracy metrics. The current labels use estimated mover loss: 50 centipawns for inaccuracy, 150 for mistake and 300 for blunder. Short searches and mate scores require separate interpretation. The interface sends position histories to the local server; it downloads no engine binary, neural weights or model to the browser.

This server supports a local baseline, with bounded engine work and SQLite persistence. Public use requires separate decisions and work for HTTPS, backups, password recovery, abuse handling and capacity. No learning effectiveness, demand, scale or public availability has been established by local application tests.
