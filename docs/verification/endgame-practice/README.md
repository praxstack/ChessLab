# Local endgame practice

24 original pawn, rook, queen and minor-piece positions now open through the existing saved study and bot-practice flow. Learners choose an opponent, strength and color, play legal moves, request help, restart without overwriting earlier attempts, and return to the source study. A private attempt list shows actual game results and assistance counts. The browser also exposes original teaching notes and the solved starting-position result.

The complete standard 3–5-piece Syzygy set is locally downloaded: 290 files, 983,957,920 bytes. Each matches the published Lichess SHA-256. Python-chess 1.11.2 verifies all 24 catalogue outcomes and 371 legal continuations. Native Stockfish 16, 18 and 19 report actual tablebase hits. Unsupported engine options are not sent; Lite remains on ordinary search. No new runtime service or package dependency was added. Table files remain local and are not committed to Git.

## Evidence status

Application tests: 105 passed, including the protected previous tests, real native searches and owned HTTP persistence. SQLite snapshot and puzzle importer tests pass. The downloader's offline check verifies checksum rejection, destination preservation, atomic replacement, safe reuse and filename validation. All 21 OpenSpec changes validate strictly.

The first browser run failed before the new feature, in ordinary low-strength native bot practice. The recorded position reproduced four failures in twelve searches. Stockfish's chosen weaker move could be outside the single requested analysis line. The shared client now obtains all four skill candidates and returns the selected move with its actual score and PV. A deterministic fourth-candidate fixture and twelve native repeats pass. The existing coherent-iteration and complete-history protections remain intact. The full original 103-flow browser prefix is byte-identical; additional endgame flows follow it.

All 110 browser flows pass in the final run. Proof contains 81 screenshots and a 172.44-second video (17,610,121 bytes), using only synthetic accounts. Root inspected the final desktop attempt list and mobile catalogue, plus a recording contact sheet and sampled mate/promotion frames. The recording shows real setup, moves, results, private history and mobile continuation. Narrow mobile viewports occupy part of the fixed video canvas. [Video](proof/local-user-flow.webm), [browser receipt](proof/receipt.json).

The second browser run reached mobile promotion but used an incorrect wait predicate: the submit button remains disabled when its text input is empty. The corrected harness waits for the actual bot response and checks legal two-ply history. A subsequent full run passed; final wording cleanup and explicit Black-side strength selection were followed by another complete passing run. Failed recordings stay in ignored scratch; their logs are retained separately. No protected assertion was removed or skipped.

Local installation and its data-preservation receipt follow this accepted proof.

## Boundaries

The installed Astra Team validator still rejects the session runtime; no independent or delegated review ran. `just setup` and `just check` still report the pre-existing installed unslop skill hash mismatch. These gates were not changed or waived.

Solved labels apply to the displayed initial position with a fresh fifty-move counter and best play. They are not a prediction of a chosen low-strength opponent or a later history. DTZ is not mate distance. This original 24-position catalogue is not the complete vendor curriculum. Full parity, remaining practice modes and the branching conversational tutor remain unfinished; human multiplayer and billing follow later.

Baseline and rollback source: 1d3b2d1f47e0d58e4ebfa1d2538d09e110231320. Existing source, account data, unrelated deletions and prior evidence are protected. Receipts remain outside the content set they attest to. A private review PR and local installation follow accepted browser proof and a consistent database snapshot.
