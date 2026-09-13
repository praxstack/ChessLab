# Openings

## Sub-features

Local name/ECO search, 24-line pagination, legal move playback, board flip, saved studies, practice from a selected move and review recognition.

## How to get to it (user POV)

Choose Openings in Main navigation. Search for Italian Game and select the C50 line. Select a move, then Practice this position or Study this opening. Review a saved game to see its latest named opening and Explore opening.

## Driving it with Playwright

Check the local catalogue count, next page, empty search and ECO filter. Select Italian Game, return to the initial board, then choose Opening move 1, black, e5. Practice this position creates a full source study before starting a separate two-ply practice game. Enter Nf3 and wait for a legal native bot reply. Return to source study, select Last position, and assert Italian Game and Played line. Reload and confirm full source history and opening identity. Explore opening at 390px, flip the board and check no horizontal overflow.

## Gotchas

The 3,810-line CC0 catalogue contains names and legal move sequences, separate from the game-statistics corpus. Position matches preserve castling and legal en-passant identity but do not claim that the named move order was played. Recognition never merges histories. Opening information in an unfinished bot game marks that game reviewed. Saving or practicing requires a local account; browsing does not. Authentication resumes the selected opening and ply.

## Game explorer

Select Game explorer for the public local corpus or My Games for private completed standard games. Play through move-statistic rows, board click/drag/touch or typed SAN/UCI; navigate first/previous/next/last and flip. Named lines also provide Explore this position. Replay an example, browse its complete moves, return to the previous exploration, or Study this example to import a new owned copy through the existing draft-safe flow.

Verify corpus count and White/draw/Black totals, expansion/collapse of the eight common moves and four examples, transpositions, source switching, invalid move preservation, sample replay and copied study isolation. At 390px, use actual touch on the flipped board and check overflow. Reload and reopen the explorer, verifying the same local corpus and private source. The data catalogue must exist at `data/explorer/catalogue.sqlite` or `CHESSLAB_EXPLORER`; import instructions are in the local workspace guide. The first 60 plies are indexed, with one encounter per game and up to three examples per move. Statistics are corpus results, not engine evaluations or Chess.com's master database.
