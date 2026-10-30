import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {engineControls} from '../../../../shared/strength-ladder.js';
import {stockfishPolicy} from '../../../../shared/opponent-policy.js';
import {createLocalOpponent, secureRandomInt} from './opponent.js';

// A fixed random sequence, so the server's policy and the browser opponent can be compared move for move.
const sequence = values => { let i = 0; return n => { assert.equal(n, 1_000_000); return values[i++ % values.length]; }; };
const engine = (move = 'e2e4') => {
  const calls = [];
  return {calls, status: async () => ({available: true, name: 'Stockfish 19 Lite WASM'}), bestMove: async input => { calls.push(input); return {move, engine: 'Stockfish 19 Lite WASM'}; }};
};

test('ratings map to the server ladder controls', () => {
  assert.deepEqual(engineControls(100), {skill: 0, movetime: 80, sampledShare: 1});
  assert.deepEqual(engineControls(650), {skill: 0, movetime: 217, sampledShare: 0.45});
  assert.deepEqual(engineControls(1480), {skill: 8, movetime: 493, sampledShare: 0});
  assert.deepEqual(engineControls(3200), {skill: 20, movetime: 1067, sampledShare: 0});
});

for (const [rating, style, randoms] of [[100, 'balanced', [0, 500_000]], [250, 'aggressive', [849_999, 999_999]], [650, 'solid', [449_999, 10]], [650, 'balanced', [450_000, 10]], [1480, 'balanced', [0, 0]], [3200, 'aggressive', [0, 0]]]) {
  test(`a ${rating} ${style} bot moves exactly as the server policy would`, async () => {
    const moves = ['e2e4', 'd7d5'];
    const {skill, movetime} = engineControls(rating);
    const local = engine('e4d5');
    const decision = await createLocalOpponent({randomInt: sequence(randoms)}).chooseMove(local, {engineId: 'stockfish19', moves, initialFen: null, variant: 'standard', rating, ...(rating < 250 ? {profileRating: rating} : {}), skill, movetime, style});
    const board = new Chess(); for (const move of moves) board.move({from: move.slice(0, 2), to: move.slice(2, 4)});
    const server = stockfishPolicy({move: 'e4d5', engine: 'Stockfish 19 Lite WASM', engineId: 'stockfish19'}, board, rating, skill, style, sequence(randoms));
    assert.deepEqual(decision, server);
    assert.equal(decision.baseMove, 'e4d5');
    assert.equal(decision.policy.applied, engineControls(rating).sampledShare * 1_000_000 > randoms[0]);
    assert.deepEqual([local.calls[0].skill, local.calls[0].movetime], [skill, movetime]);
    assert.ok(board.moves({verbose: true}).some(move => move.from + move.to === decision.move));
  });
}

test('the server opponent uses the same shared policy', async () => {
  const {readFile} = await import('node:fs/promises');
  const source = await readFile(new URL('../../../../server/opponent-engines.mjs', import.meta.url), 'utf8');
  assert.match(source, /from '\.\.\/shared\/opponent-policy\.js'/);
});

test('the browser opponent checks its input like the server', async () => {
  const opponent = createLocalOpponent({randomInt: () => 0});
  const base = {engineId: 'stockfish19', moves: [], variant: 'standard', rating: 1500, skill: 8, movetime: 500};
  await assert.rejects(opponent.chooseMove(engine(), {...base, engineId: 'maia3'}), /Unknown opponent engine/);
  await assert.rejects(opponent.chooseMove(engine(), {...base, movetime: 5000}), /movetime/);
  await assert.rejects(opponent.chooseMove(engine(), {...base, rating: 120}), /rating/);
  await assert.rejects(opponent.chooseMove(engine(), {...base, rating: 120, profileRating: 100}), /profile rating/);
  await assert.rejects(opponent.chooseMove(engine(), {...base, style: 'wild'}), /style/);
  await assert.rejects(opponent.chooseMove(engine(), {...base, moves: ['f2f3', 'e7e5', 'g2g4', 'd8h4']}), /game is over/);
});

test('secure random integers stay in range', () => {
  for (let i = 0; i < 200; i++) { const value = secureRandomInt(7); assert.ok(Number.isInteger(value) && value >= 0 && value < 7); }
});
