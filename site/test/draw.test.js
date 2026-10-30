// The learner's pen on the puzzle board (draw.js): where a point lands, what a
// drag means, how a finished stroke is kept, and the undo history. Pure parts
// only; the page wiring is checked in a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clientToBoard,
  createSketch,
  finishFree,
  intentFor,
  jiggle,
  markFor,
  markWidth,
  nibWidth,
  NIBS,
  SIZES,
  TOOLS,
  matrixAngle,
  orient,
  outlinePath,
  pressureWidth,
  sameMark,
  shapePaths,
  shapeSVG,
  simplify,
  squareAtPoint,
  squareCentre,
} from '../public/assets/draw.js';

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('draw: squares and points agree from both sides of the board', () => {
  assert.equal(squareAtPoint([5, 75], 'white'), 'a1');
  assert.equal(squareAtPoint([75, 5], 'white'), 'h8');
  assert.equal(squareAtPoint([5, 75], 'black'), 'h8');
  assert.equal(squareAtPoint([45, 45], 'black'), 'd5');
  assert.equal(squareAtPoint([-1, 40], 'white'), null);
  assert.equal(squareAtPoint([40, 80], 'white'), null);
  for (const o of ['white', 'black']) {
    for (const sq of ['a1', 'e4', 'h8', 'c7']) assert.equal(squareAtPoint(squareCentre(sq, o), o), sq);
  }
  assert.deepEqual(squareCentre('e4', 'white'), [45, 45]);
  assert.deepEqual(squareCentre('e4', 'black'), [35, 35]);
});

test('draw: a stored point flips with the board and flips back', () => {
  assert.deepEqual(orient([12, 70], 'white'), [12, 70]);
  assert.deepEqual(orient([12, 70], 'black'), [68, 10]);
  assert.deepEqual(orient(orient([12.5, 3], 'black'), 'black'), [12.5, 3]);
});

test('draw: a screen point lands on the board even when the frame is turned', () => {
  const box = { cx: 300, cy: 300, size: 400, angle: 0 };
  assert.deepEqual(clientToBoard(100, 100, box), [0, 0]);
  assert.deepEqual(clientToBoard(500, 500, box), [80, 80]);
  assert.deepEqual(clientToBoard(300, 300, box), [40, 40]);
  // Turned a quarter: the board's top-left corner is now at the screen's top right.
  const [x, y] = clientToBoard(500, 100, { ...box, angle: Math.PI / 2 });
  close(x, 0);
  close(y, 0);
  close(matrixAngle('matrix(0.999903, -0.0139622, 0.0139622, 0.999903, 0, 0)'), -0.8 * (Math.PI / 180), 1e-4);
  assert.equal(matrixAngle('none'), 0);
});

test('draw: a drag between squares is an arrow, on one square a circle', () => {
  assert.deepEqual(markFor('e2', 'e4'), { kind: 'arrow', from: 'e2', to: 'e4' });
  assert.deepEqual(markFor('e4', 'e4'), { kind: 'circle', sq: 'e4' });
  assert.equal(markFor('e4', null), null);
  assert.ok(sameMark({ kind: 'arrow', from: 'a1', to: 'a8', color: 'red' }, { kind: 'arrow', from: 'a1', to: 'a8', color: 'red' }));
  assert.ok(!sameMark({ kind: 'arrow', from: 'a1', to: 'a8', color: 'red' }, { kind: 'arrow', from: 'a1', to: 'a8', color: 'blue' }));
  assert.ok(!sameMark({ kind: 'circle', sq: 'a1', color: 'red' }, { kind: 'circle', sq: 'a2', color: 'red' }));
});

test('draw: who draws — right button and stylus always, finger and left button only in Draw mode', () => {
  assert.equal(intentFor({ pointerType: 'mouse', button: 2 }, false), 'mark');
  assert.equal(intentFor({ pointerType: 'mouse', button: 0 }, false), null);
  assert.equal(intentFor({ pointerType: 'mouse', button: 0 }, true), 'tool');
  assert.equal(intentFor({ pointerType: 'mouse', button: 1 }, true), null);
  assert.equal(intentFor({ pointerType: 'touch', button: 0 }, false), null);
  assert.equal(intentFor({ pointerType: 'touch', button: 0 }, true), 'tool');
  assert.equal(intentFor({ pointerType: 'pen', button: 0 }, false), 'tool');
  assert.equal(intentFor({ pointerType: 'pen', button: 2 }, false), 'mark');
  assert.equal(intentFor({ pointerType: 'pen', button: 5 }, true), null);
});

test('draw: an arrow is never ruler-straight, and the same seed draws it the same', () => {
  const a = shapePaths({ kind: 'arrow', from: 'e2', to: 'e4', seed: 7 }, 'white');
  const b = shapePaths({ kind: 'arrow', from: 'e2', to: 'e4', seed: 7 }, 'white');
  const c = shapePaths({ kind: 'arrow', from: 'e2', to: 'e4', seed: 8 }, 'white');
  assert.equal(a.length, 3, 'a shaft and two barbs');
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  // The shaft from e2 to e4 runs down the e-file at x = 45, but bows off it.
  const xs = [...a[0].matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  assert.ok(xs.some((x) => Math.abs(x - 45) > 0.05), 'the shaft wanders a little');
  assert.ok(xs.every((x) => Math.abs(x - 45) < 2), 'but stays on the file');
  // A knight's move gets an L.
  assert.equal(shapePaths({ kind: 'arrow', from: 'g1', to: 'f3', seed: 1 }, 'white').length, 3);
});

test('draw: circles and arrows follow the board when it flips', () => {
  const white = shapePaths({ kind: 'circle', sq: 'a1', seed: 3 }, 'white')[0];
  const black = shapePaths({ kind: 'circle', sq: 'a1', seed: 3 }, 'black')[0];
  const start = (d) => d.match(/^M(-?[\d.]+) (-?[\d.]+)/).slice(1).map(Number);
  const [wx, wy] = start(white);
  const [bx, by] = start(black);
  assert.ok(wx < 10 && wy > 70, 'bottom left from White');
  assert.ok(bx > 70 && by < 10, 'top right from Black');
});

test('draw: a finished stroke keeps fewer points, keeps its ends, and is stored from White’s side', () => {
  const raw = Array.from({ length: 50 }, (_, i) => [10 + i * 0.5, 20]);
  const kept = simplify(raw, 0.3);
  assert.deepEqual(kept, [raw[0], raw[49]]);
  const zig = [[0, 0], [5, 5], [10, 0], [15, 5]];
  assert.equal(simplify(zig, 0.3).length, 4);

  const j = jiggle([[0, 0], [5, 5], [10, 10]], { seed: 4 });
  assert.deepEqual(j[0], [0, 0]);
  assert.deepEqual(j[2], [10, 10]);
  assert.notDeepEqual(j[1], [5, 5]);
  assert.ok(Math.hypot(j[1][0] - 5, j[1][1] - 5) < 0.3);

  const fin = finishFree([[10, 70], [12, 60], [20, 50], [30, 48]], { orientation: 'black', seed: 2 });
  assert.deepEqual(fin.pts[0], [70, 10], 'flipped into White’s view');
  assert.deepEqual(fin.pts.at(-1), [50, 32]);
  assert.equal(fin.widths, undefined);
  const pen = finishFree([[10, 10], [20, 20]], { widths: [0.8, 1.6] });
  assert.deepEqual(pen.widths, [0.8, 1.6]);
});

test('draw: a stylus line grows with pressure and is drawn as a filled shape', () => {
  assert.ok(pressureWidth(0.9) > pressureWidth(0.5));
  assert.ok(pressureWidth(0.5) > pressureWidth(0.1));
  assert.equal(pressureWidth(0), pressureWidth(0.5), 'no pressure reported: a middling line');
  assert.equal(pressureWidth(Number.NaN), pressureWidth(0.5));
  const d = outlinePath([[0, 0], [10, 0], [20, 5]], [1, 2, 1]);
  assert.match(d, /^M/);
  assert.match(d, / A/);
  assert.match(d, /Z$/);
  assert.match(outlinePath([[5, 5]], [2]), /^M4 5 a1 1 0 1 0 2 0/);
  const svg = shapeSVG({ kind: 'free', color: 'green', pts: [[1, 1], [9, 9]], widths: [1, 1.5] }, 'white');
  assert.match(svg, /class="dr dr--free tone--green dr--fill"/);
  const plain = shapeSVG({ kind: 'free', color: 'red', pts: [[1, 1], [9, 9]], width: 1.15 }, 'white');
  assert.match(plain, /stroke-width="1.15"/);
  assert.doesNotMatch(plain, /dr--fill/);
  assert.match(shapeSVG({ kind: 'arrow', from: 'a1', to: 'a2', color: 'purple', seed: 1 }, 'white'), /tone--blue/, 'unknown ink falls back to blue');
  assert.doesNotMatch(svg, /style=/, 'no inline styles under the page’s CSP');
});

test('draw: undo steps back through adds, removals and a clear; a new position forgets it all', () => {
  const s = createSketch();
  assert.equal(s.canUndo, false);
  const arrowE4 = { kind: 'arrow', from: 'e2', to: 'e4', color: 'blue', seed: 1 };
  s.add(arrowE4);
  s.add({ kind: 'circle', sq: 'f7', color: 'red', seed: 2 });
  assert.equal(s.shapes.length, 2);
  // Drawing the same arrow again takes it off, Lichess-style.
  assert.equal(s.toggle({ ...arrowE4, seed: 9 }), false);
  assert.equal(s.shapes.length, 1);
  assert.equal(s.toggle({ ...arrowE4, color: 'green' }), true, 'another ink is another arrow');
  assert.equal(s.shapes.length, 2);
  assert.equal(s.clear(), true);
  assert.equal(s.shapes.length, 0);
  assert.equal(s.clear(), false, 'nothing to clear is not an undo step');
  s.undo();
  assert.equal(s.shapes.length, 2, 'undo brings a clear back');
  s.undo();
  s.undo();
  assert.deepEqual(
    s.shapes.map((x) => x.kind),
    ['arrow', 'circle'],
  );
  assert.notEqual(s.nextSeed('a'), s.nextSeed('b'));
  s.reset();
  assert.equal(s.shapes.length, 0);
  assert.equal(s.canUndo, false);
  assert.equal(s.undo(), false);
});

test('draw: nibs and sizes set the line', () => {
  assert.deepEqual(NIBS, ['pen', 'pencil', 'marker']);
  for (const n of NIBS) assert.ok(TOOLS.includes(n), `${n} is a tool`);
  assert.equal(nibWidth(), 1.15, 'medium pen is the old default');
  assert.ok(nibWidth('pen', 'thin') < nibWidth('pen', 'medium'));
  assert.ok(nibWidth('pen', 'medium') < nibWidth('pen', 'thick'));
  assert.ok(nibWidth('marker') > 2 * nibWidth('pen'), 'a marker is wide');
  assert.equal(nibWidth('nope', 'huge'), nibWidth('pen', 'medium'), 'unknown values fall back');
  assert.equal(markWidth(), 1.3);
  assert.ok(markWidth('thick') > markWidth('thin'));
  assert.equal(Object.keys(SIZES).length, 3);

  const pencil = shapeSVG({ kind: 'free', nib: 'pencil', color: 'blue', pts: [[1, 1], [9, 9]], width: 0.95 }, 'white');
  assert.match(pencil, /class="dr dr--free dr--pencil tone--blue"/);
  const marker = shapeSVG({ kind: 'free', nib: 'marker', color: 'red', pts: [[1, 1], [9, 9]], width: 3.4 }, 'white');
  assert.match(marker, /dr--marker/);
  assert.match(marker, /stroke-width="3.4"/);
  const pen = shapeSVG({ kind: 'free', nib: 'pen', color: 'red', pts: [[1, 1], [9, 9]], width: 1.15 }, 'white');
  assert.doesNotMatch(pen, /dr--pen/, 'plain pen needs no extra class');
  assert.doesNotMatch(shapeSVG({ kind: 'free', nib: '<x>', color: 'red', pts: [[1, 1], [9, 9]], width: 1 }, 'white'), /<x>/, 'unknown nib is ignored');

  assert.match(shapeSVG({ kind: 'arrow', from: 'a1', to: 'a4', color: 'blue', seed: 1, width: 2.34 }, 'white'), /stroke-width="2.34"/);
  assert.match(shapeSVG({ kind: 'circle', sq: 'e4', color: 'blue', seed: 1 }, 'white'), /stroke-width="1.3"/, 'older marks keep the medium line');
});
