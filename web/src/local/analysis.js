import {gameVariant} from '../../../shared/chess.js';
import {replay} from '../../../shared/replay.js';
import {searchSummary, playedSummary} from '../../../shared/engine-evidence.js';

// Turns a browser engine (design.md seam 5) into the analysis object /api/analyze returned from the
// server: the same input checks and limits, then facts, explanation and the played-move grade from shared/.
const failure = (message, status = 400) => Object.assign(new Error(message), {status});
// Analysis engine ids the app's settings can name. The browser runs one engine for all of them;
// the analysis's `engine` field reports the engine that actually searched.
export const ANALYSIS_ENGINE_IDS = ['stockfish19', 'stockfish18', 'stockfish16', 'stockfish18-lite'];

function bounded(value, fallback, min, max, name) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < min || value > max) throw failure(`${name} must be an integer from ${min} to ${max}.`);
  return value;
}

const startFen = (initialFen, variant) => replay([], initialFen, variant).fen();

// Engine lines may arrive without san, move or depth; the rules library fills them in.
// Scores must already be from White's perspective, as server/engine.mjs reports them.
function normalizeLines(lines, moves, initialFen, variant) {
  return (Array.isArray(lines) ? lines : []).filter(line => Array.isArray(line?.moves) && line.moves.length && line.score).flatMap(line => {
    const board = replay(moves, initialFen, variant), san = [];
    // A line with a malformed or illegal move is dropped, as the server engine does; the others stay.
    try {
      for (const move of line.moves.slice(0, 20)) san.push(board.move({from: move.slice(0, 2), to: move.slice(2, 4), ...(move[4] ? {promotion: move[4]} : {})}).san);
    } catch { return []; }
    return [{move: line.moves[0], moves: line.moves.slice(0, 20), san, score: line.score, depth: line.depth ?? null}];
  });
}

async function search(engine, {moves, initialFen, variant, board, movetime, lines, skill, signal}) {
  if (board.isGameOver()) {
    const status = await engine.status();
    if (!status.available) throw failure(status.reason || 'The chess engine is not available in this browser yet.', 503);
    return {name: status.name, bestmove: null, lines: [], tablebaseHits: 0};
  }
  const raw = await engine.analyze({fen: startFen(initialFen, variant), moves, variant, movetime, lines, skill, signal});
  if (signal?.aborted) throw failure('Analysis canceled.', 499);
  const resultLines = normalizeLines(raw?.lines, moves, initialFen, variant);
  const bestmove = raw?.bestmove ?? resultLines[0]?.move;
  if (!bestmove || !resultLines.length) throw failure('The engine returned no usable analysis. Try again.', 503);
  try { replay([...moves, bestmove], initialFen, variant); } catch { throw failure('The engine returned an invalid move.', 503); }
  const ordered = resultLines.filter((line, index, all) => all.findIndex(item => item.move === line.move) === index).sort((a, b) => Number(b.move === bestmove) - Number(a.move === bestmove));
  return {name: raw.engine || raw.name || 'Stockfish', bestmove, lines: ordered.slice(0, lines || 1), tablebaseHits: raw.tablebaseHits || 0};
}

export async function analyzePosition(engine, input, {signal} = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw failure('Provide an analysis request object.');
  const moves = Array.isArray(input.moves) ? [...input.moves] : input.moves;
  const initialFen = input.initialFen ?? null;
  let variant; try { variant = gameVariant(input.variant); } catch (error) { throw failure(error.message); }
  const board = replay(moves, initialFen, variant);
  const engineId = input.engineId;
  if (engineId !== undefined && (typeof engineId !== 'string' || !ANALYSIS_ENGINE_IDS.includes(engineId))) throw failure('Choose an installed analysis engine.');
  const threads = bounded(input.threads, 1, 1, engineId ? 8 : 1, 'threads');
  const movetime = bounded(input.movetime, 350, 50, engineId ? 90000 : 2000, 'movetime');
  const lines = bounded(input.lines, 3, 1, engineId ? 5 : 3, 'lines');
  const skill = bounded(input.skill, 20, 0, 20, 'skill');
  const playedMove = input.playedMove;
  let afterBoard;
  if (playedMove !== undefined) {
    if (board.isGameOver()) throw failure('Cannot review another move after the game is over.');
    afterBoard = replay([...moves, playedMove], initialFen, variant);
  }
  const result = await search(engine, {moves, initialFen, variant, board, movetime, lines, skill, signal});
  const analysis = searchSummary(board, result, {movetime, lines, ...(engineId ? {threads, engineId} : {})});
  if (afterBoard) {
    const after = afterBoard.isGameOver() ? {lines: []} : await search(engine, {moves: [...moves, playedMove], initialFen, variant, board: afterBoard, movetime, lines: 1, skill: 20, signal});
    analysis.played = playedSummary(board, afterBoard, playedMove, result, after);
  }
  return analysis;
}

// A bot move from the browser engine at a skill level. The engine may answer with a UCI string or an object.
export async function engineMove(engine, {moves, initialFen, variant, movetime, skill, signal}) {
  const answer = await engine.bestMove({fen: startFen(initialFen, variant), moves, variant, movetime, skill, signal});
  const move = typeof answer === 'string' ? answer : answer?.move ?? answer?.bestmove ?? null;
  const name = typeof answer === 'object' && answer ? answer.engine || answer.name : null;
  return {move, engine: name || (await engine.status()).name || 'Stockfish'};
}
