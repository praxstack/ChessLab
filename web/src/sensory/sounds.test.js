import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {readFileSync} from 'node:fs';
import {soundForMove, soundsForMoves, movesSince, SOUND_NAMES} from './sounds.js';
import {createChess} from '../../../shared/chess.js';

const after = (moves, fen) => { const chess = new Chess(fen); for (const m of moves) chess.move(m); return chess; };
const last = (moves, fen) => after(moves, fen).history({verbose: true}).at(-1);

test('every sound the board asks for is one the puzzle page synth makes', () => {
  const synth = readFileSync(new URL('../../../site/public/assets/sound.js', import.meta.url), 'utf8');
  for (const name of SOUND_NAMES) assert.match(synth, new RegExp(`\\n  ${name}\\(t\\)`), `sound.js has ${name}`);
});

test('a plain move, a capture, castling, check, promotion and mate each get their own sound', () => {
  assert.equal(soundForMove(last(['e4'])), 'move');
  assert.equal(soundForMove(last(['e4', 'd5', 'exd5'])), 'capture');
  assert.equal(soundForMove(last(['O-O'], 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')), 'castle');
  assert.equal(soundForMove(last(['O-O-O'], 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')), 'castle');
  assert.equal(soundForMove(last(['e4', 'f5', 'Qh5+'])), 'check');
  assert.equal(soundForMove(last(['a8=Q'], '4k3/P7/8/8/8/8/8/4K3 w - - 0 1')), 'promote');
  assert.equal(soundForMove(last(['bxa8=N'], 'r3k3/1P6/8/8/8/8/8/4K3 w - - 0 1')), 'promote', 'a capturing promotion still promotes');
  assert.equal(soundForMove(last(['f3', 'e5', 'g4', 'Qh4#'])), 'end');
  assert.equal(soundForMove(last(['e4']), {over: true}), 'end', 'stalemate or a draw ends the game too');
  assert.equal(soundForMove(null), null);
});

test('stepping through a review only makes the quiet move and capture sounds', () => {
  assert.equal(soundForMove(last(['e4', 'd5', 'exd5']), {quiet: true}), 'capture');
  assert.equal(soundForMove(last(['e4', 'f5', 'Qh5+']), {quiet: true}), 'move');
  assert.equal(soundForMove(last(['f3', 'e5', 'g4', 'Qh4#']), {quiet: true, over: true}), 'move');
  assert.equal(soundForMove(last(['O-O'], 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'), {quiet: true}), 'move');
});

test('the moves since the last position: one move, a move with its reply, or nothing', () => {
  const start = new Chess().fen();
  assert.deepEqual(movesSince(start, after(['e4'])).map(m => m.san), ['e4']);
  assert.deepEqual(movesSince(start, after(['e4', 'e5'])).map(m => m.san), ['e4', 'e5'], 'a puzzle answer and its reply land together');
  assert.deepEqual(movesSince(start, after(['e4', 'e5', 'Nf3'])), [], 'a jump of three moves is silent');
  assert.deepEqual(movesSince(after(['e4']).fen(), new Chess()), [], 'a step back is silent');
  assert.deepEqual(movesSince(start, new Chess()), [], 'the same position is silent');
  assert.deepEqual(movesSince(null, after(['e4'])), [], 'the first position shown is silent');
});

test('a board made straight from a FEN still finds the one move that was played', () => {
  const before = after(['e4', 'd5']).fen();
  const board = new Chess(after(['e4', 'd5', 'exd5']).fen());
  const moves = movesSince(before, board);
  assert.equal(moves.length, 1);
  assert.equal(soundForMove(moves[0]), 'capture');
  const chess960 = createChess('bqnbrkrn/pppppppp/8/8/8/8/PPPPPPPP/BQNBRKRN w GEge - 0 1', 'chess960');
  const prev = chess960.fen();
  chess960.move({from: 'e2', to: 'e4'});
  assert.equal(movesSince(prev, chess960).length, 1, 'chess960 boards work too');
});

test('a move and its reply: only the last can be the end of the game', () => {
  const moves = after(['f3', 'e5', 'g4', 'Qh4#']).history({verbose: true}).slice(-2);
  assert.deepEqual(soundsForMoves(moves, {over: true}), ['move', 'end']);
  assert.deepEqual(soundsForMoves(moves, {quiet: true, over: true}), ['move', 'move']);
});
