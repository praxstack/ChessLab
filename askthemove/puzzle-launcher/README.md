# Daily puzzle launcher

A one-page launcher that opens the Chess.com daily puzzle on Chess.com's own analysis board, so Prax can move the pieces freely on the iPad or Android phone. It is live at https://daily-puzzle-launcher.vercel.app (Vercel project `daily-puzzle-launcher`, Hobby plan, no card). Nothing in the app or the site uses it.

```
this page                     Chess.com (signed in, every option as normal)
[Today's puzzle]   ─────────► /analysis?fen=…
[Today in explorer] ────────► /analysis/explorer?fen=…
[Random puzzle]    ─────────► /analysis?fen=… (from /pub/puzzle/random)
[Copy today's FEN]
```

## How it works

- It calls `https://api.chess.com/pub/puzzle`, which allows any website to read it (`access-control-allow-origin: *`), and reads only `fen`, `url` and `publish_time`.
- The reply's `pgn` field is the solution and `title` can hint at it, so the page never reads or shows either.
- `manifest.webmanifest` uses `"display": "browser"`, so the home-screen icon opens in the normal browser tab where Chess.com is already signed in.
- The bookmarklet on the page does the same jump for today's puzzle without this page.

## Checked on 27 October 2026

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
