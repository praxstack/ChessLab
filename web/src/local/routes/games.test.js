import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {fixture} from '../testing/fixture.js';
import {createFakeEngine} from '../testing/fake-engine.js';

// Ported from server/app.test.mjs where the routes apply; account isolation and origin checks have no browser equivalent.
const replyE5 = input => input.moves?.length % 2 ? 'e7e5' : 'e2e4';

test('legal game updates, revision checks, reload, resign, export and import', async () => {
  const f = fixture({engine: createFakeEngine({pick: replyE5})});
  const create = await f.post('/api/games', {color: 'w', level: 2}); assert.equal(create.status, 201); const id = create.body.game.id;
  const change = (suffix, body) => f.post(`/api/games/${id}/${suffix}`, body);
  assert.equal((await change('move', {move: 'e2e5', revision: 0})).status, 400);
  assert.equal((await change('bot', {revision: 0})).status, 409);
  assert.equal((await change('move', {move: 'e2e4', revision: 0})).status, 200);
  assert.equal((await change('move', {move: 'd2d4', revision: 0})).status, 409);
  assert.equal((await change('move', {move: 'd2d4', revision: 1})).status, 409);
  const reply = await change('bot', {revision: 1}); assert.equal(reply.status, 200); assert.deepEqual(reply.body.game.moves, ['e2e4', 'e7e5']);
  assert.equal(f.engine.calls.at(-1).skill, 4, 'level 2 searches at skill 4');
  assert.equal((await f.post('/api/games', [])).status, 400);
  f.reload(); assert.deepEqual((await f.get(`/api/games/${id}`)).body.game.moves, ['e2e4', 'e7e5']);
  const end = await change('resign', {revision: 2}); assert.equal(end.body.game.result, '0-1'); assert.equal(end.body.game.resultReason, 'Resignation');
  assert.equal((await change('move', {move: 'g1f3', revision: 3})).status, 409);
  const exported = await f.get(`/api/games/${id}/pgn`); assert.match(exported.body.text, /1\. e4 e5/); assert.match(exported.body.text, /\[Result "0-1"\]/); assert.match(exported.body.text, /\[White "You"\]/);
  assert.equal(exported.body.filename, `askthemove-${id}.pgn`);
  const imported = await f.post('/api/import', {pgn: exported.body.text}); assert.equal(imported.status, 201); assert.equal(imported.body.game.source, 'import'); assert.equal(imported.body.game.result, '0-1');
  assert.equal((await f.post(`/api/games/${imported.body.game.id}/move`, {move: 'g1f3', revision: 0})).status, 409);
  const before = (await f.get('/api/games')).body.games;
  assert.deepEqual(before.map(g => g.id), [imported.body.game.id, id], 'newest first, like ORDER BY rowid DESC');
  assert.equal((await f.post('/api/import', {pgn: '1. e4 e5 2. Qh9'})).status, 400);
  assert.equal((await f.get('/api/games')).body.games.length, before.length);
});

test('nested studies reject altered history and survive a bot race', async () => {
  let release, start; const started = new Promise(resolve => { start = resolve; });
  let hold = true;
  const f = fixture({engine: createFakeEngine({pick: replyE5, wait: () => { if (!hold) return; hold = false; start(); return new Promise(resolve => { release = resolve; }); }})});
  const game = (await f.post('/api/games', {color: 'w'})).body.game, route = `/api/games/${game.id}`;
  await f.post(route + '/move', {move: 'e2e4', revision: 0});
  const botPromise = f.post(route + '/bot', {revision: 1}); await started;
  assert.equal((await f.post(route + '/bot', {revision: 1})).status, 409, 'the opponent is already thinking');
  assert.equal((await f.post(route + '/undo', {revision: 1})).status, 409);
  const study = {version: 1, branches: [{id: 'a', parentId: null, anchorPly: 0, moves: ['d2d4', 'd7d5'], question: 'What changes in the center?'}, {id: 'b', parentId: 'a', anchorPly: 1, moves: ['d2d4', 'g8f6'], question: 'What if the knight develops?'}], selectedBranchId: 'b', anchorPly: 1};
  assert.equal((await f.post(route + '/study', {study, studyRevision: 0})).status, 200);
  assert.equal((await f.post('/api/analyze', {gameId: game.id, moves: []})).status, 200, 'analysis marks review use while the bot thinks');
  release();
  const bot = await botPromise; assert.equal(bot.status, 200); assert.equal(bot.body.game.reviewUsed, true); assert.deepEqual(bot.body.game.study, study);
  f.reload(); assert.deepEqual((await f.get(route)).body.game.study, study);
  for (const mutate of [s => { s.branches[0].moves = ['e2e5']; }, s => { s.branches[1].parentId = 'missing'; }, s => { s.branches[0].parentId = 'b'; }, s => { s.branches[1].moves = ['e2e4']; }, s => { s.selectedBranchId = 'absent'; }]) {
    const bad = structuredClone(study); mutate(bad); assert.equal((await f.post(route + '/study', {study: bad, studyRevision: 1})).status, 400);
    assert.deepEqual((await f.get(route)).body.game.study, study);
  }
  assert.equal((await f.post(route + '/study', {study, studyRevision: 0})).status, 409);
});

test('Black games begin with the engine turn and engine failure never fabricates a move', async () => {
  const f = fixture({engine: createFakeEngine({available: false})});
  const {body} = await f.post('/api/games', {color: 'b', level: 5}); const route = `/api/games/${body.game.id}`;
  assert.equal((await f.post(route + '/move', {move: 'e7e5', revision: 0})).status, 409);
  assert.equal((await f.post(route + '/bot', {revision: 0})).status, 503);
  const saved = (await f.get(route)).body.game; assert.deepEqual(saved.moves, []); assert.equal(saved.revision, 0);
});

test('roster bots, the clock, crowns and a late engine reply after a timeout', async () => {
  let stamp = 1000, release, started; const waiting = new Promise(r => { started = r; });
  const calls = [];
  const opponent = {chooseMove: async (engine, input) => { calls.push(input); started(); return new Promise(r => { release = r; }); }};
  const f = fixture({now: () => stamp, opponent});
  assert.equal((await f.post('/api/games', {engineId: 'maia3'})).status, 400, 'engines outside the browser catalogue are refused');
  const created = await f.post('/api/games', {botId: 'marlo', engineId: 'stockfish19', rating: 250, color: 'w', timeControl: {initialSeconds: 60, incrementSeconds: 2}});
  assert.equal(created.status, 201); let game = created.body.game; const route = '/api/games/' + game.id;
  stamp = 5000; game = (await f.post(route + '/move', {revision: 0, move: 'e2e4'})).body.game; assert.equal(game.clock.whiteMs, 58000); assert.equal(game.clock.blackMs, 60000);
  const pending = f.post(route + '/bot', {revision: 1}); await waiting;
  assert.equal(calls[0].engineId, 'stockfish19'); assert.deepEqual(calls[0].moves, ['e2e4']); assert.equal(calls[0].rating, 250);
  stamp = 66000; release({move: 'e7e5', engine: 'Fake'});
  const finished = await pending; assert.equal(finished.status, 200); assert.equal(finished.body.game.result, '1-0'); assert.deepEqual(finished.body.game.moves, ['e2e4']); assert.equal(finished.body.game.crownsAwarded, 3);
  assert.equal((await f.post(route + '/bot', {revision: 1})).status, 409);
  f.reload(); assert.equal((await f.get('/api/me')).body.progress.bots.marlo, 3); assert.equal((await f.get(route)).body.game.clock.activeSince, null);
});

test('a timeout saved during an engine request rejects the late reply without overwriting the result', async () => {
  let stamp = 1000, release, started; const wait = new Promise(r => { started = r; });
  const f = fixture({now: () => stamp, opponent: {chooseMove: async () => { started(); return new Promise(r => { release = r; }); }}});
  const game = (await f.post('/api/games', {engineId: 'stockfish19', color: 'b', timeControl: {initialSeconds: 60, incrementSeconds: 0}})).body.game, route = '/api/games/' + game.id;
  const pending = f.post(route + '/bot', {revision: 0}); await wait;
  stamp = 62000; const timed = await f.get(route); assert.equal(timed.body.game.result, '0-1'); assert.equal(timed.body.game.revision, 1);
  release({move: 'e2e4', engine: 'Fake'}); assert.equal((await pending).status, 409);
  const saved = (await f.get(route)).body.game; assert.equal(saved.result, '0-1'); assert.deepEqual(saved.moves, []);
});

test('hints, assistance and undo retain legal history and protect saved studies', async () => {
  const f = fixture({engine: createFakeEngine({pick: input => input.moves.length === 2 ? 'g1f3' : input.moves.length === 0 ? 'e2e4' : 'e7e5'})});
  let game = (await f.post('/api/games', {assistance: {evaluation: true, feedback: true, threats: true}})).body.game; const route = '/api/games/' + game.id;
  const change = (suffix, body) => f.post(route + '/' + suffix, body);
  const hinted = await change('hint', {revision: 0}); assert.equal(hinted.status, 200); assert.equal(hinted.body.san, 'e4'); assert.equal(hinted.body.game.hintsUsed, 1); assert.equal(hinted.body.game.revision, 1);
  assert.match(hinted.body.explanation, /e4/);
  assert.equal((await change('move', {revision: 0, move: 'e2e4'})).status, 409);
  game = (await change('move', {revision: 1, move: 'e2e4'})).body.game;
  game = (await change('bot', {revision: 2})).body.game; assert.deepEqual(game.moves, ['e2e4', 'e7e5']);
  const assist = await change('assist', {revision: 3}); assert.equal(assist.status, 200); assert.equal(assist.body.analysis.bestmove, 'g1f3'); assert.equal(assist.body.feedback.played.move, 'e2e4'); assert.ok(Array.isArray(assist.body.threats)); assert.equal(assist.body.game.hintsUsed, 1);
  const study = {version: 1, branches: [{id: 'b', parentId: null, anchorPly: 1, moves: ['e2e4', 'c7c5'], question: 'Sicilian?'}], selectedBranchId: 'b', anchorPly: 1};
  assert.equal((await change('study', {studyRevision: 0, study})).status, 200); assert.equal((await change('undo', {revision: 3})).status, 400);
  assert.deepEqual((await f.get(route)).body.game.moves, ['e2e4', 'e7e5']);
  assert.equal((await change('study', {studyRevision: 1, study: {version: 1, branches: [], selectedBranchId: null, anchorPly: 0}})).status, 200);
  const undone = await change('undo', {revision: 3}); assert.equal(undone.status, 200); assert.deepEqual(undone.body.game.moves, []); assert.equal(undone.body.game.undosUsed, 1); assert.equal(undone.body.game.studyRevision, 2);
});

test('position practice copies a saved branch and preserves its source', async () => {
  const f = fixture({engine: createFakeEngine({pick: () => 'b8c6'})});
  const imported = await f.post('/api/import', {pgn: '1. e4 e5 2. Nf3 Nc6 *'}); const id = imported.body.game.id, route = `/api/games/${id}`;
  const study = {version: 1, anchorPly: 2, selectedBranchId: 'nested', branches: [{id: 'first', parentId: null, anchorPly: 2, moves: ['e2e4', 'e7e5', 'd2d4'], question: 'Try the centre'}, {id: 'nested', parentId: 'first', anchorPly: 3, moves: ['e2e4', 'e7e5', 'd2d4', 'e5d4'], question: 'Recapture?'}]};
  assert.equal((await f.post(route + '/study', {study, studyRevision: 0})).status, 200);
  const source = (await f.get(route)).body.game;
  const body = {revision: 0, studyRevision: 1, branchId: 'nested', ply: 4, botId: 'marlo', engineId: 'stockfish19', rating: 250, color: 'w', timeControl: {initialSeconds: 60, incrementSeconds: 2}};
  const practice = (extra = {}) => f.post(route + '/practice', {...body, ...extra});
  assert.equal((await practice({revision: 1})).status, 409); assert.equal((await practice({studyRevision: 0})).status, 409); assert.equal((await practice({ply: 5})).status, 400); assert.equal((await practice({branchId: 'absent'})).status, 400);
  const created = await practice(); assert.equal(created.status, 201); const game = created.body.game, child = `/api/games/${game.id}`;
  assert.deepEqual(game.moves, study.branches[1].moves); assert.equal(game.practice.startPly, 4); assert.equal(game.practice.sourceGameId, id);
  assert.equal((await f.post(child + '/undo', {revision: 0})).status, 400);
  assert.equal((await f.post(child + '/move', {move: 'g1f3', revision: 0})).status, 200);
  assert.equal((await f.post(child + '/bot', {revision: 1})).status, 200);
  const undone = await f.post(child + '/undo', {revision: 2}); assert.equal(undone.status, 200); assert.deepEqual(undone.body.game.moves, game.moves);
  const restarted = await f.post(child + '/practice', {...body, revision: 3, restart: true}); assert.equal(restarted.status, 201); assert.deepEqual(restarted.body.game.practice, game.practice);
  assert.deepEqual((await f.get(route)).body.game, source);
  const exported = await f.get(child + '/pgn'); const replayed = new Chess(); replayed.loadPgn(exported.body.text); assert.equal(replayed.history().length, 4);
});

test('custom positions validate before saving and keep their FEN through practice and export', async () => {
  const f = fixture();
  const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 12';
  for (const bad of ['8/8/8/8/8/8/8/8 w - - 0 1', '4k3/8/8/8/8/8/8/4K2R w KQ - 0 1', fen.replace('0 12', '0x 12'), undefined]) assert.equal((await f.post('/api/positions', {fen: bad})).status, 400, String(bad));
  assert.equal((await f.get('/api/games')).body.games.length, 0);
  const saved = await f.post('/api/positions', {fen, title: 'Black to move'}); assert.equal(saved.status, 201); const game = saved.body.game, route = `/api/games/${game.id}`;
  assert.equal(game.initialFen, fen); assert.equal(game.positionSetup, true); assert.equal(game.color, 'b');
  const practice = await f.post(route + '/practice', {revision: 0, ply: 0, color: 'b', level: 2, timeControl: {initialSeconds: 60, incrementSeconds: 0}}); assert.equal(practice.status, 201); assert.equal(practice.body.game.initialFen, fen);
  const exported = await f.get(route + '/pgn'); assert.match(exported.body.text, /\[SetUp "1"\]/); assert.match(exported.body.text, /\[FEN /);
  const terminal = await f.post('/api/positions', {fen: '7k/6Q1/5K2/8/8/8/8/8 b - - 0 1'}); assert.equal(terminal.status, 201); assert.equal(terminal.body.game.result, '1-0');
});

test('annotated imports, board drawings and portable study copies round-trip', async () => {
  const f = fixture();
  const pgn = '[White "Student"]\n[Black "Coach"]\n\n1. e4 {Central space [%cal Ge2e4]} e5 (1... c5 $1 {[%csl Bc5]} 2. Nf3 (2. Nc3 {A different knight})) 2. Nf3 *';
  const imported = await f.post('/api/import', {pgn}); assert.equal(imported.status, 201); const g = imported.body.game, id = g.id;
  const study = structuredClone(g.study); study.selectedBranchId = study.branches[1].id; study.annotations.push({branchId: study.branches[0].id, ply: 1, comment: 'At this exact branch root', nags: [], marks: [{from: 'b8', to: 'c6', color: 'Y'}]});
  assert.equal((await f.post(`/api/games/${id}/study`, {study, studyRevision: 0})).status, 200);
  const invalid = structuredClone(study); invalid.annotations.at(-1).marks[0].color = 'purple'; assert.equal((await f.post(`/api/games/${id}/study`, {study: invalid, studyRevision: 1})).status, 400);
  const portable = (await f.get(`/api/games/${id}/study-file`)).body; assert.equal(portable.format, 'chesslab-study'); assert.deepEqual(portable.game.study, study);
  const copied = await f.post('/api/import-study', portable); assert.equal(copied.status, 201); assert.notEqual(copied.body.game.id, id); assert.deepEqual(copied.body.game.study, study);
  const exported = (await f.get(`/api/games/${id}/pgn`)).body.text; assert.match(exported, /Nc3/); assert.match(exported, /\[%cal Yb8c6\]/); assert.equal((await f.post('/api/import', {pgn: exported})).status, 201);
  const count = (await f.get('/api/games')).body.games.length;
  assert.equal((await f.post('/api/import', {pgn: '1. e4 (1. d5) e5 *'})).status, 400);
  portable.game.study.annotations[0].ply = 999; assert.equal((await f.post('/api/import-study', portable)).status, 400);
  assert.equal((await f.get('/api/games')).body.games.length, count);
});

test('undo cannot remove an annotated original-game position', async () => {
  const f = fixture({engine: createFakeEngine({pick: replyE5})});
  const g = (await f.post('/api/games', {color: 'w', level: 2})).body.game, route = `/api/games/${g.id}`;
  await f.post(route + '/move', {move: 'e2e4', revision: 0}); await f.post(route + '/bot', {revision: 1});
  const study = {version: 1, branches: [], selectedBranchId: null, anchorPly: 0, annotations: [{branchId: null, ply: 2, comment: 'Keep this decision', nags: [5]}]};
  assert.equal((await f.post(route + '/study', {study, studyRevision: 0})).status, 200); assert.equal((await f.post(route + '/undo', {revision: 2})).status, 400);
  assert.deepEqual((await f.get(route)).body.game.moves, ['e2e4', 'e7e5']);
});
