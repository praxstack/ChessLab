import {createContext, RESPONSE} from './context.js';
import statusRoutes from './routes/status.js';
import gameRoutes from './routes/games.js';
import reviewRoutes from './routes/review.js';
import coachRoutes from './routes/coach.js';
import trainingRoutes from './routes/training.js';
import lessonRoutes from './routes/lessons.js';
import endgameRoutes from './routes/endgames.js';
import openingRoutes from './routes/openings.js';
import positionRoutes from './routes/positions.js';
import collectionRoutes from './routes/collections.js';
import visionRoutes from './routes/vision.js';

// Answers the app's /api/* requests in the browser with the same JSON and error statuses as
// server/app.mjs. A request with no body is a GET, as api() in main.jsx sends it.
const SERVER_ERROR = 'The request could not be saved. Retry; your existing games are preserved.';

function compile(pattern) {
  const names = [];
  const source = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)/g, (_, name) => { names.push(name); return '([^/]+)'; });
  return {regex: new RegExp(`^${source}/?$`), names};
}

export function createLocalRouter({store, engine, coach, now = Date.now, opponent} = {}) {
  const ctx = createContext({store, engine, coach, now});
  ctx.opponent = opponent;
  const table = [statusRoutes, gameRoutes, reviewRoutes, coachRoutes, trainingRoutes, lessonRoutes, endgameRoutes, openingRoutes, positionRoutes, collectionRoutes, visionRoutes]
    .flatMap(area => area(ctx)).map(([method, pattern, handler]) => ({method, ...compile(pattern), handler}));

  // Returns {status, body}. Errors become {status, body: {error}} exactly as the server's error handler sends them.
  async function handle(method, path, body, {signal} = {}) {
    const url = new URL(path, 'http://local');
    if (!url.pathname.startsWith('/api/')) return {status: 404, body: {error: 'This API route does not exist.'}};
    if (method !== 'GET' && (body === null || typeof body !== 'object' || Array.isArray(body))) return {status: 400, body: {error: 'Expected a JSON object.'}};
    // Requests and answers cross the same JSON boundary as on the network, so no object is shared with the caller.
    const input = method === 'GET' ? {} : JSON.parse(JSON.stringify(body));
    const query = Object.fromEntries(url.searchParams);
    for (const route of table) {
      if (route.method !== method) continue;
      const match = route.regex.exec(url.pathname);
      if (!match) continue;
      let params;
      try { params = Object.fromEntries(route.names.map((name, index) => [name, decodeURIComponent(match[index + 1])])); }
      catch { return {status: 400, body: {error: 'This request path is not valid.'}}; }
      try {
        const result = await route.handler({params, query, body: input, signal});
        const response = result?.[RESPONSE] ? result : {status: 200, body: result};
        return {status: response.status, body: JSON.parse(JSON.stringify(response.body))};
      } catch (error) {
        const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
        if (status === 500) console.error('Local request failed:', error);
        return {status, body: {error: status === 500 ? SERVER_ERROR : error.message}};
      }
    }
    return {status: 404, body: {error: 'This API route does not exist.'}};
  }

  // The api() contract: resolves with the JSON body, or throws an Error with the server's message and status.
  async function request(path, body, signal) {
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    const {status, body: result} = await handle(body === undefined ? 'GET' : 'POST', path, body, {signal});
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    if (status >= 400) throw Object.assign(new Error(result.error || `Request failed (${status}).`), {status});
    return result;
  }

  return {handle, request, context: ctx};
}
