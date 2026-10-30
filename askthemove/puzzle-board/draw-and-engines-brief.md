# Design brief: drawing layer + bigger engines for the puzzle board

Page: https://askthemove.online/puzzleanalyzr/ (source `site/pages/puzzleanalyzr.html`, built into `site/public/puzzleanalyzr/index.html` by `npm run build`).

This brief asks for a **design**, not code yet. The owner, Prax, wants the design thought through deeply before anything is built.

## Who it's for

Prax is a chess beginner who can't visualise moves in their head. The page puts a puzzle (Chess.com or Lichess daily, or any FEN/PGN) on our own board, where pieces can be moved freely with full rules. There are no hints until asked. The page is used on iPad (finger and Apple Pencil), Android phones, and Mac (trackpad and mouse). Later it may also be used on touchscreen monitors.

The budget is $0. The page is static on Cloudflare Pages, with no server and no accounts.

**Product direction (Prax, 28 Oct 2026):** all of AskTheMove is going browser-first. It will be one static client-side app on Cloudflare Pages with no app server. Stockfish and all storage live on the learner's device. The coach runs on the learner's own API key or through a tiny Worker. Design both features so they become parts of that app later and are not tied to this one page. The big build starts after Prax's weekly usage reset, around 31 Oct.

## What exists today

| Part | File | What it does |
| --- | --- | --- |
| Board | `site/public/assets/desk.js` | Pieces are `<img>` tiles positioned over a CSS board. Pointer Events handle drag and tap-tap moves (`pointerdown/move/up/cancel`, `setPointerCapture`). A touch drag lifts the piece 45% of a square above the finger. Undo, redo, start over and flip are already there. |
| Ink overlay | `desk.js` `els.ink` (an SVG over the board) | Draws hand-made marks: the red-pen pin line when a move is illegal, and the blue arrow for "Show Stockfish's move". Strokes animate in (`drawStrokes`). |
| Hand-drawn geometry | `site/public/assets/ink.js` | Pure, seeded functions: `line`, `linePoints` (bow, tremor, overshoot), `polyline`, `loop` (a circle that overshoots), `arrow`, `arrowHead`, `curvedArrow`, `cross`, `tick`, `underline`, `ring`, `bracket`. They use a seeded PRNG and never `Math.random`, so a mark looks the same every time. |
| Rules | `site/public/assets/rules.js` | Explains why a move isn't allowed (pins, check and so on). |
| Engine | `site/public/assets/engine.js` + `assets/engine/stockfish-19-lite-single.{js,wasm}` (1.8 MB) | Downloads in the background with a progress bar and is cached in Cache Storage for 30 days. It runs in a Worker from a `blob:` URL. CSP on the page allows `'wasm-unsafe-eval'` and `blob:`. It stays silent until "Check my move"; "Show Stockfish's move" is the only reveal. |
| Look | `site/public/assets/app.css`, `puzzle.css` | Graph-paper desk with a taped photo-print board in Chess.com green. Fonts: Vollkorn (book), Kalam (handwriting), Courier Prime. Tokens are `--ink`, `--ink-2`, `--red` (oklch) and so on. Move list and notes are in handwriting. |

## Ask 1: a drawing layer over the board

Prax's words: like Excalidraw, "tools for our world". We can't draw on Chess.com's board, but we own this one.

Requirements Prax gave:
1. Draw over the board.
2. A toggle button to hide and show the drawings.
3. It must match our look. Lines should never be ruler-straight: even a "straight" line gets a slight hand jiggle, like `ink.js`.
4. It must work well on all of these:
   - Mac trackpad
   - Mac mouse
   - iPad finger
   - iPad Apple Pencil (including palm on screen)
   - Android fingers
   - touchscreen monitors (now or in the future)
   - plain mouse on Windows or Linux

### Questions the design must answer

- **Drawing vs moving pieces.** The same pointer both drags pieces and draws. How do the two coexist on each device?
  - Options include a draw mode toggle, right-drag to draw on desktop (Lichess style), Pencil draws while fingers move pieces, long-press, and two-finger gestures.
  - Pick one model per input type and justify it. Say what happens with palm contact when using the Pencil.
- **Area.** Should drawing stay on the 8×8 board only, or include the margin and the paper around it? Should strokes clip at the board edge? On a 360 px phone the board is about 340 px wide, so say what that means for stroke width and hit size.
- **Tools.** What is the smallest useful set for a beginner thinking through a puzzle?
  - Candidates: freehand pen, square-snapped arrow, square highlight or circle, eraser, a few colours, undo and clear.
  - Should arrows snap to square centres and become `ink.js` arrows when you lift the pen? Should freehand stay freehand?
  - Pressure from Pencil (`pointerEvent.pressure`, tilt): should it change width? What about devices with no pressure, which report 0.5?
- **Stroke rendering.** Should we use an existing library (for example `perfect-freehand` or `rough.js`) or extend `ink.js`?
  - How do we add jiggle without making live drawing feel laggy? Use `getCoalescedEvents()` and `getPredictedEvents()` where available.
  - Should a stroke be smoothed or "beautified" when the pen lifts?
  - SVG or canvas?
- **Lifetime.** Do drawings belong to a position (cleared when a piece moves? kept per move in the move list?) or to the puzzle? Do they survive reload (localStorage per puzzle)? What happens on undo, redo, flip and start over?
- **Hide/show toggle.** Where does it sit, what is its label, and what is its keyboard shortcut? Does hiding also leave draw mode?
- **Don't break what works.** Keep piece drag, tap-tap, the promotion picker, the red-pen and blue-arrow marks, scrolling the page on phones (`touch-action`), pinch-zoom, and iOS text-selection/callout and Scribble.
- **Accessibility.** Cover keyboard use (draw an arrow by typing squares?), reduced motion, and screen reader labels for the toggle.

## Ask 2: let the learner pick a heavier engine

Today only Stockfish 19 Lite runs (1.8 MB). Prax wants to choose a bigger one ("a 19 MB model and other heavy models"). Our reading is Stockfish 19 full (about 95 MB) plus any other strong open engines that run in a browser. Please check the actual sizes and options:

- Stockfish 19 single-thread full. The `stockfish` npm package (nmrugg/stockfish.js) ships lite, full, single and multi-thread builds; check the real file sizes.
- Multi-threaded builds need `SharedArrayBuffer`, which means cross-origin isolation (COOP and COEP headers).
  - Would that break our fetches to `api.chess.com`, `lichess.org` and `raw.githubusercontent.com`, or our images?
  - Can it be limited to the engine worker?
- Anything else worth offering. For example, Maia (human-like play by rating, via onnxruntime-web or lc0) is interesting for a beginner. Say what is real and usable today.
- **Device limits.** Cover iPad Safari memory for a 95 MB wasm plus hash table, Cache Storage quota and eviction on iOS (Safari may delete a site's saved files after 7 days with no visit or interaction; sites added to the Home Screen are exempt), Android low-end phones, and mobile data.
- **UX.** The picker should show size and strength in plain words, and the download should be opt-in with a progress bar and cancel. Explain what to do if storage is refused, and fall back to Lite.

## What we want back

A design doc a principal engineer would sign off. It should be decisive (pick, don't list) and contain:

1. The interaction model per input device, in a table.
2. ASCII wireframes for the board with the draw toolbar and the hide/show toggle: phone portrait, iPad landscape, desktop.
3. The stroke pipeline: events, smoothing, jiggle, pressure, rendering and storage, with the data shapes.
4. The engine picker: the options, verified sizes, headers needed, and the risks.
5. A file-by-file implementation plan in small PR-sized steps, with tests for each. The site uses `node --test`; the board can be checked with Playwright.
6. Risks and open questions for Prax, worded so a beginner can answer them.
