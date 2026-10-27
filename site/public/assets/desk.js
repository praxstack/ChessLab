// The desk board on the puzzle page: a board the learner moves pieces on.
// Drag a piece or tap it and then its square. Only legal moves go through
// (chess.js keeps the rules); a move that isn't allowed slides back and the
// note under the board says why, with the reason drawn on the board in red pen.
// No engine here: engine.js is separate and only speaks when asked.
import { Chess } from './vendor/chess.js';
import { arrowPoints, sanHTML } from './board.js';
import { arrow, loop, seedFrom } from './ink.js';
import { whyNot, positionNote, pieceName } from './rules.js';
import * as sound from './sound.js';

const FILES = 'abcdefgh';
const PIECES = '/assets/pieces/';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const moving = () => !reduceMotion.matches;

function xy(sq, o) {
  const f = FILES.indexOf(sq[0]);
  const r = Number(sq[1]);
  return o === 'white' ? [f, 8 - r] : [7 - f, r - 1];
}
function squareAt(x, y, o) {
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  return o === 'white' ? `${FILES[x]}${8 - y}` : `${FILES[7 - x]}${y + 1}`;
}
const centre = (sq, o) => {
  const [x, y] = xy(sq, o);
  return [x * 10 + 5, y * 10 + 5];
};

// Coordinates inside the squares, the way Chess.com prints them: rank numbers
// down the left file, file letters along the bottom rank, each in the colour
// of the opposite square.
export function coordsHTML(o) {
  const files = o === 'white' ? 'abcdefgh' : 'hgfedcba';
  const ranks = o === 'white' ? '87654321' : '12345678';
  const tone = (x, y) => ((x + y) % 2 === 0 ? 'on-light' : 'on-dark');
  let out = '';
  for (let y = 0; y < 8; y += 1) out += `<span class="cc-co cc-co--rank ${tone(0, y)}" data-x="0" data-y="${y}">${ranks[y]}</span>`;
  for (let x = 0; x < 8; x += 1) out += `<span class="cc-co cc-co--file ${tone(x, 7)}" data-x="${x}" data-y="7">${files[x]}</span>`;
  return out;
}

function drawStrokes(svg, delay = 0) {
  if (!moving()) return;
  svg.querySelectorAll('.stroke').forEach((path, i) => {
    path.animate([{ strokeDashoffset: 1.01 }, { strokeDashoffset: 0 }], {
      duration: 340,
      delay: delay + i * 220,
      easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
      fill: 'backwards',
    });
  });
}

const group = (cls, paths) => `<g class="${cls}">${paths.map((d) => `<path class="stroke" pathLength="1" d="${d}"/>`).join('')}</g>`;

/**
 * els: { board, pieces, coords, marks, ink, promo, say, moves, undo, redo, reset, flip }
 * onChange(desk) runs after every move, take-back and new position.
 */
export function createDesk(els, { onChange = () => {} } = {}) {
  let game = null; // null while the position can't be played (chess.js refused it)
  let startFen = '';
  let orientation = 'white';
  let future = []; // moves taken back, newest last
  let selected = null;
  let targets = new Map(); // square -> legal moves to it
  let nodes = new Map(); // square -> piece element
  let drag = null;
  let hover = null;
  let busy = false; // the promotion picker is open

  /* ---------------------------------------------------------------- Drawing */

  function pieceNode(sq, code) {
    const img = document.createElement('img');
    img.className = 'pc';
    img.src = `${PIECES}${code}.svg`;
    img.alt = '';
    img.width = 45;
    img.height = 45;
    img.draggable = false;
    img.dataset.piece = code;
    place(img, sq);
    return img;
  }

  function place(node, sq) {
    const [x, y] = xy(sq, orientation);
    node.dataset.sq = sq;
    node.dataset.x = String(x);
    node.dataset.y = String(y);
  }

  function boardMap(fen) {
    const map = new Map();
    const rows = fen.split(/\s+/)[0].split('/');
    rows.forEach((row, i) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) f += Number(ch);
        else {
          map.set(`${FILES[f]}${8 - i}`, (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase());
          f += 1;
        }
      }
    });
    return map;
  }

  // Reuse piece elements, so a move, a take-back or castling slides the
  // pieces that moved and leaves the rest alone.
  function syncPieces() {
    const want = boardMap(game ? game.fen() : startFen);
    const next = new Map();
    const spare = [];
    for (const [sq, node] of nodes) {
      if (want.get(sq) === node.dataset.piece) next.set(sq, node);
      else spare.push(node);
    }
    for (const [sq, code] of want) {
      if (next.has(sq)) continue;
      const [tx, ty] = xy(sq, orientation);
      let best = -1;
      let dist = Infinity;
      spare.forEach((n, i) => {
        if (n.dataset.piece !== code) return;
        const d = Math.hypot(Number(n.dataset.x) - tx, Number(n.dataset.y) - ty);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      let node;
      if (best >= 0) {
        node = spare.splice(best, 1)[0];
        place(node, sq);
      } else {
        node = pieceNode(sq, code);
        els.pieces.append(node);
        if (moving()) node.animate([{ opacity: 0, scale: '0.8' }, { opacity: 1, scale: '1' }], { duration: 160, easing: 'ease-out' });
      }
      next.set(sq, node);
    }
    for (const n of spare) {
      if (moving()) n.animate([{ opacity: 1 }, { opacity: 0, scale: '0.85' }], { duration: 140, fill: 'forwards' }).finished.then(() => n.remove(), () => n.remove());
      else n.remove();
    }
    nodes = next;
  }

  function mark(cls, sq) {
    const [x, y] = xy(sq, orientation);
    return `<span class="dm ${cls}" data-x="${x}" data-y="${y}"></span>`;
  }

  function renderMarks() {
    let html = '';
    const last = game && game.history({ verbose: true }).at(-1);
    if (last) html += mark('dm--last', last.from) + mark('dm--last', last.to);
    if (selected) html += mark('dm--sel', selected);
    if (game && game.inCheck()) {
      for (const row of game.board()) for (const p of row) if (p && p.type === 'k' && p.color === game.turn()) html += mark('dm--check', p.square);
    }
    for (const [sq, ms] of targets) html += mark(ms[0].captured || ms[0].flags.includes('e') ? 'dm--ring' : 'dm--dot', sq);
    if (hover) html += mark('dm--hover', hover);
    els.marks.innerHTML = html;
  }

  function renderMoves() {
    const played = game ? game.history() : [];
    const later = [...future].reverse().map((m) => m.san);
    const all = [...played, ...later];
    els.moves.innerHTML = '';
    els.moves.hidden = all.length === 0;
    const [, side, , , , num] = startFen.split(/\s+/);
    let n = Number(num) || 1;
    let turn = side === 'b' ? 'b' : 'w';
    all.forEach((san, i) => {
      const li = document.createElement('li');
      if (i >= played.length) li.className = 'is-later';
      if (turn === 'w') li.insertAdjacentHTML('beforeend', `<span class="desk__num">${n}.</span>`);
      else if (i === 0) li.insertAdjacentHTML('beforeend', `<span class="desk__num">${n}…</span>`);
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = sanHTML(san);
      b.dataset.ply = String(i + 1);
      if (i === played.length - 1) b.setAttribute('aria-current', 'step');
      li.append(b);
      els.moves.append(li);
      if (turn === 'b') n += 1;
      turn = turn === 'w' ? 'b' : 'w';
    });
    const playedCount = played.length;
    els.undo.disabled = !game || playedCount === 0;
    els.redo.disabled = !game || future.length === 0;
    els.reset.disabled = !game || (playedCount === 0 && future.length === 0);
  }

  function clearInk() {
    els.ink.innerHTML = '';
  }

  function say(text, tone = '') {
    els.say.textContent = text || '';
    els.say.dataset.tone = tone;
    if (text && moving()) {
      els.say.animate([{ clipPath: 'inset(-0.3em 100% -0.45em 0)' }, { clipPath: 'inset(-0.3em -0.3em -0.45em -0.3em)' }], {
        duration: Math.min(1100, 160 + text.length * 14),
        easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
      });
    }
  }

  // The reason a move isn't allowed, drawn in red pen: the attacking line and the stuck piece.
  function drawWhy(why) {
    let svg = '';
    const seed = seedFrom(`${why.text}:${orientation}`);
    if (why.line) svg += group('mk tone--red', arrow(arrowPoints(why.line[0], why.line[1], orientation), { seed, head: 2.5 }));
    (why.squares || []).forEach((sq, i) => {
      const [cx, cy] = centre(sq, orientation);
      svg += group('mk tone--red', [loop(cx, cy, 4.7, 4.4, { seed: seed + i + 1, turns: 1.12, tilt: -0.15 })]);
    });
    els.ink.innerHTML = svg;
    drawStrokes(els.ink);
  }

  function after(move) {
    selected = null;
    targets = new Map();
    clearInk();
    syncPieces();
    renderMarks();
    renderMoves();
    const note = positionNote(game);
    say(note ? note.text : '', note ? note.tone : '');
    if (move) {
      const name = game.isCheckmate() || game.isDraw() ? 'end' : game.inCheck() ? 'check' : move.promotion ? 'promote' : move.flags.includes('k') || move.flags.includes('q') ? 'castle' : move.captured ? 'capture' : 'move';
      sound.play(name);
      sound.buzz(move.captured ? 14 : 8);
    }
    onChange(api);
  }

  /* ----------------------------------------------------------------- Moving */

  function select(sq) {
    selected = sq;
    targets = new Map();
    if (sq && game) {
      for (const m of game.moves({ square: sq, verbose: true })) {
        if (!targets.has(m.to)) targets.set(m.to, []);
        targets.get(m.to).push(m);
      }
    }
    renderMarks();
  }

  function pickPromotion(color) {
    return new Promise((resolve) => {
      busy = true;
      els.promo.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'desk__promo-card';
      const label = document.createElement('p');
      label.className = 'desk__promo-label';
      label.textContent = 'Promote to';
      card.append(label);
      for (const t of ['q', 'r', 'b', 'n']) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'desk__promo-pick';
        b.setAttribute('aria-label', pieceName(t));
        b.innerHTML = `<img src="${PIECES}${color}${t.toUpperCase()}.svg" alt="" width="45" height="45">`;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          done(t);
        });
        card.append(b);
      }
      els.promo.append(card);
      els.promo.hidden = false;
      card.querySelector('button').focus();
      const cancel = (e) => {
        if (e.target === els.promo) done(null);
      };
      const esc = (e) => {
        if (e.key === 'Escape') done(null);
      };
      els.promo.addEventListener('pointerdown', cancel);
      document.addEventListener('keydown', esc);
      function done(v) {
        busy = false;
        els.promo.hidden = true;
        els.promo.removeEventListener('pointerdown', cancel);
        document.removeEventListener('keydown', esc);
        resolve(v);
      }
    });
  }

  async function tryMove(from, to) {
    const options = targets.get(to);
    if (!options) {
      refuse(from, to);
      return false;
    }
    let promotion;
    if (options.some((m) => m.promotion)) {
      promotion = await pickPromotion(game.turn());
      if (!promotion) {
        select(null);
        syncPieces();
        return false;
      }
    }
    const move = game.move({ from, to, promotion });
    future = [];
    after(move);
    return true;
  }

  // A move that isn't allowed: say why, draw it, and put the piece back.
  function refuse(from, to) {
    const why = whyNot(game, from, to);
    sound.play('nope');
    if (why) {
      say(why.text, 'red');
      drawWhy(why);
    }
    const node = nodes.get(from);
    if (node) place(node, from);
    select(null);
  }

  function undo() {
    if (!game) return;
    const m = game.undo();
    if (!m) return;
    future.push(m);
    after(null);
    sound.play('move');
  }
  function redo() {
    if (!game) return;
    const m = future.pop();
    if (!m) return;
    const move = game.move({ from: m.from, to: m.to, promotion: m.promotion });
    after(move);
  }
  function jumpTo(ply) {
    if (!game) return;
    while (game.history().length > ply) future.push(game.undo());
    while (game.history().length < ply && future.length) {
      const m = future.pop();
      game.move({ from: m.from, to: m.to, promotion: m.promotion });
    }
    after(null);
    sound.play('move');
  }
  function reset() {
    jumpTo(0);
  }

  function setOrientation(o) {
    orientation = o;
    els.coords.innerHTML = coordsHTML(o);
    for (const [sq, n] of nodes) place(n, sq);
    clearInk();
    renderMarks();
  }

  /* ------------------------------------------------------- Touch and mouse */

  function pointSquare(clientX, clientY) {
    const r = els.board.getBoundingClientRect();
    return squareAt(Math.floor(((clientX - r.left) / r.width) * 8), Math.floor(((clientY - r.top) / r.height) * 8), orientation);
  }

  els.board.addEventListener('pointerdown', (e) => {
    sound.wake();
    if (!game || busy || e.button > 0) return;
    const sq = pointSquare(e.clientX, e.clientY);
    if (!sq) return;
    const p = game.get(sq);
    const mine = p && p.color === game.turn();
    if (selected && !mine) {
      // Second tap: a move to this square, or a reason it isn't one.
      tryMove(selected, sq);
      return;
    }
    if (!mine) {
      if (p) {
        say(`It’s ${game.turn() === 'w' ? 'White' : 'Black'}’s move.`, '');
        sound.play('nope');
      }
      select(null);
      return;
    }
    clearInk();
    const was = selected === sq;
    select(sq);
    sound.play('pick');
    drag = { sq, node: nodes.get(sq), x0: e.clientX, y0: e.clientY, moved: false, was, id: e.pointerId };
    try {
      els.board.setPointerCapture(e.pointerId);
    } catch {
      /* fine without it */
    }
    e.preventDefault();
  });

  els.board.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
    drag.moved = true;
    const r = els.board.getBoundingClientRect();
    const size = r.width / 8;
    // A finger hides what's under it, so a touch-dragged piece rides a little above it.
    const lift = e.pointerType === 'touch' ? size * 0.45 : 0;
    const px = e.clientX - r.left - size / 2;
    const py = e.clientY - r.top - size / 2 - lift;
    drag.node.classList.add('is-drag');
    drag.node.style.transform = `translate(${px}px, ${py}px) scale(1.12)`;
    const over = pointSquare(e.clientX, e.clientY - lift);
    if (over !== hover) {
      hover = over && over !== drag.sq ? over : null;
      renderMarks();
    }
  });

  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    hover = null;
    if (!d.moved) {
      if (d.was) select(null); // tapping the chosen piece again puts it down
      return;
    }
    const r = els.board.getBoundingClientRect();
    const lift = e.pointerType === 'touch' ? (r.width / 8) * 0.45 : 0;
    const to = cancelled ? null : pointSquare(e.clientX, e.clientY - lift);
    // Let go: the piece settles onto its square quickly, not in a slow glide.
    d.node.classList.remove('is-drag');
    d.node.classList.add('is-snap');
    d.node.style.transform = '';
    setTimeout(() => d.node.classList.remove('is-snap'), 120);
    if (!to || to === d.sq) {
      select(d.sq);
      return;
    }
    tryMove(d.sq, to);
  }
  els.board.addEventListener('pointerup', (e) => endDrag(e, false));
  els.board.addEventListener('pointercancel', (e) => endDrag(e, true));
  els.board.addEventListener('lostpointercapture', (e) => endDrag(e, true));

  els.undo.addEventListener('click', undo);
  els.redo.addEventListener('click', redo);
  els.reset.addEventListener('click', reset);
  els.flip.addEventListener('click', () => setOrientation(orientation === 'white' ? 'black' : 'white'));
  els.moves.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-ply]');
    if (b) jumpTo(Number(b.dataset.ply));
  });
  document.addEventListener('keydown', (e) => {
    if (busy || e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (!els.board.closest('section').matches(':hover') && !els.board.closest('section').contains(document.activeElement)) return;
    if (e.key === 'ArrowLeft') undo();
    else if (e.key === 'ArrowRight') redo();
    else return;
    e.preventDefault();
  });

  /* ---------------------------------------------------------------- Loading */

  // Put a new position on the board. Pieces are set out like a person would:
  // the far side first, row by row, towards you.
  async function load(fen) {
    startFen = fen;
    future = [];
    selected = null;
    targets = new Map();
    hover = null;
    try {
      game = new Chess(fen);
    } catch {
      game = null; // shown, but not playable: chess.js refuses positions that can't happen in a game
    }
    const old = [...els.pieces.children];
    if (old.length && moving()) {
      await Promise.all(old.map((n) => n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }).finished.catch(() => {})));
    }
    els.pieces.innerHTML = '';
    nodes = new Map();
    orientation = fen.split(/\s+/)[1] === 'b' ? 'black' : 'white';
    els.coords.innerHTML = coordsHTML(orientation);
    clearInk();
    syncPieces();
    renderMarks();
    renderMoves();
    const note = game ? positionNote(game) : null;
    say(game ? (note ? note.text : '') : 'This position can’t come up in a real game, so the pieces can’t move here. It still opens on Chess.com.', game ? (note ? note.tone : '') : 'red');
    if (moving()) {
      [...els.pieces.children]
        .sort((a, b) => a.dataset.y - b.dataset.y || a.dataset.x - b.dataset.x)
        .forEach((img, i) => {
          img.animate([{ opacity: 0, translate: '0 -14%' }, { opacity: 1, translate: '0 0' }], {
            duration: 260,
            delay: i * 24,
            easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
            fill: 'backwards',
          });
        });
    }
    onChange(api);
  }

  /** Point an arrow at a move on the board, in blue pen (the engine's move, when asked for). */
  function showArrow(from, to) {
    els.ink.innerHTML = group('mk tone--blue', arrow(arrowPoints(from, to, orientation), { seed: seedFrom(`best:${from}${to}`), head: 2.6 }));
    drawStrokes(els.ink);
  }

  const api = {
    load,
    undo,
    showArrow,
    say,
    get playable() {
      return Boolean(game);
    },
    get fen() {
      return game ? game.fen() : startFen;
    },
    get startFen() {
      return startFen;
    },
    get orientation() {
      return orientation;
    },
    /** The last move made, with the position before it, or null. */
    lastMove() {
      if (!game) return null;
      const h = game.history({ verbose: true });
      return h.length ? h[h.length - 1] : null;
    },
    get over() {
      return Boolean(game && game.isGameOver());
    },
    get turn() {
      return game ? game.turn() : startFen.split(/\s+/)[1] || 'w';
    },
  };
  return api;
}
