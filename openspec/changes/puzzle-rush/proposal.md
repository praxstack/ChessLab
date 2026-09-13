# Local Puzzle Rush

Add the missing non-multiplayer Rush workflow toward the unchanged full Chess.com parity goal. Baseline c8f2db7 protects all 74 application tests, the catalogue, rated/daily/custom behavior, native engines, accounts and studies. Existing source/build/proof manifests are rollback evidence. No governing gate changes.

The official puzzle guide describes three-minute, five-minute and untimed Survival runs, ending after three failed puzzles, with saved scores and post-run puzzle review. Use the existing legal source replay, board, account SQLite and custom-practice/analysis path. The server owns elapsed time, attempts and scores. Progressively harder source puzzles must not repeat within a run. This local progression is not a claim of proprietary sequencing equivalence. Battle remains in the later human-multiplayer phase; billing is last.

Engineering graph: reference behavior -> fixed clock/score/ownership requirements -> failing deterministic checks -> atomic persisted runs -> responsive board and results -> protected app-control recording -> root review and PR -> exact local promotion. Bound this candidate to one implementation and one evidence-driven repair cycle; stop if two candidates fail to improve. Keep full platform and branching tutor work active.

Reference: https://support.chess.com/en/articles/8608686-how-do-puzzles-work-on-chess-com (read 2026-09-13).
