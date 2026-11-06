import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwitchableEngine, createCatalogEngine, PICK_KEY, TRYING_KEY} from './switchable.js';
import {appEngines, warningLines, NOT_HERE, BUNDLED_ID} from './catalog.js';
import {engineById} from '../../../../site/public/assets/engine-catalog.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const engines = appEngines({siteCatalog: true, isolated: false});

// A stand-in app engine: ready() resolves when its start is released, searches say which engine answered.
function fakeAppEngine(id) {
  let release, refuse;
  const started = new Promise((resolve, reject) => { release = resolve; refuse = reject; });
  const engine = {
    id, closed: false, searches: 0, release, refuse,
    status: async () => ({available: true, name: id, version: id, chess960: true}),
    ready: () => started,
    idle: () => Promise.resolve(),
    analyze: async input => { engine.searches += 1; return {engine: id, bestmove: 'e2e4', lines: [], tablebaseHits: 0, limits: {movetime: input.movetime, lines: 1}}; },
    bestMove: async () => ({move: 'e2e4', engine: id}),
    stop() {}, close() { engine.closed = true; },
  };
  started.catch(() => {});
  return engine;
}

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key), map};
}

function setup({storage = memoryStorage(), saved = async () => true} = {}) {
  const made = [];
  const engine = createSwitchableEngine({
    engines, storage, saved,
    createBundled: () => { const e = fakeAppEngine(BUNDLED_ID); e.release(); made.push(e); return e; },
    createFor: (spec, {onState, signal}) => { const e = fakeAppEngine(spec.id); e.onState = onState; e.signal = signal; made.push(e); return e; },
  });
  return {engine, made, storage};
}

test('catalog: the bundled engine runs anywhere; the others only where the site serves them, and several cores not yet', () => {
  const here = appEngines({siteCatalog: true, isolated: false});
  assert.equal(here.find(e => e.id === BUNDLED_ID).cantRun, '');
  assert.equal(here.find(e => e.id === 'maia1-1500').cantRun, '');
  assert.match(here.find(e => e.id === 'sf19-lite-mt').cantRun, /several cores/);
  assert.equal(appEngines({siteCatalog: true, isolated: true}).find(e => e.id === 'sf19-lite-mt').cantRun, '');
  const elsewhere = appEngines({siteCatalog: false});
  assert.equal(elsewhere.find(e => e.id === BUNDLED_ID).cantRun, '');
  assert.equal(elsewhere.find(e => e.id === 'maia1-1500').cantRun, NOT_HERE);
  assert.ok(here.every(e => e.size && typeof e.heavy === 'boolean'), 'every entry says its size and whether it gets the warning');
  assert.equal(here.find(e => e.id === 'sf19-full').heavy, true);
  assert.equal(here.find(e => e.id === 'maia1-1500').heavy, false);
  assert.equal(here.find(e => e.id === 'maia1-1500').neural, true);
  const lines = warningLines(here.find(e => e.id === 'sf19-full'), {downlink: 20, cellular: true});
  assert.deepEqual(lines.map(([label]) => label), ['Size', 'Rough time', 'Data', 'Memory', 'Risk', 'Devices', 'Stopping']);
  assert.match(lines[0][1], /99 MB/);
});

test('the bundled engine serves until the chosen one answers, then the switch is remembered and the old one closes', async () => {
  const {engine, made, storage} = setup();
  assert.equal((await engine.analyze({fen: START, moves: [], movetime: 50})).engine, BUNDLED_ID);
  const state = await engine.use('maia1-1500');
  assert.deepEqual(state.current, {id: BUNDLED_ID, name: 'Stockfish 19 Lite', size: '1.9 MB'});
  assert.equal(state.switching.id, 'maia1-1500');
  assert.equal(state.switching.phase, 'start');
  const next = made.at(-1);
  next.onState({phase: 'download', got: 5, total: 18e6, spec: {}});
  assert.deepEqual(engine.state().switching, {id: 'maia1-1500', name: 'Maia-1 1500', phase: 'download', got: 5, total: 18e6, fromDevice: undefined, checking: undefined});
  assert.equal((await engine.analyze({fen: START, moves: [], movetime: 50})).engine, BUNDLED_ID, 'the old engine still answers');
  next.release();
  await tick();
  assert.equal(engine.state().switching, null);
  assert.equal(engine.state().current.id, 'maia1-1500');
  assert.equal(storage.getItem(PICK_KEY), 'maia1-1500');
  assert.equal((await engine.analyze({fen: START, moves: [], movetime: 50})).engine, 'maia1-1500');
  await tick();
  assert.equal(made[0].closed, true, 'the bundled engine is closed once idle');
  const status = await engine.status();
  assert.equal(status.label, 'Maia-1 1500');
  assert.equal(status.humanLike, true);
  // Back to the bundled engine: the pick is forgotten.
  await engine.use(BUNDLED_ID);
  made.at(-1).release();
  await tick();
  assert.equal(engine.state().current.id, BUNDLED_ID);
  assert.equal(storage.getItem(PICK_KEY), null);
});

test('a failed or stopped download leaves the engine in use alone and says what happened', async () => {
  const {engine, made} = setup();
  await engine.use('sf19-full');
  made.at(-1).refuse(new Error('The engine download is damaged'));
  await tick();
  assert.deepEqual(engine.state().failed, {id: 'sf19-full', error: 'The engine download is damaged'});
  assert.equal(engine.state().switching, null);
  assert.equal(engine.state().current.id, BUNDLED_ID);
  assert.equal(made.at(-1).closed, true);
  await engine.use('sf18-lite');
  const second = made.at(-1);
  assert.equal(engine.state().failed, null, 'a new switch clears the old failure');
  engine.cancel();
  assert.equal(second.signal.aborted, true, 'the loader is told to stop');
  assert.equal(second.closed, true);
  assert.deepEqual(engine.state().failed, {id: 'sf18-lite', error: 'Download stopped.'});
  // A stop the loader reports itself (its cancel error) reads the same way.
  await engine.use('sf17-lite');
  made.at(-1).refuse(Object.assign(new Error('Download stopped'), {cancelled: true}));
  await tick();
  assert.equal(engine.state().failed.error, 'Download stopped.');
});

test('an engine that cannot run here, or is not in the list, is refused before anything downloads', async () => {
  const {engine, made} = setup();
  await assert.rejects(engine.use('sf19-lite-mt'), error => error.status === 503 && /several cores/.test(error.message));
  await assert.rejects(engine.use('nope'), error => error.status === 400);
  assert.equal(made.length, 1, 'only the bundled engine exists');
  await engine.use('maia1-1500');
  const first = made.at(-1);
  await engine.use('maia1-1500');
  assert.equal(made.at(-1), first, 'asking again for the engine already downloading starts nothing new');
  await engine.use('sf18-lite');
  assert.equal(first.closed, true, 'asking for another engine drops the one downloading');
});

test('the remembered engine starts from the device on the next visit; a heavy one no longer kept is not fetched unasked', async () => {
  const light = setup({storage: memoryStorage({[PICK_KEY]: 'maia1-1500'})});
  await tick();
  assert.equal(light.engine.state().switching.id, 'maia1-1500');
  const heavyKept = setup({storage: memoryStorage({[PICK_KEY]: 'sf19-full'}), saved: async () => true});
  await tick();
  assert.equal(heavyKept.engine.state().switching.id, 'sf19-full');
  const heavyGone = setup({storage: memoryStorage({[PICK_KEY]: 'sf19-full'}), saved: async () => false});
  await tick();
  assert.equal(heavyGone.engine.state().switching, null);
  assert.match(heavyGone.engine.state().failed.error, /no longer kept on this device/);
  assert.equal(heavyGone.engine.state().remembered, 'sf19-full');
  const elsewhere = createSwitchableEngine({engines: appEngines({siteCatalog: false}), storage: memoryStorage({[PICK_KEY]: 'maia1-1500'}), createBundled: () => fakeAppEngine(BUNDLED_ID)});
  await tick();
  assert.equal(elsewhere.state().switching, null, 'at pages.dev the remembered catalog engine cannot start');
});

test('a catalog engine gets its worker from the site loader, after the handshake, and takes any engine name', async () => {
  const sent = [];
  const worker = {
    onmessage: null, onerror: null,
    postMessage(command) {
      sent.push(command);
      const say = (...lines) => queueMicrotask(() => this.onmessage?.({data: lines.join('\n')}));
      if (command === 'uci') say('id name Maia-1', 'uciok');
      else if (command === 'isready') say('readyok');
      else if (command.startsWith('go ')) say('info depth 1 multipv 1 score cp 12 pv e2e4', 'bestmove e2e4');
    },
    terminate() { this.terminated = true; },
  };
  const calls = [];
  const spec = engineById('maia1-1500');
  const engine = createCatalogEngine(spec, {onState: () => {}, signal: undefined, startWorker: async (s, options) => { calls.push([s.id, Object.keys(options)]); return {worker, fromDevice: true, total: s.bytes, startMs: 1}; }});
  const found = await engine.ready();
  assert.deepEqual(calls, [['maia1-1500', ['onState', 'signal']]]);
  assert.equal(found.name, 'Maia-1');
  const result = await engine.analyze({fen: START, moves: [], movetime: 50});
  assert.equal(result.engine, 'Maia-1');
  assert.equal(result.bestmove, 'e2e4');
  engine.close();
  assert.equal(worker.terminated, true);
});

test('an engine that was still starting when the page went away is not started again unasked', async () => {
  const storage = memoryStorage({[PICK_KEY]: 'sf19-full', [TRYING_KEY]: 'sf19-full'});
  const {engine, made} = setup({storage});
  await tick();
  assert.equal(engine.state().switching, null);
  assert.match(engine.state().failed.error, /didn’t finish starting last time/);
  assert.equal(storage.getItem(PICK_KEY), null, 'the pick is forgotten');
  assert.equal(storage.getItem(TRYING_KEY), null);
  await engine.use('sf19-full');
  assert.equal(storage.getItem(TRYING_KEY), 'sf19-full', 'set while it starts');
  made.at(-1).release();
  await tick();
  assert.equal(storage.getItem(TRYING_KEY), null, 'cleared once it answers');
  assert.equal(storage.getItem(PICK_KEY), 'sf19-full');
});
