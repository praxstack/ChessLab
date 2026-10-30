import {replay} from '../../../../shared/replay.js';
import {analyzePosition} from '../analysis.js';
import {parseAskedMove} from '../coach-fallback.js';
import {fail, LOCAL_USER} from '../context.js';

// "Explain why": the coach explains engine evidence for one position, as /api/coach/explain on the server.
export default function coachRoutes(ctx) {
  const {engine, coach, owned, savedReview, markReviewAccess} = ctx;
  // Saved whole-game review steps are evidence for the same position and move.
  async function reviewedEvidence({gameId, moves, initialFen, variant, playedMove}) {
    if (typeof gameId !== 'string' || typeof playedMove !== 'string') return null;
    const game = await owned(gameId), entry = (await savedReview(game))?.entries[moves.length];
    const samePosition = (game.initialFen ?? null) === (initialFen ?? null) && (game.variant || 'standard') === (variant || 'standard') && moves.every((move, index) => game.moves[index] === move);
    return samePosition && game.moves[moves.length] === playedMove && entry?.analysis?.played?.move === playedMove ? entry.analysis : null;
  }
  return [
    ['POST', '/api/coach/explain', async ({body, signal}) => {
      const {gameId, moves = [], initialFen = null, variant, playedMove, evidenceId, question} = body;
      if (gameId !== undefined) await markReviewAccess(gameId);
      if (playedMove !== undefined && typeof playedMove !== 'string') fail(400, 'Choose a legal move in UCI notation.');
      const board = replay(moves, initialFen, variant);
      const asked = question === undefined ? null : (coach.parseAskedMove ?? parseAskedMove)(board, question);
      if (!asked && playedMove !== undefined) replay([...moves, playedMove], initialFen, variant);
      const position = {moves, initialFen, variant, playedMove: asked ? asked.uci : playedMove};
      const recalled = asked ? null : coach.recall(LOCAL_USER.id, evidenceId, position);
      if (!asked && evidenceId !== undefined && !recalled && ctx.coachCovered()) fail(409, 'This analysis has expired. Run the analysis again, then ask.');
      const analysis = recalled || (!asked && await reviewedEvidence({gameId, ...position}))
        || await analyzePosition(engine, {...position, movetime: coach.engineMovetime, lines: 3}, {signal});
      if ((position.playedMove ?? null) !== (analysis.played?.move ?? null)) fail(503, 'The engine evidence does not match this move. Try again.');
      return coach.explain({userId: LOCAL_USER.id, analysis, moves, initialFen, variant, asked, serverKey: ctx.coachCovered(), budget: `user:${LOCAL_USER.id}`, signal});
    }],
  ];
}
