# Openings

## Sub-features

Local name/ECO search, 24-line pagination, legal move playback, board flip, saved studies, practice from a selected move and review recognition.

## How to get to it (user POV)

Choose Openings in Main navigation. Search for Italian Game and select the C50 line. Select a move, then Practice this position or Study this opening. Review a saved game to see its latest named opening and Explore opening.

## Driving it with Playwright

Check the local catalogue count, next page, empty search and ECO filter. Select Italian Game, return to the initial board, then choose Opening move 1, black, e5. Practice this position creates a full source study before starting a separate two-ply practice game. Enter Nf3 and wait for a legal native bot reply. Return to source study, select Last position, and assert Italian Game and Played line. Reload and confirm full source history and opening identity. Explore opening at 390px, flip the board and check no horizontal overflow.

## Gotchas

The 3,810-line CC0 catalogue contains names and legal move sequences, not game statistics or opening lessons. Position matches preserve castling and legal en-passant identity but do not claim that the named move order was played. Recognition never merges histories. Opening information in an unfinished bot game marks that game reviewed. Saving or practicing requires a local account; browsing does not. Authentication resumes the selected opening and ply.
