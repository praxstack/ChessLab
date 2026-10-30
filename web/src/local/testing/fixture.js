import {createLocalRouter} from '../router.js';
import {createMemoryStore} from '../store/memory-store.js';
import {createEngineOnlyCoach} from '../coach-fallback.js';
import {createFakeEngine} from './fake-engine.js';

// A router over a memory store and a fake engine. reload() builds a new router on the same store,
// as a page reload does in the browser, so in-memory state (pending searches) is dropped.
export function fixture({engine = createFakeEngine(), store = createMemoryStore(), now = () => Date.now(), coach = createEngineOnlyCoach(), opponent} = {}) {
  let router = createLocalRouter({store, engine, coach, now, opponent});
  const call = (method, path, body, options) => router.handle(method, path, body, options);
  return {
    store, engine,
    get: (path, options) => call('GET', path, undefined, options),
    post: (path, body = {}, options) => call('POST', path, body, options),
    reload() { router = createLocalRouter({store, engine, coach, now, opponent}); },
    get router() { return router; },
  };
}
