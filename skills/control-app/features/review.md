# Review and studies

## Sub-features

Position analysis, nested branches, branch notes, complete game reports, advantage graph, key moves, pause/resume, saved evidence position practice and custom position setup.

## How to get to it (user POV)

After a bot reply, choose Review, then Try a variation. For a full report, finish the bot game or use My games → Import a PGN, then choose Review whole game.

## Driving it with Playwright

Assert real engine identity and explanation. Enter a legal variation move, click Branch here, add a note, then Save study. Assert parent linkage and unchanged original game moves. Return to game, save, and reload. Import a completed PGN, start whole-game review, pause after a saved step, reload and resume. Check every report row against the actual move history, use the graph slider and color filter, and select a key move. Reload the finished report and navigate it without new analysis requests. Exercise the report at 390px.

Choose Practice this position in a saved nested branch. Confirm the board preview and side to move, choose an opponent, and start. Play a legal move and wait for the actual bot reply. Undo to the copied starting position, restart, reload, and Return to source study. Assert the original moves, nested branch and note are unchanged. Check the setup at 390px.

## Gotchas

Analysis is asynchronous. Wait for response and visible text. Saved learner notes are not free-form AI answers.

Reports keep their own engine limits and per-move evidence in SQLite. Centipawn averages exclude mate scores; they are not proprietary accuracy scores. A changed game or search configuration requires a matching new report. Full reports are unavailable during unfinished bot games.

Practice retains the complete history prefix and imported starting FEN. Undo cannot cross that prefix; restart copies the retained prefix again. Practice does not award roster crowns. Starting practice from an unfinished bot game marks that source as reviewed. Full-game reports include the retained history; live move feedback starts with new practice moves.

Choose Set up position from the welcome screen, My games or the board actions. Clear the board and place kings and rooks. Move pieces by clicks and dragging, remove a piece by dropping it on Remove pieces, and drag a replacement from the palette. Correct castling rights before saving. Load invalid FEN and verify the edited board remains intact, then load a valid en-passant position. Set the side and counters, flip at 390px, save, inspect native analysis, reload and start timed Black-first practice. Confirm only Black’s clock runs and returning preserves the empty source history. Cancel guest sign-in after submitting a position and confirm its FEN and title are restored.

Custom setup begins new history. The server also validates FEN in imported PGN. A zero-move PGN with FEN can round-trip a position. Structural rule validation does not prove historical reachability of an arbitrary constructed board.
