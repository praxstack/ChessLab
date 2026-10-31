// Maia-2 (CSSLab, University of Toronto, MIT) in the learner's browser: the
// plain functions that turn a position into the network's input and its 1880
// policy outputs back into a move. Written from the published maia2 0.11.0
// Python package (utils.board_to_tensor, get_all_possible_moves,
// map_to_category, mirror_move; inference.preprocessing).
//
// The network always sees the board from the side to move, as White: when
// Black is to move the board is mirrored (ranks flipped, colours swapped),
// and its chosen move is mirrored back. The rating goes in as one of 11
// buckets: under 1100, 1100-1199, …, 1900-1999, 2000 and up.
//
// Plain data and pure functions, no DOM, so the tests can run them in Node.

const FILES = 'abcdefgh';
const sqName = (i) => `${FILES[i % 8]}${Math.floor(i / 8) + 1}`;

/**
 * The 1880 moves, in the network's order: from each square a1, b1, … h8, a
 * lone queen's moves then a lone knight's, each list from h8 down to a1 (the
 * order python-chess makes them in); then White's promotions on rank 7 to
 * queen, rook, bishop and knight, straight on then capturing left and right.
 */
function allMoves() {
  const out = [];
  for (let s = 0; s < 64; s += 1) {
    const f = s % 8;
    const r = Math.floor(s / 8);
    const queen = [];
    const knight = [];
    for (let t = 63; t >= 0; t -= 1) {
      if (t === s) continue;
      const df = (t % 8) - f;
      const dr = Math.floor(t / 8) - r;
      if (df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr)) queen.push(t);
      if ((Math.abs(df) === 1 && Math.abs(dr) === 2) || (Math.abs(df) === 2 && Math.abs(dr) === 1)) knight.push(t);
    }
    for (const t of [...queen, ...knight]) out.push(sqName(s) + sqName(t));
  }
  for (let f = 0; f < 8; f += 1) {
    const to = [f, ...(f > 0 ? [f - 1] : []), ...(f < 7 ? [f + 1] : [])];
    for (const t of to) for (const p of 'qrbn') out.push(`${FILES[f]}7${FILES[t]}8${p}`);
  }
  return out;
}

export const MOVES = allMoves();
const INDEX = new Map(MOVES.map((m, i) => [m, i]));
export const CHANNELS = 18;

/** A rating as the network's bucket, 0 to 10. */
export function eloBucket(elo) {
  const n = Number(elo);
  if (!(n >= 1100)) return 0;
  if (n >= 2000) return 10;
  return 1 + Math.floor((n - 1100) / 100);
}

/** e2e4 seen from the other side: e7e5 (a promotion keeps its piece). */
export const mirrorMove = (uci) => `${uci[0]}${9 - Number(uci[1])}${uci[2]}${9 - Number(uci[3])}${uci.slice(4)}`;

/** The move's place in the policy, from the side to move's view; -1 if it has none. */
export function policyIndexOf(uci, black) {
  const i = INDEX.get(black ? mirrorMove(uci) : uci);
  return i === undefined ? -1 : i;
}

const PIECES = 'pnbrqk';

/**
 * The network's input for a FEN: 18 planes of 8×8, flattened (plane, rank,
 * file). Planes 0–5 the mover's pawns … king, 6–11 the other side's, 12 "the
 * mover is to move" (always 1 after mirroring), 13–16 castling rights (the
 * mover's king side, queen side, then the other side's), 17 the en-passant square.
 */
export function encodeBoard(fen) {
  const [placement, turn, castling = '-', ep = '-'] = String(fen).trim().split(/\s+/);
  const black = turn === 'b';
  const x = new Float32Array(CHANNELS * 64);
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
      const mine = white !== black; // mirrored for Black: the mover's pieces are "White"
      const r = black ? 7 - rank : rank;
      const plane = PIECES.indexOf(ch.toLowerCase()) + (mine ? 0 : 6);
      x[plane * 64 + r * 8 + file] = 1;
      file += 1;
    }
  }
  x.fill(1, 12 * 64, 13 * 64);
  const rights = black ? ['k', 'q', 'K', 'Q'] : ['K', 'Q', 'k', 'q'];
  rights.forEach((c, i) => {
    if (castling.includes(c)) x.fill(1, (13 + i) * 64, (14 + i) * 64);
  });
  if (ep && ep !== '-') {
    const f = FILES.indexOf(ep[0]);
    const rank = Number(ep[1]) - 1;
    x[17 * 64 + (black ? 7 - rank : rank) * 8 + f] = 1;
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

/** Maia-2's value output as the mover's chance of winning, 0 to 1 (as its own inference code reads it). */
export const winChance = (value) => Math.min(1, Math.max(0, value / 2 + 0.5));
