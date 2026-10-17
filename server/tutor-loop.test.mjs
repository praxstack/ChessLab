import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAttempt, tryMove, askHint, showAnswer, skip, answerWhy, explainWhy, finish, pendingOutcome, creditFor,
  emptyRecord, normalize, touchSession, recordOutcome, isLearned, topicStatus, dueTopics, lastOutcome, pickRecallItem, hasSeen,
  MAX_MISSES, HINT_LEVELS, INTERVALS, SESSION_GAP_MS, MISTAKE_TAGS,
} from './tutor-loop.mjs';

const H = 60 * 60 * 1000;
const start = Date.UTC(2026, 9, 17, 8);
const flagged = {id: 'game-1:ply-23', tag: 'missed-capture'};
const right = {move: 'e2e4', correct: true};
const wrong = {move: 'a2a3', correct: false, diagnosis: 'The knight on e5 could be taken.'};
const done = (state, whyCorrect = true) => finish(answerWhy(state, {choice: 0, correct: whyCorrect}).state);

test('the starter rules match the plan', () => {
  assert.equal(MAX_MISSES, 2);
  assert.equal(HINT_LEVELS, 2);
  assert.deepEqual(INTERVALS, [1, 3, 6]);
  assert.deepEqual(MISTAKE_TAGS, ['missed-capture', 'missed-check', 'missed-mate', 'undefended-piece']);
  assert.throws(() => createAttempt({}), TypeError);
});

test('right move first try, right reason: unaided', () => {
  const {state, result} = tryMove(createAttempt(flagged), right);
  assert.deepEqual(result, {correct: true});
  assert.equal(state.step, 'why');
  assert.equal(state.outcome, 'unaided');
  assert.equal(creditFor(state), null, 'no credit until the attempt is done');
  assert.equal(creditFor(done(state)), 'unaided');
});

test('right move but the wrong reason gets a refresher next session', () => {
  const {state} = tryMove(createAttempt(flagged), right);
  assert.equal(creditFor(done(state, false)), 'hinted');
});

test('one miss shows the square hint and keeps the diagnosis, then a solve is hinted', () => {
  let step = tryMove(createAttempt(flagged), wrong);
  assert.equal(step.state.step, 'try');
  assert.equal(step.result.hint, 1);
  assert.equal(step.result.diagnosis, wrong.diagnosis);
  assert.equal(pendingOutcome(step.state), 'hinted', 'help is recorded before the attempt ends');
  step = tryMove(step.state, right);
  assert.equal(step.state.outcome, 'hinted');
  assert.equal(creditFor(done(step.state)), 'hinted');
});

test('two misses teach the move, then still ask why', () => {
  let step = tryMove(createAttempt(flagged), wrong);
  step = tryMove(step.state, {...wrong, move: 'h2h3'});
  assert.equal(step.result.taught, true);
  assert.equal(step.state.outcome, 'taught');
  assert.equal(step.state.step, 'why');
  assert.deepEqual(step.state.tries.map(t => t.move), ['a2a3', 'h2h3']);
  assert.equal(tryMove(step.state, right).result, null, 'no more tries after teaching');
  assert.equal(creditFor(done(step.state)), 'taught');
});

test('a hint asked first makes the solve hinted, and a miss moves to the next rung', () => {
  const asked = askHint(createAttempt(flagged));
  assert.equal(asked.hint, 1);
  assert.equal(tryMove(asked.state, right).state.outcome, 'hinted');
  const step = tryMove(asked.state, wrong);
  assert.equal(step.result.hint, 2, 'the square hint is not repeated');
  let state = createAttempt(flagged);
  for (let i = 0; i < 5; i++) state = askHint(state).state;
  assert.equal(state.hints, HINT_LEVELS, 'hints stop at the move');
  assert.equal(tryMove(state, wrong).result.hint, null);
});

test('the outcome so far is exposed after the try step, before the attempt ends', () => {
  assert.equal(pendingOutcome(createAttempt(flagged)), null);
  assert.equal(pendingOutcome(showAnswer(createAttempt(flagged))), 'answer-now');
  const taught = tryMove(tryMove(createAttempt(flagged), wrong).state, wrong).state;
  assert.equal(pendingOutcome(taught), 'taught');
  const solved = tryMove(createAttempt(flagged), right).state;
  assert.equal(pendingOutcome(solved), null, 'unaided so far needs no record yet');
  assert.equal(pendingOutcome(answerWhy(solved, {choice: 1, correct: false}).state), 'hinted');
  assert.equal(pendingOutcome(answerWhy(solved, {choice: 0, correct: true}).state), null);
  assert.equal(pendingOutcome(done(solved)), null, 'a finished attempt records its credit instead');
});

test('show answer and skip end the try step honestly', () => {
  const shown = showAnswer(createAttempt(flagged));
  assert.equal(shown.outcome, 'answer-now');
  assert.equal(creditFor(done(shown)), 'answer-now');
  const skipped = skip(createAttempt(flagged));
  assert.equal(skipped.step, 'done');
  assert.equal(creditFor(skipped), null, 'a skipped position is never scheduled');
  assert.equal(skip(shown), shown);
});

test('say why takes one of three picks, once', () => {
  const {state} = tryMove(createAttempt(flagged), right);
  assert.throws(() => answerWhy(state, {choice: 3, correct: true}), RangeError);
  const picked = answerWhy(state, {choice: 2, correct: false});
  assert.deepEqual(picked.result, {correct: false});
  assert.equal(picked.state.step, 'explain');
  assert.equal(answerWhy(picked.state, {choice: 0, correct: true}).result, null);
});

test("Claude's grade of a typed reason is feedback only and never changes credit", () => {
  const {state} = tryMove(createAttempt(flagged), right);
  const picked = answerWhy(state, {choice: 0, correct: true}).state;
  assert.throws(() => explainWhy(picked, {grade: 'great'}), RangeError);
  const graded = explainWhy(picked, {grade: 'missed'});
  assert.equal(graded.step, 'done');
  assert.equal(graded.explained, 'missed');
  assert.equal(creditFor(graded), 'unaided');
  assert.equal(creditFor(finish(picked)), 'unaided', 'typing a reason is optional');
});

test('attempts are never changed in place', () => {
  const first = createAttempt(flagged);
  const copy = structuredClone(first);
  tryMove(first, wrong);
  askHint(first);
  showAnswer(first);
  assert.deepEqual(first, copy);
});

test('a visit opens a session only after the gap', () => {
  let rec = touchSession(emptyRecord(), start);
  assert.equal(rec.session.count, 1);
  rec = touchSession(rec, start + H);
  assert.equal(rec.session.count, 1, 'same sitting');
  rec = touchSession(rec, start + H + SESSION_GAP_MS);
  assert.equal(rec.session.count, 2);
});

test('unaided solves space out: next session, then 3 later, then 6 later', () => {
  let t = start;
  let rec = touchSession(emptyRecord(), t);
  rec = recordOutcome(rec, 'missed-capture', {item: 'game-1:ply-23', outcome: 'unaided'}, t);
  assert.equal(rec.topics['missed-capture'].due, 1 + INTERVALS[0]);
  assert.equal(topicStatus(rec, 'missed-capture').state, 'scheduled');

  t += SESSION_GAP_MS;
  rec = touchSession(rec, t);
  assert.equal(topicStatus(rec, 'missed-capture').label, 'Due today');
  assert.deepEqual(dueTopics(rec), ['missed-capture']);
  rec = recordOutcome(rec, 'missed-capture', {item: 'puzzle-a', outcome: 'unaided', role: 'recall'}, t);
  assert.equal(rec.topics['missed-capture'].due, 2 + INTERVALS[1]);
  assert.ok(isLearned(rec, 'missed-capture'), 'an unaided recall in a later session counts');

  for (let i = 0; i < 3; i++) rec = touchSession(rec, (t += SESSION_GAP_MS));
  rec = recordOutcome(rec, 'missed-capture', {item: 'puzzle-b', outcome: 'unaided', role: 'recall'}, t);
  assert.equal(rec.topics['missed-capture'].due, rec.session.count + INTERVALS[2]);
});

test('a taught recall resets the interval to next session', () => {
  let t = start;
  let rec = touchSession(emptyRecord(), t);
  rec = recordOutcome(rec, 'missed-check', {item: 'm', outcome: 'unaided'}, t);
  rec = touchSession(rec, (t += SESSION_GAP_MS));
  rec = recordOutcome(rec, 'missed-check', {item: 'r1', outcome: 'unaided', role: 'recall'}, t);
  for (let i = 0; i < 3; i++) rec = touchSession(rec, (t += SESSION_GAP_MS));
  rec = recordOutcome(rec, 'missed-check', {item: 'r2', outcome: 'taught', role: 'recall'}, t);
  assert.equal(rec.topics['missed-check'].stage, 0);
  assert.equal(rec.topics['missed-check'].due, rec.session.count + 1);
});

test('same-sitting puzzles and repeats never count as learned', () => {
  let t = start;
  let rec = touchSession(emptyRecord(), t);
  rec = recordOutcome(rec, 'x', {item: 'main', outcome: 'taught'}, t);
  rec = recordOutcome(rec, 'x', {item: 'v1', outcome: 'unaided', role: 'variation'}, t);
  const due = rec.topics.x.due;
  assert.equal(isLearned(rec, 'x'), false);
  rec = touchSession(rec, (t += SESSION_GAP_MS));
  rec = recordOutcome(rec, 'x', {item: 'main', outcome: 'unaided'}, t);
  assert.equal(rec.topics.x.due, due, 'replaying your own game position moves nothing');
  rec = recordOutcome(rec, 'x', {item: 'v1', outcome: 'unaided', role: 'recall'}, t);
  assert.equal(rec.topics.x.log.at(-1).repeat, true);
  assert.equal(isLearned(rec, 'x'), false, 'recognising a seen puzzle never counts');
  rec = recordOutcome(rec, 'x', {item: 'r1', outcome: 'unaided', role: 'recall'}, t);
  assert.equal(isLearned(rec, 'x'), true, 'a fresh recall puzzle does');
});

test('a flagged move from another game never advances the interval or delays recall', () => {
  let t = start;
  let rec = touchSession(emptyRecord(), t);
  rec = recordOutcome(rec, 'x', {item: 'game-1:ply-9', outcome: 'unaided'}, t);
  rec = touchSession(rec, (t += SESSION_GAP_MS));
  const due = rec.topics.x.due;
  assert.equal(topicStatus(rec, 'x').state, 'due');
  rec = recordOutcome(rec, 'x', {item: 'game-2:ply-14', outcome: 'unaided', role: 'main'}, t);
  assert.equal(rec.topics.x.stage, 0, 'only a recall puzzle advances the interval');
  assert.equal(rec.topics.x.due, due, 'the recall check stays due');
  assert.equal(topicStatus(rec, 'x').state, 'due');
  rec = recordOutcome(rec, 'x', {item: 'r1', outcome: 'unaided', role: 'recall'}, t);
  assert.equal(rec.topics.x.stage, 1);
  assert.equal(rec.topics.x.due, rec.session.count + INTERVALS[1]);
  rec = recordOutcome(rec, 'x', {item: 'game-3:ply-30', outcome: 'taught', role: 'main'}, t);
  assert.equal(rec.topics.x.stage, 0, 'a new mistake on the idea resets the interval');
  assert.equal(rec.topics.x.due, rec.session.count + 1);
});

test('a same-sitting puzzle is evidence only and never moves the schedule', () => {
  let t = start;
  let rec = touchSession(emptyRecord(), t);
  rec = recordOutcome(rec, 'x', {item: 'main', outcome: 'unaided'}, t);
  rec = touchSession(rec, (t += SESSION_GAP_MS));
  rec = recordOutcome(rec, 'x', {item: 'r1', outcome: 'unaided', role: 'recall'}, t);
  const {stage, due} = rec.topics.x;
  assert.equal(stage, 1);
  rec = recordOutcome(rec, 'x', {item: 'v1', outcome: 'taught', role: 'variation'}, t);
  assert.equal(rec.topics.x.stage, stage);
  assert.equal(rec.topics.x.due, due);
  assert.equal(rec.topics.x.log.length, 3);
});

test('a recall solved in the same session as the first exposure is not learned', () => {
  let rec = touchSession(emptyRecord(), start);
  rec = recordOutcome(rec, 'x', {item: 'main', outcome: 'taught'}, start);
  rec = recordOutcome(rec, 'x', {item: 'r1', outcome: 'unaided', role: 'recall'}, start);
  assert.equal(isLearned(rec, 'x'), false);
  assert.equal(topicStatus(rec, 'x').learned, false);
});

test('help is recorded as it happens and the finished outcome replaces it', () => {
  let rec = touchSession(emptyRecord(), start);
  rec = recordOutcome(rec, 'x', {item: 'm', outcome: 'hinted', hintLevel: 1, pending: true, attempt: 'a1'}, start);
  assert.equal(rec.topics.x.due, 2, 'a reload now still leaves it scheduled');
  rec = recordOutcome(rec, 'x', {item: 'm', outcome: 'taught', hintLevel: 1, attempt: 'a1'}, start);
  assert.equal(rec.topics.x.log.length, 1);
  assert.equal(rec.topics.x.log[0].outcome, 'taught');
  assert.equal(rec.topics.x.log[0].pending, undefined);
  const fresh = recordOutcome(rec, 'x', {item: 'm', outcome: 'unaided', attempt: 'a2'}, start);
  assert.equal(fresh.topics.x.log.length, 2, 'a new attempt never replaces a finished one');
});

test('a finished outcome never claims less help than the pending record', () => {
  let rec = touchSession(emptyRecord(), start);
  rec = recordOutcome(rec, 'x', {item: 'm', outcome: 'hinted', hintLevel: 2, pending: true, attempt: 'a1'}, start);
  rec = recordOutcome(rec, 'x', {item: 'm', outcome: 'unaided', attempt: 'a1'}, start);
  assert.equal(rec.topics.x.log.length, 1);
  assert.equal(rec.topics.x.log[0].outcome, 'hinted');
  assert.equal(rec.topics.x.log[0].hintLevel, 2);
  assert.equal(rec.topics.x.due, 2);
});

test('a damaged first session is repaired from the log, so a later recall still counts', () => {
  const log = [{session: 5, item: 'main', outcome: 'taught', role: 'main'}, {session: 6, item: 'r1', outcome: 'unaided', role: 'recall'}];
  for (const firstSession of [99, 6, 'x']) {
    const rec = normalize({version: 1, session: {count: 6, lastAt: start}, topics: {x: {log, stage: 0, due: 7, firstSession}}});
    assert.equal(rec.topics.x.firstSession, 5, String(firstSession));
    assert.equal(isLearned(rec, 'x'), true);
  }
  const kept = normalize({version: 1, session: {count: 6, lastAt: start}, topics: {x: {log, stage: 0, due: 7, firstSession: 4}}});
  assert.equal(kept.topics.x.firstSession, 4, 'an earlier first session stays when its rows were dropped');
});

test('repair keeps the session count and repeat markers that surviving rows imply', () => {
  const log = [{session: 5, item: 'main', outcome: 'taught', role: 'main'}, {session: 6, item: 'r1', outcome: 'unaided', role: 'recall', repeat: true}];
  for (const count of ['6', 2]) {
    const rec = normalize({version: 1, session: {count, lastAt: start}, topics: {x: {log, stage: 0, due: 7, firstSession: 5}}});
    assert.equal(rec.session.count, 6, String(count));
    assert.equal(topicStatus(rec, 'x').label, 'Back in 1 session');
  }
  const rec = normalize({version: 1, session: {count: 6, lastAt: start}, topics: {x: {log, stage: 0, due: 7, firstSession: 5}}});
  assert.equal(isLearned(rec, 'x'), false, 'a saved repeat never counts, even if its first row was lost');
});

test('a pending attempt is finished in place even when another position finished after it', () => {
  let rec = touchSession(emptyRecord(), start);
  rec = recordOutcome(rec, 'x', {item: 'm1', outcome: 'hinted', hintLevel: 1, pending: true, attempt: 'a1'}, start);
  rec = recordOutcome(rec, 'x', {item: 'm2', outcome: 'unaided'}, start);
  rec = recordOutcome(rec, 'x', {item: 'm1', outcome: 'taught', attempt: 'a1'}, start);
  assert.deepEqual(rec.topics.x.log.map(row => [row.item, row.outcome, Boolean(row.pending), Boolean(row.repeat)]), [['m1', 'taught', false, false], ['m2', 'unaided', false, false]]);
  assert.throws(() => recordOutcome(rec, 'x', {item: 'm3', outcome: 'hinted', pending: true}, start), RangeError);
  assert.throws(() => recordOutcome(rec, 'x', {item: 'm3', outcome: 'unaided', pending: true, attempt: 'a3'}, start), RangeError);
});

test('repair drops impossible pending rows, resets empty topics and keeps topics under a broken header', () => {
  const good = {session: 5, item: 'main', outcome: 'taught', role: 'main', at: start};
  const rec = normalize({version: 1, session: null, topics: {
    x: {log: [good, {session: 6, item: 'r1', outcome: 'unaided', role: 'recall', pending: true}], stage: 0, due: 6, firstSession: 5},
    y: {log: [{session: 'bad'}], stage: 2, due: 9, firstSession: 50},
  }});
  assert.equal(rec.session.count, 5, 'the header is rebuilt from the rows');
  assert.equal(rec.session.lastAt, start, 'and so is the last visit');
  assert.equal(rec.topics.x.log.length, 1, 'a pending unaided row with no attempt is dropped');
  assert.equal(isLearned(rec, 'x'), false);
  assert.deepEqual(rec.topics.y, {log: [], stage: 0, due: null, firstSession: null});
  assert.equal(touchSession(rec, start + H).session.count, 5, 'a visit soon after the last row stays in the same session');
});

test('repair rebuilds stage and due from the log, and ignores bad timestamps', () => {
  const rec = normalize({version: 1, session: {count: 2, lastAt: 'x'}, topics: {x: {
    log: [{session: 1, item: 'main', outcome: 'taught', role: 'main', at: NaN}, {session: 1, item: 'v', outcome: 'unaided', role: 'variation', at: start}],
    stage: 2, due: 40, firstSession: 1,
  }}});
  assert.equal(rec.topics.x.stage, 0, 'a taught row can only leave stage 0');
  assert.equal(rec.topics.x.due, 2);
  assert.equal(rec.topics.x.log[0].at, null);
  assert.equal(rec.session.lastAt, start, 'a NaN time does not hide a good one');
  const after = recordOutcome(rec, 'x', {item: 'r1', outcome: 'unaided', role: 'recall'}, start + SESSION_GAP_MS);
  assert.equal(after.topics.x.stage, 1);
  assert.equal(after.topics.x.due, 2 + INTERVALS[1]);
});

test('repair replays rows in session order and drops empty ids', () => {
  const rec = normalize({version: 1, session: {count: 2, lastAt: start}, topics: {x: {
    log: [
      {session: 2, item: 'r1', outcome: 'unaided', role: 'recall', at: start},
      {session: 1, item: 'm', outcome: 'taught', role: 'main', at: start},
      {session: 2, item: '', outcome: 'unaided', role: 'recall', at: start},
    ],
    stage: 0, due: 2, firstSession: 1,
  }}});
  assert.deepEqual(rec.topics.x.log.map(row => row.item), ['m', 'r1']);
  assert.equal(rec.topics.x.stage, 1, 'the session 2 recall was due, so it advances');
  assert.equal(rec.topics.x.due, 2 + INTERVALS[1]);
});

test('a finished pending attempt leaves the same schedule as a replay of the log', () => {
  let rec = touchSession(emptyRecord(), start);
  rec = recordOutcome(rec, 'x', {item: 'm', outcome: 'taught'}, start);
  rec = touchSession(rec, start + SESSION_GAP_MS);
  rec = recordOutcome(rec, 'x', {item: 'r0', outcome: 'unaided', role: 'recall'}, start + SESSION_GAP_MS);
  for (let i = 2; i <= 4; i++) rec = touchSession(rec, start + i * SESSION_GAP_MS);
  assert.equal(topicStatus(rec, 'x').state, 'due');
  const now = start + 4 * SESSION_GAP_MS;
  rec = recordOutcome(rec, 'x', {item: 'r1', outcome: 'hinted', hintLevel: 1, role: 'recall', pending: true, attempt: 'a1'}, now);
  rec = recordOutcome(rec, 'x', {item: 'r2', outcome: 'unaided', role: 'recall'}, now);
  rec = recordOutcome(rec, 'x', {item: 'r1', outcome: 'hinted', hintLevel: 1, role: 'recall', attempt: 'a1'}, now);
  const replayed = normalize(rec).topics.x;
  assert.deepEqual(rec.topics.x.log.map(row => row.item), ['m', 'r0', 'r1', 'r2'], 'r1 keeps its place');
  assert.equal(rec.topics.x.stage, 1, 'the due recall r1 needed a hint, so the stage holds');
  assert.deepEqual([rec.topics.x.stage, rec.topics.x.due, rec.topics.x.firstSession], [replayed.stage, replayed.due, replayed.firstSession]);
});

test('a finished attempt keeps its role, and the live header matches a reload', () => {
  let rec = touchSession(emptyRecord(), start);
  rec = recordOutcome(rec, 'x', {item: 'r1', outcome: 'hinted', hintLevel: 1, role: 'recall', pending: true, attempt: 'a1'}, start + H);
  rec = recordOutcome(rec, 'x', {item: 'r1', outcome: 'unaided', attempt: 'a1'}, start + H);
  assert.equal(rec.topics.x.log[0].role, 'recall', 'a finish without a role keeps the pending row\'s role');
  assert.equal(rec.session.lastAt, start + H, 'recording an outcome is activity');
  assert.deepEqual(normalize(rec).session, rec.session);
  const big = normalize({version: 1, session: {count: 2 ** 53, lastAt: start}, topics: {}});
  assert.equal(big.session.count, 0, 'a counter that can not be advanced is reset');
});

test('repair rejects odd flags and the largest counter, and handles a long history', () => {
  const row = {session: 2, item: 'r1', outcome: 'unaided', role: 'recall', at: start};
  const odd = normalize({version: 1, session: {count: 2, lastAt: start}, topics: {x: {
    log: [{session: 1, item: 'm', outcome: 'taught', role: 'main', at: start}, {...row, pending: 'true', attempt: 'a1'}, {...row, item: 'r2', repeat: 1}],
    stage: 0, due: 2, firstSession: 1,
  }}});
  assert.deepEqual(odd.topics.x.log.map(r => r.item), ['m'], 'a pending or repeat marker that is not a boolean drops the row');
  assert.equal(isLearned(odd, 'x'), false);
  assert.equal(normalize({version: 1, session: {count: Number.MAX_SAFE_INTEGER, lastAt: null}, topics: {}}).session.count, 0);
  const log = Array.from({length: 200000}, (_, i) => ({session: 1, item: `v${i}`, outcome: 'unaided', role: 'variation', at: start + i}));
  const long = normalize({version: 1, session: {count: 1, lastAt: null}, topics: {x: {log}}});
  assert.equal(long.session.lastAt, start + 199999);
});

test('a second attempt on the same position before the first finishes', () => {
  let rec = touchSession(emptyRecord(), start);
  rec = recordOutcome(rec, 'x', {item: 'm', outcome: 'hinted', hintLevel: 1, pending: true, attempt: 'a1'}, start);
  rec = recordOutcome(rec, 'x', {item: 'm', outcome: 'unaided', attempt: 'a2'}, start);
  rec = recordOutcome(rec, 'x', {item: 'm', outcome: 'hinted', hintLevel: 1, attempt: 'a1'}, start);
  assert.deepEqual(rec.topics.x.log.map(row => Boolean(row.repeat)), [false, true], 'only the later attempt is a repeat');
  assert.equal(rec.topics.x.due, 2);
  assert.deepEqual(normalize(rec).topics.x, rec.topics.x);
});

test('a repeat recall moves the schedule only when the tag is due', () => {
  let rec = touchSession(emptyRecord(), start);
  rec = recordOutcome(rec, 'x', {item: 'm', outcome: 'taught'}, start);
  rec = touchSession(rec, start + SESSION_GAP_MS);
  rec = recordOutcome(rec, 'x', {item: 'r1', outcome: 'unaided', role: 'recall'}, start + SESSION_GAP_MS);
  const due = rec.topics.x.due;
  rec = recordOutcome(rec, 'x', {item: 'r1', outcome: 'hinted', role: 'recall'}, start + SESSION_GAP_MS);
  assert.equal(rec.topics.x.due, due, 'a second tab on the same puzzle does not pull the tag forward');
});

test('an outcome needs a position or puzzle id', () => {
  const rec = touchSession(emptyRecord(), start);
  for (const item of [undefined, '', 7]) assert.throws(() => recordOutcome(rec, 'x', {item, outcome: 'unaided', role: 'recall'}, start), TypeError);
});

test('a reload mid attempt, then an unaided solve, stays hinted and moves nothing', () => {
  let rec = touchSession(emptyRecord(), start);
  rec = recordOutcome(rec, 'x', {item: 'm', outcome: 'hinted', hintLevel: 1, pending: true, attempt: 'a1'}, start);
  const due = rec.topics.x.due;
  rec = recordOutcome(rec, 'x', {item: 'm', outcome: 'unaided', attempt: 'a2'}, start);
  assert.equal(rec.topics.x.log.length, 2, 'the abandoned attempt stays');
  assert.equal(rec.topics.x.log[0].outcome, 'hinted');
  assert.equal(rec.topics.x.log[1].repeat, true);
  assert.equal(rec.topics.x.due, due);
  assert.equal(normalize(rec).topics.x.log[0].pending, true, 'pending survives a save and load');
});

test('recall picks unseen puzzles first, then the one seen longest ago', () => {
  let rec = touchSession(emptyRecord(), start);
  const items = ['r1', 'r2', 'r3'];
  assert.equal(pickRecallItem(rec, 'x', []), null);
  rec = recordOutcome(rec, 'x', {item: 'r1', outcome: 'unaided', role: 'variation'}, start);
  assert.equal(pickRecallItem(rec, 'x', items), 'r2');
  rec = recordOutcome(rec, 'x', {item: 'r2', outcome: 'taught', role: 'recall'}, start);
  rec = recordOutcome(rec, 'x', {item: 'r3', outcome: 'unaided', role: 'recall'}, start);
  assert.equal(pickRecallItem(rec, 'x', items), 'r1');
  assert.equal(pickRecallItem(rec, 'x', [{id: 'r3'}, {id: 'r4'}]).id, 'r4');
  assert.ok(hasSeen(rec, 'x', 'r1'));
});

test('an empty puzzle pool still moves the due session, never the stage', () => {
  let t = start;
  let rec = touchSession(emptyRecord(), t);
  rec = recordOutcome(rec, 'x', {item: 'main', outcome: 'unaided'}, t);
  rec = recordOutcome(rec, 'x', {item: 'r1', outcome: 'unaided', role: 'recall'}, t);
  const stage = rec.topics.x.stage;
  rec = touchSession(rec, (t += 10 * SESSION_GAP_MS));
  const now = rec.session.count;
  rec = recordOutcome(rec, 'x', {item: 'r1', outcome: 'unaided', role: 'recall'}, t);
  assert.equal(rec.topics.x.stage, stage);
  assert.equal(rec.topics.x.due, now + INTERVALS[stage]);
  assert.notEqual(topicStatus(rec, 'x').state, 'due');
});

test('due today lists overdue tags first', () => {
  let t = start;
  let rec = touchSession(emptyRecord(), t);
  rec = recordOutcome(rec, 'missed-mate', {item: 'a', outcome: 'taught'}, t);
  rec = touchSession(rec, (t += SESSION_GAP_MS));
  rec = recordOutcome(rec, 'missed-check', {item: 'b', outcome: 'taught'}, t);
  rec = recordOutcome(rec, 'undefended-piece', {item: 'c', outcome: 'unaided'}, t);
  assert.deepEqual(dueTopics(rec), ['missed-mate']);
  rec = touchSession(rec, (t += SESSION_GAP_MS));
  assert.deepEqual(dueTopics(rec), ['missed-mate', 'missed-check', 'undefended-piece']);
});

test('damaged saved progress is repaired, valid progress is kept', () => {
  assert.deepEqual(normalize(null), emptyRecord());
  assert.deepEqual(normalize({version: 9}), emptyRecord());
  const ok = recordOutcome(touchSession(emptyRecord(), start), 'x', {item: 'a', outcome: 'hinted', hintLevel: 1}, start);
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(ok))), ok);
  const good = {session: 1, item: 'a', outcome: 'unaided', hintLevel: 0, role: 'main', at: start};
  const rec = normalize({version: 1, session: {count: 2, lastAt: start}, topics: {
    empty: {}, bad: {log: 'nope'}, gone: null,
    mixed: {log: [good, {...good, outcome: 'guessed'}, {...good, role: 'boss'}, null, {...good, session: '1'}], stage: 99, due: 'soon'},
  }});
  assert.deepEqual(Object.keys(rec.topics), ['mixed']);
  assert.deepEqual(rec.topics.mixed, {log: [good], stage: 0, due: 2, firstSession: 1}, 'stage and due are rebuilt from the log');
  for (const id of ['empty', 'bad', 'gone', 'mixed']) {
    assert.ok(!/NaN/.test(topicStatus(rec, id).label));
    isLearned(rec, id);
    lastOutcome(rec, id);
    recordOutcome(rec, id, {item: 'r1', outcome: 'taught', role: 'recall'}, start);
  }
  assert.throws(() => recordOutcome(rec, 'x', {item: 'r1', outcome: 'skipped'}, start), RangeError);
});

test('records are never changed in place', () => {
  const rec = touchSession(emptyRecord(), start);
  const copy = structuredClone(rec);
  recordOutcome(rec, 'x', {item: 'a', outcome: 'unaided'}, start);
  touchSession(rec, start + SESSION_GAP_MS);
  assert.deepEqual(rec, copy);
});
