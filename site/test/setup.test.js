// Set up a position by tapping: the FEN it makes and the problems it catches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromPlacement, setupFen, setupProblem, startPieces } from '../public/assets/setup.js';

const APP_PUZZLE = 'k7/8/2K3p1/2N3P1/2R5/5B2/q2p3p/8 w - - 0 1'; // the Chess.com app's puzzle of 3 Nov 2026

test('a position read square by square gives back its FEN', () => {
  assert.equal(setupFen(fromPlacement(APP_PUZZLE), 'w'), APP_PUZZLE);
  assert.equal(setupProblem(fromPlacement(APP_PUZZLE), 'w'), '');
  assert.equal(setupFen(startPieces(), 'w'), 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const noRooks = startPieces();
  delete noRooks.h1;
  delete noRooks.a8;
  assert.match(setupFen(noRooks, 'b'), / b Qk - 0 1$/, 'castling only where king and rook are still home');
});

test('impossible positions are named in plain words', () => {
  assert.equal(setupProblem({}, 'w'), 'Each side needs exactly one king.');
  assert.equal(setupProblem({ e1: 'wK' }, 'w'), 'Each side needs exactly one king.');
  assert.match(setupProblem({ e1: 'wK', e8: 'bK', a8: 'wP' }, 'w'), /Pawns can’t stand/);
  // White's rook checks the black king, but it's White to move: Black would have been left in check.
  assert.match(setupProblem({ e1: 'wK', e8: 'bK', e4: 'wR' }, 'w'), /Black is in check but it’s White’s move/);
  assert.equal(setupProblem({ e1: 'wK', e8: 'bK', e4: 'wR' }, 'b'), '');
});
