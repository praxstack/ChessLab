import {replay} from '../../../../shared/replay.js';
import {canceled} from './engine.js';

// Endgames with 7 or fewer pieces from the Lichess tablebase, when the network allows it.
// Any failure (offline, timeout, rate limit, unexpected answer) returns null and the engine
// searches instead; the learner never sees a tablebase error.
export const TABLEBASE_URL = 'https://tablebase.lichess.ovh/standard';
export const TABLEBASE_NAME = 'Lichess tablebase';
const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
// A tablebase win without a known mate distance is scored like Stockfish scores one: far above
// any material count, a little less the longer the win takes.
const TB_WIN = 20000;

const pieceCount = fen => (fen.split(' ')[0].match(/[pnbrqk]/gi) || []).length;
// Positions with castling rights are not in the tables; with no rights, a Chess960 position plays
// exactly like a standard one.
export const tablebaseCovers = fen => pieceCount(fen) <= 7 && fen.split(' ')[2] === '-';

// One move's result for the side that plays it. Lichess reports a move's category and distances
// from the opponent's side after the move, so a "loss" there is a win here.
function moveScore(move) {
  if (move.checkmate) return {type: 'mate', value: 1};
  if (move.stalemate || move.insufficient_material) return {type: 'cp', value: 0};
  const category = String(move.category || '');
  const outcome = /^(?:loss|syzygy-loss|maybe-loss)$/.test(category) ? 1 : /^(?:win|syzygy-win|maybe-win)$/.test(category) ? -1 : /^(?:draw|cursed-win|blessed-loss)$/.test(category) ? 0 : null;
  if (outcome === null) return null;
  if (outcome === 0) return {type: 'cp', value: 0};
  // dtm and dtz count plies from the position after the move, so the move itself adds one.
  if (Number.isInteger(move.dtm) && /^(?:win|loss)$/.test(category)) {
    const plies = Math.abs(move.dtm) + 1;
    return {type: 'mate', value: outcome > 0 ? Math.ceil(plies / 2) : -Math.floor(plies / 2)};
  }
  const plies = Number.isInteger(move.dtz) ? Math.min(Math.abs(move.dtz) + 1, 1000) : 1000;
  return {type: 'cp', value: outcome * (TB_WIN - plies)};
}

// Turns a Lichess answer into engine lines (one move each, best first, scores from White's side).
// Returns null when any reported move has an unknown result, so the engine decides instead.
export function tablebaseLines(answer, turn, count) {
  if (!answer || !Array.isArray(answer.moves) || !answer.moves.length) return null;
  const sign = turn === 'w' ? 1 : -1, lines = [];
  for (const move of answer.moves.slice(0, count)) {
    if (!UCI_MOVE.test(move?.uci || '')) return null;
    const score = moveScore(move);
    if (!score) return null;
    lines.push({moves: [move.uci], score: {type: score.type, value: sign * score.value}, depth: null});
  }
  return lines;
}

export function createTablebase({fetch: get = (...args) => globalThis.fetch(...args), timeout = 2000, url = TABLEBASE_URL, cacheSize = 256, pause = 60000, now = Date.now, online = () => globalThis.navigator?.onLine !== false} = {}) {
  const cache = new Map();
  let pausedUntil = 0;

  // The raw Lichess answer for a FEN, or null. The caller's signal cancels; the timeout gives up.
  async function lookup(fen, signal) {
    if (cache.has(fen)) return cache.get(fen);
    if (now() < pausedUntil || !online()) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const forward = () => controller.abort();
    signal?.addEventListener('abort', forward, {once: true});
    try {
      const response = await get(`${url}?fen=${encodeURIComponent(fen)}`, {signal: controller.signal, headers: {accept: 'application/json'}});
      // Lichess asks clients to wait a minute after a 429.
      if (response.status === 429) pausedUntil = now() + pause;
      if (!response.ok) return null;
      const answer = await response.json();
      cache.set(fen, answer);
      if (cache.size > cacheSize) cache.delete(cache.keys().next().value);
      return answer;
    } catch {
      // A timeout or network error pauses lookups too, so a hanging connection does not add the
      // timeout to every endgame position. A cancel by the caller says nothing about the network.
      if (!signal?.aborted) pausedUntil = now() + pause;
      return null;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forward);
    }
  }

  return {
    lookup,
    // Engine-shaped analysis for {fen, moves, variant, lines, signal}, or null to fall back.
    async analyze({fen, moves = [], variant, lines = 1, signal}) {
      let board;
      try { board = replay(moves, fen, variant); } catch { return null; }
      const position = board.fen();
      if (board.isGameOver() || !tablebaseCovers(position)) return null;
      const answer = await lookup(position, signal);
      if (signal?.aborted) throw canceled();
      const found = tablebaseLines(answer, board.turn(), lines);
      if (!found) return null;
      return {engine: TABLEBASE_NAME, bestmove: found[0].moves[0], lines: found, tablebaseHits: 1};
    },
  };
}

// The browser engine with tablebase answers for full-strength analysis. Weakened searches and bot
// moves stay with Stockfish so a bot does not play perfect endgames.
export function withTablebase(engine, tablebase) {
  return {
    ...engine,
    status: () => engine.status(),
    stop: () => engine.stop(),
    async analyze(input) {
      if ((input.skill ?? 20) >= 20) {
        const found = await tablebase.analyze(input);
        if (found) return {...found, limits: {movetime: input.movetime, lines: input.lines ?? 1}};
      }
      return engine.analyze(input);
    },
  };
}
