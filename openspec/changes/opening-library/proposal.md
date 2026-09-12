# Offline openings library and recognition

Provide a searchable local opening catalogue, ECO filters, legal move playback, independent saved studies and bot practice from the selected point in a line. Identify the deepest named position in reviewed history, including transpositions, without rewriting or merging histories. This connects the existing review/practice features to opening study.

Use the complete pinned CC0 Lichess chess-openings dataset, revision 4b8622759e7ae6f93f011cc6c83a3823401ab45e, with retained sources/license and deterministic legal replay. It supplies opening names and move sequences, not game statistics or teaching explanations. The official Chess.com custom-position guide documents selecting an opening and practicing it against the computer. Full reference explorer statistics and lessons remain further work.

Baseline: 7d270da439bbc6590b26e6504c8470b706e45397 and its 65 tests. Preserve original games, branches, FEN/rule history, account isolation, clocks, crown rules and thresholds. Mutable: opening data import/index/API/UI, review recognition and focused checks. Work in a separate checkout; the installed local app remains on its verified build until promotion. Reassess after two unsuccessful candidates; no weakened gates. Root owns implementation and review while the installed team runtime validator prevents independent agent execution.
