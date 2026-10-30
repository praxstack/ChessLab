import {settleRound, roundSummary, roundBests, roundOptions, createRound, checkRoundAction, answerRound} from '../../../../shared/vision-training.js';
import {fail, respond} from '../context.js';

// Board vision rounds, saved as {id, createdAt, round}.
export default function visionRoutes(ctx) {
  const {store, now} = ctx;
  const save = (createdAt, r) => store.put('vision_runs', {id: r.id, createdAt, round: r});
  const recent = async () => (await store.list('vision_runs')).reverse().sort((a, b) => b.createdAt - a.createdAt);
  async function settle(row, stamp) { if (settleRound(row.round, stamp)) await save(row.createdAt, row.round); return row.round; }
  async function latest(stamp) { const row = (await recent())[0]; return row ? settle(row, stamp) : null; }
  async function response(r, stamp, extra = {}) {
    const rows = await recent();
    return {round: r, history: rows.slice(0, 30).map(row => roundSummary(row.round)), bests: roundBests(rows.map(row => row.round)), serverNow: stamp, ...extra};
  }
  return [
    ['GET', '/api/vision', async () => { const stamp = now(); return response(await latest(stamp), stamp); }],
    ['POST', '/api/vision/start', async ({body}) => {
      const options = roundOptions(body);
      const stamp = now(), previous = await latest(stamp); if (previous?.state === 'active') return response(previous, stamp);
      const r = createRound(options, stamp);
      await save(stamp, r); return respond(201, await response(r, stamp));
    }],
    ['POST', '/api/vision/:id', async ({params, body}) => {
      const row = await store.get('vision_runs', params.id); if (!row) fail(404, 'Vision round not found.');
      const r = row.round, stamp = now();
      checkRoundAction(r, body);
      await settle(row, stamp);
      if (r.state !== 'active') return response(r, stamp, {correct: null, message: 'This round has ended.'});
      const {correct, message} = answerRound(r, body, stamp);
      await save(row.createdAt, r); return response(r, stamp, {correct, message});
    }],
  ];
}
