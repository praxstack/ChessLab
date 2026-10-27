// The puzzle page's playable board: the reasons it gives for a move that
// isn't allowed, how it grades a move once Stockfish has looked, and the
// files it serves (chess.js as published, Stockfish with its licence).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from '../public/assets/vendor/chess.js';
import { whyNot, positionNote } from '../public/assets/rules.js';
import { WASM_BYTES, grade, parseInfo, toCp } from '../public/assets/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const why = (fen, from, to) => whyNot(new Chess(fen), from, to);
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

test('rules: a legal move has nothing to explain', () => {
  assert.equal(why(START, 'e2', 'e4'), null);
  assert.equal(why(START, 'g1', 'f3'), null);
  assert.equal(why('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1', 'g1'), null);
  assert.equal(why('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3', 'e5', 'd6'), null, 'en passant');
});

test('rules: a pinned piece is named, with the line from the pinning piece to the king', () => {
  const w = why('4r1k1/8/8/8/8/8/4N3/4K3 w - - 0 1', 'e2', 'c3');
  assert.equal(w.kind, 'pin');
  assert.match(w.text, /knight is pinned/);
  assert.match(w.text, /rook on e8/);
  assert.deepEqual(w.line, ['e8', 'e1']);
  assert.deepEqual(w.squares, ['e2']);
});

test('rules: in check, a move that ignores it says where the check comes from', () => {
  const w = why('4r1k1/8/8/8/8/8/3N4/4K3 w - - 0 1', 'd2', 'b3');
  assert.equal(w.kind, 'check');
  assert.match(w.text, /in check from the rook on e8/);
  assert.deepEqual(w.line, ['e8', 'e1']);
});

test('rules: the king may not step onto a guarded square', () => {
  const w = why('4r1k1/8/8/8/8/8/8/3K4 w - - 0 1', 'd1', 'e1');
  assert.equal(w.kind, 'king');
  assert.match(w.text, /guards it/);
  assert.deepEqual(w.line, ['e8', 'e1']);
});

test('rules: castling through an attack, or with a piece in the way, or after the rook moved', () => {
  assert.equal(why('r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1', 'e1', 'g1').line[0], 'f2');
  assert.equal(why('r3k2r/8/8/8/8/8/8/RN2K2R w KQkq - 0 1', 'e1', 'c1').kind, 'blocked');
  assert.match(why('r3k2r/8/8/8/8/8/8/R3K2R w Qkq - 0 1', 'e1', 'g1').text, /already moved/);
  assert.match(why('r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1', 'e1', 'g1').text, /in check/);
});

test('rules: shapes, blockers and pawns get plain reasons', () => {
  assert.equal(why(START, 'g1', 'g3').kind, 'shape');
  assert.match(why(START, 'f1', 'c4').text, /can’t jump over your pawn on e2/);
  assert.match(why(START, 'e2', 'd3').text, /diagonally when they take/);
  assert.match(why(START, 'e2', 'e5').kind, /shape/);
  assert.match(why('8/8/8/8/8/4p3/4P3/4K2k w - - 0 1', 'e2', 'e3').text, /can’t take straight ahead/);
  assert.match(why('8/8/8/8/4P3/8/8/4K2k w - - 0 1', 'e4', 'e6').text, /very first move/);
  assert.equal(why(START, 'e7', 'e5').kind, 'turn');
  assert.equal(why(START, 'a1', 'a2').kind, 'own');
});

test('rules: the note after a move says check, mate or draw', () => {
  assert.match(positionNote(new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3')).text, /Checkmate\. Black wins/);
  assert.match(positionNote(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).text, /Stalemate/);
  assert.match(positionNote(new Chess('4k2R/8/8/8/8/8/8/4K3 b - - 1 1')).text, /Check! Black/);
  assert.equal(positionNote(new Chess(START)), null);
});

test('engine: scores, info lines and grades', () => {
  assert.equal(toCp({ cp: 35 }), 35);
  assert.ok(toCp({ mate: 2 }) > toCp({ mate: 5 }));
  assert.ok(toCp({ mate: -1 }) < -50000);
  assert.ok(toCp({ mate: 0 }) < -50000, 'mate 0: the side to move is already mated');
  assert.deepEqual(parseInfo('info depth 12 seldepth 18 multipv 1 score cp -41 nodes 1 nps 1 pv e7e5 g1f3'), { depth: 12, score: { cp: -41 }, pv: ['e7e5', 'g1f3'] });
  assert.deepEqual(parseInfo('info depth 9 score mate 3 pv d1h5').score, { mate: 3 });
  assert.equal(parseInfo('info depth 9 score cp 20 lowerbound pv d1h5'), null);
  assert.equal(parseInfo('info string NNUE evaluation enabled'), null);
  assert.equal(grade({ playedBest: true }), 'best');
  assert.equal(grade({ bestCp: 120, afterCp: -110 }), 'best'); // lost 10
  assert.equal(grade({ bestCp: 120, afterCp: -60 }), 'good'); // lost 60
  assert.equal(grade({ bestCp: 120, afterCp: 30 }), 'ok'); // lost 150
  assert.equal(grade({ bestCp: 300, afterCp: 100 }), 'miss'); // lost 400
  assert.equal(grade({ bestCp: toCp({ mate: 2 }), afterCp: toCp({ mate: 0 }) }), 'best', 'a mate in one beats the slower mate');
  assert.equal(grade({ bestCp: toCp({ mate: 2 }), afterCp: -toCp({ mate: 3 }) }), 'best', 'still mating, one move slower');
  assert.equal(grade({ bestCp: toCp({ mate: 2 }), afterCp: 0 }), 'miss', 'let a forced mate go');
});

test('files: chess.js is the published 1.4.0 build, and Stockfish ships with its licence', () => {
  const vendored = readFileSync(join(root, 'public/assets/vendor/chess.js'), 'utf8');
  const published = readFileSync(join(root, 'node_modules/chess.js/dist/esm/chess.js'), 'utf8').replace(/\n\/\/# sourceMappingURL=.*\n?$/, '\n');
  assert.equal(vendored, published);
  assert.ok(existsSync(join(root, 'public/assets/vendor/chess.js.LICENSE.txt')));
  const wasm = join(root, 'public/assets/engine/stockfish-19-lite-single.wasm');
  assert.equal(statSync(wasm).size, WASM_BYTES, 'WASM_BYTES in engine.js matches the file, so the progress bar is right');
  assert.ok(existsSync(join(root, 'public/assets/engine/stockfish-19-lite-single.js')));
  assert.match(readFileSync(join(root, 'public/assets/engine/COPYING.txt'), 'utf8'), /GNU GENERAL PUBLIC LICENSE/);
  assert.match(readFileSync(join(root, 'public/puzzleanalyzr/index.html'), 'utf8'), /href="\/assets\/engine\/COPYING\.txt"/);
});

// A pretend Stockfish worker: answers uci, isready and go, and remembers what it was told.
function fakeBrowser() {
  const workers = [];
  class FakeWorker {
    constructor(url) {
      this.url = url;
      this.sent = [];
      this.handlers = { message: [], error: [] };
      this.terminated = false;
      workers.push(this);
    }
    addEventListener(type, fn) {
      this.handlers[type].push(fn);
    }
    emit(type, data) {
      for (const fn of this.handlers[type]) fn(type === 'message' ? { data } : {});
    }
    postMessage(cmd) {
      this.sent.push(cmd);
      const reply = (line) => setTimeout(() => this.emit('message', line), 0);
      if (cmd === 'uci') reply('uciok');
      else if (cmd === 'isready') reply('readyok');
      else if (cmd.startsWith('go')) {
        reply('info depth 10 score cp 30 pv e2e4');
        reply('bestmove e2e4');
      }
    }
    terminate() {
      this.terminated = true;
    }
  }
  globalThis.window = {};
  globalThis.Worker = FakeWorker;
  globalThis.fetch = async () => new Response(new Uint8Array(16), { status: 200 });
  URL.createObjectURL = () => 'blob:fake';
  URL.revokeObjectURL = () => {};
  return workers;
}

test('engine: sends the moves played, so repetitions count, and starts a new worker after a crash', async () => {
  const workers = fakeBrowser();
  const { createEngine } = await import('../public/assets/engine.js');
  const phases = [];
  const engine = createEngine({ onState: (s) => phases.push(s.phase) });
  const got = await engine.look({ fen: START, moves: ['g1f3', 'g8f6'] });
  assert.deepEqual(got, { move: 'e2e4', score: { cp: 30 }, depth: 10 });
  assert.ok(workers[0].sent.includes(`position fen ${START} moves g1f3 g8f6`));
  assert.equal(engine.phase, 'ready');

  workers[0].emit('error');
  assert.equal(workers[0].terminated, true);
  assert.equal(engine.phase, 'failed');
  await engine.look({ fen: START });
  assert.equal(workers.length, 2, 'a fresh worker after the crash');
  assert.ok(workers[1].sent.includes(`position fen ${START}`));
  assert.equal(engine.phase, 'ready');
  assert.ok(phases.includes('download'));
});
