# Application verification — 7 September 2026

This is evidence for the first bot/coach stage, not a claim of complete Chess.com parity or deployment. The controlling change is `build-coach-web-platform`. The earlier research archive commit is `993a24e`.

## Automated results

- `npm test`: 20 tests passed, zero failures (7.96 seconds). Eleven engine checks use native Stockfish 19 or deliberate failure executables; four server integration checks cover accounts, ownership, revisions, persistence, study validation, save failures and learning progress; five frontend state checks cover legal notation, promotion, nested history, return anchors and study limits.
- `just test`: setup helper self-test and the then-current 19 application tests passed. One additional castling/en-passant test was subsequently added and the complete 20-test application suite passed. Same-host cross-scheme origin rejection was added to the existing account test.
- `npm run build`: passed. Built JavaScript is 275.90 KB (86.59 KB gzip), CSS 34.67 KB (8.69 KB gzip). No engine executable or weights are included in these browser assets.
- OpenSpec strict validation: both changes passed. Structural validation is separate from runtime evidence.
- `just check`: fails on the pre-existing shared `gstack-cso` entrypoint hash drift. The manifest was not changed to conceal it. Git whitespace checks passed independently.

The deliberate read-only database test prints a save error and then verifies that the earlier study survives. This is an expected failure-path test, not a hidden passing write.

## Observed browser behavior

The Codex in-app browser exercised the actual server at `http://127.0.0.1:8770`, first in development and then with built production assets. The local test account and its data are ignored by Git.

- Created an account; started as White, entered e4 and received a real legal bot reply.
- Opened individual move review with actual Stockfish identity, estimates, sample lines and capture/material evidence.
- Created d4 as an alternative to the actual e4 game, nested Black's d5, saved a branch question, reloaded, and returned to the original ply-zero anchor. The actual e4 line remained intact.
- Rejected an invalid PGN while preserving the current game; imported a valid six-ply PGN and selected its moves for review. PGN export results and imported player names are also covered by server tests.
- Tried a wrong lesson answer, then the correct answer. Tried a legal wrong puzzle move, then captured the rook using board clicks. Correct progress survived a full server restart.
- Opened the promotion chooser and promoted to a queen; the puzzle completed and progress increased.
- Changed coordinates, analysis time and candidate count; verified persisted coordinates after reload and the new 300 ms/two-line engine review.
- Started as Black, observed the coach's first White move, played e5, received its next reply, and resigned into review.
- Used saved-game navigation at 320 px width. Checked 390 px and 320 px layouts with no horizontal document overflow, and visually inspected the 1440 px desktop board/review layout.
- Compared before a selected move and inspected candidate arrows. Corrected the evaluation display so the board, rail and score use the same shown position.

## Bugs corrected during integration

PGN headers/results were previously overwritten by an incorrect library call. The queen mate puzzle originally rejected other valid mating moves. Origin comparison originally omitted the scheme. Study saves originally allowed two-tab overwrites; separate draft revisions now protect them, including when a bot response contains a newer remote study. Late lesson/puzzle responses are ignored after navigation. Resignation saves pending study edits, unsaved edits trigger a browser unload warning, and additions beyond study size limits preserve the current draft.

The two frontend response-race fixes were reviewed and built, with server conflict/ownership tests underneath them. Artificially delayed browser-response races were not replayed through a network interceptor in this run.

## Checks not claimed

`scripts/check_app_browser.cjs` is a runnable isolated browser smoke behind `just e2e`. Its syntax passed, but the script itself was not executed: browser interaction in this run used the available CUA tool. The observed browser checks above are separate evidence. Drag-and-drop, sound playback, comprehensive accessibility, other browsers and real phone hardware have not received full manual validation. Click and typed move entry were exercised.

The rewritten HTML dossier is generated and checked separately. Its older browser receipts remain historical and do not attest to this application.

## Delivery boundary

The private repository at [praxstack/ChessLab](https://github.com/praxstack/ChessLab) was created and its `isPrivate: true` setting was read back. Commit/push verification is reported after the final source and dossier checks. Public hosting, actual human multiplayer, billing, unrestricted conversational coaching and a full curriculum remain unfinished. The local production server is the demonstrated runtime.
