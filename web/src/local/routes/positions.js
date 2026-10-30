import {validatePosition} from '../../../../shared/position.js';
import {fail, respond, gameResult} from '../context.js';

// A custom starting position saved as a game to study.
export default function positionRoutes(ctx) {
  return [
    ['POST', '/api/positions', async ({body}) => {
      let position; try { position = validatePosition(body.fen, body.variant); } catch (error) { fail(400, error.message); }
      const title = body.title ?? 'Custom position'; if (typeof title !== 'string' || !title.trim() || title.length > 100) fail(400, 'Use a position title of 1–100 characters.');
      return respond(201, {game: await ctx.insertGame({title: title.trim(), source: 'import', positionSetup: true, ...(body.variant === 'chess960' ? {variant: 'chess960'} : {}), initialFen: position.fen, color: position.chess.turn(), result: gameResult(position.chess), headers: {White: 'White', Black: 'Black'}})});
    }],
  ];
}
