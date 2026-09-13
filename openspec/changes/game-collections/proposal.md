# Local game collections

Add collections to the unchanged full local Chess.com parity objective. Baseline 86d8795 protects 81 application tests, 54 recorded flows, all games, nested studies, review, learning and puzzle progress. This candidate changes product behavior, not governing gates; the baseline and its manifests remain rollback pointers.

The official Game Collections guide (https://support.chess.com/en/articles/13557248-how-do-i-use-game-collections, read 2026-09-13) describes named collections, adding saved games, editing details, search and sorting. Implement account-private local organization first. Public/community sharing remains later full-platform work; no proprietary collection content is downloaded or represented as ours.

Engineering graph: observed reference -> frozen ownership and preservation rules -> failing HTTP checks -> SQLite collections and membership -> searchable library UI -> recorded protected and new desktop/mobile flows -> root review and video PR -> exact local promotion. Reuse existing SQLite, account middleware, API client, game cards and modal. No dependency. One implementation plus one evidence-driven repair cycle; stop after two no-gain candidates without weakening gates.
