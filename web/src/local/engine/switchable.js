import {createEngine as createAppEngine, ENGINE_URL} from './engine.js';
import {appEngines, BUNDLED_ID} from './catalog.js';
import {engineById} from '../../../../site/public/assets/engine-catalog.js';
import {startWorker, isCancel, isSaved} from '../../../../site/public/assets/engine.js';

// One engine seam (design.md seam 5) that can swap the engine behind it. The bundled Stockfish 19
// Lite serves from the first request; use(id) downloads another catalog engine in the background
// (through the puzzle board's loader, so the files are kept on the device for 30 days) and, once
// it answers, every later search goes to it. The engine being replaced finishes the search it is
// on, then closes. A failed or stopped download leaves the engine in use untouched.
// The choice is remembered in localStorage, so the next visit starts it from the device.
export const PICK_KEY = 'chesslab-engine';
export const TRYING_KEY = 'chesslab-engine-trying'; // the engine that was starting; still set after a reload means it took the tab down

const failure = (message, status) => Object.assign(new Error(message), {status});

// The app engine for a catalog entry: its worker comes from the site loader, already through its UCI handshake.
export function createCatalogEngine(spec, {onState, signal, startWorker: start = startWorker} = {}) {
  return createAppEngine({
    createWorker: async () => (await start(spec, {onState, signal})).worker,
    expectName: null,
    name: spec.name,
    // Neural models score every move on one thread: give slow phones and the biggest models time.
    searchGrace: spec.module ? 30000 + Math.round(spec.bytes / 1e6) * 200 : 10000,
  });
}

export function createSwitchableEngine({
  engines = appEngines(),
  storage = globalThis.localStorage,
  createBundled = () => createAppEngine({workerUrl: ENGINE_URL}),
  createFor = (spec, options) => createCatalogEngine(spec, options),
  specOf = engineById,
  saved = isSaved, // whether a catalog engine's files are still kept on this device
} = {}) {
  const entry = id => engines.find(e => e.id === id);
  let active = {id: BUNDLED_ID, engine: createBundled()};
  let next = null; // {id, engine, aborter}: the engine downloading or starting
  let progress = null; // what the loader last reported for `next`: {phase, got, total, fromDevice, checking}
  let failed = null; // {id, error} when the last switch didn't make it, until the next switch

  const read = key => { try { return storage?.getItem(key) || ''; } catch { return ''; } };
  const write = (key, value) => { try { if (value) storage?.setItem(key, value); else storage?.removeItem(key); } catch { /* storage off */ } };
  const remembered = () => read(PICK_KEY);
  const remember = id => write(PICK_KEY, id === BUNDLED_ID ? '' : id);

  function adopt(ready) {
    const old = active;
    active = ready;
    next = null;
    progress = null;
    remember(ready.id);
    write(TRYING_KEY, '');
    old.engine.idle().then(() => old.engine.close());
  }

  function dropNext() {
    if (!next) return;
    const {aborter, engine} = next;
    next = null;
    progress = null;
    write(TRYING_KEY, '');
    aborter?.abort();
    engine.close();
  }

  // Starts `id` in the background; resolves with the switch state at once.
  async function use(id) {
    const e = entry(id);
    if (!e) throw failure('Choose an engine from the list.', 400);
    if (e.cantRun) throw failure(e.cantRun, 503);
    if (next?.id === id) return snapshot();
    dropNext();
    failed = null;
    if (id === active.id) { remember(id); return snapshot(); }
    const aborter = typeof AbortController === 'function' ? new AbortController() : null;
    const engine = id === BUNDLED_ID
      ? createBundled()
      : createFor(specOf(id), {onState: s => { if (next?.engine === engine) progress = {phase: s.phase, got: s.got, total: s.total, fromDevice: s.fromDevice, checking: s.checking}; }, signal: aborter?.signal});
    next = {id, engine, aborter};
    progress = {phase: 'start'};
    write(TRYING_KEY, id === BUNDLED_ID ? '' : id);
    engine.ready().then(() => {
      if (next?.engine === engine) adopt({id, engine});
    }, error => {
      if (next?.engine !== engine) return;
      next = null;
      progress = null;
      write(TRYING_KEY, '');
      engine.close();
      failed = {id, error: isCancel(error) ? 'Download stopped.' : error?.message || 'The engine could not start.'};
    });
    return snapshot();
  }

  // Stops a download or start under way; the engine in use keeps working.
  function cancel() {
    if (!next) return snapshot();
    const {id} = next;
    dropNext();
    failed = {id, error: 'Download stopped.'};
    return snapshot();
  }

  function snapshot() {
    const current = entry(active.id);
    return {
      current: {id: active.id, name: current?.name || active.id, size: current?.size || ''},
      switching: next ? {id: next.id, name: entry(next.id)?.name || next.id, ...progress} : null,
      failed,
      remembered: remembered(),
    };
  }

  // The remembered engine starts in the background when it still can. A heavy one is only started
  // from the device: once its files have aged out (30 days), the learner is asked before it downloads again.
  // An engine that was still starting when the page last went away (the tab crashed or was
  // closed mid-start) is not started again by itself: the pick is forgotten and the picker says why.
  const trying = read(TRYING_KEY);
  const wanted = remembered();
  const wantedEntry = wanted && wanted !== BUNDLED_ID ? entry(wanted) : null;
  if (trying) {
    write(TRYING_KEY, '');
    if (trying === wanted) remember(BUNDLED_ID);
    failed = {id: trying, error: `${entry(trying)?.name || trying} didn’t finish starting last time. Choose it again to retry, or stay with Stockfish 19 Lite.`};
  } else if (wantedEntry && !wantedEntry.cantRun) {
    (async () => {
      if (!wantedEntry.heavy || (await saved(specOf(wanted)))) await use(wanted);
      else failed = {id: wanted, error: `${wantedEntry.name} is no longer kept on this device. Choose it again to download it.`};
    })().catch(() => {});
  }

  return {
    async status() {
      const status = await active.engine.status();
      const current = entry(active.id);
      // The catalog's name ("Maia-1 1500") is what the app shows; `version` keeps what the engine itself said.
      return {...status, label: current?.name || status.name, humanLike: Boolean(current?.neural)};
    },
    analyze: input => active.engine.analyze(input),
    bestMove: input => active.engine.bestMove(input),
    stop() { active.engine.stop(); },
    close() { dropNext(); active.engine.close(); },
    // The switching seam, used by /api/engines.
    engines: () => engines.map(e => ({...e})),
    use,
    cancel,
    state: snapshot,
  };
}
