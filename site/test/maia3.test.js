// Maia-3's input and output in plain JavaScript (maia3.js), checked against
// the same steps run in Python next to the ONNX export (fixtures/maia3-reference.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOVES, TOKEN, bestPolicyMove, encodeBoard, mirrorMove, policyIndexOf, winChance } from '../public/assets/maia3.js';

const REF = JSON.parse(readFileSync(new URL('./fixtures/maia3-reference.json', import.meta.url), 'utf8'));

test('Maia-3: the 4352 moves come in the network’s order', () => {
  assert.equal(MOVES.length, 4352);
  assert.deepEqual(MOVES, REF.moves);
});

test('Maia-3: the board input matches Python’s for every reference position, both sides to move', () => {
  for (const c of REF.cases) {
    const x = encodeBoard(c.fen);
    assert.equal(x.length, 64 * TOKEN);
    const on = [];
    x.forEach((v, i) => v && on.push(i));
    assert.deepEqual(on, c.on, c.fen);
  }
});

test('Maia-3: moves are mirrored for Black, promotions use their own outputs', () => {
  assert.equal(mirrorMove('a2a1q'), 'a7a8q');
  assert.equal(policyIndexOf('e2e4', false), 12 * 64 + 28);
  assert.equal(policyIndexOf('e7e5', true), 12 * 64 + 28);
  assert.equal(policyIndexOf('a7a8q', false), 4096);
  assert.equal(policyIndexOf('h7g8n', false), 4096 + (7 * 8 + 6) * 4 + 3);
  assert.equal(policyIndexOf('a2a1r', true), 4097);
});

test('Maia-3: the best legal move is read from the logits, and the value as an expected score', () => {
  const logits = new Float32Array(4352).fill(-5);
  logits[policyIndexOf('g1f3', false)] = 3; // seen from the mover: for Black that's g8f6
  assert.equal(bestPolicyMove(['g8f6', 'e7e5'], logits, true), 'g8f6');
  assert.equal(winChance([0, 0, 0]), 0.5);
  assert.ok(winChance([-9, -9, 9]) > 0.99);
  assert.ok(winChance([9, -9, -9]) < 0.01);
});
