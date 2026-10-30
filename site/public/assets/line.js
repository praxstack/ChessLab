// A numbered line drawn over the puzzle board: the learner's own guess at the
// moves, checked for legality one by one from the position it started in.
// Pure (chess.js only), so node --test covers it.
import { Chess } from './vendor/chess.js';

const SIDE = { w: 'White', b: 'Black' };

function game(fen) {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}

/** Replay the steps from fen: each position after a step, and how far the line holds. */
export function replay(fen, steps) {
  const g = game(fen);
  if (!g) return { fens: [], ok: 0 };
  const fens = [];
  let ok = 0;
  for (const s of steps) {
    try {
      g.move({ from: s.from, to: s.to, promotion: s.promotion || 'q' });
    } catch {
      break;
    }
    fens.push(g.fen());
    ok += 1;
  }
  return { fens, ok };
}

/**
 * The next step of a line, or why it can't be one. Pawns that reach the end
 * become queens (the line is a sketch; under-promotion can wait).
 */
export function nextStep(fen, steps, from, to) {
  const g = game(fen);
  if (!g) return { error: 'This position can’t be played, so a line can’t be checked.' };
  for (const s of steps) {
    try {
      g.move({ from: s.from, to: s.to, promotion: s.promotion || 'q' });
    } catch {
      return { error: 'The line above no longer fits the board. Clear it and start again.' };
    }
  }
  const p = g.get(from);
  if (!p) return { error: `There’s no piece on ${from} at this point in your line.` };
  if (p.color !== g.turn()) return { error: `${SIDE[g.turn()]} moves next in your line.` };
  let m;
  try {
    m = g.move({ from, to, promotion: 'q' });
  } catch {
    return { error: `That piece can’t go to ${to} there.` };
  }
  return { from, to, promotion: m.promotion || undefined, san: m.san, side: m.color, n: steps.length + 1 };
}

/** The line as move text: "1. Nxe6 fxe6 2. Qd8+", or "1… Kg7 2. Qh6" when Black starts. */
export function lineText(fen, steps) {
  const parts = (fen || '').split(/\s+/);
  let move = Number(parts[5]) || 1;
  let side = parts[1] === 'b' ? 'b' : 'w';
  const out = [];
  steps.forEach((s, i) => {
    if (side === 'w') out.push(`${move}. ${s.san}`);
    else out.push(i === 0 ? `${move}… ${s.san}` : s.san);
    if (side === 'b') move += 1;
    side = side === 'w' ? 'b' : 'w';
  });
  return out.join(' ');
}
