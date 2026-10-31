// Coach check: the engine judges a numbered line the learner drew, move by
// move, and stops at the first move that fails. It never hands the learner a
// line of its own: a failed move of theirs only gets "there's a stronger move",
// and a weak reply they expected from the other side gets the reply that holds
// ("2…Kg6! holds"), because that is the refutation of their idea.
//
// Pure (chess.js and the engine's grade only), so node --test covers it.
import { Chess } from './vendor/chess.js';
import { grade, toCp } from './engine.js';

const SIDE = { w: 'White', b: 'Black' };

/** A step as the engine writes moves: e2e4, e7e8q. */
export const uci = (s) => `${s.from}${s.to}${s.promotion || ''}`;

/** "2. Qh6" or "2…Kg6": the step's move number and its SAN, from the line's start position. */
export function stepLabel(fen, i, san) {
  const parts = (fen || '').split(/\s+/);
  const first = Number(parts[5]) || 1;
  const blackFirst = parts[1] === 'b';
  const ply = i + (blackFirst ? 1 : 0); // half-moves since White's move of the first move number
  const n = first + Math.floor(ply / 2);
  return ply % 2 === 0 ? `${n}. ${san}` : `${n}… ${san}`;
}

/** How a position ends the game, if it does: 'mate', 'draw' or null. */
export function ending(fen) {
  let g;
  try {
    g = new Chess(fen);
  } catch {
    return null;
  }
  if (g.isCheckmate()) return 'mate';
  if (g.isDraw()) return 'draw';
  return null;
}

/** SAN for an engine move in a position, or the raw move if it can't be read. */
function sanOf(fen, move) {
  try {
    const g = new Chess(fen);
    return g.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] || undefined }).san;
  } catch {
    return move;
  }
}

/**
 * Judge one step. before: the engine's look at the position the step is played
 * in; after: its look at the position after it (or null when the step ends the
 * game, given in ended). Returns the grade ('best' | 'good' | 'ok' | 'miss').
 */
export function judgeStep({ step, before, after, ended }) {
  const playedBest = before.move === uci(step);
  let afterCp;
  if (ended === 'mate') afterCp = toCp({ mate: 0 });
  else if (ended === 'draw') afterCp = 0;
  else if (playedBest) afterCp = 0; // not used: the best move is graded best whatever comes after
  else afterCp = toCp(after.score);
  return grade({ bestCp: toCp(before.score), afterCp, playedBest });
}

/** A step fails when it gives away more than a good move would. */
export const fails = (verdict) => verdict === 'ok' || verdict === 'miss';

/**
 * The note for a failed step. fen: the position the step was played in;
 * learner: the side that moves first in the line (the learner's side);
 * before: the engine's look at that position.
 */
export function failNote({ start, i, step, fen, learner, verdict, before }) {
  const side = fen.split(/\s+/)[1] === 'b' ? 'b' : 'w';
  const label = stepLabel(start, i, step.san);
  if (side === learner) {
    return verdict === 'miss'
      ? `✗ ${label}? This lets it slip. Look again from here: checks, captures, threats.`
      : `✗ ${label}? Playable, but there’s a stronger move here. Look again from here.`;
  }
  const reply = before.move ? sanOf(fen, before.move) : '';
  const better = reply ? stepLabel(start, i, `${reply}!`) : '';
  return reply
    ? `✗ ${label}? ${SIDE[side]} has a better reply: ${better} holds.`
    : `✗ ${label}? ${SIDE[side]} has a better reply here.`;
}

/** The note when every step holds. */
export function passNote({ start, steps, endedWith }) {
  const n = steps.length;
  const last = stepLabel(start, n - 1, steps[n - 1].san);
  if (endedWith === 'mate') return `✓ Your line holds all the way, and ${last} is mate.`;
  if (endedWith === 'draw') return `✓ Your line holds, and it ends in a draw after ${last}.`;
  return n === 1 ? `✓ ${last} holds up.` : `✓ All ${n} moves hold up, through ${last}.`;
}

/**
 * Check a whole line with an engine. look(fen, moves) answers like
 * engine.look: { move, score } for the side to move. Stops at the first step
 * that fails. Returns { fail: index or -1, verdicts, note }.
 * alive() is asked between looks; when it says no, the check stops with null.
 */
export async function checkLine({ start, steps, fens, look, alive = () => true }) {
  const learner = start.split(/\s+/)[1] === 'b' ? 'b' : 'w';
  const moves = steps.map(uci);
  const verdicts = [];
  let before = await look(start, []);
  for (let i = 0; i < steps.length; i += 1) {
    if (!alive()) return null;
    const fen = i === 0 ? start : fens[i - 1];
    const ended = ending(fens[i]);
    const best = before.move === moves[i];
    const after = ended || best ? null : await look(start, moves.slice(0, i + 1));
    if (!alive()) return null;
    const verdict = judgeStep({ step: steps[i], before, after, ended });
    verdicts.push(verdict);
    if (fails(verdict)) {
      return { fail: i, verdicts, note: failNote({ start, i, step: steps[i], fen, learner, verdict, before }) };
    }
    if (ended) return { fail: -1, verdicts, note: passNote({ start, steps: steps.slice(0, i + 1), endedWith: ended }) };
    // The next step's "before" is this step's "after"; when this step was the
    // engine's own best move it wasn't looked at yet.
    before = after || (i + 1 < steps.length ? await look(start, moves.slice(0, i + 1)) : null);
  }
  return { fail: -1, verdicts, note: passNote({ start, steps, endedWith: null }) };
}
