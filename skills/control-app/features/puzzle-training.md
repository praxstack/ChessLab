# Puzzle training

## Sub-features

Full locally imported CC0 catalogue, source rating and theme filters, server-owned attempts, wrong/correct move validation, opponent replies, hints, reveal, skip, reload, recent attempts, retrying mistakes, solution playback and saved native analysis.

## How to get to it (user POV)

Choose Puzzles, then Rated, Daily, Custom practice or Puzzle Rush. For custom filters, choose Custom practice and Start training. A local account saves attempts; Sign in to train opens account access. Starter exercises remain in the panel header.

## Driving it with Playwright

Use the real local catalogue with temporary account SQLite. Select Custom practice, then Mate in 2 and a source rating range. Start, verify the source trigger was applied, make a legal wrong move and confirm the accepted board is unchanged. Hint marks assistance without exposing the solution. Submit the correct move, check the opponent reply, reload and return to Puzzles to restore the active attempt. Finish and Analyze solution. Assert original FEN, full source prefix, terminal result, native engine evidence and unchanged earlier study. Return, retry previous mistakes, reveal and inspect playback at 390px. Flip, retry without help and confirm only that clean attempt earns first-try credit. Existing server checks cover stale requests, foreign accounts, alternate mates, skipping and unavailable/empty sources.

Switch to Rated. Start Standard, use a hint, then reveal and verify one rating loss. Choose Extra Hard, solve a new unseen puzzle and verify one gain with the correct before/after values. Start Daily, reload and return to Puzzles to recover the daily mode, date and position. Complete it, check the streak and unchanged rating, return to the same daily attempt without duplicate credit, then retry it as custom practice at 390px. Deterministic checks cover shared daily snapshots, midnight rollover, score rollback and rating-band edges.

## Gotchas

The archive and indexed database live under ignored data/puzzles. The full recording requires the installed catalogue. Import with scripts/import_puzzles.py; it refuses overwrite. Every source row is structurally checked on import; selected solutions are legally replayed before serving. Do not claim a complete engine re-evaluation of all 6,100,952 puzzles. The UI distinguishes source ratings from the account’s local puzzle rating. Local Elo starts at 1500 with K=32; it is not proprietary or calibrated chess strength. The first rated mistake/hint/reveal/skip scores one loss even if practice continues. Custom and Daily never change that rating. Daily is pinned by the server’s local date; completing a saved attempt credits its original date. Battle remains in the later human-multiplayer phase. Analysis creates a separate study and does not copy a complete source game that is absent from the puzzle archive.

## Puzzle Rush

Choose Puzzle Rush, then Survival, and start. Play the first source move by selecting board squares (handle promotion if present), finish any remaining line through Rush move, and verify one point, a different puzzle and nondecreasing difficulty. Hints must be absent. Reload, return to Puzzles and confirm the same run/score/position. Make a legal non-solution move, then skip twice; the third failed puzzle ends the run. Check personal best and saved history. At 390px, flip and inspect results without overflow. Retry a failed puzzle, reveal it in Custom practice, and verify the original run, rated profile and daily credit remain unchanged. Return to Rush, start a three-minute run, inspect the actual deadline/clock and the compact mobile status strip above the board, end and reopen saved Survival history. Deterministic checks cover both timed modes at the exact deadline after restart, untimed recovery, illegal/stale requests, owner isolation, failed-save rollback and catalogue exhaustion after a multi-move solution.

Only finished runs allow retries. The server owns time; the browser uses elapsed monotonic time since the server receipt for display. Rush never changes the puzzle rating. Selection uses the existing covering index and legally replays the chosen source line. Local difficulty progression is not evidence of proprietary sequencing or a global leaderboard.
