// The learner's pen on the puzzle board (draw.js): where a point lands, what a
// drag means, how a finished stroke is kept, and the undo history. Pure parts
// only; the page wiring is checked in a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clientToBoard,
  createSketch,
  finishFree,
  ghostFor,
  pieceForGhost,
  intentFor,
  inkFor,
  MODES,
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

test('draw: who draws — only in Draw mode, and then right button and stylus too', () => {
  // Move and Faint: nothing draws, not a stylus, not a right-drag.
  for (const pointerType of ['mouse', 'touch', 'pen']) {
    for (const button of [0, 1, 2, 5]) assert.equal(intentFor({ pointerType, button }, false), null, `${pointerType} ${button}`);
  }
  assert.equal(intentFor({ pointerType: 'mouse', button: 2 }, true), 'mark');
  assert.equal(intentFor({ pointerType: 'mouse', button: 0 }, true), 'tool');
  assert.equal(intentFor({ pointerType: 'mouse', button: 1 }, true), null);
  assert.equal(intentFor({ pointerType: 'touch', button: 0 }, true), 'tool');
  assert.equal(intentFor({ pointerType: 'pen', button: 0 }, true), 'tool');
  assert.equal(intentFor({ pointerType: 'pen', button: 2 }, true), 'mark');
  assert.equal(intentFor({ pointerType: 'pen', button: 5 }, true), null);
});

test('draw: Move hides the drawings, Faint shows them at the chosen level, Draw at full', () => {
  assert.deepEqual(MODES, ['move', 'faint', 'draw']);
  assert.deepEqual(inkFor('move', 50), { hidden: true, opacity: 1 });
  assert.deepEqual(inkFor('faint'), { hidden: false, opacity: 0.5 });
  assert.deepEqual(inkFor('faint', 30), { hidden: false, opacity: 0.3 });
  assert.deepEqual(inkFor('faint', 55), { hidden: false, opacity: 0.5 }, 'an odd level falls back to 50%');
  assert.deepEqual(inkFor('draw', 30), { hidden: false, opacity: 1 });
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

test('draw: a ghost move sketches a piece elsewhere and leaves the real one', () => {
  assert.equal(ghostFor('g1', 'g1', 'wN'), null, 'no move, no ghost');
  assert.equal(ghostFor('g1', 'f3', null), null, 'nothing to pick up');
  assert.equal(ghostFor('g1', 'f3', '"><script>'), null, 'only real piece codes');
  const g = ghostFor('g1', 'f3', 'wN');
  assert.deepEqual(g, { kind: 'ghost', from: 'g1', to: 'f3', piece: 'wN' });
  assert.ok(sameMark({ ...g, color: 'blue' }, { ...g, color: 'blue' }), 'the same ghost again takes it off');
  assert.ok(!sameMark({ ...g, color: 'blue' }, { ...g, to: 'h3', color: 'blue' }));

  const shapes = [{ kind: 'ghost', from: 'g1', to: 'f3', piece: 'wN' }];
  assert.equal(pieceForGhost('f3', shapes, null), 'wN', 'walk a ghost on from where it landed');
  assert.equal(pieceForGhost('e4', shapes, 'bP'), 'bP', 'else the real piece');
  assert.equal(pieceForGhost('e4', shapes, null), null);

  const white = shapeSVG({ ...g, color: 'blue', seed: 2 }, 'white');
  assert.match(white, /class="dr dr--ghost tone--blue"/);
  assert.match(white, /<image class="dr-ghost" href="\/assets\/pieces\/wN.svg" x="50.4" y="50.4"/, 'f3 from White');
  assert.match(shapeSVG({ ...g, color: 'blue', seed: 2 }, 'black'), /x="20.4" y="20.4"/, 'f3 from Black');
  assert.doesNotMatch(shapeSVG({ ...g, piece: 'xx', color: 'blue' }, 'white'), /<image/);
});

test('draw: tape snaps to a rank, file or diagonal and stays on the board', async () => {
  const { tapeFor, stickerFor, GLYPHS, WORDS } = await import('../public/assets/draw.js');
  assert.equal(tapeFor('a1', 'a1'), null);
  assert.deepEqual(tapeFor('a1', 'h2'), { kind: 'tape', from: 'a1', to: 'h1' }, 'mostly sideways: the rank');
  assert.deepEqual(tapeFor('e2', 'f7'), { kind: 'tape', from: 'e2', to: 'e7' }, 'mostly up: the file');
  assert.deepEqual(tapeFor('a1', 'g6'), { kind: 'tape', from: 'a1', to: 'g7' }, 'near a diagonal: the diagonal');
  assert.deepEqual(tapeFor('c1', 'h7'), { kind: 'tape', from: 'c1', to: 'h6' }, 'cut at the board edge');
  assert.ok(sameMark({ kind: 'tape', from: 'a1', to: 'h8', color: 'blue' }, { kind: 'tape', from: 'h8', to: 'a1', color: 'blue' }), 'either way round is the same tape');
  const svg = shapeSVG({ kind: 'tape', from: 'a1', to: 'h8', color: 'blue', seed: 4 }, 'white');
  assert.match(svg, /class="dr dr--tape tone--blue"/);
  assert.match(svg, /<path d="M[^"]+Z"\/>/);

  assert.equal(stickerFor('e4', 'nope'), null);
  assert.equal(stickerFor(null, '!!'), null);
  assert.ok(GLYPHS.includes('□') && WORDS.includes('OUTPOST'));
  const glyph = shapeSVG({ ...stickerFor('e4', '??'), color: 'blue', seed: 1 }, 'white');
  assert.match(glyph, /class="dr-sticker tone--red"/);
  assert.match(glyph, />\?\?<\/text>/);
  const word = shapeSVG({ ...stickerFor('d5', 'OUTPOST'), color: 'blue', seed: 1 }, 'black');
  assert.match(word, /class="dr-word"/);
  assert.match(word, />OUTPOST<\/text>/);
  assert.doesNotMatch(shapeSVG({ kind: 'sticker', sq: 'e4', glyph: '<i>', color: 'blue' }, 'white'), /<i>/);

  const sk = createSketch();
  sk.add({ kind: 'sticker', sq: 'e4', glyph: '!', color: 'blue' });
  sk.put({ kind: 'sticker', sq: 'e4', glyph: '?', color: 'blue' }, (s) => s.kind === 'sticker' && s.sq === 'e4');
  assert.deepEqual(sk.shapes.map((s) => s.glyph), ['?'], 'a new glyph replaces the old one');
  assert.ok(sk.undo());
  assert.deepEqual(sk.shapes.map((s) => s.glyph), ['!'], 'in one undo step');
});

test('draw: inks mean Mine, Theirs and Idea, and Theirs differs by shape too', async () => {
  const { ROLES } = await import('../public/assets/draw.js');
  assert.deepEqual(ROLES, { green: 'Mine', red: 'Theirs', blue: 'Idea' });
  const paths = (color) => (shapeSVG({ kind: 'arrow', from: 'e2', to: 'e5', color, seed: 3 }, 'white').match(/<path /g) || []).length;
  assert.equal(paths('green'), 3, 'shaft and one head');
  assert.equal(paths('blue'), 3);
  assert.equal(paths('red'), 5, 'a threat chevron: a second head');
  assert.equal((shapeSVG({ kind: 'ghost', from: 'g1', to: 'f3', piece: 'wN', color: 'red', seed: 3 }, 'white').match(/<path /g) || []).length, 3, 'ghosts keep one head');
});

// createDrawLayer's wiring is checked in a browser (scripts/check-pens.mjs); this only checks
// that destroy() takes off every listener it put on, with a counting stand-in for the DOM.
test('draw: destroy() removes every listener the layer added and the groups it drew into', async () => {
  const { createDrawLayer } = await import('../public/assets/draw.js');
  const live = new Map();
  const target = (name) => {
    const t = {
      name,
      children: [],
      dataset: {},
      style: {},
      attrs: {},
      classList: { toggle() {}, add() {}, remove() {} },
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
      getAttribute(k) {
        return this.attrs[k] ?? null;
      },
      removeAttribute(k) {
        delete this.attrs[k];
      },
      addEventListener(type, fn, o) {
        const key = `${name}:${type}:${!!(o && o.capture)}`;
        live.set(key, [...(live.get(key) || []), fn]);
      },
      removeEventListener(type, fn, o) {
        const key = `${name}:${type}:${!!(o && o.capture)}`;
        const left = (live.get(key) || []).filter((f) => f !== fn);
        if (left.length) live.set(key, left);
        else live.delete(key);
      },
      append(...nodes) {
        for (const n of nodes) {
          n.parentNode = this;
          this.children.push(n);
        }
      },
      insertAdjacentHTML() {
        const defs = target(`${name}-defs`);
        defs.parentNode = this;
        this.children.unshift(defs);
      },
      get firstElementChild() {
        return this.children[0] || null;
      },
      remove() {
        if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((c) => c !== this);
        this.parentNode = null;
      },
      innerHTML: '',
      textContent: '',
    };
    return t;
  };
  const saved = { document: globalThis.document, window: globalThis.window };
  const doc = target('document');
  doc.createElementNS = () => target('g');
  const media = target('media');
  media.matches = true;
  const win = target('window');
  win.matchMedia = () => media;
  globalThis.document = doc;
  globalThis.window = win;
  try {
    const board = target('board');
    const svg = target('svg');
    const btn = (n, data = {}) => Object.assign(target(n), { dataset: data });
    const layer = createDrawLayer({
      board,
      svg,
      modes: ['move', 'faint', 'draw'].map((m) => btn(`mode-${m}`, { mode: m })),
      fade: Object.assign(btn('fade'), { value: '50' }),
      undo: btn('undo'),
      clear: btn('clear'),
      hint: btn('hint'),
      tools: [btn('tool', { tool: 'pen' })],
      colors: [btn('color', { color: 'green' })],
      sizes: [btn('size', { size: 'thin' })],
    });
    for (const key of ['board:pointerdown:true', 'document:contextmenu:false', 'window:blur:false', 'media:change:false', 'mode-draw:click:false']) assert.ok(live.has(key), `${key} is listened to`);
    assert.equal(svg.children.length, 4, 'the grain, the drawings, the live stroke and the helpers');
    layer.destroy();
    assert.deepEqual([...live.keys()], [], 'no listener is left behind');
    assert.equal(svg.children.length, 0, 'the layer takes its groups out of the SVG');
    layer.destroy(); // a second call is harmless
  } finally {
    globalThis.document = saved.document;
    globalThis.window = saved.window;
  }
});
