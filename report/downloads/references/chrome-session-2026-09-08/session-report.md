# Chrome reference session and functional corrections

Captured 8 September 2026. Reference: signed-in Chess.com in the user's actual Chrome browser. Product: ChessLab at http://127.0.0.1:8770/. These observations are reference evidence, not a change to the full non-multiplayer parity requirement.

## What was actually operated

- **Play Coach:** onboarding, Casual/Balanced/Challenging, white/random/black, ten explicit levels (the full list is retained in `03-coach-levels-complete-dom.txt`), suggestion arrows, threat arrows, evaluation bar, move feedback, hints, paired takeback, a hanging-pawn warning and its Continue/Retry controls. Played e4 d6 d4 Nc6 d5 e5, took back the last turn, then Qh5 Nxd4 Qf3 Ne6. Resigned and inspected the result. The warning's Retry action was not verified before the reference continued; no successful Retry claim.
- **Puzzles:** onboarding/path, daily/rush/battle/custom entries, two solved rated puzzles, Next Puzzle, result points/streak and Retry. Solved Bd3+ Kf8 Bxb5 and Qxf7#. The reference account's puzzle progress changed through those successful solves. Did not complete all modes or the full puzzle corpus.
- **Play Bots:** Band Class roster and themed assets, colors, time controls, bot chat, actual Cliff (300) game e4 e5 Qh5 Nh6 Bc4 c6, hint and paired undo, resignation confirmation, result and Game Review. Both reference games ended by resignation, not by checkmate.
- **Game Review:** summary accuracy/classification counts/game rating/skill categories; Start Review; each move; Explain and its sample line; Best and navigation controls; a bot blunder explanation. Captured actual first-move speech as well as on-screen text. Did not exhaust every review branch or every setting.
- **Online:** custom challenge, Rated toggle switched off, five-minute selection and a matched opponent. Automatic approval review blocked the first coordinate move, saying it could not verify the exact move in a live human game. The game auto-aborted before any agent move. The account displayed an abort warning. No completed online game is claimed and no second match was started.

## What changed in ChessLab

The previous boolean pending-start state preserved only bot starts. Correct puzzle moves, lesson choices and PGN import submissions were discarded when sign-in interrupted them. They now retain explicit payloads and continue after successful authentication. Closing the dialog cancels the pending action. A failed background game-list refresh no longer discards a successful sign-in continuation. Account/exercise generations reject stale responses; an older game-list refresh cannot replace a newer one.

Puzzles now expose a Solve puzzles entry button and a direct Next puzzle action after completion. The underlying authored collection remains six introductory puzzles and six introductory lessons. These controls do not imply the full Chess.com curriculum or rating system is implemented.

## Verification

- Actual Chrome red/green: guest d3-e4 was lost after login before the fix; the same submitted move completed the puzzle after the fix without re-entering it.
- Actual Chrome: a lesson answer and a four-ply PGN import both continued after sign-in. Bot selection continued into a game; e4 received a real server-engine reply. Next puzzle loaded a different playable position. Screenshots are separate from reference captures.
- Nine focused handler checks pass: cancellation, original payload retention, refresh failure independence, stale exercise/account replies, late guest bootstrap and out-of-order game refresh.
- `just app-check`: 55 tests passed and the production build passed. Includes actual ready/response checks for all ten installed engine configurations. Initial sandbox run could not open loopback test listeners; the authorized rerun with loopback access passed. A pre-existing test cleanup path logged a readonly-database message; the suite had zero test failures.
- OpenSpec: all four changes validated. Git whitespace check passed. Skill setup self-test passed.
- `just check` is not fully green: the globally installed `/Users/prax/.agents/skills/unslop/SKILL.md` differs from the project's recorded setup hash. The canonical skill and recorded hash were not changed in this run.

## Recording and audio provenance

Computer History was already running and its observation settings were preserved. Record & Replay session 0E5ACFBE-F8CE-4F38-BDDD-8683798041F2 ran from 23:59:35 UTC on September 7 to 00:29:36 UTC on September 8 and ended at its 30-minute cap. The next start call was delayed and returned a new session, 8C655EED-2F1D-416A-AF7A-FC0C01C09949, at 03:06:13 UTC. That second recording was stopped at 03:25:29 UTC after the reference capture; Computer History remained running. The gap is not presented as recorded activity.

Numbered PNGs and paired TXT snapshots are preserved without alteration. A brief attempted browser screencast was stopped after the tool session reset. This atlas is a strategic screenshot sequence, not a continuous synchronized video. Raw general desktop history remains in Computer History's local store; unrelated desktop activity and password-entry events are not copied into this repository.

Seventeen observed MP3 responses are preserved with source URLs. Eleven are accepted speech transcripts from actual audio. Six are sound effects; their unreliable ASR guesses are explicitly rejected. Local Whisper.cpp processing used no expected-text prompt or remote upload. Some browser assets may be prefetched; network receipt alone does not prove playback. Transcript confidence is qualitative, not a calibrated probability. See audio/transcripts.md, audio/additional.md and corresponding JSON receipts.

## Remaining product work

Full one-to-one parity remains unfinished. Missing or unproven areas include dedicated Play Coach onboarding and level behavior, spoken coaching in ChessLab, the pre-reply warning/retry flow, a complete whole-game review experience, the puzzle path/rating/corpus, and the interactive lesson curriculum. Local named-bot simulations have not established proprietary behavior equivalence. The current hosted native engine service still depends on this Mac and its tunnel remaining available. The original branching conversational-tutor objective remains preserved for differentiation after the requested baseline.

## Private publication and current boundary

The correction is committed and pushed to the private GitHub repository as cde3d74. Sites version 4 (source 1a9e8de4466af57dace170ff1213c92168664c59) published successfully at https://chesslab-bot-studio.prax-lannister.chatgpt.site/ with owner-only access and environment revision 1. The React bundle matches the locally tested build. Chrome owner sign-in succeeded; the deployed roster and new Solve puzzles flow loaded. Creating a new app QA account was blocked by automatic approval review, which described it as an external account-creation action needing specific authorization. No new hosted account was created and no fresh hosted gameplay pass is claimed. The previously existing in-app Site tab was also signed out of its application account. Local authenticated gameplay and puzzle/lesson/import checks passed; those do not substitute for the blocked fresh hosted session check.
