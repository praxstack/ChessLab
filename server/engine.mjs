import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {replay, moveObject} from '../shared/replay.js';
import {searchSummary, playedSummary} from '../shared/engine-evidence.js';
export {replay};
const engineDirectory = resolve(process.env.CHESSLAB_ENGINES_DIR || fileURLToPath(new URL('../data/engines', import.meta.url)));
export function localTablebasePath() {
  const path=resolve(process.env.CHESSLAB_TABLEBASES || fileURLToPath(new URL('../data/tablebases/standard',import.meta.url)));
  if(/[\r\n\0]/.test(path))throw Object.assign(new Error('Invalid local tablebase path.'),{status:503});
  return existsSync(path)?path:null;
}
const analysisCommands = {
  stockfish18: () => [resolve(engineDirectory, 'stockfish18/stockfish'), []],
  stockfish16: () => [resolve(engineDirectory, 'stockfish16/stockfish'), []],
  'stockfish18-lite': () => [process.execPath, [resolve(engineDirectory, 'stockfish18-lite/stockfish-18-lite.js')]],
};
import {gameVariant} from '../shared/chess.js';

const children = new Set();
const waiting = [];
let active = 0;
let closed = false;

function failure(message, status = 400) {
  return Object.assign(new Error(message), { status });
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
  // Weakened Stockfish can select any of its four candidate moves. Keep that move's actual evidence.
  const candidateCount=Math.max(lines||1,(skill??20)<20?4:1);
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
    let name = '', chess960 = false, syzygy = false, tablebaseHits = 0;
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
      if (/^option name SyzygyPath type string\b/.test(line)) syzygy = true;
      if (/^option name UCI_Chess960 type check\b/.test(line)) chess960 = true;
      if (line.startsWith('id name ')) name = line.slice(8).trim().slice(0, 120);
      if (phase === 'uci' && line === 'uciok') {
        if (!name.toLowerCase().includes('stockfish')) return finish(failure('Configured engine did not identify as Stockfish.', 503));
        if (variant==='chess960'&&!chess960) return finish(failure('This engine does not support Chess960.', 503));
        phase = 'ready';
        if (syzygy && engineId!=='stockfish18-lite' && localTablebasePath()) write(`setoption name SyzygyPath value ${localTablebasePath()}`);
        if (variant==='chess960') write('setoption name UCI_Chess960 value true');
        write(`setoption name Threads value ${threads}`);
        write('setoption name Hash value 32');
        write(`setoption name MultiPV value ${candidateCount}`);
        write(`setoption name Skill Level value ${skill ?? 20}`);
        write('ucinewgame');
        write('isready');
      } else if (phase === 'ready' && line === 'readyok') {
        if (!board || board.isGameOver()) return finish(null, { name, chess960, tablebases:syzygy&&engineId!=='stockfish18-lite'&&!!localTablebasePath(), bestmove: null, lines: [] });
        phase = 'search';
        const start = initialFen == null ? 'startpos' : `fen ${replay([], initialFen, variant).fen()}`;
        write(`position ${start}${moves.length ? ` moves ${moves.join(' ')}` : ''}`);
        write(`go movetime ${movetime}`);
      } else if (phase === 'search' && line.startsWith('info ')) {
        tablebaseHits=Math.max(tablebaseHits,Number(line.match(/\btbhits (\d+)\b/)?.[1]||0));
        const match = line.match(/\bscore (cp|mate) (-?\d+)\b/);
        const pv = line.match(/\bpv (.+)$/);
        const depth = line.match(/\bdepth (\d+)\b/);
        const index = Number(line.match(/\bmultipv (\d+)\b/)?.[1] || 1);
        if (!match || !pv || !depth || index > candidateCount || /\b(?:upperbound|lowerbound)\b/.test(line)) return;
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
        const complete=matching.find(entries=>entries.length===Math.min(candidateCount,board.moves().length)&&new Set(entries.map(line=>line.move)).size===entries.length);
        const resultLines = (complete || matching[0] || []).filter((line,index,all)=>all.findIndex(item=>item.move===line.move)===index).sort((a,b)=>Number(b.move===bestmove)-Number(a.move===bestmove));
        if (!resultLines.length) return finish(failure('Stockfish returned no usable analysis. Try again.', 503));
        finish(null, { name, bestmove, tablebaseHits, lines: resultLines.slice(0,lines||1) });
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

export async function engineStatus() {
  try { const result = await withSlot(() => runUci()); return { available: true, name: result.name, chess960: result.chess960, tablebases:result.tablebases }; }
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
    const analysis = searchSummary(board, result, { movetime, lines, ...(engineId ? {threads,engineId} : {}) });
    if (afterBoard) {
      const after = await runUci({ moves: [...moves, playedMove], initialFen, variant, board: afterBoard, movetime, lines: 1, skill: 20, engineId, threads, signal });
      analysis.played = playedSummary(board, afterBoard, playedMove, result, after);
    }
    return analysis;
  }, signal);
}

export function closeEngine() {
  closed = true;
  for (const entry of waiting.splice(0)) { clearTimeout(entry.timer); entry.cleanup(); entry.reject(failure('Chess engine is shutting down.', 503)); }
  for (const child of children) child.kill('SIGKILL');
}
