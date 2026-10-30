import {replay} from '../../../../shared/replay.js';
import {stockfishPolicy} from '../../../../shared/opponent-policy.js';
import {engineMove} from '../analysis.js';
import {LOCAL_ENGINES} from '../routes/status.js';

// The bot's move in the browser, as server/opponent-engines.mjs chooses it for Stockfish 19:
// the same input checks, a Stockfish search at the bot's skill and movetime (the router takes
// both from engineControls), then the shared policy that swaps in sampled moves below 1100.
const failure = (message, status = 400) => Object.assign(new Error(message), {status});

function integer(value, fallback, min, max, name) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < min || value > max) throw failure(`${name} must be an integer from ${min} to ${max}.`);
  return value;
}

// A uniform integer in [0, n) from the browser's secure random source, like node:crypto's randomInt.
export function secureRandomInt(n) {
  const limit = Math.floor(0x100000000 / n) * n, buffer = new Uint32Array(1);
  do globalThis.crypto.getRandomValues(buffer); while (buffer[0] >= limit);
  return buffer[0] % n;
}

export function createLocalOpponent({randomInt = secureRandomInt} = {}) {
  return {
    async chooseMove(engine, input) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw failure('Provide an opponent move request object.');
      if (!LOCAL_ENGINES.some(entry => entry.id === input.engineId)) throw failure('Unknown opponent engine.');
      const moves = Array.isArray(input.moves) ? [...input.moves] : input.moves;
      const initialFen = input.initialFen ?? null;
      const variant = input.variant;
      const board = replay(moves, initialFen, variant);
      if (board.isGameOver()) throw failure('The game is over.');
      const movetime = integer(input.movetime, 350, 50, 2000, 'movetime');
      const skill = integer(input.skill, 20, 0, 20, 'skill');
      if (input.profileRating !== undefined && (!Number.isInteger(input.profileRating) || input.profileRating < 100 || input.profileRating >= 250 || input.rating !== input.profileRating)) throw failure('Invalid new-player profile rating.');
      const rating = integer(input.rating, 1500, input.profileRating ? 100 : 250, 3200, 'rating');
      const style = input.style ?? 'balanced';
      if (!['balanced', 'aggressive', 'solid'].includes(style)) throw failure('Choose balanced, aggressive or solid style.');
      const result = await engineMove(engine, {moves, initialFen, variant, movetime, skill, signal: input.signal});
      return stockfishPolicy({move: result.move, engine: result.engine, engineId: input.engineId}, board, rating, skill, style, randomInt);
    },
  };
}
