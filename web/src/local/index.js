import {createLocalRouter} from './router.js';
import {createIdbStore} from './store/idb-store.js';
import {createMemoryStore} from './store/memory-store.js';
import {createUnavailableEngine} from './engine-stub.js';
import {createBrowserCoach} from './coach/client.js';
import {createBackup, restoreBackup, inspectBackup, requestPersistentStorage, backupFilename} from './backup.js';

// The browser app's data door: one IndexedDB store and one router per tab, created on first use.
let started = null;
// Without IndexedDB (some private windows) the app still runs on a memory store, and /api/status
// reports storage: 'memory' so the app can warn that nothing survives closing the tab. A database
// held by another tab is different: the saved games exist, so this tab waits for the learner to
// close the other one instead of starting empty.
export async function openStore({openIdb = createIdbStore, warn = console.warn} = {}) {
  try { return await openIdb(); }
  catch (error) {
    if (error?.code === 'blocked') throw error;
    warn('Saving is unavailable in this browser; using memory only.', error);
    return createMemoryStore();
  }
}

function start() {
  started ??= (async () => {
    const store = await openStore();
    requestPersistentStorage();
    return {store, router: createLocalRouter({store, engine: createUnavailableEngine(), coach: createBrowserCoach({coachUrl: import.meta.env?.VITE_COACH_URL})})};
  })();
  // A failed start is not remembered, so the next request tries again.
  started.catch(() => { started = null; });
  return started;
}

export async function localApi(path, body, signal) {
  const {router} = await start();
  return router.request(path, body, signal);
}

// PGN and study files are built here instead of downloaded from a server.
export async function localExportFile(gameId, format) {
  const result = await localApi(`/api/games/${encodeURIComponent(gameId)}/${format === 'pgn' ? 'pgn' : 'study-file'}`);
  return format === 'pgn' ? result.text : JSON.stringify(result);
}

export async function localBackup(settings) {
  const {store} = await start();
  return {filename: backupFilename(), text: JSON.stringify(await createBackup(store, settings))};
}

export async function localRestore(text, options) {
  const {store} = await start();
  return restoreBackup(store, text, options);
}

export {inspectBackup};

export const localStorageKind = async () => (await start()).store.kind;
