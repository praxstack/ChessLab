import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagramSVG, drawingsSVG, marginNotes, marginHTML, notesText, toPlay } from '../public/assets/bookpage.js';

const START = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

test('toPlay reads the side to move', () => {
  assert.equal(toPlay(START), 'Black to play');
  assert.equal(toPlay('8/8/8/8/8/8/8/K6k w - - 0 1'), 'White to play');
  assert.equal(toPlay(''), 'White to play');
});

test('diagram has 32 hatched squares, every piece, and coordinates for its side', () => {
  const svg = diagramSVG(START, 'white');
  assert.equal((svg.match(/<image /g) || []).length, 32);
  assert.equal((svg.match(/<rect x="\d+" y="\d+" width="10"/g) || []).length, 32);
  assert.match(svg, /href="\/assets\/pieces\/wK\.svg" x="40\.4" y="70\.4"/);
  const black = diagramSVG(START, 'black');
  assert.match(black, /href="\/assets\/pieces\/wK\.svg" x="30\.4" y="0\.4"/);
  assert.match(svg, /class="book__coord" x="-2\.4" y="6\.4">8</);
  assert.match(black, /class="book__coord" x="-2\.4" y="6\.4">1</);
});

test('drawings go into a board-sized svg, the line over the rest', () => {
  const shapes = [
    { kind: 'step', from: 'e7', to: 'e5', san: 'e5', n: 1, color: 'green', seed: 1 },
    { kind: 'circle', sq: 'd4', color: 'blue', seed: 2 },
  ];
  const svg = drawingsSVG(shapes, 'white');
  assert.match(svg, /viewBox="0 0 80 80"/);
  assert.ok(svg.indexOf('dr--circle') < svg.indexOf('dr--step'));
  assert.match(svg, /class="dr-num__n"[^>]*>1</);
});

test('margin notes come from the drawings only', () => {
  const shapes = [
    { kind: 'sticker', sq: 'e4', glyph: '!!' },
    { kind: 'sticker', sq: 'd5', glyph: 'OUTPOST' },
    { kind: 'sticker', sq: 'g1', glyph: '?' },
    { kind: 'tape', from: 'a1', to: 'h8' },
    { kind: 'ghost', from: 'g8', to: 'f6', piece: 'bN' },
    { kind: 'circle', sq: 'f7' },
    { kind: 'arrow', from: 'd8', to: 'h4', color: 'red' },
    { kind: 'arrow', from: 'd2', to: 'd4', color: 'green' },
    { kind: 'arrow', from: 'f1', to: 'c4', color: 'green' },
    { kind: 'free', pts: [[1, 1], [2, 2]], color: 'blue' },
  ];
  const n = marginNotes({ fen: START, shapes, line: '1… e5 2. Nf3' });
  assert.equal(n.caption, 'Black to play');
  assert.deepEqual(n.glyphs, ['e4 !!', 'Ng1 ?']);
  assert.deepEqual(n.words, ['d5 OUTPOST']);
  assert.deepEqual(n.tapes, ['a1–h8']);
  assert.deepEqual(n.ghosts, ['N to f6']);
  assert.deepEqual(n.rings, ['f7']);
  assert.deepEqual(n.arrows, [
    { role: 'Mine', moves: ['d2–d4', 'f1–c4'] },
    { role: 'Theirs', moves: ['d8–h4'] },
  ]);
  const text = notesText(n, '  Missed the fork.  ');
  assert.equal(text.split('\n')[0], 'Black to play');
  assert.match(text, /My line: 1… e5 2\. Nf3/);
  assert.match(text, /\n\nMissed the fork\.$/);
});

test('margin html escapes text and says so when there is nothing yet', () => {
  assert.match(marginHTML(marginNotes({ fen: START })), /No marks yet/);
  const html = marginHTML({ ...marginNotes({ fen: START }), line: '<b>x</b>' });
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
});
