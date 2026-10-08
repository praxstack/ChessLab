// Board rendering helpers shared by the browser (app.js) and the static build
// (scripts/build.mjs pre-renders the first step so the board shows without JavaScript).
// Pure functions that return HTML/SVG strings; no DOM access here.

export const PIECE_BASE = '/assets/pieces/';
const FILES = 'abcdefgh';

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

export function coordsHTML(orientation) {
  const files = orientation === 'white' ? FILES : [...FILES].reverse().join('');
  const ranks = orientation === 'white' ? '87654321' : '12345678';
  let html = '';
  for (let i = 0; i < 8; i += 1) {
    // Label colour contrasts with the square it sits on: (x + y) even = light square.
    html += `<span class="coord coord--file ${(i + 7) % 2 === 0 ? 'on-light' : 'on-dark'}" data-x="${i}">${files[i]}</span>`;
    html += `<span class="coord coord--rank ${i % 2 === 0 ? 'on-light' : 'on-dark'}" data-y="${i}">${ranks[i]}</span>`;
  }
  return html;
}

/** Last-move highlights, square marks and the annotation badge. */
export function overlaysHTML(step, orientation) {
  let html = '';
  for (const sq of step.last || []) {
    const [x, y] = squareXY(sq, orientation);
    html += `<span class="hl hl--last" data-x="${x}" data-y="${y}"></span>`;
  }
  for (const mark of step.marks || []) {
    const [x, y] = squareXY(mark.sq, orientation);
    html += `<span class="hl mk mk--${esc(mark.tone)}" data-x="${x}" data-y="${y}"></span>`;
  }
  if (step.badge) {
    const [x, y] = squareXY(step.badge.sq, orientation);
    html += `<span class="badge badge--${esc(step.badge.tone)}" data-x="${x}" data-y="${y}"><b>${esc(step.badge.text)}</b></span>`;
  }
  return html;
}

const round = (n) => Math.round(n * 1000) / 1000;

/** Geometry for one arrow in board units (one square = 1). Knight moves get an L-shaped arrow. */
export function arrowGeometry(from, to, orientation, tone) {
  const [fx, fy] = squareXY(from, orientation);
  const [tx, ty] = squareXY(to, orientation);
  const start = [fx + 0.5, fy + 0.5];
  const end = [tx + 0.5, ty + 0.5];
  const dx = tx - fx;
  const dy = ty - fy;
  const knight = (Math.abs(dx) === 1 && Math.abs(dy) === 2) || (Math.abs(dx) === 2 && Math.abs(dy) === 1);
  const points = [start];
  if (knight) points.push(Math.abs(dy) > Math.abs(dx) ? [start[0], end[1]] : [end[0], start[1]]);
  const prev = points[points.length - 1];
  const len = Math.hypot(end[0] - prev[0], end[1] - prev[1]);
  const ux = (end[0] - prev[0]) / len;
  const uy = (end[1] - prev[1]) / len;
  const thin = tone === 'cover';
  const head = thin ? 0.3 : 0.42;
  const width = thin ? 0.28 : 0.44;
  const tip = [end[0] - ux * 0.12, end[1] - uy * 0.12];
  const neck = [tip[0] - ux * head, tip[1] - uy * head];
  const shaft = [...points, neck];
  const d = shaft.map((p, i) => `${i ? 'L' : 'M'}${round(p[0])} ${round(p[1])}`).join(' ');
  const px = -uy * (width / 2);
  const py = ux * (width / 2);
  const headPoints = [
    [tip[0], tip[1]],
    [neck[0] + px, neck[1] + py],
    [neck[0] - px, neck[1] - py],
  ]
    .map((p) => `${round(p[0])},${round(p[1])}`)
    .join(' ');
  return { d, head: headPoints };
}

export function arrowsSVG(arrows, orientation) {
  return (arrows || [])
    .map((a, i) => {
      const g = arrowGeometry(a.from, a.to, orientation, a.tone);
      return `<g class="arrow arrow--${esc(a.tone)}" data-i="${i}"><path d="${g.d}" pathLength="1"/><polygon points="${g.head}"/></g>`;
    })
    .join('');
}

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
