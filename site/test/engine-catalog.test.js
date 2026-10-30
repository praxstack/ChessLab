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
    ['sf19-lite', 'sf19-full', 'sf18-lite'],
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

test('catalog: ready engines are on disk at the listed sizes, under the Cloudflare file limit, with the GPL beside them', () => {
  assert.match(readFileSync(pub('assets/engine/COPYING.txt'), 'utf8'), /GNU GENERAL PUBLIC LICENSE/);
  for (const e of ENGINES.filter((x) => x.status === 'ready')) {
    const { worker, wasm } = engineFiles(e);
    assert.equal(e.licenseUrl, '/assets/engine/COPYING.txt');
    assert.equal(statSync(pub(worker.path)).size, worker.bytes, worker.path);
    const pieces = wasm.parts || [wasm];
    for (const p of pieces) {
      const size = statSync(pub(p.path)).size;
      assert.equal(size, p.bytes, p.path);
      assert.ok(size < CF_LIMIT, `${p.path} is over Cloudflare's 25 MiB`);
    }
    if (wasm.parts) assert.ok(!existsSync(pub(wasm.path)), 'the joined file is not deployed, only its parts');
  }
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
