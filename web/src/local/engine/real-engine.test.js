import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {copyFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createEngine} from './engine.js';
import {analyzePosition} from '../analysis.js';

// The shipped Stockfish 19 Lite build also runs under Node. This drives it through the same
// worker protocol (postMessage in, message events out) to check the client against real output.
const shipped = fileURLToPath(new URL('../../../public/engine/', import.meta.url));
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function processWorker(dir) {
  const child = spawn(process.execPath, [join(dir, 'stockfish.cjs')], {stdio: ['pipe', 'pipe', 'ignore']});
  const worker = {postMessage: line => child.stdin.write(`${line}\n`), terminate: () => child.kill('SIGKILL')};
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => worker.onmessage?.({data: chunk}));
  child.on('error', () => worker.onerror?.({}));
  return worker;
}

test('the shipped Stockfish 19 Lite answers analysis, skill moves and cancellation', {timeout: 60000}, async t => {
  // The build is CommonJS; the repository is an ES module package, so run a .cjs copy.
  const dir = mkdtempSync(join(tmpdir(), 'sf-lite-'));
  copyFileSync(join(shipped, 'stockfish-19-lite-single.js'), join(dir, 'stockfish.cjs'));
  copyFileSync(join(shipped, 'stockfish-19-lite-single.wasm'), join(dir, 'stockfish.wasm'));
  const engine = createEngine({createWorker: () => processWorker(dir)});
  t.after(() => { engine.close(); rmSync(dir, {recursive: true, force: true}); });

  assert.equal((await engine.status()).starting, true);
  await engine.analyze({fen: START, moves: [], movetime: 50});
  const status = await engine.status();
  assert.equal(status.available, true);
  assert.match(status.name, /^Stockfish 19\b/);
  assert.equal(status.chess960, true);

  // Black is a queen up after 1.e4 e5 2.Qh5 Nc6 3.Qxf7+?? Kxf7; scores stay on White's side.
  const analysis = await analyzePosition(engine, {moves: ['e2e4', 'e7e5', 'd1h5', 'b8c6', 'h5f7', 'e8f7'], movetime: 300, lines: 3});
  assert.equal(analysis.lines.length, 3);
  assert.ok(analysis.lines.every(line => line.san.length && line.depth > 0));
  assert.ok(analysis.lines[0].score.type === 'cp' && analysis.lines[0].score.value < -500, JSON.stringify(analysis.lines[0].score));
  assert.match(analysis.engine, /Stockfish 19/);

  const mate = await engine.analyze({fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', moves: [], movetime: 300, lines: 1});
  assert.deepEqual([mate.bestmove, mate.lines[0].score], ['a1a8', {type: 'mate', value: 1}]);

  const move = await engine.bestMove({fen: START, moves: ['e2e4'], movetime: 100, skill: 0});
  assert.match(move.move, /^[a-h][1-8][a-h][1-8]$/);

  const controller = new AbortController();
  const long = engine.analyze({fen: START, moves: [], movetime: 20000, lines: 1, signal: controller.signal});
  const next = engine.analyze({fen: START, moves: ['d2d4'], movetime: 100, lines: 1});
  setTimeout(() => controller.abort(), 200);
  const started = Date.now();
  await assert.rejects(long, error => error.status === 499);
  assert.ok((await next).bestmove);
  assert.ok(Date.now() - started < 5000, 'stop ends the long search early');

  const chess960 = await engine.analyze({fen: 'bqnb1rkr/pp3ppp/3ppn2/2p5/5P2/P2P4/NPP1P1PP/BQ1BNRKR w HFhf - 2 9', moves: [], variant: 'chess960', movetime: 100, lines: 1});
  assert.ok(chess960.bestmove);
});
