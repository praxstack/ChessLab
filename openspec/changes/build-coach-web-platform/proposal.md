## Why

The user changed direction on 7 September 2026: establish a usable Chess.com-like web platform before layering on the branching conversational tutor. Their latest clarification makes coach/bot play the first build and explicitly defers actual human players. The full platform remains the roadmap, not a claim that this first build matches Chess.com's complete service.

## What Changes

- Build a real blue-themed ChessLab web application with bot game setup, legal play, promotion, resign/restart, guided server-engine review, alternate lines and return, PGN import/export, saved games and settings.
- Add local-server accounts with isolated saved games and original introductory lessons and puzzles with progress. No copied Chess.com logos, personas, proprietary assets or course content.
- Use native server-side Stockfish. The browser receives positions and results, never engine WASM or model weights. Difficulty levels are uncalibrated bot settings, not promised human Elo.
- Keep evidence-derived coach explanations distinct from an unrestricted conversational AI. Show engine errors, bounded search metadata, and honest loading states.
- Keep billing activation and prices pending the user's answer. Human multiplayer, public matchmaking, large course/puzzle catalogs, and public deployment remain later platform stages.
- Publish the verified code and existing research archive to a private GitHub repository as explicitly requested.

## Capabilities

### New Capabilities

- `coach-web-platform`: accounts, legal bot play, server analysis, review/variations, saved games, settings, introductory learning content and private-repository delivery.

### Modified Capabilities

None. The earlier `explore-one-mistake` proposal remains historical draft material. Its browser-worker approach and PGN-first sequence are superseded for this build by the user's latest direction, not silently treated as accepted requirements.

## Impact

One Node server, a React web interface, chess.js legality, native Stockfish UCI, and a local SQLite database. Application dependencies and documentation are added; research artifacts remain intact. GitHub publication is private and is not public hosting. The original long-term branching tutor objective is preserved. Subscription decisions require user configuration and will not be presented as working payments without it.
