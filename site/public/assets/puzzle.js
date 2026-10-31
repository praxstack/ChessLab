// Puzzle analyzr (/puzzleanalyzr/): puts a chess position on the desk board,
// where the learner moves the pieces (desk.js), checks a move with Stockfish
// only when asked (engine.js), or opens it on Chess.com's analysis board.
// Reads only public APIs: Chess.com's daily puzzle and game archives, Lichess
// puzzles, games and studies, and a small list of saved daily puzzles that a
// GitHub Action keeps (date -> position and name). A puzzle's answer is never
// shown; its name can give the answer away, so it stays covered until tapped.
import { parsePlacement, pieceHTML } from './board.js';
import { markSVG, seedFrom } from './ink.js';
import { createDesk, coordsHTML } from './desk.js';
import { createDrawLayer } from './draw.js';
import { replay as replayLine } from './line.js';
import { checkLine } from './coach.js';
import { createEngine, grade, isCancel, isSaved, toCp } from './engine.js';
import { DEFAULT_ENGINE, createChoice, engineById, formatBytes, needsWarning } from './engine-catalog.js';
import { createPicker } from './engine-picker.js';
import * as sound from './sound.js';
import { nextPuzzleAt, whenText } from './daily-clock.js';

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
async function lichessPuzzle(id = 'daily') {
  const j = await getJson(`https://lichess.org/api/puzzle/${id}`, { headers: { Accept: 'application/json' } });
  if (!j.puzzle || !j.puzzle.fen) throw new Error('No position in the reply');
  return { fen: j.puzzle.fen, id: /^[A-Za-z0-9]{5}$/.test(j.puzzle.id || '') ? j.puzzle.id : '' };
}
const lichessPuzzleFen = async (id) => (await lichessPuzzle(id)).fen;

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
const names = new Map(); // date -> Chess.com's name for that day's puzzle
const lichessSaved = new Map(); // date (UTC) -> { id, fen }: Lichess's puzzle of that day
const utcIso = () => new Date().toISOString().slice(0, 10);
let todayIso = '';
let todayFen = '';
let desk = { kind: 'today', fen: '', iso: '' };
let deskSeq = 0;

// The pens learn about moves once they exist (the board can't call them before).
let pensSeeMove = () => {};
const play = createDesk(
  {
    board: $('desk-board'),
    pieces: $('desk-pieces'),
    coords: $('desk-coords'),
    marks: $('desk-marks'),
    ink: $('desk-ink'),
    promo: $('desk-promo'),
    say: $('desk-say'),
    moves: $('desk-moves'),
    undo: $('tool-undo'),
    redo: $('tool-redo'),
    reset: $('tool-reset'),
    flip: $('tool-flip'),
  },
  { onChange: boardChanged },
);

// The learner's own pen over the board. Drawings stay while pieces move, so an
// idea can be tested against them; a new position or Start over rubs them out.
const pens = createDrawLayer(
  {
    board: $('desk-board'),
    svg: $('desk-draw'),
    modes: [...document.querySelectorAll('#draw-modes [data-mode]')],
    kit: $('draw-kit'),
    fadeBox: $('draw-fade-box'),
    fade: $('draw-fade'),
    fadeOut: $('draw-fade-out'),
    undo: $('draw-undo'),
    clear: $('draw-clear'),
    hint: $('draw-hint'),
    tools: [...document.querySelectorAll('#pens [data-tool]')],
    colors: [...document.querySelectorAll('#pens [data-color]')],
    sizes: [...document.querySelectorAll('#pens [data-size]')],
    stickers: [...document.querySelectorAll('#pens [data-sticker]')],
    sheet: $('draw-sheet'),
    helps: [...document.querySelectorAll('#pens [data-help]')],
  },
  {
    orientation: () => play.orientation,
    pieceAt: (sq) => play.pieceAt(sq),
    boardFen: () => play.fen,
    onLine: showLine,
  },
);

// The numbered line under the pens: its moves as text, Play it, Clear line.
let shownLine = null;
let playing = null;
let playingLine = ''; // the line Play it is showing, so an edit to it stops the show
const lineKey = (line) => (line ? `${line.fen}|${line.steps.map((s) => s.from + s.to).join(' ')}` : '');
let coachSeq = 0; // a Coach check that's running is about this check only
let coachLine = ''; // the line Coach check's note is about
function showLine(line) {
  shownLine = line;
  $('draw-line').hidden = !line;
  $('draw-line-text').textContent = line ? line.text : '';
  if (playing && lineKey(line) !== playingLine) stopLine();
  if (coachLine && lineKey(line) !== coachLine) coachSay(''); // the line changed, so the old verdict no longer fits
}
/** Coach check's note under the line. tone: '' (red: a move fails), 'ok' (blue) or 'busy'. */
function coachSay(text, tone = '') {
  const note = $('draw-line-note');
  note.hidden = !text;
  note.textContent = text;
  note.className = `pens__coach${tone ? ` is-${tone}` : ''}`;
  if (!text) {
    pens.clearCoach(); // the verdict's mark on the board goes with it
    coachLine = '';
    coachSeq += 1; // a check still running is about a line that's gone
    $('draw-line-check').disabled = false;
  }
}
function stopLine() {
  if (!playing) return;
  clearTimeout(playing);
  playing = null;
  play.peek(null);
  $('draw-line-play').textContent = 'Play it';
}
$('draw-line-play').addEventListener('click', () => {
  if (playing) return stopLine();
  if (!shownLine) return;
  const fens = replayLine(shownLine.fen, shownLine.steps).fens;
  if (!fens.length) return;
  $('draw-line-play').textContent = 'Stop';
  playingLine = lineKey(shownLine);
  pens.dropAid(); // a helper's answer is about the real board, not the line being shown
  const fast = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  const next = () => {
    if (i < fens.length) {
      play.peek(fens[i]);
      i += 1;
      playing = setTimeout(next, fast ? 450 : 850);
    } else {
      playing = setTimeout(stopLine, 900); // a beat on the last position, then back to the board
    }
  };
  playing = setTimeout(next, 150);
});
$('draw-line-clear').addEventListener('click', () => pens.clearLine());
pensSeeMove = () => pens.dropAid(); // a helper's answer is about one position only
// Helpers read the real board, so asking one ends Play it and puts the real board back.
for (const b of document.querySelectorAll('#pens [data-help]')) b.addEventListener('click', stopLine);
$('tool-flip').addEventListener('click', () => pens.render());
$('tool-reset').addEventListener('click', () => pens.clear());

// After every move, take-back or new position: the turn note, the links, and the engine button follow the board.
function boardChanged() {
  stopLine(); // a real move, take-back or new position ends Play it
  pensSeeMove();
  if (!desk.fen) return;
  const fen = play.fen;
  const moved = play.moved;
  $('desk-turn').textContent = play.over ? 'Game over on the board.' : `${sideText(fen)}${moved ? ' on the board' : ''}.`;
  $('go-analysis').href = analysisUrl(fen);
  $('go-explorer').href = explorerUrl(fen);
  $('desk-board').setAttribute('aria-label', `Chessboard, ${desk.title}, viewed from ${play.orientation === 'white' ? 'White' : 'Black'}’s side. ${sideText(fen)}.`);
  checkSeq += 1; // a check that was running is about a position that's gone
  if (!revealing) {
    engineSay('');
    $('engine-show').hidden = true;
  }
  updateCheckButton();
}

function showOnDesk({ kind, fen, iso = '', title, source, name = '', lid = '' }) {
  desk = { kind, fen, iso, title, lid };
  const seq = ++deskSeq;
  $('desk-title').textContent = title;
  say('desk-status', '');
  const turn = $('desk-turn');
  turn.textContent = `${sideText(fen)}.`;
  $('desk-flip').hidden = !blackToMove(fen);
  $('card-date-row').hidden = !iso && kind !== 'lichess';
  $('card-date').textContent = iso ? longDate(iso) : 'today';
  showName(name || (iso && kind !== 'lichess' ? names.get(iso) || '' : ''));
  $('card-side').textContent = blackToMove(fen) ? 'black' : 'white';
  $('card-src').textContent = source;
  showNext();
  const go = $('go-analysis');
  go.href = analysisUrl(fen);
  $('go-explorer').href = explorerUrl(fen);
  showSolve();
  $('copy-fen').disabled = false;
  pens.reset();
  play.load(fen).then(() => {
    if (seq !== deskSeq) return;
    writeIn(turn);
    writeIn($('desk-flip'));
    startEngineSoon();
  });
  if (iso) calMonth = monthOf(iso); // the calendar turns to the puzzle's month, where its date is marked
  renderCalendar();
}

function deskFailed(text) {
  $('desk-turn').textContent = 'The board is empty for now.';
  $('desk-flip').hidden = true;
  $('go-analysis').href = DAILY_PAGE;
  $('go-explorer').href = DAILY_PAGE;
  $('go-solve').hidden = true;
  $('copy-fen').disabled = true;
  say('desk-status', text, 'red');
}

function bringDeskIntoView() {
  const top = $('desk').getBoundingClientRect().top;
  if (top < -40 || top > window.innerHeight * 0.5) {
    $('desk').scrollIntoView({ behavior: moving() ? 'smooth' : 'auto', block: 'start' });
  }
}

/** The position, the date and the name are read. The answer (pgn) is ignored on purpose. */
function puzzleIso(j) {
  const m = /\/daily\/(\d{4}-\d{2}-\d{2})/.exec(j.url || '');
  return m ? m[1] : new Date((j.publish_time || 0) * 1000).toISOString().slice(0, 10);
}

async function getPuzzle(path) {
  const j = await getJson(`${API}/puzzle${path}`, { cache: path ? 'no-store' : 'no-cache' });
  if (!j.fen || !cleanFen(j.fen)) throw new Error('No position in the reply');
  const iso = puzzleIso(j);
  if (typeof j.title === 'string' && j.title.trim()) names.set(iso, j.title.trim().slice(0, 120));
  return { fen: j.fen, iso };
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
    planNext();
    if ((toDesk && deskSeq === deskAt) || (desk.kind === 'today' && changed && !play.moved)) {
      showOnDesk({ kind: 'today', fen: p.fen, iso: p.iso, title: 'Today’s puzzle', source: 'Chess.com daily puzzle' });
    } else {
      renderCalendar();
      // Mid-way through yesterday's puzzle: leave the pieces where they are and say the new one is out.
      if (desk.kind === 'today' && changed) {
        desk = { ...desk, kind: 'date', title: `Puzzle of ${shortDate(desk.iso)}` };
        $('desk-title').textContent = desk.title;
        showNext();
        showSolve();
        say('desk-status', 'Today’s new puzzle is out. Tap Today’s to put it on the board.');
      }
    }
  } catch {
    if (seq === todaySeq) {
      if (todayIso) planNext();
      // Never reached Chess.com yet: try again in a minute, and only fill the board if it's still empty then.
      else {
        clearTimeout(nextTimer);
        nextTimer = setTimeout(() => loadToday({ toDesk: !desk.fen }), 60 * 1000);
      }
    }
    if (seq !== todaySeq || !toDesk || deskSeq !== deskAt) return;
    deskFailed('Couldn’t reach Chess.com just now. The button opens Chess.com’s own puzzle page instead. Trying again in a minute.');
  }
}

// The next daily puzzle: its time on the puzzle card, and a timer that
// switches an open page to it. Chess.com can be a few minutes late, so once
// it's due the page asks again every 5 minutes, then every half hour.
let nextTimer = 0;

// A puzzle's name often gives the answer away ("Queen sac wins"), so it stays covered until tapped.
function showName(name) {
  const btn = $('card-name');
  $('card-name-row').hidden = !name;
  btn.dataset.name = name;
  btn.textContent = 'tap to show';
  btn.classList.remove('is-shown');
  btn.setAttribute('aria-label', 'Show the puzzle’s name. It can hint at the answer.');
}
$('card-name').addEventListener('click', (e) => {
  const btn = e.currentTarget;
  const shown = btn.classList.toggle('is-shown');
  btn.textContent = shown ? btn.dataset.name : 'tap to show';
  btn.setAttribute('aria-label', shown ? `Name: ${btn.dataset.name}. Tap to cover it again.` : 'Show the puzzle’s name. It can hint at the answer.');
});

// A daily puzzle on the board also gets a link to its own page on Chess.com or Lichess, which marks each move.
function showSolve() {
  const solve = $('go-solve');
  if (desk.kind === 'lichess') {
    solve.hidden = !desk.lid;
    solve.href = `https://lichess.org/training/${desk.lid}`;
    solve.textContent = 'Solve it on Lichess';
    return;
  }
  solve.hidden = !(desk.iso && ['today', 'date', 'random'].includes(desk.kind));
  if (!solve.hidden) {
    solve.href = `${DAILY_PAGE}/${desk.iso}`;
    solve.textContent = desk.kind === 'today' ? 'Solve today’s puzzle on Chess.com' : `Solve the ${shortDate(desk.iso)} puzzle on Chess.com`;
  }
}
function showNext() {
  const row = $('card-next-row');
  row.hidden = desk.kind !== 'today' || !todayIso;
  if (!row.hidden) $('card-next').textContent = whenText(nextPuzzleAt(todayIso));
}

function planNext() {
  clearTimeout(nextTimer);
  if (!todayIso) return;
  showNext();
  const late = Date.now() - nextPuzzleAt(todayIso);
  let wait;
  if (late < 0) wait = Math.min(-late + 30 * 1000, 30 * 60 * 1000); // a short nap at most, so a sleeping device doesn't drift
  else wait = late < 2 * 60 * 60 * 1000 ? 5 * 60 * 1000 : 30 * 60 * 1000;
  nextTimer = setTimeout(() => {
    if (Date.now() >= nextPuzzleAt(todayIso)) loadToday({ toDesk: false });
    else planNext();
  }, wait);
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
    source: 'Chess.com daily puzzle',
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
    showOnDesk({ kind: 'random', fen: p.fen, iso: p.iso, title: 'A random puzzle', source: 'Chess.com daily (random day)' });
  } catch {
    if (deskSeq !== deskAt) return;
    say('desk-status', 'Couldn’t get a random puzzle from Chess.com. Try again in a moment.', 'red');
  }
});

$('load-lichess').addEventListener('click', async () => {
  const deskAt = deskSeq;
  say('desk-status', 'Getting the Lichess puzzle…');
  try {
    const { fen, id } = await lichessPuzzle();
    if (deskSeq !== deskAt) return; // something else went on the board meanwhile
    showOnDesk({ kind: 'lichess', fen, title: 'Lichess puzzle of the day', source: 'Lichess puzzle of the day', name: id ? `puzzle #${id}` : '', lid: id });
  } catch {
    if (deskSeq !== deskAt) return;
    say('desk-status', 'Couldn’t reach Lichess. Try again in a moment.', 'red');
  }
});

$('copy-fen').addEventListener('click', () => {
  if (desk.fen) copy(play.fen, 'desk-status', !play.moved ? 'FEN copied.' : 'FEN of the board as it is now copied.');
});

/* --------------------------------------------------------------- Sound */

function showSound() {
  const on = !sound.isMuted();
  $('tool-sound').textContent = on ? 'Sound on' : 'Sound off';
  $('tool-sound').setAttribute('aria-pressed', String(on));
}
$('tool-sound').addEventListener('click', () => {
  sound.wake();
  sound.setMuted(!sound.isMuted());
  showSound();
  sound.play('move');
});
showSound();

/* -------------------------------------------------------------- Stockfish
 * Downloads in the background once a puzzle is on the board, and only
 * speaks when the learner taps Check my move.
 */

const mb = (n) => (n / 1e6).toFixed(1);
const LITE = engineById(DEFAULT_ENGINE);
let storage = null;
try {
  storage = window.localStorage;
} catch {
  /* blocked: the choice just isn't remembered */
}
// The engine picked last time (Lite unless the learner chose another), and
// Lite again if that one's last start never finished.
const choice = createChoice(storage);
const first = choice.start();
let active = first.engine;
/** Who checks the move, in the words the page uses: "Stockfish", or the engine's own name for anything else. */
const engineWho = () => (active.family === 'Stockfish' ? 'Stockfish' : active.name);
let notice = first.note; // why the page is back on Lite, kept on the state line until Lite is ready
let engine = createEngine({ spec: active, onState: showEngine });
let checkSeq = 0;
let checking = false;
let revealing = false;
let lastBest = null;

function showEngine(s) {
  if (s.spec !== active) return; // an engine the learner has swapped away from
  const bar = $('engine-bar');
  const state = $('engine-state');
  const name = active.name;
  $('engine').dataset.phase = s.phase;
  $('engine-stop').hidden = !(s.phase === 'download' && needsWarning(active));
  if (s.phase === 'download') {
    bar.max = s.total;
    bar.value = s.got;
    state.textContent = `Downloading ${name}: ${mb(s.got)} of ${mb(s.total)} MB. You can move the pieces meanwhile.`;
  } else if (s.phase === 'start') {
    bar.removeAttribute('value'); // an indeterminate bar while it starts
    if (s.checking) state.textContent = `Checking the ${name} download…`;
    else {
      choice.starting(active); // if the tab dies while it starts, the next visit uses Lite
      state.textContent = s.fromDevice ? `Starting ${name} from this device…` : `Starting ${name}…`;
    }
  } else if (s.phase === 'ready') {
    choice.ready(active);
    bar.max = 1;
    bar.value = 1;
    state.textContent = `${notice ? `${notice} ` : ''}${name} is ready on this device, kept for 30 days. It stays quiet until you tap Check my move.`;
    notice = '';
  } else if (s.phase === 'failed') {
    bar.max = 1;
    bar.value = 0;
    const back = choice.failed(active, s.error);
    if (back) {
      // Never retry a heavy engine that failed: the choice is Lite again, and Lite starts now.
      setTimeout(() => {
        useEngine(back.engine);
        notice = back.message;
        engineSay(back.message, 'red');
        engine.load().catch(() => {});
      }, 0);
    } else {
      state.textContent = 'Stockfish couldn’t load here. The board still works. Tap Check my move to try again.';
    }
  } else if (s.phase === 'idle' && s.cancelled) {
    bar.max = 1;
    bar.value = 0;
  }
  updateCheckButton();
}

// Swap the engine in use: the old one is stopped (its download too), the new one waits to be loaded.
function useEngine(spec) {
  checkSeq += 1; // a check the old engine was running is thrown away
  if (coachLine) coachSay(''); // so is a Coach check
  if (engine) engine.stop();
  active = spec;
  engine = createEngine({ spec, onState: showEngine });
  $('engine-name').textContent = spec.name;
  $('engine-show').textContent = `Show ${engineWho()}’s move`;
  $('engine').dataset.phase = 'idle';
  $('engine-stop').hidden = true;
  $('engine-bar').max = 1;
  $('engine-bar').value = 0;
  $('engine-state').textContent = `${spec.name} is chosen.`;
  lastBest = null;
  $('engine-show').hidden = true;
  updateCheckButton();
}

// The learner picked an engine in the picker (a heavy one only after its warning and second yes).
async function chooseEngine(spec) {
  if (spec.id === active.id) return;
  const prev = active;
  useEngine(spec);
  if (spec.id === DEFAULT_ENGINE) choice.pick(spec);
  engineSay('');
  try {
    await engine.load();
  } catch (err) {
    if (!isCancel(err) || active !== spec) return; // a failure falls back to Lite in showEngine
    // Stopped by the learner: back to the engine before, unless that one would need a big download too.
    const back = !needsWarning(prev) || (await isSaved(prev)) ? prev : LITE;
    useEngine(back);
    choice.pick(back);
    engineSay(`Download stopped. Check my move uses ${back.name}.`);
    engine.load().catch(() => {});
  }
}

$('engine-stop').addEventListener('click', () => engine.cancel());

const picker = createPicker({ getActive: () => active, isSaved, onChoose: chooseEngine });
$('engine-pick').addEventListener('click', () => picker.open($('engine-pick')));
$('engine-name').textContent = active.name;
$('engine-show').textContent = `Show ${engineWho()}’s move`;
if (first.note) engineSay(first.note, 'red');

function engineSay(text, tone = '') {
  say('engine-say', text, tone);
  if (text) writeIn($('engine-say'));
}

function updateCheckButton() {
  $('engine-check').disabled = checking || !play.playable || !play.lastMove();
}

let engineTimer = 0;
function startEngineSoon() {
  if (engine.phase !== 'idle' || engineTimer) return;
  const saveData = navigator.connection && navigator.connection.saveData;
  if (saveData) {
    $('engine-state').textContent = `Data Saver is on, so ${active.name} waits. It downloads (${formatBytes(active.bytes)}) when you tap Check my move.`;
    return;
  }
  // Let the puzzle and its pieces arrive first; the engine is a quiet second.
  engineTimer = setTimeout(async () => {
    const eng = engine;
    // A big engine never downloads by itself: only from the device, or when asked.
    if (needsWarning(eng.spec) && !(await isSaved(eng.spec))) {
      if (eng === engine && eng.phase === 'idle') {
        $('engine-state').textContent = `${eng.spec.name} isn’t on this device any more. It downloads (${formatBytes(eng.spec.bytes)}) when you tap Check my move, or pick another engine.`;
      }
      return;
    }
    if (eng === engine) eng.load().catch(() => {});
  }, 900);
}

const VERDICT = {
  best: [() => `That’s the move. ${engineWho()} agrees.`, 'blue'],
  good: [() => `Good move, close to ${engineWho()}’s choice.`, 'blue'],
  ok: [() => 'Playable, but there’s a stronger move here. Take it back and look again: checks, captures, threats.', 'red'],
  miss: [() => 'That one lets something go. Take it back and try another.', 'red'],
};

$('engine-check').addEventListener('click', async () => {
  sound.wake();
  const m = play.lastMove();
  if (!m) return;
  const seq = ++checkSeq;
  checking = true;
  updateCheckButton();
  $('engine-show').hidden = true;
  engineSay(engine.phase === 'ready' ? `${engineWho()} is looking…` : `Getting ${engineWho()} ready, then it looks…`);
  try {
    const line = play.line();
    const ended = play.result;
    const before = await engine.look({ fen: line.fen, moves: line.moves.slice(0, -1) });
    const played = `${m.from}${m.to}${m.promotion || ''}`;
    const playedBest = before.move === played;
    let afterCp = 0;
    // A move that ends the game is graded by how it ended: mate wins, a draw is level.
    if (ended === 'mate') afterCp = toCp({ mate: 0 });
    else if (ended === 'draw') afterCp = 0;
    else if (!playedBest) afterCp = toCp((await engine.look(line)).score);
    if (seq !== checkSeq) return; // the board moved on while it looked
    const verdict = grade({ bestCp: toCp(before.score), afterCp, playedBest });
    const [text, tone] = VERDICT[verdict];
    engineSay(text(), tone);
    sound.play(verdict === 'best' || verdict === 'good' ? 'good' : 'hmm');
    lastBest = before.move && !playedBest ? { move: before.move, after: m.after } : null;
    $('engine-show').hidden = !lastBest || verdict === 'best';
  } catch (err) {
    if (seq !== checkSeq) return;
    if (isCancel(err)) engineSay('Download stopped. Tap Check my move to start it again, or pick another engine.');
    else engineSay(`${engineWho()} couldn’t check that one. Try again.`, 'red');
  } finally {
    checking = false;
    updateCheckButton();
  }
});

// The answer only on purpose: take the learner's move back and draw the engine's in blue.
$('engine-show').addEventListener('click', () => {
  if (!lastBest || play.fen !== lastBest.after) return;
  const { move } = lastBest;
  revealing = true;
  play.undo();
  revealing = false;
  play.showArrow(move.slice(0, 2), move.slice(2, 4));
  engineSay(`${engineWho()}’s move is drawn in blue. Your move is taken back, so you can try it.`, 'blue');
  $('engine-show').hidden = true;
  lastBest = null;
});

// Coach check: the engine judges the learner's numbered line and marks the
// first move that fails in red pen. It never draws a line of its own.
$('draw-line-check').addEventListener('click', async () => {
  if (!shownLine) return;
  sound.wake();
  stopLine();
  pens.showCoach(null);
  const { fen: start, steps } = shownLine;
  const fens = replayLine(start, steps).fens;
  if (fens.length !== steps.length) return coachSay('This line no longer fits its position. Clear it and draw it again.');
  const key = lineKey(shownLine);
  const eng = engine;
  const seq = ++coachSeq;
  coachLine = key;
  const btn = $('draw-line-check');
  btn.disabled = true;
  let looked = 0;
  const busy = () => coachSay(`${engineWho()} is checking your line, move ${Math.min(looked + 1, steps.length)} of ${steps.length}…`, 'busy');
  coachSay(eng.phase === 'ready' ? `${engineWho()} is checking your line…` : `Getting ${engineWho()} ready, then it checks your line…`, 'busy');
  const alive = () => seq === coachSeq && eng === engine && lineKey(shownLine) === key;
  try {
    const r = await checkLine({
      start,
      steps,
      fens,
      alive,
      look: async (fen, moves) => {
        const answer = await eng.look({ fen, moves });
        looked = moves.length;
        if (alive()) busy();
        return answer;
      },
    });
    if (!r || !alive()) return;
    const at = steps[r.verdicts.length - 1]; // the failing move, or the last one checked (a line can end in mate or a draw early)
    pens.showCoach({ to: at.to, ok: r.fail < 0 });
    coachSay(r.note, r.fail < 0 ? 'ok' : '');
    sound.play(r.fail < 0 ? 'good' : 'hmm');
  } catch (err) {
    if (!alive()) return;
    if (isCancel(err)) coachSay('Download stopped. Tap Check line to start it again, or pick another engine.');
    else coachSay(`${engineWho()} couldn’t check that line. Try again.`);
  } finally {
    if (seq === coachSeq) btn.disabled = false;
  }
});

/* -------------------------------------------------------------- Calendar */

let calMonth = null; // { y, m } with m from 0
let calSource = 'chesscom'; // whose daily puzzles the pop-up shows: 'chesscom' | 'lichess'
const monthOf = (iso) => ({ y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) - 1 });
const monthName = ({ y, m }) => new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function dayCell(iso, d, lastIso) {
  const li = document.createElement('li');
  li.className = 'cal__cell';
  const fromLichess = calSource === 'lichess';
  const fen = fromLichess ? lichessSaved.get(iso)?.fen : saved.get(iso);
  const isToday = iso === lastIso;
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
    if (isToday) el.classList.add('is-today');
    el.dataset.iso = iso;
    el.setAttribute('aria-label', `${long}${isToday ? ', today' : ''}, ${sideText(fen)}. Puts it on the board.`);
  } else if (fromLichess) {
    el = document.createElement('span');
    el.className = 'cal__day is-missing';
    el.setAttribute('aria-label', `${long}, not saved`);
  } else {
    el = document.createElement('a');
    el.className = 'cal__day';
    el.href = `${DAILY_PAGE}/${iso}`;
    el.setAttribute('aria-label', `${long}, opens Chess.com’s puzzle page`);
  }
  if (desk.iso === iso && (desk.kind === 'lichess') === fromLichess) {
    el.classList.add('is-on');
    if (el.tagName === 'BUTTON') el.setAttribute('aria-current', 'true');
  }
  const n = document.createElement('span');
  n.className = 'cal__n';
  n.textContent = String(d);
  el.append(n);
  if (fen) {
    el.insertAdjacentHTML('beforeend', markSVG('circle', 115, 100, seedFrom(`cal:${calSource}:${iso}`), 'cal__loop'));
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
  const lastIso = calSource === 'lichess' ? utcIso() : todayIso || localIso();
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
  // Draw each loop once, the first time it shows up in the open pop-up.
  if (!$('cal-pop').open) return;
  let k = 0;
  grid.querySelectorAll('.is-saved').forEach((el) => {
    const key = `${calSource}:${el.dataset.iso}`;
    if (drawnLoops.has(key)) return;
    drawnLoops.add(key);
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
  if (!day) return;
  closeCalendar();
  if (calSource === 'lichess') loadLichessDate(day.dataset.iso);
  else loadSavedDate(day.dataset.iso);
});

function loadLichessDate(iso) {
  const p = lichessSaved.get(iso);
  if (!p) return;
  showOnDesk({ kind: 'lichess', fen: p.fen, iso, title: `Lichess puzzle of ${shortDate(iso)}`, source: 'Lichess puzzle of the day', name: `puzzle #${p.id}`, lid: p.id });
  bringDeskIntoView();
}

function setCalSource(src) {
  calSource = src;
  $('cal-src').querySelectorAll('.cal-src__opt').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.src === src)));
  $('cal-key-chesscom').hidden = src !== 'chesscom';
  $('cal-key-lichess').hidden = src !== 'lichess';
}
$('cal-src').addEventListener('click', (e) => {
  const opt = e.target.closest('.cal-src__opt');
  if (!opt || opt.dataset.src === calSource) return;
  setCalSource(opt.dataset.src);
  renderCalendar();
});

// The calendar lives in a pop-up, opened from "Pick a date" next to the board.
const calPop = $('cal-pop');
function openCalendar() {
  setCalSource(desk.kind === 'lichess' ? 'lichess' : 'chesscom');
  if (desk.iso) calMonth = monthOf(desk.iso);
  if (typeof calPop.showModal === 'function') calPop.showModal();
  else calPop.setAttribute('open', '');
  renderCalendar();
  (calPop.querySelector('.cal__day.is-on') || calPop.querySelector('.cal__day.is-today') || $('cal-close')).focus();
}
function closeCalendar() {
  if (typeof calPop.close === 'function') calPop.close();
  else calPop.removeAttribute('open');
}
// The FEN/PGN help sheet: opens from under the paste box, closes on × or a tap outside.
const howSheet = $('how-sheet');
$('how-open').addEventListener('click', () => {
  if (typeof howSheet.showModal === 'function') howSheet.showModal();
  else howSheet.setAttribute('open', '');
  $('how-close').focus();
});
function closeHow() {
  if (typeof howSheet.close === 'function') howSheet.close();
  else howSheet.removeAttribute('open');
}
$('how-close').addEventListener('click', closeHow);
howSheet.addEventListener('click', (e) => {
  if (e.target === howSheet) closeHow();
  // A link inside the sheet (to "My games") closes it and jumps there.
  if (e.target.closest('[data-how-close]')) closeHow();
});
howSheet.addEventListener('close', () => $('how-open').focus({ preventScroll: true }));

$('pick-date').addEventListener('click', openCalendar);
$('cal-close').addEventListener('click', closeCalendar);
// A tap on the dimmed page around the pop-up closes it too.
calPop.addEventListener('click', (e) => {
  if (e.target === calPop) closeCalendar();
});
calPop.addEventListener('close', () => $('pick-date').focus({ preventScroll: true }));

async function loadSaved() {
  try {
    const j = await getJson(ARCHIVE, { cache: 'no-cache' });
    for (const [iso, fen] of Object.entries(j.puzzles || {})) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso) && typeof fen === 'string' && cleanFen(fen) && !saved.has(iso)) saved.set(iso, fen);
    }
    for (const [iso, name] of Object.entries(j.names || {})) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso) && typeof name === 'string' && name.trim() && !names.has(iso)) names.set(iso, name.trim().slice(0, 120));
    }
    for (const [iso, p] of Object.entries(j.lichess || {})) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso) && p && /^[A-Za-z0-9]{5}$/.test(p.id || '') && typeof p.fen === 'string' && cleanFen(p.fen)) lichessSaved.set(iso, { id: p.id, fen: p.fen });
    }
    // The name may arrive after the puzzle went on the board.
    if (desk.iso && desk.kind !== 'lichess' && names.has(desk.iso) && $('card-name-row').hidden) showName(names.get(desk.iso));
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
updateCheckButton();
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
