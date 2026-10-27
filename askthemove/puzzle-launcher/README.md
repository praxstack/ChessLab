# Daily puzzle launcher

A one-page launcher that opens chess positions and games on Chess.com's own analysis board, so Prax can move the pieces freely on the iPad or Android phone. It is live at https://daily-puzzle-launcher.vercel.app (Vercel project `daily-puzzle-launcher`, Hobby plan, no card). Nothing in the app or the site uses it.

The redesigned version lives in the AskTheMove site at `/puzzleanalyzr/` (`site/pages/puzzleanalyzr.html`, `site/public/assets/puzzle.js`): one page with the position on a book-diagram board, a calendar of every daily puzzle, a paste box and a contact sheet of your games. Once it is deployed, this Vercel page should point there.

```
TAB         WHAT YOU GIVE IT                      WHERE IT OPENS (chess.com)
Puzzles     Today / Today in explorer             /analysis?fen=…, /analysis/explorer?fen=…
            Random (an older daily puzzle)        /analysis?fen=…  (api /pub/puzzle/random)
            Lichess puzzle of the day             /analysis?fen=…  (lichess /api/puzzle/daily)
            A date, saved in the archive          /analysis?fen=…  (no hints)
            A date, not saved                     /daily/YYYY-MM-DD (Chess.com's puzzle page)
Paste       FEN                                   /analysis?fen=…  (+ explorer)
            PGN (whole game or just moves)        /analysis?pgn=…
            Chess.com game link                   /analysis/game/{live|daily}/{id}
            Chess.com daily puzzle link           same as picking that date
            Lichess game / puzzle / study link    fetched from the Lichess API, then ?pgn= or ?fen=
            Any link with fen=                    /analysis?fen=…
My games    Chess.com username, then a game       /analysis/game/{live|daily}/{id}
```

## Saved puzzles (the archive)

Chess.com's public API has no "puzzle for date X". The workflow `.github/workflows/save-daily-puzzle.yml` runs every hour and saves today's puzzle plus one random older one (the random reply names its date) to `puzzles.json` on the `puzzle-archive` branch. It keeps only date and FEN. The page reads that file from `raw.githubusercontent.com` (CORS `*`). Today's puzzle always counts as saved, even before the archive has it. Older dates fill in slowly, about 24 a day. GitHub can switch off scheduled workflows in a repository with no activity for 60 days; re-enable it in the Actions tab if that happens.

## How it works

- It calls `https://api.chess.com/pub/puzzle`, which allows any website to read it (`access-control-allow-origin: *`), and reads only `fen`, `url` and `publish_time`. The Lichess puzzle reply's solution and themes are not read either.
- Game lists use `/pub/player/{user}/games/archives` and one monthly archive at a time. Chess.com can refuse a very busy month (403); the page says so.
- Clock and engine comments are stripped from PGNs so the link stays short. A 2,600-character PGN with headers loaded every move.
- The reply's `pgn` field is the solution and `title` can hint at it, so the page never reads or shows either.
- `manifest.webmanifest` uses `"display": "browser"`, so the home-screen icon opens in the normal browser tab where Chess.com is already signed in.
- The bookmarklet on the page does the same jump for today's puzzle without this page.

## Checked on 27 October 2026

- Paste box: 18 kinds of input (FENs with and without the side to move, bad FENs, move lists, a full Chess.com PGN, Chess.com live, daily and new-style game links, daily puzzle links, Chess.com puzzle links, Lichess game, puzzle and analysis links, other links, plain text) each produced the expected Chess.com link or a plain error.
- My games: a real account listed its month of games, the Older button loaded the month before, and an unknown name said so.
- `https://www.chess.com/analysis/game/live/{id}` loads the game's moves (when signed out it also shows an "authentication failed" banner).

- `https://www.chess.com/analysis?fen=<encoded FEN>` loads the exact position (Playwright, all 22 pieces).
- Chess.com's engine is on by default and showed "M2" plus the full answer line ([engine on](screens/chesscom-engine-on.png)). Turning the **Analysis** switch off once stays off after a reload in the same browser ([engine off](screens/chesscom-engine-off.png)). The page tells the user to do this once per device.
- No URL setting flips the board (`flip=true`, `flipped=true` and `orientation=black` did nothing), so the user taps Chess.com's flip button when Black moves.
- `/pub/puzzle/daily` returns 404 and there is no lookup by past date.
- Tested in headless Chromium at iPad (820×1180) and phone (390×844) sizes. Not tested on a real iPad or Android device, and not with the Chess.com app installed, which may open the links itself.

## Deploy

The files in this folder are the whole site. They were deployed with the Vercel MCP `create_deployment` call (static files, no build). To redeploy by hand: `npx vercel deploy --prod` from this folder.

## draw-board-draft/

A parked draft of a custom practice board (chess.js, tap or drag moves, undo, flip, a hidden answer, and a draw layer for arrows and freehand ink with Apple Pencil palm rejection). Prax chose Chess.com's own board instead on 27 October 2026, and the draw-over-the-board idea is parked for later. The draft was never run or tested.

## Licences

- `icon.svg` and the icon PNGs use the cburnett knight, GPLv2 or later; see [icon-LICENSE.txt](icon-LICENSE.txt).
- `draw-board-draft/` includes chess.js 1.4.0 (BSD-2-Clause, [chess.js.LICENSE.txt](draw-board-draft/chess.js.LICENSE.txt)), the cburnett pieces ([pieces/LICENSE.txt](draw-board-draft/pieces/LICENSE.txt)) and OFL fonts ([fonts/OFL.txt](draw-board-draft/fonts/OFL.txt)).
