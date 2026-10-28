# Engine catalog for the puzzle board

These are chess engines that can run inside the learner's browser. All of them run on the device, cost $0, and need no server.

Checked 28 Oct 2026. Sizes come from the actual files: npm packages `stockfish`, `@lichess-org/stockfish-web` and `fairy-stockfish-nnue.wasm`, the Stockfish net server at tests.stockfishchess.org, and the Hugging Face and GitHub releases. 1 MB = 1,000,000 bytes.

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
Maia-3 79M (human-like)         ▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏316  (license unclear)
```

Strongest is not the same as biggest. Stockfish 19 full is the strongest engine here. Stockfish 18 full is bigger but older and weaker. All the Stockfish builds are far stronger than any human, the Lite ones included.

## Full list

| # | Engine | What it is | Size to download | License | Can we host it? | Notes |
|---|---|---|---|---|---|---|
| 1 | **Stockfish 19 Lite, single** (today) | Newest Stockfish with a small "eye" (net) | **1.8 MB** | GPL-3.0 | Yes, already hosted | Fast, works everywhere. Default. |
| 2 | Stockfish 19 Lite, multi-thread | Same, uses several CPU cores | 1.7 MB | GPL-3.0 | Yes | Needs special page headers (see below). |
| 3 | **Stockfish 19 full, single** | Newest Stockfish with the big net: the strongest engine here | **99.2 MB** | GPL-3.0 | Yes, split into parts | The "Deep" option. Over Cloudflare's 25 MB file limit, so we split it. |
| 4 | Stockfish 19 full, multi-thread | Same, several cores, so faster and deeper | 99.1 MB | GPL-3.0 | Yes, split | Needs special headers. |
| 5 | Stockfish 19 asm.js | Plain JavaScript, no WebAssembly | 3.2 MB | GPL-3.0 | Yes | Only for very old browsers. Slow and weak. |
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
| 18 | Maia-3 5M / 23M / 79M | Newest human-like model (ICML 2026) | 21 / 92 / 316 MB (PyTorch files) | Code AGPL-3.0; **weights have no license stated** | **Not until the authors confirm** | Would need converting to ONNX. Best human-like option if the license clears. |
| 19 | Lc0 (Leela) big nets | Neural-net engine, a different style from Stockfish | Roughly 10–400 MB per net (not verified) | GPL-3.0 | Yes | Runs in a browser only through ONNX + WebGPU: experimental, slow on phones. Later, maybe. |

### Not available, whatever we do

| Engine | Why not |
|---|---|
| Torch (Chess.com's engine) | Proprietary. Chess.com doesn't publish it for download. |
| Komodo Dragon | Commercial license, and there is no browser build we're allowed to ship. |
| Chess.com "Cloud" engines | They run on Chess.com's servers, not in our page. |

## What the licenses mean for us

- **GPL-3.0** (Stockfish, Fairy-Stockfish, Maia-1, Lc0): we can host and hand out the files for free. We must keep the license file next to them (we already ship `COPYING.txt`) and link to the source code. This is how we already ship Lite today.
- **AGPL-3.0** (Lichess builds, Maia-3 code): same as GPL, and the source must be offered to people using it over the web. Our site code is public on GitHub, so a "source" link covers it.
- **MIT** (Maia-2, onnxruntime-web): keep the copyright notice, nothing else.
- **No license** (Maia-3 weights): we may not copy them. We email the authors and ask for a license first.

## How the big files reach the learner

- **Cloudflare Pages has a 25 MB limit per file.** Files above that (#3, #4, #6, #8, #10, #12, #13) are cut into parts under 25 MB and joined back together in the browser before the engine starts. Stockfish 17.1 already ships this way, so the method is proven. Hosting stays $0.
- **Backup source:** unpkg.com serves the npm files with open CORS (checked: 200 for the 99 MB file). jsDelivr refuses files this big (403). GitHub release downloads don't allow other websites to fetch them. So we self-host the split files, and unpkg is only the backup.
- **Saved on the device:** files go into the browser's Cache Storage, as Lite does today. On iPhone and iPad, Safari may delete saved files after 7 days without a visit unless the page is added to the Home Screen. The picker should tell the learner that.
- **Multi-thread engines (#2, #4)** need the page to send two extra headers (`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`). Our calls to Chess.com, Lichess and GitHub already use CORS, so they should keep working with `credentialless`, but this needs testing before we turn it on. Until then, single-thread only.
- **Memory:** a 99 MB engine plus its working memory needs roughly 200–300 MB (estimate, to measure). That's fine on iPads and recent phones; very old Android phones may close the tab. Fall back to Lite if the engine fails to start.
