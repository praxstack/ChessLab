import {parse} from 'chess.js/src/pgn.js';
import {replay} from './replay.js';
import {readMarkComment} from './board-marks.js';
import {validateCourse, LIMITS} from './course.js';

// Turns a PGN (one or many games) or a Lichess study export into a course. Each game becomes a
// chapter; each leaf of its variation tree becomes a drillable line; comments become notes and
// [%cal]/[%csl] drawings become marks. This is Chessable's own authoring loop (one PGN per
// chapter, every variation a line) without leaving the app.

const fail = (message, status = 400) => { throw Object.assign(new Error(message), {status}); };
const byteLength = text => new TextEncoder().encode(text).length;
const uci = m => m.from + m.to + (m.promotion || '');
const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'course';

export const MAX_PGN_BYTES = 2_000_000;
export const MAX_LINES = LIMITS.linesPerCourse;

// Splits a multi-game PGN at a blank line followed by a tag line. Works one line at a time, so it
// stays linear on long runs of blank lines. Tag lines are never scanned for comment delimiters (a
// brace inside a quoted tag value is just text); in movetext, {...} comments and ; to the end of a
// line are skipped, so a note with a blank line or a [ at the start of a line never splits a game.
export function splitGames(pgn) {
  const games = [];
  let current = [], inBrace = false, blank = false;
  for (const line of pgn.replace(/\r\n?/g, '\n').split('\n')) {
    if (!inBrace && /^\s*\[/.test(line)) {
      if (blank && current.some(l => l.trim())) { games.push(current.join('\n')); current = []; }
      blank = false; current.push(line); continue;
    }
    current.push(line);
    if (!inBrace && !line.trim()) { blank = true; continue; }
    blank = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inBrace) { if (c === '}') inBrace = false; }
      else if (c === '{') inBrace = true;
      else if (c === ';') break;
    }
  }
  games.push(current.join('\n'));
  return games.map(game => game.trim()).filter(Boolean);
}

// Walks one parsed game and returns its leaf lines. The main line of every node comes first, so
// the chapter's first line is the author's main line.
function linesOf(root, initialFen) {
  const lines = [];
  let queued = 0;   // alternatives waiting to be walked; each will become at least one line
  function walk(node, prefix, notes, marks) {
    const board = replay(prefix, initialFen);
    const moves = [...prefix], noteMap = {...notes}, markMap = {...marks};
    let cursor = node;
    const deferred = [];
    const note = (n, ply) => {
      let parsed; try { parsed = readMarkComment(n.comment || ''); } catch (error) { fail(error.message); }
      if (parsed.comment) noteMap[ply] = parsed.comment.slice(0, LIMITS.note);
      if (parsed.marks.length) markMap[ply] = parsed.marks;
    };
    // The first node of a game or a variation carries the comment written before its first move.
    note(node, prefix.length);
    while (cursor.variations?.length) {
      // Alternatives wait until the main continuation is recorded, so the author's main line comes first.
      // Limits are checked before any prefix is copied, so a huge PGN is refused before it costs memory.
      queued += cursor.variations.length - 1;
      if (lines.length + queued > MAX_LINES) fail(`Import at most ${MAX_LINES} lines per course.`);
      if (moves.length >= LIMITS.movesPerLine) fail(`A line holds at most ${LIMITS.movesPerLine} moves.`);
      for (const alternative of cursor.variations.slice(1)) deferred.push([alternative, [...moves], {...noteMap}, {...markMap}]);
      const next = cursor.variations[0];
      let move; try { move = board.move(next.move, {strict: true}); } catch { fail('This PGN contains an illegal move in a game or a variation.'); }
      moves.push(uci(move)); note(next, moves.length); cursor = next;
      if (lines.length > MAX_LINES) fail(`Import at most ${MAX_LINES} lines per course.`);
    }
    if (moves.length > prefix.length || !lines.length) lines.push({moves, notes: noteMap, marks: markMap});
    for (const [alternative, prefixMoves, notes2, marks2] of deferred) { queued -= 1; walk(alternative, prefixMoves, notes2, marks2); }
  }
  walk(root, [], {}, {});
  return lines;
}

// options: {id, title, side:'w'|'b'|null, level, stage, source:{kind,author,licence,url}, blurb}
export function courseFromPgn(pgn, options = {}, {now} = {}) {
  if (typeof pgn !== 'string' || pgn.length < 3 || byteLength(pgn) > MAX_PGN_BYTES) fail('Import a PGN between 3 characters and 2 MB.');
  const games = splitGames(pgn);
  if (!games.length) fail('This PGN has no games.');
  const chapters = [], events = new Set();
  let total = 0, annotator = '';
  games.forEach((text, index) => {
    let parsed; try { parsed = parse(text); } catch { fail(`Game ${index + 1} of this PGN has an invalid position, move or variation.`); }
    // Lichess labels a study chapter set up from a position "From Position"; it is still standard chess.
    if (parsed.headers.Variant && !['Standard', 'From Position'].includes(parsed.headers.Variant)) fail('Only Standard chess PGNs can become a course.');
    const initialFen = parsed.headers.FEN || null;
    const title = (parsed.headers.ChapterName || parsed.headers.Event || `Chapter ${index + 1}`).slice(0, LIMITS.title);
    events.add(parsed.headers.Event || ''); if (!annotator && parsed.headers.Annotator) annotator = parsed.headers.Annotator;
    const lines = linesOf(parsed.root, initialFen).filter(line => line.moves.length);
    if (!lines.length) return;
    total += lines.length;
    if (chapters.length >= LIMITS.chapters && !(parsed.headers.ChapterName && chapters.some(c => c.title === title))) fail(`Import at most ${LIMITS.chapters} chapters per course.`);
    if (total > MAX_LINES) fail(`Import at most ${MAX_LINES} lines per course.`);
    const first = replay([], initialFen).turn();
    // An explicit choice wins, then the Side header our own export writes, then the first mover.
    const headerSide = {White: 'w', Black: 'b'}[parsed.headers.Side];
    const side = options.side === 'w' || options.side === 'b' ? options.side : headerSide || first;
    // Games that name the same chapter (our own export writes one game per line) join one chapter.
    let chapter = parsed.headers.ChapterName ? chapters.find(c => c.title === title) : null;
    if (!chapter) {
      const chapterId = `c${chapters.length + 1}`;
      chapter = {id: chapterId, title, explain: parsed.root?.comment ? [readMarkComment(parsed.root.comment).comment].filter(Boolean) : [], lines: [], quizzes: []};
      chapters.push(chapter);
    }
    const lineTitle = parsed.headers.LineTitle;
    for (const line of lines) {
      const n = chapter.lines.length + 1;
      chapter.lines.push({id: `${chapter.id}-l${n}`, title: lineTitle && lines.length === 1 ? lineTitle : `Line ${n}`, startFen: initialFen, side, moves: line.moves, notes: line.notes, marks: line.marks});
    }
  });
  if (!chapters.length) fail('This PGN has no moves to drill.');
  // An explicit title wins. A one-game PGN takes its chapter's name; a multi-game PGN whose games all
  // share one Event (our own export writes the course title there) takes that Event.
  const sharedEvent = events.size === 1 && ![...events][0].match(/^\??$/) ? [...events][0] : '';
  const title = options.title || (games.length === 1 && chapters[0].title !== 'Chapter 1' ? chapters[0].title : sharedEvent || 'Imported course');
  // A study's Annotator header names its author when the caller gave none.
  const source = options.source ? {...options.source} : {kind: 'pgn'};
  if (!source.author && annotator) source.author = annotator.slice(0, LIMITS.title);
  return validateCourse({
    id: options.id || `${slug(title)}-${Date.now().toString(36)}`, title, blurb: options.blurb || '',
    level: options.level || 'all', colour: options.side === 'w' ? 'w' : options.side === 'b' ? 'b' : 'both', stage: options.stage || 'opening',
    source, chapters,
  }, {createdAt: now ? new Date(now).toISOString() : undefined});
}

// Accepts a study link or id and returns its public PGN export address, or null when the text is
// not a Lichess study. Fetching is the caller's job (browser fetch, no key needed for public studies).
export function lichessStudyExportUrl(input) {
  if (typeof input !== 'string') return null;
  const text = input.trim();
  let match = text.match(/^https:\/\/lichess\.org\/study\/([A-Za-z0-9]{8})(?:\/([A-Za-z0-9]{8}))?(?:[/?#]|$)/);
  if (match) return match[2] ? `https://lichess.org/api/study/${match[1]}/${match[2]}.pgn` : `https://lichess.org/api/study/${match[1]}.pgn`;
  match = text.match(/^([A-Za-z0-9]{8})$/);
  return match ? `https://lichess.org/api/study/${match[1]}.pgn` : null;
}

// The canonical study link for a study link or bare id, or null.
export function lichessStudyLink(input) {
  const url = lichessStudyExportUrl(input);
  if (!url) return null;
  const [, id, chapter] = url.match(/study\/([A-Za-z0-9]{8})(?:\/([A-Za-z0-9]{8}))?\.pgn$/);
  return chapter ? `https://lichess.org/study/${id}/${chapter}` : `https://lichess.org/study/${id}`;
}

// Writes a course back out as one PGN per chapter (Chessable's export shape), so a course made
// here can move to any other trainer. Notes and marks travel as comments.
export function courseToPgn(course) {
  const comment = (text, marks) => {
    const parts = [];
    if (text) parts.push(text.replace(/[{}]/g, c => c === '{' ? '[' : ']').replace(/[\r\n]+/g, ' '));
    const arrows = (marks || []).filter(m => m.from !== m.to).map(m => m.color + m.from + m.to), squares = (marks || []).filter(m => m.from === m.to).map(m => m.color + m.from);
    if (arrows.length) parts.push(`[%cal ${arrows.join(',')}]`);
    if (squares.length) parts.push(`[%csl ${squares.join(',')}]`);
    return parts.length ? ` {${parts.join(' ')}}` : '';
  };
  return course.chapters.map(chapter => chapter.lines.map(line => {
    const board = replay([], line.startFen);
    let out = `[Event "${course.title.replace(/"/g, "'")}"]\n[ChapterName "${chapter.title.replace(/"/g, "'")}"]\n[LineTitle "${(line.title || '').replace(/"/g, "'")}"]\n[Side "${line.side === 'w' ? 'White' : 'Black'}"]\n`;
    if (line.startFen) out += `[SetUp "1"]\n[FEN "${line.startFen}"]\n`;
    out += '\n';
    const head = comment(line.notes?.[0], line.marks?.[0]); if (head) out += head.trim() + ' ';
    line.moves.forEach((move, index) => {
      // Move numbers come from the board, so a line starting from a FEN keeps its real numbering.
      const number = board.moveNumber(), colour = board.turn();
      const m = board.move({from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4]});
      const ply = index + 1;
      out += (colour === 'w' ? `${number}. ` : index === 0 ? `${number}... ` : '') + m.san + comment(line.notes?.[ply], line.marks?.[ply]) + ' ';
    });
    return out.trim() + ' *\n';
  }).join('\n')).join('\n');
}
