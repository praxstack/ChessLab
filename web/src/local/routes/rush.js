import {emptyRushBests, expireRush, visibleRun, rushHistoryRow, rushNextRequest, rushItem, rushVariant, newRun, startClock, checkRushAction, rushStep, retryItem} from '../../../../shared/puzzle-rush.js';
import {advancePuzzle} from '../../../../shared/puzzle-training.js';
import {fail} from '../context.js';

// Puzzle Rush over local storage. Runs are saved as {id, state, updatedAt, run}.
export const NO_RUSH_CATALOGUE = 'Install the local puzzle catalogue before starting Rush.';

export function createLocalRush(ctx, {activeAttempt, insertPractice, selectPuzzle = () => fail(503, NO_RUSH_CATALOGUE)}) {
  const {store, now, atomic} = ctx;
  const save = run => store.put('puzzle_runs', {id: run.id, state: run.state, updatedAt: now(), run});
  const owned = async id => { if (typeof id !== 'string') fail(400, 'Invalid run.'); const row = await store.get('puzzle_runs', id); if (!row) fail(404, 'Rush run not found.'); return row.run; };
  const expire = async run => { if (expireRush(run, now())) await save(run); return run; };
  async function active() {
    const row = (await store.list('puzzle_runs', {index: 'state', value: 'active'}))[0];
    const run = row ? await expire(row.run) : null;
    return run?.state === 'active' ? run : null;
  }
  async function response(run) {
    const finished = (await store.list('puzzle_runs')).reverse().filter(row => row.state !== 'active').sort((a, b) => b.updatedAt - a.updatedAt);
    const bests = emptyRushBests();
    for (const {run: r} of finished) bests[r.variant] = Math.max(bests[r.variant] ?? 0, r.score);
    return {run: visibleRun(run), serverNow: now(), history: finished.slice(0, 20).map(row => rushHistoryRow(row.run)), bests};
  }
  const next = run => { const {min, seen} = rushNextRequest(run); return rushItem(selectPuzzle(min, seen)); };
  async function start(body) {
    const variant = rushVariant(body);
    const run = await atomic(async () => {
      if (await active()) fail(409, 'Finish your current Rush run first.');
      if (await activeAttempt()) fail(409, 'Finish, reveal or skip the current puzzle first.');
      const created = newRun(variant, now());
      created.current = next(created); if (!created.current) fail(404, 'No local Rush puzzles are available.');
      startClock(created, now());
      await save(created); return created;
    });
    return response(run);
  }
  async function act(id, body) {
    const run = await owned(id); checkRushAction(run, body);
    if (run.deadline !== null && now() >= run.deadline) return response(await expire(run));
    const result = rushStep(run, body, {advancePuzzle, next, stamp: now});
    await atomic(async () => {
      if ((await store.get('puzzle_runs', id)).run.revision !== run.revision - 1) fail(409, 'This run changed. Reload it before continuing.');
      await save(run);
    });
    return {...await response(run), correct: result.correct, message: result.message};
  }
  async function retry(id, index) {
    const run = await expire(await owned(id)), puzzle = retryItem(run, index);
    if (await active()) fail(409, 'Finish your current Rush run first.');
    return insertPractice(puzzle);
  }
  return {start, act, retry, active, state: async () => response(await active()), get: async id => response(await expire(await owned(id)))};
}
