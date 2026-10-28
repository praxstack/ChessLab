// When the next Chess.com daily puzzle comes out, and how the page words it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPuzzleAt, whenText } from '../public/assets/daily-clock.js';

const IST = 'Asia/Kolkata';

test('the next puzzle comes at midnight US Pacific time: 12:30 PM in India in summer, 1:30 PM in winter', () => {
  // Checked against Chess.com: the puzzle dated 28 Oct 2026 has publish_time 1793170800 (07:00 UTC).
  assert.equal(nextPuzzleAt('2026-10-27'), 1793170800 * 1000);
  assert.equal(new Date(nextPuzzleAt('2026-10-27')).toISOString(), '2026-10-28T07:00:00.000Z');
  // US clocks go back on 1 Nov 2026, so the puzzle of 2 Nov comes an hour later.
  assert.equal(new Date(nextPuzzleAt('2026-10-31')).toISOString(), '2026-11-01T07:00:00.000Z');
  assert.equal(new Date(nextPuzzleAt('2026-11-01')).toISOString(), '2026-11-02T08:00:00.000Z');
  // And back to summer time on 14 Mar 2027; month and year ends roll over.
  assert.equal(new Date(nextPuzzleAt('2027-03-14')).toISOString(), '2027-03-15T07:00:00.000Z');
  assert.equal(new Date(nextPuzzleAt('2026-12-31')).toISOString(), '2027-01-01T08:00:00.000Z');
});

test('the time reads in the learner’s own clock', () => {
  const at = nextPuzzleAt('2026-10-27'); // 28 Oct, 12:30 PM in India
  assert.equal(whenText(at, { now: Date.parse('2026-10-28T03:00:00Z'), timeZone: IST }), 'today 12:30 pm');
  assert.equal(whenText(at, { now: Date.parse('2026-10-27T15:00:00Z'), timeZone: IST }), 'tomorrow 12:30 pm');
  assert.equal(whenText(at, { now: Date.parse('2026-10-25T15:00:00Z'), timeZone: IST }), 'Wed 12:30 pm');
  assert.equal(whenText(nextPuzzleAt('2026-11-01'), { now: Date.parse('2026-11-02T03:00:00Z'), timeZone: IST }), 'today 1:30 pm');
  assert.equal(whenText(at, { now: Date.parse('2026-10-27T20:00:00Z'), timeZone: 'America/New_York' }), 'tomorrow 3:00 am');
  assert.equal(whenText(at, { now: at + 1000, timeZone: IST }), 'any minute now');
});
