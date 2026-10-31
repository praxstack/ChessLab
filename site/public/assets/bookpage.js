// Book page: the position on the board, the learner's drawings on it, and
// margin notes, laid out like a page from a chess book, ready to print or save
// as a PDF. It only shows what the learner put there (their line, stickers,
// tape, arrows, their own note); it never asks the engine for a move.
//
// The top half is pure (tested with node --test); openBookPage at the bottom
// is the only part that touches the page.
import { parsePlacement, PIECE_BASE } from './board.js';
import { GLYPHS, ROLES, WORDS, lineSteps, shapeSVG, squareCentre } from './draw.js';

const FILES = 'abcdefgh';
const SVGNS = 'http://www.w3.org/2000/svg';
const r1 = (n) => Math.round(n * 10) / 10;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Whose move it is, the way a book puts it under a diagram. */
export function toPlay(fen) {
  return (fen || '').split(/\s+/)[1] === 'b' ? 'Black to play' : 'White to play';
}

/**
 * The diagram's squares and pieces as SVG, in board units (80 by 80).
 * Dark squares are hatched, like a printed chess book, so the page still
 * reads when it comes out of a black-and-white printer.
 */
export function diagramSVG(fen, o = 'white') {
  const placement = (fen || '').split(/\s+/)[0] || '8/8/8/8/8/8/8/8';
  const pieces = parsePlacement(placement);
  let dark = '';
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      if ((x + y) % 2) dark += `<rect x="${x * 10}" y="${y * 10}" width="10" height="10"/>`;
    }
  }
  const hatch =
    '<defs><pattern id="book-hatch" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="1.6" class="book__dark-bg"/><path d="M0 0 V1.6" class="book__hatch"/></pattern></defs>';
  const men = Object.keys(pieces)
    .sort()
    .map((sq) => {
      const [cx, cy] = squareCentre(sq, o);
      return `<image href="${PIECE_BASE}${pieces[sq]}.svg" x="${r1(cx - 4.6)}" y="${r1(cy - 4.6)}" width="9.2" height="9.2"/>`;
    })
    .join('');
  const ranks = o === 'white' ? '87654321' : '12345678';
  const files = o === 'white' ? FILES : [...FILES].reverse().join('');
  const coords = [...ranks].map((n, i) => `<text class="book__coord" x="-2.4" y="${i * 10 + 6.4}">${n}</text>`).join('') +
    [...files].map((f, i) => `<text class="book__coord" x="${i * 10 + 5}" y="84.2">${f}</text>`).join('');
  return `<svg class="book__squares" viewBox="-5 -1 86 87" xmlns="${SVGNS}" role="img" aria-label="Diagram: ${esc(toPlay(fen))}">${hatch}<rect class="book__light" x="0" y="0" width="80" height="80"/><g fill="url(#book-hatch)">${dark}</g><rect class="book__frame" x="-0.6" y="-0.6" width="81.2" height="81.2"/>${men}${coords}</svg>`;
}

/** The learner's drawings over the diagram, the same as on the board. */
export function drawingsSVG(shapes, o = 'white') {
  const badges = [];
  const plain = shapes.filter((s) => s.kind !== 'step').map((s) => shapeSVG(s, o));
  const steps = lineSteps(shapes).map((s) => shapeSVG(s, o, '', badges));
  return `<svg class="desk__draw book__ink" viewBox="0 0 80 80" xmlns="${SVGNS}" aria-hidden="true" focusable="false">${plain.join('')}${steps.join('')}</svg>`;
}

const NAME = { K: 'K', Q: 'Q', R: 'R', B: 'B', N: 'N', P: '' };

/** "Nf3" for a knight on f3, "e4" for a pawn or an empty square. */
function onSquare(sq, pieces) {
  const p = pieces[sq];
  return p ? `${NAME[p[1]] ?? ''}${sq}` : sq;
}

/**
 * The margin notes, from the drawings only:
 * { caption, line, glyphs: ["Nf3 !!"], words: ["e5 OUTPOST"], tapes: ["a1–h8"],
 *   arrows: [{ role: 'Mine', moves: ['e2–e4'] }], ghosts: ['N to f5'], rings: ['d5'] }
 */
export function marginNotes({ fen = '', shapes = [], line = '' } = {}) {
  const pieces = parsePlacement((fen || '').split(/\s+/)[0] || '8/8/8/8/8/8/8/8');
  const glyphs = [];
  const words = [];
  const tapes = [];
  const ghosts = [];
  const rings = [];
  const byRole = new Map();
  for (const s of shapes) {
    if (s.kind === 'sticker' && GLYPHS.includes(s.glyph)) glyphs.push(`${onSquare(s.sq, pieces)} ${s.glyph}`);
    else if (s.kind === 'sticker' && WORDS.includes(s.glyph)) words.push(`${s.sq} ${s.glyph}`);
    else if (s.kind === 'tape') tapes.push(`${s.from}–${s.to}`);
    else if (s.kind === 'ghost') ghosts.push(`${NAME[(s.piece || '')[1]] || 'pawn'} to ${s.to}`);
    else if (s.kind === 'circle') rings.push(s.sq);
    else if (s.kind === 'arrow') {
      const role = ROLES[s.color] || ROLES.blue;
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role).push(`${s.from}–${s.to}`);
    }
  }
  const order = [ROLES.green, ROLES.red, ROLES.blue];
  const arrows = order.filter((r) => byRole.has(r)).map((role) => ({ role, moves: byRole.get(role) }));
  return { caption: toPlay(fen), line, glyphs, words, tapes, arrows, ghosts, rings };
}

/** The notes as plain text (for Copy notes), one per line. */
export function notesText(notes, own = '') {
  const out = [notes.caption];
  if (notes.line) out.push(`My line: ${notes.line}`);
  for (const a of notes.arrows) out.push(`${a.role}: ${a.moves.join(', ')}`);
  if (notes.ghosts.length) out.push(`Tried: ${notes.ghosts.join(', ')}`);
  if (notes.glyphs.length) out.push(`Marks: ${notes.glyphs.join(', ')}`);
  if (notes.words.length) out.push(`Squares: ${notes.words.join(', ')}`);
  if (notes.tapes.length) out.push(`Lines: ${notes.tapes.join(', ')}`);
  if (notes.rings.length) out.push(`Circled: ${notes.rings.join(', ')}`);
  if (own.trim()) out.push('', own.trim());
  return out.join('\n');
}

/** The margin as HTML: one short labelled row per kind of note. */
export function marginHTML(notes) {
  const row = (label, text, cls = '') => `<p class="book__note${cls}"><span class="book__label">${esc(label)}</span> ${esc(text)}</p>`;
  const rows = [];
  if (notes.line) rows.push(row('My line', notes.line, ' book__note--line'));
  for (const a of notes.arrows) rows.push(row(a.role, a.moves.join(', ')));
  if (notes.ghosts.length) rows.push(row('Tried', notes.ghosts.join(', ')));
  if (notes.glyphs.length) rows.push(row('Marks', notes.glyphs.join(', ')));
  if (notes.words.length) rows.push(row('Squares', notes.words.join(', ')));
  if (notes.tapes.length) rows.push(row('Lines', notes.tapes.join(', ')));
  if (notes.rings.length) rows.push(row('Circled', notes.rings.join(', ')));
  if (!rows.length) rows.push('<p class="book__note book__note--empty">No marks yet. Draw on the board, or write a note below.</p>');
  return rows.join('');
}

/**
 * Open the book page for what's on the board now.
 * els: { pop, diagram, margin, caption, title, note, notePrint, print, copy, close, say }
 * get: () => ({ fen, orientation, shapes, line, title })
 */
export function createBookPage(els, get) {
  const say = (t) => {
    els.say.textContent = t;
  };
  let current = null;
  const syncNote = () => {
    els.notePrint.textContent = els.note.value;
    els.notePrint.hidden = !els.note.value.trim();
  };
  function open() {
    const { fen, orientation, shapes, line, title } = get();
    current = marginNotes({ fen, shapes, line });
    els.diagram.innerHTML = diagramSVG(fen, orientation) + drawingsSVG(shapes, orientation);
    els.caption.textContent = current.caption;
    els.title.textContent = title || 'Puzzle';
    els.margin.innerHTML = marginHTML(current);
    syncNote();
    say('');
    if (typeof els.pop.showModal === 'function') els.pop.showModal();
    else els.pop.setAttribute('open', '');
  }
  function close() {
    document.documentElement.classList.remove('is-printing-book');
    if (typeof els.pop.close === 'function') els.pop.close();
    else els.pop.removeAttribute('open');
  }
  els.note.addEventListener('input', syncNote);
  els.close.addEventListener('click', close);
  els.pop.addEventListener('click', (e) => {
    if (e.target === els.pop) close(); // a tap on the backdrop
  });
  els.print.addEventListener('click', () => {
    // Only the page prints; the rest of the site is hidden for the print.
    document.documentElement.classList.add('is-printing-book');
    const done = () => document.documentElement.classList.remove('is-printing-book');
    window.addEventListener('afterprint', done, { once: true });
    window.print();
  });
  els.copy.addEventListener('click', async () => {
    if (!current) return;
    const text = notesText(current, els.note.value);
    try {
      await navigator.clipboard.writeText(text);
      say('Notes copied.');
    } catch {
      say('Your browser blocked copying. Select the notes and copy them yourself.');
    }
  });
  return { open, close };
}
