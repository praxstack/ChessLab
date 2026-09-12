# Full local game review

The current app analyzes one selected move but has no complete saved game report. Implement the observed full-game review flow as the next part of the unchanged full Chess.com parity objective: an advantage graph, per-color classifications, key moves and persistent review progress. Reuse native analysis, account ownership, SQLite and existing board/study controls.

The primary reference is https://support.chess.com/en/articles/8584089-how-does-game-review-work, read 13 September 2026. Its accuracy description does not disclose CAPS2 mathematics; this delivery reports the existing local centipawn metric explicitly. Proprietary classification equivalence, opening recognition, voice coach and retry grading remain separate gaps.

Baseline: f520061800517216383527cf060bcc4cb480de46 and its accepted local proof. Protect game history, account isolation, studies, engine truth and the existing 55-test suite. Mutable paths: game-review module/UI, related app endpoints and presentation, focused tests and this change. Do not modify existing grading thresholds or governance gates. Root implementation/review proceeds while independent-agent execution is blocked by the installed runtime validator. Stop to reassess after two unsuccessful implementation candidates; do not weaken checks.
