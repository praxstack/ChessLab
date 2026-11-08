import {randomUUID, randomInt} from '../../../../shared/random.js';
import {validateCourse, courseSummary, courseView, courseLines, courseQuizzes, findLine, findQuiz} from '../../../../shared/course.js';
import {courseFromPgn, lichessStudyExportUrl, lichessStudyLink, courseToPgn, MAX_PGN_BYTES} from '../../../../shared/course-import.js';
import {createCard, review, dueCards, scheduleSummary, stepLabel, MODES} from '../../../../shared/trainer-schedule.js';
import {createDrill, drillView, playDrillMove, askHint} from '../../../../shared/drill.js';
import {fail, respond} from '../context.js';

// Course trainer: courses, their spaced-repetition cards and drill sessions. Every route answers
// in the browser from IndexedDB. The learner's schedule mode (ladder or adaptive) is one setting
// per course, saved on the course.
export default function courseRoutes(ctx) {
  const {store, now, atomic, addProgress} = ctx;
  const fetchText = ctx.fetchText || (async url => {
    let r; try { r = await globalThis.fetch(url); } catch { fail(502, 'Lichess could not be reached. Check your connection and try again.'); }
    if (!r.ok) fail(502, `Lichess answered ${r.status}.`);
    return r.text();
  });

  async function course(id) {
    const saved = typeof id === 'string' ? await store.get('courses', id) : null;
    if (!saved) fail(404, 'This course was not found.');
    return saved;
  }
  const cards = id => store.list('course_cards', {index: 'courseId', value: id});
  const cardId = (courseId, lineId) => `${courseId}:${lineId}`;
  async function withCards(saved) {
    const list = await cards(saved.id), at = now();
    return {course: courseView(saved), cards: list.map(card => ({...card, label: stepLabel(card)})), schedule: scheduleSummary(list, at), quizzes: await quizProgress(saved.id)};
  }
  async function quizProgress(courseId) {
    return (await store.list('progress', {index: 'kind', value: 'quiz'})).filter(row => row.itemId.startsWith(courseId + ':')).map(row => row.itemId.slice(courseId.length + 1)).sort();
  }
  const newCard = (courseId, lineId) => createCard({id: cardId(courseId, lineId), courseId, lineId, now: now()});
  // Saves a new validated course with a fresh card for every line.
  async function save(course) {
    return atomic(async () => {
      if (await store.get('courses', course.id)) fail(409, `A course with id "${course.id}" already exists.`);
      await store.put('courses', course);
      for (const line of courseLines(course)) await store.put('course_cards', newCard(course.id, line.id));
      return course;
    });
  }
  // Loads a drill of this course and its line, or answers 404.
  async function openDrill(saved, drillId) {
    const session = await store.get('drill_sessions', drillId);
    if (!session || session.courseId !== saved.id) fail(404, 'This drill was not found.');
    const line = findLine(saved, session.lineId); if (!line) fail(404, 'This line is no longer in the course.');
    return {session, line};
  }
  async function listAll() {
    const saved = await store.list('courses'), at = now();
    const out = [];
    for (const c of saved) out.push({...courseSummary(c), mode: c.mode || 'ladder', schedule: scheduleSummary(await cards(c.id), at)});
    return out;
  }

  return [
    ['GET', '/api/courses', async () => { const courses = await listAll(); return {courses, due: courses.reduce((sum, c) => sum + c.schedule.due, 0)}; }],
    ['POST', '/api/courses', async ({body}) => {
      const validated = validateCourse(body.course, {createdAt: new Date(now()).toISOString()});
      return respond(201, await withCards(await save(validated)));
    }],
    ['POST', '/api/courses/import', async ({body}) => {
      if (typeof body.pgn !== 'string') fail(400, 'Paste a PGN to import.');
      const options = {title: body.title, side: body.side, level: body.level, stage: body.stage, blurb: body.blurb, source: body.source || {kind: 'pgn'}};
      return respond(201, await withCards(await save(courseFromPgn(body.pgn, options, {now: now()}))));
    }],
    ['POST', '/api/courses/lichess', async ({body}) => {
      const url = lichessStudyExportUrl(body.url);
      if (!url) fail(400, 'Paste a Lichess study link, like https://lichess.org/study/abcdefgh.');
      const pgn = await fetchText(url);
      if (typeof pgn !== 'string' || !pgn.trim()) fail(502, 'Lichess returned no PGN for that study. Is it public?');
      if (new TextEncoder().encode(pgn).length > MAX_PGN_BYTES) fail(400, 'That study is larger than 2 MB. Import one chapter at a time.');
      const options = {title: body.title, side: body.side, level: body.level, stage: body.stage, source: {kind: 'lichess-study', url: lichessStudyLink(body.url), author: body.author || '', licence: body.licence || 'Lichess study, author credited'}};
      return respond(201, await withCards(await save(courseFromPgn(pgn, options, {now: now()}))));
    }],
    ['GET', '/api/courses/:id', async ({params}) => withCards(await course(params.id))],
    ['GET', '/api/courses/:id/pgn', async ({params}) => ({pgn: courseToPgn(await course(params.id))})],
    ['POST', '/api/courses/:id/delete', async ({params}) => atomic(async () => {
      const saved = await course(params.id);
      for (const card of await cards(saved.id)) await store.delete('course_cards', card.id);
      for (const drill of await store.list('drill_sessions', {index: 'courseId', value: saved.id})) await store.delete('drill_sessions', drill.id);
      // Quiz and line progress belong to this course; a new course with the same ids starts clean.
      for (const kind of ['quiz', 'line']) for (const row of await store.list('progress', {index: 'kind', value: kind})) if (row.itemId.startsWith(saved.id + ':')) await store.delete('progress', row.key);
      await store.delete('courses', saved.id);
      return {deleted: saved.id};
    })],
    ['POST', '/api/courses/:id/mode', async ({params, body}) => atomic(async () => {
      const saved = await course(params.id);
      if (!MODES.includes(body.mode)) fail(400, `Choose a schedule: ${MODES.join(' or ')}.`);
      saved.mode = body.mode; saved.updatedAt = new Date(now()).toISOString();
      await store.put('courses', saved);
      return {mode: saved.mode};
    })],
    // The review queue: due lines first, then new ones. limit defaults to 20.
    ['GET', '/api/courses/:id/review', async ({params, query}) => {
      const saved = await course(params.id), at = now();
      const limit = query.limit === undefined ? 20 : Number(query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 200) fail(400, 'limit must be 1 to 200.');
      const all = await cards(saved.id);
      const due = dueCards(all, at, limit).map(card => ({...card, label: stepLabel(card), title: findLine(saved, card.lineId)?.title || ''}));
      return {queue: due, schedule: scheduleSummary(all, at)};
    }],
    // Shuffle: every line and quiz of the course (or one chapter) in a random order.
    ['POST', '/api/courses/:id/shuffle', async ({params, body}) => {
      const saved = await course(params.id);
      const chapter = body.chapterId === undefined ? null : saved.chapters.find(c => c.id === body.chapterId);
      if (body.chapterId !== undefined && !chapter) fail(404, 'This chapter was not found.');
      const scope = chapter ? {chapters: [chapter]} : saved;
      const items = [...courseLines(scope).map(line => ({kind: 'line', id: line.id})), ...courseQuizzes(scope).map(quiz => ({kind: 'quiz', id: quiz.id}))];
      for (let i = items.length - 1; i > 0; i--) { const j = randomInt(i + 1); [items[i], items[j]] = [items[j], items[i]]; }
      return {items};
    }],
    ['POST', '/api/courses/:id/drills/start', async ({params, body}) => {
      const saved = await course(params.id), line = findLine(saved, body.lineId);
      if (!line) fail(404, 'This line was not found in the course.');
      const session = await atomic(async () => {
        const mine = (await store.list('drill_sessions', {index: 'courseId', value: saved.id})).filter(d => d.lineId === line.id);
        const open = mine.find(d => d.state === 'active');
        if (open && !body.restart) return open;
        // Only the drill in progress is worth keeping; finished ones already updated the card.
        for (const old of mine) await store.delete('drill_sessions', old.id);
        const fresh = createDrill({id: randomUUID(), course: saved, line, now: now()});
        await store.put('drill_sessions', fresh);
        return fresh;
      });
      return respond(201, {drill: drillView(session, line)});
    }],
    ['POST', '/api/courses/:id/drills/:drillId/move', async ({params, body}) => {
      const saved = await course(params.id);
      return atomic(async () => {
        const {session, line} = await openDrill(saved, params.drillId);
        if (!Number.isInteger(body.revision) || body.revision !== session.revision) fail(409, 'This drill changed. Reload it before moving again.');
        const {session: next, correct, done, reply, expectedShown} = playDrillMove(session, line, body.move, now());
        await store.put('drill_sessions', next);
        let card = null;
        if (done) {
          const previous = await store.get('course_cards', cardId(saved.id, line.id)) || newCard(saved.id, line.id);
          card = review(previous, next.result, now(), saved.mode || 'ladder');
          await store.put('course_cards', card);
          if (next.result !== 'miss') await addProgress('line', `${saved.id}:${line.id}`);
        }
        return {drill: drillView(next, line), correct, done, reply, expectedShown: Boolean(expectedShown), card: card && {...card, label: stepLabel(card)}, note: line.notes?.[next.ply] || null};
      });
    }],
    ['POST', '/api/courses/:id/drills/:drillId/hint', async ({params}) => {
      const saved = await course(params.id);
      return atomic(async () => {
        const {session, line} = await openDrill(saved, params.drillId);
        const next = askHint(session);
        await store.put('drill_sessions', next);
        return {drill: drillView(next, line)};
      });
    }],
    ['POST', '/api/courses/:id/quizzes/:quizId/answer', async ({params, body}) => {
      const saved = await course(params.id), quiz = findQuiz(saved, params.quizId);
      if (!quiz) fail(404, 'This quiz was not found.');
      if (!Number.isInteger(body.choice) || body.choice < 0 || body.choice >= quiz.choices.length) fail(400, 'Choose one of the answers.');
      const correct = body.choice === quiz.answer;
      if (correct) await addProgress('quiz', `${saved.id}:${quiz.id}`);
      return {correct, answer: quiz.answer, why: quiz.why, quizzes: await quizProgress(saved.id)};
    }],
  ];
}
