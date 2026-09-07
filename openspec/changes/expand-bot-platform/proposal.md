## Why

The user rejected five generic Stockfish presets as insufficient for the requested Chess.com-style bot platform and explicitly instructed installing the referenced engines and building the bot experience. This extends the first working application, commit e2f5a2d, while preserving saved studies and legal game behavior.

## What Changes

Install available first-party native engines and human-move models, expose verified availability, and connect chosen engines to games. Add a grouped bot roster, rating target, random color, time controls, assistance, undo, hints, contextual bot chat, adaptive practice and saved crowns. Keep the existing Chess.com piece images and blue board. Record unavailable proprietary engines without presenting them as working.

## Capabilities

### New Capabilities
- `bot-platform`: Multi-engine bot games, roster, clocks, assistance and saved bot outcomes.

### Modified Capabilities
None. Earlier functionality remains protected; this is an additive build version.

## Impact

Server APIs, frontend bot setup/play controls, isolated engine runtimes in ignored data/engines, dependency installation instructions and application evidence. No human multiplayer, billing or public deployment is introduced.
