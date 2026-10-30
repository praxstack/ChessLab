import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../testing/fixture.js';

test('vision rounds count down, score answers, expire and record bests', async () => {
  let stamp = 10000; const f = fixture({now: () => stamp});
  assert.deepEqual((await f.get('/api/vision')).body, {round: null, history: [], bests: [], serverNow: 10000});
  assert.equal((await f.post('/api/vision/start', {mode: 'squares', color: 'w', coordinates: true})).status, 400);
  const started = await f.post('/api/vision/start', {mode: 'coordinates', color: 'w', coordinates: true}); assert.equal(started.status, 201);
  let round = started.body.round; assert.equal(round.startsAt, 13000); assert.equal(round.endsAt, 43000);
  assert.equal((await f.post('/api/vision/start', {mode: 'moves', color: 'b', coordinates: false})).status, 200, 'an active round is resumed, not replaced');
  assert.equal((await f.post(`/api/vision/${round.id}`, {action: 'answer', square: round.prompt.to, revision: 0})).status, 409, 'the countdown must finish');
  stamp = 14000;
  let answered = await f.post(`/api/vision/${round.id}`, {action: 'answer', square: round.prompt.to, revision: 0}); assert.equal(answered.body.correct, true); round = answered.body.round; assert.equal(round.score, 1);
  const wrong = ['a1', 'h8'].find(square => square !== round.prompt.to);
  answered = await f.post(`/api/vision/${round.id}`, {action: 'answer', square: wrong, revision: round.revision}); assert.equal(answered.body.correct, false); round = answered.body.round; assert.equal(round.mistakes, 1);
  assert.equal((await f.post(`/api/vision/${round.id}`, {action: 'answer', square: 'z9', revision: round.revision})).status, 400);
  assert.equal((await f.post(`/api/vision/${round.id}`, {action: 'answer', square: 'a1', revision: 0})).status, 409);
  stamp = 50000; f.reload();
  const after = (await f.get('/api/vision')).body; assert.equal(after.round.state, 'complete');
  assert.deepEqual(after.bests, [{mode: 'coordinates', color: 'w', coordinates: true, score: 1, rounds: 1}]);
  assert.equal(after.history[0].prompt, undefined, 'history leaves out prompts and answers');
  assert.equal((await f.post(`/api/vision/${round.id}`, {action: 'quit', revision: after.round.revision})).body.message, 'This round has ended.');
  assert.equal((await f.post('/api/vision/missing', {action: 'quit', revision: 0})).status, 404);
});

test('two answers sent at once with the same revision cannot both count', async () => {
  let stamp = 10000; const f = fixture({now: () => stamp});
  const round = (await f.post('/api/vision/start', {mode: 'coordinates', color: 'w', coordinates: true})).body.round;
  stamp = 14000;
  const answer = {action: 'answer', square: round.prompt.to, revision: 0};
  const results = await Promise.all([f.post(`/api/vision/${round.id}`, answer), f.post(`/api/vision/${round.id}`, answer)]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409], 'the second answer sees the first one saved');
  const saved = (await f.get('/api/vision')).body.round;
  assert.equal(saved.score, 1); assert.equal(saved.revision, 1);
});

test('two starts at once open one round', async () => {
  const f = fixture({now: () => 10000});
  const body = {mode: 'coordinates', color: 'w', coordinates: true};
  const [a, b] = await Promise.all([f.post('/api/vision/start', body), f.post('/api/vision/start', body)]);
  assert.equal(a.body.round.id, b.body.round.id);
  assert.equal((await f.get('/api/vision')).body.history.length, 1);
});
