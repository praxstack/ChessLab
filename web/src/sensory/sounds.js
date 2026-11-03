// Move sounds for the app, played by the puzzle page's own Web Audio synth
// (site/public/assets/sound.js: no sound files, nothing to license). This file
// only decides which of its sounds a board change deserves; the synth is shared.
import {play, buzz, wake, setMuted, isMuted} from '../../../site/public/assets/sound.js';
import {createChess} from '../../../shared/chess.js';

/** The sound names site/public/assets/sound.js knows. */
export const SOUND_NAMES = ['pick', 'move', 'capture', 'castle', 'check', 'nope', 'promote', 'end', 'good', 'hmm'];

const isCapture = move => !!move?.captured || /[ce]/.test(move?.flags || '');
const isCastle = move => /[kq]/.test(move?.flags || '') || /^O-O/.test(move?.san || '');

/**
 * The sound for one move (a chess.js-style verbose move).
 * full: the game is being played: promotion, check, castling and captures each sound different,
 * and a move that ends the game (over) gets the end chime.
 * quiet: stepping through a game in review: only a plain move or a capture.
 */
export function soundForMove(move, {quiet = false, over = false} = {}) {
  if (!move) return null;
  if (quiet) return isCapture(move) ? 'capture' : 'move';
  if (over || /#$/.test(move.san || '')) return 'end';
  if (move.promotion) return 'promote';
  if (/\+$/.test(move.san || '')) return 'check';
  if (isCastle(move)) return 'castle';
  return isCapture(move) ? 'capture' : 'move';
}

// Position, side to move, castling and en passant: the counters don't make a position different.
const positionKey = fen => String(fen || '').trim().split(/\s+/).slice(0, 4).join(' ');

/**
 * The moves that turned the position prevFen into the board's position now: one move, or two
 * when a move and its reply land together (a puzzle answer and the reply). Empty for anything
 * else (a jump through the game, a new game, a step back), which makes no sound.
 */
export function movesSince(prevFen, board, max = 2) {
  if (!prevFen || !board) return [];
  const now = board.fen();
  if (positionKey(now) === positionKey(prevFen)) return [];
  const history = board.history({verbose: true}) || [];
  for (let k = 1; k <= Math.min(max, history.length); k += 1) {
    const first = history[history.length - k];
    if (first?.before && positionKey(first.before) === positionKey(prevFen)) return history.slice(-k);
  }
  // A board built straight from a FEN has no history: look for the one legal move between them.
  try {
    const from = createChess(prevFen, board.variant);
    for (const move of from.moves({verbose: true})) {
      const next = createChess(prevFen, board.variant);
      next.move({from: move.from, to: move.to, promotion: move.promotion});
      if (positionKey(next.fen()) === positionKey(now)) return [{...move, san: next.history().at(-1) || move.san}];
    }
  } catch {
    /* not a position we can read: stay quiet */
  }
  return [];
}

/** The sounds for the moves just made, in order; only the last move can end the game. */
export function soundsForMoves(moves, {quiet = false, over = false} = {}) {
  return moves.map((move, i) => soundForMove(move, {quiet, over: over && i === moves.length - 1})).filter(Boolean);
}

const GAP_MS = 230; // a move and its reply landing together still sound like two moves

/** Play the sounds for these moves, one after another. */
export function playMoves(moves, options = {}) {
  soundsForMoves(moves, options).forEach((name, i) => {
    const go = () => {
      play(name);
      // A tiny tap on Android phones for a capture or a check; iPhones ignore it.
      if (!options.quiet && (name === 'capture' || name === 'check')) buzz(6);
    };
    if (i === 0) go();
    else setTimeout(go, i * GAP_MS);
  });
}

/** One named cue (pick, nope, good, hmm, end...). */
export function cue(name) {
  if (SOUND_NAMES.includes(name)) play(name);
}

/** The app's Move sounds setting drives the synth's mute, so there's one switch, not two. */
export function followSetting(on) {
  if (isMuted() === !on) return;
  setMuted(!on);
}

/**
 * Browsers only allow sound after the first tap or key press: wake the synth then.
 * Returns a function that removes the listeners.
 */
export function wakeOnFirstGesture(target = typeof window === 'undefined' ? null : window) {
  if (!target) return () => {};
  const events = ['pointerdown', 'keydown'];
  const once = () => {
    wake();
    events.forEach(name => target.removeEventListener(name, once, true));
  };
  events.forEach(name => target.addEventListener(name, once, true));
  return () => events.forEach(name => target.removeEventListener(name, once, true));
}
