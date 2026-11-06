// The Lc0-style search (lc0-search.js) driven by a fake network, so its
// choices can be checked without a model or a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expand, priors, search } from '../public/assets/lc0-search.js';
import { POLICY_SIZE, policyIndexOf } from '../public/assets/lc0.js';

/** A network that likes the listed moves (from the mover's view) and thinks every position is level. */
function fakeNet(likes = {}, wdl = [0.3, 0.4, 0.3]) {
  let calls = 0;
  const evaluate = async (fens) => {
    calls += 1;
    const black = fens[fens.length - 1].split(' ')[1] === 'b';
    const policy = new Float32Array(POLICY_SIZE);
    for (const [uci, logit] of Object.entries(likes)) {
      const i = policyIndexOf(uci, black);
      if (i >= 0) policy[i] = logit;
    }
    return { policy, wdl };
  };
  return { evaluate, calls: () => calls };
}

test('search: finds a mate in one even when the network doesn’t point at it', async () => {
  const fen = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 30';
  const net = fakeNet({ a1a2: 3 }); // the network prefers a quiet rook move
  const r = await search([fen], net.evaluate, { maxNodes: 60 });
  assert.equal(r.move, 'a1a8');
  assert.equal(r.mate, 1);
  assert.ok(r.score > 0.9);
});

test('search: a lone legal move is played after one look', async () => {
  const fen = '7k/8/8/8/8/8/6q1/7K w - - 0 1'; // only Kxg2
  const net = fakeNet();
  const r = await search([fen], net.evaluate, { maxNodes: 50 });
  assert.equal(r.move, 'h1g2');
  assert.equal(net.calls(), 1);
});

test('search: stops when told to, and plays the move it looked at most', async () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const net = fakeNet({ e2e4: 4, d2d4: 3 });
  let n = 0;
  const r = await search([fen], net.evaluate, { stop: () => ++n > 20 });
  assert.equal(r.move, 'e2e4');
  assert.ok(r.nodes >= 20 && r.nodes <= 22, `nodes ${r.nodes}`);
  assert.equal(r.line[0], 'e2e4');
});

test('expand: mate, stalemate, a repeat inside the search and the 50-move rule end the game', () => {
  assert.equal(expand(['R5k1/5ppp/8/8/8/8/8/6K1 b - - 1 30'], 1).end, 'mate');
  assert.equal(expand(['7k/5Q2/6K1/8/8/8/8/8 b - - 0 60'], 1).end, 'draw');
  assert.equal(expand(['4k3/8/8/8/8/8/4P3/4K3 w - - 100 80'], 1).end, 'draw');
  const a = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
  const b = '4k3/8/8/8/8/8/4P3/3K4 b - - 1 1';
  const c = '3k4/8/8/8/8/8/4P3/3K4 w - - 2 2';
  const d = '3k4/8/8/8/8/8/4P3/4K3 b - - 3 2';
  const e = '4k3/8/8/8/8/8/4P3/4K3 w - - 4 3';
  assert.equal(expand([a, b, c, d, e], 5).end, null, 'a repeat from before the search is not yet a draw');
  assert.equal(expand([a, b, c, d, e], 1).end, 'draw', 'a repeat inside the search is');
  const m = expand([a], 1).moves.find((x) => x.uci === 'e2e4');
  assert.ok(m && m.after.includes('4P3'));
});

test('priors: legal moves only, summing to one, castling by its king-takes-rook key', () => {
  const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
  const moves = expand([fen], 1).moves;
  const policy = new Float32Array(POLICY_SIZE);
  policy[policyIndexOf('e1h1', false)] = 5;
  const p = priors(moves, policy, false);
  assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-6);
  assert.equal(moves[p.indexOf(Math.max(...p))].uci, 'e1g1');
});
