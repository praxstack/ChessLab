// The learner's own pen on the desk board: freehand lines, arrows from square
// to square, and circled squares, in blue, red or green ink. Freehand lines
// come in three nibs (pen, pencil, marker) and every drawing in three sizes.
// A ghost move sketches a piece on another square (a see-through copy and a
// dashed arrow) while the real position stays as it is. A numbered line is
// the learner's guess at the moves: legal arrows numbered 1, 2, 3, one ink
// for the side that starts and another for the replies. Lichess-style:
// a right-drag draws an arrow and a right-click circles a square at any time;
// Draw mode lets a finger or the left button draw; a stylus always draws.
//
// Drawings belong to the position on the board, not the pixels: arrows and
// circles are kept as squares, freehand lines as points in board units (one
// square is 10, the board is 80 by 80) as seen from White's side. So a flipped
// board draws them flipped, and a resized one draws them the same.
//
// The top half is pure geometry and bookkeeping (tested with node --test);
// createDrawLayer below it is the only part that touches the page.
import { arrowPoints } from './board.js';
import { arrow, loop, rng, seedFrom, smoothPath } from './ink.js';
import { lineText, nextStep } from './line.js';

const FILES = 'abcdefgh';
export const SIZE = 80;
export const COLORS = ['blue', 'red', 'green'];
export const TOOLS = ['pen', 'pencil', 'marker', 'arrow', 'circle', 'ghost', 'line'];
const PIECE = /^[wb][KQRBNP]$/;
const PIECES = '/assets/pieces/';
/** Freehand nibs: smooth ink, grainy pencil, a wide see-through marker. */
export const NIBS = ['pen', 'pencil', 'marker'];
/** Line sizes, as a multiple of the medium line. */
export const SIZES = { thin: 0.6, medium: 1, thick: 1.8 };
const NIB_WIDTH = { pen: 1.15, pencil: 0.95, marker: 3.4 };

/** How wide a freehand line starts for this nib and size, in board units. */
export function nibWidth(nib = 'pen', size = 'medium') {
  return r2((NIB_WIDTH[nib] ?? NIB_WIDTH.pen) * (SIZES[size] ?? 1));
}

/** Arrow and circle line width for this size. */
export function markWidth(size = 'medium') {
  return r2(1.3 * (SIZES[size] ?? 1));
}

const r2 = (n) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------- Geometry */

/** A point as seen from White's side <-> as shown on a board with this orientation. Its own inverse. */
export function orient(pt, o) {
  return o === 'black' ? [SIZE - pt[0], SIZE - pt[1]] : [pt[0], pt[1]];
}

/** The square under a point shown on the board (board units), or null off the board. */
export function squareAtPoint(pt, o) {
  const x = Math.floor(pt[0] / 10);
  const y = Math.floor(pt[1] / 10);
  if (!(x >= 0 && x <= 7 && y >= 0 && y <= 7)) return null;
  return o === 'black' ? `${FILES[7 - x]}${y + 1}` : `${FILES[x]}${8 - y}`;
}

/** The centre of a square as shown on the board. */
export function squareCentre(sq, o) {
  const f = FILES.indexOf(sq[0]);
  const rank = Number(sq[1]);
  const [x, y] = o === 'black' ? [7 - f, rank - 1] : [f, 8 - rank];
  return [x * 10 + 5, y * 10 + 5];
}

/**
 * A client (screen) position as board units. The board sits in a frame turned
 * a little, like a photo taped in, so the point is turned back about the
 * board's centre first: box = { cx, cy, size, angle } (angle in radians).
 */
export function clientToBoard(clientX, clientY, { cx, cy, size, angle = 0 }) {
  const dx = clientX - cx;
  const dy = clientY - cy;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const x = dx * cos - dy * sin;
  const y = dx * sin + dy * cos;
  return [(x / size + 0.5) * SIZE, (y / size + 0.5) * SIZE];
}

/** The rotation of a CSS transform such as "matrix(a, b, c, d, e, f)", in radians. */
export function matrixAngle(transform) {
  const m = /^matrix\(([^,]+),([^,]+),/.exec(String(transform).replace(/\s+/g, ''));
  return m ? Math.atan2(Number(m[2]), Number(m[1])) : 0;
}

function segDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (!len2) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Fewer points along the same line (Ramer–Douglas–Peucker). Returns the
 * indices kept, so widths recorded per point can follow them.
 */
export function simplifyIndices(points, tolerance = 0.3) {
  const n = points.length;
  if (n <= 2) return points.map((_, i) => i);
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = -1;
    let far = 0;
    for (let i = a + 1; i < b; i += 1) {
      const d = segDist(points[i], points[a], points[b]);
      if (d > far) {
        far = d;
        worst = i;
      }
    }
    if (worst > 0 && far > tolerance) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  const out = [];
  keep.forEach((k, i) => k && out.push(i));
  return out;
}

export function simplify(points, tolerance) {
  return simplifyIndices(points, tolerance).map((i) => points[i]);
}

/**
 * The hand's last say: the inner points of a finished stroke shift a little,
 * seeded, so even a line drawn with a ruler-steady mouse isn't ruler-straight.
 * The two ends stay where the pen landed and lifted.
 */
export function jiggle(points, { seed = 1, amount = 0.18 } = {}) {
  const rand = rng(seed);
  return points.map((p, i) => (i === 0 || i === points.length - 1 ? [p[0], p[1]] : [p[0] + (rand() * 2 - 1) * amount, p[1] + (rand() * 2 - 1) * amount]));
}

/** Pen width from stylus pressure (0..1), in board units. A light touch still leaves a line. */
export function pressureWidth(pressure, base = 1.15) {
  const p = Number.isFinite(pressure) && pressure > 0 ? Math.min(1, pressure) : 0.5;
  return r2(base * (0.45 + p * 1.1));
}

/**
 * A filled outline around a line whose width changes along it (a stylus
 * pressed harder and softer), with round ends. One point gives a dot.
 */
export function outlinePath(points, widths) {
  if (!points.length) return '';
  const w = (i) => Math.max(0.2, widths[i] ?? widths[widths.length - 1] ?? 1) / 2;
  if (points.length === 1) {
    const [x, y] = points[0];
    const h = r2(w(0));
    return `M${r2(x - h)} ${r2(y)} a${h} ${h} 0 1 0 ${r2(2 * h)} 0 a${h} ${h} 0 1 0 ${r2(-2 * h)} 0Z`;
  }
  const left = [];
  const right = [];
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    left.push([points[i][0] + nx * w(i), points[i][1] + ny * w(i)]);
    right.push([points[i][0] - nx * w(i), points[i][1] - ny * w(i)]);
  }
  right.reverse();
  const tail = (pts) => smoothPath(pts).replace(/^M[^C]*/, '');
  const hEnd = r2(w(n - 1));
  const hStart = r2(w(0));
  const [rx, ry] = right[0];
  const [lx, ly] = left[0];
  return `${smoothPath(left)} A${hEnd} ${hEnd} 0 0 1 ${r2(rx)} ${r2(ry)}${tail(right)} A${hStart} ${hStart} 0 0 1 ${r2(lx)} ${r2(ly)}Z`;
}

/**
 * Turn the raw points of a freehand stroke (board units, as shown, newest
 * last) into what gets kept: fewer points, a touch of hand jiggle, stored as
 * seen from White's side. Widths are kept only for a stylus.
 */
export function finishFree(raw, { orientation = 'white', seed = 1, widths = null } = {}) {
  const idx = simplifyIndices(raw, 0.28);
  const pts = jiggle(
    idx.map((i) => raw[i]),
    { seed },
  ).map((p) => orient(p, orientation).map(r2));
  const out = { pts };
  if (widths) out.widths = idx.map((i) => widths[i]);
  return out;
}

/* ---------------------------------------------------------------- Shapes */

/**
 * What a drag from one square to another means: an arrow between them, or a
 * circle when it starts and ends on the same square. Null off the board.
 */
export function markFor(from, to) {
  if (!from || !to) return null;
  return from === to ? { kind: 'circle', sq: from } : { kind: 'arrow', from, to };
}

/** Same arrow or same circled square, in the same ink. */
export function sameMark(a, b) {
  if (!a || !b || a.kind !== b.kind || a.color !== b.color) return false;
  if (a.kind === 'arrow') return a.from === b.from && a.to === b.to;
  if (a.kind === 'circle') return a.sq === b.sq;
  if (a.kind === 'ghost') return a.from === b.from && a.to === b.to;
  if (a.kind === 'step') return a.n === b.n && a.from === b.from && a.to === b.to;
  return false;
}

/**
 * What a ghost drag from one square to another keeps: the piece seen at the
 * start (a real one, or a ghost already sketched there, so a piece can be
 * walked on square by square), or null when there's nothing to move.
 */
export function ghostFor(from, to, piece) {
  if (!from || !to || from === to || !PIECE.test(piece || '')) return null;
  return { kind: 'ghost', from, to, piece };
}

/** The numbered line among the drawings, in move order. */
export function lineSteps(shapes) {
  return shapes.filter((s) => s.kind === 'step').sort((a, b) => a.n - b.n);
}

/**
 * Where a step's number sits: about a third of the way along its arrow, moved
 * further along when an earlier number already sits there (taken: placed discs).
 */
export function stepBadge(shape, o, taken = []) {
  const [ax, ay] = squareCentre(shape.from, o);
  const [bx, by] = squareCentre(shape.to, o);
  const at = (t) => [r2(ax + (bx - ax) * t), r2(ay + (by - ay) * t)];
  const free = (p) => taken.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) >= 5.6);
  const spot = [0.38, 0.62, 0.22, 0.8].map(at).find(free) || at(0.38);
  taken.push(spot);
  return spot;
}

/** The piece a ghost drag starting on this square picks up: the newest ghost there, else the real piece. */
export function pieceForGhost(sq, shapes, real) {
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const s = shapes[i];
    if (s.kind === 'ghost' && s.to === sq) return s.piece;
  }
  return PIECE.test(real || '') ? real : null;
}

/** The SVG path data for one drawing on a board with this orientation. */
export function shapePaths(shape, o) {
  const seed = shape.seed ?? seedFrom(JSON.stringify(shape));
  if (shape.kind === 'arrow' || shape.kind === 'ghost' || shape.kind === 'step') return arrow(arrowPoints(shape.from, shape.to, o), { seed, head: 2.7 });
  if (shape.kind === 'circle') {
    const [cx, cy] = squareCentre(shape.sq, o);
    return [loop(cx, cy, 4.6, 4.3, { seed, turns: 1.12, tilt: -0.15 })];
  }
  if (shape.kind === 'free') {
    const pts = shape.pts.map((p) => orient(p, o));
    if (shape.widths) return [outlinePath(pts, shape.widths)];
    if (pts.length === 1) return [outlinePath(pts, [shape.width || 1.15])];
    return [smoothPath(pts)];
  }
  return [];
}

const TONE = new Set(COLORS);

/** One drawing as SVG markup. A stylus line is filled; everything else is stroked. */
export function shapeSVG(shape, o, extra = '', badges = []) {
  const tone = TONE.has(shape.color) ? shape.color : 'blue';
  const free = shape.kind === 'free';
  const filled = free && (shape.widths || shape.pts.length === 1);
  const nib = free && NIBS.includes(shape.nib) && shape.nib !== 'pen' ? ` dr--${shape.nib}` : '';
  const cls = `dr dr--${shape.kind}${nib} tone--${tone}${filled ? ' dr--fill' : ''}${extra ? ` ${extra}` : ''}`;
  const w = free ? (!filled && shape.width) || 0 : shape.width || markWidth();
  const width = w ? ` stroke-width="${w}"` : '';
  let ghost = '';
  if (shape.kind === 'ghost' && PIECE.test(shape.piece || '')) {
    const [x, y] = squareCentre(shape.to, o);
    ghost = `<image class="dr-ghost" href="${PIECES}${shape.piece}.svg" x="${x - 4.6}" y="${y - 4.6}" width="9.2" height="9.2"/>`;
  }
  if (shape.kind === 'step' && Number.isInteger(shape.n)) {
    const [x, y] = stepBadge(shape, o, badges);
    ghost = `<circle class="dr-num" cx="${x}" cy="${y}" r="2.6"/><text class="dr-num__n" x="${x}" y="${r2(y + 1.15)}">${shape.n}</text>`;
  }
  return `<g class="${cls}"${width}>${shapePaths(shape, o)
    .map((d) => `<path d="${d}"/>`)
    .join('')}${ghost}</g>`;
}

/**
 * The drawings on the board and their undo history, with no page attached.
 * Every change is one undo step, a clear included.
 */
export function createSketch() {
  let shapes = [];
  const past = [];
  let made = 0;
  const commit = (next) => {
    past.push(shapes);
    if (past.length > 200) past.shift();
    shapes = next;
  };
  return {
    get shapes() {
      return shapes;
    },
    get canUndo() {
      return past.length > 0;
    },
    /** A seed for the next drawing, so a preview and the kept drawing match. */
    nextSeed(key = '') {
      return seedFrom(`${key}:${made}`);
    },
    add(shape) {
      made += 1;
      commit([...shapes, shape]);
    },
    /** Lichess-style: drawing the same arrow or circle again takes it off. */
    toggle(shape) {
      const i = shapes.findIndex((s) => sameMark(s, shape));
      if (i >= 0) commit(shapes.filter((_, j) => j !== i));
      else this.add(shape);
      return i < 0;
    },
    undo() {
      if (!past.length) return false;
      shapes = past.pop();
      return true;
    },
    clear() {
      if (!shapes.length) return false;
      commit([]);
      return true;
    },
    /** Add a drawing in place of the ones it replaces, as one undo step. */
    put(shape, replaces) {
      made += 1;
      commit([...shapes.filter((s) => !replaces(s)), shape]);
    },
    /** Keep only the drawings that pass, as one undo step. */
    keep(test) {
      const next = shapes.filter(test);
      if (next.length === shapes.length) return false;
      commit(next);
      return true;
    },
    /** Forget everything, history too: a new position is on the board. */
    reset() {
      shapes = [];
      past.length = 0;
    },
  };
}

/** What a pointer pressed on the board should do: 'mark' (right button), 'tool', or null (leave it to the pieces). */
export function intentFor({ pointerType, button }, drawMode) {
  if (pointerType === 'pen') {
    if (button === 2) return 'mark'; // the barrel button
    if (button === 5) return null; // the eraser end: not a drawing tool here
    return 'tool';
  }
  if (button === 2 && pointerType === 'mouse') return 'mark';
  if (drawMode && button === 0) return 'tool';
  return null;
}

/* ------------------------------------------------------------------ Page */

const SVGNS = 'http://www.w3.org/2000/svg';
const PALM_MS = 400; // touches this soon after a stylus lifts are a resting hand

// The last tool and size picked come back next visit; storage may be off.
const KEY = 'puzzleanalyzr.pens.';
function remembered(name, allowed, fallback) {
  try {
    const v = localStorage.getItem(KEY + name);
    return allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function remember(name, value) {
  try {
    localStorage.setItem(KEY + name, value);
  } catch {
    /* fine without it */
  }
}

// Pencil grain: the line breaks up where noise thins it, with a slightly ragged edge.
// The filter covers the whole board in board units, so a dead-straight line (a
// zero-height box) still shows.
const GRAIN = `<defs><filter id="dr-grain" x="-8" y="-8" width="96" height="96" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0.35" xChannelSelector="R" yChannelSelector="G" result="d"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 2.15" result="m"/><feComposite in="d" in2="m" operator="in"/></filter></defs>`;

/**
 * els: { board, svg, mode, show, undo, clear, tools: [buttons with data-tool], colors: [buttons with data-color], sizes: [buttons with data-size], hint }
 * orientation(): the board's orientation now.
 */
export function createDrawLayer(els, { orientation = () => 'white', pieceAt = () => null, boardFen = () => '', onLine = () => {} } = {}) {
  const sketch = createSketch();
  let drawMode = false;
  let visible = true;
  let tool = remembered('tool', TOOLS, 'pen');
  let color = 'blue';
  let size = remembered('size', Object.keys(SIZES), 'medium');
  let live = null; // the stroke being drawn
  let penUpAt = -Infinity;
  let frame = 0;
  let menuShutUntil = 0;
  let note = ''; // a one-off message in place of the hint, e.g. why a line step didn't fit

  const done = document.createElementNS(SVGNS, 'g');
  done.setAttribute('class', 'desk__drawn');
  const preview = document.createElementNS(SVGNS, 'g');
  preview.setAttribute('class', 'desk__live');
  els.svg.insertAdjacentHTML('afterbegin', GRAIN);
  els.svg.append(done, preview);

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');

  function render() {
    const o = orientation();
    const badges = []; // a line's numbers, placed in order so they don't cover each other
    const ordered = [...sketch.shapes.filter((s) => s.kind !== 'step'), ...lineSteps(sketch.shapes)];
    done.innerHTML = ordered.map((s) => shapeSVG(s, o, '', badges)).join('');
    syncButtons();
    const steps = lineSteps(sketch.shapes);
    const start = steps.length ? steps[0].start : '';
    onLine(steps.length ? { fen: start, steps, text: lineText(start, steps) } : null);
  }

  /** Add the next step of the line, or say why it doesn't fit. */
  function addStep(from, to, seed) {
    if (!from || !to || from === to) return;
    let steps = lineSteps(sketch.shapes);
    // Every step carries the position its line starts from, so undo brings an old line back whole.
    const fen = boardFen();
    const fresh = !steps.length || steps[0].start !== fen;
    const last = steps[steps.length - 1];
    if (!fresh && last.from === from && last.to === to) {
      sketch.keep((s) => s !== last); // the last arrow again takes it back
      return;
    }
    if (fresh) steps = []; // a new line from the board as it is now; an old one from another position goes
    const step = nextStep(fen, steps, from, to);
    if (step.error) {
      note = step.error;
      return;
    }
    const starter = fen.split(/\s+/)[1] === 'b' ? 'b' : 'w';
    const shape = { kind: 'step', ...step, start: fen, color: step.side === starter ? 'green' : 'red', seed, width: markWidth(size) };
    if (fresh) sketch.put(shape, (s) => s.kind === 'step'); // replacing the old line is one undo step
    else sketch.add(shape);
  }

  function syncButtons() {
    els.mode.setAttribute('aria-pressed', String(drawMode));
    els.show.setAttribute('aria-pressed', String(visible));
    els.svg.classList.toggle('is-hidden', !visible);
    els.board.classList.toggle('is-drawing', drawMode);
    els.undo.disabled = !sketch.canUndo;
    els.clear.disabled = !sketch.shapes.length;
    for (const b of els.tools) b.setAttribute('aria-pressed', String(b.dataset.tool === tool));
    for (const b of els.colors) b.setAttribute('aria-pressed', String(b.dataset.color === color));
    for (const b of els.sizes || []) b.setAttribute('aria-pressed', String(b.dataset.size === size));
    if (els.hint) {
      const text = note || hintText();
      if (els.hint.textContent !== text) els.hint.textContent = text; // don't re-announce the same hint
    }
  }

  function hintText() {
    if (drawMode && tool === 'line') return 'Line: drag the moves you think come next, both sides, in order. Each arrow gets its number. Then tap Play it.';
    if (drawMode && tool === 'ghost') return 'Ghost: drag a piece to try it on another square. The real position stays put. Drag the ghost on to keep going.';
    if (drawMode) return fine.matches ? 'Draw is on: drag on the board to draw. Turn it off to move pieces.' : 'Draw is on: your finger draws. Tap Draw again to move pieces.';
    return fine.matches ? 'Right-drag on the board for an arrow, right-click a square to circle it.' : 'Tap Draw to draw on the board with your finger. A stylus always draws.';
  }

  // Where the board is on screen, turn included; measured once per stroke.
  function measure() {
    const r = els.board.getBoundingClientRect();
    let angle = 0;
    for (let n = els.board; n && n !== document.body; n = n.parentElement) angle += matrixAngle(getComputedStyle(n).transform);
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, size: els.board.offsetWidth || r.width, angle };
  }

  function point(e, box = live && live.box) {
    return clientToBoard(e.clientX, e.clientY, box || measure());
  }

  // Only the stroke being drawn is redrawn while the pointer moves, once a frame.
  function paint() {
    frame = 0;
    if (!live) return;
    const o = orientation();
    if (live.kind === 'free') {
      const pts = live.pts;
      let d;
      if (pts.length === 1) d = outlinePath(pts, [live.width]);
      else d = smoothPath(pts);
      const nib = live.nib !== 'pen' ? ` dr--${live.nib}` : '';
      preview.innerHTML = `<g class="dr dr--free${nib} tone--${color}${pts.length === 1 ? ' dr--fill' : ''}" stroke-width="${live.width}"><path d="${d}"/></g>`;
      return;
    }
    const at = squareAtPoint(live.pts[live.pts.length - 1], o);
    if (live.kind === 'step') {
      const ok = at && at !== live.from;
      preview.innerHTML = ok ? shapeSVG({ kind: 'arrow', from: live.from, to: at, color: 'green', seed: live.seed, width: markWidth(size) }, o, 'is-live') : '';
      return;
    }
    if (live.kind === 'ghost') {
      const g = ghostFor(live.from, at, live.piece);
      preview.innerHTML = g ? shapeSVG({ ...g, color, seed: live.seed, width: markWidth(size) }, o, 'is-live') : '';
      return;
    }
    const mark = live.kind === 'circle' ? markFor(at, at) : markFor(live.from, at);
    live.mark = mark;
    preview.innerHTML = mark ? shapeSVG({ ...mark, color, seed: live.seed, width: markWidth(size) }, o, 'is-live') : '';
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(paint);
  };

  function stop(e) {
    e.stopImmediatePropagation();
    if (e.cancelable) e.preventDefault();
  }

  function onDown(e) {
    if (e.target.closest && e.target.closest('.desk__promo')) return; // the promotion picker takes its own taps
    if (live && e.pointerId === live.id) {
      // The last stroke never got its pointerup (e.g. Firefox kept the right-click menu): drop it.
      onUp(e, true);
    }
    if (live) {
      // One stroke at a time; a hand resting on the screen while a stylus draws is ignored.
      if (e.pointerId !== live.id) stop(e);
      return;
    }
    if (e.pointerType === 'touch' && performance.now() - penUpAt < PALM_MS) {
      stop(e);
      return;
    }
    const intent = intentFor(e, drawMode);
    if (!intent) return;
    stop(e);
    const o = orientation();
    const box = measure();
    const p = point(e, box);
    const nib = NIBS.includes(tool) ? tool : 'pen';
    note = '';
    const kind = intent === 'mark' ? 'arrow' : NIBS.includes(tool) ? 'free' : tool === 'line' ? 'step' : tool;
    const from = squareAtPoint(p, o);
    if (kind !== 'free' && !from) return;
    const piece = kind === 'ghost' ? pieceForGhost(from, sketch.shapes, pieceAt(from)) : null;
    if (kind === 'ghost' && !piece) return; // an empty square: nothing to pick up
    if (!visible) visible = true;
    const pen = e.pointerType === 'pen';
    const base = nibWidth(nib, size);
    // A marker lays down an even band; pen and pencil follow stylus pressure.
    const pressed = pen && nib !== 'marker';
    live = {
      id: e.pointerId,
      box,
      kind,
      nib,
      base,
      pen,
      from,
      piece,
      pts: [p],
      widths: pressed ? [pressureWidth(e.pressure, base)] : null,
      width: pressed ? pressureWidth(e.pressure, base) : base,
      seed: sketch.nextSeed(`${kind}:${from || ''}`),
    };
    try {
      els.board.setPointerCapture(e.pointerId);
    } catch {
      /* fine without it */
    }
    syncButtons();
    paint();
  }

  function onMove(e) {
    if (!live) return;
    if (e.pointerId !== live.id) {
      if (e.pointerType === 'touch' && live.pen) stop(e);
      return;
    }
    stop(e);
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const ev of events.length ? events : [e]) {
      const p = point(ev);
      if (live.kind === 'free') {
        const last = live.pts[live.pts.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.12) continue;
        live.pts.push(p);
        if (live.widths) {
          // Pressure eases in and out, so the width doesn't jump between points.
          const prev = live.widths[live.widths.length - 1];
          live.widths.push(r2(prev * 0.6 + pressureWidth(ev.pressure, live.base) * 0.4));
          live.width = live.widths[live.widths.length - 1];
        }
      } else {
        live.pts = [live.pts[0], p];
      }
    }
    schedule();
  }

  function onUp(e, cancelled) {
    if (!live || e.pointerId !== live.id) {
      if (live && live.pen && e.pointerType === 'touch') stop(e);
      return;
    }
    stop(e);
    const l = live;
    live = null;
    menuShutUntil = performance.now() + 300;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (l.pen) penUpAt = performance.now();
    try {
      els.board.releasePointerCapture(l.id);
    } catch {
      /* already released */
    }
    preview.innerHTML = '';
    if (!cancelled) {
      const o = orientation();
      if (l.kind === 'free') {
        const fin = finishFree(l.pts, { orientation: o, seed: l.seed, widths: l.widths });
        sketch.add({ kind: 'free', nib: l.nib, color, seed: l.seed, ...fin, ...(fin.widths ? {} : { width: l.width }) });
      } else {
        if (e.type === 'pointerup') l.pts[1] = point(e, l.box);
        const at = squareAtPoint(l.pts[l.pts.length - 1], o);
        if (l.kind === 'step') addStep(l.from, at, l.seed);
        const mark = l.kind === 'step' ? null : l.kind === 'ghost' ? ghostFor(l.from, at, l.piece) : l.kind === 'circle' ? markFor(at, at) : markFor(l.from, at);
        if (mark) sketch.toggle({ ...mark, color, seed: l.seed, width: markWidth(size) });
      }
    }
    render();
  }

  const opts = { capture: true };
  els.board.addEventListener('pointerdown', onDown, opts);
  els.board.addEventListener('pointermove', onMove, opts);
  els.board.addEventListener('pointerup', (e) => onUp(e, false), opts);
  els.board.addEventListener('pointercancel', (e) => onUp(e, true), opts);
  els.board.addEventListener(
    'lostpointercapture',
    (e) => {
      if (live && e.pointerId === live.id) onUp(e, false);
    },
    opts,
  );
  // The right button draws here, so the browser's menu stays shut over the board,
  // and also just after a right-drag that ended off the board (Windows opens it on mouseup).
  els.board.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => {
    if (live || performance.now() < menuShutUntil) e.preventDefault();
  });
  // Switching windows mid-stroke may swallow the pointerup.
  window.addEventListener('blur', () => {
    if (live) onUp({ pointerId: live.id, stopImmediatePropagation() {}, cancelable: false }, true);
  });

  els.mode.addEventListener('click', () => {
    drawMode = !drawMode;
    if (drawMode) visible = true;
    syncButtons();
  });
  els.show.addEventListener('click', () => {
    visible = !visible;
    syncButtons();
  });
  els.undo.addEventListener('click', () => {
    if (sketch.undo()) render();
  });
  els.clear.addEventListener('click', () => {
    if (sketch.clear()) render();
  });
  for (const b of els.tools) {
    b.addEventListener('click', () => {
      tool = b.dataset.tool;
      note = '';
      remember('tool', tool);
      syncButtons();
    });
  }
  for (const b of els.colors) {
    b.addEventListener('click', () => {
      color = b.dataset.color;
      syncButtons();
    });
  }
  for (const b of els.sizes || []) {
    b.addEventListener('click', () => {
      size = b.dataset.size;
      remember('size', size);
      syncButtons();
    });
  }
  fine.addEventListener?.('change', syncButtons);
  syncButtons();

  return {
    /** Draw everything again, e.g. after the board flips. */
    render,
    /** Rub it all out as one undo step (Start over). */
    clear() {
      if (sketch.clear()) render();
    },
    /** A new position: no drawings and no history. */
    /** Take the numbered line off the board, as one undo step. */
    clearLine() {
      if (sketch.keep((s) => s.kind !== 'step')) render();
    },
    reset() {
      if (live) onUp({ pointerId: live.id, stopImmediatePropagation() {}, cancelable: false }, true);
      preview.innerHTML = '';
      note = '';
      sketch.reset();
      render();
    },
    get shapes() {
      return sketch.shapes;
    },
    get drawMode() {
      return drawMode;
    },
  };
}
