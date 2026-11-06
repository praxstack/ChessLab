import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../testing/fixture.js';
import {createFakeEngine} from '../testing/fake-engine.js';
import {createUnavailableEngine} from '../engine-stub.js';

// A fake engine with the switching seam, as the browser's switchable engine has.
function switchableFake() {
  const engine = createFakeEngine();
  let state = {current: {id: 'sf19-lite', name: 'Stockfish 19 Lite', size: '1.9 MB'}, switching: null, failed: null, remembered: ''};
  return Object.assign(engine, {
    engines: () => [{id: 'sf19-lite', name: 'Stockfish 19 Lite', cantRun: ''}, {id: 'maia1-1500', name: 'Maia-1 1500', cantRun: ''}, {id: 'sf19-lite-mt', name: 'Several cores', cantRun: 'This browser didn’t switch on several cores for this page, so it can’t run here.'}],
    async use(id) {
      const found = this.engines().find(e => e.id === id);
      if (!found) throw Object.assign(new Error('Choose an engine from the list.'), {status: 400});
      if (found.cantRun) throw Object.assign(new Error(found.cantRun), {status: 503});
      state = {...state, switching: {id, name: found.name, phase: 'download', got: 1, total: 2}};
      return state;
    },
    cancel() { state = {...state, switching: null, failed: {id: 'maia1-1500', error: 'Download stopped.'}}; return state; },
    state: () => state,
    status: async () => ({available: true, name: 'Maia-1', version: 'Maia-1', chess960: false, label: 'Maia-1 1500', humanLike: true}),
  });
}

test('/api/engines lists the catalog, the engine in use and the switch under way; use and stop drive it', async () => {
  const f = fixture({engine: switchableFake()});
  const listed = await f.get('/api/engines');
  assert.equal(listed.status, 200);
  assert.deepEqual(Object.keys(listed.body).sort(), ['current', 'engines', 'failed', 'remembered', 'siteCatalog', 'siteUrl', 'switching']);
  assert.equal(listed.body.engines.length, 3);
  assert.equal(listed.body.current.id, 'sf19-lite');
  assert.equal(listed.body.siteUrl, 'https://askthemove.online/betapp/');
  assert.equal((await f.post('/api/engines/use', {})).status, 400);
  assert.equal((await f.post('/api/engines/use', {id: 'nope'})).status, 400);
  assert.equal((await f.post('/api/engines/use', {id: 'sf19-lite-mt'})).status, 503);
  const using = await f.post('/api/engines/use', {id: 'maia1-1500'});
  assert.equal(using.status, 200);
  assert.deepEqual(using.body.switching, {id: 'maia1-1500', name: 'Maia-1 1500', phase: 'download', got: 1, total: 2});
  const stopped = await f.post('/api/engines/stop', {});
  assert.equal(stopped.body.switching, null);
  assert.equal(stopped.body.failed.error, 'Download stopped.');
});

test('the roster names the engine in use, and without the switching seam the picker has nothing to offer', async () => {
  const f = fixture({engine: switchableFake()});
  const engines = (await f.get('/api/bots')).body.engines;
  assert.deepEqual(engines.map(e => [e.id, e.name, e.humanLike, e.chess960]), [['stockfish19', 'Maia-1 1500', true, false]]);
  assert.equal((await f.post('/api/games', {botId: 'marlo', color: 'w', variant: 'chess960'})).status, 400, 'a human move model plays standard chess only');
  const plain = fixture();
  assert.deepEqual((await plain.get('/api/bots')).body.engines.map(e => [e.id, e.name]), [['stockfish19', 'Stockfish 19']], 'an engine without a label keeps the roster name');
  assert.deepEqual((await plain.get('/api/engines')).body.engines, []);
  assert.equal((await plain.post('/api/engines/use', {id: 'maia1-1500'})).status, 503);
  const off = fixture({engine: createUnavailableEngine()});
  assert.equal((await off.get('/api/engines')).body.current, null);
});
