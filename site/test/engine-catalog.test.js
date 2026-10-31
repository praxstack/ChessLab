// The engine catalog, the split-file helpers and the remembered engine choice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_ENGINE,
  ENGINES,
  HEAVY_BYTES,
  HEAVY_FAMILIES,
  PICK_KEY,
  TRYING_KEY,
  cantRun,
  createChoice,
  engineById,
  engineFiles,
  engineFor,
  failureReason,
  formatBytes,
  formatDuration,
  isHandheld,
  needsWarning,
  roughTimes,
  threadCount,
  visibleEngines,
} from '../public/assets/engine-catalog.js';
import { MAX_PART_BYTES, checkJoined, checkPart, createJoiner, joinParts, manifestFor, planParts, sha256Hex, splitBytes } from '../public/assets/engine-parts.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = (p) => join(root, 'public', p);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const CF_LIMIT = 25 * 1024 * 1024;

test('catalog: every entry is complete, ids are unique, and Lite is the ready default', () => {
  const ids = new Set();
  for (const e of ENGINES) {
    for (const key of ['id', 'name', 'family', 'about', 'license', 'licenseUrl', 'source']) {
      assert.equal(typeof e[key], 'string', `${e.id}: ${key}`);
      assert.ok(e[key].length > 0, `${e.id}: empty ${key}`);
    }
    assert.ok(!ids.has(e.id), `duplicate id ${e.id}`);
    ids.add(e.id);
    assert.ok(Number.isFinite(e.bytes) && e.bytes > 0, `${e.id}: bytes`);
    assert.equal(e.bytes, e.files.reduce((n, f) => n + f.bytes, 0), `${e.id}: bytes is the sum of its files`);
    assert.ok(['light', 'heavy'].includes(e.device), `${e.id}: device`);
    assert.ok(['ready', 'soon'].includes(e.status), `${e.id}: status`);
    assert.ok(Array.isArray(e.files) && e.files.length > 0, `${e.id}: files`);
    assert.match(e.source, /^https:\/\//, `${e.id}: source is a link`);
    assert.match(e.licenseUrl, /^(https:\/\/|\/assets\/)/, `${e.id}: licence link`);
  }
  const lite = engineById(DEFAULT_ENGINE);
  assert.equal(lite.status, 'ready');
  assert.equal(lite.device, 'light');
  assert.equal(needsWarning(lite), false);
  assert.deepEqual(
    ENGINES.filter((e) => e.status === 'ready').map((e) => e.id),
    ['sf19-lite', 'sf19-full', 'sf19-lite-mt', 'sf19-full-mt', 'sf18-lite', 'sf17-lite', 'sf19-asm', 'sf11', 'sf17-full', 'sf18-full', 'sf16', 'dm-9m', 'maia1-1100', 'maia1-1500', 'maia1-1900', 'maia3-3m-1100', 'maia3-3m-1500', 'maia3-3m-1900', 'maia3-5m-1100', 'maia3-5m-1500', 'maia3-5m-1900', 'maia3-23m-1100', 'maia3-23m-1500', 'maia3-23m-1900', 'maia3-79m-1100', 'maia3-79m-1500', 'maia3-79m-1900', 'maia2-1100', 'maia2-1500', 'maia2-1900'],
  );
});

test('catalog: anything over 100 MB, and every named neural family, is heavy and gets the warning', () => {
  for (const e of ENGINES) {
    if (e.bytes > HEAVY_BYTES || HEAVY_FAMILIES.includes(e.family)) {
      assert.equal(e.device, 'heavy', `${e.id} should be heavy`);
      assert.equal(needsWarning(e), true, `${e.id} should warn`);
    }
    if (e.device === 'heavy') assert.equal(needsWarning(e), true, `${e.id}: heavy always warns`);
  }
  for (const family of HEAVY_FAMILIES) assert.ok(ENGINES.some((e) => e.family === family), `${family} is listed`);
  assert.equal(needsWarning(engineById('sf19-full')), true, 'the 99 MB Stockfish warns');
});

test('catalog: ready engines are on disk at the listed sizes, under the Cloudflare file limit, with their licences beside them', () => {
  assert.match(readFileSync(pub('assets/engine/COPYING.txt'), 'utf8'), /GNU GENERAL PUBLIC LICENSE/);
  for (const e of ENGINES.filter((x) => x.status === 'ready')) {
    const { worker, wasm } = engineFiles(e);
    if (e.family === 'Stockfish') assert.equal(e.licenseUrl, '/assets/engine/COPYING.txt', e.id);
    assert.ok(worker.path.startsWith('/assets/engine/'), `${e.id}: its worker gets the engine policy`);
    assert.equal(Boolean(wasm), !e.scriptOnly, `${e.id}: a .wasm or model unless the script is the whole engine`);
    for (const f of e.files) {
      assert.ok(['worker', 'wasm', 'model', 'net', 'runtime'].includes(f.role), `${e.id}: ${f.path} has a role`);
      assert.ok(!f.approx, `${e.id}: a ready engine lists exact sizes`);
      const pieces = f.parts || [f];
      for (const p of pieces) {
        const size = statSync(pub(p.path)).size;
        assert.equal(size, p.bytes, p.path);
        assert.ok(size < CF_LIMIT, `${p.path} is over Cloudflare's 25 MiB`);
      }
      if (f.parts) {
        assert.ok(f.sha256, `${f.path}: a split file has the whole file's SHA-256`);
        assert.equal(f.parts.reduce((n, p) => n + p.bytes, 0), f.bytes, `${f.path}: its parts add up`);
        assert.ok(!existsSync(pub(f.path)), `${f.path}: the joined file is not deployed, only its parts`);
      }
    }
  }
  const dm = engineById('dm-9m');
  assert.equal(dm.licenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
  assert.match(dm.credit, /DeepMind Technologies Limited/);
  assert.match(dm.credit, /CC BY 4\.0/);
  assert.match(readFileSync(pub('assets/engine/ort/LICENSE.txt'), 'utf8'), /MIT License/);
  for (const elo of ['1100', '1500', '1900']) {
    const maia = engineById(`maia1-${elo}`);
    assert.match(maia.credit, /McIlroy-Young/);
    assert.match(maia.license, /GPL/);
    const model = maia.files.find((f) => f.role === 'model');
    // The file is the one Hugging Face lists (its X-Linked-ETag is the SHA-256).
    assert.equal(sha(readFileSync(pub(model.path))), model.sha256, model.path);
  }
});

test('catalog: every split file matches its manifest, each part’s hash and the whole file’s hash', () => {
  const split = ENGINES.filter((e) => e.status === 'ready').flatMap((e) => e.files.filter((f) => f.parts));
  assert.deepEqual(
    split.map((f) => f.path.replace('/assets/engine/', '')),
    ['stockfish-19-single.wasm', 'stockfish-19.wasm', 'stockfish-17.1-single.wasm', 'stockfish-18-single.wasm', 'nn-5af11540bbfe.nnue', 'searchless-9m.onnx', ...['23m', '79m'].flatMap((z) => Array(3).fill(`maia3-${z}.onnx`)), 'maia2-rapid.onnx', 'maia2-rapid.onnx', 'maia2-rapid.onnx'],
  );
  for (const f of split) {
    const manifest = JSON.parse(readFileSync(pub(`${f.path}.parts.json`), 'utf8'));
    assert.equal(`/assets/engine/${manifest.file}`, f.path);
    assert.equal(manifest.bytes, f.bytes, f.path);
    assert.equal(manifest.sha256, f.sha256, f.path);
    assert.deepEqual(
      manifest.parts.map((p) => [`/assets/engine/${p.file}`, p.bytes, p.sha256]),
      f.parts.map((p) => [p.path, p.bytes, p.sha256]),
      `${f.path}: catalog and manifest list the same parts, in the same order`,
    );
    const whole = createHash('sha256');
    for (const p of f.parts) {
      const bytes = readFileSync(pub(p.path));
      assert.equal(sha(bytes), p.sha256, `${p.path} hash`);
      assert.ok(bytes.length <= MAX_PART_BYTES, `${p.path} is over 24 MiB`);
      whole.update(bytes);
    }
    assert.equal(whole.digest('hex'), f.sha256, `${f.path}: the parts join into the published file`);
  }
  // Stockfish names its nets by the start of their SHA-256, and the DeepMind model matches Hugging Face's.
  assert.ok(engineById('sf16').files.find((f) => f.role === 'net').sha256.startsWith('5af11540bbfe'));
  assert.equal(engineById('dm-9m').files.find((f) => f.role === 'model').sha256, 'ec45313c1ed1451acdf09e56f46fa6dee72698b8cea6803ad0f30c526659dac6');
});

test('catalog: the Lite engines are byte-for-byte the published files (stockfish@19.0.1 and @18.0.8 on npm)', () => {
  const pinned = {
    'stockfish-19-lite-single.js': 'ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a',
    'stockfish-19-lite-single.wasm': 'ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de',
    'stockfish-18-lite-single.js': '5243fd9b276cab7dfe3ad1d43ab9ead73568fac76468c614242977a210c4a391',
    'stockfish-18-lite-single.wasm': 'a8fbc05ec6920b56d7485826dcb02c5ffd2826bcbf751cf973046f237a9096f1',
  };
  for (const [name, hash] of Object.entries(pinned)) assert.equal(sha(readFileSync(pub(`assets/engine/${name}`))), hash, name);
});

test('catalog: Stockfish 17.1’s script differs from the published one only in the line it says it changed', () => {
  const text = readFileSync(pub('assets/engine/stockfish-17.1-single.js'), 'utf8');
  const note = /\/\* Changed by ChessLab[^\n]*\*\/\n/;
  assert.match(text, note, 'the script says what changed, at its top');
  const code = text.replace(note, '');
  assert.equal(code.match(/var enginePartsCount;/g).length, 1);
  assert.doesNotMatch(code, /var enginePartsCount=\d/);
  const restored = code.replace('var enginePartsCount;', 'var enginePartsCount=6;');
  assert.equal(sha(Buffer.from(restored, 'utf8')), '562a55d9189ad013f6c6c55b8d347a37f490ce9542a34abdb06ef56a72f9d1db', 'stockfish@17.1.0 src/stockfish-17.1-single-a496a04.js');
});

test('catalog: the full Stockfish parts match the manifest, each part’s hash and the whole file’s hash', () => {
  const { wasm } = engineFiles(engineById('sf19-full'));
  const manifest = JSON.parse(readFileSync(pub('assets/engine/stockfish-19-single.wasm.parts.json'), 'utf8'));
  assert.equal(manifest.file, 'stockfish-19-single.wasm');
  assert.equal(manifest.bytes, wasm.bytes);
  assert.equal(manifest.bytes, 99169054);
  assert.equal(manifest.sha256, wasm.sha256);
  assert.deepEqual(
    manifest.parts.map((p) => [`/assets/engine/${p.file}`, p.bytes, p.sha256]),
    wasm.parts.map((p) => [p.path, p.bytes, p.sha256]),
    'catalog and manifest list the same parts, in the same order',
  );
  const whole = createHash('sha256');
  for (const p of wasm.parts) {
    const bytes = readFileSync(pub(p.path));
    assert.equal(sha(bytes), p.sha256, `${p.path} hash`);
    assert.ok(bytes.length <= MAX_PART_BYTES, `${p.path} is over 24 MiB`);
    whole.update(bytes);
  }
  assert.equal(whole.digest('hex'), wasm.sha256, 'the parts join into the published file');
});

test('catalog: the light list on phones and tablets, everything on a desktop or when asked', () => {
  assert.equal(isHandheld({ coarse: true, width: 390 }), true, 'phone');
  assert.equal(isHandheld({ coarse: true, width: 1024 }), true, 'iPad');
  assert.equal(isHandheld({ coarse: false, width: 600 }), true, 'narrow screen');
  assert.equal(isHandheld({ coarse: false, width: 1440 }), false, 'desktop');
  assert.equal(isHandheld({ coarse: true, width: 2560 }), false, 'big touch monitor');
  const light = visibleEngines({ handheld: true });
  assert.ok(light.length > 0 && light.every((e) => e.device === 'light'));
  assert.ok(light.some((e) => e.id === DEFAULT_ENGINE));
  assert.equal(visibleEngines({ handheld: true, showAll: true }).length, ENGINES.length);
  assert.equal(visibleEngines({ handheld: false }).length, ENGINES.length);
});

test('catalog: sizes and rough times in plain words', () => {
  assert.equal(formatBytes(1874201), '1.9 MB');
  assert.equal(formatBytes(99197184), '99 MB');
  assert.equal(formatBytes(8044981992), '8.0 GB');
  assert.equal(formatDuration(2), 'a few seconds');
  assert.equal(formatDuration(8), 'about 10 seconds');
  assert.equal(formatDuration(80), 'about a minute');
  assert.equal(formatDuration(600), 'about 10 minutes');
  assert.equal(formatDuration(5400), 'about 1.5 hours');
  const times = roughTimes(99197184);
  assert.equal(times.length, 2);
  assert.equal(times[0].text, 'about 10 seconds'); // 100 Mbit/s
  assert.equal(times[1].text, 'about a minute'); // 10 Mbit/s
  assert.match(roughTimes(99197184, 2)[0].label, /this connection/);
});

test('catalog: a remembered id only picks a ready engine', () => {
  assert.equal(engineFor('sf19-full').id, 'sf19-full');
  assert.equal(engineFor('maia2').id, DEFAULT_ENGINE, 'listed but not runnable');
  assert.equal(engineFor('nonsense').id, DEFAULT_ENGINE);
  assert.equal(engineFor(null).id, DEFAULT_ENGINE);
});

/* ---------------------------------------------------------- split and join */

test('parts: planned under the limit, as even as possible, adding up to the whole', () => {
  assert.deepEqual(planParts(10, 4), [4, 3, 3]);
  assert.deepEqual(planParts(8, 4), [4, 4]);
  assert.deepEqual(planParts(3, 4), [3]);
  const sizes = planParts(99169054);
  assert.equal(sizes.length, 4);
  assert.equal(sizes.reduce((a, b) => a + b, 0), 99169054);
  assert.ok(sizes.every((s) => s <= MAX_PART_BYTES));
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
  assert.throws(() => planParts(0));
  assert.throws(() => planParts(10, 0));
});

test('parts: split then joined gives the same bytes; too many or too few bytes is refused', () => {
  const bytes = new Uint8Array(1000).map((_, i) => (i * 7) % 256);
  const parts = splitBytes(bytes, 300);
  assert.deepEqual(parts.map((p) => p.length), [250, 250, 250, 250]);
  assert.deepEqual(joinParts(parts), bytes);
  assert.deepEqual(joinParts(parts, 1000), bytes);
  assert.throws(() => joinParts(parts, 999), /bigger than expected/);
  assert.throws(() => joinParts(parts.slice(0, 3), 1000), /add up to 750 bytes, not 1000/);
  const j = createJoiner(4);
  assert.equal(j.write(new Uint8Array([1, 2])), 2);
  assert.equal(j.length, 2);
  assert.throws(() => j.done());
});

test('parts: SHA-256 checks catch a damaged part or file, and the manifest lists each part in order', async () => {
  const bytes = new TextEncoder().encode('Stockfish in pieces');
  assert.equal(await sha256Hex(bytes), sha(bytes));
  assert.equal(await sha256Hex(new Uint8Array()), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const parts = splitBytes(bytes, 8);
  const listed = parts.map((p) => ({ bytes: p.length, sha256: sha(p) }));
  for (const [i, p] of parts.entries()) assert.equal(await checkPart(p, listed[i]), true);
  const bad = parts[1].slice();
  bad[0] ^= 1;
  await assert.rejects(checkPart(bad, listed[1]), /damaged/);
  await assert.rejects(checkPart(parts[1].subarray(1), listed[1]), /bytes, not/);
  const whole = { bytes: bytes.length, sha256: sha(bytes) };
  assert.equal(await checkJoined(joinParts(parts), whole), true);
  await assert.rejects(checkJoined(joinParts([parts[1], parts[0], parts[2]]), whole), /damaged/, 'wrong order fails the whole-file check');
  const manifest = manifestFor({ file: 'x.wasm', bytes: bytes.length, sha256: whole.sha256, parts: listed });
  assert.deepEqual(
    manifest.parts.map((p) => p.file),
    ['x.wasm.part0', 'x.wasm.part1', 'x.wasm.part2'],
  );
  assert.equal(manifest.parts[2].sha256, listed[2].sha256);
});

/* ------------------------------------------------- the remembered choice */

function memoryStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

test('choice: starts on Lite, remembers a ready engine once it answers', () => {
  const s = memoryStorage();
  const c = createChoice(s);
  assert.equal(c.start().engine.id, DEFAULT_ENGINE);
  const full = engineById('sf19-full');
  c.starting(full);
  assert.equal(s.m.get(TRYING_KEY), 'sf19-full');
  c.ready(full);
  assert.equal(s.m.get(PICK_KEY), 'sf19-full');
  assert.equal(s.m.has(TRYING_KEY), false);
  const next = createChoice(s).start();
  assert.equal(next.engine.id, 'sf19-full');
  assert.equal(next.note, '');
});

test('choice: a heavy engine that fails goes back to Lite, says why, and the next start loads Lite', () => {
  const s = memoryStorage({ [PICK_KEY]: 'sf19-full' });
  const c = createChoice(s);
  const full = engineById('sf19-full');
  for (const [error, why] of [
    ['HTTP 404', /download failed/],
    ['The engine download is damaged (its SHA-256 does not match)', /arrived damaged/],
    ['An engine part is 12 bytes, not 24792264', /arrived damaged/],
    ['No uciok', /couldn’t start on this device/],
    ['The engine stopped', /may need more memory/],
  ]) {
    s.m.set(PICK_KEY, 'sf19-full');
    const back = c.failed(full, error);
    assert.equal(back.engine.id, DEFAULT_ENGINE, error);
    assert.match(back.message, why, error);
    assert.match(back.message, /back on Stockfish 19 Lite/);
    assert.equal(s.m.get(PICK_KEY), DEFAULT_ENGINE, 'the saved choice is Lite again, so it is not retried');
    assert.equal(createChoice(s).start().engine.id, DEFAULT_ENGINE);
  }
  // Lite itself failing has nothing lighter to go to: the page keeps "tap to try again".
  assert.equal(c.failed(engineById(DEFAULT_ENGINE), 'HTTP 500'), null);
});

test('choice: a start that never finished (the tab froze or crashed) means Lite next visit, with a note', () => {
  const s = memoryStorage({ [PICK_KEY]: 'sf19-full', [TRYING_KEY]: 'sf19-full' });
  const got = createChoice(s).start();
  assert.equal(got.engine.id, DEFAULT_ENGINE);
  assert.match(got.note, /Stockfish 19 didn’t finish starting/);
  assert.equal(s.m.get(PICK_KEY), DEFAULT_ENGINE);
  assert.equal(s.m.has(TRYING_KEY), false);
  assert.equal(createChoice(s).start().note, '', 'said once');
});

test('choice: a stored id that is unknown or not runnable, or storage that throws, means Lite', () => {
  assert.equal(createChoice(memoryStorage({ [PICK_KEY]: 'lc0-bt3' })).start().engine.id, DEFAULT_ENGINE);
  assert.equal(createChoice(memoryStorage({ [PICK_KEY]: '???' })).start().engine.id, DEFAULT_ENGINE);
  const throwing = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('QuotaExceededError');
    },
    removeItem() {
      throw new Error('SecurityError');
    },
  };
  const c = createChoice(throwing);
  assert.equal(c.start().engine.id, DEFAULT_ENGINE);
  c.ready(engineById('sf19-full'));
  assert.equal(c.failed(engineById('sf19-full'), 'x').engine.id, DEFAULT_ENGINE);
  assert.equal(createChoice(null).start().engine.id, DEFAULT_ENGINE);
  assert.match(failureReason('took too long'), /too slow/);
});

test('several cores: only on a cross-origin isolated page, 2 to 4 threads, and a plain reason when it can’t', () => {
  const mt = ENGINES.filter((e) => e.threads);
  assert.deepEqual(mt.map((e) => e.id), ['sf19-lite-mt', 'sf19-full-mt']);
  for (const e of mt) {
    assert.equal(e.status, 'ready');
    assert.match(cantRun(e, { isolated: false }), /several cores/);
    assert.equal(cantRun(e, { isolated: true }), '');
  }
  assert.equal(cantRun(engineById('sf19-lite'), { isolated: false }), '', 'single-core engines run anywhere');
  assert.equal(failureReason(cantRun(mt[0])), 'this browser didn’t switch on several cores for this page');
  assert.deepEqual([undefined, 1, 2, 3, 4, 8, 16].map(threadCount), [2, 2, 2, 2, 3, 4, 4]);
  // The multi-thread scripts are the npm package's, unchanged: they start pthreads, the single ones don't.
  for (const e of mt) {
    const js = readFileSync(pub(engineFiles(e).worker.path), 'utf8');
    assert.match(js, /em-pthread/);
  }
});

test('engine workers start from a versioned URL, so a script cached before COEP is fetched again', async () => {
  const { WORKER_VERSION, workerUrl } = await import('../public/assets/engine.js');
  assert.equal(workerUrl('/assets/engine/stockfish-19-lite-single.js', '#blob%3Ax'), `/assets/engine/stockfish-19-lite-single.js?v=${WORKER_VERSION}#blob%3Ax`);
  assert.equal(workerUrl('/assets/engine/x.js'), `/assets/engine/x.js?v=${WORKER_VERSION}`);
  const src = readFileSync(pub('/assets/engine.js'), 'utf8');
  assert.match(src, /new Worker\(workerUrl\(script\.path, hash\)/, 'the one place a worker starts uses it');
  assert.equal((src.match(/new Worker\(/g) || []).length, 1);
});

test('Maia-2: three ratings share one model and one worker; each tells the worker its rating', () => {
  const m2 = ENGINES.filter((e) => e.family === 'Maia-2');
  assert.deepEqual(m2.map((e) => [e.id, e.status, e.options]), [
    ['maia2-1100', 'ready', ['setoption name Elo value 1100']],
    ['maia2-1500', 'ready', ['setoption name Elo value 1500']],
    ['maia2-1900', 'ready', ['setoption name Elo value 1900']],
  ]);
  const paths = m2.map((e) => e.files.map((f) => f.path).join());
  assert.equal(new Set(paths).size, 1, 'the same files, so one download serves all three');
  for (const e of m2) assert.ok(needsWarning(e), 'an 85 MB model gets the warning first');
  const worker = engineFiles(m2[0]).worker;
  assert.equal(statSync(pub(worker.path)).size, worker.bytes);
  assert.match(readFileSync(pub(worker.path), 'utf8'), /setoption name Elo value/);
});
