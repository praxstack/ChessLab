// Tap-only helpers (helpers.js): where a piece can go, what's loose, who
// guards a square. They describe the position; they never pick a move.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guard, loose, reach } from '../public/assets/helpers.js';
import { aidSVG } from '../public/assets/draw.js';

const ITALIAN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

test('reach: legal squares for either side’s piece, takes marked', () => {
  const n = reach(ITALIAN, 'f3');
  assert.deepEqual(n.to.sort(), ['d4', 'e5', 'g1', 'g5', 'h4']);
  assert.deepEqual(n.takes, ['e5']);
  const black = reach(ITALIAN, 'c6'); // Black's knight, though White is to move
  assert.deepEqual(black.to.sort(), ['a5', 'b4', 'b8', 'd4', 'e7']);
  assert.deepEqual(reach(ITALIAN, 'e3'), { piece: null, to: [], takes: [] });
  assert.equal(reach('nonsense', 'e2').piece, null);
});

test('loose: attacked and not defended enough, kings aside', () => {
  // White's e5 knight is attacked by the d6 pawn: a cheaper attacker, so loose even though defended.
  const fen = 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 4';
  assert.deepEqual(loose(fen, 'w'), ['e5', 'e4'], 'and e4: the f6 knight hits it, nothing guards it');
  assert.deepEqual(loose(ITALIAN, 'w'), [], 'nothing hangs in the Italian');
  assert.deepEqual(loose(ITALIAN, 'b'), [], 'e5 is attacked once and defended once');
  const afterD4 = 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3';
  assert.deepEqual(loose(afterD4, 'b'), ['e5'], 'attacked twice, defended once');
  assert.deepEqual(loose('nonsense', 'w'), []);
});

test('guard: attackers against defenders, in words too', () => {
  const e5 = guard(ITALIAN, 'e5');
  assert.equal(e5.attackers, 1);
  assert.equal(e5.defenders, 1);
  assert.equal(e5.short, false);
  assert.match(e5.text, /Black’s pawn on e5: attacked once, defended once, held/);
  const d4 = guard(ITALIAN, 'd4');
  assert.equal(d4.empty, true);
  assert.match(d4.text, /White hits it once, Black twice/);
  assert.equal(guard('nonsense', 'e4'), null);
});

test('helpers draw dots, tags and tallies in board units', () => {
  const r = aidSVG({ kind: 'reach', sq: 'f3', to: ['g5', 'e5'], takes: ['e5'] }, 'white');
  assert.equal((r.match(/aid-dot/g) || []).length, 1);
  assert.equal((r.match(/aid-take/g) || []).length, 1);
  assert.match(aidSVG({ kind: 'loose', squares: ['e5'] }, 'white'), />loose</);
  assert.match(aidSVG({ kind: 'guard', sq: 'e5', g: { empty: false, attackers: 2, defenders: 1, short: true } }, 'black'), /aid-tally is-short[\s\S]*>2 v 1</);
  assert.equal(aidSVG(null, 'white'), '');
});
