import {positionKey, reviewSignature, beginReview, appendReview} from '../../../../shared/game-review.js';
import {beginPractice, practiceView, advancePractice} from '../../../../shared/review-practice.js';
import {analyzePosition} from '../analysis.js';
import {fail, respond, LOCAL_USER} from '../context.js';

// Whole-game review, practice from its mistakes, and single-position analysis.
export default function reviewRoutes(ctx) {
  const {store, engine, coach, owned, expected, atomic, savedReview, markReviewAccess, pendingReview} = ctx;
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  // Saves only when nothing changed the stored value since it was read, like the server's conditional UPDATE.
  const saveIfUnchanged = (collection, id, previous, next, message) => atomic(async () => {
    if (!same(await store.get(collection, id), previous)) fail(409, message);
    await store.put(collection, next);
  });
  return [
    ['GET', '/api/games/:id/review', async ({params}) => ({review: await savedReview(await owned(params.id))})],
    ['POST', '/api/games/:id/review', async ({params, body, signal}) => {
      const game = await owned(params.id); expected(body, game);
      if (game.source === 'bot' && !game.result) fail(409, 'Finish this bot game before reviewing the whole game.');
      if (!game.moves.length) fail(400, 'There are no moves to review yet.');
      const {movetime = 1000, threads = 1, after} = body;
      if (!Number.isInteger(movetime) || movetime < 50 || movetime > 90000 || !Number.isInteger(threads) || threads < 1 || threads > 8) fail(400, 'Choose a search time from 50 to 90000 ms and 1 to 8 threads.');
      const limits = {movetime, threads, lines: 1, engineId: 'stockfish19'};
      const prior = await store.get('game_reviews', game.id);
      const report = prior?.signature === reviewSignature(game, limits) ? prior : beginReview(game, limits);
      if (!Number.isInteger(after) || after !== report.entries.length) fail(409, 'Review progress changed. Reload the saved report before continuing.');
      if (report.complete) return {review: report};
      if (pendingReview.has(game.id)) fail(409, 'This game is already being reviewed. Pause or wait for that step to finish.');
      pendingReview.add(game.id);
      try {
        const analysis = await analyzePosition(engine, {...limits, moves: game.moves.slice(0, after), initialFen: game.initialFen, variant: game.variant, playedMove: game.moves[after]}, {signal});
        if (signal?.aborted) fail(499, 'Review paused. Completed moves are saved.');
        const fresh = await owned(params.id); if (fresh.revision !== game.revision || positionKey(fresh) !== positionKey(game)) fail(409, 'The game changed while reviewing. Reload it before continuing.');
        const next = appendReview(report, game, analysis);
        await saveIfUnchanged('game_reviews', game.id, prior, next, 'The saved review changed in another process. Reload it before continuing.');
        return {review: next};
      } finally { pendingReview.delete(game.id); }
    }],
    ['GET', '/api/games/:id/practice-review', async ({params}) => {
      const game = await owned(params.id), stored = await store.get('review_practice', game.id);
      if (stored && stored.sourceKey !== positionKey(game)) return {practice: null, stale: true, revision: stored.revision};
      return {practice: practiceView(stored, game)};
    }],
    ['POST', '/api/games/:id/practice-review/start', async ({params, body}) => {
      const game = await owned(params.id), stored = await store.get('review_practice', game.id);
      if (stored && (!Number.isInteger(body.revision) || body.revision !== stored.revision)) fail(409, 'Reload the saved practice before starting again.');
      const next = beginPractice(game, await savedReview(game), body.side); if (stored) next.revision = stored.revision + 1;
      await saveIfUnchanged('review_practice', game.id, stored, next, 'Practice changed in another tab. Reload its saved progress.');
      return respond(201, {practice: practiceView(next, game)});
    }],
    ['POST', '/api/games/:id/practice-review/action', async ({params, body, signal}) => {
      const game = await owned(params.id), stored = await store.get('review_practice', game.id);
      if (!stored) fail(404, 'Start practice from a completed game review.');
      if (!Number.isInteger(body.revision) || stored.revision !== body.revision) fail(409, 'Practice changed in another tab. Reload its saved progress.');
      const next = await advancePractice(stored, game, body, input => analyzePosition(engine, input, {signal}));
      if (signal?.aborted) fail(499, 'Practice paused. Your previous progress is saved.');
      const fresh = await owned(params.id); if (positionKey(fresh) !== positionKey(game)) fail(409, 'The game history changed during this attempt. Reload it.');
      await saveIfUnchanged('review_practice', game.id, stored, next, 'Practice changed in another tab. Reload its saved progress.');
      return {practice: practiceView(next, game)};
    }],
    ['POST', '/api/analyze', async ({body, signal}) => {
      if (body.gameId !== undefined) await markReviewAccess(body.gameId);
      const analysis = await analyzePosition(engine, body, {signal});
      // Evidence is kept only when the coach can explain it, as on the server.
      const evidenceId = ctx.coachCovered() ? coach.remember(LOCAL_USER.id, body, analysis) : undefined;
      return evidenceId ? {...analysis, evidenceId} : analysis;
    }],
  ];
}
