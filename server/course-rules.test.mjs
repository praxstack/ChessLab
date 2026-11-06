import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCourse, courseSummary, courseView, findLine, LIMITS} from '../shared/course.js';
import {createCard, review, dueCards, scheduleSummary, stepLabel, LADDER, HOUR, DAY} from '../shared/trainer-schedule.js';
import {createDrill, drillView, playDrillMove, askHint, MAX_MISSES} from '../shared/drill.js';
import {courseFromPgn, courseToPgn, lichessStudyExportUrl, splitGames} from '../shared/course-import.js';

const vienna = () => ({
  id: 'vienna-starter', title: 'Vienna starter', level: 'beginner', colour: 'w', stage: 'opening',
  source: {kind: 'own', author: 'AskTheMove', licence: 'CC0'},
  chapters: [{
    id: 'c1', title: 'The main line', explain: ['White plays e4, Nc3 and f4.'],
    lines: [
      {id: 'main', title: 'Vienna Gambit', side: 'w', moves: ['e2e4', 'e7e5', 'b1c3', 'g8f6', 'f2f4'], notes: {5: 'The gambit.'}, marks: {3: [{from: 'b1', to: 'c3', color: 'G'}]}},
      {id: 'black-side', title: 'As Black vs the Vienna', side: 'b', moves: ['e2e4', 'e7e5', 'b1c3', 'g8f6']},
    ],
    quizzes: [{id: 'q1', question: 'What does f4 attack?', choices: ['e5', 'd5', 'the king'], answer: 0, why: 'f4 hits e5.'}],
  }],
});

test('validateCourse normalises a course and refuses bad lines', () => {
  const course = validateCourse(vienna(), {createdAt: '2026-11-06T10:00:00.000Z'});
  assert.equal(course.version, 1);
  assert.equal(course.chapters[0].lines[0].endFen.split(' ')[1], 'b');
  assert.deepEqual(course.chapters[0].lines[0].marks[3], [{from: 'b1', to: 'c3', color: 'G'}]);
  assert.deepEqual(courseSummary(course), {id: 'vienna-starter', title: 'Vienna starter', blurb: '', level: 'beginner', colour: 'w', stage: 'opening', source: {kind: 'own', author: 'AskTheMove', licence: 'CC0', url: ''}, chapters: 1, lines: 2, quizzes: 1, moves: 9, verified: 0, createdAt: '2026-11-06T10:00:00.000Z', updatedAt: '2026-11-06T10:00:00.000Z'});
  assert.equal(courseView(course).chapters[0].quizzes[0].answer, undefined, 'the learner view hides quiz answers');
  assert.equal(findLine(course, 'main').chapterId, 'c1');

  const bad = key => { const c = vienna(); key(c); return c; };
  assert.throws(() => validateCourse(bad(c => { c.chapters[0].lines[0].moves = ['e2e5']; })), /e2e5|legal/i);
  assert.throws(() => validateCourse(bad(c => { c.chapters[0].lines[1].id = 'main'; })), /used twice/);
  assert.throws(() => validateCourse(bad(c => { c.chapters[0].lines[0].notes = {9: 'late'}; })), /outside its moves/);
  assert.throws(() => validateCourse(bad(c => { c.chapters[0].lines[0].side = 'b'; c.chapters[0].lines[0].moves = ['e2e4']; c.chapters[0].lines[0].notes = {}; c.chapters[0].lines[0].marks = {}; })), /no move for Black/);
  assert.throws(() => validateCourse(bad(c => { c.chapters[0].quizzes[0].answer = 3; })), /right answer/);
  assert.throws(() => validateCourse(bad(c => { c.source = undefined; })), /source/);
  assert.throws(() => validateCourse(bad(c => { c.chapters = []; })), /1 to 60 chapters/);
  assert.throws(() => validateCourse(bad(c => { c.chapters[0].lines[0].moves = Array(LIMITS.movesPerLine + 1).fill('e2e4'); })), /moves/);
  assert.throws(() => validateCourse({...vienna(), version: 7}), /version 7/);
});

test('the ladder climbs on a pass, holds on a hint and drops one step on a miss', () => {
  const t0 = Date.UTC(2026, 10, 6, 9);
  let card = createCard({id: 'main', courseId: 'vienna-starter', now: t0});
  assert.equal(stepLabel(card), 'new');
  assert.ok(dueCards([card], t0).length, 'a new card is due at once');
  card = review(card, 'pass', t0); assert.equal(card.step, 1); assert.equal(card.due, t0 + DAY); assert.equal(stepLabel(card), '1 day');
  card = review(card, 'pass', card.due); assert.equal(card.step, 2); assert.equal(card.due - t0 - DAY, 3 * DAY);
  card = review(card, 'hinted', card.due); assert.equal(card.step, 2, 'a hinted pass holds the step');
  card = review(card, 'pass', card.due); card = review(card, 'pass', card.due); assert.equal(card.step, 4);
  const beforeMiss = card.due;
  card = review(card, 'miss', beforeMiss); assert.equal(card.step, 3, 'one miss drops one step, not to the bottom'); assert.equal(card.lapses, 1); assert.equal(card.due, beforeMiss + LADDER[3]);
  card = review(card, 'miss', card.due); assert.equal(card.step, 0, 'two misses in a row go back to the start'); assert.equal(card.due - card.lastReviewed, 4 * HOUR);
  for (let i = 0; i < 12; i++) card = review(card, 'pass', card.due);
  assert.equal(card.step, LADDER.length - 1, 'the top step is 6 months and stays there');
  assert.throws(() => review(card, 'great', t0), /pass, hinted, miss/);
});

test('the adaptive schedule stretches easy lines and keeps hard ones close', () => {
  const t0 = Date.UTC(2026, 10, 6, 9);
  let easy = createCard({id: 'a', courseId: 'c', now: t0}), hard = createCard({id: 'b', courseId: 'c', now: t0});
  for (let i = 0; i < 4; i++) easy = review(easy, 'pass', easy.due, 'adaptive');
  for (let i = 0; i < 4; i++) hard = review(hard, i % 2 ? 'miss' : 'hinted', hard.due, 'adaptive');
  assert.ok(easy.stability > 20, `easy stability ${easy.stability} days`);
  assert.ok(hard.stability < 2, `hard stability ${hard.stability} days`);
  assert.ok(easy.difficulty < hard.difficulty);
  assert.ok(hard.due - hard.lastReviewed >= 4 * HOUR, 'never sooner than 4 hours');
  const summary = scheduleSummary([easy, hard, createCard({id: 'n', courseId: 'c', now: t0})], hard.due);
  assert.deepEqual({total: summary.total, fresh: summary.fresh, due: summary.due}, {total: 3, fresh: 1, due: 2});
  assert.deepEqual(dueCards([easy, hard, createCard({id: 'n', courseId: 'c', now: t0})], hard.due).map(c => c.id), ['b', 'n'], 'reviews before new lines');
});

test('a drill plays the learner side, answers with the book and ends with a schedule result', () => {
  const course = validateCourse(vienna()), line = findLine(course, 'main'), t = 1000;
  let session = createDrill({id: 'd1', course, line, now: t});
  let view = drillView(session, line);
  assert.equal(view.ply, 0); assert.equal(view.toMove, 'w'); assert.equal(view.hint, null); assert.equal(view.total, 5);
  let step = playDrillMove(session, line, 'd2d4', t); session = step.session;
  assert.equal(step.correct, false); assert.equal(session.misses, 1); assert.deepEqual(drillView(session, line).hint, {from: 'e2'}, 'a miss gives the first hint');
  assert.throws(() => playDrillMove(session, line, 'e2e5', t), /not legal/);
  step = playDrillMove(session, line, 'e2e4', t); session = step.session;
  assert.equal(step.correct, true); assert.deepEqual(step.reply, ['e7e5']); assert.equal(session.ply, 2);
  session = askHint(session); assert.deepEqual(drillView(session, line).hint, {from: 'b1', to: 'c3', move: 'b1c3'});
  step = playDrillMove(session, line, 'b1c3', t); session = step.session; assert.deepEqual(step.reply, ['g8f6']);
  assert.deepEqual(Object.keys(drillView(session, line).marks), ['3'], 'marks up to the current ply show');
  step = playDrillMove(session, line, 'f2f4', t + 5); session = step.session;
  assert.equal(step.done, true); assert.equal(session.state, 'done'); assert.equal(session.result, 'miss', 'any miss makes the drill a miss');
  assert.throws(() => playDrillMove(session, line, 'e2e4', t), /finished/);

  // Black's side: the book plays White's first move before the learner's turn.
  const black = findLine(course, 'black-side');
  session = createDrill({id: 'd2', course, line: black, now: t});
  assert.equal(session.ply, 1); assert.equal(drillView(session, black).toMove, 'b');
  step = playDrillMove(session, black, 'e7e5', t); assert.deepEqual(step.reply, ['b1c3']);
  step = playDrillMove(step.session, black, 'g8f6', t); assert.equal(step.done, true); assert.equal(step.session.result, 'pass');

  // After MAX_MISSES the move is shown and must be played.
  session = createDrill({id: 'd3', course, line, now: t});
  for (let i = 0; i < MAX_MISSES; i++) session = playDrillMove(session, line, 'a2a3', t).session;
  assert.equal(drillView(session, line).required, 'e2e4');
  step = playDrillMove(session, line, 'e2e4', t); assert.equal(step.correct, true);
  const hinted = createDrill({id: 'd4', course, line: black, now: t});
  step = playDrillMove(askHint(hinted), black, 'e7e5', t); step = playDrillMove(step.session, black, 'g8f6', t);
  assert.equal(step.session.result, 'hinted');
});

const pgn = `[Event "Scandi lines"]
[Site "?"]

{Meet e4 with d5.} 1. e4 d5 2. exd5 Qxd5 {[%cal Gd5a5]} 3. Nc3 Qa5 (3... Qd8 {The quiet retreat.}) 4. d4 Nf6 *

[Event "Sidelines"]
[ChapterName "Move 2 sidelines"]

1. e4 d5 2. Nc3 dxe4 3. Nxe4 Nf6 *
`;

test('a PGN with variations becomes a course with one line per leaf, and exports back out', () => {
  assert.equal(splitGames(pgn).length, 2);
  const course = courseFromPgn(pgn, {title: 'Gotham-style Scandi', side: 'b', source: {kind: 'own', author: 'me', licence: 'CC0'}}, {now: Date.UTC(2026, 10, 6)});
  assert.equal(course.chapters.length, 2);
  assert.deepEqual(course.chapters.map(c => c.title), ['Scandi lines', 'Move 2 sidelines']);
  assert.deepEqual(course.chapters[0].explain, ['Meet e4 with d5.']);
  const [main, retreat] = course.chapters[0].lines;
  assert.deepEqual(main.moves, ['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3', 'd5a5', 'd2d4', 'g8f6']);
  assert.deepEqual(main.marks[4], [{color: 'G', from: 'd5', to: 'a5'}]);
  assert.deepEqual(retreat.moves.slice(0, 6), ['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3', 'd5d8']);
  assert.equal(retreat.notes[6], 'The quiet retreat.');
  assert.equal(main.side, 'b'); assert.equal(course.colour, 'b');
  assert.equal(courseSummary(course).lines, 3);
  const out = courseToPgn(course);
  assert.match(out, /\[ChapterName "Move 2 sidelines"\]/);
  assert.match(out, /3\. Nc3 Qd8 \{The quiet retreat\.\}/);
  const again = courseFromPgn(out, {title: 'Round trip', side: 'b', source: {kind: 'own'}});
  assert.deepEqual(again.chapters.flatMap(c => c.lines.map(l => l.moves)), course.chapters.flatMap(c => c.lines.map(l => l.moves)));
  assert.throws(() => courseFromPgn('1. e4 e5 2. Ke3', {}), /invalid|illegal/i);
  assert.throws(() => courseFromPgn('[Variant "Chess960"]\n\n1. e4 *', {}), /Standard/);
  assert.equal(courseFromPgn('1. e4 e5 2. Nf3 *', {}).chapters[0].lines[0].side, 'w', 'default side is the first mover');
});

test('Lichess study links map to the public PGN export', () => {
  assert.equal(lichessStudyExportUrl('https://lichess.org/study/AbCdEf12'), 'https://lichess.org/api/study/AbCdEf12.pgn');
  assert.equal(lichessStudyExportUrl('https://lichess.org/study/AbCdEf12/XyZ12345#3'), 'https://lichess.org/api/study/AbCdEf12/XyZ12345.pgn');
  assert.equal(lichessStudyExportUrl('AbCdEf12'), 'https://lichess.org/api/study/AbCdEf12.pgn');
  assert.equal(lichessStudyExportUrl('https://example.com/study/AbCdEf12'), null);
  assert.equal(lichessStudyExportUrl(42), null);
});
