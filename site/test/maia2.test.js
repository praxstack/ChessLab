// Maia-2's input and output in plain JavaScript (maia2.js), checked against
// the same functions run in Python next to the ONNX export (fixtures/maia2-reference.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHANNELS, MOVES, bestPolicyMove, encodeBoard, eloBucket, mirrorMove, policyIndexOf, winChance } from '../public/assets/maia2.js';

const REF = JSON.parse(readFileSync(new URL('./fixtures/maia2-reference.json', import.meta.url), 'utf8'));

test('the 1880 moves come in the network’s order', () => {
  assert.equal(MOVES.length, 1880);
  assert.deepEqual(MOVES, REF.moves);
});

test('the board planes match Python’s for every reference position, both sides to move', () => {
  for (const c of REF.cases) {
    const x = encodeBoard(c.fen);
    assert.equal(x.length, CHANNELS * 64);
    const on = [];
    x.forEach((v, i) => v && on.push(i));
    assert.deepEqual(on, c.on, c.fen);
  }
});

test('ratings go into 11 buckets', () => {
  assert.deepEqual([600, 1099, 1100, 1199, 1500, 1999, 2000, 2800, undefined].map(eloBucket), [0, 0, 1, 1, 5, 9, 10, 10, 0]);
});

test('moves are mirrored for Black, promotions and castling included', () => {
  assert.equal(mirrorMove('e7e5'), 'e2e4');
  assert.equal(mirrorMove('a2a1q'), 'a7a8q');
  assert.equal(policyIndexOf('e8c8', true), MOVES.indexOf('e1c1'));
  assert.equal(policyIndexOf('g7h8n', false), MOVES.indexOf('g7h8n'), 'a capture-promotion is listed');
  assert.equal(policyIndexOf('a1b4', false), -1, 'no piece moves like that');
});

test('the best legal move is read from the logits, mirrored back for Black', () => {
  const logits = new Float32Array(1880).fill(-5);
  logits[MOVES.indexOf('g1f3')] = 3; // seen from the mover: for Black that's g8f6
  logits[MOVES.indexOf('e2e4')] = 2;
  assert.equal(bestPolicyMove(['g8f6', 'e7e5'], logits, true), 'g8f6');
  assert.equal(bestPolicyMove(['e2e4', 'd2d4'], logits, false), 'e2e4');
  assert.equal(winChance(1.2), 1);
  assert.equal(winChance(0), 0.5);
});
