import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../testing/fixture.js';

test('the opening catalogue is bounded and opening studies keep their full history', async () => {
  const f = fixture();
  const list = await f.get('/api/openings?q=Italian%20Game&eco=C'); assert.equal(list.status, 200); assert.ok(list.body.total > 0); assert.ok(list.body.items.length <= 24); assert.ok(list.body.items.every(item => item.eco.startsWith('C')));
  assert.equal((await f.get('/api/openings?page=-1')).status, 400); assert.equal((await f.get('/api/openings?eco=Z')).status, 400); assert.equal((await f.get('/api/openings?q=nonexistent_chess_name')).body.total, 0);
  const id = list.body.items.find(item => item.name === 'Italian Game').id, detail = await f.get('/api/openings/' + id); assert.equal(detail.status, 200); assert.ok(detail.body.opening.moves.length >= 5);
  assert.equal((await f.get('/api/openings/not-an-opening')).status, 404);
  const saved = await f.post(`/api/openings/${id}/study`, {moves: ['e2e3']}); assert.equal(saved.status, 201); const game = saved.body.game;
  assert.deepEqual(game.moves, detail.body.opening.moves); assert.equal(game.opening.id, id);
  const found = await f.post('/api/openings/recognize', {moves: game.moves}); assert.equal(found.body.opening.name, 'Italian Game'); assert.equal(found.body.opening.matchType, 'line');
  assert.equal((await f.post('/api/openings/recognize', {moves: ['e2e5']})).status, 400);
  const live = (await f.post('/api/games', {color: 'w', level: 2})).body.game;
  assert.equal((await f.post('/api/openings/recognize', {gameId: 'missing', moves: []})).status, 404);
  assert.equal((await f.post('/api/openings/recognize', {gameId: live.id, moves: []})).status, 200); assert.equal((await f.get(`/api/games/${live.id}`)).body.game.reviewUsed, true);
  const exported = await f.get(`/api/games/${game.id}/pgn`); assert.match(exported.body.text, /\[Opening "Italian Game"\]/); assert.match(exported.body.text, /\[ECO "C50"\]/);
});

test('the explorer has no master corpus in the browser but explores your completed games', async () => {
  const f = fixture();
  assert.deepEqual((await f.get('/api/explorer')).body, {available: false, moves: [], games: [], total: 0, source: null, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'});
  assert.equal((await f.get('/api/explorer?fen=bad')).status, 400);
  assert.equal((await f.get('/api/explorer?source=other')).status, 400);
  assert.equal((await f.get('/api/explorer/games/12?source=elite')).status, 404);
  const pgn = '[White "Local White"]\n[Black "Local Black"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0';
  const imported = (await f.post('/api/import', {pgn})).body.game;
  const result = await f.get('/api/explorer?source=mine'); assert.equal(result.body.total, 1); assert.equal(result.body.moves[0].san, 'e4'); assert.equal(result.body.source.label, 'My completed games');
  const example = (await f.get(`/api/explorer/games/${imported.id}?source=mine`)).body.game;
  const copy = (await f.post('/api/import', {pgn: example.pgn})).body.game; assert.notEqual(copy.id, imported.id); assert.deepEqual(copy.moves, imported.moves);
  const bot = (await f.post('/api/games', {color: 'w'})).body.game; await f.post(`/api/games/${bot.id}/move`, {move: 'd2d4', revision: 0}); await f.post(`/api/games/${bot.id}/resign`, {revision: 1});
  const ownBot = (await f.get(`/api/explorer/games/${bot.id}?source=mine`)).body.game; assert.equal(ownBot.headers.White, 'You'); assert.match(ownBot.pgn, /d4/);
  f.reload(); assert.equal((await f.get('/api/explorer?source=mine')).body.total, 3);
});
