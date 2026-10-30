import {lessons, puzzles, catalog} from '../../../../shared/content.js';
import {curriculumCatalog} from '../../../../shared/curriculum.js';
import {lessonView, sessionSummary, startLesson, lessonStep} from '../../../../shared/course-progress.js';
import {replay} from '../../../../shared/replay.js';
import {fail, respond} from '../context.js';

// Starter lessons and puzzles, and the course curriculum with saved lesson sessions.
export default function lessonRoutes(ctx) {
  const {store, now, atomic, addProgress, progress} = ctx;
  async function list() {
    const completed = (await store.list('progress', {index: 'kind', value: 'lesson'})).map(row => row.itemId).sort();
    const sessions = (await store.list('lesson_sessions')).sort((a, b) => b.updatedAt - a.updatedAt).map(sessionSummary);
    return {completed, sessions};
  }
  const response = async session => ({session: lessonView(session), progress: await list()});
  return [
    ['GET', '/api/learn', () => catalog()],
    ['GET', '/api/curriculum', () => curriculumCatalog()],
    ['GET', '/api/lesson-progress', () => list()],
    ['POST', '/api/course-lessons/:id/start', async ({params, body}) => {
      const {session, fresh} = startLesson(params.id, await store.get('lesson_sessions', params.id), body, now());
      if (fresh) await store.put('lesson_sessions', session);
      return respond(201, await response(session));
    }],
    ['POST', '/api/course-lessons/:id/action', async ({params, body}) => {
      const {session, correct, message} = await atomic(async () => {
        const s = await store.get('lesson_sessions', params.id), step = lessonStep(params.id, s, body, now());
        if (s.state === 'complete') await addProgress('lesson', params.id);
        await store.put('lesson_sessions', s);
        return {session: s, ...step};
      });
      return {...await response(session), correct, message};
    }],
    ['POST', '/api/lessons/:id/answer', async ({params, body}) => {
      const lesson = lessons.find(x => x.id === params.id); if (!lesson) fail(404, 'Lesson not found.');
      if (!Number.isInteger(body.choice) || body.choice < 0 || body.choice >= lesson.choices.length) fail(400, 'Choose one of the answers.');
      const correct = body.choice === lesson.answer;
      if (correct) await addProgress('lesson', lesson.id);
      return {correct, explanation: lesson.explanation, progress: await progress()};
    }],
    ['POST', '/api/puzzles/:id/answer', async ({params, body}) => {
      const puzzle = puzzles.find(x => x.id === params.id); if (!puzzle) fail(404, 'Puzzle not found.');
      const {moves} = body;
      if (!Array.isArray(moves) || !moves.length || moves.length > puzzle.solution.length || moves.length % 2 !== 1 || !moves.every(m => typeof m === 'string')) fail(400, 'Submit your move and the replies already shown in this puzzle.');
      const solvedBoard = replay(moves, puzzle.fen);
      const matingMove = puzzle.theme === 'Mate in one' && moves.length === 1 && solvedBoard.isCheckmate();
      const correct = matingMove || moves.every((m, i) => m === puzzle.solution[i]), complete = correct && moves.length === puzzle.solution.length;
      if (complete) await addProgress('puzzle', puzzle.id);
      return {correct, complete, reply: correct && !complete ? puzzle.solution[moves.length] : null, explanation: complete ? (matingMove ? `${solvedBoard.history().at(-1)} is checkmate: the opposing king has no legal escape from check.` : puzzle.explanation) : correct ? 'Correct. Consider the opponent’s reply and continue.' : 'That is not the intended solution. Try again or reveal the hint.', progress: await progress()};
    }],
  ];
}
