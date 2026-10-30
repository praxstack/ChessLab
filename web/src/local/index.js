import {createLocalRouter} from './router.js';
import {createIdbStore} from './store/idb-store.js';
import {createMemoryStore} from './store/memory-store.js';
import {createUnavailableEngine} from './engine-stub.js';
import {createEngineOnlyCoach} from './coach-fallback.js';
import {createBackup, restoreBackup, requestPersistentStorage, backupFilename} from './backup.js';

// The browser app's data door: one IndexedDB store and one router per tab, created on first use.
let started = null;
function start() {
  started ??= (async () => {
    let store;
    try { store = await createIdbStore(); }
    catch (error) {
      // Without IndexedDB (some private windows) the app still runs, but nothing survives a reload.
      console.warn('Saving is unavailable in this browser; using memory only.', error);
      store = createMemoryStore();
    }
    requestPersistentStorage();
    return {store, router: createLocalRouter({store, engine: createUnavailableEngine(), coach: createEngineOnlyCoach()})};
  })();
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

export async function localRestore(text) {
  const {store} = await start();
  return restoreBackup(store, text);
}

export const localStorageKind = async () => (await start()).store.kind;
