# AskTheMove: design system and UX review

Reviewed 9 October 2026 against current `main` (read-only checkout at `/home/claude/chesslab-review`). The app was run from a scratch copy and driven with Playwright and Chromium. Screenshots are in `screens/` next to this file. Every UX claim below comes from a screenshot or a scripted probe listed at the end.

## How the app was run, and what that limits

- **Runtime.** Node 22.22 (the README asks for 24; `npm ci` warned with EBADENGINE but the build and server worked). `npm ci`, `npm run build`, then `NODE_ENV=production node server/index.mjs` on port 8781 with a scratch SQLite database.
- **Stockfish.** Stockfish 16 was already installed by apt at `/usr/games/stockfish`. It is not on `PATH`, so `command -v stockfish` returned nothing. With `STOCKFISH_PATH=/usr/games/stockfish`, analysis worked (`/api/status` reported Stockfish 16).
- **Bots.** At first no bot could be played: every opponent engine reported unavailable. `stockfish19` must report the name "Stockfish 19", and the other nine engines expect binaries under `data/engines/` that `scripts/install_engines.py` downloads. Screenshot `00` shows this state. To get past it without installing anything new, I symlinked the same apt Stockfish into the scratch copy's `data/engines/stockfish16/stockfish`. Bots then played as "Stockfish 16 · target 250".
- **Claude explanations.** There is no Anthropic key here, and without one the "Ask the coach" section is not rendered at all. To see that UI, the scratch `.env` set a placeholder key and `ANTHROPIC_BASE_URL=http://127.0.0.1:9` (a closed local port), so no request left the machine. The screenshots therefore show the fallback path ("The AI coach is unavailable right now. Showing the verified engine summary."). **No Claude-written explanation was seen in this review.**
- **Puzzles.** The local puzzle catalogue is not installed in a fresh clone (it needs `scripts/import_puzzles.py`, which downloads data). The Puzzles screens show that empty state.
- The scratch copy was deleted at the end. The checkout was not modified.

---

## Part A. The design system as code

### A1. Where tokens and theming live today

| Surface | File | What it has |
| --- | --- | --- |
| **App** | `web/src/styles.css` (103 KB, 330 lines, longest line 5,645 characters, 1,294 rules) | 10 global custom properties on `:root` and 2 local ones. Dark only (`color-scheme: dark`). No type, spacing, radius, motion or z-index scale. |
| App board themes | `web/src/styles.css` lines 79-100, `web/src/settings-state.js`, `web/src/main.jsx` line 322 | `data-board-theme` on `.app-shell`, read from localStorage settings. Slate & sand is the unscoped default (`.square.light/.dark`); Walnut, Blue and Gray are `[data-board-theme=…]` blocks with literal hex. |
| App board overlays | `web/src/Board.jsx` line 31, `shared/board-marks.js` | Engine arrow colours `#edba68 #405fe0 #bd74ce` are hard-coded in JSX. Study marks use `markColors {R,G,Y,B}` in shared JS. |
| App palette origin | `scripts/retheme_palette.py`, `openspec/changes/original-asset-pack/` | The palette is a one-to-one recolouring of an inherited stylesheet: green board `#769656/#eeeed2` became slate/sand, button green `#81b64c` became teal `#3fbfa2`, and every warm grey became an ink grey "at the same relative luminance". This is why the file has hundreds of near-duplicate greys. |
| **Landing site** | `site/DESIGN.md`, `site/public/assets/app.css` (2,659 lines) | A real token layer: OKLCH colour tokens with stated roles and contrast, a type scale (`--text-hero` … `--text-hand`), spacing `--s-1`…`--s-10` on a 4-point grid, a single `--radius: 4px`, two easing tokens, and a written motion language with reduced-motion rules. Light only by design. Self-hosted Vollkorn, Kalam and Courier Prime. |
| **Design archive** | `design/gallery.css`, `design/build.py`, `design/check.py`, `design/manifest.json` | A third palette (`--paper #f5f7fc`, `--ink #192a50`, `--blue #365bc3`, `--rose #a13856`; Avenir and Iowan Old Style). `build.py` renders the 17 Grok Imagine mockups into a static gallery with Pandoc. `check.py` verifies `manifest.json` hashes, links and alt text. These are archive tools, not a token pipeline, and nothing in them feeds the app. The gallery is still branded "♞ ChessLab DESIGN STUDIES" and is linked from the app's sidebar. |

The app's global tokens:

```
--rail #1e2530  --surface #1e2530  --raised #2f3a4c  --line #364358
--muted #adb4bf --paper #ebedf1 (used as text colour)
--action #3fbfa2 --on-action #0d1f1b --amber #e9b85c (focus)
--mono 'SFMono-Regular', Consolas, monospace
local: --course (learning-path course hue), --medal
used but never defined: var(--text) ×7, var(--text-muted) ×1
```

`--rail` and `--surface` have the same value. `--paper` means text colour in the app and page background on the site.

### A2. Hard-coded values versus tokens

Counted with a script over the source (not the build):

| File | Hex literals | `rgb()/oklch()` | `px` values | `var(--…)` uses | Inline `style={{}}` |
| --- | ---: | ---: | ---: | ---: | ---: |
| `web/src/styles.css` | **500 (382 unique)** | 0 | **2,036 (165 unique)** | 256 | n/a |
| `web/src/Board.jsx` | 6 | 0 | 0 | 0 | 2 |
| `web/src/main.jsx` | 0 | 0 | 0 | 0 | 3 |
| other 15 JSX files | 0 | 0 | 0 | 0 | 3 (OpeningExplorer) |
| `site/public/assets/app.css` (for comparison) | **0** | 24 (the token definitions) | 201 | **455** | 0 |

Inside `styles.css`:

- 72 distinct dark surface hexes and 59 distinct mid-grey text hexes.
- 38 distinct `font-size` values, from 9px to 72px, including 12.5px and 13.5px. 15 rules set 9px and 60 set 10px.
- 22 distinct `border-radius` values (2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16 and 20px, plus asymmetric ones).
- Font weights 400, 500, 550, 600, 650, 700, 750 and 800.
- Five `transition` declarations and z-index values from 0 to 50, chosen case by case.
- Fonts are platform stacks (`-apple-system`, `Segoe UI`; headings `ui-rounded, 'SF Pro Rounded'`). The look changes on Windows and Linux, where SF Pro Rounded doesn't exist.

**Worst areas.** All of these are in `styles.css`, which carries every literal.

1. Puzzle training and Rush (lines 235-243): 55 hex values on two lines, plus private input and select colours (`#202734`, `#262f3f`, `#3b4961`).
2. Openings and the opening explorer (lines 231 and 294-296): 38 hex values.
3. The learning path (line 251): 21 hex values, with course hues hard-coded per variant.
4. The modal and the library (lines 166 and 171).
5. `Board.jsx`, the only JSX file with colour literals.

### A3. Components and screens

**Screens** (nav order): Play bots (bot picker, board, a panel with Play bots / Review / Analysis tabs), Game review and report (`GameReview.jsx`, `ReviewPractice.jsx`, `CoachExplain.jsx`, `PositionNotes.jsx`, `BoardDrawingTools.jsx`), Puzzles (`PuzzleTraining.jsx` with Rated, Daily and Custom; `PuzzleRush.jsx`), Learn (`LearningPath.jsx`: path and lesson library), Openings (`OpeningLibrary.jsx`, `OpeningExplorer.jsx`), Endgames (`EndgamePractice.jsx`), Vision (`VisionTraining.jsx`), My games (`GameLibrary.jsx`). Modals: Settings (`Settings.jsx`), sign in or create account, import, position editor (`PositionEditor.jsx`), new game, practice, resign. They all live in `main.jsx`, which is 71 KB in 371 lines and also holds `Modal`, `Icon`, auth, play and review state.

**What is shared:**

- One `Board` component is used on every screen, which is good. So are `Piece`, `BotAvatar` and `Medal`.
- One `.button` family (`primary`, `secondary`, `small`, `danger`; 32 primary and 32 secondary uses), plus `.text-button`, `.icon-button`, `.eyebrow`, `.form-error` and `.toggle`.

**What repeats:**

- 21 page-specific heading and hero classes (`training-heading`, `opening-intro`, `explorer-heading`, `endgame-heading`, `vision-intro`, `learning-path-hero`, `report-heading` and others). Each restates the same pattern: eyebrow, two-line slogan, and a big teal number on the right.
- About 20 context overrides of `.button` (`.training-entry .button`, `.opening-transport .button` twice, `.endgame-start .button` and others).
- At least five segmented controls with different semantics: panel tabs (plain buttons with an `active` class), training mode picker and library filters (`aria-pressed`), learning tabs, opening tabs, and Settings, which is the only one using `role="tablist"`.
- Five move-entry variants (play, puzzle, lesson, Rush, Vision) and three transport bars.
- Seven `*-panel` classes and four `*-card` classes.
- About six different input background colours. The library search box is near-black; other inputs are `#262f3e`.
- Light cards (`#e…` backgrounds; 21 light background declarations) sit inside the dark panel for the coach message and the review explanation. They form a second surface system with its own greys (`#3a4744`, `#cfdedb`).

There is no app `DESIGN.md`, no component inventory and no visual regression check beyond `scripts/check_app_browser.cjs`.

### A4. Accessibility

**Contrast** (WCAG 2.x, computed from the CSS and checked in the page on every screenshot):

- **Core tokens pass:** `--muted` on page 6.45:1, eyebrow 5.97:1, nav section label 4.66:1, placeholder 5.56:1, primary button text 7.47:1, amber focus ring 7.36:1.
- **Failures seen on screen:**
  - The review card's 10px labels ("White's score", "legal moves before", "material before") are 3.75:1.
  - The engine receipt ("Stockfish 16 · 1000 ms · depth 16") is 3.97:1.
  - The AI fallback label is 3.65:1.
  - The number on the evaluation rail is 1.49:1 (`#363636` on `#13171f`).
  - The "??" blunder badge is about 4.0:1 at 14px.
  - The Gray board's squares are only 2.61:1 apart, and the Slate & sand squares 2.56:1.
- **Tiny text.** 75 rules set 9px or 10px. Much secondary information is small and low contrast at once.

**Focus:**

- The global `:focus-visible` is a 3px amber outline, which is good.
- Board squares use a different navy inset ring (`#284e92`). It is 6.1:1 on sand squares but **2.4:1 on slate squares**, below the 3:1 non-text minimum (screens `12-keyboard-focus-*`).
- Focus returns to the account button after the sign-in dialog closes, which is good. After a game starts, focus falls to `<body>`.

**Keyboard play on the board:**

- Every square is a native `<button>` with a good label: "e2, white pawn", "e4, empty, legal destination", "…, in check". Enter or Space selects and moves.
- There is no arrow-key movement or roving tabindex, so the board is 64 tab stops. It took 15 Tab presses from page load to reach the board, and 16 Shift+Tab presses to go from e2 to e4.
- The selected square is not exposed: it has no `aria-pressed` or `aria-selected` (screen `12-keyboard-select-e2`).
- The text box "Enter a move in SAN or UCI" is a real alternative and works.

**Screen reader:**

- During a game there is **no live region at all**: zero `role=status`, `aria-live` or `role=log` elements were found after the bot replied. The bot's move, check and the bot's chat line (`div.bot-chat`) are not announced.
- The move list is good: "Move 1, white, e4", with `aria-current="step"` on the current move.
- Engine arrows and study marks are `aria-hidden` SVG and have no text equivalent on the board. The candidate lines exist as a list in the panel.
- The active nav item has no `aria-current`.
- The Play bots / Review / Analysis panel tabs expose no selected state.

**Reduced motion.** A global `@media (prefers-reduced-motion: reduce)` rule removes all animations and transitions (verified: computed transition duration 0s). Settings also offers piece animation from None to Slow. This passes.

**Chess correctness of the board.** `Board.jsx` line 23 computes `dark=(fileIndex+rank)%2===0`, which marks a1 as light. Pixel sampling of `01-home-first-run-1440.png` confirms that a1 is sand and h1 is slate on every screen, every theme and both orientations. Real boards have a dark a1 ("light on the right"; the queen starts on her own colour). The landing site's board is correct. For a teaching product whose lessons include "Bishops follow diagonals", this is the most visible defect in the app.

### A5. Brand consistency: site versus app

| | Landing site (`site/DESIGN.md`) | App |
| --- | --- | --- |
| World | Light paper "coach's lesson notebook": quad ruling, red margin rule, under a desk lamp. Dark mode is explicitly ruled out. | A dark slate "analysis room" (`#262f3e`, rail `#1e2530`). Dark only. |
| Type | Vollkorn (book), Courier Prime (engine), Kalam (coach's hand) | System sans, SF Pro Rounded headings, SFMono for numbers. No web fonts. |
| Colour roles | Ink; **blue ink = coach and the one primary action**; **red pen = mistakes**; highlighter = key words and last move | **Teal = primary action and active state**; amber = focus; red, orange and yellow = move classes; blue and purple only in arrows |
| Board | Book diagram: hatched dark squares, double-rule frame, coordinates outside, correct parity | Flat Slate & sand with coordinates inside, 5px radius, drop shadow, inverted parity |
| Marks | Hand-drawn strokes in red, blue and graphite, each tied to a sentence in the note | Straight translucent engine arrows (amber, blue, purple) and coloured squares. The explanation never refers to them. |
| Move quality | Anti-pattern: "move-quality icons" | ★ ✓ ?! ? ?? badges on the square, plus Best / Good / Inaccuracy / Blunder tables |
| Logo | A blue-ink "?" circled in red pen on a paper tile, with a Vollkorn wordmark | Wordmark: a cburnett white knight with "Ask" in white and "TheMove" in teal. Favicon: a teal "?" on a slate and sand checker. These are two marks, and neither matches the site. |
| Voice | "Ask the move why." A patient coach with one idea per step | Product slogans ("A little calculation. A clearer next move.", "Find your level. Then go further.") and engine printouts |

Several things the app does today are on `site/DESIGN.md`'s do-not-ship list: "a dark 'analysis room'", "the Chess.com look … move-quality icons", "an eyebrow on every section", and stacked identical sections. Someone who joins the beta from the site will land in what looks like a different product. The only shared elements are the name, the cburnett pieces and the "?" idea. The design archive linked from the app's nav adds a third, blue look that still carries the ChessLab name.

**What to decide.** Either the app adopts the notebook system or the site is redrawn toward the app. The likely middle path:

- Keep a dark mode only if the founder wants one.
- Otherwise ship a light "paper" app theme from the site tokens.
- Use Vollkorn for headings, Courier Prime for engine receipts and scores, and Kalam only for coach annotations on the board and short notes.
- Make blue the primary action and red the mistakes.
- Use one logo.

Whichever direction wins, one tokens file (primitive OKLCH ramps → semantic roles → component tokens for board, arrows and marks) should generate both `site/public/assets/app.css` variables and the app's `:root`.

---

## Part B. The real app

### B1. First-run experience

- The app opens on Play bots with Marlo (250) preselected, a full starting board, and a bot speech bubble. This works on desktop (`01-home-first-run-1440`): one clear button, "Play Marlo".
- **The disabled input on an empty board reads "Select a playable position to enter a move".** It is the first sentence under the board.
- **The Play button is disabled with no explanation when no opponent engine is installed** (`00-home-no-opponent-engine-1440`). Following the README with any Stockfish other than 19 gives a disabled button, an "Engines 0" tab and no message. The reason ("Stockfish 19 is not configured on this server") exists in the API but isn't shown.
- **Sign-in is light** ("Make this your workspace": username and password, no email, `02-sign-in-*`) and is reached from the rail. It is not forced before play. That is good.
- **Nothing explains the loop**: play a game, then review your mistake and try another line. The "At your side · What's your next move?" card gives generic advice ("Look for checks, captures and threats") on every move.

### B2. The core loop: play, review, understand one mistake, practise

- **Play** (`03-play-bot-*`) works, and Marlo talks ("I captured a piece. Check the whole exchange before replying.").
  - The bright white "∞" clock box under the board is the most prominent object on the screen after the board, and it carries no information in an untimed game.
  - "Hint 0 / Undo 0" counts uses, but reads like remaining credits.
- **Review** (`04-review-mistake-*`) is reached through the panel's Review tab or "Review this position". For my 4. Qg6?? it gives this:

  > "Qg6. Sample line: hxg6 → Nc3 → Nc6 → d3 → Qb8 → h3. Black hxg6 captures White's queen on g6. Material: White 30, Black 39 (White -9 points). Estimated loss: 946 centipawns for White."

  That is an engine printout, not an explanation. It never says that the h7 pawn attacks g6, or what the learner should have looked at.
- **When the best move was a mate**, the explanation says "Mate scores have no centipawn-loss estimate" and the move gets a **green "!" badge and a green "Mate sequence" pill**, even though the learner missed Qxf7# and hung the queen (`04b-review-missed-mate-badge-1440`). The colour code says "good" for the worst move of the game.
- **"Explain why"** (`05-review-explain-why-fallback-*`) is the AskTheMove differentiator, and there are two problems:
  - Without a server key the section is not rendered at all, so local users never learn it exists.
  - When the AI is unavailable, the fallback repeats the same engine paragraph word for word in a second box, directly under the first.
- **After the game ends** (`14-game-over-1440`), the review jumps to the last move, the bot's 6… Bxg2, not to the learner's worst move.
- **The game report** (`15-game-report-1440`) leads with "953 cp / 1118 cp average loss", an engine-swing graph and a Best / Good / Inaccuracy / Blunder table. For the 800-1600 audience in `CONTEXT.md`, centipawns are jargon. "Review complete" is styled as a button.
- **Practise** exists in several places: "Practice key moves", "Practice this position", "Try a variation", "Compare before move", "Explore opening", position notes and drawing tools. All are peers in the right panel, and none is presented as the next step. The single path "your biggest mistake → why → try it again" that the site promises is assembled from parts but not offered.

### B3. Visual hierarchy and density

- **Tool pages open with marketing.** Puzzles stacks an h1 ("Puzzles"), an eyebrow ("TACTICS · ON THIS MAC"), a two-line h2 ("A little calculation. A clearer next move."), a big "0" stat, mode cards, and a second two-line h2 inside the panel ("Find your level. Then go further."), all before the board. Learn, Openings, Endgames and My games repeat the pattern.
- **The light card is the loudest element in the play panel**: the generic advice card or the review card. The move list, the actual record, is quieter.
- **Duplicated controls.** There are two settings cogs (page header and board header). The page title says "Game review" while the nav still highlights "Play bots".
- **Small text.** The right panel relies on 10px text (engine receipt, stat labels, "Local simulation", the eval number).
- **The lesson board doesn't fit the viewport.** At 1440×900 (`07-lesson-1440`) the lesson board is about 680px tall, so the rook that the instruction asks you to move is below the fold. The play board sizes to the viewport; the lesson board doesn't.
- **Openings defaults to the alphabetically first line**, "Amar Opening (1. Nh3)", rather than something a learner would choose.
- **Switching pages keeps the scroll offset.** After scrolling in review, Learn and Openings opened with their headings cut off.

### B4. Mobile (390×844)

- **The main action is far down.** On first run the "Play Marlo" button is about 1,400 CSS px down (`01-home-first-run-fullpage-390`), after the board, the input, the panel tabs, the bot bubble, Bots/Engines, search and the bot grid.
- **There is no brand on mobile.** The header shows only the page title with account and settings icons.
- **The bottom tab bar has seven items.** "My games" wraps to two lines, and the labels are 11px.
- **Review splits the board and its explanation.** The explanation sits below the board, the drawing toolbar and the panel tabs (`04-review-mistake-board-390` and `04-review-mistake-390`). You cannot see the "??" square and the sentence about it at the same time.
- **The drawing tools show mouse-only instructions on touch**: "Right-drag for an arrow. Right-click for a square."
- In a lesson, the move entry and the lesson text are below the board and behind the tab bar (`07-lesson-*-390`).
- Settings (`09-settings-board-theme-390`) is a full-height sheet and works well.

### B5. Empty states

- **Puzzles with no catalogue** (`08-puzzles-empty-catalogue-*`):
  - The page shows "0 local puzzles · 0 themes", a starting position, "Your local puzzle rating 1500" and "A full local collection, ready when you are."
  - The only error is plain body text, "The local puzzle catalogue is not installed.", placed directly under a teal "Start rated puzzle" button, with no fix and no link to the six starter puzzles the README mentions.
  - The Lichess CC0 credit is still shown.
- **No opponent engine:** see B1. The Engines tab says "0" and gives no reason.
- **My games** (`10-my-games-*`) handles one game well. The game card shows a generic knight instead of the bot portrait, and the title "Marlo" repeats over "Marlo · 250".

### B6. Copy that still says ChessLab, or assumes the founder's Mac

- **".chesslab.json"** appears in the import dialog ("Study file (.chesslab.json)", "Choose a .pgn or .chesslab.json file") and in the export filename (`askthemove-xxxxxxxx.chesslab.json`). Exported PGN carries a `ChessLabOriginalPly` header. These are documented as intentional for compatibility, but users see them.
- **The rail has "Research" and "Design archive" links** to pages titled "ChessLab dossier" and "ChessLab concepts" ("♞ ChessLab DESIGN STUDIES").
- The server log says "ChessLab ready at …" (operator-facing).
- **"On this Mac / Your games stay here"** appears in the rail and footer even on a Linux server. Other instances: "TACTICS · ON THIS MAC", "saved on this Mac", "named lines · on this Mac", and `<title>` "AskTheMove · Your local chess club".
- **"Coach online"** means the engine is up, not the AI coach. "Local simulation" is unexplained.
- **"YOUR ORIGINAL PROGRESS IS PRESERVED"** in Learn is migration copy aimed at returning users.

### B7. Unfinished or inconsistent

- The board colours are inverted (A4).
- "Engines 0/1" is exposed as a peer tab of "Bots 43".
- "Explain why" is hidden or duplicates the engine text (B2).
- A missed mate gets a positive badge (B2).
- The fallback screens show "Looking at this position… The explanation will match your selected move." while analysis loads, with no progress indication; this was seen after switching theme.
- Settings shows "Pieces: Classic (cburnett)" as a fixed row, which looks like a disabled control.
- "Black to move" appears under the learner's name while they review their own White move.

---

## Prioritised recommendations

1. Fix square parity in `Board.jsx` (`%2===1`) and give the square focus ring 3:1 on both square colours. Add a test that a1 is dark.
2. Introduce a token layer shared with the site: primitives (OKLCH), semantic roles (surface, ink, muted, line, action, mistake, coach, engine, focus) and component tokens (board square, highlight, selection, focus, arrows by meaning). Replace the 382 hexes and 38 font sizes with about 7 type steps, a 4-point spacing scale, 3 radii and 2 easings. Define or remove `--text` and `--text-muted`.
3. Decide the app's identity against `site/DESIGN.md` (see A5), and replace the knight wordmark and the second favicon with one mark.
4. Rebuild the review around one mistake:
   - Land on the learner's worst move.
   - Say what was attacked or missed in plain words.
   - Draw the matching arrow.
   - Offer one next action, "Try it again".
   - Hide centipawns behind "details".
   - Never colour a missed mate as good.
   - Show "Explain why" disabled with a reason instead of hiding it, and never repeat the engine paragraph as the fallback.
5. Write real empty states for no opponent engine and no puzzle catalogue: what is missing, the one command or setting that fixes it, and a fallback (starter puzzles).
6. Mobile:
   - Put "Play" above the board on first run.
   - Keep the board and the explanation visible together (a sticky mini-board or a bottom sheet).
   - Cut the tab bar to 5 items.
   - Show touch-appropriate drawing hints.
7. Accessibility:
   - Add a polite live region announcing "Marlo played …c5" and check or mate.
   - Use roving tabindex with arrow keys on the board.
   - Mark the selected square with `aria-pressed`.
   - Put `aria-current="page"` on the nav and use tab semantics on the panel tabs.
   - Raise 9-10px text to at least 12px and 4.5:1.
8. Move Research and Design archive out of the product nav. Replace "On this Mac" with copy driven by the environment, and keep `.chesslab.json` out of visible labels.

---

## Screenshots

All are in `/mnt/project-files/askthemove/review/screens/`. Desktop is 1440×900, mobile is 390×844 (rendered at 2×).

| File | What it shows |
| --- | --- |
| `00-home-no-opponent-engine-1440.png` | First run before any opponent engine was available: "Play Marlo" disabled, "Engines 0", no explanation. |
| `01-home-first-run-1440.png` | First run, signed out, bots playable: board, bot picker, "Play Marlo" button. Shows the inverted board (a1 light). |
| `01-home-first-run-390.png` | The same on mobile: the board fills the screen and the Play button is out of sight. |
| `01-home-first-run-fullpage-390.png` | The whole mobile home page: "Play Marlo" is about 1,400px down. |
| `02-sign-in-1440.png` | "Make this your workspace" dialog (username and password, no email). |
| `02-sign-in-390.png` | The same dialog on mobile. |
| `03-play-bot-1440.png` | A game against Marlo after 4. Qg6 hxg6: coach advice card, Hint 0 / Undo 0, bot chat, move list, ∞ clocks. |
| `03-play-bot-390.png` | Mobile game view: board, clocks, move entry, game actions. |
| `03-play-bot-panel-390.png` | The mobile play panel: advice card, hint and undo, bot chat, move list. |
| `04-review-mistake-1440.png` | Review of 4. Qg6??: Blunder pill, "??" badge, engine-printout explanation, "Ask the coach" with Explain why. |
| `04b-review-missed-mate-badge-1440.png` | An earlier game where 4. Qg6 missed Qxf7#: the move gets a green "!" and a green "Mate sequence" pill. |
| `04-review-mistake-390.png` | Mobile review panel: the explanation is below the board, out of sight of the "??" square. |
| `04-review-mistake-board-390.png` | Mobile review board with the drawing toolbar and the mouse-only "Right-drag…" instruction. |
| `05-review-explain-why-fallback-1440.png` | After "Explain why" with the AI unreachable: the same engine paragraph repeated in a second box. |
| `05-review-explain-why-fallback-fullpage-1440.png` | The whole desktop review page, including candidate lines, notes and drawing tools. |
| `05-review-explain-why-fallback-390.png` | The fallback on mobile. |
| `05-review-explain-why-fallback-fullpage-390.png` | The whole mobile review page. |
| `06-learn-path-1440.png` | Learn: 0/12 lessons, "Your next step" card, course list. |
| `06-learn-path-390.png` | Learn on mobile: slogan and stats push the next lesson down. |
| `07-lesson-1440.png` | Lesson "Rooks travel in straight lines": the rook to move is below the fold at 900px tall. |
| `07-lesson-390.png` | The lesson on mobile: the board fits, and the move entry sits behind the tab bar. |
| `07-lesson-fullpage-390.png` | The whole mobile lesson page, with the idea text below the board. |
| `08-puzzles-empty-catalogue-1440.png` | Puzzles with no catalogue: "0 local puzzles", rating 1500, mode cards, a starting board. |
| `08-puzzles-empty-catalogue-message-1440.png` | The only error, plain text under the "Start rated puzzle" button. |
| `08-puzzles-empty-catalogue-390.png` | Mobile puzzles: three headline layers before any content. |
| `08-puzzles-empty-catalogue-message-390.png` | The mobile empty-state message. |
| `09-settings-board-theme-1440.png` | Settings modal (Board / Interface / Engine) with Walnut & ivory selected. |
| `09-settings-board-theme-390.png` | Settings sheet on mobile. |
| `10-my-games-1440.png` | My games: stats, collections sidebar, search (darker input), one game card. |
| `10-my-games-390.png` | My games on mobile. |
| `11-walnut-theme-board-1440.png` | Review screen with the Walnut & ivory board, showing the "Looking at this position…" loading state. |
| `11-walnut-theme-board-390.png` | Walnut board on mobile (still a1 light). |
| `12-keyboard-select-e2-1440.png` | Keyboard selection of e2: teal selection, legal-move dots. |
| `12-keyboard-focus-slate-square-1440.png` | The navy focus ring on a slate square (2.4:1, hard to see). |
| `12-keyboard-focus-sand-square-1440.png` | The navy focus ring on a sand square (6.1:1). |
| `13-site-landing-1440.png` | The landing site's notebook hero, for brand comparison. |
| `13-site-landing-lesson-1440.png` | The site's lesson walkthrough: hatched board, score sheet, Kalam coach note. |
| `13-site-landing-390.png` | The landing site on mobile. |
| `13-site-landing-lesson-390.png` | The site lesson section on mobile. |
| `14-game-over-1440.png` | After resigning: "Game finished · Resignation", Rematch, and the review jumped to the bot's last move. |
| `15-game-report-1440.png` | The full game report: average loss in centipawns, swing graph, classification table, key moves. |
