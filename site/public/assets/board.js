// Board rendering helpers shared by the browser (app.js) and the static build
// (scripts/build.mjs pre-renders every board, so each one shows without JavaScript).
// Pure functions that return HTML/SVG strings; no DOM access here.
//
// The board is drawn crisply, like a book diagram. The coach's marks on it are
// hand-drawn strokes from ink.js, in board units: one square is 10 units, so
// the overlay's viewBox is 0 0 80 80.
import { arrow, cross, loop, seedFrom } from './ink.js';

export const PIECE_BASE = '/assets/pieces/';
const FILES = 'abcdefgh';
const SQ = 10;

export function squareXY(sq, orientation) {
  const file = FILES.indexOf(sq[0]);
  const rank = Number(sq[1]);
  return orientation === 'white' ? [file, 8 - rank] : [7 - file, rank - 1];
}

/** "rn1qkbnr/..." -> { e8: 'bK', e5: 'wN', ... } */
export function parsePlacement(placement) {
  const map = {};
  placement.split('/').forEach((row, i) => {
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        file += Number(ch);
      } else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        map[`${FILES[file]}${8 - i}`] = color + ch.toUpperCase();
        file += 1;
      }
    }
  });
  return map;
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function pieceHTML(sq, code, orientation) {
  const [x, y] = squareXY(sq, orientation);
  return `<img class="pc" src="${PIECE_BASE}${code}.svg" alt="" width="45" height="45" draggable="false" data-sq="${sq}" data-piece="${code}" data-x="${x}" data-y="${y}">`;
}

export function piecesHTML(placement, orientation) {
  const map = parsePlacement(placement);
  return Object.keys(map)
    .sort()
    .map((sq) => pieceHTML(sq, map[sq], orientation))
    .join('');
}

/** Rank numbers for the left margin of the diagram, top to bottom. */
export function ranksHTML(orientation) {
  const ranks = orientation === 'white' ? '87654321' : '12345678';
  return [...ranks].map((n) => `<span>${n}</span>`).join('');
}

/** File letters for the bottom margin of the diagram, left to right. */
export function filesHTML(orientation) {
  const files = orientation === 'white' ? FILES : [...FILES].reverse().join('');
  return [...files].map((f) => `<span>${f}</span>`).join('');
}

/** The last move, marked with a highlighter swipe on its two squares. */
export function lastHTML(step, orientation) {
  return (step.last || [])
    .map((sq) => {
      const [x, y] = squareXY(sq, orientation);
      return `<span class="hl" data-x="${x}" data-y="${y}"></span>`;
    })
    .join('');
}

/** "??" or "#", written in red pen in the corner of a square. */
export function badgesHTML(step, orientation) {
  if (!step.badge) return '';
  const [x, y] = squareXY(step.badge.sq, orientation);
  return `<span class="badge badge--${esc(step.badge.tone)}" data-x="${x}" data-y="${y}" data-write>${esc(step.badge.text)}</span>`;
}

const centre = (sq, o) => {
  const [x, y] = squareXY(sq, o);
  return [x * SQ + SQ / 2, y * SQ + SQ / 2];
};

const TONE = { threat: 'red', idea: 'blue', cover: 'graphite', danger: 'red', mate: 'red', covered: 'graphite' };

/** Points for an arrow between two squares; a knight's move gets an L. */
export function arrowPoints(from, to, orientation) {
  const a = centre(from, orientation);
  const b = centre(to, orientation);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const knight = (Math.abs(dx) === SQ && Math.abs(dy) === 2 * SQ) || (Math.abs(dx) === 2 * SQ && Math.abs(dy) === SQ);
  const pts = [a];
  if (knight) pts.push(Math.abs(dy) > Math.abs(dx) ? [a[0], b[1]] : [b[0], a[1]]);
  pts.push(b);
  // Start just off the piece's centre and stop short of the target's, like a hand would.
  const nudge = (p, q, d) => {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    return [p[0] + ((q[0] - p[0]) / len) * d, p[1] + ((q[1] - p[1]) / len) * d];
  };
  pts[0] = nudge(pts[0], pts[1], 1.8);
  pts[pts.length - 1] = nudge(pts[pts.length - 1], pts[pts.length - 2], 1.4);
  return pts;
}

const group = (cls, paths) =>
  `<g class="${cls}">${paths.map((d) => `<path class="stroke" pathLength="1" d="${d}"/>`).join('')}</g>`;

/**
 * The coach's marks for one step, in drawing order: arrows, then circled
 * squares, then crossed-out escape squares.
 */
export function inkMarks(step, orientation) {
  const marks = [];
  (step.arrows || []).forEach((a) => {
    const seed = seedFrom(`${step.id}:${a.from}${a.to}`);
    const paths = arrow(arrowPoints(a.from, a.to, orientation), { seed, head: a.tone === 'cover' ? 1.9 : 2.5 });
    marks.push({ kind: 'arrow', tone: TONE[a.tone] || 'blue', svg: group(`mk mk--arrow tone--${TONE[a.tone] || 'blue'}`, paths) });
  });
  (step.marks || []).forEach((m) => {
    const [cx, cy] = centre(m.sq, orientation);
    const seed = seedFrom(`${step.id}:${m.sq}:${m.tone}`);
    const tone = TONE[m.tone] || 'blue';
    let paths;
    if (m.tone === 'covered') {
      paths = cross(cx, cy, 3.4, { seed });
    } else if (m.tone === 'mate') {
      paths = [loop(cx, cy, 4.9, 4.6, { seed, turns: 1.1 }), loop(cx, cy, 4.1, 3.8, { seed: seed + 9, turns: 1.05 })];
    } else {
      paths = [loop(cx, cy, 4.8, 4.5, { seed, turns: 1.14, tilt: -0.15 })];
    }
    marks.push({ kind: m.tone === 'covered' ? 'cross' : 'loop', tone, svg: group(`mk mk--${m.tone === 'covered' ? 'cross' : 'loop'} tone--${tone}`, paths) });
  });
  return marks;
}

export function inkSVG(step, orientation) {
  return inkMarks(step, orientation)
    .map((m) => m.svg)
    .join('');
}

/**
 * The teacher's red-blue pencil, held right-handed: the tip sits at (0, 0) and
 * the body leans down and to the right, so app.js can move it
 * along a stroke with a single translate. Hidden until something is drawn.
 */
export const PENCIL_SVG = `<g class="pencil" transform="translate(-40 -40)"><g class="pencil__body" transform="rotate(146)"><path class="pencil__wood" d="M0 0 L-1.25 -3.6 L1.25 -3.6 Z"/><path class="pencil__lead" d="M0 0 L-0.5 -1.45 L0.5 -1.45 Z"/><rect class="pencil__barrel" x="-1.25" y="-15.5" width="2.5" height="11.9" rx="0.35"/><rect class="pencil__shine" x="-0.35" y="-15" width="0.5" height="10.8"/></g></g>`;

/** SAN with a figurine for the piece letter, e.g. "Nxe5" -> [knight]xe5. */
export function sanHTML(san) {
  const m = /^([KQRBN])(.*)$/.exec(san);
  if (!m) return esc(san);
  const names = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' };
  return `<img class="fig" src="${PIECE_BASE}w${m[1]}.svg" alt="${m[1]}" title="${names[m[1]]}" width="45" height="45">${esc(m[2])}`;
}

export function boardLabel(step) {
  return `Chessboard, viewed from Black's side. ${step.label}: ${step.title}`;
}
