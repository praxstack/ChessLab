import {replay} from '../../../../shared/replay.js';
import {createLineCollector, candidateCount, parseBestMove, sideToMove} from './uci.js';

// Stockfish in a Web Worker behind the engine seam (design.md seam 5):
// {status(), analyze(input), bestMove(input), stop()}. One worker runs one search at a time;
// later requests wait in a queue. A request whose signal aborts is dropped from the queue, or,
// if it is searching, the engine is told to stop and the request fails with 499 at once.
// Waiting requests are never cancelled by newer ones, so a bot move or a background review
// step is not lost when the learner opens another position.
export const ENGINE_URL = '/engine/stockfish-19-lite-single.js';

const failure = (message, status) => Object.assign(new Error(message), {status});
export const canceled = () => failure('Analysis canceled.', 499);
const UNAVAILABLE = 'The chess engine could not start in this browser.';

export function createEngine({
  workerUrl = ENGINE_URL,
  createWorker = url => new Worker(url),
  startTimeout = 30000, // download, compile and handshake
  searchGrace = 10000, // allowed beyond movetime before a search counts as stuck
  retryAfter = 15000, // a failed start is reported for this long before the next try
  maxQueue = 16,
  now = Date.now,
} = {}) {
  let worker = null, starting = null, identity = null, failedAt = null, failedReason = '';
  let listener = null; // receives every line while a handshake or search waits for one
  const options = new Map(); // option values the worker already has
  const queue = [];
  let running = null;

  function send(command) { worker?.postMessage(command); }

  // Throws the worker away; the next request starts a fresh one.
  function reset() {
    const old = worker;
    worker = null; starting = null; identity = null; options.clear();
    listener?.(null);
    listener = null;
    try { old?.terminate(); } catch { /* already gone */ }
  }

  // Resolves with the line for which match() is true. A crash (null line) or the timeout rejects.
  function expect(match, ms, message) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { listener = null; reject(failure(message, 503)); reset(); }, ms);
      listener = line => {
        if (line === null) { clearTimeout(timer); listener = null; reject(failure(UNAVAILABLE, 503)); return; }
        if (!match(line)) return;
        clearTimeout(timer); listener = null; resolve(line);
      };
    });
  }

  async function boot() {
    const created = createWorker(workerUrl);
    worker = created;
    created.onmessage = event => {
      if (worker !== created) return;
      for (const line of String(event.data ?? '').split('\n')) if (line.trim()) listener?.(line.trim());
    };
    created.onerror = event => {
      event?.preventDefault?.();
      if (worker === created) reset();
    };
    const found = {name: '', chess960: false, hash: false};
    const handshake = expect(line => {
      if (line.startsWith('id name ')) found.name = line.slice(8).trim().slice(0, 120);
      if (/^option name UCI_Chess960 type check\b/.test(line)) found.chess960 = true;
      if (/^option name Hash type spin\b/.test(line)) found.hash = true;
      return line === 'uciok';
    }, startTimeout, UNAVAILABLE);
    send('uci');
    await handshake;
    if (!/stockfish/i.test(found.name)) { reset(); throw failure('The engine file did not identify as Stockfish.', 503); }
    if (found.hash) send('setoption name Hash value 32');
    await ready(startTimeout);
    return {name: found.name, chess960: found.chess960};
  }

  async function ready(ms = searchGrace) {
    const answer = expect(line => line === 'readyok', ms, 'The chess engine stopped answering. Try again.');
    send('isready');
    await answer;
  }

  async function start() {
    if (identity) return identity;
    if (!starting && failedAt !== null && now() - failedAt < retryAfter) throw failure(failedReason, 503);
    starting ??= boot().then(found => { identity = found; failedAt = null; return found; }, error => {
      reset(); failedAt = now(); failedReason = error.message || UNAVAILABLE;
      throw failure(failedReason, 503);
    });
    return starting;
  }

  function setOption(name, value) {
    if (options.get(name) === value) return;
    options.set(name, value);
    send(`setoption name ${name} value ${value}`);
  }

  // One search. job.stopped is set when its caller gave up; the search still runs to its
  // bestmove so the next search never reads this one's output.
  async function search(job) {
    const {fen, moves = [], variant = 'standard', movetime, lines = 1, skill = 20} = job.input;
    const found = await start();
    if (variant === 'chess960' && !found.chess960) throw failure('This engine does not support Chess960.', 503);
    const board = replay(moves, fen, variant);
    if (board.isGameOver()) return {engine: found.name, bestmove: null, lines: [], tablebaseHits: 0};
    const candidates = candidateCount(lines, skill);
    setOption('UCI_Chess960', variant === 'chess960');
    setOption('MultiPV', candidates);
    setOption('Skill Level', skill);
    await ready();
    if (job.stopped) throw canceled();
    const collector = createLineCollector({turn: sideToMove(fen, moves), candidates});
    const done = expect(line => {
      if (line.startsWith('info ')) collector.add(line);
      return line.startsWith('bestmove');
    }, movetime + searchGrace, 'The chess engine took too long. Try again.');
    job.halt = () => send('stop');
    send(`position fen ${fen}${moves.length ? ` moves ${moves.join(' ')}` : ''}`);
    send(`go movetime ${movetime}`);
    const bestmove = parseBestMove(await done);
    job.halt = null;
    const {lines: picked, tablebaseHits} = collector.finish(bestmove, board.moves().length);
    return {engine: found.name, bestmove, lines: picked.slice(0, lines), tablebaseHits};
  }

  function settle(job, error, value) {
    if (job.settled) return;
    job.settled = true;
    job.signal?.removeEventListener('abort', job.onAbort);
    if (error) job.reject(error); else job.resolve(value);
  }

  async function pump() {
    if (running || !queue.length) return;
    const job = running = queue.shift();
    try { settle(job, null, await search(job)); }
    catch (error) { settle(job, error.status ? error : failure(error.message || UNAVAILABLE, 503)); }
    finally { running = null; pump(); }
  }

  function cancel(job) {
    job.stopped = true;
    const index = queue.indexOf(job);
    if (index !== -1) queue.splice(index, 1);
    job.halt?.();
    settle(job, canceled());
  }

  function enqueue(input) {
    const {signal} = input;
    if (signal?.aborted) return Promise.reject(canceled());
    if (queue.length >= maxQueue) return Promise.reject(failure('The chess engine is busy. Try again shortly.', 503));
    if (!Number.isInteger(input.movetime) || input.movetime < 1) return Promise.reject(failure('movetime must be a positive integer.', 400));
    return new Promise((resolve, reject) => {
      const job = {input, signal, resolve, reject, settled: false, stopped: false, halt: null};
      job.onAbort = () => cancel(job);
      signal?.addEventListener('abort', job.onAbort, {once: true});
      queue.push(job);
      pump();
    });
  }

  function stop() {
    for (const job of [...queue]) cancel(job);
    if (running) cancel(running);
  }

  return {
    async status() {
      try {
        const found = await start();
        return {available: true, name: found.name, version: found.name, chess960: found.chess960};
      } catch (error) {
        return {available: false, name: 'Stockfish', reason: error.message || UNAVAILABLE};
      }
    },
    // {fen, moves, variant, movetime, lines, skill, signal} -> {engine, bestmove, lines, tablebaseHits, limits}.
    // fen is the game's starting position; scores are from White's side.
    async analyze(input) {
      const result = await enqueue(input);
      return {...result, limits: {movetime: input.movetime, lines: input.lines ?? 1}};
    },
    // The move Stockfish plays at a skill level: {move, engine}.
    async bestMove(input) {
      const result = await enqueue({...input, lines: 1});
      return {move: result.bestmove, engine: result.engine};
    },
    // Ends the current search and drops every waiting request.
    stop,
    // Ends the worker too, for tests and page teardown.
    close() { stop(); reset(); },
  };
}
