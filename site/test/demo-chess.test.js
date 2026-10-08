// Checks that the hero walkthrough is accurate chess: legal moves, matching
// positions, real attacks behind every arrow, and the claims in the captions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { DEMO } from '../public/assets/demo-data.js';

const placement = (chess) => chess.fen().split(' ')[0];

function lastMove(chess) {
  const history = chess.history({ verbose: true });
  const move = history[history.length - 1];
  return [move.from, move.to];
}

function pieceAt(chess, sq) {
  return chess.get(sq);
}

/** True when the side to move can force mate within n of its own moves. */
function forcedMate(chess, n) {
  for (const move of chess.moves()) {
    chess.move(move);
    let mates = chess.isCheckmate();
    if (!mates && n > 1 && !chess.isGameOver()) {
      mates = chess.moves().every((reply) => {
        chess.move(reply);
        const ok = forcedMate(chess, n - 1);
        chess.undo();
        return ok;
      });
    }
    chess.undo();
    if (mates) return true;
  }
  return false;
}

function checkArrows(chess, step) {
  for (const arrow of step.arrows) {
    const piece = pieceAt(chess, arrow.from);
    assert.ok(piece, `${step.id}: arrow starts on an empty square ${arrow.from}`);
    if (arrow.tone === 'idea') {
      const legal = chess.moves({ verbose: true }).some((m) => m.from === arrow.from && m.to === arrow.to);
      assert.ok(legal, `${step.id}: idea arrow ${arrow.from}-${arrow.to} must be a legal move`);
    } else {
      const attackers = chess.attackers(arrow.to, piece.color);
      assert.ok(
        attackers.includes(arrow.from),
        `${step.id}: ${arrow.from} must attack ${arrow.to} (attackers: ${attackers})`,
      );
    }
  }
}

function checkMarks(chess, step) {
  for (const mark of step.marks || []) {
    if (mark.tone !== 'covered') continue;
    assert.equal(chess.get(mark.sq), undefined, `${step.id}: covered square ${mark.sq} should be empty`);
    assert.ok(chess.attackers(mark.sq, 'w').length > 0, `${step.id}: ${mark.sq} must be covered by White`);
  }
}

function replayOpening() {
  const chess = new Chess();
  for (const san of DEMO.opening) assert.ok(chess.move(san), `illegal opening move ${san}`);
  return chess;
}

test('main line: every move is legal and every stored position matches', () => {
  const chess = replayOpening();
  for (const step of DEMO.main) {
    const frames = [];
    for (const san of step.play) {
      assert.ok(chess.move(san), `${step.id}: illegal move ${san}`);
      frames.push(placement(chess));
    }
    assert.deepEqual(frames.slice(0, -1), step.frames || [], `${step.id}: intermediate frames differ`);
    assert.equal(placement(chess), step.fen, `${step.id}: stored position differs`);
    assert.deepEqual(lastMove(chess), step.last, `${step.id}: last-move squares differ`);
    checkArrows(chess, step);
    checkMarks(chess, step);
  }
  assert.equal(chess.history().slice(-5).join(' '), 'Nxe5 Bxd1 Bxf7+ Ke7 Nd5#');
});

test('caption claims hold', () => {
  const chess = replayOpening();
  // Step "position": the bishop on g4 attacks the queen on d1.
  assert.ok(chess.attackers('d1', 'b').includes('g4'));
  assert.equal(chess.get('d1').type, 'q');

  chess.move('Bxd1');
  // Step "blunder": White mates in two, but not in one.
  assert.equal(forcedMate(new Chess(chess.fen()), 1), false);
  assert.equal(forcedMate(new Chess(chess.fen()), 2), true);
  // Step "why": f7 is attacked by Bc4 and Ne5 and defended only by the king.
  assert.deepEqual(chess.attackers('f7', 'w').sort(), ['c4', 'e5']);
  assert.deepEqual(chess.attackers('f7', 'b'), ['e8']);

  chess.move('Bxf7+');
  // Step "check": check, and Ke7 is the only legal reply.
  assert.equal(chess.inCheck(), true);
  assert.deepEqual(chess.moves(), ['Ke7']);

  chess.move('Ke7');
  chess.move('Nd5');
  // Step "mate": checkmate, with the stated squares covered.
  assert.equal(chess.isCheckmate(), true);
  assert.deepEqual(chess.attackers('d7', 'w'), ['e5']);
  assert.deepEqual(chess.attackers('f6', 'w'), ['d5']);
  assert.deepEqual(chess.attackers('e6', 'w'), ['f7']);
  assert.deepEqual(chess.attackers('e8', 'w'), ['f7']);
  assert.deepEqual(chess.attackers('f7', 'w'), ['e5']);
  assert.ok(chess.attackers('e7', 'w').includes('d5'), 'the d5 knight gives the check');
  for (const sq of ['d6', 'd8', 'f8']) assert.equal(chess.get(sq).color, 'b', `${sq} holds a Black piece`);
});

test('branch: legal from the first step, positions match, a pawn down and no quick mate', () => {
  const chess = replayOpening();
  const start = DEMO.main[DEMO.branch.from];
  assert.equal(placement(chess), start.fen);
  for (const step of DEMO.branch.steps) {
    const frames = [];
    for (const san of step.play) {
      assert.ok(chess.move(san), `${step.id}: illegal move ${san}`);
      frames.push(placement(chess));
    }
    assert.deepEqual(frames.slice(0, -1), step.frames || [], `${step.id}: intermediate frames differ`);
    assert.equal(placement(chess), step.fen);
    assert.deepEqual(lastMove(chess), step.last);
    checkArrows(chess, step);
  }
  const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let white = 0;
  let black = 0;
  for (const row of chess.board()) {
    for (const sq of row) if (sq) sq.color === 'w' ? (white += value[sq.type]) : (black += value[sq.type]);
  }
  assert.equal(white - black, 1, 'Black is exactly a pawn down');
  // "Not losing in two moves": Black has a reply after which White has no forced mate in two.
  const after = new Chess(chess.fen());
  const blackCanAvoidQuickMate = after.moves().some((reply) => {
    after.move(reply);
    const mated = forcedMate(after, 2);
    after.undo();
    return !mated;
  });
  assert.ok(blackCanAvoidQuickMate);
});

test('move strip matches the main line and branch notation', () => {
  const chess = replayOpening();
  const main = chess.history().slice(-1).concat(['Bxd1', 'Bxf7+', 'Ke7', 'Nd5#']);
  assert.deepEqual(DEMO.strip.map((m) => m.san), main);
  assert.deepEqual(DEMO.branchStrip.map((m) => m.san), DEMO.branch.steps.flatMap((s) => s.play));
  for (const step of [...DEMO.main, ...DEMO.branch.steps]) {
    assert.ok(step.strip === 'b' || DEMO.strip[step.strip], `${step.id}: strip index`);
  }
});

test('"How it works" panel claims hold', () => {
  const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const balance = (chess) => {
    let total = 0;
    for (const row of chess.board()) for (const sq of row) if (sq) total += (sq.color === 'b' ? 1 : -1) * value[sq.type];
    return total;
  };
  const chess = replayOpening();
  chess.move('Bxd1');
  // Evidence panel: "Black is 8 points up", a queen for a pawn.
  assert.equal(balance(chess), 8);
  // Evidence panel: the forced line after the blunder is the strip from move 6.
  assert.deepEqual(
    DEMO.strip.slice(2).map((m) => m.san),
    DEMO.main.slice(3).flatMap((s) => s.play),
  );
  // Panels reuse the verified "why" and "branch" positions.
  assert.ok(DEMO.main.some((s) => s.id === 'why'));
  assert.ok(DEMO.branch.steps.some((s) => s.id === 'branch'));
});
