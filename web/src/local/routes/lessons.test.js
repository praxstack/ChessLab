import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {lessons, puzzles} from '../../../../shared/content.js';
import {fixture} from '../testing/fixture.js';

test('starter lessons and puzzles hide answers and save only correct progress', async () => {
  for (const puzzle of puzzles) { const c = new Chess(puzzle.fen); for (const m of puzzle.solution) c.move({from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4]}); }
  const f = fixture();
  const cat = await f.get('/api/learn'); assert.equal(cat.body.lessons.length, 6); assert.ok(!('answer' in cat.body.lessons[0])); assert.ok(!('solution' in cat.body.puzzles[0]));
  const lesson = lessons[0];
  let result = await f.post(`/api/lessons/${lesson.id}/answer`, {choice: (lesson.answer + 1) % 3}); assert.equal(result.body.correct, false); assert.deepEqual(result.body.progress.lessons, []);
  result = await f.post(`/api/lessons/${lesson.id}/answer`, {choice: lesson.answer}); assert.equal(result.body.correct, true);
  assert.equal((await f.post(`/api/lessons/${lesson.id}/answer`, {choice: 7})).status, 400);
  assert.equal((await f.post('/api/lessons/none/answer', {choice: 0})).status, 404);
  result = await f.post('/api/puzzles/take-the-rook/answer', {moves: ['e1d1']}); assert.equal(result.body.correct, false);
  result = await f.post('/api/puzzles/knight-fork/answer', {moves: ['f5e7']}); assert.equal(result.body.reply, 'g8f7'); assert.equal(result.body.complete, false);
  result = await f.post('/api/puzzles/knight-fork/answer', {moves: ['f5e7', 'g8f7', 'e7d5']}); assert.equal(result.body.complete, true);
  for (const move of ['g6g7', 'g6g8', 'g6h6', 'g6h5']) assert.equal((await f.post('/api/puzzles/queen-mate/answer', {moves: [move]})).body.complete, true, move);
  f.reload(); assert.deepEqual((await f.get('/api/me')).body.progress, {lessons: ['safe-king'], puzzles: ['knight-fork', 'queen-mate']});
});

test('the course curriculum protects answers and completes after every challenge', async () => {
  const f = fixture(), route = '/api/course-lessons/rook-lines';
  const catalogue = await f.get('/api/curriculum'); assert.equal(catalogue.body.courses.length, 4); assert.equal(catalogue.body.lessons.length, 12); assert.equal(catalogue.body.lessons[0].challenges[0].solution, undefined);
  let result = await f.post(route + '/start', {}); assert.equal(result.status, 201); let session = result.body.session; assert.equal(session.current.puzzle.solution, undefined);
  assert.equal((await f.post('/api/course-lessons/none/start', {})).status, 404);
  result = await f.post(route + '/action', {id: session.id, revision: 0, action: 'move', move: 'a1a2'}); assert.equal(result.body.correct, false); session = result.body.session; assert.deepEqual(result.body.progress.completed, []);
  result = await f.post(route + '/action', {id: session.id, revision: session.revision, action: 'move', move: 'a1a7'}); session = result.body.session;
  assert.equal((await f.post(route + '/action', {id: session.id, revision: 0, action: 'next'})).status, 409);
  session = (await f.post(route + '/action', {id: session.id, revision: session.revision, action: 'next'})).body.session;
  f.reload(); assert.equal((await f.post(route + '/start', {})).body.session.step, 1);
  result = await f.post(route + '/action', {id: session.id, revision: session.revision, action: 'move', move: 'h8h2'});
  assert.equal(result.body.session.state, 'complete'); assert.deepEqual(result.body.progress.completed, ['rook-lines']);
  assert.deepEqual((await f.get('/api/me')).body.progress.lessons, ['rook-lines']);
  assert.deepEqual((await f.get('/api/lesson-progress')).body.sessions.map(s => s.lessonId), ['rook-lines']);
});
