import {localDay, advancePuzzle, visibleAttempt, newAttempt, attemptSummary, dailyStreak, scoreAttempt, checkAttemptAction, attemptStudy, trainingMode, defaultPuzzleProfile, missingCatalogue} from '../../../../shared/puzzle-training.js';
import {fail, respond} from '../context.js';
import {createLocalRush} from './rush.js';

// Puzzle training. The browser app has no puzzle catalogue yet, so it answers like a server without one:
// the catalogue reports unavailable and new puzzles need it, while retrying a saved attempt still works.
export const NO_CATALOGUE = 'Install the local puzzle catalogue before starting training.';
const byRecent = (a, b) => b.updatedAt - a.updatedAt;

export function createLocalTrainer(ctx) {
  const {store, now, atomic} = ctx;
  const attempts = async () => (await store.list('puzzle_attempts')).reverse();
  const activeAttempt = async () => (await store.list('puzzle_attempts', {index: 'state', value: 'active'}))[0] ?? null;
  const owned = async id => { if (typeof id !== 'string') fail(400, 'Invalid attempt.'); const a = await store.get('puzzle_attempts', id); if (!a) fail(404, 'Puzzle attempt not found.'); return a; };
  const profile = async () => { const row = await store.get('puzzle_profiles', 'local'); return row ? {rating: row.rating, best: row.best, ratedCount: row.ratedCount} : defaultPuzzleProfile(); };
  async function dailyProgress() {
    const date = localDay(now()), all = await attempts(), daily = all.filter(a => a.mode === 'daily');
    const today = daily.find(a => a.dailyDate === date);
    const completedDates = daily.filter(a => a.state === 'solved').map(a => a.dailyDate).sort().reverse();
    return {date, streak: dailyStreak(date, completedDates), completedDates, today: today ? {id: today.id, state: today.state, assisted: today.assisted} : null};
  }
  const rush = createLocalRush(ctx, {activeAttempt, insertPractice: puzzle => insertAttempt(puzzle)});
  async function state() {
    const activeRush = await rush.active(), finished = (await attempts()).filter(a => a.state !== 'active');
    const history = [...finished].sort(byRecent).slice(0, 20).map(attemptSummary);
    const totals = {attempts: finished.length, solved: finished.filter(a => a.state === 'solved').length, unassisted: finished.filter(a => a.state === 'solved' && a.mistakes === 0 && !a.assisted).length};
    return {rush: activeRush ? {id: activeRush.id} : null, attempt: visibleAttempt(await activeAttempt()), history, totals, profile: await profile(), daily: await dailyProgress()};
  }
  const insertAttempt = (puzzle, options) => atomic(async () => {
    if (await activeAttempt()) fail(409, 'Finish, reveal or skip the current puzzle first.');
    const attempt = newAttempt(puzzle, options, now());
    await store.put('puzzle_attempts', attempt);
    return visibleAttempt(attempt);
  });
  async function start(body) {
    if (await rush.active()) fail(409, 'Finish your current Rush run first.');
    const mode = trainingMode(body), date = localDay(now());
    if (mode === 'daily') {
      const existing = (await attempts()).find(a => a.mode === 'daily' && a.dailyDate === date);
      if (existing) { const active = await activeAttempt(); if (active && active.id !== existing.id) fail(409, 'Finish, reveal or skip the current puzzle first.'); return visibleAttempt(existing); }
    }
    if (await activeAttempt()) fail(409, 'Finish, reveal or skip the current puzzle first.');
    if (body.fromAttempt === undefined) fail(503, NO_CATALOGUE);
    const {puzzle} = await owned(body.fromAttempt);
    return insertAttempt(puzzle, {mode, difficulty: null, dailyDate: null});
  }
  async function act(id, body) {
    const a = await owned(id); checkAttemptAction(a, body);
    const {correct, message} = advancePuzzle(a, body);
    a.revision++;
    await atomic(async () => {
      const current = await store.get('puzzle_attempts', id);
      if (current.revision !== a.revision - 1) fail(409, 'This attempt changed. Reload it before continuing.');
      const next = scoreAttempt(await profile(), a);
      if (next) await store.put('puzzle_profiles', {id: 'local', ...next});
      a.updatedAt = now();
      await store.put('puzzle_attempts', a);
    });
    return {attempt: visibleAttempt(a), correct, message, profile: await profile(), daily: await dailyProgress()};
  }
  return {rush, state, start, act, catalogue: missingCatalogue, get: async id => visibleAttempt(await owned(id)), study: async id => ctx.insertStudy(attemptStudy(await owned(id)))};
}

export default function trainingRoutes(ctx) {
  const trainer = createLocalTrainer(ctx);
  return [
    ['GET', '/api/training/catalog', () => trainer.catalogue()],
    ['GET', '/api/training', () => trainer.state()],
    ['POST', '/api/training/start', async ({body}) => respond(201, {attempt: await trainer.start(body)})],
    ['GET', '/api/training/:id', async ({params}) => ({attempt: await trainer.get(params.id)})],
    ['POST', '/api/training/:id/action', ({params, body}) => trainer.act(params.id, body)],
    ['POST', '/api/training/:id/study', async ({params}) => respond(201, {game: await trainer.study(params.id)})],
    ['GET', '/api/rush', () => trainer.rush.state()],
    ['POST', '/api/rush/start', async ({body}) => respond(201, await trainer.rush.start(body))],
    ['GET', '/api/rush/:id', ({params}) => trainer.rush.get(params.id)],
    ['POST', '/api/rush/:id/action', ({params, body}) => trainer.rush.act(params.id, body)],
    ['POST', '/api/rush/:id/retry', async ({params, body}) => respond(201, {attempt: await trainer.rush.retry(params.id, body.index)})],
  ];
}
