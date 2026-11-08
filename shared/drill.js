import {replay} from './replay.js';
import {createChess} from './chess.js';

// A drill plays one course line: the learner plays their side, the app answers with the book
// reply. Same shape as Chessly's Drills and Chessable's MoveTrainer. Pure functions over a plain
// session; the caller stores it and passes the line back in each time.
//
//   session {id, courseId, lineId, ply, misses, hints, here:{misses, hints}, state:'active'|'done', result:null|'pass'|'hinted'|'miss', tries:[{ply, move, correct}], revision}
//   misses and hints count the whole drill and grade it; here counts only the current position, so a
//   hint or the shown move never carries over to the learner's next move.
//
// The hint ladder is the one Review Practice and the tutor loop use: 1 shows the piece's square,
// 2 shows the move. After MAX_MISSES wrong tries the app shows the move and the learner plays it
// (counted as a miss, so the schedule sees it).

export const MAX_MISSES = 2;
export const HINT_LEVELS = 2;
const fail = (message, status = 400) => { throw Object.assign(new Error(message), {status}); };

const sideAt = (line, ply) => replay(line.moves.slice(0, ply), line.startFen).turn();
const learnerToMove = (line, ply) => ply < line.moves.length && sideAt(line, ply) === line.side;

// Advances past the opponent's book moves to the learner's next move, or the end of the line.
function advance(line, ply) {
  while (ply < line.moves.length && !learnerToMove(line, ply)) ply += 1;
  return ply;
}

export function createDrill({id, course, line, now}) {
  if (typeof id !== 'string' || !id) throw new TypeError('A drill needs an id.');
  return {id, courseId: course.id, lineId: line.id, ply: advance(line, 0), misses: 0, hints: 0, here: {misses: 0, hints: 0}, state: 'active', result: null, tries: [], revision: 0, startedAt: now, updatedAt: now};
}

// Everything the board needs: the moves played so far, whose turn it is, the hint if asked, and
// the notes up to here. The remaining book moves stay hidden.
export function drillView(session, line) {
  const played = line.moves.slice(0, session.ply);
  const board = replay(played, line.startFen);
  const expected = session.ply < line.moves.length ? line.moves[session.ply] : null;
  const notes = Object.fromEntries(Object.entries(line.notes || {}).filter(([ply]) => Number(ply) <= session.ply));
  const marks = Object.fromEntries(Object.entries(line.marks || {}).filter(([ply]) => Number(ply) <= session.ply));
  const here = session.here || {misses: session.misses, hints: session.hints};
  const required = session.state === 'active' && here.misses >= MAX_MISSES ? expected : null;
  return {
    id: session.id, courseId: session.courseId, lineId: line.id, title: line.title, side: line.side, startFen: line.startFen,
    moves: played, fen: board.fen(), toMove: board.turn(), ply: session.ply, total: line.moves.length,
    state: session.state, result: session.result, misses: session.misses, hints: session.hints, revision: session.revision,
    hint: here.hints === 0 || !expected || session.state !== 'active' ? null : here.hints === 1 ? {from: expected.slice(0, 2)} : {from: expected.slice(0, 2), to: expected.slice(2, 4), move: expected},
    required, notes, marks, lastMove: played.at(-1) || null,
  };
}

export function askHint(session) {
  if (session.state !== 'active') fail('This drill is finished.', 409);
  const here = session.here || {misses: 0, hints: 0};
  if (here.hints >= HINT_LEVELS) return session;
  return {...session, hints: session.hints + 1, here: {...here, hints: here.hints + 1}, revision: session.revision + 1};
}

function finish(session, now) {
  const result = session.misses > 0 ? 'miss' : session.hints > 0 ? 'hinted' : 'pass';
  return {...session, state: 'done', result, updatedAt: now};
}

// One learner move. Returns {session, correct, done, reply} where reply is the book's answer that
// was played for the opponent (null at the end of the line).
export function playDrillMove(session, line, move, now) {
  if (session.state !== 'active') fail('This drill is finished.', 409);
  if (typeof move !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) fail('Choose a legal move, including the promotion piece when needed.');
  const board = replay(line.moves.slice(0, session.ply), line.startFen);
  try { board.move({from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4]}); }
  catch { fail('That move is not legal in this position.'); }
  const expected = line.moves[session.ply];
  const next = {...session, tries: [...session.tries, {ply: session.ply, move, correct: move === expected}], revision: session.revision + 1, updatedAt: now};
  const here = session.here || {misses: 0, hints: 0};
  if (move !== expected) {
    next.misses += 1;
    // A miss moves one rung up this position's hint ladder, so the learner always gets something new.
    const misses = here.misses + 1, hints = misses < MAX_MISSES ? Math.min(HINT_LEVELS, here.hints + 1) : HINT_LEVELS;
    next.hints += hints - here.hints;
    next.here = {misses, hints};
    return {session: next, correct: false, done: false, reply: null, expectedShown: misses >= MAX_MISSES};
  }
  next.here = {misses: 0, hints: 0};
  const after = advance(line, session.ply + 1);
  const reply = after > session.ply + 1 ? line.moves.slice(session.ply + 1, after) : [];
  next.ply = after;
  if (after >= line.moves.length) return {session: finish(next, now), correct: true, done: true, reply};
  return {session: next, correct: true, done: false, reply};
}

// The first side to move in a line, used by import to pick a default learner side.
export const firstMover = line => createChess(line.startFen).turn();
