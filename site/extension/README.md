# AskTheMove: Analyse this puzzle (browser extension)

Adds an **✎ Analyse on AskTheMove** button to Chess.com puzzle pages. One tap reads
the board on screen and opens it on https://askthemove.online/puzzleanalyzr/,
where the learner can draw on it, test their own line and check it.

```
chess.com puzzle page ──[✎ Analyse on AskTheMove]──▶ askthemove.online/puzzleanalyzr/?fen=…&from=chesscom
        (reads the pieces already on screen, on the user's own device)
```

## What it does and doesn't do

- Runs only on `chess.com/puzzles*` and `chess.com/daily-chess-puzzle*`. It never runs on Puzzle Rush, Puzzle Battle or any game page.
- Reads the piece elements of the board on screen (`piece wk square-71` = white king on g1) and builds a FEN.
- Opens our page with that FEN in a new tab.
- No permissions, no host permissions, no storage, no network requests, no login data, no Chess.com API.

## Files

| File | What |
|---|---|
| `manifest.json` | Manifest V3: Chrome, Edge, and Firefox 128+ |
| `reader.js` | Board → FEN. Shared with the phone bookmark. |
| `content.js`, `content.css` | The button and its message |
| `make-bookmarklet.mjs` | Builds the "Send to my board" bookmark from `reader.js` into `bookmarklet.txt` and the puzzle page's FAQ (`npm run build` runs it). |
| `icons/` | 16, 48 and 128 px |

Tests: `site/test/extension.test.js` (`npm test`).

## Try it without a store (free)

1. Chrome or Edge: open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
2. Click **Load unpacked** and pick this `extension` folder.
3. Open a Chess.com puzzle. The button sits at the bottom right.

Firefox: open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and pick `manifest.json`.

## Packaging for the stores

```
cd site/extension && zip -r ../askthemove-extension.zip manifest.json reader.js content.js content.css icons
```

- **Microsoft Edge Add-ons:** free developer account.
- **Firefox Add-ons (AMO):** free.
- **Chrome Web Store:** one-time USD 5 registration fee.

## Store listing (draft)

**Name:** AskTheMove: Analyse this puzzle

**Short description:** One tap sends the Chess.com puzzle on your screen to your own AskTheMove board. Draw on it, test your line, check it.

**Description:**
Stuck on a puzzle and want to think it through on a board you can mark up? Tap **Analyse on AskTheMove** on a Chess.com puzzle page. The position opens on askthemove.online, where you can:
- draw arrows, circles and notes in Mine / Theirs / Idea ink
- play out your own numbered line and replay it
- have the engine check your line (it marks the first move that fails, and never shows you the answer first)
- print a "book page" of the position with your notes

It works only on puzzle pages, never in games. It reads the board on your screen and nothing else: no login, no account data, no tracking.

AskTheMove is an independent project. It isn't made by or affiliated with Chess.com.

**Privacy:** The extension collects no data. The only thing it passes on is the position (FEN), in the address of the page it opens.

**Single purpose:** Opens the Chess.com puzzle on screen on the AskTheMove analysis board.
