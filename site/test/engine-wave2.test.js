// The second wave of engines: the DeepMind searchless model's input and output
// (searchless.js), and the engine loader's new shapes: a script-only engine,
// Stockfish 11's plain blob address, a module worker, and a net in its own
// file read through setoption EvalFile (Stockfish 16).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Chess } from '../public/assets/vendor/chess.js';
import {
  ACTIONS,
  ACTION_INDEX,
  BUCKET_VALUES,
  CHARACTERS,
  NUM_BUCKETS,
  ROW_LENGTH,
  SEQUENCE_LENGTH,
  cleanFen,
  encodeRows,
  pickMove,
  tokenize,
  winProbability,
  winToCp,
} from '../public/assets/searchless.js';
import { engineById, engineFiles } from '../public/assets/engine-catalog.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const sha = (b) => createHash('sha256').update(b).digest('hex');

/* -------------------------------------------------- the searchless model */

test('searchless: the 1968 actions are exactly the published actions.json, in order', () => {
  assert.equal(ACTIONS.length, 1968);
  assert.equal(new Set(ACTIONS).size, 1968);
  // cstr/searchless-chess-onnx actions.json (the repository's utils.ACTION_TO_MOVE), as JSON.stringify writes it.
  assert.equal(sha(JSON.stringify(ACTIONS)), '34f6b8fe3636f98a9b5f51832f1fbe982f63114149c99090662d9c9ed80fe7e9');
  assert.deepEqual(ACTIONS.slice(0, 3), ['a1b1', 'a1c1', 'a1d1']);
  assert.equal(ACTION_INDEX.get('e1g1'), ACTIONS.indexOf('e1g1'), 'castling is a king move of two squares');
  assert.ok(ACTION_INDEX.has('a7a8q') && ACTION_INDEX.has('h2g1n'), 'promotions, with captures');
  assert.ok(!ACTION_INDEX.has('a7a8k'));
});

test('searchless: a FEN becomes the 77 tokens of tokenizer.py', () => {
  assert.equal(CHARACTERS.length, 31);
  const t = tokenize(START);
  assert.equal(t.length, SEQUENCE_LENGTH);
  const dot = CHARACTERS.indexOf('.');
  assert.equal(t[0], CHARACTERS.indexOf('w'), 'side to move first');
  assert.deepEqual(t.slice(1, 9), [...'rnbqkbnr'].map((c) => CHARACTERS.indexOf(c)), 'then the board from a8');
  assert.deepEqual(t.slice(65, 69), [...'KQkq'].map((c) => CHARACTERS.indexOf(c)));
  assert.deepEqual(t.slice(69, 71), [dot, dot], 'no en passant');
  assert.deepEqual(t.slice(71), [CHARACTERS.indexOf('0'), dot, dot, CHARACTERS.indexOf('1'), dot, dot], 'move counters padded to three');
  // The same position tokenize() in the original Python gives (black to move after 1.e4, en passant e3).
  assert.equal(
    tokenize('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1').join(','),
    '11,20,19,11,22,21,11,19,20,18,18,18,18,18,18,18,18,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,23,30,30,30,30,30,30,30,30,30,30,30,23,23,23,23,30,23,23,23,26,25,24,27,28,24,25,26,28,27,21,22,14,3,0,30,30,1,30,30',
  );
  const partial = tokenize('4k3/8/8/8/8/8/8/R3K3 w Q - 12 40');
  assert.deepEqual(partial.slice(65, 69), [CHARACTERS.indexOf('Q'), dot, dot, dot], 'castling padded to four');
  assert.throws(() => tokenize('8/8/8 w - -'), /six fields/);
});

test('searchless: one row per move, the FEN tokens then the action then 0', () => {
  const rows = encodeRows(START, ['e2e4', 'g1f3']);
  assert.ok(rows instanceof BigInt64Array);
  assert.equal(rows.length, 2 * ROW_LENGTH);
  assert.equal(rows[SEQUENCE_LENGTH], BigInt(ACTION_INDEX.get('e2e4')));
  assert.equal(rows[ROW_LENGTH + SEQUENCE_LENGTH], BigInt(ACTION_INDEX.get('g1f3')));
  assert.equal(rows[ROW_LENGTH - 1], 0n);
  assert.deepEqual([...rows.slice(0, SEQUENCE_LENGTH)].map(Number), tokenize(START));
  assert.throws(() => encodeRows(START, ['e2e9']), /no action/);
});

test('searchless: win probability from the buckets, centipawns from the win probability, the best move picked', () => {
  assert.equal(BUCKET_VALUES.length, NUM_BUCKETS);
  assert.equal(BUCKET_VALUES[0], 0.00390625);
  assert.equal(BUCKET_VALUES[127], 0.99609375);
  const logOf = (bucket) => Float32Array.from({ length: NUM_BUCKETS }, (_, i) => (i === bucket ? 0 : -Infinity));
  assert.equal(winProbability(logOf(127)), 0.99609375);
  const uniform = Float32Array.from({ length: NUM_BUCKETS }, () => Math.log(1 / NUM_BUCKETS));
  assert.ok(Math.abs(winProbability(uniform) - 0.5) < 1e-6);
  assert.equal(winToCp(0.5), 0);
  assert.equal(winToCp(0.75), -winToCp(0.25), 'the same distance either side of even');
  assert.ok(Math.abs(winToCp(1 / (1 + Math.exp(-0.00368208 * 300))) - 300) <= 1, 'inverts the training curve');
  assert.equal(winToCp(1), 2000, 'a sure win is capped, never a mate');
  assert.equal(winToCp(0), -2000);
  const two = new Float32Array([...logOf(40), ...logOf(100)]);
  assert.equal(pickMove(['a2a3', 'e2e4'], two).move, 'e2e4');
  assert.equal(pickMove(['a2a3', 'e2e4'], two, [false, true]).move, 'e2e4', '0.5 for a repetition still beats a losing move');
  const winning = new Float32Array([...logOf(120), ...logOf(127)]);
  assert.equal(pickMove(['a2a3', 'e2e4'], winning, [false, true]).move, 'a2a3', 'a winning side avoids the repetition');
  assert.equal(pickMove([], new Float32Array()), null);
});

test('searchless: the en passant square is kept only when the capture is legal, as python-chess writes it', () => {
  const legal = (fen) => new Chess(fen).moves({ verbose: true });
  const can = 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3';
  assert.equal(cleanFen(can, legal(can)), can);
  const cannot = 'rnbqkbnr/ppppp1pp/8/5p2/8/8/PPPPPPPP/RNBQKBNR w KQkq f6 0 2';
  assert.equal(cleanFen(cannot, legal(cannot)).split(' ')[3], '-');
});

test('searchless: the catalog entry runs as a module worker, hands it the model, and lists every file it fetches', () => {
  const e = engineById('dm-9m');
  assert.equal(e.status, 'ready');
  assert.equal(e.module, true);
  const { worker, wasm, net } = engineFiles(e);
  assert.equal(worker.path, '/assets/engine/searchless-worker.js');
  assert.equal(wasm.role, 'model');
  assert.equal(net, undefined);
  assert.deepEqual(
    e.files.filter((f) => f.role === 'runtime').map((f) => f.path),
    ['/assets/engine/ort/ort.wasm.bundle.min.mjs', '/assets/engine/ort/ort-wasm-simd-threaded.wasm'],
  );
  assert.ok(e.bytes > wasm.bytes, 'the size shown counts onnxruntime too');
});

/* --------------------------------------------------- the loader's new shapes */

function fakeBrowser(files, { netOk = true } = {}) {
  const workers = [];
  class FakeWorker {
    constructor(url, options) {
      this.url = url;
      this.options = options;
      this.sent = [];
      this.handlers = { message: [], error: [] };
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
      else if (cmd === 'setoption name Use NNUE value true') reply(`Load eval file success: ${netOk ? 1 : 0}`);
      else if (cmd.startsWith('go')) {
        reply('info depth 10 score mate 1 pv a1a8');
        reply('bestmove a1a8');
      }
    }
    terminate() {
      this.terminated = true;
    }
  }
  globalThis.window = {};
  globalThis.Worker = FakeWorker;
  const fetched = [];
  globalThis.fetch = async (path) => {
    fetched.push(path);
    return files[path] ? new Response(files[path], { status: 200 }) : new Response('', { status: 404 });
  };
  let n = 0;
  URL.createObjectURL = () => `blob:http://localhost/${(n += 1)}`;
  URL.revokeObjectURL = () => {};
  return { workers, fetched };
}

const MATE = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
const bytes = (s) => new TextEncoder().encode(s);

test('loader: a script-only engine starts its script with nothing after # and downloads nothing', async () => {
  const { workers, fetched } = fakeBrowser({});
  const { createEngine } = await import('../public/assets/engine.js');
  const engine = createEngine({ spec: engineById('sf19-asm') });
  const got = await engine.look({ fen: MATE });
  assert.equal(got.move, 'a1a8');
  assert.equal(workers[0].url, '/assets/engine/stockfish-19-asm.js');
  assert.equal(workers[0].options, undefined, 'a classic worker');
  assert.deepEqual(fetched, []);
  engine.stop();
});

test('loader: Stockfish 11 gets its blob address as it is; the others get it encoded; a module engine gets a module worker', async () => {
  const wasm = bytes('wasm');
  const { workers } = fakeBrowser({ '/w.wasm': wasm });
  const { createEngine } = await import('../public/assets/engine.js');
  const spec = (more) => ({ id: 'x', name: 'X', files: [{ path: '/w.js', bytes: 9, role: 'worker' }, { path: '/w.wasm', bytes: wasm.length, role: 'wasm' }], ...more });
  for (const [more, url, options] of [
    [{ hash: 'raw' }, /^\/w\.js#blob:http:\/\/localhost\/\d+$/, undefined],
    [{}, /^\/w\.js#blob%3Ahttp%3A%2F%2Flocalhost%2F\d+$/, undefined],
    [{ module: true }, /^\/w\.js#blob%3A/, { type: 'module' }],
  ]) {
    const engine = createEngine({ spec: spec(more) });
    await engine.load();
    const w = workers.at(-1);
    assert.match(w.url, url);
    assert.deepEqual(w.options, options);
    engine.stop();
  }
  assert.equal(engineById('sf11').hash, 'raw');
});

test('loader: a net in its own file is downloaded in checked parts, then read through EvalFile with NNUE on', async () => {
  const wasm = bytes('engine');
  const p0 = bytes('net-part-one');
  const p1 = bytes('net-part-2');
  const whole = new Uint8Array([...p0, ...p1]);
  const files = { '/e.wasm': wasm, '/n.nnue.part0': p0, '/n.nnue.part1': p1 };
  const spec = {
    id: 'net',
    name: 'Net engine',
    files: [
      { path: '/e.js', bytes: 9, role: 'worker' },
      { path: '/e.wasm', bytes: wasm.length, role: 'wasm' },
      {
        path: '/n.nnue',
        bytes: whole.length,
        role: 'net',
        sha256: sha(whole),
        parts: [
          { path: '/n.nnue.part0', bytes: p0.length, sha256: sha(p0) },
          { path: '/n.nnue.part1', bytes: p1.length, sha256: sha(p1) },
        ],
      },
    ],
  };
  const { workers, fetched } = fakeBrowser(files);
  const { createEngine } = await import('../public/assets/engine.js');
  const states = [];
  const engine = createEngine({ spec, onState: (s) => states.push(s) });
  await engine.load();
  assert.deepEqual(fetched, ['/e.wasm', '/n.nnue.part0', '/n.nnue.part1']);
  const sent = workers[0].sent;
  const evalFile = sent.findIndex((c) => /^setoption name EvalFile value blob:/.test(c));
  assert.ok(evalFile > sent.indexOf('uci'), 'after uci');
  assert.equal(sent[evalFile + 1], 'setoption name Use NNUE value true', 'NNUE on second, which loads it');
  assert.ok(sent.indexOf('isready') > evalFile + 1);
  const total = Math.max(...states.filter((s) => s.phase === 'download').map((s) => s.total));
  assert.equal(total, wasm.length + whole.length, 'one progress bar for the engine and its net');
  assert.equal(states.at(-1).phase, 'ready');
  engine.stop();

  // A net the engine can't read means the engine failed, so the page goes back to Lite.
  const bad = fakeBrowser(files, { netOk: false });
  const failing = createEngine({ spec });
  await assert.rejects(failing.load(), /couldn’t read its net/);
  assert.equal(failing.phase, 'failed');
  assert.equal(bad.workers[0].terminated, true);

  // A damaged part is caught before the engine ever starts.
  const damaged = fakeBrowser({ ...files, '/n.nnue.part1': bytes('net-part-X') });
  await assert.rejects(createEngine({ spec }).load(), /damaged/);
  assert.equal(damaged.workers.length, 0);
});

test('loader: every ready engine in the catalog gives the loader what it needs', () => {
  for (const id of ['sf17-lite', 'sf17-full', 'sf18-full', 'sf16', 'sf11', 'sf19-asm', 'dm-9m']) {
    const e = engineById(id);
    assert.equal(e.status, 'ready', id);
    const { worker, wasm, net } = engineFiles(e);
    assert.ok(worker, id);
    if (id === 'sf19-asm') assert.equal(wasm, undefined);
    else assert.ok(wasm, id);
    assert.equal(Boolean(net), id === 'sf16', id);
  }
});

/* ------------------------------------------------- Maia-1 (Lc0 networks) */

test('lc0: the 1858 policy moves are exactly Lc0’s policy index, in order', async () => {
  const { POLICY_INDEX, POLICY_SIZE } = await import('../public/assets/lc0.js');
  assert.equal(POLICY_SIZE, 1858);
  // lczerolens constants.py POLICY_INDEX, as JSON with no spaces.
  assert.equal(sha(JSON.stringify(POLICY_INDEX)), '383843dd028a0854a85f55e385211570fd3066c6de227deb455ba526a2d4b8ff');
  assert.deepEqual(POLICY_INDEX.slice(0, 3), ['a1b1', 'a1c1', 'a1d1']);
  assert.deepEqual(POLICY_INDEX.slice(-3), ['h7h8q', 'h7h8r', 'h7h8b']);
});

test('lc0: moves are looked up from the side to move, a knight promotion is the plain move', async () => {
  const { POLICY_INDEX, bestPolicyMove, policyIndexOf } = await import('../public/assets/lc0.js');
  assert.equal(POLICY_INDEX[policyIndexOf('e2e4', false)], 'e2e4');
  assert.equal(POLICY_INDEX[policyIndexOf('e7e5', true)], 'e2e4', 'Black’s e7e5 is the mirrored e2e4');
  assert.equal(POLICY_INDEX[policyIndexOf('a7a8n', false)], 'a7a8');
  assert.equal(POLICY_INDEX[policyIndexOf('a7a8q', false)], 'a7a8q');
  assert.equal(POLICY_INDEX[policyIndexOf('b2a1r', true)], 'b7a8r');
  assert.equal(POLICY_INDEX[policyIndexOf('e1g1', false)], 'e1g1', 'castling is the king’s two-square move');
  const logits = new Float32Array(1858).fill(-5);
  logits[policyIndexOf('d7d5', true)] = 3;
  logits[policyIndexOf('e7e5', true)] = 2;
  logits[policyIndexOf('a2a4', false)] = 9; // not legal for Black: ignored
  assert.equal(bestPolicyMove(['e7e5', 'd7d5', 'g8f6'], logits, true).move, 'd7d5');
  assert.equal(bestPolicyMove([], logits, true), null);
});

test('lc0: the 112 input planes, from the side to move, with eight positions of history', async () => {
  const { PLANES, encodePlanes } = await import('../public/assets/lc0.js');
  const count = (p, plane) => p.slice(plane * 64, plane * 64 + 64).reduce((a, b) => a + b, 0);
  const at = (p, plane, sq) => p[plane * 64 + (Number(sq[1]) - 1) * 8 + 'abcdefgh'.indexOf(sq[0])];
  const start = encodePlanes([START]);
  assert.equal(start.length, PLANES * 64);
  assert.deepEqual([...Array(13)].map((_, i) => count(start, i)), [8, 2, 2, 2, 1, 1, 8, 2, 2, 2, 1, 1, 0]);
  assert.equal(at(start, 5, 'e1'), 1, 'our king on e1');
  for (const plane of [104, 105, 106, 107, 111]) assert.equal(count(start, plane), 64, `plane ${plane}`);
  assert.equal(count(start, 108), 0, 'White to move');
  for (let h = 1; h < 8; h += 1) assert.deepEqual(start.slice(h * 13 * 64, h * 13 * 64 + 12 * 64), start.slice(0, 12 * 64), 'a game from a FEN repeats its first position');

  // Black to move: mirrored, so Black's pieces are "ours" and sit on ranks 1 and 2.
  const chess = new Chess();
  chess.move('e4');
  const black = encodePlanes([START, chess.fen()]);
  assert.equal(count(black, 108), 64, 'Black to move');
  assert.equal(at(black, 5, 'e1'), 1, 'our (Black’s) king, mirrored to e1');
  assert.equal(at(black, 6, 'e5'), 1, 'their e4 pawn, mirrored to e5');
  assert.equal(at(black, 13 + 6, 'e7'), 1, 'one move back, their pawn was still on e2 (mirrored e7)');

  // A position seen before lights its repetition plane; the 50-move counter is scaled.
  const back = new Chess(START);
  const fens = [back.fen()];
  for (const m of ['Nf3', 'Nf6', 'Ng1', 'Ng8']) {
    back.move(m);
    fens.push(back.fen());
  }
  const again = encodePlanes(fens);
  assert.equal(count(again, 12), 64, 'the start position again');
  assert.equal(count(again, 13 + 12), 0);
  assert.ok(Math.abs(again[109 * 64] - 4 / 99) < 1e-6);
  // Castling rights: White has only the king side left, Black only the queen side.
  const rights = encodePlanes(['r3k2r/8/8/8/8/8/8/R3K2R w Kq - 0 1']);
  assert.deepEqual([104, 105, 106, 107].map((p) => count(rights, p)), [0, 64, 64, 0]);
});

test('lc0: win, draw and loss as probabilities, before or after softmax', async () => {
  const { wdlProbabilities } = await import('../public/assets/lc0.js');
  assert.deepEqual(wdlProbabilities(new Float32Array([0.5, 0.25, 0.25])), [0.5, 0.25, 0.25]);
  const p = wdlProbabilities(new Float32Array([2, 0, -2]));
  assert.ok(Math.abs(p[0] + p[1] + p[2] - 1) < 1e-9);
  assert.ok(p[0] > p[1] && p[1] > p[2]);
});

test('maia: three rating levels, each a module worker with its own checked model, light enough for phones', () => {
  for (const elo of ['1100', '1500', '1900']) {
    const e = engineById(`maia1-${elo}`);
    assert.equal(e.status, 'ready');
    assert.equal(e.module, true);
    assert.equal(e.device, 'light');
    const { worker, wasm } = engineFiles(e);
    assert.equal(worker.path, '/assets/engine/maia-worker.js');
    assert.equal(wasm.path, `/assets/engine/maia-${elo}.onnx`);
    assert.match(wasm.sha256, /^[0-9a-f]{64}$/);
  }
});

test('loader: a whole file with a SHA-256 is checked, and a damaged one never reaches the worker', async () => {
  const model = bytes('a small model');
  const spec = {
    id: 'm',
    name: 'Model',
    module: true,
    files: [
      { path: '/m.js', bytes: 9, role: 'worker' },
      { path: '/m.onnx', bytes: model.length, role: 'model', sha256: sha(model) },
    ],
  };
  const good = fakeBrowser({ '/m.onnx': model });
  const { createEngine } = await import('../public/assets/engine.js');
  const engine = createEngine({ spec });
  await engine.load();
  assert.equal(good.workers.length, 1);
  engine.stop();
  const bad = fakeBrowser({ '/m.onnx': bytes('a small modeL') });
  await assert.rejects(createEngine({ spec }).load(), /damaged/);
  assert.equal(bad.workers.length, 0);
});
