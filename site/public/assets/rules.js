// Why a move on the desk board isn't allowed, in words a beginner can use.
// chess.js already knows which moves are legal; this works out the reason a
// tried move isn't one: wrong shape, something in the way, a pin, a check,
// or a king stepping into an attack. Pure functions, no DOM, so they run in
// tests too.
import { Chess } from './vendor/chess.js';

const FILES = 'abcdefgh';
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const pieceName = (type) => NAME[type];

const fileOf = (sq) => FILES.indexOf(sq[0]);
const rankOf = (sq) => Number(sq[1]);
const sqAt = (f, r) => `${FILES[f]}${r}`;
const other = (color) => (color === 'w' ? 'b' : 'w');

function kingSquare(chess, color) {
  for (const row of chess.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  return null;
}

/** Squares strictly between two squares on a line, or null if they aren't on one. */
function between(from, to) {
  const df = fileOf(to) - fileOf(from);
  const dr = rankOf(to) - rankOf(from);
  if (!(df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr))) return null;
  const sf = Math.sign(df);
  const sr = Math.sign(dr);
  const out = [];
  for (let f = fileOf(from) + sf, r = rankOf(from) + sr; f !== fileOf(to) || r !== rankOf(to); f += sf, r += sr) out.push(sqAt(f, r));
  return out;
}

/** Can this piece move from -> to by its own pattern, ignoring what's on the board? */
function shapeFits(type, color, from, to) {
  const df = fileOf(to) - fileOf(from);
  const dr = rankOf(to) - rankOf(from);
  const ad = Math.abs(df);
  const ar = Math.abs(dr);
  switch (type) {
    case 'n':
      return (ad === 1 && ar === 2) || (ad === 2 && ar === 1);
    case 'b':
      return ad === ar && ad > 0;
    case 'r':
      return (ad === 0) !== (ar === 0);
    case 'q':
      return (ad === ar && ad > 0) || (ad === 0) !== (ar === 0);
    case 'k':
      return (ad <= 1 && ar <= 1 && ad + ar > 0) || (ar === 0 && ad === 2);
    case 'p': {
      const dir = color === 'w' ? 1 : -1;
      return (dr === dir && ad <= 1) || (dr === 2 * dir && ad === 0);
    }
    default:
      return false;
  }
}

const SHAPE = {
  n: 'A knight moves in an L: two squares one way, then one to the side.',
  b: 'A bishop only moves on diagonals.',
  r: 'A rook only moves in straight lines, along a rank or a file.',
  q: 'A queen moves in straight lines or diagonals, not in jumps.',
  k: 'A king moves one square at a time.',
};

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const piece = (p) => `${p.color === 'w' ? 'white' : 'black'} ${NAME[p.type]}`;
// "your pawn" for the mover's own pieces, "the black pawn" for the other side's.
const whose = (p, me) => (p.color === me ? `your ${NAME[p.type]}` : `the ${piece(p)}`);

/** Why castling from -> to isn't allowed. */
function castleWhy(chess, color, from, to) {
  const home = color === 'w' ? '1' : '8';
  if (from !== `e${home}` || to[1] !== home) return { kind: 'shape', text: SHAPE.k };
  const side = to[0] === 'g' ? 'k' : 'q';
  const rights = chess.getCastlingRights(color);
  if (!rights[side]) {
    return { kind: 'castle', text: 'You can’t castle on this side any more: the king or that rook has already moved.' };
  }
  const rookSq = `${side === 'k' ? 'h' : 'a'}${home}`;
  const gap = between(from, rookSq) || [];
  const inWay = gap.find((sq) => chess.get(sq));
  if (inWay) return { kind: 'blocked', text: `To castle, the squares between the king and rook must be empty. ${cap(whose(chess.get(inWay), color))} on ${inWay} is in the way.`, squares: [inWay] };
  const them = other(color);
  if (chess.inCheck()) {
    const checker = chess.attackers(from, them)[0];
    return { kind: 'check', text: 'You can’t castle while your king is in check.', line: checker ? [checker, from] : null };
  }
  const pass = side === 'k' ? [`f${home}`, `g${home}`] : [`d${home}`, `c${home}`];
  for (const sq of pass) {
    const att = chess.attackers(sq, them)[0];
    if (att) {
      return {
        kind: 'castle',
        text: `You can’t castle through or into an attack. The ${piece(chess.get(att))} on ${att} hits ${sq}.`,
        line: [att, sq],
      };
    }
  }
  return { kind: 'castle', text: 'Castling isn’t allowed here.' };
}

/** Why this pawn move doesn't work, before any king safety. */
function pawnWhy(chess, p, from, to) {
  const dir = p.color === 'w' ? 1 : -1;
  const dr = rankOf(to) - rankOf(from);
  const ad = Math.abs(fileOf(to) - fileOf(from));
  if (Math.sign(dr) === -dir) return { kind: 'shape', text: 'Pawns never move backwards.' };
  if (dr === 0) return { kind: 'shape', text: 'Pawns only move forward.' };
  if (ad > 1 || Math.abs(dr) > 2 || (Math.abs(dr) === 2 && ad > 0)) {
    return { kind: 'shape', text: 'A pawn moves straight forward one square, or takes one square diagonally.' };
  }
  const target = chess.get(to);
  if (ad === 1) {
    const ep = chess.fen().split(' ')[3];
    if (!target && to !== ep) return { kind: 'pawn', text: 'Pawns only move diagonally when they take something.' };
    return null;
  }
  if (Math.abs(dr) === 2) {
    const start = p.color === 'w' ? 2 : 7;
    if (rankOf(from) !== start) return { kind: 'pawn', text: 'A pawn moves two squares only on its very first move.' };
    const mid = sqAt(fileOf(from), rankOf(from) + dir);
    if (chess.get(mid)) return { kind: 'blocked', text: `${cap(whose(chess.get(mid), p.color))} on ${mid} is in the way.`, squares: [mid] };
  }
  if (target) return { kind: 'pawn', text: 'Pawns can’t take straight ahead. They take diagonally.', squares: [to] };
  return null;
}

/**
 * Explain why from -> to isn't a legal move in this position.
 * Returns null when the move is legal (or there's nothing to explain), or
 * { kind, text, line?: [from, to], squares?: [...] }, where `line` is a
 * square-to-square line worth drawing (the attacker to the king it hits)
 * and `squares` are squares worth circling.
 */
export function whyNot(chess, from, to) {
  if (from === to) return null;
  const p = chess.get(from);
  if (!p) return null;
  if (p.color !== chess.turn()) return { kind: 'turn', text: `It’s ${chess.turn() === 'w' ? 'White' : 'Black'}’s move.` };
  const legal = chess.moves({ square: from, verbose: true });
  if (legal.some((m) => m.to === to)) return null;

  const target = chess.get(to);
  if (target && target.color === p.color) return { kind: 'own', text: `Your own ${NAME[target.type]} is already on ${to}.` };

  // The king two squares sideways is a castling try.
  if (p.type === 'k' && rankOf(from) === rankOf(to) && Math.abs(fileOf(to) - fileOf(from)) === 2) return castleWhy(chess, p.color, from, to);

  if (p.type === 'p') {
    const why = pawnWhy(chess, p, from, to);
    if (why) return why;
  } else {
    if (!shapeFits(p.type, p.color, from, to)) return { kind: 'shape', text: SHAPE[p.type] };
    if (p.type !== 'n') {
      const block = (between(from, to) || []).find((sq) => chess.get(sq));
      if (block) return { kind: 'blocked', text: `The ${NAME[p.type]} can’t jump over ${whose(chess.get(block), p.color)} on ${block}.`, squares: [block] };
    }
  }

  // The move fits the piece. It's illegal only because of the king: play it on
  // a scratch board and see what would attack the king.
  const them = other(p.color);
  const scratch = new Chess(chess.fen(), { skipValidation: true });
  scratch.remove(from);
  scratch.remove(to);
  const ep = chess.fen().split(' ')[3];
  if (p.type === 'p' && to === ep && !target) scratch.remove(sqAt(fileOf(to), rankOf(from)));
  scratch.put({ type: p.type, color: p.color }, to);
  const king = p.type === 'k' ? to : kingSquare(scratch, p.color);
  if (!king) return null;
  const hits = scratch.attackers(king, them);
  if (!hits.length) return null; // shouldn't happen: chess.js said no, but nothing attacks the king

  if (p.type === 'k') {
    const by = hits[0];
    return { kind: 'king', text: `Your king can’t step onto ${to}. The ${piece(scratch.get(by))} on ${by} guards it.`, line: [by, to] };
  }

  const ownKing = kingSquare(chess, p.color);
  const checkers = chess.inCheck() ? chess.attackers(ownKing, them) : [];
  // An attacker that only reaches the king once this piece moves away: a pin.
  const opened = hits.find((sq) => !checkers.includes(sq));
  if (opened) {
    return {
      kind: 'pin',
      text: `That ${NAME[p.type]} is pinned. If it moves, the ${NAME[scratch.get(opened).type]} on ${opened} would be attacking your king.`,
      line: [opened, ownKing],
      squares: [from],
    };
  }
  const by = checkers[0];
  return {
    kind: 'check',
    text: `Your king is in check from the ${NAME[chess.get(by).type]} on ${by}. Move the king, block the line, or take the checking piece.`,
    line: [by, ownKing],
  };
}

/** A short line about the position after a move: check, mate, draw, or nothing. */
export function positionNote(chess) {
  const side = chess.turn() === 'w' ? 'White' : 'Black';
  if (chess.isCheckmate()) return { tone: 'red', text: `Checkmate. ${side === 'White' ? 'Black' : 'White'} wins.` };
  if (chess.isStalemate()) return { tone: 'blue', text: `Stalemate: ${side} has no legal move and isn’t in check. It’s a draw.` };
  if (chess.isInsufficientMaterial()) return { tone: 'blue', text: 'Neither side has enough pieces left to mate. It’s a draw.' };
  if (chess.isThreefoldRepetition()) return { tone: 'blue', text: 'The same position three times: a draw.' };
  if (chess.isDraw()) return { tone: 'blue', text: 'That’s a draw by the fifty-move rule.' };
  if (chess.inCheck()) return { tone: 'red', text: `Check! ${side} must get out of it.` };
  return null;
}
