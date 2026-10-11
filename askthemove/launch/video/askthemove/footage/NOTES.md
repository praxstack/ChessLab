# AskTheMove demo footage: raw app clips

These are raw screen recordings of the app running on localhost. Nothing has been edited, composited or rendered yet, and there is no HyperFrames project; the scope was footage only. The clips have no audio track.

## What was recorded

| | |
|---|---|
| Repo / branch | `praxstack/chesslab` · `claude/original-assets` |
| Commit recorded | **`ccdd4a4d307f2bcca4368c265a2bed42c7adf3e1`** ("test(e2e): select the renamed Slate board theme", 2026-10-08 09:15 UTC). I re-fetched before recording and again after; the origin tip was still `ccdd4a4` at 10:01 UTC. |
| Worktree | `/home/claude/chesslab-video`, detached at that commit and clean. `web/dist` was built from it with the repo's own `npm ci` and `vite build`. |
| Server | `node server/index.mjs` on `http://127.0.0.1:8801` with `NODE_ENV=production` and `APP_ORIGIN` set, so the app runs in hosted "Private beta" mode. The SQLite database was fresh. Stockfish 18 does the analysis. |
| Claude tutor | **Off.** `ANTHROPIC_API_KEY` was not set, so no "Explain why" button appears anywhere. No clip shows a Claude explanation. |
| Format | H.264, 1920×1080, 30 fps constant frame rate, yuv420p, BT.709 limited range, CRF 12, no audio. The capture is native 1080p: a 1440×810 CSS layout at a 4/3 device scale. It was not upscaled. |
| Account shown | `maya`, a new beta account on the loopback server. The password is masked on screen. |

## Clips

| File | Length | Shows |
|---|---|---|
| `01-sign-up.mp4` | 11.57 s | A beta account is created from the Play bots home. |
| `02-pgn-import.mp4` | 34.13 s | Pasting the PGN of a Légal's mate game (maya has Black and loses), the import landing on Game review, the board flipped, and autoplay through 7.Nd5#. |
| `03-game-review.mp4` | 64.77 s | Full Stockfish review of that game: progress, average loss, advantage graph, opening, key moves, and the evidence card for 5…Bxd1. |
| `04-variation-note.mp4` | 49.07 s | Comparing candidates before 5…Bxd1, branching a variation (5…dxe5 6.Qxg4), typing and saving a position note, and the saved line. |
| `05-bot-play.mp4` | 59.00 s | Choosing the bot Barnaby, setting strength 1200 and a 10-minute clock, then the first six moves against it. |

`contact-sheets/` has one sheet per clip with a frame every 2 s and timestamps.

### 01-sign-up (11.57 s)
- 0–1 s: Play bots home, signed out.
- ~1.5 s: click **Sign in**.
- 2–3 s: the "Make this your workspace" modal.
- 4–5 s: type `maya`.
- 6–8 s: type the password (masked).
- ~8.5 s: **Create account**.
- 9–11.6 s: signed in; the sidebar shows "maya · Beta account".

### 02-pgn-import (34.13 s)
The PGN is `1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6 5.Nxe5 Bxd1 6.Bxf7+ Ke7 7.Nd5# 1-0`, with White "Opponent" and Black "maya".
- 0–1.5 s: home.
- ~2 s: the **Import a game** modal opens.
- ~3.5 s: the PGN is pasted.
- ~7.5 s: **Import & review**.
- 8–9 s: the Game review page and the toast "PGN imported with comments and variations." The toast wording is fixed in the app; this PGN has no comments or variations.
- ~10 s: **Flip board**, so maya (Black) is at the bottom.
- 11–16 s: starting-position evidence card and candidate arrows.
- ~17 s: scroll to the moves list.
- ~18 s: **Play**.
- 18–31 s: autoplay to 7.Nd5#; the mated king glows red.
- 32–34 s: hold on the mate.

### 03-game-review (64.77 s)
- 0–3 s: scroll up to the Game report. The clip starts where 02 ended.
- ~4 s: **Review whole game**.
- 5–50 s: "Reviewing n/13" running **in real time**, with average centipawn loss per side, the advantage graph and the "Philidor Defense · C41" banner.
- ~50 s: review complete.
- 51–53 s: scroll to the classification table and **Key moves**:
  - 3…Bg4: Inaccuracy, 51 cp
  - 4…g6: Inaccuracy, 135 cp
  - 5…Bxd1: Mate sequence
  - 7.Nd5#: Checkmate
- ~55 s: click 5…Bxd1.
- 56–64.8 s: the evidence card. It reads "Bxd1 captures a queen. Sample line: Bxf7+ → Ke7 → Nd5#…" and shows M2, 38 legal moves, 39:38 material, and the receipt "Stockfish 18 · 1000 ms · depth 20".

### 04-variation-note (49.07 s)
- 0–3 s: **Compare before move** at 5…Bxd1 shows a dxe5 candidate arrow and "+1.87 dxe5 Qxg4…".
- ~5–8 s: **Try a variation**, with the toast "Variation started…".
- ~8–12 s: 5…dxe5, played by clicking squares.
- ~14–19 s: 6.Qxg4, played by clicking squares.
- ~20–24 s: "Variation lab" evidence (+1.90).
- ~25–28 s: scroll to **Position notes** (Variation 1 · ply 11).
- ~28–35 s: type the note "Take the knight. It was the piece attacking f7. A pawn down, but still a game."
- ~36 s: **Save notes**.
- ~36–38 s: the "Study saved." toast, and a note mark appears on ♕xg4 in the move list.
- ~39–44 s: foot of the page: "Your variations · 1 · Saved · Line 1 from ply 9 · 2 moves". **The board's top rank is cut off here** because the board column is sticky.
- 45–49 s: scroll back up to the whole board.

### 05-bot-play (59.00 s)
- 0–2 s: Play bots with the Starter roster, where Marlo is the default.
- 2–8 s: scroll the roster and open **Developing** (Wren, Castor, Lumi, Barnaby, Oona, Fennick, Saffi, Teodor).
- ~9 s: select Barnaby (1050), whose bio reads "Retired lighthouse keeper. I spot trouble coming from a long way off."
- ~11 s: open **Game options**.
- ~14 s: set strength to 1200.
- ~17 s: choose a 10 min clock.
- ~19 s: close the options.
- ~20 s: **Play Barnaby**.
- 21 s: both clocks at 10:00.
- 25–58 s: the game 1.e4 e5 2.Nf3 d6 3.Bc4 Be7 4.Nc3 Nc6 5.O-O Bg4 6.h3 Bh5, with "Barnaby is thinking", bot chat, the receipt "Stockfish 18 · target 1200 · Local simulation", and Hint 0 / Undo 0. maya's moves are a scripted Italian setup that was checked with Stockfish. Barnaby's moves come from the app's engine.

## Honest-copy notes for the edit
- All of this is real app footage, with no mock screens. The cursor is drawn on the page and follows the real mouse events, because a headless browser has no system cursor. Mouse paths and typing speed were scripted to look like a person.
- Card text such as "What's your next move?", "At your side", the bot chat lines, and "Bxd1 captures a queen. Sample line…" is the app's **deterministic engine-evidence and template wording, not Claude**. Do not caption any of it as the AI tutor.
- The "**Coach online**" pill at the top right of every clip only means the Stockfish engine is available (`status.engine.available`). It does not mean Claude is running.
- No pricing appears in any clip.

## Caveats
- **The app still says "ChessLab", not AskTheMove.** That name appears in:
  - the sidebar wordmark, in every clip;
  - the import modal's file-format text, "A ChessLab study file…" (02, ~2–7 s);
  - the page footer, "ChessLab · Private beta" (04, ~39–44 s).

  The edit needs to crop or mask these, or the clips need a re-shoot after the rename.
- 5…Bxd1 is classified as a "Mate sequence" and gets a **"!" badge** on the board (03 from ~55 s; 04 at 0–3 s). This is an app quirk.
- In 03, the review takes about 45 s of real time (5–50 s). Speed it up or cut it.
- In 04, the board's top rank is cut off at ~39–44 s. Use 36–38 s and 45–49 s around it, or crop.
- **Shared-folder side effect:** the project-files store added a 5,875-byte C2PA content-credentials box (`uuid` d8fec3d6…) to each MP4 (and a similar box to each contact-sheet JPG) after the copy. The MP4s' decoded frames are identical to the source encodes (I compared their MD5s).

## IP check (Chess.com art)
I checked every clip on contact sheets (one frame per second, and the 2 s sheets here) and at full resolution at the key moments. Only these appear:
- cburnett pieces (Colin M.L. Burnett, GPL-2.0-or-later, via lichess lila; provenance is in the repo);
- Lucide icons (lucide-static 1.47.0, ISC);
- the repo's own generated bot portraits;
- the slate and sand board with the teal accent.

None of the roster's 43 bot names match the 166 names in the earlier Chess.com-derived roster. There are no "chess.com" strings in `web/src`, `web/public`, `server`, `shared` or the built `web/dist`. **No screen had to be left out.** The landing page was skipped on purpose, because it is being replaced.

## Re-shooting
The recording kit is in this session's scratchpad: `/tmp/claude-0/-home-claude/b1b296ce-ac43-5e7c-9fa8-201429abfd6d/scratchpad/video/askthemove/`. The scratchpad is under `/tmp`, so copy the kit somewhere permanent if it needs to outlive the session.
- `start-server.sh [--fresh]` starts the app on port 8801 from the worktree and writes `server.pid`. `--fresh` empties the database so the sign-up account is new.
- `node record.mjs story` records clips 01–04 in one session.
- `node record.mjs botplay` records 05.
- `node record.mjs` records both.
- `node encode.mjs` rebuilds the MP4s from the saved frames in `raw/`.
- `lib/recorder.mjs` handles capture, encoding and the cursor; `lib/engine.mjs` is the Stockfish helper.
- When done, stop the server with `kill $(cat server.pid)`.

Prerequisites:
- Node 24 at `/tmp/node-v24.21.0-linux-x64/bin`.
- Stockfish 18 at `/tmp/sf18dl/x/stockfish/stockfish-ubuntu-x86-64-avx2`.
- Playwright from `/home/claude/chesslab/node_modules` with `/opt/pw-browsers/chromium`.
- ffmpeg.

Barnaby's replies vary from run to run; the script adapts its own moves.
