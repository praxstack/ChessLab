# Local Chess960 delivery

Chess960 now runs through numbered/random bot setup, legal play, native engine analysis, clocks and undo, rematch, position practice, nested studies, PGN/study files and the position editor. Castling works by king-to-rook click/drag, touch or SAN, including stationary and swapping king/rook cases. Standard rules, opening statistics and puzzle data retain their existing scope.

[Recorded user journey](proof/local-user-flow.webm) · [Desktop game](proof/64-chess960-live-game.png) · [Saved study](proof/65-chess960-castling-study.png) · [Mobile castling](proof/67-chess960-mobile-castling.png) · [Returning to Standard](proof/69-standard-after-chess960.png).

## Evidence

- 100 application checks pass, including every previous test. SQLite snapshot and puzzle importer checks pass.
- The independent python-chess oracle agrees on 3,290 positions, 75,221 transitions and 3,883 castlings, including all 960 numbered starts. The rules implementation is pinned chessops 0.15.1; Standard still uses chess.js 1.4.0.
- Real Stockfish 19, 18, 16 and 18 Lite analyze Chess960 castling. Those engines and Leela continue its full canonical UCI history. Unsupported Maia choices are blocked.
- The complete browser harness passes 96 flows. Its original 87-flow prefix is unchanged. New checks cover native play, full-game review, rematch/reload, nested imports, strict source preservation, actual downloads, mouse/touch castling, editor and transition back to Standard.
- 69 screenshots and a 114.60-second, 13,916,744-byte video use disposable synthetic accounts. Root inspected desktop/mobile captures and sampled the recording, including a Chess960 king-selection interaction. Some action captures show position analysis in flight; completed whole-game evidence is separately asserted.
- The actual production entrypoint passes local startup, archives, piece asset, native engine readiness and private-path exclusions. All 19 OpenSpec changes pass strict validation.

The new strict source-record assertion exposed an existing save-response defect: the returned timestamp differed from the committed study. The shared route now returns exactly what it stores. Deterministic failure logs are retained beside the final passing suite. The Chess960 adapter also preserves move counters across 10,000 and handles threat previews during check without relaxing legal game validation.

## Boundaries

This is local functional proof, not full Chess.com parity, proprietary bot equivalence, learning effectiveness or multiplayer delivery. Free-form conversational tutoring remains unfinished. The installed Astra Team validator still rejects this root runtime as unsupported (verified version 0.153.4); independent/team review did not run. `just check` still reports the pre-existing installed unslop skill-manifest drift. Neither gate was changed or waived.

An automatic approval review rejected a conditional navigation skip and reduced diagnostic harness. The accepted approach retained the full evaluator and all assertions, explicitly selected a saved move before returning to the start, and fixed the actual save-response defect. Failed attempts remain under ignored `.scratch/chess960/`; only the complete passing recording is published here.

The [manifest](manifest.json) binds source, build, dependencies, data and proof. Installation details are recorded separately after local readback. Rollback is the previous installed commit `2d58b3e53a5529e894adcb0ff6478b3516ca9ac1`; original main and unrelated work are preserved.

## Installed readback

Installed application commit `6cd1d4cc79702624b657a48c0bddc8f7bf934519` is served at http://127.0.0.1:8772/. All 586 source/build/proof files, rules packages, parsers, both catalogues and the opening archive matched the manifest. The served JavaScript/CSS bytes match the tested build. Five engines report Chess960 support; the opening corpus retains 280,155 games. Guest saved-game access returns 401.

All 14 account tables exactly match `data/backups/before-chess960-20260913.sqlite`, including 2 users and 2 games. The first readiness probe arrived during restart; a fresh unchanged strict readback passed after the service became ready. The existing guest browser visibly shows Chess960, its random/numbered start control and five disabled Standard-only Maia models. No production account was created or changed. Original main and both unrelated design-log deletions remain preserved. [Installation receipt](installation.json).
