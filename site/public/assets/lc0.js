// Leela-style (Lc0) networks in the learner's browser: the plain functions that
// turn a game into the network's 112 input planes and its 1858 policy outputs
// back into moves. Maia-1 (CSSLab, GPL-3.0) is an Lc0 network trained to play
// like humans of one rating; /assets/engine/maia-worker.js runs it with
// onnxruntime-web. Written from Lc0's classical input format
// (INPUT_CLASSICAL_112_PLANE) and its policy index, as listed by lczerolens
// (constants.py) and used by leela2onnx's /input/planes and /output/policy.
//
// Plain data and pure functions, no DOM, so the tests can run them in Node.

const FILES = 'abcdefgh';
const sqName = (i) => `${FILES[i % 8]}${Math.floor(i / 8) + 1}`;

/** Lc0's 1858 policy moves: from each square (a1 … h8) every queen and knight move, in square order; then the promotions to queen, rook and bishop (a knight promotion is the plain move). */
function policyIndex() {
  const moves = [];
  for (let s = 0; s < 64; s += 1) {
    const f = s % 8;
    const r = Math.floor(s / 8);
    const to = [];
    for (let t = 0; t < 64; t += 1) {
      if (t === s) continue;
      const df = (t % 8) - f;
      const dr = Math.floor(t / 8) - r;
      const queen = df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr);
      const knight = (Math.abs(df) === 1 && Math.abs(dr) === 2) || (Math.abs(df) === 2 && Math.abs(dr) === 1);
      if (queen || knight) to.push(t);
    }
    for (const t of to) moves.push(sqName(s) + sqName(t));
  }
  for (let f = 0; f < 8; f += 1) {
    for (let tf = Math.max(0, f - 1); tf <= Math.min(7, f + 1); tf += 1) {
      for (const p of 'qrb') moves.push(`${FILES[f]}7${FILES[tf]}8${p}`);
    }
  }
  return moves;
}

export const POLICY_INDEX = policyIndex();
export const POLICY_SIZE = POLICY_INDEX.length; // 1858
const POLICY_AT = new Map(POLICY_INDEX.map((m, i) => [m, i]));
export const PLANES = 112;
const HISTORY = 8;
const PIECES = 'pnbrqk';

const mirrorSquare = (sq) => `${sq[0]}${9 - Number(sq[1])}`;

/**
 * A move (UCI, from the real board) as the network's policy index. The
 * network always sees the board from the side to move, so Black's moves are
 * mirrored; a knight promotion is the plain move; castling is the king's
 * two-square move, as in UCI.
 */
export function policyIndexOf(uci, black) {
  let from = uci.slice(0, 2);
  let to = uci.slice(2, 4);
  if (black) {
    from = mirrorSquare(from);
    to = mirrorSquare(to);
  }
  const promo = uci[4] && uci[4] !== 'n' ? uci[4] : '';
  const i = POLICY_AT.get(from + to + promo);
  return i === undefined ? -1 : i;
}

/** The board part of a FEN as a map from square ('e4') to piece ('P', 'k' …). */
function boardOf(fen) {
  const map = new Map();
  fen
    .split(' ')[0]
    .split('/')
    .forEach((row, i) => {
      let f = 0;
      for (const c of row) {
        if (c >= '1' && c <= '8') f += Number(c);
        else {
          map.set(`${FILES[f]}${8 - i}`, c);
          f += 1;
        }
      }
    });
  return map;
}

const keyOf = (fen) => fen.split(' ').slice(0, 4).join(' ');

/**
 * The 112 input planes, as a Float32Array of 112 x 8 x 8 (plane, rank, file).
 * `fens` is the game so far, oldest first, ending with the position to move
 * in. Eight positions of history (13 planes each: our six pieces, their six,
 * and "seen before"), all from the side to move, mirrored when it is Black;
 * when the game is shorter, the oldest position is repeated, as Lc0 does for a
 * game that starts from a FEN. Then our and their castling rights (queen side
 * first), Black to move, the 50-move counter (raw half-moves),
 * a plane of zeros and a plane of ones.
 */
export function encodePlanes(fens) {
  const out = new Float32Array(PLANES * 64);
  const last = fens[fens.length - 1];
  const fields = last.split(' ');
  const black = fields[1] === 'b';
  const fill = (plane, value = 1) => out.fill(value, plane * 64, plane * 64 + 64);
  const set = (plane, sq) => {
    const real = black ? mirrorSquare(sq) : sq;
    out[plane * 64 + (Number(real[1]) - 1) * 8 + FILES.indexOf(real[0])] = 1;
  };
  const seen = new Map();
  const repeated = fens.map((f) => {
    const k = keyOf(f);
    const n = seen.get(k) || 0;
    seen.set(k, n + 1);
    return n > 0;
  });
  for (let h = 0; h < HISTORY; h += 1) {
    const at = Math.max(0, fens.length - 1 - h);
    const base = h * 13;
    for (const [sq, piece] of boardOf(fens[at])) {
      const white = piece === piece.toUpperCase();
      const ours = white !== black;
      set(base + (ours ? 0 : 6) + PIECES.indexOf(piece.toLowerCase()), sq);
    }
    if (repeated[at]) fill(base + 12);
  }
  const castling = fields[2];
  const [ourK, ourQ, theirK, theirQ] = black ? ['k', 'q', 'K', 'Q'] : ['K', 'Q', 'k', 'q'];
  if (castling.includes(ourQ)) fill(104);
  if (castling.includes(ourK)) fill(105);
  if (castling.includes(theirQ)) fill(106);
  if (castling.includes(theirK)) fill(107);
  if (black) fill(108);
  fill(109, Number(fields[4]) || 0); // Lc0 nets take the raw half-move count
  fill(111);
  return out;
}

/** The legal move the network rates highest: { move, index } (null without moves). */
export function bestPolicyMove(moves, logits, black) {
  let best = null;
  for (const m of moves) {
    // A move may carry the key the net knows it by (castling: { move: 'e1g1', key: 'e1h1' }).
    const move = typeof m === 'string' ? m : m.move;
    const i = policyIndexOf(typeof m === 'string' ? m : m.key, black);
    if (i < 0) continue;
    if (!best || logits[i] > logits[best.index]) best = { move, index: i };
  }
  return best;
}

/** Win, draw, loss for the side to move, as probabilities (the network may give them before or after softmax). */
export function wdlProbabilities(wdl) {
  const v = Array.from(wdl.slice(0, 3));
  const sum = v[0] + v[1] + v[2];
  if (v.every((x) => x >= 0 && x <= 1) && Math.abs(sum - 1) < 1e-3) return v;
  const m = Math.max(...v);
  const e = v.map((x) => Math.exp(x - m));
  const t = e[0] + e[1] + e[2];
  return e.map((x) => x / t);
}

/** Lc0 nets encode castling as the king taking its own rook. */
export function castlingKey({ from, to, flags = '', color }) {
  if (!flags.includes('k') && !flags.includes('q')) return from + to;
  const rank = color === 'b' ? '8' : '1';
  return `${from}${flags.includes('k') ? 'h' : 'a'}${rank}`;
}
