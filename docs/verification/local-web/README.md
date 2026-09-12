# Local web delivery evidence

This change polishes the local board and opponent picker, serves the existing archives locally, and preserves hosted data in a separate local snapshot. It does not complete the full Chess.com platform.

The final recording is [the local user flow](reviewed-proof/local-user-flow.webm). [Its receipt](reviewed-proof/receipt.json) records the real engine and tested actions. Screenshots cover the [laptop picker](reviewed-proof/00-laptop-picker.png), [desktop picker](reviewed-proof/01-bot-picker.png), [bot game](reviewed-proof/02-local-game.png), [review](reviewed-proof/03-engine-review.png), [nested study](reviewed-proof/04-nested-study.png), [puzzle completion](reviewed-proof/05-puzzle-complete.png), [saved games](reviewed-proof/06-saved-games.png), [mobile game](reviewed-proof/07-mobile-game.png) and [mobile settings](reviewed-proof/08-mobile-settings.png).

The video records UI actions against the real production build and native Stockfish, using a synthetic account in temporary SQLite. It checks legal bot replies, hint evidence, nested branch linkage, unchanged original moves, learning feedback and reload persistence. It also checks local-only network requests and mobile overflow. The build and proof hashes are in `manifest.json`.

The [baseline screenshot](baseline/01-bot-picker.png) precedes the visual edits. The first proof run exposed a laptop sizing issue during manual review. The final run adds explicit above-fold checks for move entry and the play button.

Root review covers the diff and visible screenshots. Independent-agent review and Astra Team acceptance are unavailable because the installed hook rejects this Codex runtime. Do not interpret this recording as cross-browser certification, proprietary bot equivalence, complete curriculum, multiplayer, billing, free-form tutor conversation, or 100 percent parity.

The delivery PR is [ChessLab #1](https://github.com/praxstack/ChessLab/pull/1), open for review. The installed local app is http://127.0.0.1:8772/; its source is `/Users/prax/Developer/ChessLab-local-web`. The recorded app source remains unchanged after proof.
