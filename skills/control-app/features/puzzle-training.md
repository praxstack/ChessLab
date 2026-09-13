# Puzzle training

## Sub-features

Full locally imported CC0 catalogue, source rating and theme filters, server-owned attempts, wrong/correct move validation, opponent replies, hints, reveal, skip, reload, recent attempts, retrying mistakes, solution playback and saved native analysis.

## How to get to it (user POV)

Choose Puzzles, choose your practice and Start training. A local account saves attempts; Sign in to train opens account access. Starter exercises remain in the panel header.

## Driving it with Playwright

Use the real local catalogue with temporary account SQLite. Select Mate in 2 and a source rating range. Start, verify the source trigger was applied, make a legal wrong move and confirm the accepted board is unchanged. Hint marks assistance without exposing the solution. Submit the correct move, check the opponent reply, reload and return to Puzzles to restore the active attempt. Finish and Analyze solution. Assert original FEN, full source prefix, terminal result, native engine evidence and unchanged earlier study. Return, retry previous mistakes, reveal and inspect playback at 390px. Flip, retry without help and confirm only that clean attempt earns first-try credit. Existing server checks cover stale requests, foreign accounts, alternate mates, skipping and unavailable/empty sources.

## Gotchas

The archive and indexed database live under ignored data/puzzles. The full recording requires the installed catalogue. Import with scripts/import_puzzles.py; it refuses overwrite. Every source row is structurally checked on import; selected solutions are legally replayed before serving. Do not claim a complete engine re-evaluation of all 6,100,952 puzzles. The UI shows source ratings; custom training does not change chess ratings. Rated adaptation, daily puzzles and rush are not implemented by this flow. Analysis creates a separate study and does not copy a complete source game that is absent from the puzzle archive.
