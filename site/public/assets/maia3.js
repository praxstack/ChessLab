// AGPL-3.0, like Maia-3 itself (see engine/MAIA3-LICENSE.txt).
// Maia-3 (CSSLab, University of Toronto, AGPL-3.0) in the learner's browser:
// the plain functions that turn a position into the network's input and its
// 4352 policy outputs back into a move. Written from CSSLab/maia3
// (maia3/dataset.py tokenize_board, maia3/utils.py get_all_possible_moves and
// mirror_move, maia3/uci.py).
//
// The network sees 64 squares, each with 12 numbers (one per piece kind and
// colour), always from the side to move as White: for Black the board is
// mirrored (ranks flipped, colours swapped) and its move mirrored back. Its
// 8-position history is the current position repeated, as maia3's own UCI
// engine does by default. The rating goes in as a plain number (0 to 5000),
// once for the mover and once for the opponent.
//
// Plain data and pure functions, no DOM, so the tests can run them in Node.

const FILES = 'abcdefgh';
const sqName = (i) => `${FILES[i % 8]}${Math.floor(i / 8) + 1}`;

/** The 4352 moves: every from-square × to-square (a1 = 0 … h8 = 63), then rank-7 promotions: from file, to file, q r b n. */
function allMoves() {
  const out = [];
  for (let s = 0; s < 64; s += 1) for (let t = 0; t < 64; t += 1) out.push(sqName(s) + sqName(t));
  for (const f of FILES) for (const g of FILES) for (const p of 'qrbn') out.push(`${f}7${g}8${p}`);
  return out;
}

export const MOVES = allMoves();
const INDEX = new Map(MOVES.map((m, i) => [m, i]));
export const TOKEN = 12;

/** e2e4 seen from the other side: e7e5 (a promotion keeps its piece). */
export const mirrorMove = (uci) => `${uci[0]}${9 - Number(uci[1])}${uci[2]}${9 - Number(uci[3])}${uci.slice(4)}`;

/** The move's place in the policy, from the side to move's view; -1 if it has none. */
export function policyIndexOf(uci, black) {
  const i = INDEX.get(black ? mirrorMove(uci) : uci);
  return i === undefined ? -1 : i;
}

const PIECES = 'pnbrqk';

/** The network's input for a FEN: 64 squares × 12 (pawn … king of the mover, then the other side's), flattened. */
export function encodeBoard(fen) {
  const [placement, turn] = String(fen).trim().split(/\s+/);
  const black = turn === 'b';
  const x = new Float32Array(64 * TOKEN);
  const rows = placement.split('/');
  for (let row = 0; row < 8; row += 1) {
    let file = 0;
    for (const ch of rows[row] || '') {
      if (/\d/.test(ch)) {
        file += Number(ch);
        continue;
      }
      const rank = 7 - row; // the FEN starts at rank 8
      const white = ch === ch.toUpperCase();
      const mine = white !== black;
      const r = black ? 7 - rank : rank;
      x[(r * 8 + file) * TOKEN + PIECES.indexOf(ch.toLowerCase()) + (mine ? 0 : 6)] = 1;
      file += 1;
    }
  }
  return x;
}

/** The legal move with the highest policy logit (moves: UCI strings). */
export function bestPolicyMove(moves, logits, black) {
  let best = null;
  let top = -Infinity;
  for (const move of moves) {
    const i = policyIndexOf(move, black);
    if (i >= 0 && logits[i] > top) {
      top = logits[i];
      best = move;
    }
  }
  return best;
}

/** The value head (loss, draw, win for the mover, as logits) as the mover's expected score, 0 to 1. */
export function winChance(value) {
  const m = Math.max(value[0], value[1], value[2]);
  const [l, d, w] = [value[0], value[1], value[2]].map((v) => Math.exp(v - m));
  return (w + d / 2) / (l + d + w);
}
