# Engine catalog for the puzzle board

These are chess engines that can run inside the learner's browser. All of them run on the device, cost $0, and need no server.

Checked 28 Oct 2026. Sizes come from the actual files: npm packages `stockfish`, `@lichess-org/stockfish-web` and `fairy-stockfish-nnue.wasm`, the Stockfish net server at tests.stockfishchess.org, and the Hugging Face and GitHub releases. 1 MB = 1,000,000 bytes.

## Status in the picker (30 Oct 2026)

Thirteen engines now download and run on the puzzle page (`site/public/assets/engine-catalog.js`, status `ready`). Each one was checked in Chromium with the site's own CSP: it downloads, starts, answers `uci` / `isready`, finds Ra8# in `6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1`, and grades it through **Check my move**. Screenshots: `askthemove/puzzle-board/engines-wave2/`. Sizes are exact byte counts of what the learner downloads; 1 MB = 1,000,000 bytes.

| id | Engine | Download | Checked | Notes |
|---|---|---|---|---|
| `sf19-lite` | Stockfish 19 Lite (default) | 1.9 MB | as before | Unchanged. |
| `sf19-full` | Stockfish 19 | 99.2 MB, 4 parts | SHA-256 per part and whole | Unchanged. |
| `sf18-lite` | Stockfish 18 Lite | 7.3 MB | as before | Unchanged. |
| `sf17-lite` | Stockfish 17.1 Lite | 7.3 MB | file sizes | npm `stockfish@17.1.0`, unchanged. |
| `sf19-asm` | Stockfish 19, plain JavaScript | 3.2 MB, one script | file size | npm `stockfish@19.0.1`, unchanged. No WebAssembly needed. |
| `sf11` | Stockfish 11 (classical, no net) | 3.7 MB | file sizes | npm `stockfish@11.0.0`. Reads its .wasm address after # unencoded, so the catalog marks it `hash: 'raw'`. |
| `sf17-full` | Stockfish 17.1 | 79.1 MB, 4 parts | SHA-256 per part and whole | npm `stockfish@17.1.0`. Its six npm parts are joined and re-split to our manifest; one line of its script is changed (`var enginePartsCount=6;` became `var enginePartsCount;`) so it takes the joined file from the page, with a note at the top of the script. A test restores the line and matches the published file's SHA-256. |
| `sf18-full` | Stockfish 18 | 113.0 MB, 5 parts | SHA-256 per part and whole | npm `stockfish@18.0.8`, unchanged. |
| `sf16` | Stockfish 16 | 0.6 MB engine + 40.1 MB net (2 parts) | SHA-256 of the net's parts and whole (it starts `5af11540bbfe`, its name) | npm `stockfish@16.0.0`. The net is read through `setoption name EvalFile value <blob URL>` and then `Use NNUE value true`; the engine must answer `Load eval file success: 1` or the start fails. |
| `dm-9m` | DeepMind searchless chess 9M | 35.9 MB model (2 parts) + 14.9 MB onnxruntime-web | SHA-256 per part and whole; matches Hugging Face's | `cstr/searchless-chess-onnx` 9M/model.onnx, CC BY 4.0, credited in the picker and the page footer. onnxruntime-web 1.31.1 (MIT) is vendored from npm, single-threaded WASM. No search: one batch of every legal move, highest win probability wins; the score is that win probability turned into centipawns. |
| `maia1-1100`, `maia1-1500`, `maia1-1900` | Maia-1 | 3.5 MB model each + 14.9 MB onnxruntime-web | SHA-256 of each model; matches Hugging Face's | `shermansiu/maia-NNNN` model.onnx (leela2onnx format), GPL-3.0, credited. Lc0 112-plane input and 1858-move policy written in `site/public/assets/lc0.js`; the policy list matches lczerolens's exactly. Plays the highest-policy legal move; the score comes from its win/draw/loss head. |

Still listed as "soon", and why:

- **Multi-thread builds** (Stockfish 19 / 19 Lite several cores, Stockfish 15 and 14.1): they need `Cross-Origin-Embedder-Policy`, which the site doesn't send. npm `stockfish@15.0.0` and `@14.1.0` only ship multi-thread builds.
- **Lichess `@lichess-org/stockfish-web` 0.5.0** (sf_19 small and big net): an ES-module factory, easy to wrap, but it is a pthreads build that starts its search thread in a Worker over shared memory. Without cross-origin isolation it never answers `uci` (tried in Chromium).
- **DeepMind 136M / 270M** (273 / 542 MB, fp16): far past the warning limits for a WASM run; they would want WebGPU.
- **Maia-1 1200, 1300, 1400, 1600, 1700, 1800**: the same code would run them; left out to keep the list short. Each is one more 3.5 MB file.
- **Maia-2, Maia-3**: no ONNX published; converting them needs PyTorch, skipped.
- **Lc0 BT3 / BT4, C1-4B, Allie 2.0, Fairy-Stockfish**: unchanged from the list below (too big, need search code, or need variants).
- **Stockfish 10**: works the same way as 11, but 11 is enough for history.

## The picture

```
download size (MB, log-ish)     0    2    10        50        100       315
Stockfish 19 Lite  ★ today      ▏1.8
Stockfish 19 (Lichess small)    ▏1.7  (0.5 engine + 1.2 net)
Fairy-Stockfish 14 (variants)   ▏1.7
Maia-1 (9 human levels)         ▏1.3 each + ~10 runtime
Stockfish 19 asm.js (fallback)  ▏▏3.2
Stockfish 17.1 Lite             ▏▏▏7.1
Stockfish 18 Lite               ▏▏▏7.3
Stockfish 16 (+ net)            ▏▏▏▏▏▏▏▏▏▏40.8
Stockfish 14.1 / 15 (+ net)     ▏▏▏▏▏▏▏▏▏▏▏47.7
Stockfish 17.1 full             ▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏79   (6 parts × 13 MB)
Stockfish 19 full  ★ biggest SF ▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏99
Stockfish 19 (Lichess big)      ▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏99   (0.6 engine + 98.5 net)
Stockfish 18 full               ▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏113
Maia-3 3M…79M (human-like)      ▏▏▏▏12.7 … 316  (AGPL)
```

Strongest is not the same as biggest. Stockfish 19 full is the strongest engine here. Stockfish 18 full is bigger but older and weaker. All the Stockfish builds are far stronger than any human, the Lite ones included.

## Full list

| # | Engine | What it is | Size to download | License | Can we host it? | Notes |
|---|---|---|---|---|---|---|
| 1 | **Stockfish 19 Lite, single** (today) | Newest Stockfish with a small "eye" (net) | **1.8 MB** | GPL-3.0 | Yes, already hosted | Fast. Works in any browser with WebAssembly (every current browser). Default. |
| 2 | Stockfish 19 Lite, multi-thread | Same, uses several CPU cores | 1.7 MB | GPL-3.0 | Yes | Needs special page headers (see below). |
| 3 | **Stockfish 19 full, single** | Newest Stockfish with the big net: the strongest engine here | **99.2 MB** | GPL-3.0 | Yes, split into parts | The "Deep" option. Over Cloudflare's 25 MB file limit, so we split it. |
| 4 | Stockfish 19 full, multi-thread | Same, several cores, so faster and deeper | 99.1 MB | GPL-3.0 | Yes, split | Needs special headers. |
| 5 | Stockfish 19 asm.js | Plain JavaScript, no WebAssembly | 3.2 MB | GPL-3.0 | Yes | For very old browsers without WebAssembly. Slow and weak. Shipped 30 Oct as a picker choice (`sf19-asm`). |
| 6 | Stockfish 19 (Lichess build, big net) | Lichess's own build; engine and net are separate files | 0.6 + 98.5 = 99.1 MB | AGPL-3.0 (engine), GPL-3.0 (net) | Yes, split | Same strength as #3. Harder to wire up. |
| 7 | Stockfish 19 (Lichess build, small net) | Lichess's tiny build | 0.5 + 1.2 = 1.7 MB | AGPL-3.0 / GPL-3.0 | Yes | Same idea as #1. |
| 8 | Stockfish 18 full | Previous version | 113 MB | GPL-3.0 | Yes, split | Bigger but weaker than #3. For comparison only. |
| 9 | Stockfish 18 Lite | Previous version, small net | 7.3 MB | GPL-3.0 | Yes | |
| 10 | Stockfish 17.1 full | Older | 79 MB (ships as 6 × 13 MB parts) | GPL-3.0 | Yes | |
| 11 | Stockfish 17.1 Lite | Older | 7.1 MB | GPL-3.0 | Yes | |
| 12 | Stockfish 16 | Older; engine + separate net | 0.7 + 40.1 MB | GPL-3.0 | Yes, split | |
| 13 | Stockfish 15 / 14.1 | Older; engine + net | 0.7 + 47.0 MB | GPL-3.0 | Yes, split | |
| 14 | Stockfish 11 / 10 | Old "classical" engine with no neural net | 0.4–1.4 MB | GPL-3.0 | Yes | Still superhuman. History only. |
| 15 | **Fairy-Stockfish 14** | Stockfish for variants (crazyhouse, three-check, Chess960 and more) | 1.7 MB | GPL-3.0 | Yes | Only useful if we add variants. |
| 16 | **Maia-1** (1100, 1200 … 1900) | Plays like a human of that rating, not the best move. Great for "what would a 1200 play here?" | 1.3 MB per level (9 levels) + roughly 10 MB runtime (to measure) | GPL-3.0 | Yes | Needs converting to ONNX once and running with onnxruntime-web (MIT). One step, no search. |
| 17 | Maia-2 | One human-like model for all ratings | Not verified (weights on Google Drive) | MIT | Probably | Its authors now recommend Maia-3. |
| 18 | **Maia-3** 3M / 5M / 23M / 23M-ponder / 79M | Newest human-like model (ICLR 2026, Chessformer) | 12.7 / 21 / 92 / 109 / 316 MB (PyTorch `.pt`) | AGPL-3.0 (the model card points to the repo's license) | Yes, with a source link | Hugging Face sends open CORS, so the browser can fetch the weights straight from the authors (checked: 200). Needs a one-time export to ONNX, then onnxruntime-web runs it. |
| 19 | Lc0 (Leela) big nets | Neural-net engine, a different style from Stockfish | Roughly 10–400 MB per net (not verified) | GPL-3.0 | Yes | Runs in a browser only through ONNX + WebGPU: experimental, slow on phones. Later, maybe. |

### Not available, whatever we do

| Engine | Why not |
|---|---|
| Torch (Chess.com's engine) | Proprietary. Chess.com doesn't publish it for download. |
| Komodo Dragon | Commercial license, and there is no browser build we're allowed to ship. |
| Chess.com "Cloud" engines | They run on Chess.com's servers, not in our page. |

## More neural models (found 28 Oct, sizes from Hugging Face)

Each of these runs with **onnxruntime-web** (MIT, WebGPU or WASM), which we load once and every model shares.

| # | Model | What it does | Size | License | Browser-ready? |
|---|---|---|---|---|---|
| 20 | **DeepMind "searchless chess" 9M / 136M / 270M** | A transformer that plays grandmaster-level chess without searching, just by "looking" at the board once | 36 / 273 / 542 MB (ONNX, ready) | CC BY 4.0 | **Yes**, already ONNX |
| 21 | **Maia-2 (blitz)** | Human-like moves for any rating, one model | 93 MB (safetensors) | MIT | Needs ONNX export |
| 22 | **Lc0 BT3** (Leela) | Strongest neural engine family, Leela's style | 410 MB (ONNX, ready) | GPL-3.0 | Yes with WebGPU, plus search code in JS. Desktop or iPad Pro only. |
| 23 | Lc0 BT4 | Newer Leela net | 336 MB (`.pb.gz`) / 824 MB | GPL-3.0 | Needs conversion. Desktop only. |
| 24 | **C1-4B** | A small language model that **explains a puzzle step by step in words**, then gives the best move | 8 GB as published; about 2.5 GB if shrunk to 4-bit | Apache-2.0 | Mac or PC with WebGPU only; too big for phones. Could become a free on-device coach. |
| 25 | Allie 2.0 | Human-like bot that also thinks like a human about time | 11.2 GB | MIT | No, too big for a browser today. |

Skipped: other Hugging Face "chess transformer" uploads that have no license or no results to back them.

## What the licenses mean for us

- **GPL-3.0** (Stockfish, Fairy-Stockfish, Maia-1, Lc0): we can host and hand out the files for free. We must keep the license file next to them (we already ship `COPYING.txt`) and link to the source code. This is how we already ship Lite today.
- **AGPL-3.0** (Lichess builds, Maia-3 code): same as GPL, and the source must be offered to people using it over the web. Our site code is public on GitHub, so a "source" link covers it.
- **MIT** (Maia-2, onnxruntime-web): keep the copyright notice, nothing else.
- **CC BY 4.0** (DeepMind searchless chess weights): free to use and host; credit the authors on the page.
- **Apache-2.0** (C1-4B): free to use and host; keep the notice.

## How the big files reach the learner

- **Cloudflare Pages has a 25 MB limit per file.** Files above that (#3, #4, #6, #8, #10, #12, #13) are cut into parts under 25 MB and joined back together in the browser before the engine starts. The Stockfish 17.1 npm package already ships its engine this way, but our site has no loader that joins parts yet, so the engine picker must add one (fixed part order, a SHA-256 check per part, one cache entry per part). Hosting stays $0.
- **Backup source:** unpkg.com serves the npm files with open CORS (checked: 200 for the 99 MB file). jsDelivr refuses files this big (403). GitHub release downloads don't allow other websites to fetch them. So we self-host the split files, and unpkg is only the backup.
- **Saved on the device:** files go into the browser's Cache Storage, as Lite does today. On iPhone and iPad, Safari may delete saved files after 7 days without a visit unless the page is added to the Home Screen. The picker should tell the learner that.
- **Multi-thread engines (#2, #4)** need the page to send two extra headers (`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`). Our calls to Chess.com, Lichess and GitHub already use CORS, so they should keep working with `credentialless`, but this needs testing before we turn it on. Until then, single-thread only.
- **Memory:** a 99 MB engine plus its working memory needs roughly 200–300 MB (estimate, to measure). That's fine on iPads and recent phones; very old Android phones may close the tab. If a heavy engine fails to start, the picker switches the saved choice back to Lite, tells the learner why, and the next load uses Lite.

## Decision (Prax, 28 Oct 2026)

- **Desktop site: offer every entry**, including Allie 2.0, so the learner chooses.
- Every heavy model gets a **big warning before it downloads**: its size, how long it might take, that it needs WebGPU and lots of memory, that the tab may freeze or crash, and on which devices it won't work. Rows 20–25 (DeepMind searchless, Maia-2, Lc0 BT3/BT4, C1-4B, Allie 2.0) and anything over 100 MB need a second "Yes, download it" confirmation. The download can be cancelled at any time.
- Phones and tablets get the light list by default.
- Build after Prax's weekly reset (around 31 Oct), as part of the browser-first app.
