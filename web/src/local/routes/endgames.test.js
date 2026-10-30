import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../testing/fixture.js';

test('endgame drills list, open as studies and report practice attempts', async () => {
  const f = fixture();
  const items = (await f.get('/api/endgames')).body.items; assert.ok(items.length > 3);
  const drill = items[0];
  const study = await f.post(`/api/endgames/${drill.id}/study`); assert.equal(study.status, 201);
  assert.equal(study.body.game.initialFen, drill.fen); assert.equal(study.body.game.endgameId, drill.id); assert.equal(study.body.game.source, 'import');
  assert.equal((await f.post('/api/endgames/none/study')).status, 404);
  const practice = await f.post(`/api/games/${study.body.game.id}/practice`, {revision: 0, ply: 0, color: drill.fen.split(' ')[1], botId: 'marlo', engineId: 'stockfish19', rating: 800});
  assert.equal(practice.status, 201);
  const attempts = (await f.get('/api/endgame-attempts')).body.attempts;
  assert.deepEqual(attempts, [{id: practice.body.game.id, endgameId: drill.id, color: practice.body.game.color, result: null, resultReason: null, moves: 0, engine: 'Marlo', engineId: 'stockfish19', rating: 800, hints: 0, undos: 0, updatedAt: practice.body.game.updatedAt}]);
});
