import {copyChess, gameVariant} from '../../../shared/chess.js';
import {replay} from '../../../shared/replay.js';

// The coach until the browser coach client is wired in: it never calls Claude and answers every
// "Explain why" with the engine summary, the way the server answers an account it does not cover
// (fallbackReason 'not_covered'). Same answer fields as server/coach-explain.mjs.
const failure = (status, message) => Object.assign(new Error(message), {status});
const sideName = color => color === 'w' ? 'White' : 'Black';
const uciOf = move => move.from + move.to + (move.promotion || '');

export function parseAskedMove(board, question) {
  if (typeof question !== 'string' || !question.trim() || question.length > 60) throw failure(400, 'Ask about one move, for example: why not Nf3?');
  const cleaned = question.trim().replace(/^(?:why\s+not|what\s+about|how\s+about|and|but)\s+/i, '').replace(/[?!.,;:\s]+$/, '').trim();
  const copy = copyChess(board);
  try {
    const move = /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(cleaned)
      ? copy.move({from:cleaned.slice(0, 2).toLowerCase(), to:cleaned.slice(2, 4).toLowerCase(), ...(cleaned[4] ? {promotion:cleaned[4].toLowerCase()} : {})})
      : copy.move(cleaned.replace(/^0-0-0$/, 'O-O-O').replace(/^0-0$/, 'O-O'));
    if (!move) throw new Error('illegal');
    return {uci:uciOf(move), san:move.san};
  } catch {
    throw failure(400, `${cleaned.slice(0, 12) || 'That'} is not a legal move for ${sideName(board.turn())} here. Ask about a legal move, for example: why not ${board.moves()[0] ?? 'a different move'}?`);
  }
}

function firstSan(board, line) {
  const move = line?.moves?.[0];
  if (!move) return null;
  try { return copyChess(board).move({from:move.slice(0, 2), to:move.slice(2, 4), ...(move[4] ? {promotion:move[4]} : {})}).san; }
  catch { throw failure(503, 'The engine line did not replay legally. Try the explanation again.'); }
}

const pawns = score => score?.type === 'cp' && Number.isFinite(score.value) ? `${score.value >= 0 ? '+' : ''}${(score.value / 100).toFixed(2)}` : null;

export function engineAnswer({analysis, moves = [], initialFen = null, variant, asked = null}, reason) {
  if (!analysis || typeof analysis !== 'object') throw failure(503, 'No engine evidence is available for this position.');
  const board = replay(moves, initialFen, variant);
  if (analysis.fen && analysis.fen !== board.fen()) throw failure(503, 'The engine evidence does not match this position. Reload the review.');
  const lines = Array.isArray(analysis.lines) ? analysis.lines.slice(0, 3) : [];
  const best = firstSan(board, lines[0]);
  let played = null;
  if (analysis.played?.move) {
    try { played = copyChess(board).move({from:analysis.played.move.slice(0, 2), to:analysis.played.move.slice(2, 4), ...(analysis.played.move[4] ? {promotion:analysis.played.move[4]} : {})}).san; }
    catch { throw failure(503, 'The reviewed move does not match this position.'); }
  }
  let text = analysis.played?.explanation || analysis.explanation || '';
  if (asked && played && best) text = `${text} The engine preferred ${best} at these limits${pawns(lines[0].score) ? ` (${pawns(lines[0].score)})` : ''}.`.trim();
  const receipt = {engine:analysis.engine || 'Chess engine', movetimeMs:analysis.limits?.movetime ?? null, depth:lines[0]?.depth ?? null, lines:lines.length};
  return {question:asked?.san ?? null, bestMove:best, subject:played ?? best, receipt, source:'engine', text, citedMoves:[], fallbackReason:best || played ? reason : 'no_evidence'};
}

export function createEngineOnlyCoach() {
  return {
    status: () => ({enabled:false}),
    covered: () => false,
    engineMovetime: 800,
    remember: () => undefined,
    recall: () => null,
    async explain(input) {
      try { gameVariant(input.variant); } catch (error) { throw failure(400, error.message); }
      return engineAnswer(input, 'not_covered');
    },
  };
}
