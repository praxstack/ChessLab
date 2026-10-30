import {setupOptions, practiceSnapshot, beginClock, settleClock, finishMoveClock, adaptiveRating, addBotChat, undoTurn, attackedPieces} from '../../../../shared/bot-game.js';
import {engineControls} from '../../../../shared/strength-ladder.js';
import {replay} from '../../../../shared/replay.js';
import {validateStudy, readAnnotatedPgn, writeAnnotatedPgn, portableStudy, readPortableStudy} from '../../../../shared/study-format.js';
import {analyzePosition, engineMove} from '../analysis.js';
import {engineCatalog} from './status.js';
import {fail, respond, moveOn, uci, gameResult, LOCAL_USER} from '../context.js';

// Saved games and bot play, as server/app.mjs serves them.
export default function gameRoutes(ctx) {
  const {store, engine, now, owned, expected, storeGame, insertGame, insertGameNow, liveGame, atomic, pendingBot} = ctx;
  const playable = (body, game) => {
    expected(body, game);
    if (game.result || game.source !== 'bot') fail(409, 'This game is available for review, not further play.');
    return replay(game.moves, game.initialFen, game.variant);
  };
  async function validatedOptions(body) {
    const values = setupOptions(body, ctx.profiles);
    if (!values.legacyStrength) {
      const selected = (await engineCatalog(engine)).find(entry => entry.id === values.engineId);
      if (!selected) fail(400, 'Choose an engine from the current catalog.');
      if (values.variant === 'chess960' && !selected.chess960) fail(400, 'Choose a Chess960-capable engine.');
      if (!selected.available) fail(503, selected.reason || 'This engine is unavailable on the server.');
    }
    return values;
  }
  // The bot's move: a weakened search for games from before the bot roster, otherwise the roster engine.
  // New-player bots rated under 250 pass profileRating, as server/app.mjs does, so the policy may go below 250.
  async function chooseMove(game) {
    if (game.legacyStrength || !game.engineId) {
      const analysis = await analyzePosition(engine, {moves: game.moves, initialFen: game.initialFen, variant: game.variant, movetime: [80, 150, 250, 400, 700][game.level - 1], lines: 1, skill: [0, 4, 8, 14, 20][game.level - 1]});
      return {move: analysis.bestmove, engine: analysis.engine, engineId: 'stockfish19'};
    }
    const selected = (await engineCatalog(engine)).find(entry => entry.id === game.engineId);
    if (!selected?.available) fail(503, selected?.reason || 'This engine is unavailable in this browser.');
    const {skill, movetime} = engineControls(game.currentRating);
    const decision = await (ctx.opponent?.chooseMove ?? engineMove)(engine, {engineId: game.engineId, moves: game.moves, initialFen: game.initialFen, variant: game.variant, rating: game.currentRating, ...(game.botId && game.rating < 250 ? {profileRating: game.rating} : {}), skill, movetime, style: game.style});
    return {...decision, engineId: game.engineId};
  }
  return [
    ['GET', '/api/games', async () => ({games: await ctx.allGames()})],
    ['POST', '/api/games', async ({body}) => {
      const values = await validatedOptions(body); beginClock(values, now());
      return respond(201, {game: await insertGame(values)});
    }],
    ['POST', '/api/games/:id/practice', async ({params, body}) => {
      const source = await owned(params.id); expected(body, source); practiceSnapshot(source, body);
      const values = await validatedOptions({...body, variant: source.variant || 'standard', positionNumber: null});
      return atomic(async () => {
        const fresh = await owned(params.id); expected(body, fresh); const snapshot = practiceSnapshot(fresh, body);
        const marking = fresh.source === 'bot' && !fresh.result && !fresh.reviewUsed;
        if (marking) await store.put('games', {...fresh, reviewUsed: true});
        Object.assign(values, snapshot, {title: `Position practice · ${values.botName}`.slice(0, 100)}); beginClock(values, now());
        // The server rolls back its transaction when the insert fails (the 500-game limit); here the
        // source game is put back as it was, so a refused practice does not count as review use.
        try { return respond(201, {game: await insertGameNow(values)}); }
        catch (error) { if (marking) await store.put('games', fresh); throw error; }
      });
    }],
    ['GET', '/api/games/:id', async ({params}) => ({game: await liveGame(params.id)})],
    ['POST', '/api/games/:id/move', async ({params, body}) => {
      const game = await liveGame(params.id), chess = playable(body, game);
      if (chess.turn() !== game.color) fail(409, 'Wait for your opponent to move.');
      if (game.moves.length >= 1000) fail(400, 'This game has reached the move limit.');
      const move = moveOn(chess, body.move); game.moves.push(uci(move)); game.result = gameResult(chess);
      finishMoveClock(game, move.color, now());
      return {game: await storeGame(game, game.revision)};
    }],
    ['POST', '/api/games/:id/bot', async ({params, body}) => {
      let game = await liveGame(params.id); const chess = playable(body, game);
      if (chess.turn() === game.color) fail(409, 'It is your turn.');
      if (pendingBot.has(game.id)) fail(409, 'The opponent is already thinking.');
      if (game.moves.length >= 1000) fail(400, 'This game has reached the move limit.');
      pendingBot.add(game.id);
      try {
        game.currentRating = adaptiveRating(game);
        const decision = await chooseMove(game);
        if (!decision.move) fail(503, 'The engine returned no move. Retry the opponent turn.');
        const fresh = await owned(params.id); expected(body, fresh);
        if (settleClock(fresh, now())) return {game: await storeGame(fresh, fresh.revision)};
        game = {...fresh, currentRating: game.currentRating, lastEngineDecision: decision};
        const move = moveOn(chess, decision.move); game.moves.push(uci(move)); game.result = gameResult(chess);
        finishMoveClock(game, move.color, now()); addBotChat(game, move);
        return {game: await storeGame(game, game.revision)};
      } finally { pendingBot.delete(game.id); }
    }],
    ['POST', '/api/games/:id/resign', async ({params, body}) => {
      const game = await liveGame(params.id); playable(body, game);
      game.result = game.color === 'w' ? '0-1' : '1-0'; game.resultReason = 'Resignation'; if (game.clock) game.clock.activeSince = null;
      return {game: await storeGame(game, game.revision)};
    }],
    ['POST', '/api/games/:id/undo', async ({params, body}) => {
      const game = await liveGame(params.id); playable(body, game);
      if (pendingBot.has(game.id)) fail(409, 'Wait for the opponent to finish before taking back a turn.');
      undoTurn(game, now()); game.currentRating = adaptiveRating(game);
      return {game: await storeGame(game, game.revision)};
    }],
    ['POST', '/api/games/:id/hint', async ({params, body, signal}) => {
      const game = await liveGame(params.id), chess = playable(body, game);
      if (chess.turn() !== game.color) fail(409, 'Wait for your turn before asking for a hint.');
      const analysis = await analyzePosition(engine, {moves: game.moves, initialFen: game.initialFen, variant: game.variant, movetime: 400, lines: 1}, {signal});
      if (!analysis.bestmove) fail(503, 'The coach returned no hint. Try again.');
      const move = moveOn(chess, analysis.bestmove), fresh = await owned(params.id); expected(body, fresh);
      if (settleClock(fresh, now())) return {game: await storeGame(fresh, fresh.revision)};
      fresh.hintsUsed = (fresh.hintsUsed || 0) + 1;
      return {move: uci(move), san: move.san, explanation: analysis.explanation || `Consider ${move.san}. Check the opponent's replies before committing.`, game: await storeGame(fresh, fresh.revision)};
    }],
    ['POST', '/api/games/:id/assist', async ({params, body, signal}) => {
      const game = await liveGame(params.id), chess = playable(body, game);
      if (chess.turn() !== game.color) fail(409, 'Assistance is available on your turn.');
      const help = game.assistance || {};
      const analysis = (help.evaluation || help.suggestions || help.engine) ? await analyzePosition(engine, {moves: game.moves, initialFen: game.initialFen, variant: game.variant, movetime: 350, lines: help.engine ? 3 : 1}, {signal}) : null;
      const lastPlayerPly = game.moves.length - 2;
      const feedback = help.feedback && lastPlayerPly >= (game.practice?.startPly || 0) ? await analyzePosition(engine, {moves: game.moves.slice(0, lastPlayerPly), initialFen: game.initialFen, variant: game.variant, playedMove: game.moves[lastPlayerPly], movetime: 350, lines: 1}, {signal}) : null;
      const fresh = await owned(params.id); expected(body, fresh);
      if (settleClock(fresh, now())) return {analysis: null, feedback: null, threats: [], game: await storeGame(fresh, fresh.revision)};
      return {analysis, feedback, threats: help.threats ? attackedPieces(game) : [], game: fresh};
    }],
    ['POST', '/api/import', async ({body}) => respond(201, {game: await insertGame(readAnnotatedPgn(body.pgn))})],
    ['POST', '/api/import-study', async ({body}) => respond(201, {game: await insertGame(readPortableStudy(body))})],
    ['GET', '/api/games/:id/pgn', async ({params}) => {
      const game = await owned(params.id);
      return respond(200, {text: writeAnnotatedPgn(game, LOCAL_USER.username), filename: `askthemove-${game.id}.pgn`, type: 'text/plain'});
    }],
    ['GET', '/api/games/:id/study-file', async ({params}) => portableStudy(await owned(params.id), LOCAL_USER.username)],
    ['POST', '/api/games/:id/study', async ({params, body}) => atomic(async () => {
      const game = await owned(params.id);
      if (!Number.isInteger(body.studyRevision) || body.studyRevision !== (game.studyRevision || 0)) fail(409, 'This study changed in another tab. Keep your draft and reload before saving again.');
      game.study = validateStudy(body.study, game); game.studyRevision = (game.studyRevision || 0) + 1;
      // Study edits keep the move revision stable; storeGame merges the latest saved study after engine work.
      game.updatedAt = ctx.iso();
      await store.put('games', game);
      return {game};
    })],
  ];
}
