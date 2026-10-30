import {respond} from '../context.js';

// Status, bot roster and the local profile. There are no accounts in the browser: register,
// login and logout succeed without doing anything and always return the one local profile.
export const LOCAL_ENGINES = [{id: 'stockfish19', name: 'Stockfish 19', humanLike: false}];

export async function engineCatalog(engine) {
  const status = await engine.status();
  return LOCAL_ENGINES.map(entry => status.available
    ? {...entry, available: true, chess960: Boolean(status.chess960), version: status.version || status.name}
    : {...entry, available: false, reason: status.reason || 'The chess engine is not available in this browser.'});
}

export default function statusRoutes(ctx) {
  return [
    ['GET', '/api/status', async () => ({engine: await ctx.engine.status(), billingEnabled: false, coachAi: ctx.coach.status(), inviteRequired: false, hosted: false, archives: false, local: true, storage: ctx.store.kind})],
    ['GET', '/api/bots', async () => ({bots: ctx.profiles, engines: await engineCatalog(ctx.engine)})],
    ['GET', '/api/me', () => ctx.me()],
    ['POST', '/api/register', async () => respond(201, await ctx.me())],
    ['POST', '/api/login', () => ctx.me()],
    ['POST', '/api/logout', () => ctx.me()],
  ];
}
