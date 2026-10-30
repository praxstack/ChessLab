// The numbered line (line.js): legal steps from the line's own position, why a
// step doesn't fit, the move text, and replaying it for Play it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineText, nextStep, replay } from '../public/assets/line.js';
import { createSketch, lineSteps, shapeSVG, stepBadge } from '../public/assets/draw.js';

const ITALIAN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

test('line: steps follow the rules from the line’s start, both sides in turn', () => {
  const a = nextStep(ITALIAN, [], 'f1', 'c4');
  assert.equal(a.san, 'Bc4');
  assert.equal(a.side, 'w');
  assert.equal(a.n, 1);
  const b = nextStep(ITALIAN, [a], 'g8', 'f6');
  assert.equal(b.san, 'Nf6');
  assert.equal(b.n, 2);
  assert.match(nextStep(ITALIAN, [a, b], 'f6', 'e4').error, /White moves next/);
  assert.match(nextStep(ITALIAN, [a], 'e5', 'e3').error, /can’t go to e3/);
  assert.match(nextStep(ITALIAN, [a], 'd4', 'd5').error, /no piece on d4/);
  assert.match(nextStep('not a fen', [], 'e2', 'e4').error, /can’t be played/);
  assert.match(nextStep(ITALIAN, [{ from: 'a1', to: 'a8' }], 'g8', 'f6').error, /no longer fits/);
});

test('line: pawns reaching the end become queens', () => {
  const s = nextStep('8/4P3/8/8/8/8/k7/4K3 w - - 0 1', [], 'e7', 'e8');
  assert.equal(s.san, 'e8=Q');
  assert.equal(s.promotion, 'q');
});

test('line: move text numbers from the position, Black starting too', () => {
  const a = nextStep(ITALIAN, [], 'f1', 'c4');
  const b = nextStep(ITALIAN, [a], 'g8', 'f6');
  const c = nextStep(ITALIAN, [a, b], 'f3', 'g5');
  assert.equal(lineText(ITALIAN, [a, b, c]), '3. Bc4 Nf6 4. Ng5');
  const blackFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
  const x = nextStep(blackFen, [], 'g8', 'f6');
  const y = nextStep(blackFen, [x], 'f3', 'g5');
  assert.equal(lineText(blackFen, [x, y]), '3… Nf6 4. Ng5');
});

test('line: replay gives each position for Play it, stopping where it breaks', () => {
  const a = nextStep(ITALIAN, [], 'f1', 'c4');
  const r = replay(ITALIAN, [a, { from: 'a1', to: 'a8' }]);
  assert.equal(r.ok, 1);
  assert.equal(r.fens.length, 1);
  assert.match(r.fens[0], /2B1P3/);
  assert.deepEqual(replay('nope', [a]), { fens: [], ok: 0 });
});

test('line: steps are drawn as numbered arrows and kept in order', () => {
  const sk = createSketch();
  sk.add({ kind: 'step', n: 2, from: 'g8', to: 'f6', color: 'red' });
  sk.add({ kind: 'free', pts: [[1, 1]], color: 'blue' });
  sk.add({ kind: 'step', n: 1, from: 'f1', to: 'c4', color: 'green' });
  assert.deepEqual(lineSteps(sk.shapes).map((s) => s.n), [1, 2]);
  const svg = shapeSVG({ kind: 'step', n: 1, from: 'f1', to: 'c4', color: 'green', seed: 3 }, 'white');
  assert.match(svg, /class="dr dr--step tone--green"/);
  assert.match(svg, /<text class="dr-num__n"[^>]*>1<\/text>/);
  const [x, y] = stepBadge({ from: 'a1', to: 'a8' }, 'white');
  assert.equal(x, 5);
  assert.ok(y > 40 && y < 75, 'a third of the way up from a1');
  const taken = [];
  const one = stepBadge({ from: 'f4', to: 'e6' }, 'white', taken);
  const two = stepBadge({ from: 'f5', to: 'f4' }, 'white', taken);
  assert.ok(Math.hypot(one[0] - two[0], one[1] - two[1]) >= 5.6, 'a second number moves off the first');
  assert.doesNotMatch(shapeSVG({ kind: 'step', n: '<b>', from: 'f1', to: 'c4', color: 'green' }, 'white'), /<b>/);
  assert.ok(sk.keep((s) => s.kind !== 'step'));
  assert.equal(lineSteps(sk.shapes).length, 0);
  assert.ok(sk.undo());
  assert.equal(lineSteps(sk.shapes).length, 2, 'clearing the line is one undo step');
});
