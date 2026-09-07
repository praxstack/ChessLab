# Running ChessLab

ChessLab is a local web application for bot play and review. The browser uses React and chess.js. One Node server validates games, runs installed chess engines and human-move models, and stores accounts, games and learning progress in SQLite.

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

Choose a bot portrait or the **Engines** tab. In **Game options**, select the opponent engine, target strength, color, clock and assistance, then press **Play**. An account is required to save a game. Usernames use 3 to 32 letters, digits, underscores or hyphens; passwords use 10 to 128 characters. Accounts work on this server only. There is no email provider, password recovery or cloud sync.

Click a piece and destination, drag a piece, or enter SAN such as `Nf3` or UCI such as `g1f3` below the board. Promotion opens a piece choice. The server validates moves and rejects stale revisions. If the engine fails, your saved move remains available and the interface offers a retry when it is the coach's turn.

Open **Review** or select a move in the history. The transport controls and left/right arrow keys step through positions. Review evaluates the position before the selected move and the played move. **Compare before move** shows the candidate arrows on their starting position. Scores use White's perspective. Search time, depth and engine identity accompany results.

**Try a variation** starts a separate legal line. Play either side, branch again, and write a question attached to that branch. Candidate continuations can also become variations. **Save study** saves the full histories and questions. **Return to game** restores the selected branch's original game anchor. The actual game moves remain separate. Save conflicts preserve the local draft and report that another tab changed the study.

Use **Import** to paste a completed PGN or choose a file up to 50 KB. Invalid imports leave the current game intact. Imported games are review-only. **Export PGN** exports the actual game. Saved variations and questions remain in the study database; PGN export does not include them.

**My games** opens saved games and studies. Starting a new game or opening another game first saves pending study edits. Browser board and review preferences persist in local storage. Supported controls include orientation, coordinates, legal markers, last-move highlights, move sounds, arrows, playback pace, analysis time and candidate count.

## Engine inventory and difficulty

The server now has Stockfish 19, Stockfish 18, Stockfish 18 Lite WASM Multithreaded, Stockfish 16, Lc0 0.32.1 and its network, Maia3 (5M, 23M and 79M weights), and Maia2 (rapid and blitz weights). The engine menu lists runtime configurations that pass an actual identity and ready handshake. Readiness checks run sequentially to reduce memory pressure; successful results are cached for five minutes, while moves still validate the selected engine on every request. chess.js validates legal moves; it is not another opponent engine. See the [installation receipt](../references/engine-installation.json) for versions, sources, sizes, hashes and legal-move smoke results.

On this Apple Silicon Mac, Stockfish 19 remains the Homebrew installation. The other engines and model runtime live under ignored `data/engines/`. Install or reproduce them with:

```sh
python3 scripts/install_engines.py
```

The installer is currently for Apple Silicon macOS. It downloads official releases or pinned upstream source/model revisions and creates an isolated Python environment. Executables, model weights and accounts are excluded from Git. A different server needs its own installation; cloning the repository does not install models automatically.

Target strength is a challenge setting from 250 to 3200 (from 100 for New to Chess profiles), not measured human Elo. Raw engine selection maps the 25 observed reference levels, from 250 to 3200. Yoko Ono’s “Play It By Trust” and the Mechanical Turk’s “?” remain reference labels; their local target starts at an adjustable 1500. Stockfish uses native skill and bounded search. Below 1100, a disclosed local novice policy can replace its successful engine choice with a legal sampled move; aggressive and solid style labels bias that policy. Its receipt retains the engine's original choice. Maia uses the upstream rating conditioning; Maia2 groups ratings below 1100 and at least 2000 into outer bins. Maia3's accepted conditioning range is not proof of a validated training range. Lc0 uses bounded native search, not a calibrated rating control. Styles outside the novice policy affect scripted context, not a reproduced proprietary personality.

On each turn the server checks account ownership, revision, turn and legality, then saves the human move. It passes full game history to the selected engine, validates the returned move and saves the reply. An engine failure preserves the game and provides a retry; it never silently substitutes another engine. Maia processes currently start cold for each request, taking roughly three to seven seconds on this Mac. Opponent work is bounded to one cold process at a time with a short bounded queue (Stockfish review separately admits two searches). Review and assistance use Stockfish 19. Analysis independently selects Stockfish 18, 18 Lite, 19 or 16, with up to five lines and eight threads. Maximum review permits 90 seconds per position; abandoning a request cancels queued work and native searches.

Old saved games retain their five Stockfish presets: skill 0/4/8/14/20 and search 80/150/250/400/700 ms. New games use the expanded setup. Difficulty changes apply to a new game; review settings do not change an existing opponent.

## Bot setup, clocks and assistance

166 observed profiles are grouped into twelve public roster categories. Names, portraits and reference ratings were observed in the public Chess.com roster. Their playing behavior is a local implementation. The engine selector lets you choose what actually runs behind a profile. Adaptive profiles adjust the target by up to 350 points from their base according to the current material balance; this is a simple disclosed practice rule, not a learned rating estimator.

Choose White, Black or random, an untimed game or one of the timed presets with increments. Server time decides flag fall across reloads and delayed replies. Clocks keep running when you navigate away or review; they do not pause the game. An expired clock resolves the game, and a late engine reply cannot overwrite it.

**Hint** shows a legal engine suggestion and counts as help. **Undo** restores your prior turn and its saved clocks, while preserving assistance usage. Undo is refused if it would invalidate saved variations. The settings independently enable contextual bot chat, evaluation, threat arrows, suggestion arrows, move feedback and engine lines. Bot chat is scripted; it is not free-form conversation. **Rematch** creates a separate saved game with the same setup.

A win against a roster bot earns three crowns without help, two after one to three hints or undos, and one after more help, opening engine review during play, or with automatic assistance enabled. Chat does not reduce crowns. The best result is saved for each bot on that account. These are local results, with no ranked ladder or anti-cheat claims.

## Difference from Chess.com's platform

This remains an incomplete one-to-one clone. It now has an actual multi-engine roster and the bot-play controls above, but not Chess.com's full roster, exact personality code, proprietary coach/classification system, complete curriculum or every visual setting. Installing multiple engines does not reproduce those systems.

Torch and newer Komodo Dragon versions require separate availability; the [engine availability record](../references/engine-availability.md) records the observed upstream limits. The app does not label unavailable proprietary engines as installed.

## Piece artwork correction

At the user's request, the custom SVG pieces were replaced with the twelve original PNG images used by Chess.com's standard analysis board, theme ID `ejgfv`: pawn, knight, bishop, rook, queen and king, in both colors. Their URLs were read from the rendered [Chess.com analysis board](https://www.chess.com/analysis), then the files were downloaded without alteration. They are served locally from `web/public/pieces/chesscom/` and total 93,344 bytes. This is one complete piece set, not every Chess.com theme.

`references/chesscom-piece-assets.json` records the source URLs, retrieval time, dimensions and SHA-256 hashes. These remain third-party Chess.com assets; no open-source redistribution license is asserted. Green is the default; Blue remains selectable on the board. The difficulty label changed from “Choose your pace” to “Bot difficulty.”

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

`just check` also checks agent skill hashes. The latest check stops at a missing installed Pstack `unslop` source; an earlier check also recorded `gstack-cso` source drift. These are setup verification failures. Do not silently regenerate its stored hash to make the check pass. Review the changed installed entrypoint before updating the manifest.

## Current limits

Human multiplayer and billing remain deferred. Owner-private Sites hosting uses a protected HTTPS connection to this Mac; continued remote availability requires the native service and tunnel to remain running. The hosted account database is separate from local development data. Target strengths and reference bot ratings are uncalibrated, not measured human Elo ratings. The coach uses deterministic evidence wording and engine estimates. It does not provide unrestricted language-model conversation. Questions are saved learner notes.

A candidate continuation demonstrates a legal line at a bounded search. It does not prove that every reply is forced, and additional search can change a score or move classification. The app does not copy Chess.com's classification algorithm or claim its accuracy metrics. The current labels use estimated mover loss: 50 centipawns for inaccuracy, 150 for mistake and 300 for blunder. Short searches and mate scores require separate interpretation. The interface sends position histories to the local server; it downloads no engine binary, neural weights or model to the browser.

This server supports a local baseline, with bounded engine work and SQLite persistence. Public use requires separate decisions and work for HTTPS, backups, password recovery, abuse handling and capacity. No learning effectiveness, demand, scale or public availability has been established by local application tests.
