import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {fixture} from '../testing/fixture.js';
import {createFakeEngine} from '../testing/fake-engine.js';

test('analysis has the server shape: facts, explanation, limits and a graded played move', async () => {
  const f = fixture();
  const result = await f.post('/api/analyze', {moves: ['e2e4', 'd7d5'], playedMove: 'e4d5', lines: 2});
  assert.equal(result.status, 200);
  const a = result.body;
  assert.deepEqual(Object.keys(a).sort(), ['bestmove', 'engine', 'explanation', 'facts', 'fen', 'limits', 'lines', 'played', 'tablebaseHits', 'turn']);
  assert.equal(a.engine, 'Fake Stockfish 19'); assert.equal(a.turn, 'w'); assert.equal(a.bestmove, 'e4d5');
  assert.deepEqual(a.limits, {movetime: 350, lines: 2});
  assert.deepEqual(a.lines[0], {move: 'e4d5', moves: ['e4d5'], san: ['exd5'], score: {type: 'cp', value: 100}, depth: 1});
  assert.deepEqual(a.facts, {inCheck: false, material: {white: 39, black: 39}, legalMoves: 31});
  assert.match(a.explanation, /^White to move\. exd5 captures a pawn\./);
  assert.equal(a.played.move, 'e4d5'); assert.equal(a.played.san, 'exd5'); assert.equal(a.played.classification, 'Best');
  const reviewLimits = (await f.post('/api/analyze', {moves: [], engineId: 'stockfish19', movetime: 5000, threads: 2, lines: 5})).body.limits;
  assert.deepEqual(reviewLimits, {movetime: 5000, lines: 5, threads: 2, engineId: 'stockfish19'});
  for (const bad of [{moves: [], movetime: 5000}, {moves: [], engineId: 'lc0'}, {moves: [], lines: 4}, {moves: ['e2e4'], playedMove: 'e2e4'}, {moves: 'e2e4'}, {moves: [], variant: 'atomic'}]) assert.equal((await f.post('/api/analyze', bad)).status, 400, JSON.stringify(bad));
  const mated = await f.post('/api/analyze', {moves: ['f2f3', 'e7e5', 'g2g4', 'd8h4']});
  assert.equal(mated.status, 200); assert.equal(mated.body.bestmove, null); assert.deepEqual(mated.body.lines, []); assert.match(mated.body.explanation, /White is checkmated/);
  assert.equal((await f.post('/api/analyze', {moves: ['f2f3', 'e7e5', 'g2g4', 'd8h4'], playedMove: 'e1f2'})).status, 400);
});

test('full game review saves each step, resumes after reload and never rewrites the game', async () => {
  let failNext = false;
  const f = fixture({engine: createFakeEngine({wait: () => { if (failNext) throw Object.assign(new Error('Engine unavailable'), {status: 503}); }})});
  let game = (await f.post('/api/import', {pgn: '1. f3 e5 2. g4 Qh4# 0-1'})).body.game; const route = `/api/games/${game.id}/review`;
  const study = {version: 1, anchorPly: 1, selectedBranchId: 'review-study', branches: [{id: 'review-study', parentId: null, anchorPly: 1, moves: ['f2f3', 'd7d5'], question: 'Can Black play in the centre?'}]};
  assert.equal((await f.post(`/api/games/${game.id}/study`, {study, studyRevision: 0})).status, 200); game = (await f.get(`/api/games/${game.id}`)).body.game;
  assert.equal((await f.get(route)).body.review, null);
  const step = (after, extra = {}) => f.post(route, {revision: game.revision, after, movetime: 50, threads: 1, ...extra});
  assert.equal((await step(0, {revision: 99})).status, 409); assert.equal((await step(0, {movetime: 90001})).status, 400); assert.equal((await step(3)).status, 409);
  let result = await step(0); assert.equal(result.status, 200); assert.equal(result.body.review.entries.length, 1); assert.equal(result.body.review.complete, false);
  const searches = f.engine.calls.length, snapshot = structuredClone(result.body.review);
  f.reload(); assert.deepEqual((await f.get(route)).body.review, snapshot); assert.equal(f.engine.calls.length, searches, 'loading a saved report does not search');
  assert.equal((await step(0)).status, 409, 'a duplicate cursor cannot skip or duplicate moves');
  failNext = true; assert.equal((await step(1)).status, 503); assert.deepEqual((await f.get(route)).body.review, snapshot, 'engine failure keeps the saved step'); failNext = false;
  for (let after = 1; after < 4; after++) { result = await step(after); assert.equal(result.status, 200); }
  const report = result.body.review; assert.equal(report.complete, true); assert.equal(report.entries.length, 4); assert.equal(report.players.w.moves, 2); assert.equal(report.entries[3].evaluation.type, 'result'); assert.equal(report.entries[3].evaluation.value, '0-1');
  const before = f.engine.calls.length; assert.equal((await step(4)).status, 200); assert.equal(f.engine.calls.length, before, 'a completed report is reused');
  assert.deepEqual((await f.get(`/api/games/${game.id}`)).body.game, game, 'review keeps the game and study');
  const live = await f.post('/api/games', {color: 'w', level: 2});
  assert.equal((await f.post(`/api/games/${live.body.game.id}/review`, {revision: 0, after: 0, movetime: 50, threads: 1})).status, 409);
});

test('review rejects concurrent or stale engine results and stops on abort', async () => {
  let release, start, hold = true; const begun = new Promise(resolve => { start = resolve; });
  const f = fixture({engine: createFakeEngine({wait: () => { if (!hold) return; hold = false; start(); return new Promise(resolve => { release = resolve; }); }})});
  const game = (await f.post('/api/import', {pgn: '1. e4 e5 2. Nf3 Nc6 *'})).body.game, route = `/api/games/${game.id}/review`;
  const body = {revision: 0, after: 0, movetime: 50, threads: 1};
  const running = f.post(route, body); await begun;
  assert.equal((await f.post(route, body)).status, 409);
  await f.store.put('games', {...game, moves: game.moves.slice(0, 2), revision: 1});
  release(); assert.equal((await running).status, 409); assert.equal((await f.get(route)).body.review, null);
  const controller = new AbortController(); controller.abort();
  const aborted = await f.router.handle('POST', route, {...body, revision: 1}, {signal: controller.signal});
  assert.equal(aborted.status, 499); assert.equal((await f.get(route)).body.review, null, 'an aborted step saves nothing');
  assert.equal((await f.post(route, {...body, revision: 1})).body.review.entries.length, 1, 'the game is released for resume');
});

test('review practice protects restarts, stale revisions, concurrent engine results and source games', async () => {
  let hold = false, entered, release;
  const f = fixture({engine: createFakeEngine({wait: () => { if (!hold) return; hold = false; entered(); return new Promise(resolve => { release = resolve; }); }})});
  const g = (await f.post('/api/import', {pgn: '1. f3 e5 2. g4 Qh4#'})).body.game, route = `/api/games/${g.id}`, practiceRoute = route + '/practice-review';
  assert.equal((await f.post(practiceRoute + '/start', {side: 'w'})).status, 409, 'practice needs a finished review');
  let report; for (let i = 0; i < g.moves.length; i++) { const reviewed = await f.post(route + '/review', {revision: 0, after: i, movetime: 50, threads: 1}); assert.equal(reviewed.status, 200); report = reviewed.body.review; }
  let start = await f.post(practiceRoute + '/start', {side: 'w'}); assert.equal(start.status, 201); let p = start.body.practice;
  assert.ok(p.summary.total >= 1); assert.equal(p.current.answer, null);
  const initialRevision = p.revision; p = (await f.post(practiceRoute + '/action', {type: 'hint', revision: p.revision})).body.practice; assert.equal(p.current.hints, 1);
  assert.equal((await f.post(practiceRoute + '/action', {type: 'reveal', revision: initialRevision})).status, 409);
  f.reload(); assert.deepEqual((await f.get(practiceRoute)).body.practice, p);
  const recommendation = report.entries.find(e => e.ply === p.current.ply).analysis.bestmove;
  p = (await f.post(practiceRoute + '/action', {type: 'move', move: recommendation, revision: p.revision})).body.practice; assert.equal(p.current.outcome, 'solved');
  p = (await f.post(practiceRoute + '/action', {type: 'next', revision: p.revision})).body.practice;
  if (!p.complete) {
    const best = report.entries.find(e => e.ply === p.current.ply).analysis.bestmove, wrong = new Chess(p.current.fen).moves({verbose: true}).map(m => m.from + m.to + (m.promotion || '')).find(m => m !== best);
    hold = true; const enteredPromise = new Promise(resolve => { entered = resolve; });
    const pending = f.post(practiceRoute + '/action', {type: 'move', move: wrong, revision: p.revision}); await enteredPromise;
    p = (await f.post(practiceRoute + '/action', {type: 'hint', revision: p.revision})).body.practice; release(); assert.equal((await pending).status, 409);
    assert.deepEqual((await f.get(practiceRoute)).body.practice, p);
  }
  const unchanged = (await f.get(route)).body.game; assert.deepEqual(unchanged.moves, g.moves);
  await f.store.put('games', {...unchanged, moves: ['e2e4']});
  assert.equal((await f.post(practiceRoute + '/action', {type: 'skip', revision: p.revision})).status, 409);
  const stale = (await f.get(practiceRoute)).body; assert.equal(stale.stale, true); assert.equal(stale.revision, p.revision);
});

test('coach explanations answer from engine evidence with reason not_covered', async () => {
  const f = fixture();
  const game = (await f.post('/api/import', {pgn: '1. e4 d5 2. Nc3 *'})).body.game;
  const played = await f.post('/api/coach/explain', {gameId: game.id, moves: ['e2e4', 'd7d5'], playedMove: 'b1c3'});
  assert.equal(played.status, 200);
  assert.deepEqual(Object.keys(played.body).sort(), ['bestMove', 'citedMoves', 'fallbackReason', 'question', 'receipt', 'source', 'subject', 'text']);
  assert.equal(played.body.source, 'engine'); assert.equal(played.body.fallbackReason, 'not_covered');
  assert.equal(played.body.bestMove, 'exd5'); assert.equal(played.body.subject, 'Nc3'); assert.equal(played.body.question, null);
  assert.deepEqual(played.body.receipt, {engine: 'Fake Stockfish 19', movetimeMs: 800, depth: 1, lines: 3});
  assert.match(played.body.text, /^Nc3/);
  const asked = await f.post('/api/coach/explain', {moves: ['e2e4', 'd7d5'], question: 'why not Qh5?'});
  assert.equal(asked.status, 200); assert.equal(asked.body.question, 'Qh5'); assert.equal(asked.body.subject, 'Qh5'); assert.match(asked.body.text, /The engine preferred exd5 at these limits \(\+1\.00\)\./);
  assert.equal((await f.post('/api/coach/explain', {moves: ['e2e4'], question: 'why not Ke3?'})).status, 400);
  assert.equal((await f.post('/api/coach/explain', {moves: ['e2e4'], playedMove: 42})).status, 400);
  assert.equal((await f.post('/api/coach/explain', {moves: ['e2e4'], playedMove: 'e2e4'})).status, 400);
});
