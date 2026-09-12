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
