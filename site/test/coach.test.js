// Coach check (coach.js): the engine judges the learner's numbered line and
// stops at the first move that fails. A fake engine stands in for Stockfish.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLine, ending, endings, failNote, judgeStep, passNote, stepLabel, uci } from '../public/assets/coach.js';
import { nextStep, replay } from '../public/assets/line.js';

/** Build a line the way the drawing layer does: legal steps with SAN. */
function line(start, moves) {
  const steps = [];
  for (const m of moves) {
    const s = nextStep(start, steps, m.slice(0, 2), m.slice(2, 4));
    assert.ok(!s.error, `${m}: ${s.error}`);
    steps.push(s);
  }
  return { start, steps, fens: replay(start, steps).fens };
}

/** A fake engine: answers by the moves played so far ("" is the start). */
function fakeEngine(table) {
  const asked = [];
  const look = async (fen, moves) => {
    const key = moves.join(' ');
    asked.push(key);
    assert.ok(key in table, `the fake engine wasn’t told about "${key}"`);
    return table[key];
  };
  return { look, asked };
}

// White to move: Ra8 is a back-rank mate.
const MATE_IN_1 = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 30';

test('stepLabel numbers White and Black moves from the start position', () => {
  const w = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  assert.equal(stepLabel(w, 0, 'Bb5'), '3. Bb5');
  assert.equal(stepLabel(w, 1, 'a6'), '3… a6');
  assert.equal(stepLabel(w, 2, 'Ba4'), '4. Ba4');
  const b = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 7';
  assert.equal(stepLabel(b, 0, 'Nf6'), '7… Nf6');
  assert.equal(stepLabel(b, 1, 'Nc3'), '8. Nc3');
  assert.equal(stepLabel(b, 2, 'Bc5'), '8… Bc5');
});

test('ending: mate, draw, or the game goes on', () => {
  assert.equal(ending('R5k1/5ppp/8/8/8/8/8/6K1 b - - 1 30'), 'mate');
  assert.equal(ending('7k/5Q2/6K1/8/8/8/8/8 b - - 0 60'), 'draw', 'stalemate');
  assert.equal(ending(MATE_IN_1), null);
  assert.equal(ending('nonsense'), null);
});

test('judgeStep: the engine’s own move is best; a mate is as good as it gets', () => {
  const step = { from: 'h5', to: 'h7' };
  assert.equal(judgeStep({ step, before: { move: 'h5h7', score: { mate: 1 } }, after: null, ended: 'mate' }), 'best');
  assert.equal(judgeStep({ step, before: { move: 'd3h7', score: { mate: 1 } }, after: null, ended: 'mate' }), 'best', 'a different mate is still mate');
  // Lost a rook's worth: from +5 to -0.5 for the mover.
  assert.equal(judgeStep({ step, before: { move: 'a1a2', score: { cp: 500 } }, after: { score: { cp: 50 } }, ended: null }), 'miss');
  assert.equal(judgeStep({ step, before: { move: 'a1a2', score: { cp: 100 } }, after: { score: { cp: -60 } }, ended: null }), 'good');
  assert.equal(uci({ from: 'e7', to: 'e8', promotion: 'q' }), 'e7e8q');
});

test('checkLine: a line that holds, ending in mate, asks no more than it needs', async () => {
  const l = line(MATE_IN_1, ['a1a8']);
  const eng = fakeEngine({ '': { move: 'a1a8', score: { mate: 1 } } });
  const r = await checkLine({ ...l, look: eng.look });
  assert.equal(r.fail, -1);
  assert.deepEqual(r.verdicts, ['best']);
  assert.equal(r.note, '✓ Your line holds all the way, and 30. Ra8# is mate.');
  assert.deepEqual(eng.asked, [''], 'no look after a mate');
});

test('checkLine: the learner’s own weak move fails, and the note gives no move away', async () => {
  // 30. Ra7 (drops the mate), the engine wanted Ra8#.
  const l = line(MATE_IN_1, ['a1a7', 'g8f8']);
  const eng = fakeEngine({
    '': { move: 'a1a8', score: { mate: 1 } },
    a1a7: { move: 'g8f8', score: { cp: 0 } }, // Black to move, level now
  });
  const r = await checkLine({ ...l, look: eng.look });
  assert.equal(r.fail, 0);
  assert.equal(r.verdicts[0], 'miss');
  assert.match(r.note, /^✗ 30\. Ra7\? This lets it slip/);
  assert.doesNotMatch(r.note, /Ra8/, 'the engine’s move stays hidden');
  assert.deepEqual(eng.asked, ['', 'a1a7'], 'stops at the first failure');
});

test('checkLine: a weak reply the learner expected gets the reply that holds', async () => {
  // 1. e4 e5 2. Qh5 Nc6, then the learner (White) draws 3. Bc4 Nf6?? 4. Qxf7#. Black has g6.
  const start = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3';
  const l = line(start, ['f1c4', 'g8f6', 'h5f7']);
  const eng = fakeEngine({
    '': { move: 'f1c4', score: { cp: 30 } },
    f1c4: { move: 'g7g6', score: { cp: -30 } },
    'f1c4 g8f6': { move: 'h5f7', score: { mate: 1 } }, // White to move and mates
  });
  const r = await checkLine({ ...l, look: eng.look });
  assert.equal(r.fail, 1);
  assert.equal(r.note, '✗ 3… Nf6? Black has a better reply: 3… g6! holds.');
});

test('checkLine: every move holds, mid-game', async () => {
  const start = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  const l = line(start, ['f1b5', 'a7a6', 'b5a4']);
  const eng = fakeEngine({
    '': { move: 'f1b5', score: { cp: 35 } },
    f1b5: { move: 'a7a6', score: { cp: -35 } },
    'f1b5 a7a6': { move: 'b5a4', score: { cp: 35 } },
  });
  const r = await checkLine({ ...l, look: eng.look });
  assert.equal(r.fail, -1);
  assert.deepEqual(r.verdicts, ['best', 'best', 'best']);
  assert.equal(r.note, '✓ All 3 moves hold up, through 4. Ba4.');
  assert.deepEqual(eng.asked, ['', 'f1b5', 'f1b5 a7a6'], 'one look per position, none after the last best move');
});

test('checkLine: a playable-but-weaker move of the learner fails softly', async () => {
  const start = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  const l = line(start, ['a2a3']);
  const eng = fakeEngine({
    '': { move: 'f1b5', score: { cp: 200 } },
    a2a3: { move: 'g8f6', score: { cp: -20 } },
  });
  const r = await checkLine({ ...l, look: eng.look });
  assert.equal(r.verdicts[0], 'ok');
  assert.match(r.note, /^✗ 3\. a3\? Playable, but there’s a stronger move here/);
});

test('checkLine stops quietly when the board moves on', async () => {
  const start = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  const l = line(start, ['f1b5', 'a7a6']);
  let ok = true;
  const eng = fakeEngine({ '': { move: 'f1c4', score: { cp: 35 } }, f1b5: { move: 'a7a6', score: { cp: -30 } } });
  const look = async (f, m) => {
    const a = await eng.look(f, m);
    ok = false; // the learner moved a piece while the engine looked
    return a;
  };
  assert.equal(await checkLine({ ...l, look, alive: () => ok }), null);
});

test('failNote and passNote word draws and single moves', () => {
  const start = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  const steps = [{ san: 'Bb5' }];
  assert.equal(passNote({ start, steps, endedWith: null }), '✓ 3. Bb5 holds up.');
  assert.equal(passNote({ start, steps, endedWith: 'draw' }), '✓ Your line holds, and it ends in a draw after 3. Bb5.');
  const note = failNote({ start, i: 1, step: { san: 'Nf6' }, fen: start.replace(' w ', ' b '), learner: 'w', verdict: 'miss', before: { move: null } });
  assert.equal(note, '✗ 3… Nf6? Black has a better reply here.');
});

test('a line that repeats the position three times ends in a draw, and the check stops there', async () => {
  const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const shuffle = ['g1f3', 'g8f6', 'f3g1', 'f6g8'];
  const l = line(start, [...shuffle, ...shuffle, 'e2e4']);
  assert.deepEqual(endings(l.start, l.steps), [null, null, null, null, null, null, null, 'draw', null], 'the 8th move repeats the start a third time');
  const table = {};
  const moves = l.steps.map((s) => s.from + s.to);
  for (let i = 0; i <= 7; i += 1) table[moves.slice(0, i).join(' ')] = { move: moves[i], score: { cp: i % 2 ? -10 : 10 } };
  const eng = fakeEngine(table);
  const r = await checkLine({ ...l, look: eng.look });
  assert.equal(r.fail, -1);
  assert.equal(r.verdicts.length, 8, 'the move after the draw isn’t graded');
  assert.equal(r.note, '✓ Your line holds, and it ends in a draw after 4… Ng8.');
});
