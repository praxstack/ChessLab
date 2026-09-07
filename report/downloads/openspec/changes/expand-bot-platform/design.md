## Context

Baseline e2f5a2d has one Stockfish engine, five presets, saved games and nested review. The user explicitly authorized this expansion on 7 September 2026. Earlier specs/evaluators remain unchanged. Original protected behavior: legal history, ownership, revision conflicts, saved branches/notes, learning progress and no browser engine/model download.

## Goals / Non-Goals

Connect actual installed engines to selectable bot games, and implement the bot-play workflow beyond the old presets. Private platform remains the delivery target. Exact proprietary Chess.com bot weights/behavior cannot be inferred from portraits or ratings. No invented engine availability, billing or human games.

## Decisions

Use the existing Node/React/SQLite application. Native engines and model weights live in ignored data/engines with source/version/hash receipts and an installer. A bounded opponent adapter supports Stockfish versions, Maia and Lc0 where installations run successfully. Existing Stockfish analysis remains the teaching source. Unsupported engines are listed with concrete reasons and disabled.

A server catalog supplies bots and available engines. Games retain bot and engine identity, target/current rating, chosen assistance, contextual scripted chat, clock balances, help usage and earned crowns. Clocks use server time; reload and tabs cannot reset them. Store revisions protect asynchronous bot and hint replies. Undo rewinds a completed user turn, records assistance and restores that turn's clock; it must not destroy saved study branches. If a saved branch depends on moves to be removed, reject undo with an explanation.

Adaptive practice adjusts target strength from material balance. Stockfish beginner practice may mix legal weaker moves; ratings are targets without a demonstrated Chess.com equivalence. Crowns record local progress: a win without assistance earns three, limited hints/undo two, more help or automatic assistance one. Repeated reads cannot duplicate awards.

## API additions

GET /api/bots returns {bots,engines}. Existing /api/games POST additionally accepts botId, engineId, rating 250..3200, random color, timeControl {initialSeconds,incrementSeconds}, assistance {chat,evaluation,threats,suggestions,feedback,engine}. Legacy level requests continue working. Games add clock {whiteMs,blackMs,activeSince}, clockHistory, botName, currentRating, resultReason, hintsUsed, undosUsed, crownsAwarded and chat array. GET /api/games/:id settles timeout. POST /hint returns {game,move,san,explanation}; /undo returns {game}; /assist returns {analysis,threats,game}. All require ownership and expected revision. progress.bots maps botId to best crown count when any have been earned.

## Risks / Trade-offs

Model startup and availability differ by platform. Inference is tested locally; no public scaling claim. Proprietary Torch/Komodo access is evaluated through official sources only. Target strength and scripted personalities remain local implementations, not the vendor's hidden policies. Undo must preserve saved studies or reject the operation. Stop unproductive engine install attempts after two identical failures, record the blocker and continue independent installations. Do not weaken prior tests to hide regression.
