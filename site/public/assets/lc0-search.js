// A small Lc0-style search (PUCT, the tree search AlphaZero and Leela use)
// for a Leela network in the browser. The network gives each position a
// policy (how promising each move looks) and a value (win, draw, loss); the
// search spends its time on the moves that look best so far, and in the end
// plays the move it visited most. Written from Lc0's search defaults
// (CPuct 1.745, CPuctBase 38739, CPuctFactor 3.894, FPU reduction 0.330,
// policy softmax temperature 1.359; draws by repetition inside the tree).
//
// Plain functions and chess.js, no DOM: the tests drive it with a fake network.

import { Chess } from './vendor/chess.js';
import { castlingKey, policyIndexOf } from './lc0.js';

export const DEFAULTS = { cpuct: 1.745, cpuctBase: 38739, cpuctFactor: 3.894, fpu: 0.33, temperature: 1.359 };

const keyOf = (fen) => fen.split(' ').slice(0, 4).join(' ');

/** The moves from the last position of a game (fens), and how the game stands there. */
export function expand(fens, rootLength) {
  const fen = fens[fens.length - 1];
  const chess = new Chess(fen);
  const key = keyOf(fen);
  let seen = 0;
  let sinceRoot = false;
  for (let i = 0; i < fens.length - 1; i += 1) {
    if (keyOf(fens[i]) !== key) continue;
    seen += 1;
    if (i >= rootLength - 1) sinceRoot = true;
  }
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return { end: chess.inCheck() ? 'mate' : 'draw', moves: [] };
  // Three times in the game, or twice inside the search (as Lc0 does), is a draw.
  if (seen >= 2 || (seen >= 1 && sinceRoot) || chess.isInsufficientMaterial() || Number(fen.split(' ')[4]) >= 100) return { end: 'draw', moves: [] };
  return {
    end: null,
    black: chess.turn() === 'b',
    moves: moves.map((m) => ({ uci: m.from + m.to + (m.promotion || ''), key: castlingKey(m) + (m.promotion || ''), after: m.after })),
  };
}

function node(fens, prior = 1, uci = null) {
  return { fens, prior, uci, n: 0, w: 0, kids: null, end: undefined };
}

/** Policy logits for the legal moves as probabilities, with Lc0's softmax temperature. */
export function priors(moves, logits, black, temperature = DEFAULTS.temperature) {
  const xs = moves.map((m) => {
    const i = policyIndexOf(m.key, black);
    return i < 0 ? -Infinity : logits[i] / temperature;
  });
  const top = Math.max(...xs);
  const e = xs.map((x) => (Number.isFinite(x) ? Math.exp(x - top) : 0));
  const sum = e.reduce((a, b) => a + b, 0) || 1;
  return e.map((x) => x / sum);
}

/**
 * Search from the last position of `fens` until `stop()` says so (checked
 * after every network call) or `maxNodes` is reached. evaluate(fens) answers
 * { policy, wdl } for the side to move, wdl as probabilities. Returns the
 * best move, its expected score for the mover (0 to 1), the nodes searched,
 * the deepest line reached and the main line.
 */
export async function search(fens, evaluate, { stop = () => false, maxNodes = Infinity, ...opts } = {}) {
  const o = { ...DEFAULTS, ...opts };
  const root = node(fens);
  const rootLength = fens.length;
  let nodes = 0;
  let depth = 0;
  const visit = async () => {
    const path = [root];
    let at = root;
    while (at.kids && at.kids.length) {
      const sqrtN = Math.sqrt(at.n);
      const cpuct = o.cpuct + o.cpuctFactor * Math.log((at.n + o.cpuctBase) / o.cpuctBase);
      // An unvisited move is guessed a little worse than this position (first-play urgency).
      const seenPrior = at.kids.reduce((s, k) => s + (k.n ? k.prior : 0), 0);
      const fpu = (at.n ? -at.w / at.n : 0) - o.fpu * Math.sqrt(seenPrior);
      let best = null;
      let bestScore = -Infinity;
      for (const k of at.kids) {
        const q = k.n ? k.w / k.n : fpu;
        const score = q + (cpuct * k.prior * sqrtN) / (1 + k.n);
        if (score > bestScore) {
          bestScore = score;
          best = k;
        }
      }
      at = best;
      path.push(at);
    }
    depth = Math.max(depth, path.length - 1);
    // v: the value of the leaf for the side to move there, -1 to 1.
    let v;
    if (at.end === undefined) {
      const ex = expand(at.fens, rootLength);
      at.end = ex.end;
      if (!ex.end) {
        const { policy, wdl } = await evaluate(at.fens);
        nodes += 1;
        const p = priors(ex.moves, policy, ex.black, o.temperature);
        at.kids = ex.moves.map((m, i) => node([...at.fens, m.after], p[i], m.uci));
        v = wdl[0] - wdl[2];
      }
    }
    if (at.end === 'mate') v = -1;
    else if (at.end === 'draw') v = 0;
    else if (v === undefined) v = at.n ? -at.w / at.n : 0;
    // Each node keeps the value for the side that moved into it.
    for (let i = path.length - 1; i >= 0; i -= 1) {
      path[i].n += 1;
      path[i].w += -v;
      v = -v;
    }
  };
  await visit(); // the root
  if (root.kids && root.kids.length > 1) {
    let idle = 0;
    while (nodes < maxNodes && !stop()) {
      const before = nodes;
      await visit();
      // A tree that only reaches finished games has nothing left to learn.
      idle = nodes === before ? idle + 1 : 0;
      if (idle > 500) break;
    }
  }
  const line = [];
  let at = root;
  while (at.kids && at.kids.length) {
    const next = at.kids.reduce((a, b) => (b.n > a.n || (b.n === a.n && b.prior > a.prior) ? b : a));
    if (!next.n && line.length) break;
    line.push(next.uci);
    at = next;
  }
  const first = root.kids && root.kids.length ? root.kids.find((k) => k.uci === line[0]) : null;
  const q = first && first.n ? first.w / first.n : root.n ? -root.w / root.n : 0;
  // A move that mates at once is reported as mate in 1.
  return { move: line[0] || null, score: (q + 1) / 2, mate: first && first.end === 'mate' ? 1 : 0, nodes, depth, line, end: root.end };
}
