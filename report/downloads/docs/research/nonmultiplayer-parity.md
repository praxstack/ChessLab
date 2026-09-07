# Chess.com non-multiplayer mapping — 8 September 2026

Audience: Prax, building the requested web platform. This is an evidence ledger for implementation, not a change to the user's objective.

The new ChatGPT conversation describes static atlases and prototypes. Its author explicitly could not navigate the live reference; its 208-row status totals do not prove engine behavior or visual parity. The complete retrieved conversation is archived in sources/chesslab-chatgpt-2026-09-08.json. The referenced master ZIP was initially missing. The user subsequently supplied it in this run; its SHA-256 matches both receipts and its575-file ZIP passes a freshCRC check. Forty chess-specific sources are archived as inert documents in sources/supplied-master. The complete original is retained in ignored data/source-archives; references/supplied-master-archive.json records its inventory.

This run accessed the real public Play Bots screen and observed 166 named bots in twelve expanded groups. Names, ratings, greetings and original portrait URLs were read from the rendered selection state. No locked game was unlocked and no subscription transaction was performed. The user's sign-in handoff is pending for authenticated settings and coach inspection.

## Engine scope ledger

| Scope | Source evidence | Implementation and confidence |
| --- | --- | --- |
| Named personalities | Official bot guide says Komodo; rendered roster supplies public identities and ratings. | Local selectable engines and profiles are functional. Per-bot proprietary parameters are not verified. |
| Game Review | Supplied recording, frame 0626: Stockfish / Torch Human. | Independent Stockfish review runs; Torch Human is unconnected. |
| Analysis | Frame 0633: Stockfish 18, 18 Lite, Torch 4, 4 Lite, Off. | Full Stockfish 18 and actual Lite run on the server; Off stops new analysis. Torch variants are unconnected. |
| Cloud settings | Frame 0644: Stockfish 16 / Komodo Dragon. | Native Stockfish 16 is installed. Cloud/event scope has not been independently reproduced. |

The [official bot guide](https://support.chess.com/en/articles/8614091-how-can-i-play-against-the-chess-com-bots), accessed 7 September 2026, describes unrated play, adaptive bots, six assistance controls and crowns. Its stated ranges omit newer groups visible in the live roster; the live observation takes precedence for inventory.

The [engine FAQ](https://support.chess.com/en/articles/9462780-how-do-the-chess-engines-on-chess-com-work), dated 3 August 2026, describes Stockfish 18 server review and calls Lite an HCE engine. The September recording exposes Torch Human, and the actual [Stockfish.js v18.0.0 release](https://github.com/nmrugg/stockfish.js/releases/tag/v18.0.0) reports an embedded NNUE during its UCI run. These sources disagree; the report preserves their scope and date rather than merging the claims.

The Lite JS and WASM match the official release digests. Its UCI identity is Stockfish 18 Lite WASM Multithreaded. Full-history moves, five candidate lines and two threads were exercised locally. This is not Torch, Maia or a renamed full Stockfish binary.

## Product and delivery evidence

The build retains the original twelve chess-piece PNGs and adds original navigation icons and all 166 observed portrait files. It replaces the previous blue interface chrome with the observed dark neutral/green controls; Blue remains a board preference. Review and Analysis have separate time settings. Board coordinates, notation, legal moves, highlights, animation, coach avatar and classification controls affect the rendered interface. Search controls invoke the selected installed engine with explicit time, lines and threads.

The current application retains legal bot games, server clocks, saved games, account ownership, hints, takebacks, crowns, PGN import/export and nested studies. Its introductory lessons and puzzles are original limited content, not the complete Chess.com curriculum. Full-game grading, all authenticated settings and proprietary bot equivalence still require work. A final public Options inspection also showed Standard and Chess960; this build currently implements Standard only. This working build is not declared a complete one-to-one clone.

Hosting uses an owner-private Sites frontend and an HTTPS tunnel to a separately protected native service on this Mac. The hosted database is separate from the existing local account database. Native models are not included in web assets. The app's continued remote availability currently requires this Mac and tunnel to remain running; a persistent engine host can retain the same HTTP contract.

## Security and verification

The final application test run passed 46 tests, zero failures/skips, in 20.35 seconds. It exercised all ten installed configurations, every roster profile’s setup, beginner slider values, advanced analysis and cancellation. The production Sites build passed. Earlier 41-test confirmation and prior failed host-load runs remain dated evidence in docs/application-verification.md.

Codex Security inspected session, ownership, CSRF, native input, proxy and secret boundaries and reproduced the fixes. Its sealed report indexes zero findings but records partial coverage because the checkout changed during the scan and earlier pending checkpoints remained in its canonical coverage. It is not certification of the deployed site. A committed hosting regression test checks malformed config, bad keys, cross-origin writes and oversized streaming requests. Live origin checks returned 403 without a key and 200 with the correct key.

## Research stopping rule

The public inventory, primary engine mapping and native deployment route have sufficient evidence for this build. Repeating generic web searches would not establish hidden per-bot parameters. Follow-up is directed at the user's authenticated UI and the exact missing behavior; it does not replace implementation with further speculative research.

## Supplied master: what it adds

The chess-specific research atlas contains180 capability mappings,209 screen/state records,215requirements and38sources. Its separate product atlas has208traceability claims. These counts describe planning/prototype coverage, not working native integrations. The historical Working Site’s twelve heuristic bots share oneJavaScript move selector and browser-local storage; the archive adds no proprietary bot parameters or extra native engine binaries.

Useful candidate work from this material includes whole-game review and critical moments; progressive hints; FEN/setup-position practice and continuation against a bot from a branch; annotated study export; opening-explorer statistics; and richer puzzle modes/history. These remain proposals requiring exact reference mapping and implementation. The Wondering course/podcast/canvas BRD remains separate even where its title saysChessLab.
