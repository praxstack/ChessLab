# Run ChessLab locally

The installed workspace is `/Users/prax/Developer/ChessLab-local-web`, running at http://127.0.0.1:8772/. Its macOS login service is `com.prax.chesslab.local`; the definition is in `~/Library/LaunchAgents/com.prax.chesslab.local.plist`. Logs are in `data/logs/local-server*.log`. It starts at login and restarts after an unsuccessful exit. The data symlink points to the original repository's local data folder.

To stop the installed service, run `launchctl bootout gui/$(id -u)/com.prax.chesslab.local`. To start it again, run `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.prax.chesslab.local.plist`. After rebuilding code, use `launchctl kickstart -k gui/$(id -u)/com.prax.chesslab.local`.

Install the declared packages with `npm ci`. Native Stockfish must be installed on the Mac. The existing engine collection is in `data/engines/`; reproduce it with `python3 scripts/install_engines.py` if needed.

Copy `.env.example` to `.env` only when no configuration exists. Set `CHESSLAB_DB` to the account database you want to use. Build with `npm run build`, then run `npm start` and open the printed loopback address.

The application, API, portraits, pieces, icons, and engine models work without a hosted proxy. The server also serves the existing sites at `/research/` and `/design/`. It does not serve the repository root or account database directory.

## Retain the previous hosted workspace

The old hosted database is already on this Mac. Copy it consistently into a new path:

```sh
python3 scripts/local_snapshot.py data/hosted/chesslab.sqlite data/local-from-sites/chesslab.sqlite
```

The command uses SQLite's backup API, checks integrity, and refuses to replace an existing destination. It includes committed WAL data. Set `CHESSLAB_DB` to the new path and start the app. Sign in with the account previously used on the hosted build. Browser sessions do not transfer between origins, so a new local sign-in is expected.

The development database remains at `data/chesslab.sqlite`. The migration run preserved its 1 account and 9 games, and the hosted copy preserved 2 accounts and 2 games. These are migration-time counts. The workspaces stay separate; no accounts or games were merged or discarded.

## Verify the local build

Run `just local-check` to test the real entrypoint, archive mounts, local piece asset, native engine and private-path exclusions. Run `just test` for the application and snapshot checks.

Run `just proof` for the recorded web user journey. It creates a synthetic account in a temporary database on a free loopback port, then removes that temporary state. Video, screenshots and a JSON receipt remain under the printed `data/proof-*` folder. Read the [control-app skill](../skills/control-app/SKILL.md) and its [feature map](../skills/control-app/features/README.md) before adding verification flows.

The [delivery proof](verification/local-web/README.md) describes the accepted recording and its limits. Never upload real account databases, model binaries or credentials with a PR.

## Continue the program

The [OpenSpec graph](../openspec/changes/local-web-first/tasks.md) orders the current work and preserves full platform parity as an unfinished goal. [The design decision](verification/local-web/design.md) explains the stack choice. [The decision trail](verification/local-web/decisions.tsv) records evidence and blockers.

Pstack's installed setup skill configured confirmed Codex models in the user's model map and preserved the earlier Cursor mapping in a backup. There is no `peestack` shell executable. The installed Astra Team validator accepts only runtime 0.153.4 and rejects the current runtime. It also blocks native subagent spawns. Team acceptance and independent review remain unavailable; no validator was modified or bypassed.

`just setup` and `just check` still report drift in the installed skill manifest, beginning with `unslop`. OpenSpec validation and application verification are separate and do not waive that failure.

## Whole-game reports

Finish a bot game, or import a completed PGN from My games. Choose Review whole game. Pause stops the current search; earlier moves stay saved, and Resume review continues after reload. The report graph and key moves open the saved engine evidence on the board. Adjust Game Review strength in Settings to generate a report with different search limits. These local centipawn summaries do not reproduce CAPS2 accuracy. [Recorded proof](verification/full-game-review/README.md) covers the complete flow.

## Position practice

In Review, choose a position in the game or a saved variation, then Practice this position. Choose an opponent and side. The new game retains its earlier history, starts fresh clocks, and keeps its source study separate. Undo stops at the practice start; Restart position starts there again. Return to source study restores the original branch and note. [Recorded proof](verification/position-practice/README.md) includes native play and persistence checks.

## Custom position setup

Choose Set up position from the welcome screen, My games or board actions. Place or drag pieces, remove them, choose the turn and castling rights, or load FEN. The editor exposes en-passant and move counters. Save & analyze position creates a separate local study; the original game stays intact. The study supports branches, native analysis and position practice. A custom board begins new history and cannot recover earlier repetition. [Editor proof](verification/position-editor/README.md) includes invalid-draft recovery, mobile setup and timed Black-first practice.

## Opening library

Choose Openings to browse 3,810 named lines locally. Search a name or ECO code, play through its moves, then save a study or practice the selected position against a native bot. Review identifies the latest named opening, distinguishing a played line from a matching position. The source study retains the full line when practice begins earlier.

The CC0 source files, pinned provenance and license are in `references/openings/`. Run `node scripts/build_openings.mjs --check` to replay every source line and verify the compiled catalogue. No network is needed at runtime. This catalogue does not include game statistics or opening lessons. [Recorded proof](verification/opening-library/README.md) covers desktop/mobile browsing, native play and persistence.

## Custom puzzle training

Puzzles now opens the full local catalogue: 6,100,952 positions across 73 themes. Choose a theme and source rating range, then Start training. The opponent's initial move is applied before you solve. Correct moves reveal the next reply; mistakes keep the accepted position intact. Hints and revealed solutions are marked assisted. Return to Puzzles after reload to resume the active attempt. Recent attempts, retry previous mistakes and solution playback remain local. Analyze solution creates a separate study with native analysis and the original puzzle FEN/history. Starter exercises remain available in the panel header.

The installed archive and indexed database are in `data/puzzles/`. To reproduce the catalogue into a new path, download the official archive, verify its recorded hash in `references/puzzles/provenance.json`, then run:

```sh
python3 scripts/import_puzzles.py data/puzzles/lichess_db_puzzle.csv.zst data/puzzles/catalogue.sqlite
```

The importer requires the existing `zstd` executable and Python's standard library. It refuses to overwrite an existing catalogue. Set `CHESSLAB_PUZZLES` to another local catalogue path if needed. No puzzle archive, engine model or answer key is downloaded into the browser. Server attempts live in the account SQLite database and follow its backup policy. Custom practice uses source puzzle ratings; it does not provide a calibrated user rating. Rated adaptation, daily puzzles and rush remain subsequent work. [Training proof](verification/puzzle-training/README.md) covers the current flow.

## Rated and daily puzzles

Puzzles offers Rated, Daily and Custom practice. Rated selects unseen puzzles around your local puzzle rating. Choose Standard, Hard or Extra Hard. A clean complete solution wins; the first mistake, hint, reveal or skip scores one loss. Continuing afterward or replaying the puzzle does not score it again. Rating receipts, best rating and attempt count stay in the account database. This local Elo rating starts at 1500 with K=32; it is separate from Chess.com ratings and chess playing strength.

Daily pins one position for the server’s local calendar date, shared across accounts. Return to Puzzles after reload to resume the saved date and position. Completion history and consecutive-day streaks persist. Reopening the same day returns the same attempt; Try again creates custom practice. A saved attempt spanning midnight keeps and credits its original date when solved. Rated scores do not change during daily or custom play. The last seven days appear in the daily calendar. Full rated calibration, rush, battle and richer daily archives remain work. [Mode proof](verification/rated-daily-puzzles/README.md) covers the current behavior.

## Puzzle Rush

Choose Puzzles → Puzzle Rush, then 3 minutes, 5 minutes or Survival. Finish each line for one point; the first legal wrong move or skip uses one life. Three failed puzzles end the run. Timed clocks keep running across reloads; Survival saves without a deadline. Local personal bests and recent runs are saved per account. After a run, choose any result to retry in Custom practice, then reveal or analyze the source solution. Rush does not change your rated puzzle profile or Daily credit. [Recorded proof](verification/puzzle-rush/README.md) covers the board, reload, results, retries and mobile clock.

## Guided learning

Learn now opens a four-level path with twelve original guided lessons and 24 board challenges. Use Continue lesson to resume an unfinished challenge, or Lesson library to search and filter by level/topic. Both challenges are required for completion. Next lesson follows the unfinished sequence; Practice again keeps prior completion. The six original lessons remain in Starter lessons with their saved progress. Six advanced positions are attributed CC0 examples from the local catalogue. [Recorded proof](verification/learning-path/README.md) covers full-course completion, reload, search, promotion and advanced calculation. This is a growing local curriculum, not complete vendor content parity.

## Organize saved games

Open My games to create a named collection, then select games from All games and choose Add selected. A game can belong to multiple collections. Search by title, opponent or opening; filter bot games, imports or games with variations. Sort games by recent activity, oldest first or title, and collections by recent updates or name. On phones, use the compact Open collection selector.

Edit collection changes its name and optional description. Remove selected only removes membership. Delete collection requires confirmation and preserves all games, variations and other memberships. Collections are private to the local account and persist in the same SQLite database. This increment supports up to 100 collections per account and inherits the existing 500-game limit. Shared and community collections remain later platform work.

## Annotated study files

In Review or Analysis, Position notes attaches a comment and move symbol to the selected line and position. Save notes persists it; Export PGN and Export study also save pending edits before downloading. A failed or stale save stops export and leaves the draft visible. A saved annotation protects its original-game history from undo.

PGN now imports and exports legally checked alternatives, comments and numeric annotation glyphs. The existing chess.js 1.4.0 parser is pinned and covered by round-trip tests. A ChessLabOriginalPly tag retains the original-game boundary when PGN needs to display a continuation as its main line. Standard PGN normalizes branch identities, empty variations, root comments and braces in note text. Use Export study for an exact local tree, question, annotation and return-point copy. Importing either format creates a separate saved study; it does not overwrite its source.

The .chesslab.json file contains chess content and player headers, not account identifiers, credentials, running clocks or cached engine reports. Both import formats accept files up to 900 KB. Studies retain at most 40 branches, 5,000 stored branch moves and 1,000 annotated positions, with 2,000 characters per comment and a 700 KB stored-study limit. Existing live-game and account API request limits remain unchanged; only study/import endpoints accept larger files. These annotations are learner-authored, not free-form model responses.


Review and Analysis support saved board drawings. Right-drag an arrow or right-click a square; Ctrl, Alt and Shift select alternate colors. The Draw arrow and Highlight square buttons work with the keyboard and touch, with four selectable colors. Repeat a drawing to remove it or choose Clear marks to remove only the current position's drawings. Unlike temporary board markup, these drawings belong to an exact branch and move and stay until cleared. Save notes or Save study persists them; exports save pending edits first. Each node accepts up to 64 drawings. PGN uses standard `[%cal ...]` arrow and `[%csl ...]` square tags. Use the study file to retain exact tree identity and text.


Completed Game Review reports offer Practice key moves. Choose White, Black or both, then retry inaccuracies, mistakes, blunders and non-recommended mate-sequence decisions. A practice run pins the saved native recommendation and keeps its progress separate from your original game, notes and branches. Legal alternatives are checked by the local engine at the review settings, capped at two seconds per position; numerical Good alternatives below 50 centipawns, current Best moves and actual checkmates are accepted. Uncertain mate comparisons are identified explicitly. A rejected attempt shows the resulting board; Try again returns to the question. Hints reveal the piece and then its arrow. Reload and reopen practice to resume. Results distinguish first-try unassisted solves, repeated/assisted solves, reveals and skips. Starting again explicitly replaces that practice run.

## Local game explorer

Open Openings → Game explorer, or select Explore this position from a named line. Move-count rows, result bars and example games come from the downloaded Lichess Elite November 2025 archive. The first 60 half-moves are indexed; every accepted game is legally parsed in full and retained for replay. Repeated positions contribute only their first encounter per game. Example games are a sample, not a ranking. My Games uses only your completed standard games, including local bot games; custom starting positions and unfinished games are excluded.

Replay an example, explore from its selected position, or Study this example to save a separate owned copy. Existing study drafts are saved through the normal import flow. Full platform parity remains unfinished; this selected online corpus is not Chess.com's master database.

The archive and database live in `data/explorer/`; `CHESSLAB_EXPLORER` can select another imported database. The server opens it read-only. To reproduce the import, use the pinned project-local environment and a new destination:

```sh
uv venv data/explorer/.venv
uv pip install --python data/explorer/.venv/bin/python chess==1.11.2
data/explorer/.venv/bin/python scripts/import_explorer_test.py
data/explorer/.venv/bin/python scripts/import_explorer.py data/explorer/lichess_elite_2025-11.zip data/explorer/catalogue-new.sqlite --label 'Lichess Elite · November 2025' --url https://database.nikonoel.fr/lichess_elite_2025-11.zip
```

The importer refuses overwrite, rejects illegal/nonstandard/unfinished games, records source SHA-256 and counts, checks SQLite integrity and atomically publishes only the completed database. It does not download during application use. The Python package is used only for offline imports; the web runtime retains React, Express, chess.js and native SQLite/engines.

## Chess960

Game options → Game type → Chess960 starts one of 960 numbered positions. Leave the number blank for a random start, or choose 0–959; position 518 is the familiar arrangement under Chess960 rules. Rematch keeps the starting number. The saved variant remains attached after castling rights disappear.

Castle by clicking or dragging your king onto its rook, or type O-O / O-O-O. The king finishes on g/c and the rook on f/d, including positions where either piece stays put. PGN imports/exports use `Variant "Chess960"` and the starting FEN; study JSON preserves the variant and exact tree. Position practice retains the source variant. The position editor offers Chess960 with rook-file castling rights.

The four installed Stockfish versions and Leela support the required protocol. Maia models are Standard only and unavailable for Chess960 selection. Named openings, public game frequencies and puzzle corpora remain Standard chess. These are local bot simulations, not proprietary Chess.com behavior.

Chess960 rules use pinned [chessops 0.15.1](https://github.com/niklasf/chessops), GPL-3.0-or-later. Its [license](../web/public/licenses/chessops/LICENSE.txt) and [source archive](../web/public/licenses/chessops/chessops-0.15.1-source.tar.gz) ship locally under `/licenses/chessops/`. Existing chess.js rules still govern Standard. Differential checks use the already-installed python-chess 1.11.2 at `data/explorer/.venv/bin/python`; override `CHESSLAB_ORACLE_PYTHON` for an equivalent local installation. No rules, engines or weights require a remote service at runtime.

## Vision training

Choose **Vision** in the navigation to practice coordinates, moves or both in 30-second rounds. Move the displayed piece for notation prompts; click the square for coordinate prompts. Clicks, dragging, touch and typed answers are supported. Choose White, Black or a randomly selected perspective and turn board coordinates on or off before starting. The three-second countdown gives you time to prepare.

The local server keeps the deadline and score through reloads and restarts. Sign in with a local account to train. Results and recent history remain in the same local SQLite database; personal bests compare identical settings. Ending early preserves the attempt but excludes it from bests. The exercise uses lone non-pawn pieces on an otherwise empty board, separate from a full game. No engine, network service or new package is needed.
