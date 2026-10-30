import test from 'node:test';
import assert from 'node:assert/strict';
import {createEngine} from './engine.js';
import {parseInfo, parseBestMove, sideToMove, createLineCollector, candidateCount} from './uci.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

// A stand-in for the Stockfish worker. It answers the handshake and isready at once; a search
// answers with script(position, go) lines, or, when hold is true, waits for "stop".
class FakeWorker {
  constructor({name = 'Stockfish 19 Lite WASM', chess960 = true, script, hold = false, silent = false} = {}) {
    Object.assign(this, {name, chess960, script, hold, silent});
    this.sent = []; this.terminated = false; this.position = null;
  }
  emit(...lines) { queueMicrotask(() => this.onmessage?.({data: lines.join('\n')})); }
  postMessage(command) {
    this.sent.push(command);
    if (this.silent) return;
    if (command === 'uci') this.emit(`id name ${this.name}`, 'id author test', 'option name Hash type spin default 16 min 1 max 1024', 'option name MultiPV type spin default 1 min 1 max 256', ...(this.chess960 ? ['option name UCI_Chess960 type check default false'] : []), 'uciok');
    else if (command === 'isready') this.emit('readyok');
    else if (command.startsWith('position ')) this.position = command;
    else if (command.startsWith('go ')) {
      this.searching = true;
      if (!this.hold) { this.searching = false; this.emit(...(this.script?.(this.position, command) ?? ['info depth 1 multipv 1 score cp 20 pv e2e4', 'bestmove e2e4'])); }
    } else if (command === 'stop' && this.searching) { this.searching = false; this.emit('info depth 5 multipv 1 score cp 15 pv d2d4', 'bestmove d2d4'); }
  }
  terminate() { this.terminated = true; }
}

function setup(options = {}, engineOptions = {}) {
  const workers = [];
  const engine = createEngine({createWorker: () => { const worker = new FakeWorker(options); workers.push(worker); return worker; }, ...engineOptions});
  return {engine, workers, worker: () => workers.at(-1)};
}

test('info lines parse into depth, rank, score and moves; bound and pv-less lines are skipped', () => {
  assert.deepEqual(parseInfo('info depth 12 seldepth 18 multipv 2 score cp -35 nodes 1 nps 1 tbhits 3 time 5 pv e7e5 g1f3 b8c6'), {depth: 12, multipv: 2, score: {type: 'cp', value: -35}, moves: ['e7e5', 'g1f3', 'b8c6'], tbhits: 3});
  assert.deepEqual(parseInfo('info depth 30 score mate -4 pv h7h8q').score, {type: 'mate', value: -4});
  assert.equal(parseInfo('info depth 30 score mate -4 pv h7h8q').multipv, 1);
  assert.equal(parseInfo('info depth 9 multipv 1 score cp 20 lowerbound nodes 9 pv e2e4'), null);
  assert.equal(parseInfo('info depth 9 multipv 1 score cp 20 nodes 9'), null);
  assert.equal(parseInfo('info string NNUE evaluation using nn-61e7af4bb97d.nnue'), null);
  assert.equal(parseInfo('info depth 9 score cp 20 pv e2e4 nonsense'), null);
  assert.equal(parseBestMove('bestmove e7e8q ponder a2a3'), 'e7e8q');
  assert.equal(parseBestMove('bestmove (none)'), null);
  assert.equal(sideToMove(START, []), 'w');
  assert.equal(sideToMove(START, ['e2e4']), 'b');
  assert.equal(sideToMove('8/8/8/4k3/8/8/4P3/4K3 b - - 0 1', ['e5e4']), 'w');
  assert.equal(candidateCount(1, 20), 1);
  assert.equal(candidateCount(1, 5), 4);
  assert.equal(candidateCount(5, 5), 5);
});

test('lines come from the deepest complete iteration that holds the best move, in White terms', () => {
  const collector = createLineCollector({turn: 'b', candidates: 2});
  for (const line of [
    'info depth 10 multipv 1 score cp 30 pv e7e5 g1f3',
    'info depth 10 multipv 2 score cp 10 pv c7c5',
    'info depth 11 multipv 1 score cp 40 pv d7d5', // depth 11 never finished its second line
    'info depth 11 multipv 3 score cp 0 pv a7a6', // beyond the requested lines
  ]) collector.add(line);
  const {lines} = collector.finish('e7e5', 20);
  assert.deepEqual(lines.map(line => line.moves[0]), ['e7e5', 'c7c5']);
  assert.deepEqual(lines[0].score, {type: 'cp', value: -30});
  assert.equal(lines[0].depth, 10);
});

test('the handshake reports the engine, sets the hash and runs once', async () => {
  const {engine, workers} = setup();
  const [first, second] = await Promise.all([engine.status(), engine.status()]);
  assert.deepEqual(first, {available: true, name: 'Stockfish 19 Lite WASM', version: 'Stockfish 19 Lite WASM', chess960: true});
  assert.deepEqual(second, first);
  assert.equal(workers.length, 1);
  assert.deepEqual(workers[0].sent, ['uci', 'setoption name Hash value 32', 'isready']);
});

test('analyze sends MultiPV, skill and the full move history, and turns scores to White', async () => {
  const {engine, worker} = setup({script: () => [
    'info depth 8 multipv 1 score cp 25 pv g8f6 g1f3',
    'info depth 8 multipv 2 score mate 3 pv d7d5',
    'info depth 8 multipv 3 score cp -10 pv e7e5',
    'bestmove g8f6 ponder g1f3',
  ]});
  const result = await engine.analyze({fen: START, moves: ['e2e4'], variant: 'standard', movetime: 300, lines: 3});
  assert.equal(result.engine, 'Stockfish 19 Lite WASM');
  assert.equal(result.bestmove, 'g8f6');
  assert.deepEqual(result.lines.map(line => [line.moves[0], line.score.type, line.score.value]), [['g8f6', 'cp', -25], ['d7d5', 'mate', -3], ['e7e5', 'cp', 10]]);
  assert.deepEqual(result.limits, {movetime: 300, lines: 3});
  const sent = worker().sent;
  assert.ok(sent.includes('setoption name MultiPV value 3'));
  assert.ok(sent.includes('setoption name Skill Level value 20'));
  assert.ok(sent.includes(`position fen ${START} moves e2e4`));
  assert.equal(sent.at(-1), 'go movetime 300');
});

test('bestMove plays at a skill level with four candidates and returns the move', async () => {
  const {engine, worker} = setup({script: () => ['info depth 3 multipv 1 score cp 5 pv d2d4', 'bestmove b1c3']});
  assert.deepEqual(await engine.bestMove({fen: START, moves: [], movetime: 100, skill: 3}), {move: 'b1c3', engine: 'Stockfish 19 Lite WASM'});
  assert.ok(worker().sent.includes('setoption name Skill Level value 3'));
  assert.ok(worker().sent.includes('setoption name MultiPV value 4'));
});

test('options are sent only when they change', async () => {
  const {engine, worker} = setup();
  await engine.analyze({fen: START, moves: [], movetime: 50, lines: 1});
  await engine.analyze({fen: START, moves: ['e2e4', 'e7e5'], movetime: 50, lines: 1});
  assert.equal(worker().sent.filter(command => command.startsWith('setoption name MultiPV')).length, 1);
});

test('Chess960 turns on UCI_Chess960 and fails clearly when the build lacks it', async () => {
  const fen = 'bqnb1rkr/pp3ppp/3ppn2/2p5/5P2/P2P4/NPP1P1PP/BQ1BNRKR w HFhf - 2 9';
  const {engine, worker} = setup({script: () => ['info depth 2 multipv 1 score cp 0 pv g1g2', 'bestmove g1g2']});
  await engine.analyze({fen, moves: [], variant: 'chess960', movetime: 50, lines: 1});
  assert.ok(worker().sent.includes('setoption name UCI_Chess960 value true'));
  const old = setup({chess960: false});
  await assert.rejects(old.engine.analyze({fen, moves: [], variant: 'chess960', movetime: 50}), error => error.status === 503 && /Chess960/.test(error.message));
});

test('requests wait their turn; an aborted search stops and rejects with 499 while the next one runs', async () => {
  const {engine, worker} = setup({hold: true});
  const controller = new AbortController();
  const first = engine.analyze({fen: START, moves: [], movetime: 5000, lines: 1, signal: controller.signal});
  const second = engine.analyze({fen: START, moves: ['e2e4'], movetime: 5000, lines: 1});
  await tick(); await tick(); await tick();
  assert.equal(worker().sent.filter(command => command.startsWith('go ')).length, 1, 'one search at a time');
  controller.abort();
  await assert.rejects(first, error => error.status === 499 && error.message === 'Analysis canceled.');
  assert.ok(worker().sent.includes('stop'));
  // The second search starts only after the stopped one's bestmove came back.
  for (let i = 0; i < 10 && worker().sent.filter(command => command.startsWith('go ')).length < 2; i++) await tick();
  assert.equal(worker().sent.at(-2), `position fen ${START} moves e2e4`);
  worker().hold = false; worker().postMessage('stop');
  const result = await second;
  assert.equal(result.bestmove, 'd2d4');
});

test('an aborted request that is still queued never reaches the engine', async () => {
  const {engine, worker} = setup({hold: true});
  const running = engine.analyze({fen: START, moves: [], movetime: 5000, lines: 1});
  const controller = new AbortController();
  const queued = engine.analyze({fen: START, moves: ['d2d4'], movetime: 5000, lines: 1, signal: controller.signal});
  controller.abort();
  await assert.rejects(queued, error => error.status === 499);
  await assert.rejects(engine.analyze({fen: START, moves: [], movetime: 50, signal: controller.signal}), error => error.status === 499);
  await tick(); await tick(); await tick();
  worker().postMessage('stop');
  await running;
  assert.ok(!worker().sent.some(command => command.includes('moves d2d4')));
});

test('stop() cancels the running search and everything waiting', async () => {
  const {engine} = setup({hold: true});
  const a = engine.analyze({fen: START, moves: [], movetime: 5000});
  const b = engine.bestMove({fen: START, moves: [], movetime: 5000, skill: 5});
  await tick();
  engine.stop();
  await assert.rejects(a, error => error.status === 499);
  await assert.rejects(b, error => error.status === 499);
});

test('a worker that never answers is reported unavailable, then retried after a pause', async () => {
  let clock = 0;
  const {engine, workers} = setup({silent: true}, {startTimeout: 20, retryAfter: 1000, now: () => clock});
  const status = await engine.status();
  assert.equal(status.available, false);
  assert.match(status.reason, /could not start/);
  assert.ok(workers[0].terminated);
  await assert.rejects(engine.analyze({fen: START, moves: [], movetime: 50}), error => error.status === 503);
  assert.equal(workers.length, 1, 'no second start inside the pause');
  clock = 2000;
  await engine.status();
  assert.equal(workers.length, 2);
});

test('a worker crash fails the search with 503 and the next request starts a new worker', async () => {
  const {engine, workers, worker} = setup({hold: true});
  const search = engine.analyze({fen: START, moves: [], movetime: 5000});
  for (let i = 0; i < 10 && !worker().searching; i++) await tick();
  worker().onerror({preventDefault() {}});
  await assert.rejects(search, error => error.status === 503);
  assert.ok(workers[0].terminated);
  assert.equal((await engine.status()).available, true);
  assert.equal(workers.length, 2);
});

test('a search that runs far past its movetime is abandoned', async () => {
  const {engine, workers} = setup({hold: true}, {searchGrace: 20});
  await assert.rejects(engine.analyze({fen: START, moves: [], movetime: 10}), error => error.status === 503 && /too long/.test(error.message));
  assert.ok(workers[0].terminated);
});

test('a game-over position returns no move without searching', async () => {
  const {engine, worker} = setup();
  const mated = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
  const result = await engine.analyze({fen: mated, moves: [], movetime: 50});
  assert.equal(result.bestmove, null);
  assert.ok(!worker().sent.some(command => command.startsWith('go ')));
});

test('a worker that is not Stockfish is refused', async () => {
  const {engine} = setup({name: 'Something Else 1.0'});
  const status = await engine.status();
  assert.equal(status.available, false);
  assert.match(status.reason, /Stockfish/);
});
