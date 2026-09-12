# Local chess workspace design

## Grounding and caller usage

The learner chooses an opponent, adjusts side/time/help, starts a saved game, then plays through Board callbacks. The existing server validates every move and stores it before an engine reply. Review consumes engine evidence; a variation preserves the original prefix and references its parent. This contract stays intact.

`<BotSetup {...setupProps} />` remains the caller boundary. The selected configuration stays owned by App. Search and category expansion are transient picker state. The server entrypoint serves explicit archive directories before the SPA fallback. SQLite migration uses a consistent snapshot into a new path, never overwriting an existing database.

## Two candidate shapes

A: A board-first workspace with a searchable opponent panel and one coherent responsive stylesheet. Keep the existing React/Express/SQLite boundaries. The board, move history and review remain visible together.

B: A dashboard-first routed application with separate lobby, play, study and learning pages; migrate to a full-stack React router and query cache. This can support broader platform navigation but requires moving existing game state and testing route transitions before the main loop improves.

## Synthesis

Choose A for this delivery. It improves the user's immediate board experience and preserves the demonstrated game/study contract. Adapt B's clear navigation labels and persistent local-workspace identity. Defer framework and state-management migration until actual multi-page requirements justify it. Retain React/Vite, Express and SQLite with native UCI engines; no extra infrastructure is needed to run one local server.

Palette: charcoal #262421, background #302e2b, raised #3b3935, action green #81b64c, board green #769656, board ivory #eeeed2. Rounded system sans for display, platform sans for body, system monospace for clocks and moves. The chessboard is the visual centerpiece, with restrained chrome and readable opponent portraits. Preserve familiar chess colors rather than introducing an unrelated dashboard look.

Rubric: preserved game/study APIs; local-only runtime; readable bot names and ratings; no mobile overflow or floating action obstruction; a single stylesheet rather than accumulating theme overrides. A passes by construction but runtime verification remains required.

Independent candidates and cross-judge are UNAVAILABLE: the native spawn hook rejects this Codex runtime. Both alternatives above are root-authored; do not treat them as independent evidence. No irreversible migration or validator change proceeds on that basis.
