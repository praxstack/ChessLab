# Position practice evidence

From a reviewed game or saved nested variation, choose Practice this position, select an opponent and side, and play an independent bot game. The server copies the full history prefix and original starting FEN. Fresh clocks and undo history begin at the selected position; practice never awards roster crowns. Restart uses the retained practice snapshot even if the source study later changes.

[Video](proof/local-user-flow.webm) · [Receipt](proof/receipt.json) · [Setup](proof/12-position-setup.png) · [Mobile setup](proof/13-mobile-position-setup.png) · [Native play](proof/14-native-position-practice.png) · [Returned branch and note](proof/15-returned-source-study.png)

All 61 application tests and SQLite snapshot checks pass. The 58 previous tests remain intact. New checks cover source ownership, stale game/study revisions including a change during engine readiness, repetition history, custom starting FEN, terminal-position rejection, fresh clocks, undo boundaries, restart, server-restart persistence, PGN export and crown exclusion. Starting practice from an unfinished bot game marks that source as reviewed, matching existing assistance rules.

The 20-flow recording uses the production build, native Stockfish 19 and a synthetic account in temporary SQLite. It covers all four control-app features, including actual practice moves, undo, restart, reload and return to the unchanged nested branch and note. Root inspected source, screenshots and a video frame. The first recording reached the new flows but failed a library selector that assumed one game; its failure log is retained and the corrected selector passed the full run. The harness closed its browser, engine and server and removed its temporary database; accepted evidence remains here.

`just local-check` passes the actual entrypoint, archive mounts, local piece asset, engine readiness and private-path exclusions. Strict OpenSpec validation passes seven changes. The installed service at http://127.0.0.1:8772/ was restarted with the verified build, and Stockfish 19 is available. The pre-change local backup retains 2 accounts and 2 games. No hosted site was changed. Source, assets, build and proof hashes are in the separate manifest.

Independent review remains unavailable under the installed Astra runtime validator; root review is not team acceptance. Existing skill-manifest drift still blocks `just setup` and `just check`. No governing gate or classification threshold changed.

The [official custom-position guide](https://support.chess.com/en/articles/8572788-how-can-i-play-the-computer-from-a-custom-position) informed this flow. This feature does not complete full Chess.com parity: a custom board editor, opening/drill collections, midgame side switching, the full curriculum, proprietary bot equivalence and the conversational branching tutor remain unfinished. Full-game reports include the retained historical moves; automatic live feedback applies only to newly played moves.

[PR #3](https://github.com/praxstack/ChessLab/pull/3) is open, stacked on the whole-game review PR. Source and recorded evidence are committed at bac9be20df14ee3c867f9f3b559b02df7720f448; later documentation records delivery.
