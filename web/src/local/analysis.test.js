import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePosition} from './analysis.js';

const engine = lines => ({
  status: async () => ({available: true, name: 'Test engine'}),
  analyze: async () => ({engine: 'Test engine', lines}),
});

test('a malformed engine line is dropped and the good lines stay', async () => {
  const result = await analyzePosition(engine([
    {moves: ['e2e5'], score: {type: 'cp', value: 90}},
    {moves: [42], score: {type: 'cp', value: 80}},
    {moves: ['d2d4', 'd7d5'], score: {type: 'cp', value: 30}},
  ]), {moves: [], lines: 3});
  assert.equal(result.bestmove, 'd2d4');
  assert.deepEqual(result.lines.map(line => line.move), ['d2d4']);
});

test('analysis with no usable line answers 503', async () => {
  await assert.rejects(analyzePosition(engine([{moves: ['e2e5'], score: {type: 'cp', value: 90}}]), {moves: []}), error => error.status === 503);
});
