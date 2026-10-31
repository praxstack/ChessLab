// The "Analyse on AskTheMove" extension and bookmark: reading a Chess.com
// puzzle board into a FEN. reader.js is a plain script (the extension loads it
// as a content script), so it runs here in a sandbox.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const src = await readFile(new URL('../extension/reader.js', import.meta.url), 'utf8');
const box = {};
vm.runInNewContext(src, { globalThis: box });
const R = box.AskTheMoveReader;

// Prax's 1 Nov 2026 puzzle from the Chess.com app, Black to move.
const CLASSES = [
  'piece wk square-71', 'piece wp square-72', 'piece wn square-22', 'piece wp square-12', 'piece wp square-83',
  'piece bp square-33', 'piece bp square-75', 'piece bp square-35', 'piece bp square-56', 'piece wr square-26',
  'piece bk square-87', 'piece bp square-77', 'piece bp square-17',
  'hover-square square-44', 'highlight square-55',
];

test('reads piece classes into squares, ignoring highlights', () => {
  const p = R.piecesFromClasses(CLASSES);
  assert.equal(p.g1, 'K');
  assert.equal(p.h7, 'k');
  assert.equal(p.b6, 'R');
  assert.equal(p.d4, undefined);
  assert.equal(Object.keys(p).length, 13);
});

test('builds the FEN with the side to move', () => {
  const got = R.toFen(R.piecesFromClasses(CLASSES), R.sideToMove('Black to Move  Your turn.', true));
  assert.equal(got.fen, '8/p5pk/1R2p3/2p3p1/8/2p4P/PN4P1/6K1 b - - 0 1');
});

test('side to move: page words first, then the side the board faces', () => {
  assert.equal(R.sideToMove('White to move', true), 'w');
  assert.equal(R.sideToMove('black TO move', false), 'b');
  assert.equal(R.sideToMove('Puzzle', true), 'b');
  assert.equal(R.sideToMove('', false), 'w');
});

test('refuses a board without one king a side', () => {
  assert.match(R.toFen({ e1: 'K' }, 'w').error, /Couldn’t read the board/);
  assert.match(R.toFen({}, 'w').error, /Couldn’t read the board/);
});

test('opens our board with the position and where it came from', () => {
  assert.equal(R.boardUrl('8/8/8/8/8/8/8/K6k w - - 0 1'), 'https://askthemove.online/puzzleanalyzr/#fen=8%2F8%2F8%2F8%2F8%2F8%2F8%2FK6k%20w%20-%20-%200%201&from=chesscom');
});

test('only the unrated Daily Puzzle page: never rated puzzles, Rush, Battle or games', async () => {
  const m = JSON.parse(await readFile(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
  const matches = m.content_scripts.flatMap((c) => c.matches);
  assert.deepEqual(matches, ['https://www.chess.com/daily-chess-puzzle*']);
  assert.ok(R.allowed('/daily-chess-puzzle'));
  assert.ok(R.allowed('/daily-chess-puzzle/2026-11-01'));
  for (const p of ['/puzzles/rated', '/puzzles/rush', '/puzzles/battle', '/puzzles', '/game/live/1', '/game/daily/1', '/play/online', '/analysis', '/daily-chess-puzzles-hack']) {
    assert.equal(R.allowed(p), false, p);
  }
  const page = (pathname) => ({ location: { pathname }, querySelector: () => ({ querySelectorAll: () => [], getAttribute: () => '' }) });
  assert.match(R.readPage(page('/puzzles/rated')).error, /only works on Chess.com’s Daily Puzzle/);
  assert.equal(m.permissions, undefined);
  assert.equal(m.host_permissions, undefined);
});

test('the bookmark is built from the same reader and is up to date', () => {
  execFileSync(process.execPath, [new URL('../extension/make-bookmarklet.mjs', import.meta.url).pathname, '--check']);
});
