// DeepMind's "searchless chess" model in the learner's browser: the plain
// functions that turn a position into the model's input and its output back
// into a move and a score. The model itself runs in
// /assets/engine/searchless-worker.js with onnxruntime-web.
//
// The model: "Grandmaster-Level Chess Without Search" (Ruoss et al., 2024),
// weights (c) 2024 DeepMind Technologies Limited, CC BY 4.0,
// https://github.com/google-deepmind/searchless_chess. ONNX conversion by
// cstr (https://huggingface.co/cstr/searchless-chess-onnx). The tokenizer,
// the action list and the bucket values below follow the original
// src/tokenizer.py and src/utils.py (Apache-2.0), rewritten in JavaScript.
//
// The graph: tokens int64 [b, 79] -> log_probs float32 [b, 128]. One row per
// legal move: 77 FEN tokens, the move's action index, then 0. The output is a
// distribution over 128 win-probability buckets; the move's win probability
// is the expected bucket value. The engine plays the legal move with the
// highest win probability, scoring a move that allows a repetition draw as 0.5.
//
// Plain data and pure functions, no DOM, so the tests can run them in Node.

/** tokenizer.py's characters, in order. The black bishop 'b' shares the file letter's token, as in the original. */
export const CHARACTERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'p', 'n', 'r', 'k', 'q', 'P', 'B', 'N', 'R', 'Q', 'K', 'w', '.'];
const INDEX = new Map(CHARACTERS.map((c, i) => [c, i]));
const DOT = INDEX.get('.');
export const SEQUENCE_LENGTH = 77;
export const ROW_LENGTH = SEQUENCE_LENGTH + 2;
export const NUM_BUCKETS = 128;

const tok = (c) => {
  const i = INDEX.get(c);
  if (i === undefined) throw new Error(`Can't read the FEN: unexpected "${c}"`);
  return i;
};

/** The 77 tokens of a FEN, exactly as tokenizer.py makes them. */
export function tokenize(fen) {
  const fields = String(fen).trim().split(/\s+/);
  if (fields.length !== 6) throw new Error('A FEN needs all six fields');
  const [board, side, castling, ep, half, full] = fields;
  const out = [];
  for (const c of side + board.replace(/\//g, '')) {
    if (c >= '1' && c <= '8') for (let i = 0; i < Number(c); i += 1) out.push(DOT);
    else out.push(tok(c));
  }
  if (castling === '-') out.push(DOT, DOT, DOT, DOT);
  else {
    for (const c of castling) out.push(tok(c));
    for (let i = castling.length; i < 4; i += 1) out.push(DOT);
  }
  if (ep === '-') out.push(DOT, DOT);
  else for (const c of ep) out.push(tok(c));
  for (const field of [half, full]) {
    const padded = (field + '...').slice(0, Math.max(3, field.length));
    for (const c of padded) out.push(tok(c));
  }
  if (out.length !== SEQUENCE_LENGTH) throw new Error(`The FEN made ${out.length} tokens, not ${SEQUENCE_LENGTH}`);
  return out;
}

const FILES = 'abcdefgh';
const sq = (f, r) => `${FILES[f]}${r + 1}`;

/** utils.py's ACTION_TO_MOVE: every queen and knight move from every square (a1, b1 … h8), then the promotions. */
function allActions() {
  const moves = [];
  for (let s = 0; s < 64; s += 1) {
    const f = s % 8;
    const r = Math.floor(s / 8);
    const to = [];
    // python-chess lists a piece's attacks as a square set, in square order (a1 = 0 … h8 = 63).
    const queen = new Set();
    for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      for (let k = 1; k < 8; k += 1) {
        const nf = f + df * k;
        const nr = r + dr * k;
        if (nf < 0 || nf > 7 || nr < 0 || nr > 7) break;
        queen.add(nr * 8 + nf);
      }
    }
    to.push(...[...queen].sort((a, b) => a - b));
    const knight = [];
    for (const [df, dr] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) {
      const nf = f + df;
      const nr = r + dr;
      if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) knight.push(nr * 8 + nf);
    }
    to.push(...knight.sort((a, b) => a - b));
    for (const t of to) moves.push(sq(f, r) + sq(t % 8, Math.floor(t / 8)));
  }
  for (const [rank, next] of [['2', '1'], ['7', '8']]) {
    for (let i = 0; i < 8; i += 1) {
      const file = FILES[i];
      const targets = [file];
      if (i > 0) targets.push(FILES[i - 1]);
      if (i < 7) targets.push(FILES[i + 1]);
      for (const t of targets) for (const p of 'qrbn') moves.push(`${file}${rank}${t}${next}${p}`);
    }
  }
  return moves;
}

/** Every move the model knows, by action index (1968 of them). */
export const ACTIONS = allActions();
export const ACTION_INDEX = new Map(ACTIONS.map((m, i) => [m, i]));

/** The value of each win-probability bucket: the middle of 128 equal slices of [0, 1]. */
export const BUCKET_VALUES = Array.from({ length: NUM_BUCKETS }, (_, i) => (i + 0.5) / NUM_BUCKETS);

/** The model's input for one position: one row of 79 tokens for each move (UCI, like e2e4 or a7a8q). */
export function encodeRows(fen, moves) {
  const base = tokenize(fen);
  const data = new BigInt64Array(moves.length * ROW_LENGTH);
  moves.forEach((move, row) => {
    const action = ACTION_INDEX.get(move);
    if (action === undefined) throw new Error(`The model has no action for ${move}`);
    const at = row * ROW_LENGTH;
    for (let i = 0; i < SEQUENCE_LENGTH; i += 1) data[at + i] = BigInt(base[i]);
    data[at + SEQUENCE_LENGTH] = BigInt(action);
    data[at + SEQUENCE_LENGTH + 1] = 0n;
  });
  return data;
}

/** The win probability of row `row` of the output: the expected bucket value. */
export function winProbability(logProbs, row = 0) {
  let p = 0;
  const at = row * NUM_BUCKETS;
  for (let i = 0; i < NUM_BUCKETS; i += 1) p += Math.exp(logProbs[at + i]) * BUCKET_VALUES[i];
  return p;
}

/**
 * A win probability as centipawns for the side to move, by inverting the
 * curve the model was trained with (utils.centipawns_to_win_probability,
 * from Lichess's accuracy page), capped at +/-2000 so a sure win is never a mate.
 */
export function winToCp(p) {
  const q = Math.min(Math.max(p, 1e-4), 1 - 1e-4);
  const cp = Math.round(Math.log(q / (1 - q)) / 0.00368208);
  return Math.max(-2000, Math.min(2000, cp)) || 0;
}

/**
 * The move to play: the highest win probability, where `draws[i]` marks a
 * move that allows a repetition draw (scored 0.5, as the original does).
 * Returns { move, win, cp } or null when there are no moves.
 */
export function pickMove(moves, logProbs, draws = []) {
  let best = null;
  moves.forEach((move, i) => {
    const win = draws[i] ? 0.5 : winProbability(logProbs, i);
    if (!best || win > best.win) best = { move, win };
  });
  return best && { ...best, cp: winToCp(best.win) };
}

/**
 * A FEN as python-chess writes it: the en-passant square only when an
 * en-passant capture is legal. `legal` lists the legal moves as chess.js
 * reports them (with flags; 'e' marks an en-passant capture).
 */
export function cleanFen(fen, legal) {
  const fields = fen.split(' ');
  if (fields[3] !== '-' && !legal.some((m) => m.flags && m.flags.includes('e'))) fields[3] = '-';
  return fields.join(' ');
}
