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

## Annotated studies

Import a PGN with nested alternatives, root/move comments and glyphs. Edit notes at original and branch positions. Export a study with an unsaved question and verify the actual downloaded file contains the saved exact tree. Export PGN and re-import it; reload and mobile study import must retain annotations. Induce one real study revision conflict in the synthetic account: verify export is blocked and its unsaved textarea remains. This exact expected 409 is asserted separately; every unrelated HTTP failure remains forbidden. Never record real account files.

## Board drawings

In Review or Analysis, right-drag an arrow and right-click a square. Test yellow/red defaults and Ctrl, Alt and Shift colors, identical-mark removal, recoloring, flipped coordinates and cancellation outside the board. Use Draw arrow and Highlight square by keyboard and at 390px. Drawings belong to an exact branch and ply; changing positions or cancelling a partial gesture must not transplant them. Edit a comment, save, reload, and inspect actual PGN and study downloads for the same marks. Clear marks must preserve the comment, glyphs, other positions and original moves. Manual drawings remain visible when engine arrows are disabled. Only synthetic studies enter proof recordings.

## Guided practice

From a completed report, open Practice key moves and choose a side. Retry a real native-reviewed mistake, reject an illegal typed move locally, inspect a legal rejected attempt and use Try again. Piece/arrow hints and attempt counts must survive reload and reopening. Solve with actual phone touch after flipping; assisted/repeated solves cannot receive first-try credit. Finish, restart explicitly, induce one exact synthetic practice revision conflict and reload its authoritative progress. Reveal separately and preserve all source moves/studies. Import a promotion position, complete its real native review, choose the correct promotion on the board and verify an unassisted completion. Assert the exact expected practice 409 separately; every unrelated HTTP failure remains forbidden.
