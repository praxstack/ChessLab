import {endgames, endgameById} from '../../../../shared/endgames.js';
import {fail, respond} from '../context.js';

// Endgame drills and the practice games started from them.
export default function endgameRoutes(ctx) {
  return [
    ['GET', '/api/endgames', () => ({items: endgames})],
    ['GET', '/api/endgame-attempts', async () => ({attempts: (await ctx.allGames()).filter(game => game.practice?.endgameId && endgameById(game.practice.endgameId)).map(game => ({id: game.id, endgameId: game.practice.endgameId, color: game.color, result: game.result, resultReason: game.resultReason, moves: game.moves.length - game.practice.startPly, engine: game.botName, engineId: game.engineId, rating: game.rating, hints: game.hintsUsed || 0, undos: game.undosUsed || 0, updatedAt: game.updatedAt}))})],
    ['POST', '/api/endgames/:id/study', async ({params}) => {
      const drill = endgameById(params.id); if (!drill) fail(404, 'Endgame not found.');
      return respond(201, {game: await ctx.insertGame({title: drill.title, source: 'import', initialFen: drill.fen, color: drill.fen.split(' ')[1], endgameId: drill.id, headers: {White: 'White', Black: 'Black'}})});
    }],
  ];
}
