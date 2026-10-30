// Pure helpers for Stockfish's UCI text: no worker, no timers, so they are easy to test.

const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

// One "info" line, or null when it carries no usable scored line. Bound scores (upperbound or
// lowerbound) are partial results from an aspiration window and are skipped, as the server does.
export function parseInfo(line) {
  if (typeof line !== 'string' || !line.startsWith('info ')) return null;
  const depth = line.match(/\bdepth (\d+)\b/);
  const score = line.match(/\bscore (cp|mate) (-?\d+)\b/);
  const pv = line.match(/\bpv (.+)$/);
  if (!depth || !score || !pv || /\b(?:upperbound|lowerbound)\b/.test(line)) return null;
  const value = Number(score[2]);
  const moves = pv[1].trim().split(/\s+/);
  if (!Number.isSafeInteger(value) || !moves.every(move => UCI_MOVE.test(move))) return null;
  return {
    depth: Number(depth[1]),
    multipv: Number(line.match(/\bmultipv (\d+)\b/)?.[1] || 1),
    score: {type: score[1], value},
    moves: moves.slice(0, 20),
    tbhits: Number(line.match(/\btbhits (\d+)\b/)?.[1] || 0),
  };
}

// "bestmove e2e4 ponder e7e5" gives "e2e4"; "bestmove (none)" (no legal move) gives null.
export function parseBestMove(line) {
  const move = line.split(/\s+/)[1];
  return UCI_MOVE.test(move || '') ? move : null;
}

// The side to move after `moves` from `fen`, read from the FEN alone.
export function sideToMove(fen, moves = []) {
  const turn = String(fen).trim().split(/\s+/)[1] === 'b' ? 'b' : 'w';
  return moves.length % 2 ? (turn === 'w' ? 'b' : 'w') : turn;
}

// UCI scores are for the side to move; the app keeps every score from White's side.
export const whiteScore = (score, turn) => ({type: score.type, value: turn === 'w' ? score.value : -score.value});

// How many MultiPV lines to ask for. A weakened Stockfish picks among at least four candidates,
// so the move it plays keeps its own line and score (server/engine.mjs does the same).
export const candidateCount = (lines, skill) => Math.max(lines || 1, (skill ?? 20) < 20 ? 4 : 1);

// Gathers info lines during one search and picks the lines to report once bestmove arrives:
// the deepest complete MultiPV iteration that contains the played move, so a half-finished
// iteration never mixes ranks from two depths. Ported from server/engine.mjs.
export function createLineCollector({turn, candidates}) {
  const iterations = new Map();
  let tablebaseHits = 0;
  return {
    add(line) {
      const info = parseInfo(line);
      if (!info) return;
      tablebaseHits = Math.max(tablebaseHits, info.tbhits);
      if (info.multipv > candidates) return;
      if (!iterations.has(info.depth)) iterations.set(info.depth, new Map());
      iterations.get(info.depth).set(info.multipv, {moves: info.moves, score: whiteScore(info.score, turn), depth: info.depth});
    },
    finish(bestmove, legalMoves) {
      const ranked = [...iterations.entries()].sort((a, b) => b[0] - a[0])
        .map(([, entries]) => [...entries.entries()].sort((a, b) => a[0] - b[0]).map(([, value]) => value));
      const matching = ranked.filter(entries => entries.some(line => line.moves[0] === bestmove));
      const complete = matching.find(entries => entries.length === Math.min(candidates, legalMoves) && new Set(entries.map(line => line.moves[0])).size === entries.length);
      const lines = (complete || matching[0] || [])
        .filter((line, index, all) => all.findIndex(item => item.moves[0] === line.moves[0]) === index)
        .sort((a, b) => Number(b.moves[0] === bestmove) - Number(a.moves[0] === bestmove));
      return {lines, tablebaseHits};
    },
  };
}
