// Puzzle analyzr (/puzzleanalyzr/): puts a chess position on the desk board and
// opens it on Chess.com's analysis board, where the learner moves the pieces.
// Reads only public APIs: Chess.com's daily puzzle and game archives, Lichess
// puzzles, games and studies, and a small list of saved daily puzzles that a
// GitHub Action keeps (date -> position). A puzzle's answer and its name are
// never read or shown.
import { parsePlacement, pieceHTML } from './board.js';
import { markSVG, seedFrom } from './ink.js';

const API = 'https://api.chess.com/pub';
const ARCHIVE = 'https://raw.githubusercontent.com/praxstack/ChessLab/puzzle-archive/puzzles.json';
const DAILY_PAGE = 'https://www.chess.com/daily';
const analysisUrl = (fen) => `https://www.chess.com/analysis?fen=${encodeURIComponent(fen)}`;
const explorerUrl = (fen) => `https://www.chess.com/analysis/explorer?fen=${encodeURIComponent(fen)}`;
const pgnUrl = (pgn) => `https://www.chess.com/analysis?pgn=${encodeURIComponent(pgn)}`;
const gameUrl = (type, id) => `https://www.chess.com/analysis/game/${type}/${id}`;

const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const moving = () => !reduceMotion.matches;
const store = {
  get(k) {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* private mode: nothing is remembered, everything still works */
    }
  },
};

/* ------------------------------------------------------------ Small helpers */

const blackToMove = (fen) => fen.split(/\s+/)[1] === 'b';
const sideText = (fen) => (blackToMove(fen) ? 'Black to move' : 'White to move');

function utcDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
const fmt = (iso, opts) => utcDate(iso).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
const longDate = (iso) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const shortDate = (iso) => fmt(iso, { day: 'numeric', month: 'short' });
const isoOf = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
function localIso() {
  const now = new Date();
  return isoOf(now.getFullYear(), now.getMonth(), now.getDate());
}

function say(id, text, tone = '') {
  const el = $(id);
  el.textContent = text || '';
  el.dataset.tone = tone;
}

async function getJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' } });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

async function copy(text, statusId, done) {
  try {
    await navigator.clipboard.writeText(text);
    say(statusId, done);
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    t.setAttribute('readonly', '');
    t.className = 'pz-offscreen';
    document.body.append(t);
    t.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    t.remove();
    say(statusId, ok ? done : `Copy didn’t work here. Long-press to copy it: ${text}`, ok ? '' : 'red');
  }
}

/* ---------------------------------------------------------------- The pen
 * Marks and notes made after the page loads are drawn the same way app.js
 * draws the ones in the HTML: strokes trace in, words are written left to right.
 */

function drawStrokes(svg, delay = 0) {
  if (!moving()) return;
  svg.querySelectorAll('.stroke').forEach((path, i) => {
    path.animate([{ strokeDashoffset: 1.01 }, { strokeDashoffset: 0 }], {
      duration: 380,
      delay: delay + i * 300,
      easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
      fill: 'backwards',
    });
  });
}

function writeIn(el) {
  if (!moving() || el.hidden || !el.textContent.trim()) return;
  el.animate([{ clipPath: 'inset(-0.3em 100% -0.45em 0)' }, { clipPath: 'inset(-0.3em -0.3em -0.45em -0.3em)' }], {
    duration: Math.min(1400, 180 + el.textContent.length * 26),
    easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
    fill: 'backwards',
  });
}

/* ------------------------------------------------------------------ Paste:
 * work out what a piece of text is, and where it should open.
 */

const FEN_BOARD = /^([pnbrqkPNBRQK1-8]{1,8}\/){7}[pnbrqkPNBRQK1-8]{1,8}$/;

export function cleanFen(text) {
  const parts = text.trim().replace(/_/g, ' ').split(/\s+/);
  if (!FEN_BOARD.test(parts[0])) return null;
  const ranksOk = parts[0].split('/').every((r) => [...r].reduce((n, c) => n + (/\d/.test(c) ? Number(c) : 1), 0) === 8);
  if (!ranksOk) return null;
  const side = parts[1] === 'b' ? 'b' : 'w';
  const castle = parts[2] && /^(-|[KQkqA-Ha-h]{1,4})$/.test(parts[2]) ? parts[2] : '-';
  const ep = parts[3] && /^(-|[a-h][36])$/.test(parts[3]) ? parts[3] : '-';
  const half = /^\d+$/.test(parts[4] || '') ? parts[4] : '0';
  const full = /^\d+$/.test(parts[5] || '') ? parts[5] : '1';
  return { fen: [parts[0], side, castle, ep, half, full].join(' '), sideGiven: parts[1] === 'w' || parts[1] === 'b' };
}

// Clock and engine notes make links long; the moves and any written notes stay.
export function slimPgn(pgn) {
  return pgn
    .replace(/\{\s*(\[%[^\]]*\]\s*)+\}/g, '')
    .replace(/\[%(clk|eval|emt|timestamp)[^\]]*\]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

const looksLikePgn = (t) => /^\s*\[\w+\s+"/.test(t) || /(^|\s)1\.\s*(\.\.\.)?\s*[KQRBNOa-h]/.test(t);

function fenResult(text, from = 'A position (FEN)') {
  const f = cleanFen(text);
  if (!f) return null;
  const who = sideText(f.fen);
  return {
    label: `${from}. ${f.sideGiven ? who : `${who}, since it didn’t say`}.`,
    url: analysisUrl(f.fen),
    fen: f.fen,
  };
}

// Lichess's puzzles: only the starting position is read, never the solution or the themes.
async function lichessPuzzleFen(id = 'daily') {
  const j = await getJson(`https://lichess.org/api/puzzle/${id}`, { headers: { Accept: 'application/json' } });
  if (!j.puzzle || !j.puzzle.fen) throw new Error('No position in the reply');
  return j.puzzle.fen;
}

// Lichess page names that are 8 letters long, so they aren't mistaken for game ids.
const LICHESS_PAGES = /^(analysis|training|practice|tutorial|streamer|insights|features|calendar|password)$/i;

// A Lichess puzzle id from /training/ID or a themed /training/mateIn2/ID.
// A lone plain word (daily, short, fork) is a page, not an id.
export function lichessPuzzleId(path) {
  const m = /^\/training\/(?:([A-Za-z0-9]+)\/)?([A-Za-z0-9]{5})\/?$/.exec(path);
  if (!m || (!m[1] && /^[a-z]+$/.test(m[2]))) return null;
  return m[2];
}

export function detect(raw, saved = new Map()) {
  const text = raw.trim();
  if (!text) return null;
  let url = null;
  try {
    const href = /^https?:\/\//i.test(text) ? text : /^(www\.)?(chess\.com|lichess\.org)\//i.test(text) ? `https://${text}` : '';
    if (href) url = new URL(href);
  } catch {
    url = null;
  }
  if (url) {
    const host = url.hostname.toLowerCase();
    const path = url.pathname;
    const fenParam = url.searchParams.get('fen');
    const onSite = (site) => host === site || host.endsWith(`.${site}`);
    if (onSite('chess.com')) {
      let m;
      if ((m = /\/(?:analysis\/)?game\/(live|daily|computer)\/(\d+)/.exec(path))) return { label: `A Chess.com ${m[1]} game.`, url: gameUrl(m[1], m[2]) };
      if ((m = /\/(live|daily)\/game\/(\d+)/.exec(path))) return { label: `A Chess.com ${m[1]} game.`, url: gameUrl(m[1], m[2]) };
      if ((m = /\/(?:analysis\/)?game\/(\d+)/.exec(path))) return { label: 'A Chess.com game.', url: gameUrl('live', m[1]) };
      if ((m = /\/(?:daily-chess-puzzle|daily)\/(\d{4}-\d{2}-\d{2})/.exec(path))) {
        const iso = m[1];
        return saved.has(iso)
          ? { label: `The daily puzzle of ${longDate(iso)}. It’s saved, so it opens on the analysis board.`, url: analysisUrl(saved.get(iso)), fen: saved.get(iso), iso }
          : { label: `The daily puzzle of ${longDate(iso)}. It isn’t saved, so it opens Chess.com’s puzzle page.`, url: `${DAILY_PAGE}/${iso}` };
      }
      if (fenParam && fenResult(fenParam)) return fenResult(fenParam, 'A position from a Chess.com link');
      if (url.searchParams.get('pgn')) return { label: 'A game from a Chess.com link.', url: pgnUrl(url.searchParams.get('pgn')) };
      return { label: 'A Chess.com page I can’t read inside, so it opens as it is.', url: url.href, plain: true };
    }
    if (onSite('lichess.org')) {
      let m;
      const id = lichessPuzzleId(path);
      if (id) {
        return { label: 'A Lichess puzzle. Only its position is read.', fetch: async () => fenResult(await lichessPuzzleFen(id), 'A Lichess puzzle') };
      }
      if (/^\/training\/daily/.test(path)) return { label: 'The Lichess puzzle of the day.', fetch: async () => fenResult(await lichessPuzzleFen(), 'The Lichess puzzle of the day') };
      if ((m = /^\/study\/([A-Za-z0-9]{8})(?:\/([A-Za-z0-9]{8}))?/.exec(path))) {
        const src = m[2] ? `https://lichess.org/api/study/${m[1]}/${m[2]}.pgn` : `https://lichess.org/api/study/${m[1]}.pgn`;
        return {
          label: m[2] ? 'A Lichess study chapter.' : 'A Lichess study. Its first chapter opens.',
          fetch: async () => {
            const pgn = await getText(`${src}?clocks=false&comments=true&variations=true`);
            const first = pgn.split(/\n\s*\n(?=\[)/)[0];
            return { url: pgnUrl(slimPgn(first)) };
          },
        };
      }
      if ((m = /^\/analysis\/(?:standard\/|fromPosition\/)?(.+)$/.exec(path))) {
        let f = null;
        try {
          f = fenResult(decodeURIComponent(m[1]), 'A position from a Lichess link');
        } catch {
          f = null;
        }
        if (f) return f;
      }
      if ((m = /^\/([A-Za-z0-9]{8})(?:[A-Za-z0-9]{4})?(?:\/(?:white|black))?\/?$/.exec(path)) && !LICHESS_PAGES.test(m[1])) {
        const id = m[1];
        return {
          label: 'A Lichess game.',
          fetch: async () => ({ url: pgnUrl(slimPgn(await getText(`https://lichess.org/game/export/${id}?clocks=false&evals=false&literate=false`))) }),
        };
      }
      if (fenParam && fenResult(fenParam)) return fenResult(fenParam, 'A position from a Lichess link');
      return { label: 'A Lichess page I can’t read, so it opens as it is.', url: url.href, plain: true };
    }
    if (fenParam && fenResult(fenParam)) return fenResult(fenParam, 'A position from a link');
    return { error: 'That link isn’t from Chess.com or Lichess, and there’s no position in it.' };
  }
  const asFen = fenResult(text);
  if (asFen) return asFen;
  if (looksLikePgn(text)) {
    const slim = slimPgn(text);
    return { label: /\[FEN\s+"/.test(slim) ? 'A game (PGN) from a set-up position.' : 'A game (PGN).', url: pgnUrl(slim) };
  }
  return { error: 'I can’t tell what this is. Paste a FEN, a PGN, or a Chess.com or Lichess link.' };
}

/* -------------------------------------------------------------- The desk */

const saved = new Map(); // date -> position, from the saved list, today and any random ones
let todayIso = '';
let todayFen = '';
let desk = { kind: 'today', fen: '', iso: '' };
let deskSeq = 0;

const deskEls = () => ({
  board: $('desk-board'),
  pieces: $('desk-pieces'),
  coords: $('desk-coords'),
});

// Coordinates inside the squares, the way Chess.com prints them: rank numbers
// down the left file, file letters along the bottom rank, each in the colour
// of the opposite square.
function coordsHTML(orientation) {
  const files = orientation === 'white' ? 'abcdefgh' : 'hgfedcba';
  const ranks = orientation === 'white' ? '87654321' : '12345678';
  const tone = (x, y) => ((x + y) % 2 === 0 ? 'on-light' : 'on-dark');
  let out = '';
  for (let y = 0; y < 8; y += 1) out += `<span class="cc-co cc-co--rank ${tone(0, y)}" data-x="0" data-y="${y}">${ranks[y]}</span>`;
  for (let x = 0; x < 8; x += 1) out += `<span class="cc-co cc-co--file ${tone(x, 7)}" data-x="${x}" data-y="7">${files[x]}</span>`;
  return out;
}

async function setBoard(fen, label) {
  const { board, pieces, coords } = deskEls();
  const orientation = blackToMove(fen) ? 'black' : 'white';
  const old = [...pieces.children];
  if (old.length && moving()) {
    await Promise.all(old.map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' }).finished.catch(() => {})));
  }
  coords.innerHTML = coordsHTML(orientation);
  const map = parsePlacement(fen.split(/\s+/)[0]);
  pieces.innerHTML = Object.keys(map)
    .map((sq) => pieceHTML(sq, map[sq], orientation))
    .join('');
  board.setAttribute('aria-label', `Chessboard, viewed from ${orientation === 'white' ? 'White' : 'Black'}’s side: ${label}, ${sideText(fen)}.`);
  if (!moving()) return;
  // Set up like a person would: the far side first, row by row, towards you.
  const placed = [...pieces.children].sort((a, b) => a.dataset.y - b.dataset.y || a.dataset.x - b.dataset.x);
  placed.forEach((img, i) => {
    img.animate(
      [
        { opacity: 0, translate: '0 -14%' },
        { opacity: 1, translate: '0 0' },
      ],
      { duration: 260, delay: i * 26, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' },
    );
  });
}

function showOnDesk({ kind, fen, iso = '', title, source }) {
  desk = { kind, fen, iso };
  const seq = ++deskSeq;
  $('desk-title').textContent = title;
  say('desk-status', '');
  const turn = $('desk-turn');
  turn.textContent = `${sideText(fen)}.`;
  $('desk-flip').hidden = !blackToMove(fen);
  $('card-date').textContent = iso ? longDate(iso) : 'today';
  $('card-side').textContent = blackToMove(fen) ? 'black' : 'white';
  $('card-src').textContent = source;
  const go = $('go-analysis');
  go.href = analysisUrl(fen);
  $('go-explorer').href = explorerUrl(fen);
  $('copy-fen').disabled = false;
  setBoard(fen, title).then(() => {
    if (seq !== deskSeq) return;
    writeIn(turn);
    writeIn($('desk-flip'));
  });
  if (iso) calMonth = monthOf(iso); // the calendar turns to the puzzle's month, where its date is marked
  renderCalendar();
}

function deskFailed(text) {
  $('desk-turn').textContent = 'The board is empty for now.';
  $('desk-flip').hidden = true;
  $('go-analysis').href = DAILY_PAGE;
  $('go-explorer').href = DAILY_PAGE;
  $('copy-fen').disabled = true;
  say('desk-status', text, 'red');
}

function bringDeskIntoView() {
  const top = $('desk').getBoundingClientRect().top;
  if (top < -40 || top > window.innerHeight * 0.5) {
    $('desk').scrollIntoView({ behavior: moving() ? 'smooth' : 'auto', block: 'start' });
  }
}

/** Only the position and the date are read. The answer (pgn) and the name (title) are ignored on purpose. */
function puzzleIso(j) {
  const m = /\/daily\/(\d{4}-\d{2}-\d{2})/.exec(j.url || '');
  return m ? m[1] : new Date((j.publish_time || 0) * 1000).toISOString().slice(0, 10);
}

async function getPuzzle(path) {
  const j = await getJson(`${API}/puzzle${path}`, { cache: path ? 'no-store' : 'no-cache' });
  if (!j.fen || !cleanFen(j.fen)) throw new Error('No position in the reply');
  return { fen: j.fen, iso: puzzleIso(j) };
}

let todaySeq = 0;
async function loadToday({ toDesk }) {
  const seq = ++todaySeq;
  const deskAt = deskSeq; // if something else goes on the board meanwhile, leave it there
  try {
    const p = await getPuzzle('');
    if (seq !== todaySeq) return;
    const changed = p.iso !== todayIso;
    todayIso = p.iso;
    todayFen = p.fen;
    saved.set(p.iso, p.fen); // today always counts as saved, even before the saved list catches up
    $('cal-jump').max = todayIso.slice(0, 7);
    refreshPaste();
    if ((toDesk && deskSeq === deskAt) || (desk.kind === 'today' && changed)) {
      showOnDesk({ kind: 'today', fen: p.fen, iso: p.iso, title: 'Today’s puzzle', source: 'Chess.com daily' });
    } else {
      renderCalendar();
    }
  } catch {
    if (seq !== todaySeq || !toDesk || deskSeq !== deskAt) return;
    deskFailed('Couldn’t reach Chess.com just now. The button opens Chess.com’s own puzzle page instead. Reload to try again.');
  }
}

function loadSavedDate(iso) {
  const fen = saved.get(iso);
  if (!fen) return;
  const isToday = iso === todayIso;
  showOnDesk({
    kind: isToday ? 'today' : 'date',
    fen,
    iso,
    title: isToday ? 'Today’s puzzle' : `Puzzle of ${shortDate(iso)}`,
    source: 'Chess.com daily',
  });
  bringDeskIntoView();
}

$('load-today').addEventListener('click', () => {
  if (todayFen) loadSavedDate(todayIso);
  else {
    say('desk-status', 'Getting today’s puzzle…');
    loadToday({ toDesk: true });
  }
});

$('load-random').addEventListener('click', async () => {
  const deskAt = deskSeq;
  say('desk-status', 'Picking a random puzzle…');
  try {
    const p = await getPuzzle('/random');
    saved.set(p.iso, p.fen);
    refreshPaste();
    if (deskSeq !== deskAt) {
      renderCalendar(); // something else went on the board meanwhile; just mark the new date
      return;
    }
    showOnDesk({ kind: 'random', fen: p.fen, iso: p.iso, title: 'A random puzzle', source: 'Chess.com daily' });
  } catch {
    if (deskSeq !== deskAt) return;
    say('desk-status', 'Couldn’t get a random puzzle from Chess.com. Try again in a moment.', 'red');
  }
});

$('load-lichess').addEventListener('click', async () => {
  const deskAt = deskSeq;
  say('desk-status', 'Getting the Lichess puzzle…');
  try {
    const fen = await lichessPuzzleFen();
    if (deskSeq !== deskAt) return; // something else went on the board meanwhile
    showOnDesk({ kind: 'lichess', fen, title: 'Lichess puzzle of the day', source: 'Lichess daily' });
  } catch {
    if (deskSeq !== deskAt) return;
    say('desk-status', 'Couldn’t reach Lichess. Try again in a moment.', 'red');
  }
});

$('copy-fen').addEventListener('click', () => {
  if (desk.fen) copy(desk.fen, 'desk-status', 'FEN copied.');
});

/* -------------------------------------------------------------- Calendar */

let calMonth = null; // { y, m } with m from 0
const monthOf = (iso) => ({ y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) - 1 });
const monthName = ({ y, m }) => new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function dayCell(iso, d, lastIso) {
  const li = document.createElement('li');
  li.className = 'cal__cell';
  const fen = saved.get(iso);
  const long = fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' });
  let el;
  if (iso > lastIso) {
    el = document.createElement('span');
    el.className = 'cal__day is-later';
    el.setAttribute('aria-label', `${long}, not posted yet`);
  } else if (fen) {
    el = document.createElement('button');
    el.type = 'button';
    el.className = 'cal__day is-saved';
    if (iso === todayIso) el.classList.add('is-today');
    el.dataset.iso = iso;
    el.setAttribute('aria-label', `${long}${iso === todayIso ? ', today' : ''}, ${sideText(fen)}. Puts it on the board.`);
  } else {
    el = document.createElement('a');
    el.className = 'cal__day';
    el.href = `${DAILY_PAGE}/${iso}`;
    el.setAttribute('aria-label', `${long}, opens Chess.com’s puzzle page`);
  }
  if (desk.iso === iso && desk.kind !== 'lichess') {
    el.classList.add('is-on');
    if (el.tagName === 'BUTTON') el.setAttribute('aria-current', 'true');
  }
  const n = document.createElement('span');
  n.className = 'cal__n';
  n.textContent = String(d);
  el.append(n);
  if (fen) {
    el.insertAdjacentHTML('beforeend', markSVG('circle', 115, 100, seedFrom(`cal:${iso}`), 'cal__loop'));
    const king = document.createElement('img');
    king.className = 'cal__king';
    king.src = `/assets/pieces/${blackToMove(fen) ? 'b' : 'w'}K.svg`;
    king.alt = '';
    king.width = 45;
    king.height = 45;
    el.append(king);
  }
  li.append(el);
  return li;
}

const drawnLoops = new Set();
// A pasted daily-puzzle link reads the saved list, so read the box again when that list grows.
function refreshPaste() {
  if (/\/daily(?:-chess-puzzle)?\/\d{4}-\d{2}-\d{2}/.test($('paste').value)) onPaste();
}

function renderCalendar() {
  if (!calMonth) calMonth = monthOf(localIso());
  const { y, m } = calMonth;
  const lastIso = todayIso || localIso();
  const grid = $('cal-grid');
  grid.textContent = '';
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  for (let i = 0; i < first; i += 1) {
    const li = document.createElement('li');
    li.className = 'cal__cell cal__cell--blank';
    li.setAttribute('aria-hidden', 'true');
    grid.append(li);
  }
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  for (let d = 1; d <= days; d += 1) grid.append(dayCell(isoOf(y, m, d), d, lastIso));
  $('cal-month').textContent = monthName(calMonth);
  const lastMonth = monthOf(lastIso);
  $('cal-next').disabled = y > lastMonth.y || (y === lastMonth.y && m >= lastMonth.m);
  $('cal-jump').value = `${y}-${String(m + 1).padStart(2, '0')}`;
  // Draw each loop once, the first time it shows up.
  let k = 0;
  grid.querySelectorAll('.is-saved').forEach((el) => {
    if (drawnLoops.has(el.dataset.iso)) return;
    drawnLoops.add(el.dataset.iso);
    drawStrokes(el.querySelector('.cal__loop'), 120 + k * 140);
    k += 1;
  });
}

function stepMonth(delta) {
  const { y, m } = calMonth;
  const d = new Date(Date.UTC(y, m + delta, 1));
  calMonth = { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  renderCalendar();
}

$('cal-prev').addEventListener('click', () => stepMonth(-1));
$('cal-next').addEventListener('click', () => stepMonth(1));
$('cal-jump').addEventListener('change', (e) => {
  const v = /^(\d{4})-(\d{2})$/.exec(e.target.value);
  if (!v) return;
  const lastMonth = monthOf(todayIso || localIso());
  let target = { y: Number(v[1]), m: Number(v[2]) - 1 };
  if (target.y > lastMonth.y || (target.y === lastMonth.y && target.m > lastMonth.m)) target = lastMonth;
  calMonth = target;
  renderCalendar();
});
$('cal-grid').addEventListener('click', (e) => {
  const day = e.target.closest('button.cal__day');
  if (day) loadSavedDate(day.dataset.iso);
});

async function loadSaved() {
  try {
    const j = await getJson(ARCHIVE, { cache: 'no-cache' });
    for (const [iso, fen] of Object.entries(j.puzzles || {})) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso) && typeof fen === 'string' && cleanFen(fen) && !saved.has(iso)) saved.set(iso, fen);
    }
  } catch {
    /* no saved list yet: today still shows, other dates open Chess.com's page */
  }
  renderCalendar();
  refreshPaste();
}

/* ----------------------------------------------------------------- Paste */

let current = null;
function onPaste() {
  const value = $('paste').value;
  current = detect(value, saved);
  say('paste-status', '');
  $('paste-open').disabled = !current || Boolean(current.error);
  $('paste-board').hidden = !(current && current.fen);
  const reply = $('paste-reply');
  if (!current) {
    say('paste-reply', '');
  } else if (current.error) {
    say('paste-reply', current.error, 'red');
  } else {
    say('paste-reply', current.label);
    $('paste-open').textContent = current.plain ? 'Open the page' : 'Open on Chess.com';
  }
  reply.classList.toggle('note-hand--red', Boolean(current && current.error));
  store.set('pz.paste', value.slice(0, 20000));
}

$('paste').addEventListener('input', onPaste);
$('paste-open').addEventListener('click', async () => {
  if (!current || current.error) return;
  if (!current.fetch) {
    window.location.href = current.url;
    return;
  }
  const job = current;
  say('paste-status', 'Getting it from Lichess…');
  $('paste-open').disabled = true;
  try {
    const got = await job.fetch();
    if (job !== current) return; // the text changed while this was loading
    if (!got || !got.url) throw new Error('Nothing to open');
    window.location.href = got.url;
  } catch (err) {
    if (job !== current) return;
    $('paste-open').disabled = false;
    say('paste-status', err.status === 404 ? 'Lichess can’t find that. Check the link.' : 'Couldn’t reach Lichess. Try again in a moment.', 'red');
  }
});
$('paste-board').addEventListener('click', () => {
  if (!current || !current.fen) return;
  if (current.iso) loadSavedDate(current.iso);
  else {
    showOnDesk({ kind: 'paste', fen: current.fen, title: 'Your position', source: 'pasted' });
    bringDeskIntoView();
  }
});
$('paste-clip').addEventListener('click', async () => {
  try {
    const t = await navigator.clipboard.readText();
    $('paste').value = t;
    onPaste();
    if (!t.trim()) say('paste-status', 'The clipboard is empty.', 'red');
  } catch {
    say('paste-status', 'This browser didn’t share the clipboard. Long-press the box and tap Paste.', 'red');
    $('paste').focus();
  }
});

/* ------------------------------------------------------------- My games */

const RESULT = {
  win: 'win',
  checkmated: 'loss',
  timeout: 'loss',
  resigned: 'loss',
  lose: 'loss',
  abandoned: 'loss',
  kingofthehill: 'loss',
  threecheck: 'loss',
  bughousepartnerlose: 'loss',
};
const PAGE = 24;
let archives = [];
let monthIdx = -1;
let who = '';
let gamesSeq = 0;
let monthGames = [];
let shown = 0;

$('games-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('user').value.trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,30}$/.test(name)) {
    say('games-status', 'That doesn’t look like a Chess.com username.', 'red');
    return;
  }
  store.set('pz.user', name);
  who = name;
  const seq = ++gamesSeq;
  $('games-sheet').textContent = '';
  $('games-more').hidden = true;
  $('games-bar').hidden = true;
  say('games-status', `Asking Chess.com for ${name}’s games…`);
  try {
    const j = await getJson(`${API}/player/${name}/games/archives`);
    if (seq !== gamesSeq) return;
    archives = j.archives || [];
    if (!archives.length) {
      say('games-status', `${name} has no public games yet.`);
      return;
    }
    showMonth(archives.length - 1);
  } catch (err) {
    if (seq !== gamesSeq) return;
    say('games-status', err.status === 404 ? `Chess.com has no player called ${name}.` : 'Couldn’t reach Chess.com. Try again in a moment.', 'red');
  }
});

async function showMonth(i) {
  monthIdx = i;
  const seq = ++gamesSeq;
  const src = archives[i];
  const m = /(\d{4})\/(\d{2})$/.exec(src);
  $('games-bar').hidden = false;
  $('month-name').textContent = m ? monthName({ y: Number(m[1]), m: Number(m[2]) - 1 }) : '';
  $('month-older').disabled = i <= 0;
  $('month-newer').disabled = i >= archives.length - 1;
  $('games-sheet').textContent = '';
  $('games-more').hidden = true;
  say('games-status', 'Loading games…');
  try {
    const j = await getJson(src);
    if (seq !== gamesSeq) return;
    monthGames = (j.games || []).slice().reverse();
    shown = 0;
    say('games-status', monthGames.length ? `${monthGames.length} game${monthGames.length === 1 ? '' : 's'} this month, newest first.` : 'No games this month.');
    renderMoreGames();
  } catch (err) {
    if (seq !== gamesSeq) return;
    say(
      'games-status',
      err.status === 403 || err.status === 429
        ? 'Chess.com is refusing this month right now (too many games, or too many requests). Try another month, or again later.'
        : 'Couldn’t load this month. Try again in a moment.',
      'red',
    );
  }
}

$('month-older').addEventListener('click', () => {
  if (monthIdx > 0) showMonth(monthIdx - 1);
});
$('month-newer').addEventListener('click', () => {
  if (monthIdx < archives.length - 1) showMonth(monthIdx + 1);
});
$('games-more').addEventListener('click', renderMoreGames);

function gameCard(g) {
  const white = g.white || {};
  const black = g.black || {};
  const meWhite = (white.username || '').toLowerCase() === who;
  const me = meWhite ? white : black;
  const them = meWhite ? black : white;
  const r = RESULT[me.result] || 'draw';
  const m = /\/game\/(live|daily)\/(\d+)/.exec(g.url || '');
  const href = m ? gameUrl(m[1], m[2]) : g.pgn ? pgnUrl(slimPgn(g.pgn)) : g.url;
  const when = g.end_time ? new Date(g.end_time * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
  const kind = [g.time_class, g.rules && g.rules !== 'chess' ? g.rules : '', g.rated === false ? 'unrated' : ''].filter(Boolean).join(', ');
  const word = r === 'win' ? 'Won' : r === 'loss' ? 'Lost' : 'Draw';

  const li = document.createElement('li');
  li.className = 'played__item';
  const a = document.createElement('a');
  a.className = 'played__card';
  a.href = href;
  a.setAttribute('aria-label', `${r === 'draw' ? 'Drew' : word} against ${them.username || 'unknown'}${when ? `, ${when}` : ''}${kind ? `, ${kind}` : ''}, as ${meWhite ? 'White' : 'Black'}. Opens the analysis board.`);

  const board = document.createElement('div');
  board.className = 'board board--mini board--cc';
  board.setAttribute('aria-hidden', 'true');
  const layer = document.createElement('div');
  layer.className = 'board__layer board__pieces';
  const fenBoard = (g.fen || '').split(/\s+/)[0];
  if (FEN_BOARD.test(fenBoard)) {
    const o = meWhite ? 'white' : 'black';
    const map = parsePlacement(fenBoard);
    layer.innerHTML = Object.keys(map)
      .map((sq) => pieceHTML(sq, map[sq], o))
      .join('');
  }
  board.append(layer);

  const res = document.createElement('span');
  res.className = `played__res played__res--${r}`;
  res.setAttribute('aria-hidden', 'true');
  res.textContent = word;
  if (r === 'win') res.insertAdjacentHTML('beforeend', markSVG('tick', 110, 100, seedFrom(`win:${g.url}`), 'played__tick'));

  const vs = document.createElement('span');
  vs.className = 'played__vs';
  vs.textContent = `vs ${them.username || '?'}${them.rating ? ` (${them.rating})` : ''}`;
  const meta = document.createElement('span');
  meta.className = 'played__meta';
  meta.textContent = [when, kind, meWhite ? 'as White' : 'as Black'].filter(Boolean).join(', ');

  a.append(board, res, vs, meta);
  li.append(a);
  return li;
}

function renderMoreGames() {
  const sheet = $('games-sheet');
  const next = monthGames.slice(shown, shown + PAGE);
  next.forEach((g, i) => {
    const li = gameCard(g);
    sheet.append(li);
    if (moving()) {
      li.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], {
        duration: 320,
        delay: Math.min(i, 12) * 40,
        easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        fill: 'backwards',
      });
    }
  });
  shown += next.length;
  $('games-more').hidden = shown >= monthGames.length;
}

/* ------------------------------------------------------------ Setup bits */

$('copy-bm').addEventListener('click', () => copy($('bm').value, 'bm-status', 'Copied. Now follow the steps below.'));

/* ----------------------------------------------------------------- Start */

$('desk-coords').innerHTML = coordsHTML('white');
renderCalendar();
const linkFen = new URLSearchParams(window.location.search).get('fen');
const linked = linkFen && cleanFen(linkFen);
if (linked) {
  showOnDesk({ kind: 'paste', fen: linked.fen, title: 'Your position', source: 'link' });
  loadToday({ toDesk: false });
} else {
  loadToday({ toDesk: true });
}
loadSaved();
if (store.get('pz.user')) $('user').value = store.get('pz.user');
if (store.get('pz.paste')) {
  $('paste').value = store.get('pz.paste');
  onPaste();
}
// Left open in a tab: pick up the new day's puzzle when the page comes back.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadToday({ toDesk: false });
});
