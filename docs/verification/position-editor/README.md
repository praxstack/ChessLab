# Custom position editor evidence

Set up position now provides piece placement, click and drag movement, removal, clear/reset/flip, side to move, castling rights, en-passant target, move counters and FEN loading. Save & analyze position creates an independent local study with native analysis, variations, reload, PGN export and bot practice. Cancelling guest sign-in restores the submitted FEN and title.

[Video](proof/local-user-flow.webm) · [Receipt](proof/receipt.json) · [Desktop editor](proof/16-custom-position-editor.png) · [Mobile editor](proof/17-mobile-position-editor.png) · [Native analysis](proof/18-custom-position-analysis.png)

Shared validation protects the setup endpoint and custom FEN in PGN imports. It rejects malformed fields, missing/adjacent kings, the non-moving king being attacked, inconsistent castling rights and en-passant state. Check and terminal positions can be saved as studies. Structural validation does not prove historical reachability of arbitrary piece arrangements. A custom setup begins new history; practice from an existing saved branch continues to copy its complete historical prefix. Black-first timed practice now displays the clock of the actual side to move.

All 65 application tests and SQLite snapshot checks pass, preserving the prior 61 tests. New checks cover validation, account isolation, saved FEN and branches, native-turn legality, zero-move FEN/PGN round trips, server restart, exact authentication continuation and Black-first clock display. Strict OpenSpec validation passes eight changes. `just local-check` passes the production entrypoint, archive mounts, local asset, native engine and private-path exclusions.

The 26-flow production-build recording uses native Stockfish 19 and only synthetic accounts in temporary SQLite. It retains all previous play, review, study, learning and settings paths. The editor flow places, moves and removes pieces, corrects castling, rejects invalid FEN without losing the board, loads en-passant state, flips on mobile, saves, analyzes, reloads, starts timed Black-first practice, verifies the active clock, plays against the engine and returns to the unchanged source.

Two earlier recording attempts exposed unstable wrapping-label lookup names. Live DOM inspection confirmed that the textarea value became part of its wrapping label text. Explicit select names and a separate associated textarea label fixed the cause without weakening assertions. The third run passed; source and screenshot review then led to wider desktop layout and readable FEN fields, followed by this passing final recording. Failure logs remain under checks; earlier evidence is retained locally in ignored verification history. The harness cleans up its browser, engine, server and temporary database while retaining proof.

Root reviewed source, screenshots and video frames. Independent team review remains unavailable under the installed Astra runtime validator. Existing installed skill-manifest drift still blocks `just setup` and `just check`; no gate or grading threshold was changed. The control-app feature map was updated in a bounded documentation pass after product work.

The local service at http://127.0.0.1:8772/ was restarted with this build. Native Stockfish 19 is ready; the consistent pre-change backup contains the existing 2 accounts and 2 games. No hosted site was changed. A separate manifest hashes source, local assets, build, tests and proof; earlier feature manifests remain historical evidence.

The [official analysis-board guide](https://support.chess.com/en/articles/8583825-how-do-i-use-the-analysis-board) informed the setup flow. Full Chess.com parity remains incomplete: opening/drill collections, the complete curriculum, proprietary bot equivalence, the conversational branching tutor and later multiplayer/billing remain additional work.

[PR #4](https://github.com/praxstack/ChessLab/pull/4) is open, stacked on position practice. The tested source and recording are committed at f61601cdd601af77962d8650ddb263d54a961b5f; later documentation records delivery.
