// The memory shim the engine workers import first: iPhone and iPad Safari refuse a 2-4 GB shared memory.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserSaid, createChoice, failureReason, engineById } from '../public/assets/engine-catalog.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'engine');

test('a refused big memory is retried with a smaller ceiling; other errors and granted requests pass through', async () => {
  const Real = WebAssembly.Memory;
  const asked = [];
  // A pretend Safari on iPad: anything over 1 GB (16384 pages) is "Out of memory".
  function Fake(desc) {
    asked.push(desc.maximum);
    if (desc.maximum > 16384) throw new RangeError('Out of memory');
    return new Real({ initial: desc.initial, maximum: desc.maximum });
  }
  Fake.prototype = Real.prototype;
  WebAssembly.Memory = Fake;
  try {
    await import(`../public/assets/engine/wasm-memory-fit.js?t=${Date.now()}`);
    const m = new WebAssembly.Memory({ initial: 256, maximum: 65536 });
    assert.ok(m instanceof Real);
    assert.deepEqual(asked, [65536, 32768, 16384], 'tries 4 GB, then 2 GB, then 1 GB');
    asked.length = 0;
    new WebAssembly.Memory({ initial: 1, maximum: 100 });
    assert.deepEqual(asked, [100], 'a small request is passed through as asked');
    assert.throws(() => new WebAssembly.Memory({ initial: 20000, maximum: 65536 }), RangeError, 'never goes below what the engine starts with');
  } finally {
    WebAssembly.Memory = Real;
  }
});

test('every module engine worker imports the memory shim before its engine code', () => {
  const workers = ['maia-worker.js', 'maia2-worker.js', 'maia3-worker.js', 'lc0-worker.js', 'searchless-worker.js', 'lichess/worker-sf19.js', 'lichess/worker-sf19-small.js', 'lichess/worker-fairy.js'];
  for (const w of workers) {
    const imports = readFileSync(join(ROOT, w), 'utf8').split('\n').filter((l) => l.startsWith('import '));
    assert.match(imports[0], /wasm-memory-fit\.js/, `${w} imports the shim first`);
  }
  for (const id of ['maia1-1100', 'maia2-1500', 'lc0-t1-256x10', 'dm-9m', 'sf19-lichess-small', 'fairy-sf14']) {
    assert.ok(engineById(id).files.some((f) => f.path === '/assets/engine/wasm-memory-fit.js'), `${id} lists the shim`);
  }
});

test('an engine that dies says what the browser said, in plain words', () => {
  assert.equal(browserSaid('The engine stopped: RangeError: Out of memory'), 'RangeError: Out of memory');
  assert.equal(browserSaid('The engine stopped'), '');
  assert.equal(failureReason('The engine stopped: RangeError: Out of memory'), 'this device didn’t give the browser tab enough memory for it');
  const store = new Map();
  const c = createChoice({ getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) });
  const back = c.failed(engineById('maia1-1100'), 'The engine stopped: RangeError: Out of memory');
  assert.match(back.message, /^Maia-1 1100 stopped: this device didn’t give the browser tab enough memory for it\. The page is back on Stockfish 19 Lite\. \(The browser said: “RangeError: Out of memory”\.\)$/);
  assert.doesNotMatch(c.failed(engineById('maia1-1100'), 'The engine stopped').message, /browser said/);
});
