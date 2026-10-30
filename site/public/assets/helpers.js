// Tap-only helpers over the puzzle board. Each answers one question about the
// position as it stands, never which move is best:
//   reach(fen, sq)  where can this piece go?
//   loose(fen, c)   which of this side's pieces are attacked and not defended enough?
//   guard(fen, sq)  how many pieces attack and defend this square?
// Pure (chess.js only), so node --test covers them.
import { Chess } from './vendor/chess.js';

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const SIDE = { w: 'White', b: 'Black' };
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function game(fen) {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}

/** The same position with the other side to move (no en passant), or null if that isn't a legal position. */
function turned(fen, color) {
  const parts = fen.split(/\s+/);
  if (parts[1] === color) return game(fen);
  parts[1] = color;
  parts[3] = '-';
  return game(parts.join(' '));
}

/**
 * Where the piece on sq can legally go, whoever's move it is: the squares, and
 * which of them take something. Empty when there's no piece or no move.
 */
export function reach(fen, sq) {
  const g = game(fen);
  const p = g && g.get(sq);
  if (!p) return { piece: null, to: [], takes: [] };
  const h = turned(fen, p.color);
  // With the turn flipped, the side not to move may be giving check, and chess.js
  // would then offer "taking the king". That's never a move, so it's left out.
  const moves = h ? h.moves({ square: sq, verbose: true }).filter((m) => m.captured !== 'k') : [];
  const to = [...new Set(moves.map((m) => m.to))];
  const takes = [...new Set(moves.filter((m) => m.captured).map((m) => m.to))];
  return { piece: p, to, takes };
}

/**
 * This side's pieces (king aside) that are attacked and not defended at all,
 * attacked more times than defended, or attacked by something worth less: the
 * usual "what's hanging?" check.
 */
export function loose(fen, color) {
  const g = game(fen);
  if (!g) return [];
  const enemy = color === 'w' ? 'b' : 'w';
  const out = [];
  for (const row of g.board()) {
    for (const p of row) {
      if (!p || p.color !== color || p.type === 'k') continue;
      const attackers = g.attackers(p.square, enemy);
      if (!attackers.length) continue;
      const defenders = g.attackers(p.square, color);
      const cheapest = Math.min(...attackers.map((s) => VALUE[g.get(s).type]));
      if (!defenders.length || attackers.length > defenders.length || cheapest < VALUE[p.type]) out.push(p.square);
    }
  }
  return out;
}

/**
 * Who attacks and defends a square. On a piece: attackers are the other side,
 * defenders its own. On an empty square: White's and Black's pieces that hit it.
 */
export function guard(fen, sq) {
  const g = game(fen);
  if (!g) return null;
  const p = g.get(sq);
  const white = g.attackers(sq, 'w').length;
  const black = g.attackers(sq, 'b').length;
  if (!p) return { sq, empty: true, white, black, text: `${sq}: White hits it ${times(white)}, Black ${times(black)}.` };
  const own = p.color === 'w' ? white : black;
  const them = p.color === 'w' ? black : white;
  // Same rule as loose(): counts alone don't hold a piece that a cheaper one attacks.
  const enemy = p.color === 'w' ? 'b' : 'w';
  const cheaper = p.type !== 'k' && g.attackers(sq, enemy).some((s) => VALUE[g.get(s).type] < VALUE[p.type]);
  const verdict = them === 0 ? 'safe for now' : own === 0 ? 'hanging' : own < them ? 'short of defenders' : cheaper ? 'but a cheaper piece attacks it' : 'held';
  return {
    sq,
    empty: false,
    attackers: them,
    defenders: own,
    short: them > 0 && (own < them || cheaper),
    text: `${SIDE[p.color]}’s ${NAME[p.type]} on ${sq}: attacked ${times(them)}, defended ${times(own)}, ${verdict}.`,
  };
}

function times(n) {
  return n === 0 ? 'no times' : n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`;
}
