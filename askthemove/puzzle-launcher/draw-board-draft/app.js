// Puzzle Sandbox: load the Chess.com daily puzzle and move the pieces yourself.
// No engine. The solution stays in memory and is shown only when asked.
import { Chess } from './chess.js';

const API = 'https://api.chess.com/pub/puzzle';
const FILES = 'abcdefgh';
const INK = { red: '#d6402f', blue: '#2f62d6', green: '#1f9a55', yellow: '#e8b51c' };
const $ = (id) => document.getElementById(id);

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

const el = {
  board: $('board'), squares: $('squares'), pieces: $('pieces'), promo: $('promo'), ink: $('ink'),
  turn: $('turn'), turnText: $('turn-text'), note: $('note'), date: $('date'),
  moves: $('moves'), movesEmpty: $('moves-empty'),
  undo: $('btn-undo'), redo: $('btn-redo'), reset: $('btn-reset'), flip: $('btn-flip'), draw: $('btn-draw'),
  drawbar: $('drawbar'),
};

const state = {
  puzzle: null,      // { key, url, fen, dateLabel, title, pgn, source }
  game: new Chess(),
  startFen: '',
  redo: [],          // moves taken back, newest last
  orientation: 'white',
  selected: null,
  targets: new Map(),// square -> [moves]
  lastMove: null,
  drawing: false,
  tool: 'pen',
  color: 'red',
  strokes: [],       // drawn marks, in white-side board units (0..800)
  sawPen: false,
};

/* ---------- Board geometry ---------- */
function toXY(sq) {
  const f = FILES.indexOf(sq[0]); const r = Number(sq[1]);
  return state.orientation === 'white' ? [f, 8 - r] : [7 - f, r - 1];
}
function toSquare(x, y) {
  return state.orientation === 'white' ? FILES[x] + (8 - y) : FILES[7 - x] + (y + 1);
}
function pointToSquare(e) {
  const r = el.board.getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * 8);
  const y = Math.floor(((e.clientY - r.top) / r.height) * 8);
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  return toSquare(x, y);
}

/* ---------- Squares ---------- */
const sqEls = new Map();
function buildSquares() {
  el.squares.textContent = '';
  sqEls.clear();
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const sq = toSquare(x, y);
      const d = document.createElement('div');
      const dark = (FILES.indexOf(sq[0]) + Number(sq[1])) % 2 === 0;
      d.className = `sq ${dark ? 'dark' : 'light'}`;
      d.dataset.sq = sq;
      if (y === 7) d.insertAdjacentHTML('beforeend', `<span class="coord file">${sq[0]}</span>`);
      if (x === 0) d.insertAdjacentHTML('beforeend', `<span class="coord rank">${sq[1]}</span>`);
      el.squares.append(d);
      sqEls.set(sq, d);
    }
  }
}

/* ---------- Pieces: reuse elements so moves, undo and castling slide ---------- */
let pieceEls = new Map(); // square -> element
function place(node, sq) {
  const [x, y] = toXY(sq);
  node.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
}
function renderPieces() {
  const want = new Map();
  for (const row of state.game.board()) for (const p of row) if (p) want.set(p.square, p.color + p.type.toUpperCase());
  const next = new Map();
  const spare = [];
  for (const [sq, node] of pieceEls) {
    if (want.get(sq) === node.dataset.code) next.set(sq, node);
    else spare.push(node);
  }
  for (const [sq, code] of want) {
    if (next.has(sq)) continue;
    // Reuse the nearest spare piece of the same kind, so it slides into place.
    let best = -1; let bestDist = Infinity;
    const [tx, ty] = toXY(sq);
    spare.forEach((n, i) => {
      if (n.dataset.code !== code) return;
      const [x, y] = toXY(n.dataset.sq);
      const dist = Math.hypot(x - tx, y - ty);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    let node;
    if (best >= 0) node = spare.splice(best, 1)[0];
    else {
      node = document.createElement('div');
      node.className = 'pc';
      node.dataset.code = code;
      node.style.backgroundImage = `url(pieces/${code}.svg)`;
      node.style.transition = 'none';
      place(node, sq);
      el.pieces.append(node);
      node.getBoundingClientRect();
      node.style.transition = '';
    }
    node.dataset.sq = sq;
    node.classList.remove('dragging');
    place(node, sq);
    next.set(sq, node);
  }
  for (const n of spare) {
    n.classList.add('gone');
    setTimeout(() => n.remove(), 180);
  }
  pieceEls = next;
}

/* ---------- Highlights ---------- */
function renderMarks() {
  for (const [sq, d] of sqEls) {
    d.classList.toggle('sel', sq === state.selected);
    d.classList.toggle('last', !!state.lastMove && (sq === state.lastMove.from || sq === state.lastMove.to));
    d.classList.remove('check');
    d.querySelectorAll('.dot,.ring').forEach((n) => n.remove());
  }
  if (state.game.inCheck()) {
    const turn = state.game.turn();
    for (const row of state.game.board()) for (const p of row) {
      if (p && p.type === 'k' && p.color === turn) sqEls.get(p.square).classList.add('check');
    }
  }
  for (const [sq, ms] of state.targets) {
    const mark = document.createElement('span');
    mark.className = ms[0].captured ? 'ring' : 'dot';
    sqEls.get(sq).append(mark);
  }
}

function render() {
  renderPieces();
  renderMarks();
  renderStatus();
  renderMoves();
  renderInk();
  save();
}

/* ---------- Status and move list ---------- */
function sideName(c) { return c === 'w' ? 'White' : 'Black'; }
function renderStatus() {
  const g = state.game;
  const turn = g.turn();
  el.turn.dataset.side = turn;
  el.turnText.textContent = `${sideName(turn)} to move`;
  let note = ''; let tone = 'blue';
  if (g.isCheckmate()) { note = `Checkmate! ${sideName(turn === 'w' ? 'b' : 'w')} wins.`; tone = 'red'; }
  else if (g.isStalemate()) note = 'Stalemate. It’s a draw.';
  else if (g.isDraw()) note = 'That’s a draw.';
  else if (g.inCheck()) { note = 'Check!'; tone = 'red'; }
  setNote(note, tone);
  el.undo.disabled = g.history().length === 0;
  el.redo.disabled = state.redo.length === 0;
  el.reset.disabled = g.history().length === 0 && state.redo.length === 0;
}
let noteTimer = 0;
function setNote(text, tone = 'blue', ms = 0) {
  clearTimeout(noteTimer);
  el.note.textContent = text;
  el.note.dataset.tone = tone;
  if (ms) noteTimer = setTimeout(renderStatus, ms);
}

function startNumbers() {
  const parts = state.startFen.split(' ');
  return { side: parts[1] || 'w', num: Number(parts[5]) || 1 };
}
function renderMoves() {
  const played = state.game.history();
  const future = [...state.redo].reverse().map((m) => m.san);
  const all = [...played.map((san) => ({ san, future: false })), ...future.map((san) => ({ san, future: true }))];
  el.moves.textContent = '';
  el.movesEmpty.hidden = all.length > 0;
  let { side, num } = startNumbers();
  all.forEach((m, i) => {
    const li = document.createElement('li');
    if (m.future) li.className = 'future';
    if (side === 'w') li.insertAdjacentHTML('beforeend', `<span class="num">${num}.</span>`);
    else if (i === 0) li.insertAdjacentHTML('beforeend', `<span class="num">${num}…</span>`);
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = m.san;
    b.setAttribute('aria-current', String(i === played.length - 1));
    b.addEventListener('click', () => jumpTo(i + 1));
    li.append(b);
    el.moves.append(li);
    if (side === 'b') num += 1;
    side = side === 'w' ? 'b' : 'w';
  });
}

/* ---------- Moving ---------- */
function select(sq) {
  state.selected = sq;
  state.targets = new Map();
  if (sq) {
    for (const m of state.game.moves({ square: sq, verbose: true })) {
      if (!state.targets.has(m.to)) state.targets.set(m.to, []);
      state.targets.get(m.to).push(m);
    }
  }
  renderMarks();
}

async function tryMove(from, to) {
  const options = state.targets.get(to);
  if (!options) return false;
  let promotion;
  if (options.some((m) => m.promotion)) {
    promotion = await pickPromotion(state.game.turn());
    if (!promotion) { select(null); renderPieces(); return false; }
  }
  const move = state.game.move({ from, to, promotion });
  state.redo = [];
  state.lastMove = move;
  select(null);
  buzz();
  render();
  return true;
}

function buzz() { try { navigator.vibrate?.(8); } catch { /* not supported */ } }

function pickPromotion(color) {
  return new Promise((resolve) => {
    el.promo.textContent = '';
    const box = document.createElement('div');
    box.className = 'promo__box';
    for (const t of ['q', 'r', 'b', 'n']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.backgroundImage = `url(pieces/${color}${t.toUpperCase()}.svg)`;
      b.setAttribute('aria-label', { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[t]);
      b.addEventListener('click', (e) => { e.stopPropagation(); done(t); });
      box.append(b);
    }
    el.promo.append(box);
    el.promo.hidden = false;
    const cancel = (e) => { if (e.target === el.promo) done(null); };
    el.promo.addEventListener('pointerdown', cancel);
    function done(v) { el.promo.hidden = true; el.promo.removeEventListener('pointerdown', cancel); resolve(v); }
  });
}

function undo() {
  const m = state.game.undo();
  if (!m) return;
  state.redo.push(m);
  afterJump();
}
function redo() {
  const m = state.redo.pop();
  if (!m) return;
  state.game.move({ from: m.from, to: m.to, promotion: m.promotion });
  afterJump();
}
function jumpTo(ply) {
  while (state.game.history().length > ply) state.redo.push(state.game.undo());
  while (state.game.history().length < ply && state.redo.length) {
    const m = state.redo.pop();
    state.game.move({ from: m.from, to: m.to, promotion: m.promotion });
  }
  afterJump();
}
function reset() { jumpTo(0); }
function afterJump() {
  const h = state.game.history({ verbose: true });
  state.lastMove = h[h.length - 1] || null;
  select(null);
  render();
}
function flip() {
  state.orientation = state.orientation === 'white' ? 'black' : 'white';
  buildSquares();
  for (const [sq, n] of pieceEls) place(n, sq);
  renderMarks();
  renderInk();
}

/* ---------- Pointer input: tap-tap or drag ---------- */
let drag = null;
el.board.addEventListener('pointerdown', (e) => {
  if (state.drawing || !el.promo.hidden) return;
  if (e.button > 0) return;
  const sq = pointToSquare(e);
  if (!sq) return;
  const piece = state.game.get(sq);
  const mine = piece && piece.color === state.game.turn();
  if (state.selected && state.targets.has(sq) && !mine) {
    tryMove(state.selected, sq);
    return;
  }
  if (mine) {
    const wasSelected = state.selected === sq;
    select(sq);
    const node = pieceEls.get(sq);
    drag = { sq, node, x0: e.clientX, y0: e.clientY, moved: false, wasSelected, id: e.pointerId };
    try { el.board.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    e.preventDefault();
    return;
  }
  if (piece && state.game.history().length === 0 && state.redo.length === 0) {
    setNote(`It’s ${sideName(state.game.turn())}’s move first.`, 'blue', 1800);
  } else if (piece) {
    setNote(`${sideName(state.game.turn())} to move.`, 'blue', 1500);
  }
  select(null);
});

let hoverSq = null;
function setHover(sq) {
  if (hoverSq === sq) return;
  if (hoverSq) sqEls.get(hoverSq)?.classList.remove('hover');
  hoverSq = sq;
  if (sq) sqEls.get(sq)?.classList.add('hover');
}

el.board.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
  drag.moved = true;
  const r = el.board.getBoundingClientRect();
  const size = r.width / 8;
  // Lift a touch-dragged piece a little so the finger doesn't hide it.
  const lift = e.pointerType === 'touch' ? size * 0.35 : 0;
  const px = e.clientX - r.left - size / 2;
  const py = e.clientY - r.top - size / 2 - lift;
  drag.node.classList.add('dragging');
  drag.node.style.transform = `translate(${px}px, ${py}px) scale(1.12)`;
  const over = pointToSquare({ clientX: e.clientX, clientY: e.clientY - lift });
  setHover(over && state.targets.has(over) ? over : null);
});

function endDrag(e, cancelled) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  setHover(null);
  if (!d.moved) {
    if (d.wasSelected) select(null);
    return;
  }
  d.node.classList.remove('dragging');
  d.node.classList.add('snap');
  setTimeout(() => d.node.classList.remove('snap'), 120);
  const lift = e.pointerType === 'touch' ? el.board.getBoundingClientRect().width / 8 * 0.35 : 0;
  const to = cancelled ? null : pointToSquare({ clientX: e.clientX, clientY: e.clientY - lift });
  if (to && state.targets.has(to)) tryMove(d.sq, to);
  else { place(d.node, d.sq); }
}
el.board.addEventListener('pointerup', (e) => endDrag(e, false));
el.board.addEventListener('pointercancel', (e) => endDrag(e, true));

/* ---------- Draw layer ---------- */
const SVGNS = 'http://www.w3.org/2000/svg';
let pen = null;
function inkPoint(e) {
  const r = el.ink.getBoundingClientRect();
  let x = ((e.clientX - r.left) / r.width) * 800;
  let y = ((e.clientY - r.top) / r.height) * 800;
  if (state.orientation === 'black') { x = 800 - x; y = 800 - y; }
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}
function view([x, y]) { return state.orientation === 'black' ? [800 - x, 800 - y] : [x, y]; }
function squareCentre(sq) {
  const f = FILES.indexOf(sq[0]); const r = Number(sq[1]);
  return [f * 100 + 50, (8 - r) * 100 + 50];
}
function squareFromWhitePoint([x, y]) {
  const f = Math.floor(x / 100); const r = 8 - Math.floor(y / 100);
  if (f < 0 || f > 7 || r < 1 || r > 8) return null;
  return FILES[f] + r;
}

function setDrawing(on) {
  state.drawing = on;
  el.board.classList.toggle('drawing', on);
  el.draw.setAttribute('aria-pressed', String(on));
  el.drawbar.hidden = !on;
  if (on) select(null);
  setNote(on ? 'Drawing on. Pieces won’t move.' : '', 'red', on ? 0 : 1);
  if (!on) renderStatus();
}

el.ink.addEventListener('pointerdown', (e) => {
  if (!state.drawing) return;
  if (e.pointerType === 'pen') state.sawPen = true;
  // With Apple Pencil, ignore the palm resting on the screen.
  if (state.sawPen && e.pointerType === 'touch') return;
  if (pen) return;
  e.preventDefault();
  try { el.ink.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  const p = inkPoint(e);
  if (state.tool === 'pen') {
    pen = { id: e.pointerId, stroke: { kind: 'pen', color: state.color, pts: [p] } };
    state.strokes.push(pen.stroke);
  } else {
    const from = squareFromWhitePoint(p);
    if (!from) return;
    pen = { id: e.pointerId, stroke: { kind: 'arrow', color: state.color, from, to: from } };
    state.strokes.push(pen.stroke);
  }
  renderInk();
});
el.ink.addEventListener('pointermove', (e) => {
  if (!pen || e.pointerId !== pen.id) return;
  const p = inkPoint(e);
  if (pen.stroke.kind === 'pen') {
    const last = pen.stroke.pts[pen.stroke.pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 3) return;
    pen.stroke.pts.push(p);
  } else {
    const to = squareFromWhitePoint(p);
    if (!to || to === pen.stroke.to) return;
    pen.stroke.to = to;
  }
  renderInk();
});
function endPen(e) {
  if (!pen || e.pointerId !== pen.id) return;
  const s = pen.stroke; pen = null;
  if (s.kind === 'arrow') {
    // Same arrow or circle drawn twice in a row? Treat the second as "remove it".
    const dupe = state.strokes.findIndex((o) => o !== s && o.kind === 'arrow' && o.from === s.from && o.to === s.to);
    if (dupe >= 0) { state.strokes.splice(dupe, 1); state.strokes.pop(); }
  }
  renderInk();
  save();
}
el.ink.addEventListener('pointerup', endPen);
el.ink.addEventListener('pointercancel', endPen);

function smoothPath(pts) {
  const v = pts.map(view);
  if (v.length === 1) return `M${v[0][0]} ${v[0][1]} l0.1 0`;
  let d = `M${v[0][0]} ${v[0][1]}`;
  for (let i = 1; i < v.length - 1; i++) {
    const mx = (v[i][0] + v[i + 1][0]) / 2; const my = (v[i][1] + v[i + 1][1]) / 2;
    d += ` Q${v[i][0]} ${v[i][1]} ${mx} ${my}`;
  }
  const l = v[v.length - 1];
  return `${d} L${l[0]} ${l[1]}`;
}
function renderInk() {
  el.ink.textContent = '';
  for (const s of state.strokes) {
    const colour = INK[s.color] || INK.red;
    if (s.kind === 'pen') {
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', smoothPath(s.pts));
      p.setAttribute('stroke', colour);
      p.setAttribute('stroke-width', '9');
      p.setAttribute('opacity', '0.9');
      el.ink.append(p);
    } else if (s.from === s.to) {
      const [cx, cy] = view(squareCentre(s.from));
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', '44');
      c.setAttribute('stroke', colour); c.setAttribute('stroke-width', '7'); c.setAttribute('opacity', '0.85');
      el.ink.append(c);
    } else {
      const [x1, y1] = view(squareCentre(s.from));
      const [x2, y2] = view(squareCentre(s.to));
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const head = 34; const back = 30;
      const ex = x2 - Math.cos(ang) * back; const ey = y2 - Math.sin(ang) * back;
      const line = document.createElementNS(SVGNS, 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', ex); line.setAttribute('y2', ey);
      line.setAttribute('stroke', colour); line.setAttribute('stroke-width', '16'); line.setAttribute('opacity', '0.8');
      const tip = document.createElementNS(SVGNS, 'path');
      const lx = x2 - Math.cos(ang) * head * 1.3 + Math.sin(ang) * head;
      const ly = y2 - Math.sin(ang) * head * 1.3 - Math.cos(ang) * head;
      const rx = x2 - Math.cos(ang) * head * 1.3 - Math.sin(ang) * head;
      const ry = y2 - Math.sin(ang) * head * 1.3 + Math.cos(ang) * head;
      const tx = x2 - Math.cos(ang) * 6; const ty = y2 - Math.sin(ang) * 6;
      tip.setAttribute('d', `M${tx} ${ty} L${lx} ${ly} L${rx} ${ry} Z`);
      tip.setAttribute('class', 'head');
      tip.setAttribute('fill', colour); tip.setAttribute('opacity', '0.8');
      el.ink.append(line, tip);
    }
  }
}

el.draw.addEventListener('click', () => setDrawing(!state.drawing));
for (const t of ['pen', 'arrow']) {
  $(`tool-${t}`).addEventListener('click', () => {
    state.tool = t;
    $('tool-pen').setAttribute('aria-pressed', String(t === 'pen'));
    $('tool-arrow').setAttribute('aria-pressed', String(t === 'arrow'));
  });
}
document.querySelectorAll('.swatch').forEach((b) => b.addEventListener('click', () => {
  state.color = b.dataset.color;
  document.querySelectorAll('.swatch').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
}));
$('ink-undo').addEventListener('click', () => { state.strokes.pop(); renderInk(); save(); });
$('ink-clear').addEventListener('click', () => { state.strokes = []; renderInk(); save(); });

/* ---------- Loading positions ---------- */
function loadPosition(fen, puzzle, saved) {
  const g = new Chess(fen); // throws on a bad FEN
  state.game = g;
  state.startFen = g.fen();
  state.puzzle = puzzle;
  state.redo = [];
  state.lastMove = null;
  state.strokes = [];
  state.orientation = g.turn() === 'w' ? 'white' : 'black';
  // Put back the line you were trying last time, if any.
  if (saved && Array.isArray(saved.line)) {
    for (const san of saved.line) { try { g.move(san); } catch { break; } }
    if (Array.isArray(saved.ink)) state.strokes = saved.ink;
    if (saved.orientation) state.orientation = saved.orientation;
    const h = g.history({ verbose: true });
    state.lastMove = h[h.length - 1] || null;
  }
  el.pieces.textContent = '';
  pieceEls = new Map();
  buildSquares();
  select(null);
  resetAnswer();
  updateLinks();
  render();
}

function save() {
  if (!state.puzzle) return;
  store.set(`pb:pos:${state.puzzle.key}`, {
    line: state.game.history(),
    ink: state.strokes,
    orientation: state.orientation,
  });
}

function dateLabel(p) {
  const m = /\/daily\/(\d{4})-(\d{2})-(\d{2})/.exec(p.url || '');
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : new Date((p.publish_time || 0) * 1000);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

async function fetchPuzzle(kind) {
  const url = kind === 'random' ? `${API}/random` : API;
  const res = await fetch(url, { cache: kind === 'random' ? 'no-store' : 'default' });
  if (!res.ok) throw new Error(`Chess.com said ${res.status}`);
  const j = await res.json();
  if (!j.fen) throw new Error('No position in the reply');
  return { key: j.url || j.fen, url: j.url, fen: j.fen, title: j.title || '', pgn: j.pgn || '', dateLabel: dateLabel(j), source: kind };
}

function setSource(kind) {
  for (const k of ['today', 'random', 'paste']) $(`src-${k}`).setAttribute('aria-pressed', String(k === kind));
  $('paste-panel').hidden = kind !== 'paste';
}

async function loadFromApi(kind) {
  setSource(kind);
  el.date.textContent = kind === 'random' ? 'Loading a random puzzle…' : 'Loading today’s puzzle…';
  try {
    const p = await fetchPuzzle(kind);
    if (kind === 'today') store.set('pb:today', p);
    el.date.textContent = kind === 'random' ? `Random puzzle from ${p.dateLabel}` : `Daily puzzle, ${p.dateLabel}`;
    loadPosition(p.fen, p, store.get(`pb:pos:${p.key}`));
  } catch (err) {
    const cached = kind === 'today' ? store.get('pb:today') : null;
    if (cached) {
      el.date.textContent = `Offline. Showing the last puzzle I saved (${cached.dateLabel}).`;
      loadPosition(cached.fen, cached, store.get(`pb:pos:${cached.key}`));
    } else {
      el.date.textContent = 'Couldn’t reach Chess.com. Paste a position instead.';
      setSource('paste');
      if (!state.puzzle) loadPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { key: 'start', fen: '', url: '', pgn: '', title: '', source: 'paste' });
    }
  }
}

function normaliseFen(text, side) {
  const parts = text.trim().replace(/_/g, ' ').split(/\s+/).filter(Boolean);
  if (!parts.length) throw new Error('Paste a FEN first.');
  const fen = [parts[0], parts[1] || side, parts[2] || '-', parts[3] || '-', parts[4] || '0', parts[5] || '1'];
  return fen.join(' ');
}

$('paste-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const err = $('fen-err');
  err.textContent = '';
  try {
    const side = $('stm-b').checked ? 'b' : 'w';
    const fen = normaliseFen($('fen-input').value, side);
    loadPosition(fen, { key: `fen:${fen}`, fen, url: '', pgn: '', title: '', source: 'paste' });
    el.date.textContent = 'Your own position';
  } catch (x) {
    err.textContent = `That FEN doesn’t look right. ${x.message || ''}`.trim();
  }
});

$('src-today').addEventListener('click', () => loadFromApi('today'));
$('src-random').addEventListener('click', () => loadFromApi('random'));
$('src-paste').addEventListener('click', () => { setSource('paste'); $('fen-input').focus(); });

/* ---------- Links and copy ---------- */
function updateLinks() {
  const cc = $('link-chesscom');
  const isPuzzle = state.puzzle && state.puzzle.url;
  cc.hidden = !isPuzzle;
  if (isPuzzle) cc.href = state.puzzle.url;
}
$('link-lichess').addEventListener('click', (e) => {
  e.currentTarget.href = `https://lichess.org/analysis/standard/${state.game.fen().replace(/ /g, '_')}`;
});
$('btn-copy').addEventListener('click', async () => {
  const fen = state.game.fen();
  try { await navigator.clipboard.writeText(fen); setNote('FEN copied.', 'blue', 1500); }
  catch { $('fen-input').value = fen; setSource('paste'); setNote('Copy it from the box below.', 'blue', 2500); }
});

/* ---------- Answer: hidden until you ask twice ---------- */
function resetAnswer() {
  $('answer-closed').hidden = false;
  $('answer-confirm').hidden = true;
  $('answer-open').hidden = true;
  const has = !!(state.puzzle && state.puzzle.pgn);
  $('btn-answer').disabled = !has;
  $('btn-answer').textContent = has ? 'Show the answer' : 'No answer for your own position';
}
function solutionMoves() {
  const g = new Chess();
  g.loadPgn(state.puzzle.pgn);
  return g.history({ verbose: true });
}
$('btn-answer').addEventListener('click', () => { $('answer-closed').hidden = true; $('answer-confirm').hidden = false; });
$('btn-answer-no').addEventListener('click', resetAnswer);
$('btn-answer-yes').addEventListener('click', () => {
  $('answer-confirm').hidden = true;
  $('answer-open').hidden = false;
  $('answer-name').textContent = state.puzzle.title ? `“${state.puzzle.title}”` : '';
  try {
    const ms = solutionMoves();
    let { side, num } = startNumbers();
    const out = [];
    ms.forEach((m, i) => {
      if (side === 'w') out.push(`${num}. ${m.san}`);
      else out.push(i === 0 ? `${num}… ${m.san}` : m.san);
      if (side === 'b') num += 1;
      side = side === 'w' ? 'b' : 'w';
    });
    $('answer-line').textContent = out.join(' ');
  } catch {
    $('answer-line').textContent = 'Couldn’t read the answer from Chess.com’s data.';
  }
});
$('btn-answer-play').addEventListener('click', () => {
  try {
    const ms = solutionMoves();
    jumpTo(0);
    state.redo = [...ms].reverse();
    afterJump();
    setNote('Tap Forward to step through the answer.', 'blue', 3000);
  } catch { /* nothing to play */ }
});

/* ---------- Buttons and keys ---------- */
el.undo.addEventListener('click', undo);
el.redo.addEventListener('click', redo);
el.reset.addEventListener('click', reset);
el.flip.addEventListener('click', () => { flip(); save(); });
document.addEventListener('keydown', (e) => {
  if (e.target.closest('textarea, input')) return;
  if (e.key === 'ArrowLeft') undo();
  else if (e.key === 'ArrowRight') redo();
  else if (e.key === 'f' || e.key === 'F') { flip(); save(); }
  else if (e.key === 'r' || e.key === 'R') reset();
  else if (e.key === 'd' || e.key === 'D') setDrawing(!state.drawing);
  else if (e.key === 'Escape') { if (state.drawing) setDrawing(false); else select(null); }
});

buildSquares();
loadFromApi('today');
