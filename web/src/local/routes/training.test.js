import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preparePuzzle} from '../../../../shared/puzzle-training.js';
import {newAttempt} from '../../../../shared/puzzle-training.js';
import {fixture} from '../testing/fixture.js';
import {createLocalRush} from './rush.js';
import {createContext} from '../context.js';

const rows = JSON.parse(readFileSync(new URL('../../../../references/puzzles/test-lines.json', import.meta.url), 'utf8'));

test('without a puzzle catalogue training answers like a server without one', async () => {
  const f = fixture();
  assert.deepEqual((await f.get('/api/training/catalog')).body, {available: false, count: 0, themes: {}, message: 'The local puzzle catalogue is not installed.'});
  const state = (await f.get('/api/training')).body;
  assert.deepEqual(Object.keys(state).sort(), ['attempt', 'daily', 'history', 'profile', 'rush', 'totals']);
  assert.deepEqual(state.profile, {rating: 1500, best: 1500, ratedCount: 0});
  for (const body of [{}, {mode: 'rated'}, {mode: 'daily'}, {failedOnly: true}]) {
    const started = await f.post('/api/training/start', body);
    assert.equal(started.status, 503, JSON.stringify(body)); assert.match(started.body.error, /puzzle catalogue/);
  }
  assert.equal((await f.post('/api/training/start', {mode: 'blitz'})).status, 400);
  assert.equal((await f.post('/api/rush/start', {variant: 'survival'})).status, 503);
  assert.equal((await f.post('/api/rush/start', {variant: '1min'})).status, 400);
  assert.deepEqual((await f.get('/api/rush')).body.bests, {'3min': 0, '5min': 0, survival: 0});
  assert.equal((await f.get('/api/training/missing')).status, 404);
  assert.equal((await f.get('/api/rush/missing')).status, 404);
});

test('a saved attempt plays through, keeps its solution hidden, studies and retries', async () => {
  const f = fixture(), row = rows[0], puzzle = preparePuzzle(row), moves = row.moves.split(' ');
  await f.store.put('puzzle_attempts', {...newAttempt(puzzle, {mode: 'custom'}, 1), state: 'skipped'});
  const old = (await f.get('/api/training')).body.history[0];
  assert.equal(old.puzzleId, row.id);
  const started = await f.post('/api/training/start', {fromAttempt: old.id}); assert.equal(started.status, 201);
  let a = started.body.attempt; const route = '/api/training/' + a.id;
  assert.equal(a.puzzle.solution, undefined); assert.equal(a.puzzle.initialFen, undefined);
  assert.equal((await f.post('/api/training/start', {fromAttempt: old.id})).status, 409, 'one active attempt at a time');
  const hinted = await f.post(route + '/action', {action: 'hint', revision: 0}); a = hinted.body.attempt; assert.equal(a.assisted, true); assert.equal(a.hint, moves[1].slice(0, 2));
  assert.equal((await f.post(route + '/action', {action: 'move', move: moves[1], revision: 0})).status, 409);
  a = (await f.post(route + '/action', {action: 'move', move: moves[1], revision: a.revision})).body.attempt; assert.deepEqual(a.moves, moves.slice(1, 3));
  f.reload(); assert.deepEqual((await f.get('/api/training')).body.attempt.moves, a.moves);
  const solved = await f.post(route + '/action', {action: 'move', move: moves[3], revision: a.revision}); a = solved.body.attempt; assert.equal(a.state, 'solved');
  assert.deepEqual(Object.keys(solved.body).sort(), ['attempt', 'correct', 'daily', 'message', 'profile']);
  const status = (await f.get('/api/training')).body; assert.equal(status.totals.solved, 1); assert.equal(status.totals.unassisted, 0); assert.equal(status.totals.attempts, 2); assert.equal(status.history[0].id, a.id);
  const saved = await f.post(route + '/study'); assert.equal(saved.status, 201); assert.equal(saved.body.game.initialFen, row.fen); assert.deepEqual(saved.body.game.moves, moves); assert.equal(saved.body.game.result, '1-0');
});

test('rush runs score, finish and retry through local storage', async () => {
  const row = rows[0], puzzle = preparePuzzle(row), moves = row.moves.split(' ');
  let stamp = 1000; const f = fixture({now: () => stamp});
  const ctx = createContext({store: f.store, engine: f.engine, coach: {covered: () => false}, now: () => stamp});
  const inserted = [];
  let served = 0;
  const rush = createLocalRush(ctx, {activeAttempt: async () => null, insertPractice: async p => { inserted.push(p); return {mode: 'custom', puzzle: {id: p.id}}; }, selectPuzzle: () => served++ ? null : puzzle});
  let state = await rush.start({variant: 'survival'}); let run = state.run;
  assert.equal(run.current.puzzle.solution, undefined); assert.equal(state.serverNow, 1000);
  await assert.rejects(rush.start({variant: '3min'}), /current Rush run/);
  state = await rush.act(run.id, {action: 'move', move: moves[1], revision: 0}); run = state.run; assert.equal(run.score, 0); assert.deepEqual(run.current.moves, moves.slice(1, 3));
  await assert.rejects(rush.act(run.id, {action: 'hint', revision: run.revision}), /Choose move, skip or end/);
  state = await rush.act(run.id, {action: 'move', move: moves[3], revision: run.revision}); run = state.run;
  assert.equal(run.score, 1); assert.equal(run.state, 'finished'); assert.equal(run.reason, 'catalogue');
  assert.deepEqual(state.bests, {'3min': 0, '5min': 0, survival: 1}); assert.equal(state.history[0].id, run.id);
  await rush.retry(run.id, 0); assert.equal(inserted[0].id, row.id);
  await assert.rejects(rush.retry(run.id, 5), /Choose a puzzle/);
  served = 0; stamp = 2000; run = (await rush.start({variant: '3min'})).run; stamp = 2000 + 180000;
  const timed = await rush.get(run.id); assert.equal(timed.run.state, 'finished'); assert.equal(timed.run.reason, 'time');
});
