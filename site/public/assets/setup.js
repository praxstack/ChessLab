// Set up a position by tapping: pick a piece, tap squares. For copying a
// position you can see somewhere else (the Chess.com app's puzzle before this
// page has it, a book, a game on TV) without typing a FEN.
import { Chess } from './vendor/chess.js';
import { PIECE_BASE } from './board.js';

const FILES = 'abcdefgh';
export const PIECES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];
const NAMES = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

export const pieceName = (code) => `${code[0] === 'w' ? 'white' : 'black'} ${NAMES[code[1]]}`;

/** { e4: 'wP', ... } from the first field of a FEN. */
export function fromPlacement(placement) {
  const out = {};
  String(placement || '')
    .split(' ')[0]
    .split('/')
    .forEach((row, i) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) f += Number(ch);
        else {
          if (f < 8 && i < 8) out[FILES[f] + (8 - i)] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
          f += 1;
        }
      }
    });
  return out;
}

export const startPieces = () => fromPlacement(START);

function placement(pieces) {
  const rows = [];
  for (let r = 8; r >= 1; r -= 1) {
    let row = '';
    let gap = 0;
    for (const f of FILES) {
      const p = pieces[f + r];
      if (p) {
        if (gap) row += gap;
        gap = 0;
        row += p[0] === 'w' ? p[1] : p[1].toLowerCase();
      } else gap += 1;
    }
    rows.push(row + (gap || ''));
  }
  return rows.join('/');
}

/** Castling is allowed when king and rook still stand on their first squares (a puzzle can't tell us more). */
function castling(p) {
  let out = '';
  if (p.e1 === 'wK' && p.h1 === 'wR') out += 'K';
  if (p.e1 === 'wK' && p.a1 === 'wR') out += 'Q';
  if (p.e8 === 'bK' && p.h8 === 'bR') out += 'k';
  if (p.e8 === 'bK' && p.a8 === 'bR') out += 'q';
  return out || '-';
}

export function setupFen(pieces, side = 'w') {
  return `${placement(pieces)} ${side} ${castling(pieces)} - 0 1`;
}

/** '' when the position can go on the board, else what to fix, in plain words. */
export function setupProblem(pieces, side = 'w') {
  const all = Object.entries(pieces);
  const count = (code) => all.filter(([, p]) => p === code).length;
  if (count('wK') !== 1 || count('bK') !== 1) return 'Each side needs exactly one king.';
  if (all.some(([sq, p]) => p[1] === 'P' && /[18]$/.test(sq))) return 'Pawns can’t stand on the first or last row.';
  for (const c of 'wb') {
    if (all.filter(([, p]) => p[0] === c).length > 16) return `${c === 'w' ? 'White' : 'Black'} has more than 16 pieces.`;
    if (count(`${c}P`) > 8) return `${c === 'w' ? 'White' : 'Black'} has more than 8 pawns.`;
  }
  const other = side === 'w' ? 'b' : 'w';
  try {
    // The side that just moved can't be left in check.
    if (new Chess(setupFen(pieces, other)).inCheck()) return `${other === 'w' ? 'White' : 'Black'} is in check but it’s ${side === 'w' ? 'White' : 'Black'}’s move. Change who is to move, or fix the pieces.`;
    new Chess(setupFen(pieces, side));
  } catch {
    return 'That position isn’t possible. Check the pieces.';
  }
  return '';
}

/**
 * The pop-up: a board to tap pieces onto. `onDone(fen)` gets the position.
 * `getCurrent()` gives the FEN on the page's own board, to start from it.
 */
export function createSetup({ dialog, onDone, getCurrent = () => '' }) {
  const q = (sel) => dialog.querySelector(sel);
  const grid = q('[data-setup-board]');
  const tray = q('[data-setup-tray]');
  const note = q('[data-setup-note]');
  let pieces = {};
  let side = 'w';
  let flipped = false;
  let hand = 'wP';

  tray.innerHTML =
    PIECES.map((code) => `<button class="setup__pick" type="button" role="radio" aria-checked="false" data-pick="${code}" aria-label="${pieceName(code)}"><img src="${PIECE_BASE}${code}.svg" alt="" width="40" height="40" draggable="false"></button>`).join('') +
    '<button class="setup__pick setup__pick--rub" type="button" role="radio" aria-checked="false" data-pick="" aria-label="Remove a piece">✕<span>remove</span></button>';

  function draw() {
    const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
    const files = flipped ? [...FILES].reverse() : [...FILES];
    grid.innerHTML = ranks
      .flatMap((r) =>
        files.map((f) => {
          const sq = f + r;
          const p = pieces[sq];
          const dark = (FILES.indexOf(f) + r) % 2 === 0;
          return `<button class="setup__sq${dark ? ' setup__sq--dark' : ''}" type="button" data-sq="${sq}" aria-label="${sq}${p ? `, ${pieceName(p)}` : ', empty'}">${p ? `<img src="${PIECE_BASE}${p}.svg" alt="" draggable="false">` : ''}</button>`;
        }),
      )
      .join('');
    for (const b of tray.querySelectorAll('[data-pick]')) b.setAttribute('aria-checked', String(b.dataset.pick === hand));
    for (const b of dialog.querySelectorAll('[data-side]')) b.setAttribute('aria-checked', String(b.dataset.side === side));
    const problem = setupProblem(pieces, side);
    q('[data-setup-done]').disabled = Boolean(problem);
    note.textContent = Object.keys(pieces).length ? problem : 'Pick a piece below, then tap the squares it goes on.';
    note.classList.toggle('note-hand--red', Boolean(problem && Object.keys(pieces).length));
  }

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sq]');
    if (!b) return;
    const sq = b.dataset.sq;
    // Tapping a square that already has the piece in hand takes it off again.
    if (!hand || pieces[sq] === hand) delete pieces[sq];
    else {
      // Only one king a side: placing it again moves it.
      if (hand[1] === 'K') for (const [s, p] of Object.entries(pieces)) if (p === hand) delete pieces[s];
      pieces[sq] = hand;
    }
    draw();
    grid.querySelector(`[data-sq="${sq}"]`)?.focus({ preventScroll: true });
  });
  tray.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    hand = b.dataset.pick;
    draw();
  });
  for (const b of dialog.querySelectorAll('[data-side]')) {
    b.addEventListener('click', () => {
      side = b.dataset.side;
      // Chess.com's app shows the board from the side to move: match it, so copying is square for square.
      flipped = side === 'b';
      draw();
    });
  }
  q('[data-setup-flip]').addEventListener('click', () => {
    flipped = !flipped;
    draw();
  });
  q('[data-setup-clear]').addEventListener('click', () => {
    pieces = {};
    draw();
  });
  q('[data-setup-start]').addEventListener('click', () => {
    pieces = startPieces();
    side = 'w';
    flipped = false;
    draw();
  });
  q('[data-setup-here]').addEventListener('click', () => {
    const fen = getCurrent();
    if (!fen) return;
    pieces = fromPlacement(fen);
    side = fen.split(' ')[1] === 'b' ? 'b' : 'w';
    flipped = side === 'b';
    draw();
  });
  q('[data-setup-done]').addEventListener('click', () => {
    if (setupProblem(pieces, side)) return;
    const fen = setupFen(pieces, side);
    close();
    onDone(fen);
  });
  q('[data-setup-close]').addEventListener('click', () => close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  function close() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  return {
    open() {
      draw();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    },
  };
}
