import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../testing/fixture.js';
import {createUnavailableEngine} from '../engine-stub.js';

test('accounts are no-ops: every sign-in route returns the one local profile', async () => {
  const f = fixture();
  const me = await f.get('/api/me');
  assert.equal(me.status, 200);
  assert.deepEqual(me.body, {user: {id: 'local', username: 'You', coachAi: false}, progress: {lessons: [], puzzles: []}});
  assert.equal((await f.post('/api/register', {username: 'x', password: 'short'})).status, 201);
  assert.deepEqual((await f.post('/api/login', {})).body.user, me.body.user);
  assert.deepEqual((await f.post('/api/logout', {})).body.user, me.body.user, 'logout keeps the local profile');
  assert.equal((await f.get('/api/games')).status, 200, 'no route needs a sign-in');
});

test('status, bots and errors keep the server shapes', async () => {
  const f = fixture();
  const status = (await f.get('/api/status')).body;
  assert.deepEqual(Object.keys(status).sort(), ['archives', 'billingEnabled', 'coachAi', 'engine', 'hosted', 'inviteRequired', 'local', 'storage']);
  assert.equal(status.storage, 'memory', 'status names the store, so the app can warn when nothing is saved');
  assert.equal(status.engine.available, true);
  assert.deepEqual(status.coachAi, {enabled: false});
  const bots = (await f.get('/api/bots')).body;
  assert.ok(bots.bots.length > 10);
  assert.deepEqual(bots.engines.map(e => [e.id, e.available]), [['stockfish19', true]]);
  assert.deepEqual(await f.get('/api/nothing-here'), {status: 404, body: {error: 'This API route does not exist.'}});
  assert.deepEqual(await f.router.handle('POST', '/api/games', []), {status: 400, body: {error: 'Expected a JSON object.'}});
  assert.equal((await f.router.handle('DELETE', '/api/games')).status, 400, 'a non-GET without a body is refused like a bad body');
});

test('without an engine the app reports it unavailable the way the server does without Stockfish', async () => {
  const f = fixture({engine: createUnavailableEngine()});
  assert.deepEqual((await f.get('/api/status')).body.engine, {available: false, name: 'Stockfish', reason: 'The chess engine is not available in this browser yet.'});
  const engines = (await f.get('/api/bots')).body.engines;
  assert.equal(engines[0].available, false);
  assert.match(engines[0].reason, /not available/);
  assert.equal((await f.post('/api/games', {botId: 'marlo', color: 'w'})).status, 503, 'roster bots need the engine');
  assert.equal((await f.post('/api/games', {color: 'w', level: 2})).status, 201, 'a legacy game is created; only its bot turn needs the engine');
  assert.equal((await f.post('/api/analyze', {moves: ['e2e5']})).status, 400, 'input is checked before the engine');
  const analysis = await f.post('/api/analyze', {moves: ['e2e4']});
  assert.equal(analysis.status, 503);
  assert.match(analysis.body.error, /not available/);
  const imported = (await f.post('/api/import', {pgn: '1. e4 e5 *'})).body.game;
  assert.equal((await f.post('/api/coach/explain', {gameId: imported.id, moves: ['e2e4'], playedMove: 'e7e5'})).status, 503);
});

test('the api() contract: resolves with JSON, throws {message, status}, honours aborts', async () => {
  const f = fixture();
  assert.equal((await f.router.request('/api/me')).user.id, 'local');
  await assert.rejects(f.router.request('/api/games/missing'), error => error.status === 404 && error.message === 'This saved game was not found.');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(f.router.request('/api/me', undefined, controller.signal), {name: 'AbortError'});
  const body = {pgn: '1. e4 *'};
  const game = (await f.router.request('/api/import', body)).game;
  game.moves.push('e7e5');
  assert.deepEqual((await f.router.request(`/api/games/${game.id}`)).game.moves, ['e2e4'], 'answers are copies, not stored objects');
});

test('an unexpected failure returns the server’s 500 message and keeps data', async () => {
  const f = fixture();
  const game = (await f.post('/api/import', {pgn: '1. e4 *'})).body.game;
  const put = f.store.put;
  f.store.put = async () => { throw new Error('disk full'); };
  const original = console.error; console.error = () => {};
  try {
    const failed = await f.post(`/api/games/${game.id}/study`, {studyRevision: 0, study: {version: 1, branches: [], selectedBranchId: null, anchorPly: 0}});
    assert.deepEqual(failed, {status: 500, body: {error: 'The request could not be saved. Retry; your existing games are preserved.'}});
  } finally { f.store.put = put; console.error = original; }
  assert.equal((await f.get(`/api/games/${game.id}`)).body.game.studyRevision, 0);
});
