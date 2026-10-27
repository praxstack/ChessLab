// The puzzle page's playable board: the reasons it gives for a move that
// isn't allowed, how it grades a move once Stockfish has looked, and the
// files it serves (chess.js as published, Stockfish with its licence).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from '../public/assets/vendor/chess.js';
import { whyNot, positionNote } from '../public/assets/rules.js';
import { WASM_BYTES, grade, parseInfo, toCp } from '../public/assets/engine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const why = (fen, from, to) => whyNot(new Chess(fen), from, to);
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

test('rules: a legal move has nothing to explain', () => {
  assert.equal(why(START, 'e2', 'e4'), null);
  assert.equal(why(START, 'g1', 'f3'), null);
  assert.equal(why('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1', 'g1'), null);
  assert.equal(why('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3', 'e5', 'd6'), null, 'en passant');
});

test('rules: a pinned piece is named, with the line from the pinning piece to the king', () => {
  const w = why('4r1k1/8/8/8/8/8/4N3/4K3 w - - 0 1', 'e2', 'c3');
  assert.equal(w.kind, 'pin');
  assert.match(w.text, /knight is pinned/);
  assert.match(w.text, /rook on e8/);
  assert.deepEqual(w.line, ['e8', 'e1']);
  assert.deepEqual(w.squares, ['e2']);
});

test('rules: in check, a move that ignores it says where the check comes from', () => {
  const w = why('4r1k1/8/8/8/8/8/3N4/4K3 w - - 0 1', 'd2', 'b3');
  assert.equal(w.kind, 'check');
  assert.match(w.text, /in check from the rook on e8/);
  assert.deepEqual(w.line, ['e8', 'e1']);
});

test('rules: the king may not step onto a guarded square', () => {
  const w = why('4r1k1/8/8/8/8/8/8/3K4 w - - 0 1', 'd1', 'e1');
  assert.equal(w.kind, 'king');
  assert.match(w.text, /guards it/);
  assert.deepEqual(w.line, ['e8', 'e1']);
});

test('rules: castling through an attack, or with a piece in the way, or after the rook moved', () => {
  assert.equal(why('r3k2r/8/8/8/8/8/5r2/R3K2R w KQkq - 0 1', 'e1', 'g1').line[0], 'f2');
  assert.equal(why('r3k2r/8/8/8/8/8/8/RN2K2R w KQkq - 0 1', 'e1', 'c1').kind, 'blocked');
  assert.match(why('r3k2r/8/8/8/8/8/8/R3K2R w Qkq - 0 1', 'e1', 'g1').text, /already moved/);
  assert.match(why('r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1', 'e1', 'g1').text, /in check/);
});

test('rules: shapes, blockers and pawns get plain reasons', () => {
  assert.equal(why(START, 'g1', 'g3').kind, 'shape');
  assert.match(why(START, 'f1', 'c4').text, /can’t jump over your pawn on e2/);
  assert.match(why(START, 'e2', 'd3').text, /diagonally when they take/);
  assert.match(why(START, 'e2', 'e5').kind, /shape/);
  assert.match(why('8/8/8/8/8/4p3/4P3/4K2k w - - 0 1', 'e2', 'e3').text, /can’t take straight ahead/);
  assert.match(why('8/8/8/8/4P3/8/8/4K2k w - - 0 1', 'e4', 'e6').text, /very first move/);
  assert.equal(why(START, 'e7', 'e5').kind, 'turn');
  assert.equal(why(START, 'a1', 'a2').kind, 'own');
});

test('rules: the note after a move says check, mate or draw', () => {
  assert.match(positionNote(new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3')).text, /Checkmate\. Black wins/);
  assert.match(positionNote(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).text, /Stalemate/);
  assert.match(positionNote(new Chess('4k2R/8/8/8/8/8/8/4K3 b - - 1 1')).text, /Check! Black/);
  assert.equal(positionNote(new Chess(START)), null);
});

test('engine: scores, info lines and grades', () => {
  assert.equal(toCp({ cp: 35 }), 35);
  assert.ok(toCp({ mate: 2 }) > toCp({ mate: 5 }));
  assert.ok(toCp({ mate: -1 }) < -50000);
  assert.ok(toCp({ mate: 0 }) < -50000, 'mate 0: the side to move is already mated');
  assert.deepEqual(parseInfo('info depth 12 seldepth 18 multipv 1 score cp -41 nodes 1 nps 1 pv e7e5 g1f3'), { depth: 12, score: { cp: -41 }, pv: ['e7e5', 'g1f3'] });
  assert.deepEqual(parseInfo('info depth 9 score mate 3 pv d1h5').score, { mate: 3 });
  assert.equal(parseInfo('info depth 9 score cp 20 lowerbound pv d1h5'), null);
  assert.equal(parseInfo('info string NNUE evaluation enabled'), null);
  assert.equal(grade({ playedBest: true }), 'best');
  assert.equal(grade({ bestCp: 120, afterCp: -110 }), 'best'); // lost 10
  assert.equal(grade({ bestCp: 120, afterCp: -60 }), 'good'); // lost 60
  assert.equal(grade({ bestCp: 120, afterCp: 30 }), 'ok'); // lost 150
  assert.equal(grade({ bestCp: 300, afterCp: 100 }), 'miss'); // lost 400
  assert.equal(grade({ bestCp: toCp({ mate: 2 }), afterCp: toCp({ mate: 0 }) }), 'best', 'a mate in one beats the slower mate');
  assert.equal(grade({ bestCp: toCp({ mate: 2 }), afterCp: -toCp({ mate: 3 }) }), 'best', 'still mating, one move slower');
  assert.equal(grade({ bestCp: toCp({ mate: 2 }), afterCp: 0 }), 'miss', 'let a forced mate go');
});

test('files: chess.js is the published 1.4.0 build, and Stockfish ships with its licence', () => {
  const vendored = readFileSync(join(root, 'public/assets/vendor/chess.js'), 'utf8');
  const published = readFileSync(join(root, 'node_modules/chess.js/dist/esm/chess.js'), 'utf8').replace(/\n\/\/# sourceMappingURL=.*\n?$/, '\n');
  assert.equal(vendored, published);
  assert.ok(existsSync(join(root, 'public/assets/vendor/chess.js.LICENSE.txt')));
  const wasm = join(root, 'public/assets/engine/stockfish-19-lite-single.wasm');
  assert.equal(statSync(wasm).size, WASM_BYTES, 'WASM_BYTES in engine.js matches the file, so the progress bar is right');
  assert.ok(existsSync(join(root, 'public/assets/engine/stockfish-19-lite-single.js')));
  assert.match(readFileSync(join(root, 'public/assets/engine/COPYING.txt'), 'utf8'), /GNU GENERAL PUBLIC LICENSE/);
  assert.match(readFileSync(join(root, 'public/puzzleanalyzr/index.html'), 'utf8'), /href="\/assets\/engine\/COPYING\.txt"/);
});
