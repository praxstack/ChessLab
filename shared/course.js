import {replay} from './replay.js';
import {validateMarks} from './board-marks.js';
import {createChess} from './chess.js';

// A course is what Chessly, Chessable and Chess.com Courses all sell underneath: chapters of lines
// the learner drills from one side, with a note per move, plus idea quizzes. This module owns the
// shape and the limits. Storage, scheduling and drilling live elsewhere (trainer-schedule.js,
// drill.js). Pure functions over plain objects; the rules library owns legality.
//
// course   {id, version:1, title, blurb, level, colour, stage, source, chapters:[chapter], createdAt, updatedAt}
// chapter  {id, title, explain:[text], lines:[line], quizzes:[quiz]}
// line     {id, title, startFen|null, side:'w'|'b', moves:[uci], notes:{ply:text}, marks:{ply:[mark]}, verified|null}
// quiz     {id, fen|null, question, choices:[text], answer:index, why}
// verified {engine, depth, cp}  the engine's view of the line's last position, from the learner's side

export const COURSE_VERSION = 1;
export const LEVELS = ['beginner', 'intermediate', 'advanced', 'all'];
export const COLOURS = ['w', 'b', 'both'];
export const STAGES = ['opening', 'middlegame', 'endgame', 'tactics', 'skills'];
export const SOURCE_KINDS = ['own', 'pgn', 'lichess-study', 'generated', 'public-domain'];
export const LIMITS = {
  chapters: 60, linesPerCourse: 600, quizzesPerCourse: 600, movesPerLine: 120, totalMoves: 20000,
  title: 120, blurb: 600, note: 1500, explain: 20, explainText: 2000, question: 400, choice: 200, choices: [2, 4],
};

const ID = /^[\w-]{1,80}$/;
const fail = (message, status = 400) => { throw Object.assign(new Error(message), {status}); };
const text = (value, max, what) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${what} needs text of at most ${max} characters.`);
  return value.trim();
};
const optionalText = (value, max, what) => value === undefined || value === null || value === '' ? '' : text(value, max, what);
const oneOf = (value, allowed, what) => { if (!allowed.includes(value)) fail(`${what} must be one of: ${allowed.join(', ')}.`); return value; };
const ids = new WeakMap();
function uniqueId(scope, value, what) {
  if (typeof value !== 'string' || !ID.test(value)) fail(`${what} needs an id of letters, digits, - or _ (at most 80).`);
  let seen = ids.get(scope); if (!seen) { seen = new Set(); ids.set(scope, seen); }
  if (seen.has(value)) fail(`${what} id "${value}" is used twice in this course.`);
  seen.add(value); return value;
}

export function validateLine(input, scope, counter) {
  if (!input || typeof input !== 'object') fail('A line must be an object.');
  const line = {id: uniqueId(scope, input.id, 'A line'), title: optionalText(input.title, LIMITS.title, 'A line title')};
  line.startFen = input.startFen === undefined || input.startFen === null || input.startFen === '' ? null : input.startFen;
  line.side = oneOf(input.side, ['w', 'b'], 'A line side');
  if (!Array.isArray(input.moves) || !input.moves.length || input.moves.length > LIMITS.movesPerLine) fail(`A line needs 1 to ${LIMITS.movesPerLine} moves.`);
  counter.moves += input.moves.length;
  if (counter.moves > LIMITS.totalMoves) fail(`A course holds at most ${LIMITS.totalMoves} moves in total.`);
  // replay throws with a 400 status on any illegal move or bad FEN; the message says which line.
  let board; try { board = replay(input.moves, line.startFen); } catch (error) { fail(`Line "${line.id}": ${error.message}`); }
  line.moves = [...input.moves];
  line.notes = {}; line.marks = {};
  for (const [key, value] of Object.entries(input.notes || {})) {
    const ply = Number(key);
    if (!/^\d+$/.test(key) || ply > line.moves.length) fail(`Line "${line.id}" has a note at ply ${key}, outside its moves.`);
    const note = optionalText(value, LIMITS.note, 'A note'); if (note) line.notes[ply] = note;
  }
  for (const [key, value] of Object.entries(input.marks || {})) {
    const ply = Number(key);
    if (!/^\d+$/.test(key) || ply > line.moves.length) fail(`Line "${line.id}" has drawings at ply ${key}, outside its moves.`);
    try { const marks = validateMarks(value); if (marks.length) line.marks[ply] = marks; }
    catch (error) { fail(`Line "${line.id}": ${error.message}`); }
  }
  if (input.verified !== undefined && input.verified !== null) {
    const v = input.verified;
    if (!v || typeof v !== 'object' || typeof v.engine !== 'string' || !Number.isInteger(v.depth) || v.depth < 1 || !Number.isInteger(v.cp)) fail(`Line "${line.id}" has an invalid engine check; it needs engine, depth and cp.`);
    line.verified = {engine: v.engine.slice(0, 80), depth: v.depth, cp: v.cp};
  } else line.verified = null;
  // A line must give the learner at least one move to play.
  const first = createChess(line.startFen).turn();
  const learnerMoves = line.moves.filter((_, index) => (index % 2 === 0 ? first : first === 'w' ? 'b' : 'w') === line.side).length;
  if (!learnerMoves) fail(`Line "${line.id}" has no move for ${line.side === 'w' ? 'White' : 'Black'} to play.`);
  line.endFen = board.fen();
  return line;
}

export function validateQuiz(input, scope) {
  if (!input || typeof input !== 'object') fail('A quiz must be an object.');
  const quiz = {id: uniqueId(scope, input.id, 'A quiz')};
  quiz.fen = input.fen === undefined || input.fen === null || input.fen === '' ? null : input.fen;
  if (quiz.fen !== null) replay([], quiz.fen);
  quiz.question = text(input.question, LIMITS.question, 'A quiz question');
  if (!Array.isArray(input.choices) || input.choices.length < LIMITS.choices[0] || input.choices.length > LIMITS.choices[1]) fail(`A quiz needs ${LIMITS.choices[0]} to ${LIMITS.choices[1]} answers.`);
  quiz.choices = input.choices.map(choice => text(choice, LIMITS.choice, 'A quiz answer'));
  if (!Number.isInteger(input.answer) || input.answer < 0 || input.answer >= quiz.choices.length) fail(`Quiz "${quiz.id}" needs the index of the right answer.`);
  quiz.answer = input.answer;
  quiz.why = optionalText(input.why, LIMITS.note, 'A quiz explanation');
  return quiz;
}

export function validateSource(input) {
  if (!input || typeof input !== 'object') fail('A course needs a source: who wrote it and under what licence.');
  const source = {kind: oneOf(input.kind, SOURCE_KINDS, 'A source kind')};
  source.author = optionalText(input.author, LIMITS.title, 'A source author');
  source.licence = optionalText(input.licence, LIMITS.title, 'A source licence');
  source.url = optionalText(input.url, 500, 'A source link');
  if (source.url && !/^https:\/\/[^\s]+$/.test(source.url)) fail('A source link must start with https://.');
  return source;
}

// Returns a fresh, normalised course or throws a 400 error that names the problem.
export function validateCourse(input, {createdAt} = {}) {
  if (!input || typeof input !== 'object') fail('A course must be an object.');
  if (input.version !== undefined && input.version !== COURSE_VERSION) fail(`This course is version ${input.version}; this app reads version ${COURSE_VERSION}.`);
  const scope = {}, counter = {moves: 0};
  const course = {
    id: uniqueId(scope, input.id, 'A course'), version: COURSE_VERSION,
    title: text(input.title, LIMITS.title, 'A course title'), blurb: optionalText(input.blurb, LIMITS.blurb, 'A course blurb'),
    level: oneOf(input.level ?? 'all', LEVELS, 'A course level'), colour: oneOf(input.colour ?? 'both', COLOURS, 'A course colour'),
    stage: oneOf(input.stage ?? 'opening', STAGES, 'A course stage'), source: validateSource(input.source),
  };
  if (!Array.isArray(input.chapters) || !input.chapters.length || input.chapters.length > LIMITS.chapters) fail(`A course needs 1 to ${LIMITS.chapters} chapters.`);
  let lines = 0, quizzes = 0;
  course.chapters = input.chapters.map(chapterInput => {
    if (!chapterInput || typeof chapterInput !== 'object') fail('A chapter must be an object.');
    const chapter = {id: uniqueId(scope, chapterInput.id, 'A chapter'), title: text(chapterInput.title, LIMITS.title, 'A chapter title')};
    const explain = chapterInput.explain ?? [];
    if (!Array.isArray(explain) || explain.length > LIMITS.explain) fail(`A chapter holds at most ${LIMITS.explain} explain paragraphs.`);
    chapter.explain = explain.map(p => text(p, LIMITS.explainText, 'An explain paragraph'));
    if (!Array.isArray(chapterInput.lines ?? []) || !Array.isArray(chapterInput.quizzes ?? [])) fail('Chapter lines and quizzes must be lists.');
    chapter.lines = (chapterInput.lines ?? []).map(line => validateLine(line, scope, counter));
    chapter.quizzes = (chapterInput.quizzes ?? []).map(quiz => validateQuiz(quiz, scope));
    lines += chapter.lines.length; quizzes += chapter.quizzes.length;
    if (!chapter.lines.length && !chapter.quizzes.length) fail(`Chapter "${chapter.title}" has no lines and no quizzes.`);
    return chapter;
  });
  if (lines > LIMITS.linesPerCourse) fail(`A course holds at most ${LIMITS.linesPerCourse} lines.`);
  if (quizzes > LIMITS.quizzesPerCourse) fail(`A course holds at most ${LIMITS.quizzesPerCourse} quizzes.`);
  course.createdAt = typeof input.createdAt === 'string' ? input.createdAt : (createdAt ?? new Date().toISOString());
  course.updatedAt = createdAt ?? course.createdAt;
  return course;
}

export const courseLines = course => course.chapters.flatMap(chapter => chapter.lines.map(line => ({...line, chapterId: chapter.id})));
export const courseQuizzes = course => course.chapters.flatMap(chapter => chapter.quizzes.map(quiz => ({...quiz, chapterId: chapter.id})));
export function findLine(course, lineId) { return courseLines(course).find(line => line.id === lineId) || null; }
export function findQuiz(course, quizId) { return courseQuizzes(course).find(quiz => quiz.id === quizId) || null; }

// The card a course list shows: Chessly-style counts, without the lines themselves.
export function courseSummary(course) {
  const lines = courseLines(course), quizzes = courseQuizzes(course);
  return {
    id: course.id, title: course.title, blurb: course.blurb, level: course.level, colour: course.colour, stage: course.stage, source: course.source,
    chapters: course.chapters.length, lines: lines.length, quizzes: quizzes.length, moves: lines.reduce((sum, line) => sum + line.moves.length, 0),
    verified: lines.filter(line => line.verified).length, createdAt: course.createdAt, updatedAt: course.updatedAt,
  };
}

// The learner-facing copy of a chapter: quiz answers stay hidden until answered.
export function chapterView(chapter) {
  return {...chapter, quizzes: chapter.quizzes.map(({answer, why, ...quiz}) => quiz)};
}
export const courseView = course => ({...course, chapters: course.chapters.map(chapterView)});
