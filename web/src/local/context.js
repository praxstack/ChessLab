import {randomUUID} from '../../../shared/random.js';
import {crownsFor, settleClock} from '../../../shared/bot-game.js';
import {replay} from '../../../shared/replay.js';
import {positionKey} from '../../../shared/game-review.js';
import profiles from '../../../shared/bot-profiles.json' with {type: 'json'};

// Shared helpers for the local route handlers: the one local profile, saved games and errors.
// Each route file receives this context, built from {store, engine, coach, now}.
export const LOCAL_USER = {id: 'local', username: 'You'};
export const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
export const uci = move => move.from + move.to + (move.promotion || '');
export const gameResult = chess => chess.isCheckmate() ? (chess.turn() === 'w' ? '0-1' : '1-0') : chess.isDraw() ? '1/2-1/2' : null;
export function moveOn(chess, value) {
  if (typeof value !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value)) fail(400, 'Choose a legal move, including the promotion piece when needed.');
  try { return chess.move({from: value.slice(0, 2), to: value.slice(2, 4), promotion: value[4]}); }
  catch { fail(400, 'That move is not legal in this position.'); }
}
// A status other than 200, such as 201 for something created.
export const respond = (status, body) => ({[RESPONSE]: true, status, body});
export const RESPONSE = Symbol('response');

export function createContext({store, engine, coach, now = Date.now}) {
  const iso = () => new Date(now()).toISOString();
  // Read-modify-write steps run one at a time, as SQLite transactions do on the server. Engine searches
  // happen outside this lock, so a slow search never holds up other requests.
  let queue = Promise.resolve();
  const atomic = work => {
    const run = queue.then(work);
    queue = run.catch(() => {});
    return run;
  };
  const pendingBot = new Set(), pendingReview = new Set();

  async function progress() {
    const rows = await store.list('progress'), bots = await store.list('bot_results');
    const items = kind => rows.filter(row => row.kind === kind).map(row => row.itemId).sort();
    return {...(bots.length ? {bots: Object.fromEntries(bots.map(row => [row.botId, row.crowns]))} : {}), lessons: items('lesson'), puzzles: items('puzzle')};
  }
  const addProgress = (kind, itemId) => store.put('progress', {key: `${kind}:${itemId}`, kind, itemId});
  const coachCovered = () => Boolean(coach.covered?.());
  const me = async () => ({user: {...LOCAL_USER, coachAi: coachCovered()}, progress: await progress()});

  async function owned(id) {
    const game = typeof id === 'string' ? await store.get('games', id) : null;
    if (!game) fail(404, 'This saved game was not found.');
    return game;
  }
  const allGames = async () => (await store.list('games')).reverse();
  const expected = (body, game) => { if (!Number.isInteger(body.revision) || body.revision !== game.revision) fail(409, 'This game has changed. Reload it before moving again.'); };
  const storeGame = (game, oldRevision) => atomic(async () => {
    const current = await store.get('games', game.id);
    if (!current) fail(404, 'This game was not found.');
    const next = {...game, reviewUsed: game.reviewUsed || current.reviewUsed || false, study: current.study, studyRevision: current.studyRevision || 0, revision: oldRevision + 1, updatedAt: iso()};
    next.crownsAwarded = crownsFor(next);
    if (current.revision !== oldRevision) fail(409, 'This game changed while the request was running. Reload it to continue.');
    await store.put('games', next);
    if (next.crownsAwarded) {
      const previous = await store.get('bot_results', next.botId);
      await store.put('bot_results', {botId: next.botId, crowns: Math.max(previous?.crowns || 0, next.crownsAwarded)});
    }
    return next;
  });
  // insertGameNow is for steps already inside atomic(); everything else uses insertGame.
  const insertGameNow = async values => {
    if ((await store.list('games')).length >= 500) fail(409, 'This account has reached the 500-game limit for this first version. Export your games before adding more.');
    const game = {id: randomUUID(), title: 'Practice game', color: 'w', level: 2, moves: [], initialFen: null, result: null, revision: 0, createdAt: iso(), updatedAt: iso(), study: null, studyRevision: 0, source: 'bot', ...values};
    await store.put('games', game);
    return game;
  };
  const insertGame = values => atomic(() => insertGameNow(values));
  const insertStudy = values => insertGame({...values, result: gameResult(replay(values.moves, values.initialFen))});
  async function liveGame(id) {
    const game = await owned(id);
    return settleClock(game, now()) ? storeGame(game, game.revision) : game;
  }
  async function markReviewAccess(id) {
    if (typeof id !== 'string') fail(400, 'Invalid game identifier.');
    await atomic(async () => {
      const game = await owned(id);
      if (game.source === 'bot' && !game.result && !game.reviewUsed) { game.reviewUsed = true; await store.put('games', game); }
    });
  }
  async function savedReview(game) {
    const report = await store.get('game_reviews', game.id);
    return report?.positionKey === positionKey(game) ? report : null;
  }
  return {store, engine, coach, now, iso, atomic, profiles, pendingBot, pendingReview, progress, addProgress, coachCovered, me, owned, allGames, expected, storeGame, insertGame, insertGameNow, insertStudy, liveGame, markReviewAccess, savedReview};
}
