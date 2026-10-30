import {Chess} from 'chess.js';
import {replay} from '../../../../shared/replay.js';

// A deterministic stand-in for the browser engine in tests: it prefers checkmate, then the largest
// capture, then the first legal move in sorted UCI order, and scores material from White's side.
// pick(input) may name the move to play first; wait(input) may hold a search open (for race tests).
const VALUES = {p: 100, n: 300, b: 300, r: 500, q: 900, k: 0};
const uci = move => move.from + move.to + (move.promotion || '');
const material = board => board.board().flat().filter(Boolean).reduce((sum, piece) => sum + (piece.color === 'w' ? 1 : -1) * VALUES[piece.type], 0);

function rank(board) {
  return board.moves({verbose: true}).map(move => {
    const copy = new Chess(board.fen()); copy.move(move);
    return {move: uci(move), mate: copy.isCheckmate(), gain: move.captured ? VALUES[move.captured] : 0};
  }).sort((a, b) => Number(b.mate) - Number(a.mate) || b.gain - a.gain || (a.move < b.move ? -1 : 1));
}

export function createFakeEngine({available = true, name = 'Fake Stockfish 19', pick, wait} = {}) {
  const calls = [];
  function search(input) {
    const {fen, moves = [], variant, lines = 1} = input;
    const board = replay(moves, fen === new Chess().fen() ? null : fen, variant), ranked = rank(board), chosen = pick?.(input);
    if (chosen) ranked.sort((a, b) => Number(b.move === chosen) - Number(a.move === chosen));
    return ranked.slice(0, lines).map(choice => {
      const after = replay([...moves, choice.move], fen === new Chess().fen() ? null : fen, variant);
      const score = choice.mate ? {type: 'mate', value: board.turn() === 'w' ? 1 : -1} : {type: 'cp', value: material(after)};
      return {moves: [choice.move], score, depth: 1};
    });
  }
  return {
    calls,
    set available(value) { available = value; },
    status: async () => available ? {available: true, name, chess960: true} : {available: false, name: 'Stockfish', reason: 'Fake engine is off.'},
    async analyze(input) {
      calls.push({kind: 'analyze', ...input});
      await wait?.(input);
      if (!available) throw Object.assign(new Error('Fake engine is off.'), {status: 503});
      const lines = search(input);
      return {engine: name, bestmove: lines[0]?.moves[0] ?? null, lines, limits: {movetime: input.movetime, lines: input.lines}};
    },
    async bestMove(input) {
      calls.push({kind: 'bestMove', ...input});
      await wait?.(input);
      if (!available) throw Object.assign(new Error('Fake engine is off.'), {status: 503});
      return {move: search({...input, lines: 1})[0]?.moves[0] ?? null, engine: name};
    },
    stop() {},
  };
}
