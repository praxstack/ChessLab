import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../testing/fixture.js';
import {HOUR, DAY} from '../../../../shared/trainer-schedule.js';

const course = () => ({
  id: 'london', title: 'London starter', level: 'beginner', colour: 'w', stage: 'opening', source: {kind: 'own', author: 'AskTheMove', licence: 'CC0'},
  chapters: [{id: 'c1', title: 'Setup', explain: ['d4, Bf4, e3.'],
    lines: [{id: 'l1', title: 'Main', side: 'w', moves: ['d2d4', 'd7d5', 'c1f4'], notes: {3: 'The London bishop.'}}, {id: 'l2', title: 'vs Nf6', side: 'w', moves: ['d2d4', 'g8f6', 'c1f4']}],
    quizzes: [{id: 'q1', question: 'Where does the bishop go?', choices: ['f4', 'g5'], answer: 0, why: 'Outside the pawn chain.'}]}],
});

test('courses are saved with one card per line, listed, drilled, scheduled and deleted', async () => {
  let clock = Date.UTC(2026, 10, 6, 9);
  const f = fixture({now: () => clock});
  let result = await f.post('/api/courses', {course: course()});
  assert.equal(result.status, 201); assert.equal(result.body.cards.length, 2); assert.equal(result.body.schedule.due, 2);
  assert.equal(result.body.course.chapters[0].quizzes[0].answer, undefined, 'answers stay hidden');
  assert.equal((await f.post('/api/courses', {course: course()})).status, 409, 'same id twice is refused');
  assert.equal((await f.post('/api/courses', {course: {...course(), chapters: []}})).status, 400);
  let list = await f.get('/api/courses'); assert.equal(list.body.courses.length, 1); assert.equal(list.body.due, 2); assert.equal(list.body.courses[0].mode, 'ladder');

  const queue = await f.get('/api/courses/london/review?limit=1'); assert.equal(queue.body.queue.length, 1); assert.equal(queue.body.queue[0].title, 'Main');
  assert.equal((await f.get('/api/courses/london/review?limit=0')).status, 400);

  result = await f.post('/api/courses/london/drills/start', {lineId: 'l1'}); assert.equal(result.status, 201);
  let drill = result.body.drill; assert.equal(drill.toMove, 'w'); assert.equal(drill.hint, null);
  const same = await f.post('/api/courses/london/drills/start', {lineId: 'l1'}); assert.equal(same.body.drill.id, drill.id, 'a second start resumes the open drill');
  assert.equal((await f.post('/api/courses/london/drills/start', {lineId: 'nope'})).status, 404);
  result = await f.post(`/api/courses/london/drills/${drill.id}/move`, {move: 'e2e4', revision: 0}); drill = result.body.drill;
  assert.equal(result.body.correct, false); assert.deepEqual(drill.hint, {from: 'd2'});
  assert.equal((await f.post(`/api/courses/london/drills/${drill.id}/move`, {move: 'd2d4', revision: 0})).status, 409, 'stale revision');
  result = await f.post(`/api/courses/london/drills/${drill.id}/move`, {move: 'd2d4', revision: drill.revision}); drill = result.body.drill;
  assert.deepEqual(result.body.reply, ['d7d5']); assert.equal(drill.ply, 2);
  result = await f.post(`/api/courses/london/drills/${drill.id}/move`, {move: 'c1f4', revision: drill.revision}); drill = result.body.drill;
  assert.equal(result.body.done, true); assert.equal(drill.result, 'miss'); assert.equal(result.body.note, 'The London bishop.');
  assert.equal(result.body.card.step, 0); assert.equal(result.body.card.lapses, 1); assert.equal(result.body.card.due, clock + 4 * HOUR);
  assert.equal((await f.post(`/api/courses/london/drills/${drill.id}/move`, {move: 'a2a3', revision: drill.revision})).status, 409, 'a finished drill refuses moves');

  // A clean pass on the other line climbs to one day and counts as progress.
  result = await f.post('/api/courses/london/drills/start', {lineId: 'l2'}); drill = result.body.drill;
  result = await f.post(`/api/courses/london/drills/${drill.id}/move`, {move: 'd2d4', revision: 0}); drill = result.body.drill;
  result = await f.post(`/api/courses/london/drills/${drill.id}/move`, {move: 'c1f4', revision: drill.revision});
  assert.equal(result.body.drill.result, 'pass'); assert.equal(result.body.card.due, clock + DAY);
  let detail = await f.get('/api/courses/london'); assert.equal(detail.body.schedule.due, 0);
  clock += 5 * HOUR;
  f.reload(); detail = await f.get('/api/courses/london'); assert.equal(detail.body.schedule.due, 1, 'the missed line is due again after 4 hours');

  // Hints are their own route and the mode is a course setting.
  result = await f.post('/api/courses/london/drills/start', {lineId: 'l1', restart: true}); drill = result.body.drill;
  result = await f.post(`/api/courses/london/drills/${drill.id}/hint`); assert.deepEqual(result.body.drill.hint, {from: 'd2'});
  assert.equal((await f.post('/api/courses/london/mode', {mode: 'weekly'})).status, 400);
  assert.equal((await f.post('/api/courses/london/mode', {mode: 'adaptive'})).body.mode, 'adaptive');

  // Quizzes grade in place; shuffle returns every item once.
  result = await f.post('/api/courses/london/quizzes/q1/answer', {choice: 1}); assert.equal(result.body.correct, false); assert.equal(result.body.answer, 0);
  result = await f.post('/api/courses/london/quizzes/q1/answer', {choice: 0}); assert.equal(result.body.correct, true); assert.deepEqual(result.body.quizzes, ['q1']);
  assert.equal((await f.post('/api/courses/london/quizzes/q1/answer', {choice: 5})).status, 400);
  const shuffle = await f.post('/api/courses/london/shuffle'); assert.deepEqual(shuffle.body.items.map(i => i.id).sort(), ['l1', 'l2', 'q1']);
  assert.equal((await f.post('/api/courses/london/shuffle', {chapterId: 'zz'})).status, 404);

  const exported = await f.get('/api/courses/london/pgn'); assert.match(exported.body.pgn, /1\. d4 d5 2\. Bf4 \{The London bishop\.\}/);
  assert.equal((await f.post('/api/courses/london/delete')).body.deleted, 'london');
  assert.equal((await f.get('/api/courses/london')).status, 404);
  assert.deepEqual(await f.store.list('course_cards'), []); assert.deepEqual(await f.store.list('drill_sessions'), []);
  assert.deepEqual((await f.store.list('progress')).filter(row => row.itemId.startsWith('london:')), [], 'quiz and line progress go with the course');
  await f.post('/api/courses', {course: course()});
  assert.deepEqual((await f.get('/api/courses/london')).body.quizzes, [], 'a recreated course starts clean');
});

test('PGN and Lichess study imports become courses, and the backup carries them', async () => {
  const study = '[Event "Caro-Kann: Advance"]\n[ChapterName "Advance"]\n\n1. e4 c6 2. d4 d5 3. e5 Bf5 (3... c5 {The modern try.}) *\n';
  const f = fixture({fetchText: async url => { assert.equal(url, 'https://lichess.org/api/study/AbCdEf12.pgn'); return study; }});
  let result = await f.post('/api/courses/import', {pgn: study, title: 'My Caro', side: 'b'});
  assert.equal(result.status, 201); assert.equal(result.body.course.title, 'My Caro'); assert.equal(result.body.cards.length, 2);
  assert.equal(result.body.course.source.kind, 'pgn');
  assert.equal((await f.post('/api/courses/import', {pgn: 7})).status, 400);
  assert.equal((await f.post('/api/courses/import', {pgn: '1. e4 e5 2. Ke3 *'})).status, 400);
  result = await f.post('/api/courses/lichess', {url: 'https://lichess.org/study/AbCdEf12', author: 'someone'});
  assert.equal(result.status, 201); assert.equal(result.body.course.source.kind, 'lichess-study'); assert.equal(result.body.course.source.url, 'https://lichess.org/study/AbCdEf12');
  assert.equal((await f.post('/api/courses/lichess', {url: 'https://example.com/x'})).status, 400);
  await f.post('/api/courses/london/delete').catch(() => {});
  result = await f.post('/api/courses/lichess', {url: 'AbCdEf12', title: 'By id'});
  assert.equal(result.status, 201, 'a bare study id imports'); assert.equal(result.body.course.source.url, 'https://lichess.org/study/AbCdEf12');
  const backup = await f.store.exportAll();
  assert.equal(backup.version, 2); assert.equal(backup.collections.courses.length, 3); assert.equal(backup.collections.course_cards.length, 6);
  await f.store.importAll(backup);
  assert.equal((await f.get('/api/courses')).body.courses.length, 3);
});
