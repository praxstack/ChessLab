# Whole-game review evidence

The app now saves an incremental native-engine report for a completed bot game or imported study. The report includes every move, evaluation graph, per-color classifications, average measurable centipawn loss, and key-move navigation. Pause and reload retain completed work. Selecting a saved move reuses its saved evidence.

[Recorded user flow](proof/local-user-flow.webm) · [Receipt](proof/receipt.json) · [Full report](proof/09-full-game-report.png) · [Selected key move](proof/10-reviewed-key-move.png) · [Mobile report](proof/11-mobile-report.png)

The recording runs the production build with native Stockfish 19 and a synthetic account in temporary SQLite. It retains the earlier play, study, learning and settings flows, then imports a completed game, pauses and resumes whole-game review across reload, verifies every evidence row against the legal history, navigates the graph by keyboard, filters key moves by color and reopens saved analysis without another search. Mobile layout and report controls are exercised. Source, build and proof hashes are separate in `manifest.json`.

`just test` passed all 58 application tests and the SQLite snapshot checks. Focused API checks cover ownership, stale cursor/revision, concurrent review, engine failure preserving earlier progress, cancellation/resume, restart persistence, terminal draw and preservation of an existing study. `just local-check` passed. Strict OpenSpec validation passed all six changes. The original 55 tests and classification thresholds were preserved.

Root reviewed source, screenshots and video. Independent-agent review remains unavailable because the installed Astra runtime validator rejects this host. Existing skill-manifest drift still prevents `just setup` and `just check`; these gates were not changed.

The local service at http://127.0.0.1:8772/ was restarted with this build. It retains the previous 2 accounts and 2 games; a consistent pre-change database backup is stored locally. No hosted site was changed. The recording proves the isolated workflow, not gameplay in a real user's account.

The [official review guide](https://support.chess.com/en/articles/8584089-how-does-game-review-work) informed the report/navigation flow. Local centipawn metrics and the existing local move classifications are not CAPS2 or proprietary classification equivalence. Opening recognition, full retry grading, coach voice, the complete curriculum and the conversational branching tutor remain unfinished parts of the full goal.

[PR #2](https://github.com/praxstack/ChessLab/pull/2) is open on top of the local-polish PR. The app-source commit is f039fbc; later changes only record delivery and normalize log whitespace.
