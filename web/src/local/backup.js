import {settingDefaults, normalizeSettings} from '../settings-state.js';
import {readBackup} from './store/schema.js';

// Back up and Restore: everything the app saved in this browser, as one versioned JSON file.
// Settings are copied by an allow-list of known preference names, and anything that looks like a
// credential is dropped as well, so a backup never carries a Claude key or invite code.
const SECRET = /key|token|secret|password|invite|credential|anthropic|claude/i;

export function backupSettings(settings) {
  const value = normalizeSettings(settings);
  return Object.fromEntries(Object.keys(settingDefaults).filter(name => !SECRET.test(name)).map(name => [name, value[name]]));
}

export async function createBackup(store, settings) {
  const backup = await store.exportAll();
  return {...backup, settings: backupSettings(settings)};
}

export const backupFilename = (date = new Date()) => `askthemove-backup-${date.toISOString().slice(0, 10)}.json`;

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function parseBackup(text) {
  let data;
  try { data = typeof text === 'string' ? JSON.parse(text) : text; }
  catch { throw Object.assign(new Error('This file is not valid JSON.'), {status: 400}); }
  return {data, collections: readBackup(data)};
}

// Checks a backup file without changing anything, so the app can describe it before replacing.
export function inspectBackup(text) {
  const {data, collections} = parseBackup(text);
  return {games: collections.games.length, exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : null, hasSettings: plain(data.settings)};
}

export async function hasSavedData(store) {
  const {collections} = await store.exportAll();
  return Object.values(collections).some(values => values.length > 0);
}

// Replaces this browser's data with the backup. Returns the settings to apply, or null when the
// backup has none, in which case the current settings stay as they are. When this browser already
// holds data, the caller must confirm it was saved first (currentSaved), because a restore cannot
// be undone.
export async function restoreBackup(store, text, {currentSaved = false} = {}) {
  const {data} = parseBackup(text);
  if (!currentSaved && await hasSavedData(store)) throw Object.assign(new Error('Save a backup of what is in this browser first: restoring replaces it.'), {status: 409});
  await store.importAll(data);
  return plain(data.settings) ? backupSettings(data.settings) : null;
}

// Asks the browser not to clear this site's data under storage pressure. Safe to call more than once;
// it returns whether storage is persistent, or null when the browser cannot say.
export async function requestPersistentStorage(storage = globalThis.navigator?.storage) {
  if (!storage?.persist) return null;
  try { return (await storage.persisted?.()) || await storage.persist(); }
  catch { return null; }
}
