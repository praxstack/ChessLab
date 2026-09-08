# Application verification, 7 September 2026

The first sections record the earlier baseline. The bot-platform expansion receipt at the end records the current additions.

This is evidence for the first bot/coach stage, not a claim of complete Chess.com parity or deployment. The controlling change is `build-coach-web-platform`. The earlier research archive commit is `993a24e`.

## Automated results

- `npm test`: 20 tests passed, zero failures, in 7.96 seconds. Eleven engine checks use native Stockfish 19 or deliberate failure executables; four server integration checks cover accounts, ownership, revisions, persistence, study validation, save failures and learning progress; five frontend state checks cover legal notation, promotion, nested history, return anchors and study limits.
- `just test`: setup helper self-test and the then-current 19 application tests passed. One additional castling/en-passant test was subsequently added and the complete 20-test application suite passed. Same-host cross-scheme origin rejection was added to the existing account test.
- `npm run build`: passed. Built JavaScript is 275.90 KB, or 86.59 KB gzip. CSS is 34.67 KB, or 8.69 KB gzip. No engine executable or weights are included in these browser assets.
- OpenSpec strict validation: both changes passed. Structural validation is separate from runtime evidence.
- `just check`: fails on the pre-existing shared `gstack-cso` entrypoint hash drift. The manifest was not changed to conceal it. Git whitespace checks passed independently.

The deliberate read-only database test prints a save error and then verifies that the earlier study survives. This is an expected failure-path test, not a hidden passing write.

## Observed browser behavior

The Codex in-app browser exercised the actual server at `http://127.0.0.1:8770`, first in development and then with built production assets. The local test account and its data are ignored by Git.

- Created an account; started as White, entered e4 and received a real legal bot reply.
- Opened individual move review with actual Stockfish identity, estimates, sample lines and capture/material evidence.
- Created d4 as an alternative to the actual e4 game, nested Black's d5, saved a branch question, reloaded, and returned to the original ply-zero anchor. The actual e4 line remained intact.
- Rejected an invalid PGN while preserving the current game; imported a valid six-ply PGN and selected its moves for review. PGN export results and imported player names are also covered by server tests.
- Tried a wrong lesson answer, then the correct answer. Tried a legal wrong puzzle move, then captured the rook using board clicks. Correct progress survived a full server restart.
- Opened the promotion chooser and promoted to a queen; the puzzle completed and progress increased.
- Changed coordinates, analysis time and candidate count; verified persisted coordinates after reload and the new 300 ms/two-line engine review.
- Started as Black, observed the coach's first White move, played e5, received its next reply, and resigned into review.
- Used saved-game navigation at 320 px width. Checked 390 px and 320 px layouts with no horizontal document overflow, and visually inspected the 1440 px desktop board/review layout.
- Played the move-history sequence through to its end; compared before a selected move and inspected candidate arrows. Corrected the evaluation display so the board, rail and score use the same shown position.

## Bugs corrected during integration

PGN headers/results were previously overwritten by an incorrect library call. The queen mate puzzle originally rejected other valid mating moves. Origin comparison originally omitted the scheme. Study saves originally allowed two-tab overwrites; separate draft revisions now protect them, including when a bot response contains a newer remote study. Late lesson/puzzle responses are ignored after navigation. Resignation saves pending study edits, unsaved edits trigger a browser unload warning, and additions beyond study size limits preserve the current draft.

The two frontend response-race fixes were reviewed and built, with server conflict/ownership tests underneath them. Artificially delayed browser-response races were not replayed through a network interceptor in this run.

## Checks not claimed

`scripts/check_app_browser.cjs` is a runnable isolated browser smoke behind `just e2e`. Its syntax passed, but the script itself was not executed: browser interaction in this run used the available CUA tool. The observed browser checks above are separate evidence. Drag-and-drop, sound playback, comprehensive accessibility, other browsers and real phone hardware have not received full manual validation. Click and typed move entry were exercised.

The rewritten HTML dossier passed generation and integrity checks: 10 chapters, 55 full document pages, 1,521 local links and complete source/output hashes. Its portable ZIP was rebuilt. The design archive also passed its 27-page/651-link/17-image-receipt check. The browser URL policy blocked opening the new local file report page, so no fresh visual report check is claimed; no alternate route was used. Older browser receipts remain historical and do not attest to this application.

## Delivery boundary

The private repository at [praxstack/ChessLab](https://github.com/praxstack/ChessLab) was created and its `isPrivate: true` setting was read back. Application commit `b169e9e6af887dfe6b286a7607cebaa9900b93d0` was pushed to `main`; `git ls-remote` returned that same hash and GitHub reported the private default branch as `main`. This delivery-note update follows that verified application commit. Public hosting, actual human multiplayer, billing, unrestricted conversational coaching and a full curriculum remain unfinished. The local production server is the demonstrated runtime.

## Piece correction follow-up

The browser's rendered Chess.com analysis-board backgrounds supplied the exact twelve source URLs. Download checks confirmed twelve 150 × 150 PNG files, totalling 93,344 bytes, with source hashes saved in `references/chesscom-piece-assets.json`. The custom SVG drawing paths and their color/shadow styles were removed. The shared piece renderer now uses those local files everywhere, including promotion choices. The bot difficulty label is explicit.

The production build passed after this change. The running app showed all 32 occupied-board images loading at their original 150 px width, covering all twelve unique color/type assets, and no desktop horizontal overflow. The existing automated browser smoke now checks those images and uses the current difficulty label instead of an obsolete selector. That standalone browser script still has not been executed; the image check was observed through CUA.

## Bot-platform expansion — current build

The additive change is `expand-bot-platform`, starting from committed baseline `e2f5a2d`. Six named engine/version choices and three additional model variants are installed: Stockfish 19/18/16, Lc0, Maia3 79M/23M/5M and Maia2 rapid/blitz. The [installation receipt](../references/engine-installation.json) records the exact upstream sources, versions, sizes, hashes and full-history legal-move checks. Runtime files occupy approximately 1.9 GB in ignored server storage. Torch and Komodo Dragon were not installed; the [availability record](../references/engine-availability.md) explains the evidence and failed endpoint.

All nine configurations also passed [authenticated game API verification](../references/engine-games-verification.json) in a temporary SQLite database: create a Black game, invoke the selected engine's White move, validate it and reload the saved history. The recorded elapsed time includes game creation and cold availability checks; some earlier checks took around 30 seconds. This led to sequential readiness checks and a five-minute successful availability cache. The installed-engine tests now fail for an installed engine that cannot start, instead of skipping it. The standalone integration check is `node scripts/check_engine_games.mjs`.

The new interface has 17 roster profiles with observed public portraits/reference ratings; nine installed configurations; target strength, color, time and assistance selection; active clocks; hints and takebacks; adaptive material-based challenge; scripted bot context; and saved crowns. The existing twelve standard piece images remain in use. These are locally implemented profiles, not vendor-identical personalities or calibrated ratings.

The root's in-app browser created a 5+5 Maia3 game with Martin's profile, played e4, observed Maia's legal c5 reply, displayed evaluation and feedback, requested a legal Nf3 hint, took back the complete turn while retaining hint/undo counts, and created a separate rematch. The timed game survived reload. The UI agent separately executed the standalone browser smoke successfully with Stockfish 19, review, reload, lessons and puzzles before the final assistance corrections. Neither evidence is claimed to exercise every engine and every browser combination.

Review caught and corrected hidden rematch controls after results, raw-engine games inheriting a bot portrait, feedback-only/threats-only responses being discarded, stale help responses, old-account crown refreshes, legacy rematch settings and clocks freezing while an engine was thinking. Threat arrows now exclude illegal captures by pinned pieces. Opening engine review in an active game counts as automatic assistance for crowns. Saved game loading no longer waits for the full engine catalog to finish checking.

The first complete parallel test run failed under host resource contention: native engine deadlines were exceeded, and two installed Maia checks were incorrectly skipped. No unrelated processes were stopped and no timeout assertion was relaxed. Cold opponent startup and test-file execution were serialized; the Stockfish overload test still checks its original two-active/eight-queued behavior. The focused Stockfish suite then passed 11/11, and the focused opponent suite passed 12/12 with zero skips under the same host load.

During the final production restart, an early browser reload briefly encountered connection refusal. A subsequent browser-tool action was blocked on the browser's generated data-URL error page; no alternate browser path was used. The latest production runtime is checked through its HTTP API. The final accessibility and startup changes have build/state-test evidence, but no new desktop/mobile visual sweep is claimed after that tool block.

The pre-existing `gstack-cso` skill hash mismatch still fails `just check`. Strict OpenSpec validation independently passed all three changes, and Git whitespace checks passed. Existing historical research/report receipts above remain dated evidence, not current application assertions.

The final combined `just test` run completed 41 checks: 34 passed, seven Stockfish analysis checks failed on native startup/search or queue deadlines, and zero were skipped. All nine installed opponent configurations passed in that same run; account/game/clock/help/state tests also passed. This is an unresolved host-load sensitivity, not a green complete suite. A direct native Stockfish identity/ready handshake subsequently completed in 1.07 seconds. No engine timeout or test expectation was increased. The build passed with JavaScript 285.92 KB (89.76 KB gzip) and CSS 44.14 KB (10.69 KB gzip) before the last startup-loading UI change; that follow-up build also passed.

The subsequent isolated Stockfish recheck passed all 11 tests, zero failures/skips, in 18.94 seconds, including the original overload and unresponsive-process deadlines. The preceding combined-run failure remains part of this record; a passing isolated rerun does not erase host-load sensitivity.


## Non-multiplayer reference mapping — 8 September 2026

The later combined confirmation of the preceding expansion passed 41/41 tests in 54.38 seconds (`data/final-tests-confirmation.log`). This supersedes its latest test status above without erasing the recorded host-load failures.

The current build integrates 166 observed public bot profiles across twelve categories, their original portraits/greetings, the exact 25 reference engine-level ratings, original navigation icons and the existing original twelve piece images. Stockfish 18 Lite is a real tenth installed runtime configuration, verified by release hashes and UCI identity. Its adjacent CommonJS package marker fixes a startup failure caused by the repository’s ES-module setting.

`just test` passed 46/46 checks, zero failures or skips, in 20.35 seconds on the final logic. This includes every installed engine returning a legal move, all166 profile setups, beginner targets 100/125/150/175/200/225, five-line Lite analysis, original overload/deadline assertions and active/queued cancellation. Review cancellation now propagates from the HTTP disconnect into queued requests and active native processes. Alternate installation directories are honored by Analysis; advanced thread counts require explicit engine selection.

`npm run build:sites` passed. It packages the React app and a small protected HTTPS proxy; binaries, weights, credentials and account databases are excluded. Board notation, animation, coach-avatar visibility and classification controls are now wired, and the analysis engine is independent of the opponent. The Options popover starts closed so it cannot intercept engine-card clicks.

`just check` currently stops at the missing canonical Pstack unslop SKILL.md behind its existing symlink. The skill manifest and canonical trees were not changed to hide that failure. Strict OpenSpec and whitespace validation run independently. Codex Security’s sealed scan has zero indexed findings with explicitly partial coverage; focused checks exercised session ownership, origin validation, secret protection, hostile UCI input and streaming-body limits. This is not a complete deployed security certification.

The private Sites frontend connects to a separately authenticated native service through HTTPS. Its database is isolated from the existing local database. An unauthenticated origin request returned403; a correctly signed request returned200. This remains a Mac-hosted backend requiring the Mac and tunnel to stay running.

The final local CUA check signed into an existing test account, selected actual Stockfish18Lite, played e4 and received/saved d5, then ran the separate Analysis engine with3000ms, five lines and two threads. Its displayed identity was Stockfish18Lite WASM Multithreaded. The test exposed mixed-depth duplicate candidates; collecting a complete MultiPV iteration fixed the root cause, and the full46-test suite passed again with distinct-candidate assertions. All occupied-board images loaded at their original150px dimensions. At1280×900 the document had no horizontal overflow. These observations do not establish every engine/UI combination or full reference parity.

## Private delivery and supplied master archive

Application commit facccd63c3549f1606a1102745431c70dfeb60d9 was pushed to the existing privateGitHub repository and its remote branch SHA was read back. Sites rejected the full video-history push with HTTP413; a separate application-source snapshot preserved the exact runtime files while leaving the full history in GitHub. That source snapshot,973207ce5d71c7db2738a3880ff4094548d27343, was pushed successfully, built and packaged before saving.

Sites version 1 published successfully with unchanged owner-only access. After the owner signed in, the hosted browser created a test account, played e4 against the Martin profile using Stockfish 19, received h6, reloaded the saved history and opened a real engine-backed position review. Version 3 is now published at https://chesslab-bot-studio.prax-lannister.chatgpt.site with environment revision 1. Its final CSS loaded in the browser at 758 × 1114 without horizontal overflow. The board now stays beside the controls at that width; phone Play remains visible with space below the final content. These are checks of the implemented flow, not proof of full reference parity. A separate real-HTTPS test of the Worker module and protected native service verified166profiles, ten ready configurations, a legal Lite move, persisted history, five distinct analysis lines and a Secure app-session cookie. Exact deployment and API receipts are preserved under references/.

The user subsequently supplied the missing184MB master ZIP. Its matchingSHA-256 and freshCRC result cover575files. The entire original is retained locally under ignored data/source-archives. Forty chess-specific documents are copied into the research source library with individual hashes; prototype executable formats are preserved with.txt suffixes. Wondering requirements are classified separately. The artifact counts describe research/prototype coverage, not working product parity.


### Responsive correction

The old 800px breakpoint stacked a 620px board above the bot roster in the user’s 758px-wide pane, pushing Play below the initial viewport. The stack breakpoint is now 720px; the side panel uses 300px and the board takes the remaining width. At 390 × 844, Play is fixed above navigation and the welcome panel retains 88px bottom clearance. Browser geometry confirmed no horizontal overflow and 38px clearance between the final content and Play at maximum scroll. The production build passed. These CSS changes did not alter engine or account logic; the preceding 46-test result applies to that unchanged logic.


## 8 September 2026 — reference recording and authentication continuation

The actual Chrome reference session covered Coach, bot play, two solved puzzles and Game Review. Original screenshots, eleven accepted speech transcripts, sound-effect rejections and the exact gaps are indexed in [the capture atlas](../references/chrome-session-2026-09-08/index.html) and [session report](../references/chrome-session-2026-09-08/session-report.md). An unrated online match auto-aborted after automatic approval review blocked the first coordinate move.

A reproduced guest puzzle move was discarded by sign-in. Commit cde3d74 preserves explicit pending bot/puzzle/lesson/import actions, cancels them when dismissed, and guards late account/exercise/game-list responses. Puzzles now have Solve puzzles and Next puzzle controls. Actual Chrome checks passed for all four sign-in continuations, a legal Martin bot reply, hint, undo, resignation and engine review. `just app-check` passed all 55 tests and built the app; all four OpenSpec changes validated. `just check` still reports external drift of the globally installed unslop skill hash; its baseline was preserved.

Sites version 4 published with owner-only access. The deployed app and new puzzle entry load in Chrome. Fresh hosted gameplay remains unverified: automatic approval review blocked creating a new hosted QA account, and the existing app session was signed out. No account was created. This is distinct from the successful local gameplay check and the earlier hosted verification. Full Chess.com parity remains unfinished.
