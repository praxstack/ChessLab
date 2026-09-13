import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const engineDirectory = resolve(process.env.CHESSLAB_ENGINES_DIR || fileURLToPath(new URL('../data/engines', import.meta.url)));
const analysisCommands = {
  stockfish18: () => [resolve(engineDirectory, 'stockfish18/stockfish'), []],
  stockfish16: () => [resolve(engineDirectory, 'stockfish16/stockfish'), []],
  'stockfish18-lite': () => [process.execPath, [resolve(engineDirectory, 'stockfish18-lite/stockfish-18-lite.js')]],
};
import {createChess,copyChess,gameVariant} from '../shared/chess.js';

const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const children = new Set();
const waiting = [];
let active = 0;
let closed = false;

function failure(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function moveObject(move) {
  if (typeof move !== 'string' || !UCI_MOVE.test(move)) throw failure('Moves must use UCI notation, for example e2e4 or a7a8q.');
  return { from: move.slice(0, 2), to: move.slice(2, 4), ...(move[4] ? { promotion: move[4] } : {}) };
}

export function replay(moves, initialFen = null, variant) {
  if (!Array.isArray(moves) || moves.length > 1000) throw failure('Provide an array of at most 1000 moves.');
  if (initialFen != null && (typeof initialFen !== 'string' || initialFen.length > 120 || /[\r\n\0]/.test(initialFen))) throw failure('Invalid starting FEN.');
  let board;
  try { board = createChess(initialFen,variant); }
  catch { throw failure('Invalid starting FEN.'); }
  const pieces = board.board().flat().filter(Boolean);
  for (const color of ['w', 'b']) {
    if (pieces.filter(piece => piece.color === color).length > 16 || pieces.filter(piece => piece.color === color && piece.type === 'p').length > 8) throw failure('Starting FEN has too many pieces.');
  }
  const previousKing = pieces.find(piece => piece.type === 'k' && piece.color !== board.turn());
  if (board.isAttacked(previousKing.square, board.turn())) throw failure('Invalid starting FEN: the side that just moved remains in check.');
  for (const [index, move] of moves.entries()) {
    const object = moveObject(move);
    try { board.move(object); }
    catch { throw failure(`Illegal move ${index + 1}: ${move}.`); }
  }
  return board;
}

function bounded(value, fallback, min, max, name) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < min || value > max) throw failure(`${name} must be an integer from ${min} to ${max}.`);
  return value;
}

const canceled = () => failure('Analysis canceled.', 499);
async function withSlot(work, signal) {
  if (signal?.aborted) throw canceled();
  if (closed) throw failure('Chess engine is shutting down.', 503);
  if (active >= 2) {
    if (waiting.length >= 8) throw failure('Chess engine is busy. Try again shortly.', 503);
    await new Promise((resolve, reject) => {
      const cleanup = () => signal?.removeEventListener('abort', abort);
      const entry = { resolve, reject, timer: null, cleanup };
      const remove = error => {
        const index = waiting.indexOf(entry);
        if (index !== -1) waiting.splice(index, 1);
        clearTimeout(entry.timer); cleanup(); reject(error);
      };
      const abort = () => remove(canceled());
      entry.timer = setTimeout(() => {
        remove(failure('Chess engine queue timed out. Try again shortly.', 503));
      }, 15000);
      waiting.push(entry);
      signal?.addEventListener('abort', abort, {once:true});
    });
  } else active++;
  try {
    if (closed) throw failure('Chess engine is shutting down.', 503);
    if (signal?.aborted) throw canceled();
    return await work();
  }
  finally {
    const next = waiting.shift();
    if (next) { clearTimeout(next.timer); next.cleanup(); next.resolve(); }
    else active--;
  }
}

function enginePath() {
  return process.env.STOCKFISH_PATH || ['/opt/homebrew/bin/stockfish', '/usr/local/bin/stockfish', '/usr/games/stockfish'].find(existsSync) || 'stockfish';
}

function runUci({ moves, initialFen, variant, board, movetime, lines, skill, engineId, threads=1, signal } = {}) {
  // ponytail: fresh processes isolate searches; pool them if startup time becomes material.
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(canceled());
    const [executable,args] = analysisCommands[engineId]?.() || [enginePath(), []];
    const child = spawn(executable, args, { stdio: ['pipe', 'pipe', 'pipe'], shell: false });
    children.add(child);
    let settled = false;
    let phase = 'uci';
    let buffer = '';
    let totalBytes = 0;
    let name = '', chess960 = false;
    const iterations = new Map();
    const timer = setTimeout(() => finish(failure('Stockfish search timed out. Try again.', 503)), (movetime || 0) + 4000);
    const abort = () => finish(canceled());
    signal?.addEventListener('abort', abort, {once:true});
    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      children.delete(child);
      child.kill('SIGKILL');
      if (error) reject(error); else resolve(result);
    }
    function write(command) {
      if (!settled) child.stdin.write(`${command}\n`);
    }
    function onLine(line) {
      if (/^option name UCI_Chess960 type check\b/.test(line)) chess960 = true;
      if (line.startsWith('id name ')) name = line.slice(8).trim().slice(0, 120);
      if (phase === 'uci' && line === 'uciok') {
        if (!name.toLowerCase().includes('stockfish')) return finish(failure('Configured engine did not identify as Stockfish.', 503));
        if (variant==='chess960'&&!chess960) return finish(failure('This engine does not support Chess960.', 503));
        phase = 'ready';
        if (variant==='chess960') write('setoption name UCI_Chess960 value true');
        write(`setoption name Threads value ${threads}`);
        write('setoption name Hash value 32');
        write(`setoption name MultiPV value ${lines || 1}`);
        write(`setoption name Skill Level value ${skill ?? 20}`);
        write('ucinewgame');
        write('isready');
      } else if (phase === 'ready' && line === 'readyok') {
        if (!board || board.isGameOver()) return finish(null, { name, chess960, bestmove: null, lines: [] });
        phase = 'search';
        const start = initialFen == null ? 'startpos' : `fen ${replay([], initialFen, variant).fen()}`;
        write(`position ${start}${moves.length ? ` moves ${moves.join(' ')}` : ''}`);
        write(`go movetime ${movetime}`);
      } else if (phase === 'search' && line.startsWith('info ')) {
        const match = line.match(/\bscore (cp|mate) (-?\d+)\b/);
        const pv = line.match(/\bpv (.+)$/);
        const depth = line.match(/\bdepth (\d+)\b/);
        const index = Number(line.match(/\bmultipv (\d+)\b/)?.[1] || 1);
        if (!match || !pv || !depth || index > lines || /\b(?:upperbound|lowerbound)\b/.test(line)) return;
        const value = Number(match[2]) * (board.turn() === 'w' ? 1 : -1);
        if (!Number.isSafeInteger(value)) return;
        const candidateMoves = pv[1].trim().split(/\s+/).slice(0, 20);
        const candidate = replay(moves, initialFen, variant);
        const san = [];
        try {
          for (const move of candidateMoves) san.push(candidate.move(moveObject(move)).san);
        } catch { return; }
        if (candidateMoves.length) {
          const searchedDepth=Number(depth[1]);
          if (!iterations.has(searchedDepth)) iterations.set(searchedDepth,new Map());
          iterations.get(searchedDepth).set(index, { move: candidateMoves[0], moves: candidateMoves, san, score: { type: match[1], value }, depth: searchedDepth });
        }
      } else if (phase === 'search' && line.startsWith('bestmove ')) {
        const bestmove = line.split(/\s+/)[1];
        try { replay([...moves, bestmove], initialFen, variant); }
        catch { return finish(failure('Stockfish returned an invalid move.', 503)); }
        // Rank changes during an unfinished MultiPV iteration must not duplicate candidates.
        const ranked=[...iterations.entries()].sort((a,b)=>b[0]-a[0]).map(([,entries])=>[...entries.entries()].sort((a,b)=>a[0]-b[0]).map(([,value])=>value));
        const matching=ranked.filter(entries=>entries.some(line=>line.move===bestmove));
        const complete=matching.find(entries=>entries.length===Math.min(lines,board.moves().length)&&new Set(entries.map(line=>line.move)).size===entries.length);
        const resultLines = (complete || matching[0] || []).filter((line,index,all)=>all.findIndex(item=>item.move===line.move)===index).sort((a,b)=>Number(b.move===bestmove)-Number(a.move===bestmove));
        if (!resultLines.length) return finish(failure('Stockfish returned no usable analysis. Try again.', 503));
        finish(null, { name, bestmove, lines: resultLines });
      }
    }
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      totalBytes += chunk.length;
      if (totalBytes > 2_000_000) return finish(failure('Stockfish output exceeded its limit.', 503));
      buffer += chunk;
      let end;
      while (!settled && (end = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, end).trim();
        buffer = buffer.slice(end + 1);
        try { onLine(line); }
        catch { finish(failure('Stockfish returned malformed analysis.', 503)); }
      }
    });
    child.stderr.on('data', () => {});
    child.stdin.on('error', () => finish(failure('Stockfish communication failed. Try again.', 503)));
    child.on('error', () => finish(failure('Stockfish is unavailable. Install it or set STOCKFISH_PATH on the server.', 503)));
    child.on('exit', () => finish(failure('Stockfish stopped before completing analysis. Try again.', 503)));
    write('uci');
  });
}

function facts(board) {
  const material = { white: 0, black: 0 };
  for (const row of board.board()) for (const piece of row) if (piece) material[piece.color === 'w' ? 'white' : 'black'] += VALUES[piece.type];
  return { inCheck: board.inCheck(), material, legalMoves: board.moves().length };
}

function moveEvidence(board, uci) {
  const copy = copyChess(board);
  const move = copy.move(moveObject(uci));
  const details = [];
  if (move.captured) details.push(`captures a ${PIECES[move.captured]}${move.flags.includes('e') ? ' en passant' : ''}`);
  if (move.promotion) details.push(`promotes to a ${PIECES[move.promotion]}`);
  if (move.flags.includes('k') || move.flags.includes('q')) details.push('castles');
  if (copy.isCheckmate()) details.push('delivers checkmate');
  else if (copy.inCheck()) details.push('gives check');
  return { san: move.san, text: `${move.san}${details.length ? ` ${details.join(' and ')}` : ''}.` };
}

function lineEvidence(board, moves = []) {
  if (!moves.length) return '';
  const history = board.history({ verbose: true });
  const copy = replay(history.map(move => move.from + move.to + (move.promotion || '')), history[0]?.before ?? board.fen(),board.variant);
  const before = facts(copy).material;
  const san = [];
  const captures = [];
  for (const uci of moves.slice(0, 6)) {
    const move = copy.move(moveObject(uci));
    san.push(move.san);
    if (move.captured) {
      const square = move.flags.includes('e') ? move.to[0] + move.from[1] : move.to;
      captures.push(`${move.color === 'w' ? 'White' : 'Black'} ${move.san} captures ${move.color === 'w' ? "Black's" : "White's"} ${PIECES[move.captured]} on ${square}${move.flags.includes('e') ? ' en passant' : ''}`);
    }
    if (copy.isGameOver()) break;
  }
  const after = facts(copy).material;
  const changes = ['white', 'black'].filter(color => after[color] !== before[color]).map(color => {
    const delta = after[color] - before[color];
    return `${color === 'white' ? 'White' : 'Black'} ${delta >= 0 ? '+' : ''}${delta}`;
  }).join(', ');
  const material = changes ? `Material: White ${after.white}, Black ${after.black} (${changes} points).` : 'No material changes in this line.';
  return `Sample line: ${san.join(' → ')}. ${captures.length ? `${captures.join('; ')}. ` : ''}${material}`;
}

function terminalText(board) {
  if (board.isCheckmate()) return `${board.turn() === 'w' ? 'White' : 'Black'} is checkmated.`;
  if (board.isStalemate()) return 'Draw by stalemate.';
  if (board.isThreefoldRepetition()) return 'Draw by threefold repetition in this move history.';
  if (board.isInsufficientMaterial()) return 'Draw by insufficient material.';
  if (board.isDrawByFiftyMoves()) return 'Draw by the fifty-move rule.';
  return 'The game is over.';
}

function scoreText(score) {
  if (score.type === 'mate') return `The search reports mate in ${Math.abs(score.value)} for ${score.value > 0 ? 'White' : 'Black'}.`;
  return `Estimate: ${(score.value / 100).toFixed(2)} pawns from White's perspective.`;
}

export async function engineStatus() {
  try { const result = await withSlot(() => runUci()); return { available: true, name: result.name, chess960: result.chess960 }; }
  catch { return { available: false, name: 'Stockfish' }; }
}

export async function analyze(input, {signal} = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw failure('Provide an analysis request object.');
  const moves = Array.isArray(input.moves) ? [...input.moves] : input.moves;
  const initialFen = input.initialFen ?? null;
  let variant;try{variant=gameVariant(input.variant);}catch(error){throw failure(error.message);}
  const board = replay(moves, initialFen, variant);
  const engineId = input.engineId;
  if (engineId !== undefined && (typeof engineId !== 'string' || (engineId !== 'stockfish19' && !Object.hasOwn(analysisCommands, engineId)))) throw failure('Choose an installed analysis engine.');
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
  return withSlot(async () => {
    const result = await runUci({ moves, initialFen, variant, board, movetime, lines, skill, engineId, threads, signal });
    const positionFacts = facts(board);
    const materialText = `Material: White ${positionFacts.material.white}, Black ${positionFacts.material.black}.`;
    const explanation = board.isGameOver() ? `${terminalText(board)} ${materialText}` : `${board.turn() === 'w' ? 'White' : 'Black'} to move${positionFacts.inCheck ? ', in check' : ''}. ${moveEvidence(board, result.bestmove).text} ${lineEvidence(board, result.lines[0].moves)} ${scoreText(result.lines[0].score)}`;
    const analysis = { engine: result.name, fen: board.fen(), turn: board.turn(), bestmove: result.bestmove, lines: result.lines, limits: { movetime, lines, ...(engineId ? {threads,engineId} : {}) }, facts: positionFacts, explanation };
    if (afterBoard) {
      const after = await runUci({ moves: [...moves, playedMove], initialFen, variant, board: afterBoard, movetime, lines: 1, skill: 20, engineId, threads, signal });
      const beforeScore = result.lines[0]?.score;
      const afterScore = after.lines[0]?.score ?? (afterBoard.isGameOver() && !afterBoard.isCheckmate() ? { type: 'cp', value: 0 } : null);
      const lossCp = beforeScore?.type === 'cp' && afterScore?.type === 'cp' ? Math.max(0, Math.round((beforeScore.value - afterScore.value) * (board.turn() === 'w' ? 1 : -1))) : null;
      let classification = lossCp == null ? 'Mate sequence' : lossCp >= 300 ? 'Blunder' : lossCp >= 150 ? 'Mistake' : lossCp >= 50 ? 'Inaccuracy' : 'Good';
      if (playedMove === result.lines[0]?.move) classification = 'Best';
      if (afterBoard.isCheckmate()) classification = 'Checkmate';
      const evidence = moveEvidence(board, playedMove);
      const lossText = lossCp == null ? 'Mate scores have no centipawn-loss estimate.' : `Estimated loss: ${lossCp} centipawns for ${board.turn() === 'w' ? 'White' : 'Black'}.`;
      const continuation = afterBoard.isGameOver() ? terminalText(afterBoard) : lineEvidence(afterBoard, after.lines[0]?.moves);
      analysis.played = { move: playedMove, san: evidence.san, classification, lossCp, afterScore, explanation: `${evidence.text} ${continuation} ${lossText}` };
    }
    return analysis;
  }, signal);
}

export function closeEngine() {
  closed = true;
  for (const entry of waiting.splice(0)) { clearTimeout(entry.timer); entry.cleanup(); entry.reject(failure('Chess engine is shutting down.', 503)); }
  for (const child of children) child.kill('SIGKILL');
}
